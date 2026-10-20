# Pangkas.in

Aplikasi shortlink sederhana untuk membagikan URL panjang dengan nama pendek.

## Cara kerja

Pangkas.in versi pertama adalah situs statis yang bisa diterbitkan melalui GitHub Pages. Tidak ada backend atau database, jadi draft yang dibuat di form belum otomatis tersimpan untuk semua pengunjung. Agar shortlink aktif, pemilik situs perlu menambahkan pasangan alias dan URL tujuan di `links.json`, lalu menerbitkan ulang situs.

```json
{
  "notulen-rapat": "https://docs.google.com/document/d/ID-DOKUMEN",
  "materi_tim": "https://drive.google.com/file/d/ID-FILE"
}
```

Alias hanya boleh memakai huruf, angka, tanda hubung, dan garis bawah. Alias harus unik tanpa membedakan huruf besar/kecil. URL tujuan harus memakai protokol `http://` atau `https://`.

## Menjalankan lokal

Buka repo melalui server web statis, misalnya ekstensi Live Server di editor. Jangan membuka `index.html` sebagai file langsung karena browser membatasi pembacaan `links.json` dari file lokal.

## Tambah link lewat GitHub Actions

Buka tab **Actions** di repo (atau aplikasi GitHub di HP), pilih **Tambah shortlink**, tekan **Run workflow**, lalu isi alias dan link tujuan. Workflow memvalidasi input, membuang parameter pelacak (`utm_*`, `fbclid`, `gclid`) dan ID akun Google (`ouid`, `rtpof`, `sd`) dari link Google Docs/Drive, menambahkan baris ke `links.json`, lalu menerbitkan ulang situs. Link aktif sekitar 1–2 menit kemudian.

Workflow ini butuh izin tulis ke branch `main`. Jika `main` dilindungi, aturan proteksi harus mengizinkan push dari GitHub Actions.

Setiap penerbitan juga menjalankan `node scripts/links.mjs check`. Jika `links.json` rusak, situs tidak diterbitkan dan versi lama tetap aktif.

## GitHub Pages

Di Settings → Pages, atur **Source** ke **GitHub Actions**. Situs diterbitkan oleh `.github/workflows/pages.yml`, bukan langsung dari folder branch.

Saat penerbitan, `node scripts/links.mjs build _site` menyalin file situs lalu membuat satu halaman kecil per alias di `_site/<alias>/index.html`. Halaman itu disajikan dengan status 200 dan langsung mengalihkan pengunjung ke tujuan, jadi tidak ada lagi halaman 404 yang berkedip sebelum pindah.

File `404.html` tetap ada sebagai cadangan, misalnya untuk alias yang salah huruf besar/kecil. Ia mencari alias terakhir di path, mengambil tujuan dari `links.json`, lalu mengalihkan pengunjung. Path ini bekerja untuk domain khusus maupun URL GitHub Pages berbasis nama repo.

Nama `fonts` dipakai oleh folder situs, jadi tidak bisa menjadi alias.

## Cek build lokal

```sh
node scripts/links.mjs build /tmp/situs
python3 -m http.server --directory /tmp/situs 8000
```

Folder keluaran harus belum ada.
