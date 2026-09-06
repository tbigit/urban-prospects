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
