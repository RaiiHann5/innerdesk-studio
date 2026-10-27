# Fase database: yang harus diganti

Untuk Mood dan Jurnal, yang diganti hanya dua repo: `MoodRepo` dan `JournalRepo`
(`src/data/repos/interfaces.ts`, dirakit di `src/data/repos/index.ts`).
Komponen, hook, dan store tidak mengimpor `localStorage` untuk data ini, jadi tidak perlu disentuh.
Bagian Task dan Project ada di bawah, setelah bagian Mood dan Jurnal.

## Yang diganti

| File | Perubahan |
| --- | --- |
| `src/data/repos/index.ts` | `moodRepo` dan `journalRepo` diarahkan ke klien API. Ini satu-satunya file yang tahu implementasi mana yang dipakai. |
| `src/data/repos/local/createLocalDayRepo.ts` | Tidak dipakai lagi oleh mood dan jurnal. Hapus kalau tidak ada repo lokal lain yang memakainya. |
| `src/data/seed/mood.ts`, `journal.ts` | Hanya untuk mode lokal. Pindahkan ke skrip seed database atau hapus. |

## Kontrak yang harus dipenuhi implementasi baru

Dua repo ini adalah `DayRepo<T>`. Kode di atasnya bergantung pada hal-hal berikut:

1. **Satu data per tanggal.** `date` (yyyy-MM-dd) harus unik. Di database: unique index pada `(user_id, date)`.
2. **`upsert(input)`** membuat data untuk `input.date` atau memperbarui yang sudah ada, dalam satu operasi atomik. Autosave jurnal bisa memanggilnya beberapa kali per detik, dan dua panggilan pada hari yang sama tidak boleh menghasilkan dua baris. Versi lokal menyerialkan penulisan; di database cukup `INSERT ... ON CONFLICT (date) DO UPDATE`.
3. **`create` berperilaku seperti `upsert`.** Store generik memanggil `create`, dan aturan satu-per-hari tidak boleh bisa dilewati lewat jalur itu.
4. **`getByDate(date)`** mengembalikan `null` kalau tidak ada. `useJournalActions` memakainya untuk memutuskan apakah hari yang dikosongkan perlu dihapus.
5. **`remove(id)`** dipanggil dengan `id`, bukan tanggal. Hapus data yang tidak ada tidak boleh melempar error.
6. **Semua kegagalan harus melempar.** Autosaver menganggap promise yang resolve berarti tersimpan. Kalau repo menelan error, teks bisa hilang tanpa peringatan.
7. **`listRange(from, to)`** inklusif di kedua ujung. Saat ini belum dipakai UI (store memuat semuanya lewat `list()`), tetapi ada di interface, jadi tetap harus diimplementasikan.
8. **`id`, `createdAt`, `updatedAt`** diberikan oleh repo, bukan UI. Perhatikan: urungkan setelah hapus membuat ulang data dengan `id` dan `createdAt` baru. Kalau fitur riwayat atau sinkronisasi dibuat, ini perlu dipikirkan.

## Bentuk data

- `MoodEntry`: `{ date, level 1-5, factors[], note? }`.
- `JournalEntry`: `{ date, title?, content, excerpt }`.
  - `content` adalah JSON ProseMirror/TipTap (`EditorDoc`). Simpan sebagai `jsonb`, bukan teks. Skema node yang dipakai: `paragraph`, `heading` (level 2 dan 3), `blockquote`, `bulletList`, `orderedList`, `listItem`, `taskList`, `taskItem` (dengan `attrs.checked`), serta mark `bold` dan `italic`.
  - `excerpt` dihitung di klien (`excerptOf`) setiap kali menyimpan. Kalau server yang menghitung, daftar tidak perlu memuat `content`.
  - Pencarian jurnal (`searchEntries` di `features/journal/lib/dateRail.ts`) berjalan di klien atas seluruh isi. Dengan data besar, pindahkan ke pencarian teks penuh di server; itu perubahan di store dan `DateRail`, bukan di repo.

## Catatan di luar repo

- Store memuat semua data lewat `list()` saat aplikasi dibuka (`loadAllEntities`). Untuk jurnal bertahun-tahun, ganti ke pemuatan per bulan lewat `listRange`. Itu perubahan di `stores/entities.ts`, bukan di repo.
- Pengaturan **Kunci jurnal** (`pos:journal-lock`) dan pertanyaan pemantik yang ditutup (`pos:settings`) tetap di `localStorage`. Keduanya preferensi perangkat, bukan data jurnal. Kunci jurnal hanya penyamaran layar; kalau nanti jurnal perlu benar-benar privat, enkripsi harus dibuat terpisah (misalnya enkripsi sisi klien sebelum `upsert`).
- Data lama di `localStorage` (`mood-v2`, `journal`) tidak dimigrasikan otomatis. Kalau perlu, tulis skrip sekali jalan yang membaca `pos:v1:mood-v2` dan `pos:v1:journal`, lalu memanggil `upsert` satu per satu.

