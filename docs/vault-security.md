# Keamanan Vault

Dokumen ini adalah sumber kebenaran untuk model ancaman, kebijakan keamanan konten (CSP), dan batasan Vault.
Teks yang sama ada di `src/lib/crypto/index.ts` dan di aplikasi (bagian "Cara kerja dan batasan", `src/features/vault/ui/HowItWorks.tsx`).
Ubah ketiganya bersamaan. Jangan pernah menulis bahwa Vault "tidak bisa diretas".

Rincian skema kripto, tabel, dan kontrak repo ada di [fase-database.md](./fase-database.md).

## Model ancaman

**Melindungi dari**

- Orang yang membaca `localStorage` atau dump database: yang tersimpan hanya ciphertext dan kunci yang sudah dibungkus.
- Backup yang bocor: file backup berisi ciphertext dan meta. Tanpa kata sandi utama (atau kunci pemulihan) tidak bisa dibuka.
- Orang yang sebentar memegang layar yang tampak terbuka: kunci otomatis (idle, tab tersembunyi 2 menit), rahasia disamarkan sampai ditampilkan, sembunyi otomatis setelah 10 detik, papan klip dibersihkan setelah 20 detik (upaya terbaik).

**Tidak melindungi dari**

- Malware atau keylogger di perangkat.
- XSS atau skrip apa pun yang berjalan di halaman saat Vault terbuka. Ini alasan aturan "tanpa skrip pihak ketiga" di bawah.
- Kehilangan kata sandi utama **dan** kunci pemulihan. Tidak ada pemulihan oleh siapa pun.
- Kata sandi utama yang lemah. PBKDF2 memperlambat tebakan offline, tidak mencegahnya.
- Ekstensi peramban dengan akses ke halaman, tangkapan layar, dan pengelola papan klip.

## Batasan yang diketahui

| Batasan | Keterangan |
| --- | --- |
| Memori | Kunci sesi adalah `CryptoKey` non-extractable yang hanya dibuang referensinya saat kunci. Kata sandi yang diketik adalah string JavaScript yang tidak bisa dihapus; state form dikosongkan segera setelah dipakai, tetapi salinan di memori mengikuti pengumpul sampah. |
| Kunci sementara | Ganti kata sandi, rotasi, dan reset dari kunci pemulihan memegang vault key yang extractable sebentar, karena `wrapKey` mensyaratkannya. Tidak pernah diekspor menjadi byte. |
| Metadata | Id item, ukuran (dibulatkan ke kelipatan 256 byte), dan waktu ubah terlihat di penyimpanan. Judul, jenis, tag, dan URL ada di dalam ciphertext. |
| Papan klip | `lib/clipboard.ts` membersihkan setelah 20 detik. Peramban hanya mengizinkan penulisan saat tab fokus, aplikasi lain mungkin sudah menyalin, dan membaca papan klip (untuk memastikan tidak menimpa salinan lain) bisa memunculkan permintaan izin. Kalau tidak ingin ada permintaan izin, hapus pembacaan `readText` dan bersihkan tanpa memeriksa. |
| Jeda percobaan | Hanya kenyamanan di sisi klien. Tersimpan di `pos:vault-guard`, bisa direset siapa pun yang bisa menjalankan skrip. Perlindungan sebenarnya adalah biaya KDF. |
| Samarkan saat jendela tidak aktif | Efek tampilan. DOM tetap berisi data, dan tangkapan layar tidak terhalang. |
| Backup lama | Tetap memakai kunci dan kata sandi saat dibuat. Ganti kata sandi dan rotasi tidak mencabutnya. Kunci pemulihan yang berlaku saat backup dibuat juga bisa membukanya. |
| Rotasi kunci | Kunci pemulihan baru dibuat setelah rotasi tersimpan. Kalau tab ditutup sebelum kunci baru disimpan, kunci lama sudah tidak berlaku. Kata sandi utama masih bisa dipakai, dan rotasi ulang memberi kunci baru. |
| Item rusak | Satu item yang tidak bisa dibaca menghalangi rotasi (tidak ada item yang dibuang diam-diam). Pengaturan menyediakan penghapusan permanen yang eksplisit. |
| Pencarian | Berjalan di memori atas judul, nama pengguna, URL, layanan, tag, catatan, dan nama jaringan. Nilai rahasia tidak pernah dicari. |
| Tanpa 2FA | Kode TOTP sengaja tidak disimpan, karena menyimpannya di samping kata sandi menghilangkan gunanya. |
| Konteks aman | WebCrypto hanya ada di HTTPS atau localhost. Di luar itu, halaman Vault menampilkan penjelasan, bukan formulir. |

## Aturan: tanpa skrip pihak ketiga

