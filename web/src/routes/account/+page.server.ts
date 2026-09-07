import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { changePassword, passwordProblem } from '$lib/server/auth';
import { renewalDue } from '$lib/server/renewal';
import { createApiKey, deleteApiKey, listApiKeys } from '$lib/server/api-keys';
import { query } from '$lib/server/db';
import { createBillingPortalSession, setDefaultPaymentMethod, stripeConfigured, stripePublishableKey, REGION_NAMES, DISPLAY_PRICES } from '$lib/server/stripe';
import { env } from '$env/dynamic/private';
import { MAX_SEATS, addChild, cancelMemberSub, changeMemberPlan, intervalOfSub, isLive, listChildren, memberSub, onStripe, parsePlanForm, regionsOfSub, removeChild, resendChildInvite, resumeMemberSub, seatsNeeded, syncSeats } from '$lib/server/billing';

/** The prospect-email template the app merges with Handlebars (user_template,
 *  unique on user_id = the WordPress numeric id, or the email for newer accounts). */
interface TemplateRow { template: string | null; from_first_name: string | null; from_last_name: string | null; from_company_name: string | null;
	from_address_1: string | null; from_address_2: string | null; from_postcode: string | null; from_city: string | null; from_state: string | null; }
const TEMPLATE_FIELDS = ['from_first_name', 'from_last_name', 'from_company_name', 'from_address_1', 'from_address_2', 'from_postcode', 'from_city', 'from_state'] as const;

/** Same default the app ships with (routes/app/+page.svelte `user_template`). */
const DEFAULT_TEMPLATE = `<p>Hello Homeowner,</p><p></p><p>I hope this message finds you well. My name is <strong>{{user.first_name}} {{user.last_name}}</strong>, and I am a site developer interested in acquiring the property located at: <br></p><p><strong>{{property.address}}</strong><br></p><p>Having researched the property, I am confident that it presents significant potential for development and investment. I am keen to explore the possibility of purchasing this property from you. <br></p><p>I would appreciate the opportunity to discuss this matter further at your earliest convenience. Please feel free to contact me via email or phone to arrange a suitable time for a meeting. <br></p><p>Thank you for considering my inquiry. I look forward to your response. <br></p><p></p><p>Best Regards,</p><p>{{user.first_name}} {{user.last_name}}<br>{{user.email}}<br></p>`;

const appUserId = (u: { wp_user_id: number | null; email: string }) => (u.wp_user_id != null ? String(u.wp_user_id) : u.email);

