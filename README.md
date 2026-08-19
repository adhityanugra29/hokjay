# CV HORECA JAYA — Kelola Usaha

Aplikasi internal untuk mengelola penjualan, invoice, inventory, pelanggan,
insentif sales, dan keuangan CV HORECA JAYA. Dibangun dengan Next.js (App
Router) dan MongoDB, mengikuti desain & alur kerja dari mockup
[`reference/preview-ui.html`](reference/preview-ui.html).

## Menjalankan di lokal

1. **Isi koneksi database.** Salin `.env.local.example` jadi `.env.local` (kalau
   belum ada) lalu isi `MONGODB_URI` dengan connection string MongoDB Atlas
   kamu:

   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/horeca-jaya?retryWrites=true&w=majority
   ```

2. **Install dependency** (kalau belum):

   ```
   npm install
   ```

3. **(Opsional) Isi data contoh** — membuat sales, produk, pelanggan, dan
   beberapa invoice contoh (draft/belum bayar/lunas) supaya aplikasi langsung
   terlihat terisi:

   ```
   npm run seed
   ```

   Perintah ini menghapus semua data di database yang ditunjuk `MONGODB_URI`
   lalu mengisi ulang — jangan jalankan di database produksi yang sudah berisi
   data asli.

4. **Jalankan server pengembangan:**

   ```
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000).

## Struktur proyek

- `app/` — halaman & API routes (App Router). Tiap modul (produk, invoice,
  pelanggan, insentif, keuangan) punya folder sendiri.
- `components/` — komponen UI (`ui/`), layout (`layout/`), dan komponen per
  modul (`produk/`, `invoice/`, `katalog/`, `insentif/`, `keuangan/`, `cart/`).
- `models/` — skema Mongoose (Product, Customer, Sales, Invoice,
  StockMovement, CashflowEntry, Counter).
- `lib/` — koneksi database, konstanta, format angka/tanggal, kalkulasi
  harga custom order, dan `lib/services/*` yang berisi logika bisnis inti
  (buat invoice, konfirmasi pembayaran, restock, catat pengeluaran) — dipakai
  bersama oleh API routes dan `scripts/seed.ts`.
- `scripts/seed.ts` — pengisi data contoh.
- `reference/preview-ui.html` — mockup HTML asli, dipakai sebagai acuan
  desain & alur.

## Alur bisnis penting

- **Stok & komisi sales** dihitung otomatis **saat invoice dibuat** (status
  "Belum Bayar"/dikirim) — bukan menunggu pembayaran. Invoice yang disimpan
  sebagai **Draft** belum memotong stok atau menghitung komisi.
  Konfirmasi pembayaran hanya mengubah status jadi **Lunas**, mencatat bukti
  transfer, dan menambah baris "Uang Masuk" di Keuangan.
- **Insentif Sales** (ranking, rekap per personil/produk, riwayat) hanya
  menghitung item dari invoice yang **sudah Lunas**, sesuai bulan pembayaran.
- Foto produk & bukti transfer disimpan lokal di `public/uploads/` lewat
  `/api/upload`. Ini cocok untuk dijalankan di server sendiri (VM/VPS), tapi
  **tidak cocok untuk hosting serverless** seperti Vercel karena filesystem-nya
  tidak permanen — kalau nanti mau deploy ke sana, ganti ke layanan
  penyimpanan cloud (mis. Cloudinary/S3).

## Catatan

Aplikasi ini belum memakai autentikasi (akses terbuka), sesuai permintaan
awal — cocok untuk pemakaian internal tim yang sudah dipercaya. Tambahkan
login kalau nanti dibutuhkan.