---

# Task dan Project

`TaskRepo` dan `ProjectRepo` sama seperti repo lain: `Repo<T>` dengan `list`, `get`, `create`, `update`, `remove`, `restore`.
Yang berubah adalah bentuk datanya dan beberapa aturan yang kini diandalkan kode di atasnya.

## Yang diganti

| File | Perubahan |
| --- | --- |
| `src/data/repos/index.ts` | `taskRepo` dan `projectRepo` diarahkan ke klien API. |
| `src/data/repos/local/createLocalRepo.ts` | Opsi `normalize` hanya untuk mode lokal. Tidak perlu ada di klien API. |
| `src/data/repos/normalize.ts` | Default saat baca untuk localStorage. Di database, gantinya adalah default kolom dan migrasi satu kali (lihat di bawah). |
| `src/data/seed/tasks.ts`, `projects.ts` | Hanya mode lokal. Pindahkan ke skrip seed atau hapus. |

## Bentuk data yang bertambah

Semua tambahan bersifat aditif. Field lama tidak berubah arti.

**Task**

| Field | Bentuk | Catatan |
| --- | --- | --- |
| `subtasks` | `{ id, title, done }[]` | Urutan array adalah urutan tampil. Selalu dibaca dan ditulis utuh. |
| `estimateMinutes` | integer > 0, opsional | Menit. |
| `recurrence` | `{ freq: 'daily' \| 'weekly' \| 'monthly', interval >= 1 }`, opsional | Bukan `Recurrence` kalender: tanpa `until` dan `exceptions`, dan tanpa `yearly`. |
| `order` | angka | Posisi manual dalam satu kolom status. Lihat bagian Urutan manual. |
| `archivedAt` | ISO datetime, opsional | Lihat bagian Arsip. |

**Project**

| Field | Bentuk | Catatan |
| --- | --- | --- |
| `color` | salah satu dari `moss`, `ochre`, `clay`, `teal`, `slate`, `rosewood` | Token yang sama dengan `CategoryColor`. |
| `startDate`, `goal` | `yyyy-MM-dd`, teks, opsional | |
| `milestones` | `{ id, title, dueDate?, done }[]` | Urutan array adalah urutan yang diatur pengguna. |
| `links` | `{ id, title, url, kind: 'akun' \| 'dokumen' \| 'desain' \| 'lainnya' }[]` | Lihat bagian Tautan. |
| `archivedAt` | ISO datetime, opsional | |

`subtasks`, `milestones`, dan `links` aman disimpan sebagai `jsonb` pada baris induknya, karena UI selalu menyuntingnya sebagai satu larik.
Kalau dijadikan tabel anak, beri kolom `position` dan kembalikan terurut. Id di dalamnya dibuat klien dan harus dipertahankan.

## Default saat dibaca

Data lokal tidak punya versi, dan tidak ada migrasi yang merusak. `normalizeTasks` dan `normalizeProjects` mengisi default setiap kali data dibaca,
tanpa menulis ulang apa pun sendiri. Bentuk lengkap baru tertulis pada penyimpanan normal berikutnya. Menjalankannya dua kali tidak mengubah hasil.

| Field yang hilang | Default |
| --- | --- |
| `subtasks`, `milestones`, `links` | `[]` |
| `estimateMinutes`, `recurrence`, `archivedAt`, `startDate`, `goal` | tidak ada |
| `color` project | satu dari enam token, dipilih dari hash `id` supaya tetap sama setiap kali |
| `order` task | per status, urut `createdAt` lalu `id`, kelipatan 1000. Ditempatkan setelah task yang sudah punya `order` |

Pembacaan lokal juga membuang nilai rusak: subtask atau milestone tanpa judul, link tanpa url, `freq` di luar tiga nilai, `interval` kurang dari 1 (jadi 1),
`estimateMinutes` bukan angka positif, `kind` tidak dikenal (jadi `lainnya`), tanggal yang bukan `yyyy-MM-dd`.
Di database, jadikan ini batasan (`CHECK`, enum) supaya data rusak tidak bisa masuk sejak awal.

Migrasi satu kali untuk database: isi kolom baru dengan default di atas. Untuk `order`, jalankan penomoran per status seperti pada tabel.

## Urutan manual (`order`)

