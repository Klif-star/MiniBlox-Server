const { send, guard, rbx } = require('../lib/common');

const hex = h => {
  h = String(h || '').replace('#', '');
  return /^[0-9a-fA-F]{6}$/.test(h) ? '#' + h.toUpperCase() : null;
};

// GET /api/avatar?username=Roblox
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'GET') return send(res, 405, { error: 'Gunakan GET' });

  const name = String(req.query.username || '').trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return send(res, 400, { error: 'Username tidak valid (3-20 karakter: huruf, angka, _)' });

  try {
    const u = await rbx('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [name], excludeBannedUsers: true })
    });
    if (!u.ok) return send(res, 502, { error: 'Gagal mencari username', robloxStatus: u.status });
    const found = u.data && u.data.data && u.data.data[0];
    if (!found) return send(res, 404, { error: 'Username tidak ditemukan' });
    const id = found.id;

    let type = null, scales = null, assets = [], c = null;
    const v2 = await rbx('https://avatar.roblox.com/v2/avatar/users/' + id + '/avatar');
    if (v2.ok && v2.data && v2.data.bodyColor3s) {
      const b = v2.data.bodyColor3s;
      c = { head: hex(b.headColor3), torso: hex(b.torsoColor3), leftArm: hex(b.leftArmColor3), rightArm: hex(b.rightArmColor3), leftLeg: hex(b.leftLegColor3), rightLeg: hex(b.rightLegColor3) };
      type = v2.data.playerAvatarType; scales = v2.data.scales || null; assets = v2.data.assets || [];
    } else {
      // Cadangan: v1 memakai ID BrickColor, dikonversi lewat palet resmi avatar-rules
      const [v1, rules] = await Promise.all([
        rbx('https://avatar.roblox.com/v1/users/' + id + '/avatar'),
        rbx('https://avatar.roblox.com/v1/avatar-rules')
      ]);
      if (!v1.ok || !v1.data || !v1.data.bodyColors) return send(res, 502, { error: 'Gagal membaca avatar', robloxStatus: v1.status });
      const pal = {};
      ((rules.data && rules.data.bodyColorsPalette) || []).forEach(p => { pal[p.brickColorId] = p.hexColor; });
      const b = v1.data.bodyColors;
      c = { head: hex(pal[b.headColorId]), torso: hex(pal[b.torsoColorId]), leftArm: hex(pal[b.leftArmColorId]), rightArm: hex(pal[b.rightArmColorId]), leftLeg: hex(pal[b.leftLegColorId]), rightLeg: hex(pal[b.rightLegColorId]) };
      type = v1.data.playerAvatarType; scales = v1.data.scales || null; assets = v1.data.assets || [];
    }

    let thumbnail = null;
    try {
      const t = await rbx('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + id + '&size=150x150&format=Png&isCircular=false');
      thumbnail = (t.data && t.data.data && t.data.data[0] && t.data.data[0].imageUrl) || null;
    } catch (e) {}

    send(res, 200, {
      userId: id,
      username: found.name,
      displayName: found.displayName,
      rigType: type === 3 ? 'R15' : 'R6',
      scales,
      colors: c,
      assets: assets.map(a => ({ id: a.id, name: a.name, type: a.assetType && a.assetType.name })),
      thumbnail
    });
  } catch (e) {
    send(res, 502, { error: 'Tidak bisa menghubungi Roblox' });
  }
};
