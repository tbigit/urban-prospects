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

export async function sendMail(to: string, subject: string, text: string) {
	const from = env.MAIL_FROM || 'Urban Prospects <no-reply@urbanprospects.com.au>';

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
				MessageStream: env.POSTMARK_STREAM || 'outbound'
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
		console.log(`[mail:stdout] to=${to} subject=${JSON.stringify(subject)}\n${text}\n`);
		return;
	}
	const transport = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT || 587),
		secure: Number(env.SMTP_PORT) === 465,
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
	});
	await transport.sendMail({ from, to, subject, text });
}