1. `order` berlaku per status, hanya di antara task yang tidak diarsipkan. Naik berarti lebih ke bawah.
2. Nilai boleh pecahan, negatif, dan berjarak tidak rata. Pindah posisi biasanya menulis **satu** baris (titik tengah antar tetangga, `placeTask` di `lib/reorder.ts`). Kolom `integer` tidak cukup: pakai `double precision` atau `numeric`.
3. Dua task dengan `order` sama tidak boleh membuat urutan acak. Urutan pasti: `order`, lalu `createdAt`, lalu `id`. Query terurut di server harus memakai tiga kunci itu (`compareManual` di `lib/taskQuery.ts`).
4. Kalau jarak dua tetangga terlalu kecil (di bawah 0,02) atau seri, `placeTask` memberi nomor ulang seluruh kolom dengan kelipatan 1000. Itu bisa berarti puluhan baris dalam satu aksi. Sediakan update batch dalam satu transaksi. Versi lokal menulis satu per satu, dan itu aman: kalau berhenti di tengah jalan, yang tersisa hanya seri, yang urutannya tetap pasti (aturan 3).
5. Task baru harus jatuh di akhir kolom statusnya. Klien menghitung `max(order di status itu) + 1000` (`appendOrder`). Server boleh menghitung sendiri kalau `order` tidak dikirim.
6. Pindah kolom adalah satu `update` yang mengubah `status` dan `order` bersama, atomik.
7. Index yang disarankan: `(user_id, status, order)`.

## Arsip

1. Arsip hanya mengisi `archivedAt`. Tidak ada yang dihapus. `remove` tetap hapus permanen.
2. **Membatalkan arsip** memanggil `update(id, { archivedAt: undefined })`. Repo lokal menghapus field itu saat JSON ditulis. Implementasi database harus memperlakukan `undefined` atau `null` sebagai "kosongkan", bukan "abaikan". Aturan yang sama berlaku untuk semua field opsional yang dikosongkan UI (lihat bagian Cara UI menulis).
3. `list()` mengembalikan task dan project yang diarsipkan juga. Penyaringan dilakukan di klien (`activeTasks`, `filterTasks` dengan `archive: 'hide'`, `buildDayItems`). Kalau database menyaring di server, harus ada cara mengambil yang diarsipkan untuk tab Arsip.
4. Aturan hitung yang dipakai di mana-mana lewat `lib/taskStats.ts` dan `lib/projectStats.ts`:
   - total, terbuka, dan terlambat tidak menghitung task yang diarsipkan;
   - task **selesai** yang diarsipkan tetap dihitung selesai dalam persentase dan progress, supaya mengarsipkan kolom Selesai tidak menurunkan progress;
   - task yang diarsipkan sebelum selesai tidak dihitung di mana pun;
   - waktu (`timeLog`) pada task yang diarsipkan tetap dihitung di total waktu project, karena waktunya memang terpakai;
   - kalender tidak menampilkan task yang diarsipkan.
5. Project yang diarsipkan tidak muncul di papan, daftar, dashboard, dan tidak dihitung sebagai project aktif. Ia tampil di tab Arsip dan halamannya tetap bisa dibuka dengan tombol Pulihkan. Task dan catatan milik project itu **tidak** ikut tersembunyi: keduanya tetap tampil di halaman Task dan Catatan. Milestone project yang diarsipkan tidak tampil di kalender.

## Task berulang

- Menyelesaikan task berulang membuat task berikutnya lewat `nextOccurrence` (`lib/taskRecurrence.ts`): tanggal tenggat dari aturan, subtask kembali belum dicentang, `order` dipertahankan, waktu dan catatan dikosongkan.
- Klien melakukannya dengan dua tulis terpisah (ubah status, lalu `create`). Tidak atomik. Kalau database mendukung transaksi, pindahkan ke server dalam satu transaksi. Aturan tanggalnya tetap di `nextDueDate` sebagai acuan.
- Pencegah duplikat saat ini hanya di klien: tidak membuat salinan kalau sudah ada task terbuka dengan judul, project, dan tenggat yang sama. Server sebaiknya memakai kunci idempoten sendiri (misalnya kolom `recurrence_source_id` unik). Kolom itu belum ada di model.
- Langkah bulanan dihitung dari tenggat saat ini, jadi seri tanggal 31 akan menetap di tanggal 28 setelah melewati Februari. Itu batas yang diketahui.

## Tautan project

Aplikasi menyimpan alamat ke akun, dokumen, dan desain. Tidak pernah kredensialnya. Form memeriksa dengan `checkLinkUrl` (`lib/projectLinks.ts`), dan **server harus memeriksa hal yang sama**, karena form bisa dilewati:

