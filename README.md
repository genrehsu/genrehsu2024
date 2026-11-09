# Duta Genre HSU

Panduan ini mencakup setup Google Sheets dengan Apps Script, konfigurasi Cloudinary, dan deploy website ke Vercel. Vercel menyajikan website sekaligus API; Apps Script menjadi proxy server-side untuk membaca/menulis Google Sheets.

## 1. Persiapan

Siapkan:

- Akun Google untuk membuat Spreadsheet dan Apps Script.
- Akun Vercel dan repository GitHub untuk website ini.
- Akun Cloudinary.

Jangan masukkan password, secret, API secret, atau file `.env.local` ke repository maupun kode frontend.

## 2. Siapkan Google Sheets dan Apps Script

1. Buat Google Spreadsheet baru. Salin ID spreadsheet dari URL, yaitu teks di antara `/d/` dan `/edit`.
2. Dari spreadsheet tersebut, buka **Extensions > Apps Script**. Pastikan project Apps Script ini terikat ke spreadsheet tersebut.
3. Buka file [`Code.gs`](./Code.gs) di repository, salin seluruh isinya ke editor Apps Script (ganti isi file awal), lalu **Save**.
4. Kembali ke spreadsheet dan muat ulang halaman. Menu **Duta Genre** akan muncul.
5. Pilih **Duta Genre > Siapkan tab database**. Setujui permintaan izin Google. Script membuat tab `Admins`, `Events`, dan `Members` dengan header berikut:

   - `Admins`: `username | passwordHash | role | active`
   - `Events`: `id | title | subtitle | description | imageUrl | cloudinaryPublicId | year | createdAt`
   - `Members`: `id | title | subtitle | description | imageUrl | cloudinaryPublicId | year | createdAt`

   Tab/header yang sudah ada tidak ditimpa. Jika muncul pesan header tidak sesuai, periksa baris pertama tab tersebut dan perbaiki agar nama dan urutannya sama persis.
6. Deploy sebagai Web App:

   - Di Apps Script, klik **Deploy > New deployment**.
   - Pada jenis deployment, pilih **Web app**.
   - **Execute as**: **Me** (akun pemilik script/spreadsheet).
   - **Who has access**: **Anyone**. Endpoint dapat dijangkau publik, tetapi operasi Sheets memerlukan secret proxy yang hanya disimpan server-side di Vercel.
   - Klik **Deploy**, berikan izin jika diminta, lalu salin URL Web App yang berakhiran `/exec`.

   Buka URL `/exec` di browser untuk mengecek status. Respons yang diharapkan berisi `{"ok":true,"service":"duta-genre-sheets"}`. Jangan gunakan URL `/dev` untuk Vercel.

## 3. Push dan deploy awal ke Vercel

1. Pastikan seluruh file website, termasuk `Code.gs` dan folder `scripts`, sudah di-push ke repository GitHub.
2. Di Vercel, pilih **Add New > Project**, lalu import repository website.
3. Pilih framework **Other** jika diminta dan biarkan **Root Directory** di folder utama project. Website tidak memerlukan build command khusus.
4. Klik **Deploy** untuk deployment pertama. API belum bisa bekerja sebelum environment variables diatur, tetapi deployment ini diperlukan untuk membuka halaman generator di langkah berikutnya.
5. Catat domain `.vercel.app` yang diberikan Vercel. Buka `https://DOMAIN-WEBSITE-ANDA/scripts/create-admin-hash.html` dan pastikan halaman generator tampil.

## 4. Buat secret dan akun admin

1. Di halaman generator, klik **Buat secret acak**. Simpan nilainya sebagai secret proxy. Di spreadsheet, pilih **Duta Genre > Atur secret proxy**, tempel nilai yang sama, lalu konfirmasi.
2. Kembali ke halaman generator. Klik **Buat secret acak** lagi untuk membuat secret sesi yang berbeda. Simpan untuk environment variable Vercel `SESSION_SECRET`. Jangan masukkan secret sesi ke Apps Script.
3. Masukkan password admin minimal 12 karakter dan konfirmasi, lalu klik **Buat hash**. Salin hash yang ditampilkan. Password diproses di browser dan tidak dikirim ke server.
4. Di tab `Admins`, tambahkan satu baris setelah header:

   | username | passwordHash | role | active |
   | --- | --- | --- | --- |
   | username pilihan | hash dari generator browser | admin | TRUE |

   Ganti teks `hash dari generator browser` dengan hash hasil generator. Simpan hash satu sel penuh di kolom `passwordHash`, bukan password aslinya.

## 5. Siapkan Cloudinary

1. Masuk ke dashboard Cloudinary dan buka bagian **API Keys**.
2. Catat **Cloud name**, **API Key**, dan **API Secret**.
3. Foto yang diunggah lewat halaman admin akan disimpan ke folder `duta-genre-hsu`. API Secret hanya digunakan oleh Vercel untuk membuat signature upload; jangan pernah menaruhnya di HTML atau JavaScript browser.

## 6. Atur konfigurasi Vercel dan aktifkan website

