// Minimal Stripe client: one call, Checkout Sessions, over the REST API with
// fetch. Avoids pulling the stripe SDK in for a single endpoint.
import { env } from '$env/dynamic/private';

export const REGION_NAMES = ['Sydney', 'Central and Hunter', 'Northern', 'Southern', 'Western'] as const;
export type Region = (typeof REGION_NAMES)[number];
export type Interval = 'month' | 'year';

/** Stripe price id for N regions on the given interval, from
 *  STRIPE_PRICE_REGION_{N}{M|A} in the environment. */
export function priceIdFor(regionCount: number, interval: Interval): string | null {
	const key = `STRIPE_PRICE_REGION_${regionCount}${interval === 'month' ? 'M' : 'A'}`;
	return env[key] || null;
}

/** Display prices, per user. Must match the Stripe prices above; Stripe is the
 *  source of truth at checkout, these only drive what the page shows. */
export const DISPLAY_PRICES: Record<number, { month: number; year: number }> = {
	1: { month: 50, year: 550 },
	2: { month: 60, year: 600 },
	3: { month: 70, year: 650 },
	4: { month: 80, year: 700 },
	5: { month: 90, year: 750 }
};

function form(obj: Record<string, unknown>, prefix = '', out = new URLSearchParams()) {
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}[${k}]` : k;
		if (v === undefined || v === null) continue;
		if (Array.isArray(v)) v.forEach((item, i) => form({ [i]: item }, key, out));
		else if (typeof v === 'object') form(v as Record<string, unknown>, key, out);
		else out.append(key, String(v));
	}
	return out;
}

export async function createCheckoutSession(params: Record<string, unknown>) {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
	const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: form(params)
	});
	const json = (await res.json()) as { url?: string; id?: string; error?: { message: string } };
	if (!res.ok || !json.url) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
	return json as { url: string; id: string };
}

/** Fetch a Checkout Session with its subscription expanded (for the renewal
 *  success page, which writes the new row itself rather than waiting for a webhook). */
export async function getCheckoutSession(id: string): Promise<StripeSession> {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
	if (!/^cs_[A-Za-z0-9_]+$/.test(id)) throw new Error('bad session id');
	const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}?expand[]=subscription`, {
		headers: { Authorization: `Bearer ${key}` }
	});
	const json = (await res.json()) as StripeSession & { error?: { message: string } };
	if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
	return json;
}

export interface StripeSession {
	id: string;
	status: 'open' | 'complete' | 'expired';
	payment_status: 'paid' | 'unpaid' | 'no_payment_required';
	customer: string | null;
	customer_details?: { email?: string | null } | null;
	metadata?: Record<string, string>;
	subscription: null | {
		id: string;
		status: string;
		customer: string;
		current_period_end?: number;
		default_payment_method?: string | null;
		items: { data: { price: { id: string; unit_amount: number | null; recurring?: { interval: string } }; quantity: number; current_period_end?: number }[] };
	};
}

/** Cancel a Stripe subscription. `atPeriodEnd` keeps access until the paid period
 *  runs out (Stripe then emits customer.subscription.deleted); otherwise it ends now. */
export async function cancelSubscription(subscriptionId: string, atPeriodEnd: boolean) {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
	if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) throw new Error('bad subscription id');
	const url = `https://api.stripe.com/v1/subscriptions/${subscriptionId}`;
	const res = atPeriodEnd
		? await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'cancel_at_period_end=true' })
		: await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${key}` } });
	const json = (await res.json()) as { id: string; status: string; cancel_at_period_end: boolean; current_period_end?: number; items?: { data: { current_period_end?: number }[] }; error?: { message: string } };
	if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
	return json;
}

/** Stripe Billing Portal session: lets a member change the card on file (and
 *  see invoices) without us touching card data. Only for accounts that have a
 *  Stripe customer; imported (Pin) members re-card through /renew/. */
export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
	const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: form({ customer: customerId, return_url: returnUrl })
	});
	const json = (await res.json()) as { url?: string; error?: { message: string } };
	if (!res.ok || !json.url) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
	return json.url;
}
export const stripeConfigured = () => Boolean(env.STRIPE_SECRET_KEY);

/** Publishable key for Stripe.js on the client (card element on /account/). */
export const stripePublishableKey = () => env.STRIPE_PUBLISHABLE_KEY || null;

async function stripePost(path: string, body: Record<string, unknown>) {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
	const res = await fetch(`https://api.stripe.com/v1${path}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: form(body)
	});
	const json = (await res.json()) as Record<string, unknown> & { error?: { message: string } };
	if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
	return json;
}

/** A SetupIntent lets the member enter a new card in a Stripe Element on
 *  /account/; Stripe attaches the resulting payment method to the customer. */
export async function createSetupIntent(customerId: string): Promise<string> {
	if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) throw new Error('bad customer id');
	const json = await stripePost('/setup_intents', { customer: customerId, payment_method_types: ['card'], usage: 'off_session' });
	return json.client_secret as string;
}

/** After the card is confirmed client-side: make it the customer's default for
 *  invoices and the subscription's default, so the next renewal charges it. */
export async function setDefaultPaymentMethod(customerId: string, subscriptionId: string | null, paymentMethodId: string) {
	if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) throw new Error('bad customer id');
	if (!/^pm_[A-Za-z0-9]+$/.test(paymentMethodId)) throw new Error('bad payment method id');
	const key = env.STRIPE_SECRET_KEY;
	const pmRes = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentMethodId}`, { headers: { Authorization: `Bearer ${key}` } });
	const pm = (await pmRes.json()) as { customer?: string | null; error?: { message: string } };
	if (!pmRes.ok) throw new Error(pm.error?.message ?? `Stripe ${pmRes.status}`);
	if (pm.customer !== customerId) throw new Error('payment method does not belong to this customer');
	await stripePost(`/customers/${customerId}`, { invoice_settings: { default_payment_method: paymentMethodId } });
	if (subscriptionId && /^sub_[A-Za-z0-9]+$/.test(subscriptionId)) {
		await stripePost(`/subscriptions/${subscriptionId}`, { default_payment_method: paymentMethodId });
	}
}
