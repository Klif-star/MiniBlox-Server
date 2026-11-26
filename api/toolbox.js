const { send, guard, rbx } = require('../lib/common');

const TYPES = ['Model', 'Decal', 'MeshPart', 'Audio', 'Plugin', 'Video', 'FontFamily'];

// GET /api/toolbox?q=kata&type=Model&page=<nextPageToken>
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'GET') return send(res, 405, { error: 'Gunakan GET' });
  const key = process.env.ROBLOX_API_KEY;
  if (!key) return send(res, 500, { error: 'ROBLOX_API_KEY belum diatur di Vercel' });

  const q = String(req.query.q || '').trim().slice(0, 100);
  const type = String(req.query.type || 'Model');
  const page = String(req.query.page || '');
  if (!TYPES.includes(type)) return send(res, 400, { error: 'type tidak valid', allowed: TYPES });

  const body = { searchCategoryType: type, maxPageSize: 24, searchView: 'Full' };
  if (q) body.query = q;
  if (page) body.pageToken = page;

  let r;
  try {
    r = await rbx('https://apis.roblox.com/toolbox-service/v2/assets:search', {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    return send(res, 502, { error: 'Tidak bisa menghubungi Roblox' });
  }
  if (!r.ok) {
    return send(res, r.status === 429 ? 429 : 502, {
      error: 'Roblox menolak permintaan',
      robloxStatus: r.status,
      detail: (r.data && (r.data.message || r.data.title || r.data.detail)) || null
    });
  }

  const items = ((r.data && r.data.creatorStoreAssets) || []).map(x => {
    const a = x.asset || {};
    const m = a.model || {};
    const p = x.creatorStoreProduct && x.creatorStoreProduct.purchasePrice;
    const sig = p && p.quantity && p.quantity.significand;
    return {
      id: a.id,
      name: a.name,
      description: String(a.description || '').slice(0, 200),
      creator: (x.creator && x.creator.name) || '',
      verified: !!(x.creator && x.creator.verified),
      type,
      hasScripts: typeof m.hasScripts === 'boolean' ? m.hasScripts : null,
      scriptCount: typeof m.scriptCount === 'number' ? m.scriptCount : null,
      paid: !!(sig && Number(sig) > 0),
      upVotePercent: (x.voting && typeof x.voting.upVotePercent === 'number') ? x.voting.upVotePercent : null,
      thumbnail: null
    };
  }).filter(i => i.id);

  // Thumbnail (endpoint publik Roblox). Kalau gagal, tetap kirim hasil tanpa gambar.
  try {
    if (items.length) {
      const t = await rbx('https://thumbnails.roblox.com/v1/assets?assetIds=' + items.map(i => i.id).join(',') +
        '&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false');
      const map = {};
      ((t.data && t.data.data) || []).forEach(d => { if (d.imageUrl) map[d.targetId] = d.imageUrl; });
      items.forEach(i => { i.thumbnail = map[i.id] || null; });
    }
  } catch (e) {}

  send(res, 200, {
    items,
    nextPageToken: (r.data && r.data.nextPageToken) || null,
    total: (r.data && typeof r.data.totalResults === 'number') ? r.data.totalResults : null,
    suggestedQuery: (r.data && r.data.queryCorrection && r.data.queryCorrection.suggestedQuery) || null
  });
};