1. Di Vercel, buka project **Settings > Environment Variables** dan tambahkan variabel berikut. Pilih environment yang digunakan (umumnya **Production**, **Preview**, dan **Development**):

   | Variable | Nilai |
   | --- | --- |
   | `GOOGLE_SHEETS_ID` | ID spreadsheet, yaitu bagian URL antara `/d/` dan `/edit` |
   | `GAS_WEB_APP_URL` | URL Apps Script hasil deployment yang berakhiran `/exec` |
   | `GAS_PROXY_SECRET` | Secret yang sama dengan yang disimpan melalui menu **Atur secret proxy** |
   | `SESSION_SECRET` | Secret sesi acak minimal 32 karakter, berbeda dari secret proxy |
   | `CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary |
   | `CLOUDINARY_API_KEY` | API Key Cloudinary |
   | `CLOUDINARY_API_SECRET` | API Secret Cloudinary |
   | `ADMINS_SHEET_NAME` | Opsional; default `Admins` |
   | `EVENTS_SHEET_NAME` | Opsional; default `Events` |
   | `MEMBERS_SHEET_NAME` | Opsional; default `Members` |

2. Jangan set root ke folder `api`; folder tersebut berisi Vercel Functions. Jangan menaruh secret di variable yang diawali `NEXT_PUBLIC_` atau mengirimkannya ke browser.
3. Setelah menyimpan environment variables, buka tab **Deployments**, pilih menu deployment terbaru, lalu klik **Redeploy**. Redeploy diperlukan agar API dapat menggunakan konfigurasi baru.

   Deployment pertama sudah terhubung ke GitHub; push berikutnya ke repository akan memicu deployment otomatis. Pastikan variabel tersedia untuk environment yang digunakan.

## 7. Pengujian setelah deploy

Ganti `NAMA-PROYEK.vercel.app` di contoh URL dengan domain project Anda.

1. Buka `https://NAMA-PROYEK.vercel.app/`. Pastikan website tampil.
2. Buka `https://NAMA-PROYEK.vercel.app/api/content?type=events`. Sebelum ada konten, API seharusnya merespons JSON dengan `items: []`.
3. Buka `https://NAMA-PROYEK.vercel.app/admin.html`, lalu login menggunakan akun pada tab `Admins`.
4. Dari tab **Kegiatan** di panel admin, tambahkan judul, tahun, dan gambar, lalu terbitkan. Pastikan data muncul di panel dan di halaman Kegiatan/beranda.
5. Coba edit dan hapus konten uji. Ulangi untuk tab **Anggota** jika diperlukan.
6. Setelah pengujian, Anda dapat menghapus data uji dari panel admin.

## 8. Perubahan dan deployment berikutnya

- Push perubahan ke branch GitHub yang terhubung akan memicu deployment Vercel. Push ke production branch untuk deployment produksi; branch lain biasanya menjadi Preview deployment.
- Jika mengubah `Code.gs`, simpan perubahan lalu di Apps Script pilih **Deploy > Manage deployments**, klik ikon edit pada deployment Web App, pilih **New version**, kemudian deploy. Gunakan URL `/exec` deployment tersebut; jika URL berubah, perbarui `GAS_WEB_APP_URL` di Vercel dan redeploy.
- Jika secret proxy diubah melalui menu spreadsheet, samakan nilai `GAS_PROXY_SECRET` di Vercel lalu redeploy.
- Untuk menambah admin, buat hash baru dan tambahkan baris baru di tab `Admins`. Jangan salin password asli ke Sheets.

## 9. Troubleshooting

- **Menu Duta Genre tidak muncul**: pastikan `Code.gs` ditempel di project Apps Script yang terikat ke spreadsheet, sudah disimpan, lalu muat ulang spreadsheet.
- **Apps Script menolak akses atau `Anyone` tidak tersedia**: periksa kebijakan akun Google Workspace. Akses web app publik mungkin dibatasi admin organisasi; gunakan akun/konfigurasi Google yang diizinkan.
- **Login gagal / API menampilkan masalah konfigurasi**: pastikan tab `Admins` punya header dan baris admin yang benar, status `active` adalah `TRUE`, serta semua environment variables Vercel terisi tepat. Periksa deployment log di Vercel.
- **`Akses proxy tidak diizinkan`**: `GAS_PROXY_SECRET` di Vercel harus sama persis dengan secret yang tersimpan di Apps Script.
- **Spreadsheet belum disiapkan atau ID tidak sesuai**: jalankan kembali **Siapkan tab database**, pastikan `GOOGLE_SHEETS_ID` benar, dan pastikan deployment Apps Script menjalankan versi kode terbaru.
- **Apps Script mengembalikan respons tidak valid / HTTP error**: pastikan `GAS_WEB_APP_URL` berakhiran `/exec`, deployment Web App masih aktif, aksesnya sesuai, dan versi terbaru sudah dideploy.
- **Foto gagal diunggah**: periksa `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET`, serta batas ukuran foto 10 MB.
- **Perubahan variabel Vercel belum terlihat**: lakukan redeploy dan pastikan variabel ditambahkan ke environment yang tepat.

## Catatan keamanan dan data

- Google Sheets API/service account tidak diperlukan. Apps Script mengakses spreadsheet menggunakan otorisasi pemilik deployment.
- Endpoint Apps Script disetel dapat diakses publik agar Vercel bisa memanggilnya, tetapi semua operasi data memerlukan secret proxy. Lindungi secret itu seperti password.
- Session admin menggunakan cookie `HttpOnly`, `SameSite=Strict`, dan `Secure` di production. Password disimpan di Sheets dalam bentuk hash PBKDF2, bukan teks biasa.
- Selama tab `Events` dan `Members` kosong, galeri HTML lama tetap menjadi fallback. Setelah konten dimasukkan, website menampilkan data dari Sheets.
- Menghapus item dari panel admin tidak menghapus foto yang sudah tersimpan di Cloudinary.
