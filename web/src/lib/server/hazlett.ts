// Hazlett Information Services (NSW LRS broker) — title search and plan/dealing
// image ordering. Protocol, history and open questions: docs/hazlett-api.md.
//
// Summary of the wire protocol (Hazlett's spec + IMTG's n8n export, verified live 2026-09-11):
//   GET  https://oauth.hazlett.com.au/auth?client_id=…            -> {"code"}
//   POST https://oauth.hazlett.com.au/oauth/token  Basic client_id:client_secret,
//        form client_id / code / username=URBAN     -> {"access_token","expires_in":2419200,"refresh_token","token_type":"Bearer"}
//   POST {base}/req/lrs   Authorization: Bearer <access_token>.<client_id>
//        {"orderId","productCode","folioIdentifier" | "imageType","subType","imageReferenceNumber"}
//     -> {"orderId","productDetails":[{"status":"Closed"|"In Progress","document":"<url>",...}]}
//   GET  <document url>   same Authorization  -> PDF, or 400 "Document is not ready", 404
// orderId must never repeat for our customer code (URBA): "order_id already exists".
import { env } from '$env/dynamic/private';

export type HazlettProduct = 'title' | 'image';

export const PRODUCT_CODES: Record<HazlettProduct, string> = {
	title: 'LRSTLSWM', // LRS Title Search with Meta Data (what upapp always ordered)
	image: 'LRSIMR' // LRS Image Search: DP/SP plan sheets or a DL dealing
};

export const PRODUCT_LABELS: Record<HazlettProduct, string> = {
	title: 'Title search',
	image: 'Plan / dealing image search'
};

/** Prices the WooCommerce products carried (920 "Title Search Online", 5057 "DP/SP Search"). */
export const PRODUCT_PRICES_AUD: Record<HazlettProduct, number> = { title: 25, image: 25 };

export interface HazlettProductDetail {
	status: string; // "Closed" (ready) | "In Progress" | "Error"
	folio?: string;
	land?: string;
	firstSchedules?: string;
	secondSchedules?: string;
	unregisteredDealings?: string;
	details?: string;
	message?: string;
	requestId?: string;
	requestIndex?: string;
	productCode: string;
	document?: string | string[];
}

export interface HazlettOrder {
	orderId: string;
	referenceNumber?: string;
	productDetails: HazlettProductDetail[];
}

export interface HazlettDocument {
	bytes: Buffer;
	contentType: string;
	url: string;
}

const SAMPLE_PDF = 'https://io.imsstratus.com.au/upproperty/title_search_sample.pdf';
const DEFAULT_BASE = 'https://api.hazlett.com.au';

export function hazlettMode(): 'mock' | 'live' {
	return (env.HAZLETT_MODE || '').toLowerCase() === 'live' ? 'live' : 'mock';
}

export function hazlettConfigured(): boolean {
	if (hazlettMode() === 'mock') return true;
	if (env.HAZLETT_TOKEN && env.HAZLETT_TOKEN.includes('.')) return true;
	return Boolean(env.HAZLETT_CLIENT_ID && env.HAZLETT_CLIENT_SECRET);
}

/**
 * Turn what a member typed into an LRSIMR image request.
 *   "DP7750" / "DP 7750" / "dp7750" -> DP plan 7750 (subType P)
 *   "SP103272"                       -> SP plan 103272 (subType P)
 *   "Y340060", "AB123456", "1234567" -> DL dealing
 * Returns null for nothing usable.
 */
export function parseImageIdentifier(raw: string): { imageType: string; subType?: string; imageReferenceNumber: string; label: string } | null {
	const s = raw.trim().toUpperCase().replace(/\s+/g, '');
	if (!s) return null;
	const plan = /^(DP|SP)(\d{1,9})$/.exec(s);
	if (plan) return { imageType: plan[1], subType: 'P', imageReferenceNumber: plan[2], label: `${plan[1]}${plan[2]}` };
	const dealing = /^[A-Z]{0,2}\d{1,12}[A-Z]?$/.exec(s);
	if (dealing) return { imageType: 'DL', imageReferenceNumber: s, label: `Dealing ${s}` };
	return null;
}