- Hanya `http` dan `https`. Alamat tanpa skema (`figma.com/file/x`) diberi `https://`. Skema lain (`javascript:`, `data:`, `file:`, `mailto:`, `ftp:`) ditolak.
- Tanpa spasi, host harus punya titik (atau `localhost`).
- Tanpa nama pengguna atau kata sandi di dalam alamat (`https://user:pass@host`).
- Tanpa rahasia di query maupun fragment. Nama parameter yang ditolak, tanpa membedakan huruf besar kecil: `password`, `passwd`, `pwd`, `pass`, `secret`, `token`, `access_token`, `refresh_token`, `id_token`, `auth`, `authorization`, `api_key` / `api-key` / `apikey`, `client_secret`, `session`, `sessionid`, `sid`.
- `kind` adalah enum empat nilai di atas. `title` kosong diisi dengan alamatnya.
- Saat membaca, UI tidak memercayai data: alamat yang bukan `http(s)` polos tidak pernah dijadikan `href` (`safeHref`). Itu pertahanan tambahan, bukan pengganti validasi saat menulis.

## Hal lain yang perlu diketahui

- **Id task dipakai ulang.** Repo lokal membuat `TSK-n` dari `max + 1`. Menghapus task terakhir lalu membuat yang baru memakai id yang sama, dan sesi fokus lama masih menunjuk id itu lewat `taskId`. Database harus memakai id yang tidak pernah dipakai ulang.
- **`restore(item)`** (dipakai untuk urungkan) harus mempertahankan `id`, `createdAt`, `updatedAt`, dan `order`.
- **Statistik dihitung di klien** dari seluruh daftar (`projectSummary`: progress, kesehatan, waktu, milestone berikutnya). Semuanya fungsi murni, jadi kalau datanya besar bisa dipindah ke server tanpa mengubah tampilan. Waktu project adalah jumlah `timeLog` seluruh task-nya, minggu ini dihitung Senin sampai Minggu.

## Cara UI menulis (yang perlu dipenuhi database)

Ini perilaku yang kini diandalkan layar Task dan Project. Beberapa di antaranya mengubah pilihan desain API.

