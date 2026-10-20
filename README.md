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

## GitHub Pages

Atur GitHub Pages agar menerbitkan branch `main` dari folder root. File `404.html` mencari alias terakhir di path, mengambil tujuan dari `links.json`, lalu mengalihkan pengunjung. Path ini bekerja untuk domain khusus maupun URL GitHub Pages berbasis nama repo.
