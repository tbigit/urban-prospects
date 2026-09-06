// Postgres pool for UrbanPortalDBP (see CLAUDE.md "New platform database").
// DATABASE_URL comes from the server's .env; nothing is hard-coded here.
import pg from 'pg';
import { env } from '$env/dynamic/private';

let pool: pg.Pool | null = null;

export function db(): pg.Pool {
	if (!pool) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 5 });
	}
	return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
	text: string,
	params: unknown[] = []
): Promise<T[]> {
	const res = await db().query<T>(text, params);
	return res.rows;
}
