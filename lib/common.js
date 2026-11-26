const crypto = require('crypto');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-access-code');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Pembatas sederhana per IP (per instance, hanya pengaman dasar)
const hits = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60000) { hits.set(ip, { t: now, n: 1 }); return false; }
  h.n++;
  if (hits.size > 5000) hits.clear();
  return h.n > 60;
}

// Mengembalikan true jika permintaan boleh diteruskan.
function guard(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return false; }
  if (limited(req)) { send(res, 429, { error: 'Terlalu banyak permintaan, coba lagi sebentar' }); return false; }
  const code = process.env.ACCESS_CODE;
  if (!code) { send(res, 500, { error: 'ACCESS_CODE belum diatur di Vercel' }); return false; }
  if (!same(req.headers['x-access-code'] || '', code)) { send(res, 401, { error: 'Kode akses salah' }); return false; }
  return true;
}

async function rbx(url, opt = {}) {
  const r = await fetch(url, { ...opt, headers: { Accept: 'application/json', ...(opt.headers || {}) } });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  return { ok: r.ok, status: r.status, data };
}

module.exports = { cors, send, guard, rbx, same };
