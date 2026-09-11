// Title search / plan-and-dealing image orders: the order log, the PDF store and
// the collector queue. Protocol and timings: docs/hazlett-api.md.
//
// Life of an order:
//   place()    INSERT row (hazlett_status 'pending') -> Hazlett order -> next_poll_at = now
//   collect()  called immediately (titles are ready in ~2 s) and again by the collector
//              loop: GET the document; ready -> save under TITLE_DOCS_DIR, email via
//              Postmark, status 'ready'; not ready -> next_poll_at pushed out with backoff.
//   Images can take hours (four live orders were still pending after an hour on
//   2026-09-11), so the loop runs for the life of the process and a kick() after each
//   purchase makes it event-driven rather than purely periodic.
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { query, db } from '$lib/server/db';
import { sendPostmark, type MailAttachment } from '$lib/server/mail';
import { createCheckoutSession, getCheckoutSession, stripeConfigured } from '$lib/server/stripe';
import { titleReadyEmail } from '$lib/server/title-email';
import {
	placeOrder,
	fetchDocument,
	documentUrl,
	hazlettMode,
	PRODUCT_LABELS,
	PRODUCT_PRICES_AUD,
	type HazlettProduct,
	type HazlettOrder
} from '$lib/server/hazlett';

export interface TitleOrderRow {
	id: number;
	user_id: number | null;
	user_email: string;
	product: HazlettProduct;
	identifier: string;
	property_address: string | null;
	propid: string | null;
	price_aud: string;
	payment_status: string; // free | awaiting_payment | paid | abandoned | test_no_charge
	stripe_session_id: string | null;
	stripe_payment_intent: string | null;
	amount_paid_cents: number | null;
	paid_at: Date | null;
	hazlett_mode: string;
	hazlett_order_id: string | null;
	hazlett_status: string; // unpaid | pending | ready | error | stale
	document_url: string | null;
	document_path: string | null;
	document_size: number | null;
	ready_at: Date | null;
	next_poll_at: Date | null;
	poll_attempts: number;
	submit_attempts: number;
	emailed_to: string | null;
	emailed_at: Date | null;
	notified_at: Date | null;
	error: string | null;
	last_error: string | null;
	created_at: Date;
}

const COLS = `id, user_id, user_email, product, identifier, property_address, propid, price_aud, payment_status,
	stripe_session_id, stripe_payment_intent, amount_paid_cents, paid_at, hazlett_mode,
	hazlett_order_id, hazlett_status, document_url, document_path, document_size, ready_at, next_poll_at, poll_attempts, submit_attempts,
	emailed_to, emailed_at, notified_at, error, last_error, created_at`;

const docsDir = () => env.TITLE_DOCS_DIR || path.resolve('data/title-docs');
const maxAttachBytes = () => Number(env.HAZLETT_MAX_ATTACH_MB || 9) * 1024 * 1024;
const giveUpAfterMs = () => Number(env.HAZLETT_COLLECT_MAX_DAYS || 5) * 86400_000;

/**
 * Members can re-download a document for this many days after it arrived; after that the
 * file stays on disk (admins can still fetch it) but the member's link is closed.
 * TITLE_DOWNLOAD_DAYS, default 90 (3 months, per Danny 2026-09-11).
 */
export const downloadDays = () => Number(env.TITLE_DOWNLOAD_DAYS || 90);

export function downloadUntil(row: Pick<TitleOrderRow, 'ready_at'>): Date | null {
	if (!row.ready_at) return null;
	return new Date(new Date(row.ready_at).getTime() + downloadDays() * 86400_000);
}

export function downloadClosed(row: Pick<TitleOrderRow, 'ready_at'>): boolean {
	const d = downloadUntil(row);
	return d != null && d.getTime() < Date.now();
}

/** The buyer, unless TITLE_SEARCH_RECIPIENT overrides it (soft-launch only). */
export function recipientFor(userEmail: string): string {
	return env.TITLE_SEARCH_RECIPIENT || userEmail;
}

/** Interim copy of every document email (TITLE_SEARCH_BCC, per Danny 2026-09-11). */
export function bccFor(): string | undefined {
	return env.TITLE_SEARCH_BCC || undefined;
}

// ---------------------------------------------------------------- payment