/**
 * Split what the app sends as one "folio identifier" into individual LRS folios.
 * upapp builds these from the property description and produces, among others:
 *   "642/9165"              -> ["642/9165"]
 *   "3/524962 16/629969"    -> ["3/524962", "16/629969"]   (two lots, two titles)
 *   "3 524962"              -> ["3/524962"]                (lot, space, plan)
 *   "1/3/SP1234"            -> ["1/3/SP1234"]              (lot/section/plan)
 */
export function normaliseFolios(raw: string): string[] {
	const s = raw.trim().toUpperCase();
	if (!s) return [];
	const parts = s.split(/\s+/).filter(Boolean);
	if (parts.length > 1 && parts.every((p) => p.includes('/'))) return parts;
	if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^(DP|SP)?\d+$/.test(parts[1])) return [`${parts[0]}/${parts[1]}`];
	const joined = parts.join('');
	return /^[A-Z0-9]+(\/[A-Z0-9]+){1,2}$/.test(joined) ? [joined] : [];
}

/** Body for POST /req/lrs. Exported so tests and the doc can show exactly what is sent. */
export function orderPayload(product: HazlettProduct, identifier: string, orderId: string): Record<string, string> | null {
	if (product === 'title') {
		const folios = normaliseFolios(identifier);
		if (folios.length !== 1) return null; // callers expand multi-folio strings first
		return { orderId, productCode: PRODUCT_CODES.title, folioIdentifier: folios[0] };
	}
	const img = parseImageIdentifier(identifier);
	if (!img) return null;
	const body: Record<string, string> = {
		orderId,
		productCode: PRODUCT_CODES.image,
		imageType: img.imageType,
		imageReferenceNumber: img.imageReferenceNumber
	};
	// Production requires subType on every LRSIMR (verified 2026-09-11: a DL order without it is
	// rejected "subType: Missing data for required field"). Dealings take "P" like plans.
	body.subType = img.subType ?? 'P';
	return body;
}

