import sys
p='/srv/users/upapi/apps/api/api.js'; s=open(p).read()
assert '/v2/app/properties' not in s, 'already patched'

# 1. session middleware + v2 routes, inserted before app.post('/properties'
mw = r'''
// ---- v2: session-cookie authenticated routes ---------------------------------------------
// The site (SvelteKit, same Postgres) sets `up_session`; only sha256(token) is stored in
// `sessions`. nginx forwards the Cookie header for /q/v2/ only. Verified sessions are cached
// in memory for 60s so a burst of map calls costs one lookup. When every caller is on v2 the
// unauthenticated v1 routes can go.
const _session_cache = new Map();
function _cookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
async function requireSession(req, res, next) {
  try {
    const token = _cookie(req, 'up_session');
    if (!token) return res.status(401).send({ error: 'not logged in' });
    const id_hash = crypto.createHash('sha256').update(token).digest('hex');
    const hit = _session_cache.get(id_hash);
    if (hit && hit.until > Date.now()) { req.user = hit.user; return next(); }
    const sequelize = getSequelizeInstance();
    const [rows] = await sequelize.database.query(
      `select u.id, u.email, u.wp_user_id, u.role, coalesce(p.email, u.email) as billing_email
         from sessions s join users u on u.id = s.user_id
         left join users p on p.id = u.parent_user_id and p.status = 'active'
        where s.id_hash = $1 and s.expires_at > now() and u.status = 'active' limit 1`,
      { bind: [id_hash], raw: true });
    if (!rows.length) return res.status(401).send({ error: 'session expired' });
    _session_cache.set(id_hash, { user: rows[0], until: Date.now() + 60000 });
    if (_session_cache.size > 5000) _session_cache.clear();
    req.user = rows[0];
    next();
  } catch (e) {
    console.error('[v2 session]', e);
    res.status(500).send({ error: 'session check failed' });
  }
}

app.get('/v2/app/me', requireSession, (req, res) => res.send(req.user));

// Authenticated twin of /properties (page of results). No total count: see /v2/app/properties/suburbs.
// (/v2/properties without /app is the public Planning Data API, bearer API key.)
app.post('/v2/app/properties', requireSession, async function (req, res) {
  delete req.body.count;
  delete req.body.get_suburb;
  _search_property(req, res);
});

// /v2/app/properties/suburbs — one scan, grouped by suburb: [{suburbname, n, geom:{type:'Point',coordinates:[x,y]}}].
// n is one-per-property like the page query; the client sums n for the total, so the
// separate count(*) scan is gone. Ignores bounds/radius on purpose: the overview is the
// whole result set. Cached 10 min per filter body.
app.post('/v2/app/properties/suburbs', requireSession, async function (req, res) {
  delete req.body.bounds; delete req.body.radius; delete req.body.count; delete req.body.get_suburb;
  delete req.body.page; delete req.body.per_page;
  const key = 'v2suburbs-' + crypto.createHash('md5').update(JSON.stringify(req.body)).digest('hex');
  memcached.get(key, function (err, data) {
    if (data) return res.send(data);
    _search_property(req, res, 0, key);
  });
});
'''
s = s.replace("app.post('/properties', async function (req, res) {", mw + "\napp.post('/properties', async function (req, res) {", 1)

# 2. _search_property takes an aggregate cache key
assert "async function _search_property(req, res, demo) {" in s
s = s.replace("async function _search_property(req, res, demo) {", "async function _search_property(req, res, demo, aggregate_key) {", 1)

# 3. aggregate SQL: branch alongside body.count
old = """  if (body.count) {
    if (permissibleuses && permissibleuses.length) {"""
new = """  if (aggregate_key) {
    // grouped by suburb; same WHERE as the page query, no LIMIT, no ORDER on the scan
    const agg_where = (where_clause ? where_clause + ' and ' : 'where ') + 't1.suburbname is not null ';
    const agg_select = `select t1.suburbname, count(DISTINCT coalesce(t1.propid, t1.gurasid))::int as n,
        json_build_object('type', 'Point', 'coordinates', json_build_array(ST_X(ST_Centroid(ST_Collect(t1.geom))), ST_Y(ST_Centroid(ST_Collect(t1.geom))))) as geom`;
    if (permissibleuses && permissibleuses.length) {
      const permissibleuses_in_clause = permissibleuses.map(item => `'${item}'`).join(', ');
      permissible_where_clause_array.push(`permissiblelanduse in (${permissibleuses_in_clause})`);
      const permissible_where_clause = permissible_where_clause_array.join(' and ') + ' ';
      sql = `WITH t3 AS (SELECT DISTINCT zone, epititle, lganame FROM public."UP_PermissibleLandUse" WHERE ${permissible_where_clause}) ${sql_base} from (${agg_select} from "${db_propery_table_name}" t1 RIGHT JOIN t3 ON t1.lzn_label = t3.zone ${agg_where} group by t1.suburbname order by t1.suburbname) t;`;
    }
    else {
      sql = `${sql_base} from (${agg_select} from "${db_propery_table_name}" t1 ${agg_where} group by t1.suburbname order by t1.suburbname) t;`;
    }
  }
  else if (body.count) {
    if (permissibleuses && permissibleuses.length) {"""
assert old in s; s = s.replace(old, new, 1)

# 4. response: aggregate sends content and caches it
old = """    if (objects[0].length) {
      if (body.count) {
        return res.send(objects[0][0].count);
      }"""
new = """    if (aggregate_key) {
      const content = (objects[0].length && objects[0][0].content) || [];
      memcached.set(aggregate_key, content, 600, function () {});
      return res.send(content);
    }
    if (objects[0].length) {
      if (body.count) {
        return res.send(objects[0][0].count);
      }"""
assert old in s; s = s.replace(old, new, 1)
open(p,'w').write(s)
print('patched')
