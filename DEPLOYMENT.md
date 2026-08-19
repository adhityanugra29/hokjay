# Deploy ke cPanel (Git Version Control)

Panduan ini pakai fitur cPanel **Setup Node.js App** + **Git Version Control**
(`.cpanel.yml`), mengikuti https://go.cpanel.net/GitDeployment.

Konsep pentingnya: ada **dua folder berbeda** di server —
1. **Repository path** — tempat cPanel `git clone`/`pull` kode sumbernya.
2. **Application root** — tempat aplikasi Node.js beneran jalan (dibaca Passenger).

`.cpanel.yml` di repo ini bertugas **menyalin** file dari folder (1) ke folder
(2), lalu `npm install` + `npm run build` di folder (2).

---

## 1. Buat Node.js App

1. Login cPanel → buka **"Setup Node.js App"**.
2. Klik **Create Application**, isi:
   - **Node.js version**: pilih yang tersedia paling baru (minimal 20.x — app ini pakai Next.js 16, butuh Node cukup baru).
   - **Application mode**: `Production`
   - **Application root**: nama folder bebas, mis. `hokjay` (relatif ke home direktori kamu)
   - **Application URL**: domain/subdomain yang mau dipakai
   - **Application startup file**: `server.js` (sudah disiapkan di repo ini — lihat `server.js`, ini wrapper supaya Next.js bisa jalan di Passenger)
3. Klik **Create**.
4. Di halaman detail app yang muncul, **catat baris seperti ini** (persis punya kamu, bukan contoh ini):
   ```
   source /home/USERNAME/nodevenv/hokjay/20/bin/activate && cd /home/USERNAME/hokjay
   ```
   Dari situ kamu dapat 3 nilai: `USERNAME`, `hokjay` (application root), `20` (versi node).
5. Di halaman yang sama, ada bagian **"Environment variables"** — tambahkan:
   - `MONGODB_URI` = connection string MongoDB Atlas kamu (yang di `.env.local` lokal)
   - (jangan upload file `.env.local` ke server — env var production diisi di sini, bukan lewat file)

## 2. Sesuaikan `.cpanel.yml`

Buka file `.cpanel.yml` di root project ini, ganti 3 placeholder pakai nilai dari langkah 1.4:
- `<CPANEL_USERNAME>` → username cPanel kamu
- `<APP_ROOT>` → application root (mis. `hokjay`)
- `<NODE_VERSION>` → versi node (mis. `20`)

Commit & push perubahan ini ke GitHub (`git add .cpanel.yml && git commit -m "config deploy" && git push`).

## 3. Buat Git Version Control di cPanel

1. Buka **"Git Version Control"** di cPanel → **Create**.
2. **Clone a Repository**: aktifkan, isi **Clone URL** dengan
   `https://github.com/adhityanugra29/hokjay.git`
3. **Repository Path**: folder LAIN, bukan application root — mis. `repositories/hokjay`.
4. Klik **Create** → cPanel akan clone repo dari GitHub.

## 4. Deploy

Tiap kali ada update baru di GitHub:
1. Buka **Git Version Control** → pilih repo → tab **"Pull or Deploy"**.
2. Klik **"Update from Remote"** (ambil commit terbaru dari GitHub).
3. Klik **"Deploy HEAD Commit"** — ini menjalankan `.cpanel.yml`: copy file →
   `npm install` → `npm run build` → restart app otomatis (`touch tmp/restart.txt`).
4. Tunggu sampai selesai (build Next.js bisa beberapa menit), lalu buka
   Application URL kamu untuk cek.

## 5. Isi data awal (opsional, sekali saja)

Dari **Terminal** cPanel (atau SSH), masuk ke application root lalu jalankan seed:
```
source /home/USERNAME/nodevenv/hokjay/20/bin/activate
cd /home/USERNAME/hokjay
npm run seed
deactivate
```
⚠️ Ini **menghapus semua data** di database yang ditunjuk `MONGODB_URI` lalu
mengisi ulang dengan data contoh — jangan jalankan di database yang sudah
berisi data asli pelanggan/invoice.

---

## Catatan penting

- **Foto produk & bukti transfer** (`public/uploads/`) tersimpan di disk
  application root — aman dari `git deploy` berikutnya (folder itu di-*gitignore*,
  jadi `cp -R public $DEPLOYPATH` tidak menghapus file yang sudah ada di sana,
  cuma menambah/menimpa yang memang ada di repo).
- Kalau `npm run build` gagal di server karena **memori terbatas** (umum di
  shared hosting kecil), kabari saya — ada cara build di komputer lokal lalu
  upload hasil build-nya saja.
- Kalau koneksi ke MongoDB Atlas gagal di server tapi normal di lokal, kemungkinan
  hosting-nya memblokir outbound port MongoDB — perlu tanya ke support hosting.
- `server.js` cuma dipakai di server (via Passenger). Untuk development di
  komputer sendiri tetap pakai `npm run dev` seperti biasa.