/** Accounts that never pay: comma list in TITLE_SEARCH_FREE_EMAILS (default Stuart). */
export function isFree(email: string): boolean {
	const list = (env.TITLE_SEARCH_FREE_EMAILS ?? 'stuart@urbanperspectives.com.au').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
	return list.includes(email.toLowerCase());
}

export const paymentsConfigured = () => stripeConfigured();

// ---------------------------------------------------------------- placing

export interface PlaceInput {
	user: { id: number; email: string; first_name?: string | null; last_name?: string | null };
	product: HazlettProduct;
	identifier: string;
	address: string | null;
	propid: string | null;
}

/** Insert a row that is not yet sent to Hazlett (`unpaid`), or, for a free account, straight to `pending`. */
async function insertRow(input: PlaceInput, paymentStatus: 'free' | 'awaiting_payment'): Promise<TitleOrderRow> {
	const [row] = await query<TitleOrderRow>(
		`INSERT INTO title_orders (user_id, user_email, product, identifier, property_address, propid, price_aud, payment_status, hazlett_mode, hazlett_status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLS}`,
		[input.user.id, input.user.email, input.product, input.identifier, input.address, input.propid, PRODUCT_PRICES_AUD[input.product],
		 paymentStatus, hazlettMode(), paymentStatus === 'free' ? 'pending' : 'unpaid']
	);
	return row;
}

/** Free account: insert, order from Hazlett, queue. Never throws for a Hazlett error: the row records it. */
export async function place(input: PlaceInput): Promise<TitleOrderRow> {
	const row = await insertRow(input, 'free');
	return submit(row);
}

/**
 * Paid account: insert the rows as `awaiting_payment` and open a Stripe Checkout
 * (mode=payment, $25 per item). The success URL and the collector's reconcile both
 * call fulfilSession(); nothing is ordered from Hazlett until Stripe says paid.
 */
export async function startCheckout(inputs: PlaceInput[], origin: string): Promise<{ url: string; rows: TitleOrderRow[] }> {
	if (!inputs.length) throw new Error('nothing to buy');
	const rows: TitleOrderRow[] = [];
	for (const i of inputs) rows.push(await insertRow(i, 'awaiting_payment'));
	const user = inputs[0].user;
	const session = await createCheckoutSession({
		mode: 'payment',
		customer_email: user.email,
		customer_creation: 'always',
		line_items: rows.map((r) => ({
			quantity: 1,
			price_data: {
				currency: 'aud',
				unit_amount: Math.round(Number(r.price_aud) * 100),
				product_data: { name: `${PRODUCT_LABELS[r.product]} — ${r.identifier}`, description: r.property_address ?? undefined }
			}
		})),
		metadata: { product: 'title_search', order_ids: rows.map((r) => r.id).join(','), user_id: user.id },
		payment_intent_data: { metadata: { product: 'title_search', order_ids: rows.map((r) => r.id).join(',') } },
		success_url: `${origin}/api/title-search/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/app/?purchase=cancelled`
	});
	const stamped = await query<TitleOrderRow>(
		`UPDATE title_orders SET stripe_session_id=$2, next_poll_at=now() + interval '3 minutes' WHERE id = ANY($1) RETURNING ${COLS}`,
		[rows.map((r) => r.id), session.id]
	);
	return { url: session.url, rows: stamped.sort((x, y) => x.id - y.id) };
}

/**
 * Called from the Stripe success URL and by the collector for `unpaid` rows: read the
 * session, and if it is paid, mark the rows and send them to Hazlett. Idempotent — only
 * rows still `unpaid` are touched. Returns the rows for the session.
 */
