// The "your document is ready" email for title / plan / dealing purchases.
// Styled on the site's tokens (app.css): near-black purple ground for the header,
// brand purple #5c2687 for the action, mint #5ee8ad for the mono "spec" eyebrow,
// white body for mail-client legibility. Table layout + inline styles because email.
import { env } from '$env/dynamic/private';
import { PRODUCT_LABELS } from '$lib/server/hazlett';
import { downloadUntil, type TitleOrderRow } from '$lib/server/title-orders';

const PURPLE = '#5c2687';
const TEAL = '#5ee8ad';
const INK = '#16121f';
const HEADER = '#3a1758'; // --color-brand-purple-700, the site's darkest purple
const LINE = '#e6e1ee';
const MUTED = '#6f6880';
const FONT = "Geist, 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** "19/7750" -> "Lot 19 DP 7750", "1/SP5" -> "Lot 1 SP 5", "1/3/SP1234" -> "Lot 1 Sec 3 SP 1234", "DP9165" -> "DP 9165", "AN941872" -> "Dealing AN941872". */
export function lotLabel(row: Pick<TitleOrderRow, 'product' | 'identifier'>): string {
	const id = row.identifier.trim().toUpperCase();
	if (row.product === 'image') {
		const plan = /^(DP|SP)\s*(\d+)$/.exec(id);
		return plan ? `${plan[1]} ${plan[2]}` : `Dealing ${id}`;
	}
	const parts = id.split('/');
	const plan = parts[parts.length - 1];
	const planText = /^(DP|SP)(\d+)$/.test(plan) ? plan.replace(/^(DP|SP)/, '$1 ') : /^\d+$/.test(plan) ? `DP ${plan}` : plan;
	if (parts.length === 3) return `Lot ${parts[0]} Sec ${parts[1]} ${planText}`;
	if (parts.length === 2) return `Lot ${parts[0]} ${planText}`;
	return id;
}

export interface TitleEmail {
	subject: string;
	text: string;
	html: string;
}