1. **`update` adalah patch per field, bukan penggantian objek.** Panel task hanya mengirim field yang diubah (judul, deskripsi, tag, estimasi, dst.) dan tidak pernah menyentuh `timeLog`, `focusCount`, atau `noteCount`, yang ditulis jalur lain (sesi fokus, catatan). Endpoint `PUT` yang mengganti seluruh baris akan menimpa waktu fokus yang tercatat. Pakai `PATCH`.
2. **`undefined` berarti kosongkan.** UI mengosongkan field dengan mengirim `undefined`: `archivedAt`, `completedAt`, `dueDate`, `dueTime` (mengosongkan tanggal ikut mengosongkan jam), `description`, `estimateMinutes`, `recurrence`, `projectId`, serta `startDate`, `goal`, `deadline` pada project. Di JSON field itu hilang, jadi klien API perlu mengubahnya menjadi `null` yang eksplisit.
3. **Autosave panel task**: ketikan ditunda 600 ms lalu dikirim sebagai satu patch gabungan, satu tulis berjalan pada satu waktu (mesin yang sama dengan catatan). Pilihan diskret (select, centang) langsung ditulis. Tulis gagal ditampilkan sebagai "Gagal menyimpan" dengan tombol Coba lagi yang mengirim ulang patch yang sama, jadi patch harus **idempoten**. Saat panel ditutup, patch yang tertunda dikirim dulu.
4. **Aksi massal bukan transaksi.** Pilihan beberapa baris di Tabel mengubah status, prioritas, project, tenggat, tag, mengarsipkan, atau menghapus dengan satu tulis per task, paralel, lewat `Promise.allSettled`. Yang gagal dilaporkan ("2 task dihapus. 1 lainnya gagal.") dan bisa dicoba ulang; yang berhasil tetap bisa diurungkan. Endpoint batch boleh ada, tetapi hasil per baris harus dikembalikan supaya UI tahu mana yang gagal.
5. **Menyelesaikan task berulang** lewat satu jalur (`changeStatus` di `features/tasks/taskActions.ts`), dari papan, tabel, panel, dan chip kalender: ubah status, lalu `create` task berikutnya. Kalau `create` gagal, task tetap selesai dan UI menawarkan membuat salinannya lagi, jadi kunci idempoten di server (bagian Task berulang) berguna.
6. **Pindah posisi di papan** memakai `placeInColumn`: satu `update` untuk task yang dipindah (status dan `order` bersama, dan `completedAt` bila masuk Selesai), ditambah update `order` untuk task lain hanya bila kolom dinomori ulang. Saat filter menyembunyikan sebagian kartu, posisi dihitung terhadap kolom penuh (`fullIndexFor`), jadi server tidak boleh mengandalkan indeks di antara kartu yang terlihat.
7. **Hapus dengan urungkan** memanggil `restore(item)` dengan objek lengkap, termasuk `id`, `createdAt`, `updatedAt`, `order`, `subtasks`, dan `timeLog`. Urungkan satu kali ini juga dipakai untuk satu atau banyak task sekaligus.
8. **Duplikat project** dilakukan klien: `create` project, lalu `create` tiap task. Kalau ada yang gagal, yang sudah dibuat dihapus lagi, jadi tidak pernah ada salinan setengah jadi. Urungkan menghapus salinan dan task-nya. Isi salinan ditentukan `planDuplicate` (`lib/projectDuplicate.ts`): task disalin sebagai `todo` tanpa tanggal, tanpa `recurrence`, `timeLog`, `focusCount`, `noteCount`; subtask belum dicentang dengan id baru; milestone belum dicentang **dan tanpa tanggal**; tautan disalin dengan id baru; project baru `active`, fase `riset`, tanpa `startDate` dan `deadline`; task yang diarsipkan tidak ikut. Endpoint server (`POST /projects/:id/duplicate`) dalam satu transaksi akan lebih aman; aturan isinya tetap sama.
9. **Milestone dan tautan ditulis sebagai satu larik utuh** (`milestones`, `links` pada project), seperti `subtasks` pada task. Mencentang milestone dari chip kalender membaca project terbaru lalu menulis larik itu. Dua penyunting bersamaan akan saling menimpa (last write wins). Itu batas yang diterima untuk satu pengguna; kalau nanti multi-pengguna, pecah jadi tabel anak dengan `PATCH` per baris.
10. **Id anak dibuat klien**: subtask `s-xxxxxxxx`, milestone `m-xxxxxxxx`, tautan `l-xxxxxxxx` (acak 8 karakter). Id seed berbentuk `<induk>-s1`, `<induk>-m1`. Database harus menyimpan id yang dikirim dan tidak membuat ulang.
11. **Catatan milik project**: tab Catatan menyaring `Note.projectId`, dan "Catatan baru" membuat catatan dengan `projectId` terisi. Index yang disarankan: `(user_id, project_id)`. Penyaringan di klien selama daftar catatan dimuat penuh; kalau tidak, butuh `list({ projectId })`.
12. **Kalender membaca milestone dari project**: `buildDayItems` mengambil `milestones[].dueDate` dalam rentang yang tampil dari seluruh daftar project (tanpa yang diarsipkan). Selama daftar project kecil itu cukup. Kalau database membatasi per rentang, milestone perlu kolom tanggal yang bisa di-index, bukan hanya `jsonb`.
13. **Angka yang harus sama di semua tempat** (kartu, halaman detail, baris statistik, daftar, dashboard) datang dari `projectSummary` dan `projectProgress` (`lib/projectStats.ts`). Kalau dipindah ke server, semua layar harus membaca hasil yang sama; jangan hitung ulang di tempat lain. Progress project menggabungkan task dan milestone; progress global di halaman Task hanya menghitung task.
---

# Vault (hanya ciphertext)

Vault menyimpan kata sandi, kunci API, catatan aman, dan Wi-Fi. Beda dengan data lain, **server tidak boleh pernah melihat isinya**.
Dua repo, `VaultMetaRepo` dan `VaultItemRepo` (`src/data/repos/interfaces.ts`), hanya memegang ciphertext dan kunci yang sudah dibungkus.
Keduanya **tidak** dimuat oleh `loadAllEntities`, dan tidak ada store entitas untuk vault. Isi vault hanya didekripsi di memori setelah dibuka.
Kode kriptografi ada di `src/lib/crypto/` (WebCrypto saja). Bentuk teks asli item ada di `src/features/vault/types.ts` dan tidak boleh diimpor oleh `src/data/`
(dijaga oleh `src/features/vault/boundary.test.ts`).

## Model ancaman

- **Melindungi dari:** orang yang membaca `localStorage` atau dump database, backup yang bocor, dan orang yang sebentar memegang layar yang tampak terbuka.
- **Tidak melindungi dari:** malware atau keylogger di perangkat, XSS saat vault terbuka, dan kehilangan kata sandi utama **sekaligus** kunci pemulihan. Tidak ada pemulihan oleh siapa pun.
- Jangan pernah menyebutnya "tidak bisa diretas".

## Skema kripto, ringkas

