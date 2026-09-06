// Outbound mail (password resets). With SMTP_HOST unset the message is printed
// to stdout instead of sent, which is what dev and staging should use.
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

export async function sendMail(to: string, subject: string, text: string) {
	const from = env.MAIL_FROM || 'Urban Prospects <no-reply@urbanprospects.com.au>';
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