export const prerender = false;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname)}`);
	const due = await renewalDue(locals.user.email);
	if (due?.overdue) redirect(303, '/renew/');
	const keys = await listApiKeys(locals.user.email);
	// Favourites are keyed by the WordPress numeric id (what the app sends as
	// `id`); accounts with no WordPress past are keyed by email.
	const favId = appUserId(locals.user);
	const isChild = locals.user.parent_user_id != null;
	const [[fav], sub, [tpl], children, seatsUsed] = await Promise.all([
		query<{ n: number }>(`SELECT count(*)::int AS n FROM user_fav WHERE user_id = $1`, [favId]),
		memberSub(locals.user.billing_email),
		query<TemplateRow>(`SELECT template, ${TEMPLATE_FIELDS.join(', ')} FROM user_template WHERE user_id = $1`, [favId]),
		isChild ? Promise.resolve([]) : listChildren(locals.user.id),
		isChild ? Promise.resolve(1) : seatsNeeded(locals.user.id)
	]);
	const parent = isChild
		? (await query<{ email: string; first_name: string | null; last_name: string | null }>(`SELECT email, first_name, last_name FROM users WHERE id=$1`, [locals.user.parent_user_id]))[0] ?? null
		: null;
	const template: TemplateRow = {
		template: tpl?.template || DEFAULT_TEMPLATE,
		from_first_name: tpl?.from_first_name || locals.user.first_name || '',
		from_last_name: tpl?.from_last_name || locals.user.last_name || '',
		from_company_name: tpl?.from_company_name ?? '',
		from_address_1: tpl?.from_address_1 ?? '',
		from_address_2: tpl?.from_address_2 ?? '',
		from_postcode: tpl?.from_postcode ?? '',
		from_city: tpl?.from_city ?? '',
		from_state: tpl?.from_state || 'NSW'
	};
	return {
		user: locals.user,
		renewalDue: due ? due.current_period_end.toISOString() : null,
		apiKeys: keys.map((k) => ({ ...k, created_on: k.created_on.toISOString() })),
		favCount: fav?.n ?? 0,
		sub: sub ? { ...sub, current_period_end: sub.current_period_end?.toISOString() ?? null, live: isLive(sub), stripe: onStripe(sub) } : null,
		template,
		billing: { stripe: stripeConfigured(), publishableKey: stripePublishableKey(), onStripe: Boolean(sub?.payment_customer_id || locals.user.stripe_customer_id) },
		plan: { regions: [...REGION_NAMES], current: regionsOfSub(sub), interval: intervalOfSub(sub), prices: DISPLAY_PRICES, maxSeats: MAX_SEATS, seats: sub?.seats ?? 1, seatsUsed },
		children: children.map((c) => ({ ...c, last_login_at: c.last_login_at?.toISOString() ?? null, created_at: c.created_at.toISOString() })),
		parent
	};
};

const notChild = (u: { parent_user_id: number | null }) => u.parent_user_id == null;
const bill = (e: unknown, what: string) => { console.error(`[account ${what}]`, e); return fail(502, { billingError: `${(e as Error).message}` }); };

export const actions: Actions = {
	cancel: async ({ locals }) => {
		if (!locals.user) redirect(303, '/login/');
		if (!notChild(locals.user)) return fail(403, { billingError: 'Only the account holder can cancel the subscription.' });
		try { await cancelMemberSub(locals.user.email); } catch (e) { return bill(e, 'cancel'); }
		return { cancelled: true };
	},
	resume: async ({ locals }) => {
		if (!locals.user) redirect(303, '/login/');
		if (!notChild(locals.user)) return fail(403, { billingError: 'Only the account holder can change the subscription.' });
		try { await resumeMemberSub(locals.user.email); } catch (e) { return bill(e, 'resume'); }
		return { resumed: true };
	},
	changePlan: async ({ request, locals, url }) => {
		if (!locals.user) redirect(303, '/login/');
		if (!notChild(locals.user)) return fail(403, { billingError: 'Only the account holder can change the plan.' });
		const plan = parsePlanForm(await request.formData());
		if (typeof plan === 'string') return fail(400, { billingError: plan });
		const needed = await seatsNeeded(locals.user.id);
		if (plan.seats < needed) return fail(400, { billingError: `You have ${needed - 1} additional user${needed === 2 ? '' : 's'} on the account; remove some under Users before reducing seats below ${needed}.` });
		let r: Awaited<ReturnType<typeof changeMemberPlan>>;
		try { r = await changeMemberPlan(locals.user, plan, env.PUBLIC_ORIGIN || url.origin); } catch (e) { return bill(e, 'changePlan'); }
		if (r.kind === 'checkout') redirect(303, r.url);
		return { planChanged: true };
	},
	addChild: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		if (!notChild(locals.user)) return fail(403, { childError: 'Additional users can only be added by the account holder.' });
		const form = await request.formData();
		const c = { email: String(form.get('email') ?? ''), first_name: String(form.get('first_name') ?? '').trim().slice(0, 100), last_name: String(form.get('last_name') ?? '').trim().slice(0, 100) };
		const sub = await memberSub(locals.user.email);
		if (!isLive(sub)) return fail(400, { childError: 'Start or renew your subscription before adding users.' });
		if (!onStripe(sub)) return fail(400, { childError: 'Additional users are billed through Stripe. Move your subscription to Stripe under Billing first.' });
		if ((await seatsNeeded(locals.user.id)) >= MAX_SEATS) return fail(400, { childError: `An account can have at most ${MAX_SEATS} users.` });
		let childId: number;
		try { childId = await addChild(locals.user, c); } catch (e) { return fail(400, { childError: (e as Error).message }); }
		try { await syncSeats(locals.user); }
		catch (e) {
			// Stripe would not take the extra seat (card declined, plan not configured): undo the user.
			console.error('[account addChild seats]', e);
			await query(`DELETE FROM users WHERE id=$1 AND parent_user_id=$2`, [childId, locals.user.id]);
			return fail(502, { childError: `Stripe could not add the seat: ${(e as Error).message}. The user was not added.` });
		}
		return { childAdded: c.email.trim().toLowerCase() };
	},
	removeChild: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		if (!notChild(locals.user)) return fail(403, { childError: 'Only the account holder can remove users.' });
		const id = Number((await request.formData()).get('id'));
		try { await removeChild(locals.user.id, id); } catch (e) { return fail(404, { childError: (e as Error).message }); }
		try { await syncSeats(locals.user); } catch (e) { console.error('[account removeChild seats]', e); return fail(502, { childError: `The user was removed but Stripe did not update the seat count: ${(e as Error).message}. Email info@urbanprospects.com.au.` }); }
		return { childRemoved: true };
	},
	resendInvite: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		if (!notChild(locals.user)) return fail(403, { childError: 'Only the account holder can do that.' });
		const id = Number((await request.formData()).get('id'));
		try { await resendChildInvite(locals.user, id); } catch (e) { return fail(404, { childError: (e as Error).message }); }
		return { inviteSent: true };
	},
	billing: async ({ locals, url }) => {
		if (!locals.user) redirect(303, '/login/');
		const [sub] = await query<{ payment_customer_id: string | null }>(
			`SELECT payment_customer_id FROM user_subscriptions WHERE lower(user_email) = lower($1) AND payment_customer_id IS NOT NULL ORDER BY id DESC LIMIT 1`, [locals.user.email]);
		const customer = sub?.payment_customer_id ?? locals.user.stripe_customer_id;
		if (!customer || !stripeConfigured()) return fail(400, { billingError: 'Card changes through Stripe are not available for this account yet.' });
		let portal: string;
		try { portal = await createBillingPortalSession(customer, `${url.origin}/account/#billing`); }
		catch { return fail(502, { billingError: 'Stripe did not answer. Please try again shortly.' }); }
		redirect(303, portal);
	},
	// The card element confirmed a SetupIntent client-side (see ./card/+server.ts);
	// this makes that payment method the default for the customer and subscription.
	card: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		const form = await request.formData();
		const pm = String(form.get('payment_method') ?? '');
		const [sub] = await query<{ payment_customer_id: string | null; payment_subscription_id: string | null }>(
			`SELECT payment_customer_id, payment_subscription_id FROM user_subscriptions WHERE lower(user_email) = lower($1) AND payment_customer_id IS NOT NULL ORDER BY id DESC LIMIT 1`, [locals.user.email]);
		const customer = sub?.payment_customer_id ?? locals.user.stripe_customer_id;
		if (!customer || !stripeConfigured()) return fail(400, { billingError: 'Card changes through Stripe are not available for this account yet.' });
		try { await setDefaultPaymentMethod(customer, sub?.payment_subscription_id ?? null, pm); }
		catch (e) { return fail(502, { billingError: `Stripe did not accept the card: ${(e as Error).message}` }); }
		return { cardSaved: true };
	},
	template: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		const form = await request.formData();
		const template = String(form.get('template') ?? '').trim();
		if (!template || template === '<p></p>') return fail(400, { templateError: 'The email template cannot be empty.' });
		if (template.length > 20000) return fail(400, { templateError: 'The email template is too long.' });
		const vals = TEMPLATE_FIELDS.map((f) => String(form.get(f) ?? '').trim().slice(0, 200));
		const sets = TEMPLATE_FIELDS.map((f, i) => `${f} = $${i + 3}`).join(', ');
		await query(
			`INSERT INTO user_template (user_id, template, ${TEMPLATE_FIELDS.join(', ')})
			 VALUES ($1, $2, ${TEMPLATE_FIELDS.map((_, i) => `$${i + 3}`).join(', ')})
			 ON CONFLICT (user_id) DO UPDATE SET template = EXCLUDED.template, ${sets}`,
			[appUserId(locals.user), template, ...vals]);
		return { templateSaved: true };
	},
	password: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const problem = passwordProblem(next);
		if (problem) return fail(400, { error: problem });
		if (next !== confirm) return fail(400, { error: 'The two new passwords do not match.' });
		if (!(await changePassword(locals.user.id, current, next))) {
			return fail(400, { error: 'Your current password is not right.' });
		}
		return { changed: true };
	},
	createKey: async ({ locals }) => {
		if (!locals.user) redirect(303, '/login/');
		try {
			const row = await createApiKey(locals.user.id, locals.user.email);
			return { keyCreated: row.api_key };
		} catch {
			return fail(500, { keyError: 'Could not create an API key. Please try again.' });
		}
	},
	deleteKey: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		if (!key || !(await deleteApiKey(locals.user.email, key))) {
			return fail(404, { keyError: 'That API key was not found.' });
		}
		return { keyDeleted: true };
	}
};