/** Place one order. `orderId` must be globally unique for our Hazlett customer code (use `UP<title_orders.id>`). */
export async function placeOrder(product: HazlettProduct, identifier: string, orderId: string): Promise<HazlettOrder> {
	const body = orderPayload(product, identifier, orderId);
	if (!body) throw new Error(`Cannot form a Hazlett request from "${identifier}"`);
	if (hazlettMode() === 'mock') return orderMock(product, identifier, orderId);

	const res = await fetch(`${baseUrl()}/req/lrs`, {
		method: 'POST',
		headers: { ...(await authHeader()), 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(Number(env.HAZLETT_TIMEOUT_MS || 60000))
	});
	const text = await res.text();
	if (!res.ok || text.trimStart().startsWith('<')) {
		// 401 "Authorization failed" is plain text; a bad Bearer header comes back as Werkzeug HTML.
		throw new Error(`Hazlett ${res.status}: ${text.replace(/\s+/g, ' ').slice(0, 200)}`);
	}
	const raw = JSON.parse(text) as Record<string, unknown>;
	if (String(raw.status ?? '').toLowerCase() === 'error') {
		throw new Error(`Hazlett ${raw.errorCode ?? ''}: ${raw.errorReason ?? 'order rejected'}`);
	}
	const details = Array.isArray(raw.productDetails) ? (raw.productDetails as HazlettProductDetail[]) : [];
	return { orderId: String(raw.orderId ?? orderId), referenceNumber: raw.referenceNumber as string | undefined, productDetails: details };
}

function orderMock(product: HazlettProduct, identifier: string, orderId: string): HazlettOrder {
	return {
		orderId,
		referenceNumber: `HAZURBA${orderId}`,
		productDetails: [
			{
				status: 'Closed',
				folio: product === 'title' ? identifier : undefined,
				details: product === 'title' ? 'LRS Title Search with Meta Data' : 'LRS Image Search',
				message: 'Document is ready to download (sample — HAZLETT_MODE=mock)',
				productCode: PRODUCT_CODES[product],
				document: SAMPLE_PDF
			}
		]
	};
}

export function documentUrl(order: HazlettOrder): string | null {
	const d = order.productDetails.find((p) => p.document)?.document;
	if (Array.isArray(d)) return d.find((u) => u.toLowerCase().endsWith('.pdf')) ?? d[0] ?? null;
	return d?.trim() || null;
}

export function isReady(order: HazlettOrder): boolean {
	return order.productDetails.some((p) => /^closed$/i.test(p.status));
}

/**
 * Fetch the ordered PDF, polling while LRS is still rendering it ("Document is
 * not ready to download" 400, or 404 before the record exists). Returns null if
 * it is still not ready when the budget runs out; the caller records the order
 * so it can be collected later.
 */
export async function fetchDocument(order: HazlettOrder, budgetMs = Number(env.HAZLETT_POLL_SECONDS || 90) * 1000): Promise<HazlettDocument | null> {
	const url = documentUrl(order);
	if (!url) return null;
	const mock = hazlettMode() === 'mock';
	const deadline = Date.now() + budgetMs;
	let lastErr = '';
	for (;;) {
		const res = await fetch(url, {
			headers: mock ? {} : await authHeader(),
			signal: AbortSignal.timeout(Number(env.HAZLETT_TIMEOUT_MS || 60000))
		});
		const ct = res.headers.get('content-type') || '';
		if (res.ok && !/json|html|text\/plain/i.test(ct)) {
			return { bytes: Buffer.from(await res.arrayBuffer()), contentType: ct || 'application/pdf', url };
		}
		const text = (await res.text()).replace(/\s+/g, ' ').slice(0, 200);
		if (res.status === 401) throw new Error(`Hazlett 401 fetching document: ${text}`);
		// 400 "Document is not ready to download" / 404 "Document not Found" / 200 JSON status: keep polling.
		lastErr = `${res.status} ${text}`;
		if (mock || Date.now() + 5000 > deadline) break;
		await new Promise((r) => setTimeout(r, 5000));
	}
	if (mock) throw new Error(`Sample document fetch failed: ${lastErr}`);
	console.warn('[hazlett] document not ready within budget', url, lastErr);
	return null;
}

function baseUrl(): string {
	return (env.HAZLETT_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}

// "Bearer <access_token>.<client_id>" — the prefix is mandatory; Hazlett splits on the space
// before validating, and a missing prefix returns a Werkzeug IndexError page (see doc §3).
async function authHeader(): Promise<Record<string, string>> {
	const staticToken = (env.HAZLETT_TOKEN || '').trim().replace(/^Bearer\s+/i, '');
	if (staticToken) {
		if (!staticToken.includes('.')) throw new Error('HAZLETT_TOKEN must be "<access_token>.<client_id>"');
		return { Authorization: `Bearer ${staticToken}` };
	}
	const token = await getAccessToken();
	return { Authorization: `Bearer ${token}.${env.HAZLETT_CLIENT_ID}` };
}

// OAuth tokens live 28 days (expires_in 2419200). One is cached per process and
// re-minted a day before expiry or after a 401. Minting is two calls on
// oauth.hazlett.com.au (a different host from the order API) and costs nothing.
let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(force = false): Promise<string> {
	if (!force && cached && cached.expiresAt - Date.now() > 24 * 3600 * 1000) return cached.token;
	const clientId = env.HAZLETT_CLIENT_ID;
	const secret = env.HAZLETT_CLIENT_SECRET;
	if (!clientId || !secret) throw new Error('Hazlett is not configured (HAZLETT_CLIENT_ID / HAZLETT_CLIENT_SECRET)');
	const oauth = (env.HAZLETT_OAUTH_URL || 'https://oauth.hazlett.com.au').replace(/\/$/, '');
	const timeout = AbortSignal.timeout(Number(env.HAZLETT_TIMEOUT_MS || 60000));

	const codeRes = await fetch(`${oauth}/auth?client_id=${encodeURIComponent(clientId)}`, { signal: timeout });
	const codeJson = (await codeRes.json().catch(() => ({}))) as { code?: string };
	if (!codeRes.ok || !codeJson.code) throw new Error(`Hazlett oauth /auth ${codeRes.status}: no code returned`);

	const form = new URLSearchParams({ client_id: clientId, code: codeJson.code, username: env.HAZLETT_USERNAME || 'URBAN' });
	const tokRes = await fetch(`${oauth}/oauth/token`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: form,
		signal: timeout
	});
	const tok = (await tokRes.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
	if (!tokRes.ok || !tok.access_token) throw new Error(`Hazlett oauth /oauth/token ${tokRes.status}: ${tok.error || 'no access_token'}`);
	cached = { token: tok.access_token, expiresAt: Date.now() + (tok.expires_in || 3600) * 1000 };
	return cached.token;
}