export async function fulfilSession(sessionId: string, inlineWaitMs = 0): Promise<{ paid: boolean; rows: TitleOrderRow[] }> {
	const session = await getCheckoutSession(sessionId);
	const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
	const ids = (session.metadata?.order_ids ?? '').split(',').map(Number).filter(Number.isInteger);
	if (!ids.length) return { paid, rows: [] };
	if (!paid) {
		if (session.status === 'expired') {
			await query(`UPDATE title_orders SET payment_status='abandoned', next_poll_at=NULL WHERE id = ANY($1) AND hazlett_status='unpaid'`, [ids]);
		} else {
			await query(`UPDATE title_orders SET next_poll_at=now() + interval '10 minutes' WHERE id = ANY($1) AND hazlett_status='unpaid'`, [ids]);
		}
		return { paid: false, rows: await query<TitleOrderRow>(`SELECT ${COLS} FROM title_orders WHERE id = ANY($1) ORDER BY id`, [ids]) };
	}
	const pi = (session as unknown as { payment_intent?: string | null }).payment_intent ?? null;
	const claimed = await query<TitleOrderRow>(
		`UPDATE title_orders SET payment_status='paid', paid_at=now(), stripe_payment_intent=$2, amount_paid_cents=round(price_aud*100)::int,
		        hazlett_status='pending', next_poll_at=NULL
		  WHERE id = ANY($1) AND hazlett_status='unpaid' AND stripe_session_id=$3 RETURNING ${COLS}`,
		[ids, pi, sessionId]
	);
	const out: TitleOrderRow[] = [];
	for (const r of claimed) {
		let row = await submit(r);
		if (row.hazlett_status === 'pending' && inlineWaitMs > 0) row = await collect(row.id, inlineWaitMs);
		out.push(row);
	}
	if (claimed.length < ids.length) {
		const rest = await query<TitleOrderRow>(`SELECT ${COLS} FROM title_orders WHERE id = ANY($1) AND NOT (id = ANY($2)) ORDER BY id`, [ids, claimed.map((c) => c.id)]);
		out.push(...rest);
	}
	kick(25_000);
	return { paid: true, rows: out.sort((a, b) => a.id - b.id) };
}

const MAX_SUBMIT_ATTEMPTS = 8;

/**
 * Place the Hazlett order for an existing `pending` row and queue it for collection.
 * Defensive by design: a row that is `pending` with no `document_url` is one whose
 * Hazlett call never completed (server restart mid-request, timeout, 5xx), and the
 * collector brings it back here. Each attempt uses a fresh order id (UP<id>, then
 * UP<id>R1, R2…) because Hazlett rejects a repeated id; if Hazlett says the id already
 * exists, the earlier call did land and the row simply adopts that document URL.
 * Only a definite rejection (4xx other than the duplicate) marks the row `error`.
 */
export async function submit(row: TitleOrderRow): Promise<TitleOrderRow> {
	const attempt = row.submit_attempts ?? 0;
	const orderId = attempt === 0 ? `UP${row.id}` : `UP${row.id}R${attempt}`;
	const base = (env.HAZLETT_BASE_URL || 'https://api.hazlett.com.au').replace(/\/$/, '');
	const urlFor = (id: string) => `${base}/req/lrs/HAZURBA${id}.pdf`;
	await query(`UPDATE title_orders SET submit_attempts=$2 WHERE id=$1`, [row.id, attempt + 1]);
	try {
		const order: HazlettOrder = await placeOrder(row.product, row.identifier, orderId);
		const url = documentUrl(order) ?? urlFor(orderId);
		const [updated] = await query<TitleOrderRow>(
			`UPDATE title_orders SET hazlett_order_id=$2, document_url=$3, hazlett_status='pending', next_poll_at=now(), last_error=NULL WHERE id=$1 RETURNING ${COLS}`,
			[row.id, order.referenceNumber || orderId, url]
		);
		return updated;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error('[title-orders] submit failed', row.id, orderId, msg);
		if (/order_id.*already.*exists/i.test(msg)) {
			// The previous attempt reached Hazlett after all: keep polling its document.
			const [updated] = await query<TitleOrderRow>(
				`UPDATE title_orders SET hazlett_order_id=COALESCE(hazlett_order_id,$2), document_url=COALESCE(document_url,$3), next_poll_at=now(), last_error=$4 WHERE id=$1 RETURNING ${COLS}`,
				[row.id, orderId, urlFor(orderId), msg.slice(0, 500)]
			);
			return updated;
		}
		const definite = /Hazlett 4\d\d/.test(msg) || /Cannot form a Hazlett request/.test(msg) || /not configured/.test(msg);
		if (definite || attempt + 1 >= MAX_SUBMIT_ATTEMPTS) {
			const [updated] = await query<TitleOrderRow>(
				`UPDATE title_orders SET hazlett_status='error', error=$2, next_poll_at=NULL WHERE id=$1 RETURNING ${COLS}`,
				[row.id, msg.slice(0, 500)]
			);
			return updated;
		}
		// Transient (timeout, 5xx, network, token mint): stay pending, retry on backoff.
		const [updated] = await query<TitleOrderRow>(
			`UPDATE title_orders SET last_error=$2, next_poll_at=now() + ($3::int * interval '1 millisecond') WHERE id=$1 RETURNING ${COLS}`,
			[row.id, msg.slice(0, 500), backoffMs(attempt)]
		);
		return updated;
	}
}

