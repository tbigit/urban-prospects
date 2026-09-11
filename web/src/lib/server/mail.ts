// Outbound mail (password resets, child-account invites).
//
// Three paths, in order of preference:
//   1. POSTMARK_TOKEN set -> Postmark's HTTP API (no extra dependency, just fetch).
//   2. SMTP_HOST set      -> nodemailer over SMTP.
//   3. neither            -> print the message to stdout, which is what dev and
//                            staging should use so nothing is ever really sent.
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

const POSTMARK_URL = 'https://api.postmarkapp.com/email';

export interface MailAttachment {
	filename: string;
	content: Buffer;
	contentType?: string;
}

/**
 * Postmark only — no SMTP or stdout fallback. For mail that must really leave
 * (title search PDFs); throws when POSTMARK_TOKEN is unset.
 */
export async function sendPostmark(to: string, subject: string, text: string, attachments: MailAttachment[] = [], html?: string, bcc?: string) {
	if (!env.POSTMARK_TOKEN) throw new Error('POSTMARK_TOKEN is not set');
	return sendMail(to, subject, text, attachments, html, bcc);
}

/** `html`, when given, is sent alongside the plain-text body (multipart alternative). */
export async function sendMail(to: string, subject: string, text: string, attachments: MailAttachment[] = [], html?: string, bcc?: string) {
	// The From domain must be a verified Postmark sender signature. Only
	// app.urbanprospects.com.au is DKIM-verified on the account, so replies are
	// pointed at the real inbox on the root domain instead.
	const from = env.MAIL_FROM || 'Urban Prospects <no-reply@app.urbanprospects.com.au>';
	const replyTo = env.MAIL_REPLY_TO || 'info@urbanprospects.com.au';

	if (env.POSTMARK_TOKEN) {
		const res = await fetch(POSTMARK_URL, {
			method: 'POST',
			headers: {
				'X-Postmark-Server-Token': env.POSTMARK_TOKEN,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				From: from,
				To: to,
				Subject: subject,
				TextBody: text,
				...(html ? { HtmlBody: html } : {}),
				...(bcc ? { Bcc: bcc } : {}),
				ReplyTo: replyTo,
				MessageStream: env.POSTMARK_STREAM || 'outbound',
				// Postmark caps a message at 10MB including attachments.
				Attachments: attachments.map((a) => ({
					Name: a.filename,
					Content: a.content.toString('base64'),
					ContentType: a.contentType || 'application/pdf'
				}))
			})
		});
		const json = (await res.json().catch(() => ({}))) as { ErrorCode?: number; Message?: string; MessageID?: string };
		// Postmark answers 200 with ErrorCode 0 on success; anything else is a failure
		// (unverified sender signature, inactive recipient, bad token).
		if (!res.ok || (json.ErrorCode ?? 0) !== 0) {
			throw new Error(`Postmark ${res.status} ${json.ErrorCode ?? ''}: ${json.Message ?? 'send failed'}`);
		}
		return;
	}

	if (!env.SMTP_HOST) {
		const att = attachments.map((a) => `${a.filename} (${a.content.length} bytes)`).join(', ');
		console.log(`[mail:stdout] to=${to} subject=${JSON.stringify(subject)}${att ? ` attachments=[${att}]` : ''}\n${text}\n`);
		return;
	}
	const transport = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT || 587),
		secure: Number(env.SMTP_PORT) === 465,
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
	});
	await transport.sendMail({
		from, to, subject, text, html, replyTo, bcc,
		attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType }))
	});
}
