const { send, guard, rbx } = require('../lib/common');

function readBody(req) {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  return new Promise((ok, no) => {
    const c = [];
    req.on('data', d => c.push(d));
    req.on('end', () => ok(Buffer.concat(c).toString('utf8')));
    req.on('error', no);
  });
}

// POST /api/publish?universeId=123&placeId=456&versionType=Saved|Published
// Body: isi file .rbxlx (teks XML)
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'Gunakan POST' });
  const key = process.env.ROBLOX_API_KEY;
  if (!key) return send(res, 500, { error: 'ROBLOX_API_KEY belum diatur di Vercel' });

  const u = String(req.query.universeId || '');
  const p = String(req.query.placeId || '');
  const vt = String(req.query.versionType || 'Saved');
  if (!/^\d+$/.test(u) || !/^\d+$/.test(p)) return send(res, 400, { error: 'universeId dan placeId harus angka' });
  if (vt !== 'Saved' && vt !== 'Published') return send(res, 400, { error: 'versionType harus Saved atau Published' });

  let xml;
  try { xml = await readBody(req); } catch (e) { return send(res, 400, { error: 'Gagal membaca isi file' }); }
  if (!xml || xml.indexOf('<roblox') === -1) return send(res, 400, { error: 'Isi bukan file .rbxlx yang valid' });
  if (Buffer.byteLength(xml) > 4400000) return send(res, 413, { error: 'File terlalu besar (maks sekitar 4 MB di Vercel)' });

  let r;
  try {
    r = await rbx('https://apis.roblox.com/universes/v1/' + u + '/places/' + p + '/versions?versionType=' + vt, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/xml' },
      body: xml
    });
  } catch (e) {
    return send(res, 502, { error: 'Tidak bisa menghubungi Roblox' });
  }
  if (!r.ok) {
    return send(res, r.status === 429 ? 429 : 502, {
      error: 'Roblox menolak upload',
      robloxStatus: r.status,
      detail: (r.data && (r.data.message || r.data.title || r.data.detail)) || null
    });
  }
  send(res, 200, { ok: true, versionNumber: r.data && r.data.versionNumber != null ? r.data.versionNumber : null });
};