**Tidak ada skrip pihak ketiga yang boleh ditambahkan ke aplikasi ini.** Tidak ada analitik, widget obrolan, pelacak kesalahan yang memuat skrip dari luar, tag manager, atau CDN untuk pustaka JavaScript.
Satu skrip dari luar yang berjalan di halaman bisa membaca isi Vault yang sedang terbuka, termasuk rahasia yang sedang ditampilkan, dan kata sandi utama yang diketik.
Semua kode berasal dari origin sendiri dan dibundel oleh Vite. `src/features/vault/csp.test.ts` menggagalkan build kalau `index.html` memuat skrip inline atau skrip dari origin lain.

Vault juga tidak membuat permintaan jaringan apa pun (tanpa favicon, ikon situs, pemeriksaan kebocoran, atau analitik), dan tidak menulis apa pun ke konsol. Ini dijaga oleh `src/features/vault/boundary.test.ts`.

## Content-Security-Policy produksi

Kirim sebagai header HTTP (meta tag tidak mendukung `frame-ancestors`):

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://api.fontshare.com;
  font-src https://cdn.fontshare.com;
  img-src 'self' data: blob:;
  connect-src 'self' https://api.open-meteo.com https://YOUR-PROJECT-REF.supabase.co;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests
```

(Satu baris di server, dipisah titik koma. Dipecah di sini supaya terbaca.)

Alasan tiap bagian:

- `script-src 'self'`: tanpa `'unsafe-inline'`, `'unsafe-eval'`, atau hash. Skrip tema yang dulu inline dipindah ke `public/theme-init.js` supaya ini mungkin.
- `connect-src 'self' https://api.open-meteo.com`: hanya origin yang dipakai kode (`src/features/weather/openMeteo.ts`). Origin proyek Supabase sudah ada (ganti `YOUR-PROJECT-REF` dengan ref proyekmu; sama dengan `VITE_SUPABASE_URL`). Hanya `https`: Realtime tidak dipakai, jadi `wss` tidak perlu. Jangan memakai wildcard.
- `style-src ... 'unsafe-inline'`: diterima sebagai kompromi. Atribut `style` yang dibuat React (misalnya lebar `ProgressBar`) dan tag `<style>` yang disisipkan TipTap saat editor dibuat membutuhkannya. Risikonya jauh lebih kecil daripada skrip inline. Jalan keluarnya: `injectCSS: false` di TipTap dengan CSS yang dikirim sendiri, dan class menggantikan style inline, lalu pecah menjadi `style-src-elem` dan `style-src-attr`.
- `https://api.fontshare.com` dan `https://cdn.fontshare.com`: stylesheet dan file font. Ini **CSS pihak ketiga** (bukan skrip). CSS jahat dalam teori bisa membocorkan nilai atribut lewat permintaan gambar, dan `img-src` yang ketat menutup jalur itu, tetapi cara paling bersih adalah **meng-host font sendiri** (misalnya lewat paket `@fontsource`) lalu menghapus kedua origin ini. Rekomendasi: lakukan sebelum fase database.
- `img-src 'self' data: blob:`: gambar aplikasi dibundel (Vite menyisipkan yang kecil sebagai `data:`). Tidak ada gambar dari luar, sehingga tidak ada favicon atau ikon situs.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`: ketiganya juga ada di `index.html` sebagai meta tag, karena tidak mungkin merusak aplikasi.
- `frame-ancestors 'none'`: mencegah halaman dibingkai situs lain.
- Tidak ada `frame-src`, `worker-src`, `media-src`: aplikasi tidak memakainya, jadi jatuh ke `default-src 'none'`.

Terapkan lebih dulu sebagai `Content-Security-Policy-Report-Only` di lingkungan staging, buka semua halaman (dashboard, catatan, kalender, cuaca, vault), dan periksa konsol sebelum memberlakukannya. Saya tidak bisa menguji kebijakan ini di peramban dari sini.

Yang aman di `index.html` (sudah ada): `object-src 'none'; base-uri 'self'; form-action 'self'` lewat meta tag.

## Header lain di server

```
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: clipboard-read=(self), clipboard-write=(self), geolocation=(), camera=(), microphone=(), payment=()
```

`Referrer-Policy: no-referrer` perlu diuji dengan Fontshare (sebagian host font memeriksa referrer); itu alasan tidak dipasang di `index.html`. Setelah font di-host sendiri, risiko ini hilang.

## Daftar periksa sebelum rilis

1. Disajikan lewat HTTPS saja (WebCrypto butuh konteks aman).
2. CSP di atas aktif (diuji dulu dengan Report-Only), dan `connect-src` hanya memuat origin yang benar-benar dipakai.
3. Tidak ada skrip pihak ketiga. `npm test` hijau (`csp.test.ts`, `boundary.test.ts`).
4. Log server, APM, dan proxy tidak mencatat body request ke tabel Vault.
5. Backup terenkripsi diekspor dan dicoba dipulihkan sekali di peramban bersih.