// ---------------------------------------------------------------- collecting

/** Poll backoff: 30 s, 1, 2, 5, 10, 15 min, then every 30 min. */
function backoffMs(attempt: number): number {
	const steps = [30_000, 60_000, 120_000, 300_000, 600_000, 900_000];
	return steps[Math.min(attempt, steps.length - 1)] ?? 1_800_000;
}

/**
 * One collection attempt for one order. Returns the fresh row. `budgetMs` > 0 lets
 * the immediate post-purchase call wait a little (titles land in ~2 s).
 */
export async function collect(id: number, budgetMs = 0): Promise<TitleOrderRow> {
	const [row] = await query<TitleOrderRow>(`SELECT ${COLS} FROM title_orders WHERE id=$1`, [id]);
	if (!row) throw new Error(`title_orders ${id} not found`);
	if (row.hazlett_status !== 'pending') return row;
	if (!row.document_url) return submit(row); // Hazlett call never completed: order again

	const order: HazlettOrder = {
		orderId: `UP${row.id}`,
		productDetails: [{ productCode: '', status: 'In Progress', document: row.document_url }]
	};
	try {
		const doc = await fetchDocument(order, budgetMs);
		if (!doc) {
			const age = Date.now() - new Date(row.created_at).getTime();
			if (age > giveUpAfterMs()) {
				const [r] = await query<TitleOrderRow>(
					`UPDATE title_orders SET hazlett_status='stale', next_poll_at=NULL, poll_attempts=poll_attempts+1,
					        last_error='not ready after '||$2||' days' WHERE id=$1 RETURNING ${COLS}`,
					[row.id, Number(env.HAZLETT_COLLECT_MAX_DAYS || 5)]
				);
				console.warn('[title-orders] gave up on', row.id, row.identifier);
				return r;
			}
			const [r] = await query<TitleOrderRow>(
				`UPDATE title_orders SET poll_attempts=poll_attempts+1, next_poll_at=now() + ($2::int * interval '1 millisecond') WHERE id=$1 RETURNING ${COLS}`,
				[row.id, backoffMs(row.poll_attempts)]
			);
			return r;
		}

		await mkdir(docsDir(), { recursive: true });
		const file = `${row.id}-${row.product}-${row.identifier.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`;
		await writeFile(path.join(docsDir(), file), doc.bytes);
		const [ready] = await query<TitleOrderRow>(
			`UPDATE title_orders SET hazlett_status='ready', document_path=$2, document_size=$3, ready_at=now(), next_poll_at=NULL,
			        poll_attempts=poll_attempts+1, last_error=NULL WHERE id=$1 RETURNING ${COLS}`,
			[row.id, file, doc.bytes.length]
		);
		await notify(ready, doc.bytes);
		return ready;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error('[title-orders] collect failed', row.id, msg);
		// A 401 or network error is not "not ready": retry on the same backoff, keep the message.
		const [r] = await query<TitleOrderRow>(
			`UPDATE title_orders SET poll_attempts=poll_attempts+1, last_error=$2, next_poll_at=now() + ($3::int * interval '1 millisecond') WHERE id=$1 RETURNING ${COLS}`,
			[row.id, msg.slice(0, 500), backoffMs(row.poll_attempts)]
		);
		return r;
	}
}

/** Email the PDF (Postmark only) once it is on disk. Failure leaves notified_at NULL for the next pass to retry. */
async function notify(row: TitleOrderRow, bytes?: Buffer): Promise<void> {
	if (row.notified_at || !row.document_path) return;
	const pdf = bytes ?? (await readFile(path.join(docsDir(), row.document_path)));
	const to = recipientFor(row.user_email);
	const label = PRODUCT_LABELS[row.product];
	const attached = pdf.length <= maxAttachBytes();
	const attachments: MailAttachment[] = attached
		? [{ filename: `${label} ${row.identifier}.pdf`.replace(/[\/\\]/g, '-'), content: pdf, contentType: 'application/pdf' }]
		: [];
	const [who] = row.user_id ? await query<{ first_name: string | null }>(`SELECT first_name FROM users WHERE id=$1`, [row.user_id]) : [];
	const mail = titleReadyEmail(row, { attached, sizeBytes: pdf.length, firstName: who?.first_name });
	try {
		await sendPostmark(to, mail.subject, mail.text, attachments, mail.html, bccFor());
		await query(`UPDATE title_orders SET emailed_to=$2, emailed_at=now(), notified_at=now() WHERE id=$1`, [row.id, to]);
	} catch (e) {
		console.error('[title-orders] mail failed', row.id, e);
		await query(`UPDATE title_orders SET last_error=$2, next_poll_at=now() + interval '5 minutes' WHERE id=$1`, [row.id, `mail: ${(e as Error).message}`.slice(0, 500)]);
	}
}

