import { verifyPassword, phpassHash, hashPassword, detectAlgo } from '../src/lib/server/password.ts';
import bcrypt from 'bcryptjs';
import { createHash, createHmac } from 'node:crypto';
const results: [string, boolean][] = [];
// Canonical phpass test vector (phpass test.php): 'test12345'
const v = '$P$9IQRaTwmfeRo7ud9Fh4E2PdI0S3r.L0';
results.push(['phpass vector ok', await verifyPassword('test12345', v)]);
results.push(['phpass wrong pw', !(await verifyPassword('test12346', v))]);
results.push(['phpass recompute', phpassHash('test12345', v) === v]);
// WP 6.8 style: $wp + bcrypt(base64(sha384(pw)))
const pre = createHmac('sha384', 'wp-sha384').update('correct horse').digest('base64');
const wp = '$wp' + bcrypt.hashSync(pre, 10).replace(/^\$2a\$/, '$2y$');
results.push(['wp_bcrypt detect', detectAlgo(wp) === 'wp_bcrypt']);
results.push(['wp_bcrypt ok', await verifyPassword('correct horse', wp)]);
results.push(['wp_bcrypt wrong', !(await verifyPassword('correct horsf', wp))]);
const plain = bcrypt.hashSync('abc', 10).replace(/^\$2a\$/, '$2y$');
results.push(['bcrypt $2y ok', await verifyPassword('abc', plain)]);
const { hash } = await hashPassword('new-pass-123');
results.push(['argon2 roundtrip', await verifyPassword('new-pass-123', hash)]);
results.push(['argon2 wrong', !(await verifyPassword('x', hash))]);
results.push(['null hash', !(await verifyPassword('x', null))]);
for (const [n, ok] of results) console.log(ok ? 'PASS' : 'FAIL', n);
process.exit(results.every(r => r[1]) ? 0 : 1);
