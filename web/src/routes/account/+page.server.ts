import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { changePassword, passwordProblem } from '$lib/server/auth';
import { renewalDue } from '$lib/server/renewal';
import { createApiKey, deleteApiKey, listApiKeys } from '$lib/server/api-keys';
import { query } from '$lib/server/db';
import { createBillingPortalSession, setDefaultPaymentMethod, stripeConfigured, stripePublishableKey } from '$lib/server/stripe';

interface SubRow { plan: string | null; billing_cycle: string | null; payment_price: string | null; current_period_end: Date | null;
	subscription_status: string | null; payment_customer_id: string | null; payment_subscription_id: string | null; cancel_at_period_end: boolean | null; }

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
	const [[fav], [sub], [tpl]] = await Promise.all([
		query<{ n: number }>(`SELECT count(*)::int AS n FROM user_fav WHERE user_id = $1`, [favId]),
		query<SubRow>(`SELECT plan, billing_cycle, payment_price, current_period_end, subscription_status, payment_customer_id, payment_subscription_id, cancel_at_period_end
		                 FROM user_subscriptions WHERE lower(user_email) = lower($1)
		                ORDER BY (subscription_status IN ('Active','Trialing')) DESC, id DESC LIMIT 1`, [locals.user.email]),
		query<TemplateRow>(`SELECT template, ${TEMPLATE_FIELDS.join(', ')} FROM user_template WHERE user_id = $1`, [favId])
	]);
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
		sub: sub ? { ...sub, current_period_end: sub.current_period_end?.toISOString() ?? null } : null,
		template,
		billing: { stripe: stripeConfigured(), publishableKey: stripePublishableKey(), onStripe: Boolean(sub?.payment_customer_id || locals.user.stripe_customer_id) }
	};
};

export const actions: Actions = {
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
