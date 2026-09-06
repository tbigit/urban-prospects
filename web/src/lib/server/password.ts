// Password verification for every hash format found in users.password_hash:
//
//   $P$ / $H$   WordPress "portable" phpass (iterated MD5)        algo 'wp_phpass'
//   $wp$2y$…    WordPress >= 6.8: bcrypt over base64(hmac-sha384(pw)) algo 'wp_bcrypt'
//   $2y$ / $2a$ plain bcrypt                                     algo 'bcrypt'
//   $argon2id$  argon2id (what we rehash to on successful login)  algo 'argon2id'
//
// The format is detected from the hash prefix, so users.password_algo is
// informational; detectAlgo() is what login actually trusts.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';

export type PasswordAlgo = 'wp_phpass' | 'wp_bcrypt' | 'bcrypt' | 'argon2id';

export function detectAlgo(hash: string): PasswordAlgo | null {
	if (hash.startsWith('$P$') || hash.startsWith('$H$')) return 'wp_phpass';
	if (hash.startsWith('$wp$2y$') || hash.startsWith('$wp$2a$') || hash.startsWith('$wp$2b$'))
		return 'wp_bcrypt';
	if (hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$')) return 'bcrypt';
	if (hash.startsWith('$argon2id$')) return 'argon2id';
	return null;
}

const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// phpass encode64 — NOT standard base64 (different alphabet, little-endian bit packing).
function phpassEncode64(input: Buffer, count: number): string {
	let output = '';
	let i = 0;
	do {
		let value = input[i++];
		output += ITOA64[value & 0x3f];
		if (i < count) value |= input[i] << 8;
		output += ITOA64[(value >> 6) & 0x3f];
		if (i++ >= count) break;
		if (i < count) value |= input[i] << 16;
		output += ITOA64[(value >> 12) & 0x3f];
		if (i++ >= count) break;
		output += ITOA64[(value >> 18) & 0x3f];
	} while (i < count);
	return output;
}

// Port of PasswordHash::crypt_private() from WordPress's class-phpass.php.
export function phpassHash(password: string, setting: string): string | null {
	const id = setting.slice(0, 3);
	if (id !== '$P$' && id !== '$H$') return null;
	const countLog2 = ITOA64.indexOf(setting[3]);
	if (countLog2 < 7 || countLog2 > 30) return null;
	let count = 1 << countLog2;
	const salt = setting.slice(4, 12);
	if (salt.length !== 8) return null;
	const pw = Buffer.from(password, 'utf8');
	let h = createHash('md5').update(salt).update(pw).digest();
	do {
		h = createHash('md5').update(h).update(pw).digest();
	} while (--count);
	return setting.slice(0, 12) + phpassEncode64(h, 16);
}

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// WordPress 6.8+: wp_hash_password() pre-hashes with
// base64(hash_hmac('sha384', trim(pw), 'wp-sha384', true)) — an HMAC keyed with the
// literal string 'wp-sha384' (for domain separation), NOT a plain sha384 — so the
// 72-byte bcrypt limit is never hit, then prefixes the bcrypt hash with "$wp".
// See wp-includes/pluggable.php wp_hash_password() / wp_check_password().
function wpPrehash(password: string): string {
	return createHmac('sha384', 'wp-sha384').update(password.trim(), 'utf8').digest('base64');
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
	if (!hash) return false;
	switch (detectAlgo(hash)) {
		case 'wp_phpass': {
			const computed = phpassHash(password, hash);
			return computed !== null && safeEqual(computed, hash);
		}
		case 'wp_bcrypt':
			return bcrypt.compare(wpPrehash(password), hash.slice(3).replace(/^\$2y\$/, '$2a$'));
		case 'bcrypt':
			return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2a$'));
		case 'argon2id':
			return argon2Verify(hash, password);
		default:
			return false;
	}
}

// What new/rehashed passwords are stored as.
export async function hashPassword(password: string): Promise<{ hash: string; algo: PasswordAlgo }> {
	return { hash: await argon2Hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }), algo: 'argon2id' };
}
