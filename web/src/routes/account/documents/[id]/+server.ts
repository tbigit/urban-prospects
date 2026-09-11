import { error, redirect } from '@sveltejs/kit';
import { getOrder, readDocument, downloadClosed, downloadDays } from '$lib/server/title-orders';
import type { RequestHandler } from './$types';

// Download a purchased title / plan / dealing PDF. Owner (or the paying parent
// of a child account, or an administrator) only.
export const prerender = false;

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname)}`);
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'Not found');
	const row = await getOrder(id);
	if (!row) error(404, 'Not found');
	// users.id is a bigint (arrives as a string); title_orders.user_id is an integer.
	const mine = row.user_id != null && Number(row.user_id) === Number(locals.user.id);
	const admin = locals.user.role === 'administrator';
	if (!mine && !admin) error(403, 'Not your document');
	if (row.hazlett_status !== 'ready') error(409, 'This document is not ready yet');
	// The file is kept, but a member's download link closes after TITLE_DOWNLOAD_DAYS.
	if (!admin && downloadClosed(row)) error(410, `Downloads are available for ${Math.round(downloadDays() / 30)} months after a document arrives. Please order a fresh search.`);
	const doc = await readDocument(row);
	if (!doc) error(404, 'The PDF file is missing on the server');
	return new Response(new Uint8Array(doc.bytes), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Length': String(doc.bytes.length),
			'Content-Disposition': `${url.searchParams.has('dl') ? 'attachment' : 'inline'}; filename="${doc.filename.replace(/"/g, '')}"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
