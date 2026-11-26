# MiniBlox Server (Vercel)

Server kecil untuk MiniBlox Studio: Toolbox Creator Store dan avatar dari username.
Tanpa halaman web, hanya folder `api/`.

## 1. Buat API Key Roblox
1. Buka https://create.roblox.com/dashboard/credentials -> Create API Key.
2. Access Permissions: tambahkan API untuk Creator Store (scope `creator-store-product:read`), operasi Read.
3. Accepted IP Addresses: `0.0.0.0/0` (IP Vercel berubah-ubah).
4. Simpan key-nya (hanya tampil sekali).

## 2. Upload ke GitHub
Buat repository baru, lalu buat file dengan path persis seperti di folder ini:
`package.json`, `public/index.html`, `lib/common.js`, `api/ping.js`, `api/toolbox.js`, `api/avatar.js`.
(Di GitHub web: Add file > Create new file, ketik path lengkap, mis. `api/ping.js`.)

## 3. Deploy di Vercel
1. vercel.com -> Add New -> Project -> pilih repository tadi.
2. Framework Preset: Other.
3. Environment Variables:
   - `ROBLOX_API_KEY` = key dari langkah 1
   - `ACCESS_CODE` = kode rahasia buatanmu (minimal 16 karakter acak)
4. Deploy.

## 4. Tes
Buka `https://NAMA-PROYEK.vercel.app/api/ping`. Harus tampil `"keySet":true,"codeSet":true`.
Pakai alamat produksi (bukan alamat preview).

## Endpoint (semua kecuali /api/ping butuh header `x-access-code`)
- `GET /api/toolbox?q=tree&type=Model&page=<nextPageToken>`
- `GET /api/avatar?username=NamaRoblox`

## Catatan
- API Key hanya ada di environment Vercel, tidak pernah dikirim ke aplikasi.
- Belum diuji langsung ke server Roblox. Cek hasilnya setelah deploy.
