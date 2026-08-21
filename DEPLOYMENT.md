# Deploy ke Vercel

Vercel adalah platform buatan tim Next.js sendiri — build dilakukan otomatis
di cloud mereka (tidak perlu build manual/upload zip seperti di shared
hosting), dan setiap `git push` ke GitHub otomatis men-deploy versi terbaru.

Upload file (foto produk, bukti transfer) memakai **Vercel Blob** — server
Vercel tidak punya disk yang bisa ditulis permanen, jadi file tidak lagi
disimpan di `public/uploads/`.

---

## 1. Import project ke Vercel

1. Buka [vercel.com](https://vercel.com) → login (bisa pakai akun GitHub).
2. Klik **"Add New..." → "Project"**.
3. Pilih **Import Git Repository** → cari `adhityanugra29/hokjay` → klik **Import**.
4. Di layar konfigurasi:
   - **Framework Preset**: otomatis kedeteksi "Next.js" — biarkan default.
   - **Root Directory**: biarkan `./` (kosong/default).
   - Jangan klik **Deploy** dulu — isi environment variables di langkah 2 dulu (biar deploy pertama langsung berhasil).

## 2. Isi Environment Variables

Masih di layar yang sama (atau nanti lewat **Project → Settings → Environment Variables**), tambahkan:

| Key | Value |
|---|---|
| `MONGODB_URI` | connection string MongoDB Atlas kamu (yang sama seperti di `.env.local` lokal) |
| `SESSION_SECRET` | string acak panjang untuk menandatangani cookie login — generate dengan `openssl rand -base64 32`. **Wajib diisi** — tanpa ini sesi login memakai fallback tidak aman |

(Env var Blob storage-nya diisi setelah langkah 3 di bawah — tidak perlu diisi manual di sini.)

## 3. Aktifkan Vercel Blob Storage

1. Di dashboard project (setelah project ke-import) → tab **Storage**.
2. Klik **Create Database** → pilih **Blob** → pastikan pilih access **Public** saat pembuatan (bukan Private — kode aplikasi ini pakai URL publik langsung untuk semua foto/bukti, bukan signed URL).
3. Beri nama (bebas, mis. `hokjay-uploads`) → **Create**.
4. Klik **Connect Project**, pilih project ini, centang environment yang dipakai (minimal Production) → Connect.
5. **Penting**: Vercel menamai env var token-nya dengan awalan nama store (contoh: `Hojay_READ_WRITE_TOKEN`, bukan `BLOB_READ_WRITE_TOKEN` polos) — cek nama persisnya di **Project Settings → Environment Variables**. Kode di `app/api/upload/route.ts` sudah di-hardcode membaca `process.env.Hojay_READ_WRITE_TOKEN` — kalau nama store/env var kamu beda, sesuaikan nama variabel di file itu juga.

## 4. Deploy

1. Klik **Deploy** (kalau belum otomatis jalan).
2. Tunggu proses build (~1–3 menit) — semua terjadi di server Vercel, komputer/laptop kamu tidak perlu nyala.
3. Setelah selesai, Vercel kasih URL seperti `https://hokjay.vercel.app` — buka untuk cek.

Setiap kali ada update kode baru (`git push` ke `main`), Vercel otomatis build & deploy ulang — tidak perlu langkah manual lagi.

## 5. Pakai domain sendiri (opsional, mis. hokjay.id)

1. **Project → Settings → Domains** → masukkan `hokjay.id` → **Add**.
2. Vercel kasih instruksi DNS (biasanya A record atau CNAME) — masukkan itu ke DNS registrar domain kamu (sama seperti waktu setting A record ke IP cPanel sebelumnya, tapi sekarang ke Vercel).
3. Tunggu propagasi DNS, lalu Vercel otomatis pasang SSL (HTTPS) gratis.

## 6. Isi data awal (opsional, sekali saja)

Seeding (`npm run seed`) butuh akses langsung ke MongoDB dari komputer kamu — jalankan dari lokal seperti biasa (`.env.local` kamu sudah mengarah ke database Atlas yang sama dengan yang dipakai production):
```
npm run seed
```
⚠️ Ini **menghapus semua data** di database yang ditunjuk `MONGODB_URI` lalu mengisi ulang dengan data contoh — jangan jalankan kalau database sudah berisi data asli.

---

## Catatan penting

- **Upload foto** sekarang lewat Vercel Blob — otomatis publik & permanen, tidak hilang saat deploy ulang.
- Kalau sebelumnya sempat ada foto ter-upload ke `public/uploads/` (via percobaan cPanel), foto itu **tidak ikut pindah otomatis** — perlu upload ulang lewat form produk/pembayaran setelah pindah ke Vercel.
- Tidak perlu lagi `server.js`, `.cpanel.yml` — itu khusus untuk hosting cPanel, aman diabaikan/dihapus kapan saja.
