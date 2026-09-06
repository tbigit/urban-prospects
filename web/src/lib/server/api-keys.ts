// Member API keys (`user_api_key`, keyed by email like the other app tables).
// Ported from upapp's api.js /manage/key/{list,add,delete} so the site's
// /account/ page can manage keys without the Express API. Key format and
// `api_options` (comma-joined extension list, copied from the member's latest
// key) are kept identical so existing keys and the API's own checks still work.
import { randomBytes } from 'node:crypto';
import { query } from './db';

export type ApiKey = {
	id: number;
	api_key: string;
	api_options: string;
	api_status: string;
	created_on: Date;
};

export async function listApiKeys(email: string): Promise<ApiKey[]> {
	return query<ApiKey>(
		`SELECT id, api_key, api_options, api_status, created_on
		 FROM user_api_key WHERE lower(user_email) = lower($1) ORDER BY created_on DESC`,
		[email]
	);
}

export async function createApiKey(userId: number, email: string): Promise<ApiKey> {
	const [latest] = await listApiKeys(email);
	const options = latest?.api_options ?? '';
	// Same `sk_` shape upapp generated, but from a CSPRNG rather than Math.random.
	const key = 'sk_' + randomBytes(12).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + Date.now().toString(36);
	const [row] = await query<ApiKey>(
		`INSERT INTO user_api_key (user_id, user_email, api_key, api_options, api_status)
		 VALUES ($1, $2, $3, $4, 'Active')
		 RETURNING id, api_key, api_options, api_status, created_on`,
		[String(userId), email, key, options]
	);
	return row;
}

export async function deleteApiKey(email: string, key: string): Promise<boolean> {
	const rows = await query(
		`DELETE FROM user_api_key WHERE lower(user_email) = lower($1) AND api_key = $2 RETURNING id`,
		[email, key]
	);
	return rows.length > 0;
}
