import { isoDay } from '@/lib/date'
import { checklist, doc, excerptOf, paragraph, quote } from '@/lib/editorDoc'
import type { EditorDoc, JournalEntry, SeedEntity } from '@/types/domain'

const entry = (offset: number, content: EditorDoc, title?: string): SeedEntity<JournalEntry> => ({
  date: isoDay(offset),
  title,
  content,
  excerpt: excerptOf(content),
})

export const seedJournal = (): SeedEntity<JournalEntry>[] => [
  entry(
    -1,
    doc(
      paragraph('Hari yang penuh rapat. Dari pagi sampai sore hampir tidak ada jeda untuk mengerjakan hal yang benar-benar penting.'),
      paragraph('Satu hal yang membantu: menulis tiga baris prioritas sebelum buka laptop. Dua dari tiga selesai, yang ketiga digeser ke besok tanpa drama.'),
      checklist([
        ['Balas revisi halaman checkout', true],
        ['Rapikan catatan rapat klien', true],
        ['Siapkan bahan demo hari Kamis', false],
      ]),
    ),
    'Banyak rapat, tetap ada yang selesai',
  ),
  entry(
    -3,
    doc(
      paragraph('Akhirnya tenggat aman. Badan capek, tapi kepala lebih ringan dari seminggu terakhir.'),
      paragraph('Malam ini mau tidur lebih awal dan tidak membuka email kerja sama sekali.'),
    ),
  ),
  entry(
    -6,
    doc(
      paragraph('Sore ini jalan kaki keliling kompleks sambil mendengarkan podcast. Tidak ada tujuan, tidak ada target langkah.'),
      quote('Pekerjaan yang baik butuh jarak sesekali, supaya masalahnya terlihat dari sudut yang lain.'),
      paragraph('Kalimat itu dari buku yang sedang kubaca. Kutulis di sini supaya ingat waktu mulai terlalu dekat dengan masalah.'),
    ),
    'Jalan sore tanpa target',
  ),
  entry(
    -10,
    doc(
      paragraph('Demo ke klien berjalan lancar. Fitur utama jalan dari awal sampai akhir dan mereka tidak punya banyak keberatan.'),
      paragraph('Yang paling kuingat: pertanyaan paling tajam datang dari orang yang paling pendiam di ruangan. Lain kali beri ruang bicara untuknya lebih awal.'),
      checklist([
        ['Kirim ringkasan demo ke klien', true],
        ['Catat tiga masukan yang muncul', true],
        ['Jadwalkan sesi lanjutan', true],
      ]),
    ),
    'Demo klien',
  ),
  entry(
    -14,
    doc(
      paragraph('Tidur kurang dari lima jam karena menunggu build yang gagal terus. Pagi ini semua terasa lambat.'),
      paragraph('Sudah kuputuskan: pekerjaan yang dikejar lewat tengah malam hampir selalu dikerjakan ulang esok harinya.'),
    ),
  ),
  entry(
    -21,
    doc(
      paragraph('Libur. Sarapan bareng teman lama di warung dekat pasar, lalu jalan kaki ke taman. Ngobrolnya lama sekali dan tidak ada yang melihat jam.'),
      paragraph('Aku lupa kapan terakhir kali duduk selama itu tanpa membuka ponsel.'),
    ),
    'Libur yang pelan',
  ),
  entry(
    -26,
    doc(
      paragraph('Revisi klien datang jam sembilan malam dan minta selesai besok pagi. Kukerjakan sampai lewat tengah malam.'),
      quote('Mendesak bagi orang lain belum tentu mendesak bagiku.'),
      paragraph('Perlu bicara soal batas jam revisi di awal proyek berikutnya, bukan setelah kejadian.'),
    ),
    'Revisi larut malam',
  ),
]