| Bagian | Isi |
| --- | --- |
| Kata sandi utama | PBKDF2-HMAC-SHA-256, 600.000 iterasi, salt acak 16 byte, menghasilkan KEK (tidak bisa diekspor). Nama KDF, iterasi, dan salt disimpan di meta supaya biayanya bisa dinaikkan. |
| Vault key (VK) | 256-bit acak. Hanya disimpan **terbungkus** (AES-GCM) oleh KEK. Ganti kata sandi hanya membungkus ulang VK; item tidak dienkripsi ulang. |
| Kunci pemulihan | 160 bit acak, ditampilkan sekali sebagai base32 berkelompok. HKDF-SHA-256 menurunkan KEK kedua yang membungkus VK yang sama. |
| Item | AES-256-GCM, IV acak 96-bit baru di setiap penulisan, AAD = `id` + versi skema. Payload diberi padding ke kelipatan 256 byte supaya panjang sandi tidak terbaca dari ukuran. |
| Sandi salah | Terdeteksi karena unwrap AES-GCM gagal. Tidak ada hash sandi yang disimpan. |
| Parameter KDF | Ikut diautentikasi (AAD pembungkus), dan iterasi di bawah 600.000 ditolak sebagai data rusak. |

## Tabel (hanya ciphertext)

```sql
create table vault_meta (
  user_id                uuid primary key references auth.users on delete cascade,
  version                int  not null check (version = 1),
  revision               int  not null check (revision >= 1),
  key_epoch              int  not null check (key_epoch >= 1),
  kdf                    jsonb not null,   -- { name, iterations, salt }
  wrapped_vk_by_password jsonb not null,   -- { iv, ciphertext }
  wrapped_vk_by_recovery jsonb not null,
  created_at             timestamptz not null,
  updated_at             timestamptz not null
);

create table vault_items (
  user_id    uuid not null references auth.users on delete cascade,
  id         text not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),  -- dibuat klien, bagian dari AAD
  v          int  not null,
  key_epoch  int  not null,                                       -- diisi RPC, bukan bagian dari EncryptedItem
  iv         text not null,
  ciphertext text not null check (length(ciphertext) <= 400000),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

alter table vault_meta  enable row level security;
alter table vault_items enable row level security;

create policy vault_meta_own  on vault_meta  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy vault_items_own on vault_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Aturan tabel:

1. **Tidak ada kolom teks asli.** Tidak ada `title`, `kind`, `tags`, `url`, atau `favorite` di luar ciphertext. Yang terlihat di dump hanya `id`, ukuran, dan waktu.
2. Tidak ada index atau pencarian di sisi server atas isi vault. Pencarian berjalan di memori klien setelah dibuka.
3. RLS dengan `user_id` di **kedua** tabel. Tanpa kebijakan `delete` yang longgar, dan tanpa akses `anon`.
4. `vault_items.key_epoch` diisi oleh RPC dari parameter, lalu dibandingkan dengan `vault_meta.key_epoch`. Tulisan dengan epoch lain ditolak.

## Yang tidak boleh diterima server

Kata sandi utama, kunci pemulihan, VK, KEK, atau teks asli item, dalam bentuk apa pun, termasuk di query string, header, log, atau pesan error.
Konsekuensinya untuk implementasi server:

- Jangan mencatat body request ke tabel vault (log aplikasi, APM, tracing, dan log proxy).
- Jangan menambahkan kolom, trigger, atau view yang menyalin isi vault ke tempat lain.
- Jangan menambahkan fitur server yang butuh teks asli (pencarian, pratinjau, pemeriksaan kebocoran, ikon situs).
- Backup server hanya berisi ciphertext, dan itu cukup.

## Kontrak `VaultMetaRepo`

1. `get()` mengembalikan `null` **hanya** kalau memang belum ada vault. Data yang ada tetapi rusak harus **melempar** (`corrupt`). Kalau tidak, layar Setup bisa muncul dan menimpa vault yang masih bisa diselamatkan.
2. `create(meta)` gagal (`conflict`) kalau sudah ada baris untuk user itu. Di database: `INSERT` tanpa `ON CONFLICT`.
3. `update(meta)` adalah compare-and-swap: `meta.revision` harus sama dengan `revision` tersimpan + 1, dan `key_epoch` tidak boleh turun. Di database: `UPDATE ... WHERE user_id = $1 AND revision = $2 - 1`, lalu periksa jumlah baris yang berubah. Ini yang menolak tulisan dari tab yang sudah usang.
4. Semua kegagalan melempar. `VaultError` dengan `code`; pesannya generik dan tidak memuat data.

## Kontrak `VaultItemRepo`

1. Record hanya berisi `{ id, v, iv, ciphertext, createdAt, updatedAt }`. Field lain ditolak (`corrupt`), bukan diabaikan.
2. `id` dibuat **klien** sebelum enkripsi, karena `id` adalah bagian dari AAD. Jangan pakai `uuid default` di server.
3. `put(item, keyEpoch)` adalah upsert dan `keyEpoch` harus sama dengan epoch tersimpan, kalau tidak `conflict`. Ini mencegah tab usang menambah item yang dienkripsi dengan kunci lama setelah rotasi.
4. `remove` pada id yang tidak ada bukan error. `restore(item, keyEpoch)` memasukkan kembali **ciphertext yang sama** dan gagal (`conflict`) kalau `id` sudah ada. Urungkan hapus tidak membuat ulang dan tidak mengenkripsi ulang.
5. `createdAt`/`updatedAt` datang dari klien. Server boleh menimpa `updatedAt`.
6. `list()` mengembalikan semua item (urutan tidak penting). Untuk vault yang besar, paginasi boleh ditambahkan, tetapi pencarian tetap butuh semuanya di memori.
7. **Penggantian atomik (rotasi kunci dan restore backup).** Versi lokal memakai tiga langkah karena `localStorage` tidak punya transaksi lintas kunci:
   `stageReplace(items, epoch)` menulis set baru di samping set aktif, lalu `metaRepo.update(...)` (titik komit tunggal), lalu `settle(epoch)` menjadikan set baru aktif.
   Di database, **ganti ketiganya dengan satu transaksi** (misalnya RPC `vault_replace(meta, items, expected_revision)`): hapus dan masukkan semua item, ubah meta dengan `WHERE revision = expected_revision`, atau batalkan semuanya.
   `settle` dan `discardStaged` lalu menjadi no-op. Jangan menulis item baru satu per satu ke tabel aktif: kegagalan di tengah jalan akan meninggalkan vault yang separuh terenkripsi dengan kunci lama dan separuh dengan kunci baru.
8. Sebelum komit, rotasi memeriksa ulang bahwa set item tidak berubah sejak dibaca, tetapi masih ada celah kecil antara pemeriksaan dan komit. Transaksi dengan versi baris menutupnya.

## Backup terenkripsi

File JSON `{ format: "innerdesk-vault-backup", version: 1, exportedAt, meta, items }`: hanya ciphertext dan meta.
Restore membutuhkan kata sandi utama **yang berlaku saat backup dibuat**, memverifikasi bahwa setiap item bisa didekripsi sebelum menulis apa pun, lalu **mengganti seluruh vault**.
UI harus meminta konfirmasi. File backup lama bisa mengembalikan kata sandi lama; itu bukan bug.

## Rotasi kunci dan kunci pemulihan

Rotasi membuat VK baru **dan kunci pemulihan baru** (ditampilkan sekali lagi). Kunci pemulihan lama berhenti berlaku. Alasannya: kunci pemulihan tidak disimpan di mana pun,
jadi tidak ada cara membungkus VK baru dengannya tanpa meminta orangnya memasukkannya lagi. Rotasi juga meminta kata sandi utama lagi.

## Yang harus ditangani fase database

- Implementasi dua repo di atas, dengan transaksi penggantian (butir 7) dan CAS pada meta.
- Jalankan `settleInterruptedRotation` sebelum setiap unlock (di versi database tidak berbuat apa-apa, tetapi pemanggilnya sama).
- Sinkronisasi dua perangkat: `revision` dan `key_epoch` sudah ada untuk mendeteksi konflik, tetapi tidak ada penggabungan. Perangkat yang usang harus membuka ulang vault.
- Migrasi dari `localStorage` ke database: salin `pos:v1:vault-meta` dan isi `pos:v1:vault-items` apa adanya (ciphertext tidak perlu didekripsi), jangan lewat jalur entitas biasa.
- **Kunci jurnal** (`pos:journal-lock`) hanya penyamaran layar dan **bukan** enkripsi. Jangan dipakai ulang atau disamakan dengan vault.
- Penyimpanan `localStorage` bisa dihapus peramban. Vault di mode lokal tanpa backup bisa hilang; UI sebaiknya mengingatkan untuk mengekspor backup.

## Tambahan Vault, tahap 4

- `VaultMetaRepo.overwrite(meta)` mengganti record tanpa memeriksa isi yang ada. Hanya dipakai saat memulihkan backup yang sudah diverifikasi ke atas vault yang tidak bisa dibaca (`get()` melempar `corrupt`, sehingga `update` tidak bisa membandingkan). Di database: RPC yang sama dengan penggantian atomik (butir 7), dijalankan oleh pemilik baris.
- `settle(epoch)` boleh menggantikan set item aktif yang rusak dengan set yang di-stage bila epoch-nya sama dengan epoch meta. Tidak pernah sebaliknya.
- Kebijakan keamanan konten, aturan tanpa skrip pihak ketiga, dan batasan yang diketahui ada di [vault-security.md](./vault-security.md). Fase database harus menambahkan origin Supabase ke `connect-src` dan hanya itu.

---

# Keuangan: yang harus dijaga repo database

Semua tabel punya `user_id uuid not null` dan RLS:
`using (user_id = auth.uid()) with check (user_id = auth.uid())` untuk select, insert, update, delete.

## Tabel

| Tabel | Kolom penting |
|---|---|
| `accounts` | `id`, `user_id`, `name`, `kind` (tunai/bank/ewallet/investasi), `currency` (char 3), `opening_balance_minor bigint`, `sort_order`, `archived_at` |
| `finance_categories` | `id`, `user_id`, `name`, `kind` (income/expense), `sort_order`, `archived_at` |
| `transactions` | `id`, `user_id`, `date date`, `kind`, `amount_minor bigint`, `currency`, `fx_rate numeric(20,6)`, `fx_base_amount_minor bigint`, `account_id`, `to_account_id`, `to_amount_minor bigint`, `category_id`, `note`, `payee`, `project_id`, `tags text[]`, `recurring_id`, `created_at`, `updated_at` |
| `budgets` | `id`, `user_id`, `month` (char 7, yyyy-MM), `category_id`, `limit_minor bigint`; **unique (user_id, month, category_id)** |
| `goals` | `id`, `user_id`, `name`, `target_minor bigint`, `target_date date`, `archived_at` |
| `goal_contributions` | `id`, `user_id`, `goal_id`, `date date`, `amount_minor bigint`, `note` |
| `recurring` | `id`, `user_id`, `name`, `kind`, `amount_minor bigint`, `currency`, `account_id`, `category_id`, `freq`, `interval int check (interval >= 1)`, `next_date date`, `active` |

Foreign keys ke `accounts`, `finance_categories`, `projects` memakai `on delete restrict` atau `set null` (kategori dan proyek),
jangan `cascade`: menghapus akun tidak boleh menghapus riwayat uang diam-diam.

## Yang wajib dipertahankan

1. **Satuan minor.** Semua jumlah `bigint` dalam satuan minor mata uangnya (IDR 0 desimal, USD 2). Tidak ada `float`,
   `real`, atau `numeric` untuk uang. Di JavaScript, tolak nilai yang bukan `Number.isSafeInteger`.
2. **Nilai dasar tersimpan.** `fx_base_amount_minor` dan `fx_rate` disimpan apa adanya saat transaksi dibuat dan tidak
   pernah dihitung ulang dari kurs sekarang. Laporan lama harus tetap sama.
3. **Transfer.** `kind = 'transfer'` bukan pemasukan atau pengeluaran dan tidak masuk total. Transfer lintas mata uang
   wajib punya `to_amount_minor`; tanpa itu kedua sisi tidak diterapkan (tidak ada uang tercipta atau hilang).
   `account_id <> to_account_id`, dan `currency` transaksi sama dengan mata uang akun asal.
4. **Tanggal.** `date` bertipe `date`, dikirim dan dibaca sebagai `yyyy-MM-dd` tanpa zona waktu. Jangan lewat `Date`/`timestamptz`.
5. **Satu anggaran per (bulan, kategori).** Dijaga oleh constraint unik; kode "Salin dari bulan lalu" sudah melewati kategori yang ada.
6. **Setoran target** adalah alokasi di dalam tabungan yang ada. Tidak pernah mengubah saldo akun.
7. **Tagihan berulang.** `next_date` hanya maju saat pengguna menekan Catat. Tidak ada job yang mencatat otomatis.
   Mencatat tagihan = insert transaksi lalu update `next_date`; lakukan dalam satu transaksi database (RPC) agar tidak
   ada kondisi setengah jadi. Selama masih dua panggilan, kegagalan kedua hanya boleh mengulang langkah memajukan tanggal.
8. **Restore.** `restore(tx)` (urungkan hapus) menyimpan id, `created_at`, dan nilai dasar yang sama.
9. **Impor CSV.** Duplikat dideteksi di klien (tanggal, nominal, catatan). Insert massal harus atomik per batch,
   dan tidak boleh menyimpan berkas aslinya.
10. **Privasi.** Hanya nama panggilan akun. Tidak ada nomor kartu atau rekening, PIN, atau kredensial.
    Mode "Sembunyikan nominal" hanya blur di layar, bukan enkripsi.

## Kunci penyimpanan lokal saat ini

Selama belum ada database, tiap tabel keuangan disimpan terpisah di localStorage (`pos:v1:` + kunci), lewat repo lokal
di `src/data/repos/index.ts`: `finance-accounts`, `finance-categories`, `finance-transactions`, `finance-budgets`,
`finance-goals`, `finance-recurring`. Setoran target (`goal_contributions`) saat ini tertanam di dokumen `goals` sebagai
larik `contributions`; saat pindah ke database, pisahkan menjadi tabel sendiri seperti di atas. Mode "Sembunyikan nominal"
memakai kunci `pos:finance-privacy`.
