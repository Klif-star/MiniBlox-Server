const { cors, send, same } = require('../lib/common');

// Untuk tombol "Tes koneksi" di MiniBlox. Tidak pernah menampilkan isi key/kode.
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  const code = process.env.ACCESS_CODE || '';
  const sent = req.headers['x-access-code'];
  send(res, 200, {
    ok: true,
    service: 'miniblox-server',
    keySet: !!process.env.ROBLOX_API_KEY,
    codeSet: !!code,
    codeOk: sent ? same(sent, code) : null
  });
};