// ---------------------------------------------------------------- the collector loop

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/** Process every due row once. Safe to call concurrently across processes (SKIP LOCKED). */
export async function processDue(): Promise<number> {
	if (running) return 0;
	running = true;
	let done = 0;
	try {
		// Ready rows whose email failed come back through here too (next_poll_at set by notify()).
		const due = await query<{ id: number; hazlett_status: string }>(
			`SELECT id, hazlett_status FROM title_orders WHERE next_poll_at IS NOT NULL AND next_poll_at <= now() ORDER BY next_poll_at LIMIT 25 FOR UPDATE SKIP LOCKED`
		);
		for (const d of due) {
			if (d.hazlett_status === 'unpaid') {
				// Stripe success page never ran (tab closed): ask Stripe directly. Abandon after a day.
				const [row] = await query<TitleOrderRow>(`SELECT ${COLS} FROM title_orders WHERE id=$1`, [d.id]);
				if (!row?.stripe_session_id || Date.now() - new Date(row.created_at).getTime() > 86400_000) {
					await query(`UPDATE title_orders SET payment_status='abandoned', next_poll_at=NULL WHERE id=$1 AND hazlett_status='unpaid'`, [d.id]);
				} else {
					try { await fulfilSession(row.stripe_session_id); }
					catch (e) { console.error('[title-orders] reconcile failed', d.id, e); await query(`UPDATE title_orders SET next_poll_at=now() + interval '10 minutes' WHERE id=$1`, [d.id]); }
				}
			} else if (d.hazlett_status === 'ready') {
				const [row] = await query<TitleOrderRow>(`SELECT ${COLS} FROM title_orders WHERE id=$1`, [d.id]);
				await query(`UPDATE title_orders SET next_poll_at=NULL WHERE id=$1`, [d.id]);
				if (row) await notify(row);
			} else {
				await collect(d.id, 0);
			}
			done++;
		}
	} catch (e) {
		console.error('[title-orders] collector pass failed', e);
	} finally {
		running = false;
	}
	return done;
}

/** Start the periodic pass (idempotent). Called from hooks.server.ts at boot. */
export function startCollector(intervalMs = Number(env.HAZLETT_COLLECT_INTERVAL_MS || 60_000)): void {
	if (timer) return;
	if (!env.DATABASE_URL) return; // nothing to poll without a DB (build-time import)
	timer = setInterval(() => void processDue(), intervalMs);
	timer.unref?.();
	setTimeout(() => void processDue(), 5_000).unref?.(); // catch up on anything left from before a restart
	console.log(`[title-orders] collector started, every ${Math.round(intervalMs / 1000)} s, docs in ${docsDir()}`);
}

/** Event trigger: run a pass right away (after a purchase, after an admin nudge). */
export function kick(delayMs = 0): void {
	setTimeout(() => void processDue(), delayMs).unref?.();
}

// ---------------------------------------------------------------- reading

export async function listOrders(userId: number): Promise<TitleOrderRow[]> {
	return query<TitleOrderRow>(`SELECT ${COLS} FROM title_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200`, [userId]);
}

export async function getOrder(id: number): Promise<TitleOrderRow | null> {
	const [row] = await query<TitleOrderRow>(`SELECT ${COLS} FROM title_orders WHERE id=$1`, [id]);
	return row ?? null;
}

export async function readDocument(row: TitleOrderRow): Promise<{ bytes: Buffer; filename: string } | null> {
	if (!row.document_path) return null;
	const full = path.join(docsDir(), path.basename(row.document_path));
	try {
		await stat(full);
	} catch {
		return null;
	}
	return { bytes: await readFile(full), filename: `${PRODUCT_LABELS[row.product]} ${row.identifier}.pdf`.replace(/[\/\\]/g, '-') };
}

// keep `db` referenced for a future advisory-lock variant without an unused-import warning
void db;