export function titleReadyEmail(row: TitleOrderRow, opts: { attached: boolean; sizeBytes: number; firstName?: string | null }): TitleEmail {
	const origin = env.PUBLIC_ORIGIN || 'https://www.urbanprospects.com.au';
	const label = PRODUCT_LABELS[row.product];
	const isTitle = row.product === 'title';
	const kind = isTitle ? 'Title search' : 'Plan / dealing image';
	const refLabel = isTitle ? 'Folio' : 'Reference';
	const link = `${origin}/account/documents/${row.id}/`;
	const docsLink = `${origin}/account/#documents`;
	const mb = (opts.sizeBytes / 1048576).toFixed(opts.sizeBytes > 10 * 1048576 ? 0 : 1);
	const sizeText = opts.sizeBytes >= 1048576 ? `${mb} MB` : `${Math.round(opts.sizeBytes / 1024)} KB`;
	const ordered = new Date(row.created_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
	const hello = opts.firstName ? `Hi ${opts.firstName},` : 'Hello,';
	const lot = lotLabel(row);
	const address = row.property_address?.trim() || null;
	const where = address ?? lot;
	const paid = row.payment_status === 'paid' && row.amount_paid_cents != null ? `$${(row.amount_paid_cents / 100).toFixed(2)} AUD` : row.payment_status === 'free' ? 'No charge' : null;

	const fmtLong = (d: Date) => d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'long', year: 'numeric' });
	// A title search has no statutory validity period; it records the Register as at the
	// search time printed on it (docs/hazlett-api.md "Title validity"). Show that time.
	const searched = row.ready_at ? new Date(row.ready_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
	const dl = downloadUntil(row);
	const downloadTo = dl ? fmtLong(dl) : null;

	const subject = `Your ${kind.toLowerCase()} is ready — ${where}`;

	const text = [
		hello,
		'',
		`Your ${kind.toLowerCase()} for ${where} is ready.`,
		'',
		`${isTitle ? 'Lot / plan' : 'Plan / dealing'}: ${lot}`,
		`${refLabel}: ${row.identifier}`,
		`Ordered: ${ordered}`,
		`Order: UP${row.id}`,
		paid ? `Paid: ${paid}` : '',
		searched && isTitle ? `Search date: ${searched}` : '',
		'',
		opts.attached ? `The PDF (${sizeText}) is attached. It is also saved in your account:` : `The PDF is ${sizeText}, too large to attach, so download it from your account:`,
		link,
		'',
		`All your title, plan and dealing searches: ${docsLink}`,
		downloadTo ? `You can re-download this document from your account until ${downloadTo}.` : '',
		'',
		'Documents are supplied by Hazlett Information Services, a registered NSW Land Registry Services broker. A title search records the Register as at the search time printed on it and has no fixed validity period; order a fresh search before exchange and again immediately before settlement.',
		'',
		'Urban Prospects · info@urbanprospects.com.au · urbanprospects.com.au'
	].filter((l) => l !== '' || true).join('\n').replace(/\n{3,}/g, '\n\n');

	const row2 = (k: string, v: string) => `
		<tr>
			<td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};width:38%;vertical-align:top">${esc(k)}</td>
			<td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${FONT};font-size:14px;color:${INK};vertical-align:top">${v}</td>
		</tr>`;

	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f0f7;">
<span style="display:none!important;max-height:0;overflow:hidden;opacity:0">${esc(kind)} for ${esc(where)} — ${opts.attached ? 'PDF attached' : 'download from your account'}.</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0f7;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE}">
	<tr><td style="background:${HEADER};padding:26px 32px">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
			<td><img src="${origin}/urban-propspects-logo-white.png" width="150" alt="Urban Prospects" style="display:block;width:150px;height:auto;border:0"></td>
			<td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${TEAL}">Planning intelligence for NSW</td>
		</tr></table>
	</td></tr>
	<tr><td style="padding:34px 32px 8px">
		<p style="margin:0 0 10px;font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${PURPLE}">${esc(kind)}</p>
		<h1 style="margin:0 0 4px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:600;color:${INK}">${esc(address ?? lot)}</h1>
		${address ? `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.4;color:${MUTED}">${esc(lot)}</p>` : '<div style="height:14px"></div>'}
		<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK}">${esc(hello)} your ${esc(kind.toLowerCase())} has come back from NSW Land Registry Services. ${opts.attached ? `The PDF (${sizeText}) is attached to this email and saved in your account.` : `The PDF is ${sizeText}, larger than email allows, so it is waiting in your account.`}</p>
	</td></tr>
	<tr><td style="padding:18px 32px 6px">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
			${row2(refLabel, `<span style="font-family:${MONO};font-size:14px;color:${PURPLE}">${esc(row.identifier)}</span>`)}
			${row2('Document', esc(label))}
			${row2('Ordered', esc(ordered))}
			${row2('Order', `UP${row.id}`)}
			${paid ? row2('Paid', esc(paid)) : ''}
			${searched && isTitle ? row2('Search date', `${esc(searched)} <span style="color:${MUTED}">· the Register as at this time</span>`) : ''}
			${downloadTo ? row2('Download until', esc(downloadTo)) : ''}
		</table>
	</td></tr>
	<tr><td style="padding:22px 32px 10px">
		<table role="presentation" cellspacing="0" cellpadding="0"><tr>
			<td style="border-radius:10px;background:${PURPLE}"><a href="${link}" style="display:inline-block;padding:13px 22px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${opts.attached ? 'View in My Account' : 'Download the PDF'}</a></td>
			<td style="padding-left:14px"><a href="${docsLink}" style="font-family:${FONT};font-size:13px;color:${PURPLE};text-decoration:underline">All my documents</a></td>
		</tr></table>
	</td></tr>
	<tr><td style="padding:16px 32px 30px">
		<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.55;color:${MUTED}">Supplied by Hazlett Information Services, a registered NSW Land Registry Services broker. A title search records the Register as at the search time printed on it and has no fixed validity period; conveyancers order a fresh search before exchange and again immediately before settlement. Questions? Reply to this email or write to <a href="mailto:info@urbanprospects.com.au" style="color:${PURPLE}">info@urbanprospects.com.au</a>.</p>
	</td></tr>
	<tr><td style="background:#f8f6fb;border-top:1px solid ${LINE};padding:16px 32px">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
			<td style="font-family:${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${MUTED}">Urban Prospects</td>
			<td align="right" style="font-family:${FONT};font-size:12px;color:${MUTED}"><a href="${origin}/" style="color:${MUTED};text-decoration:none">urbanprospects.com.au</a></td>
		</tr></table>
	</td></tr>
</table>
</td></tr></table>
</body></html>`;

	return { subject, text, html };
}
