# Pangkas.in

Aplikasi shortlink sederhana untuk membagikan URL panjang dengan nama pendek.

## Cara kerja

Pangkas.in versi pertama adalah situs statis yang bisa diterbitkan melalui GitHub Pages. Tidak ada backend atau database, jadi form di beranda hanya menyiapkan dan memeriksa alias (format, alias ganda, nama terlarang), tidak menyimpannya. Agar shortlink aktif, pemilik situs menambahkan pasangan alias dan URL tujuan ke `links.json` lalu menerbitkan ulang situs. Cara paling mudah adalah workflow **Tambah shortlink** (lihat di bawah). Setelah form selesai memeriksa, ia menyediakan tombol salin untuk alias dan link tujuan, plus tautan ke workflow itu.

```json
{
  "notulen-rapat": "https://docs.google.com/document/d/ID-DOKUMEN",
  "materi_tim": "https://drive.google.com/file/d/ID-FILE"
}
```

Alias hanya boleh memakai huruf, angka, tanda hubung, dan garis bawah. Alias harus unik tanpa membedakan huruf besar/kecil. URL tujuan harus memakai protokol `http://` atau `https://`.

## Menjalankan lokal

Buka repo melalui server web statis, misalnya ekstensi Live Server di editor. Jangan membuka `index.html` sebagai file langsung karena browser membatasi pembacaan `links.json` dari file lokal.

## Hapus link lewat GitHub Actions

Tombol **Hapus** di setiap kartu link membuka panduan singkat dan menyalin alias. Lalu jalankan workflow **Hapus shortlink** (Actions → Run workflow) dan tempel alias. Workflow menghapus baris dari `links.json`, lalu menerbitkan ulang situs. Link mati sekitar 1–2 menit kemudian.

## Tambah link lewat GitHub Actions

Buka tab **Actions** di repo (atau aplikasi GitHub di HP), pilih **Tambah shortlink**, tekan **Run workflow**, lalu isi alias dan link tujuan. Workflow memvalidasi input, membuang parameter pelacak (`utm_*`, `fbclid`, `gclid`) dan ID akun Google (`ouid`, `rtpof`, `sd`) dari link Google Docs/Drive, menambahkan baris ke `links.json`, lalu menerbitkan ulang situs. Link aktif sekitar 1–2 menit kemudian.

Workflow ini butuh izin tulis ke branch `main`. Jika `main` dilindungi, aturan proteksi harus mengizinkan push dari GitHub Actions.

Setiap penerbitan juga menjalankan `node scripts/links.mjs check`. Jika `links.json` rusak, situs tidak diterbitkan dan versi lama tetap aktif.

## GitHub Pages

Di Settings → Pages, atur **Source** ke **GitHub Actions**. Situs diterbitkan oleh `.github/workflows/pages.yml`, bukan langsung dari folder branch.

Saat penerbitan, `node scripts/links.mjs build _site` menyalin file situs lalu membuat satu halaman kecil per alias di `_site/<alias>/index.html`. Halaman itu disajikan dengan status 200 dan langsung mengalihkan pengunjung ke tujuan, jadi tidak ada lagi halaman 404 yang berkedip sebelum pindah.

File `404.html` tetap ada sebagai cadangan, misalnya untuk alias yang salah huruf besar/kecil. Ia mencari alias terakhir di path, mengambil tujuan dari `links.json`, lalu mengalihkan pengunjung. Path ini bekerja untuk domain khusus maupun URL GitHub Pages berbasis nama repo.

Nama `fonts` dipakai oleh folder situs, jadi tidak bisa menjadi alias.

## Logo

Logo Pangkas.in adalah huruf **P** yang kakinya dipotong miring. Potongan kakinya terpisah, seperti link panjang yang dipangkas.

- `logo/pangkas-p.svg`: versi utama (hitam). `logo/pangkas-p-putih.svg` untuk latar gelap.
- `logo/pangkas-p-kecil.svg`: tanpa potongan kaki. Dipakai di bawah 24 px (footer, favicon), karena di ukuran itu potongan kaki menjadi noda.
- `favicon.svg` dan `apple-touch-icon.png` (sumbernya `logo/apple-touch-icon.svg`) sudah terpasang di `index.html` dan `404.html`.

Warna logo: tinta `#171717` di atas kuning `#f7ff64`. Tulisan "pangkas.in" di header masih teks biasa (Space Grotesk), belum digambar sebagai bentuk huruf.

## Font

DM Sans dan Space Grotesk disimpan di folder `fonts/` (subset Latin, format woff2 variable) dan dimuat dari situs sendiri, bukan dari Google Fonts. Keduanya berlisensi SIL Open Font License 1.1, teks lisensinya ada di folder yang sama. Halaman `404.html` memakai font bawaan sistem karena ia bisa tampil di path mana saja.

## Cek build lokal

```sh
node scripts/links.mjs build /tmp/situs
python3 -m http.server --directory /tmp/situs 8000
```

Folder keluaran harus belum ada.
