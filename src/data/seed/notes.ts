import { excerptFromContent } from '@/features/notes/lib/excerpt'
import type { Note, NoteContent, NoteNode, SeedEntity } from '@/types/domain'
import { PROJECT_IDS as P } from './projects'

// Node builders. The type names match the editor's schema, so a seed loads into it as is.
const text = (value: string): NoteNode => ({ type: 'text', text: value })
const para = (value: string): NoteNode => ({ type: 'paragraph', content: [text(value)] })
const heading = (level: 2 | 3, value: string): NoteNode => ({ type: 'heading', attrs: { level }, content: [text(value)] })
const quote = (value: string): NoteNode => ({ type: 'blockquote', content: [para(value)] })
const items = (list: string[]): NoteNode[] => list.map((value) => ({ type: 'listItem', content: [para(value)] }))
const bullets = (...list: string[]): NoteNode => ({ type: 'bulletList', content: items(list) })
const numbered = (...list: string[]): NoteNode => ({ type: 'orderedList', content: items(list) })
const checklist = (...list: Array<[value: string, checked: boolean]>): NoteNode => ({
  type: 'taskList',
  content: list.map(([value, checked]) => ({ type: 'taskItem', attrs: { checked }, content: [para(value)] })),
})
const doc = (...content: NoteNode[]): NoteContent => ({ type: 'doc', content })

/** Minutes in a day: seeds express their age in minutes. */
const DAY = 24 * 60
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

interface Draft extends Pick<Note, 'title' | 'tags' | 'pinned' | 'projectId'> {
  content: NoteContent
  /** Minutes since the note was created and since it was last edited. */
  created: number
  edited: number
}

const note = ({ created, edited, content, ...rest }: Draft): SeedEntity<Note> => ({
  ...rest,
  content,
  excerpt: excerptFromContent(content),
  createdAt: ago(created),
  updatedAt: ago(edited),
})

export const seedNotes = (): SeedEntity<Note>[] => [
  note({
    title: 'Prinsip desain untuk antarmuka produktivitas',
    tags: ['desain', 'prinsip'],
    pinned: true,
    created: 28 * DAY,
    edited: 95,
    content: doc(
      para('Pegangan saat memutuskan tampilan. Kalau sebuah elemen tidak membantu menyelesaikan sesuatu, elemen itu dibuang.'),
      bullets(
        'Satu warna aksen, hanya untuk hal yang sedang aktif atau butuh tindakan.',
        'Garis tipis 1px sebagai pemisah, bukan bayangan tebal.',
        'Teks pendek dan langsung, tanpa kata pengantar.',
        'Setiap layar punya satu tindakan utama.',
        'Cek kontras di tema terang dan gelap sebelum merasa selesai.',
      ),
    ),
  }),
  note({
    title: 'Catatan rapat dengan klien Batik Nusantara',
    tags: ['klien', 'rapat'],
    pinned: true,
    projectId: P.batik,
    created: 9 * DAY,
    edited: 310,
    content: doc(
      para('Klien ingin ongkir dihitung otomatis per kota. Pembayaran lewat transfer virtual dan dompet digital. Peluncuran tidak boleh melewati akhir bulan.'),
      heading(3, 'Tindak lanjut'),
      checklist(
        ['Kirim estimasi biaya integrasi ongkir', false],
        ['Minta foto produk baru, dijanjikan hari Kamis', false],
        ['Konfirmasi pilihan penyedia pembayaran', true],
      ),
    ),
  }),
  note({
    title: 'Keputusan arsitektur verifikasi dokumen',
    tags: ['arsitektur', 'backend'],
    pinned: true,
    projectId: P.situs,
    created: 12 * DAY,
    edited: 1500,
    content: doc(
      para('Status dokumen disimpan sebagai riwayat, bukan satu kolom. Setiap perubahan mencatat petugas, waktu, dan catatan penolakan.'),
      para('Dengan begitu warga bisa melihat posisi berkas mereka tanpa query rumit, dan petugas punya jejak audit tanpa tabel tambahan.'),
    ),
  }),
  note({
    title: 'Rapat mingguan kecamatan: tindak lanjut',
    tags: ['rapat', 'tindak-lanjut'],
    pinned: false,
    projectId: P.situs,
    created: 3 * DAY,
    edited: 2900,
    content: doc(
      para('Petugas loket minta halaman daftar berkas bisa difilter per jenis layanan. Kepala seksi ingin laporan bulanan dalam format spreadsheet.'),
      checklist(
        ['Tambah filter jenis layanan di daftar berkas', false],
        ['Rancang ekspor laporan bulanan', false],
        ['Jadwalkan uji coba dengan dua petugas loket', false],
      ),
    ),
  }),
  note({
    title: 'Pola belajar yang berhasil minggu ini',
    tags: ['belajar', 'kebiasaan'],
    pinned: false,
    projectId: P.inggris,
    created: 6 * DAY,
    edited: 4300,
    content: doc(
      para('Dua sesi pendek 25 menit di pagi hari lebih efektif daripada satu sesi panjang di malam hari.'),
      para('Catat kosakata baru langsung di kartu, jangan menunggu akhir sesi.'),
    ),
  }),
  note({
    title: 'Ide fitur: ringkasan mingguan otomatis',
    tags: ['ide', 'review'],
    pinned: false,
    created: 5 * DAY,
    edited: 5800,
    content: doc(
      para('Setiap Minggu sore tampilkan task selesai, jam fokus, dan tiga hal yang tertunda paling lama. Cukup satu layar, tanpa grafik berlebihan.'),
      quote('Ringkasan yang tidak dibaca lebih buruk daripada tidak ada ringkasan.'),
    ),
  }),
  note({
    title: 'Referensi tipografi untuk portofolio',
    tags: ['desain', 'riset'],
    pinned: false,
    projectId: P.portofolio,
    created: 20 * DAY,
    edited: 11_000,
    content: doc(
      para('Kombinasi grotesk geometris untuk judul dan grotesk netral untuk teks. Hindari lebih dari dua keluarga huruf.'),
      para('Cek keterbacaan di layar kecil sebelum memilih bobot.'),
    ),
  }),
  note({
    title: 'Daftar pengecekan sebelum rilis',
    tags: ['rilis', 'checklist'],
    pinned: false,
    created: 25 * DAY,
    edited: 20_000,
    content: doc(
      checklist(
        ['Variabel lingkungan produksi', true],
        ['Redirect HTTPS', true],
        ['Halaman 404', true],
        ['Sitemap dan tag meta', false],
        ['Kecepatan di jaringan lambat', false],
        ['Uji formulir kontak dengan email sungguhan', false],
      ),
    ),
  }),
  note({
    title: 'Pertanyaan untuk tinjauan mingguan',
    tags: ['review', 'kebiasaan'],
    pinned: false,
    created: 40 * DAY,
    edited: 30_000,
    content: doc(
      numbered(
        'Apa tiga hal yang selesai dan paling berarti minggu ini?',
        'Apa yang tertunda lebih dari dua minggu, dan kenapa?',
        'Kapan fokusku paling baik, dan apa yang membuatnya begitu?',
        'Satu hal yang akan kuhentikan minggu depan.',
      ),
    ),
  }),
  note({
    title: 'Ide proyek: pelacak tagihan untuk klien kecil',
    tags: ['ide', 'proyek'],
    pinned: false,
    created: 60 * DAY,
    edited: 60_000,
    content: doc(
      para('Banyak klien UMKM mencatat tagihan di chat dan lupa menagih. Aplikasi sederhana yang mengirim pengingat lewat WhatsApp mungkin cukup.'),
      bullets('Daftar tagihan dengan status belum dibayar, jatuh tempo, dan lunas.', 'Pengingat otomatis sehari sebelum jatuh tempo.', 'Satu halaman ringkasan piutang per bulan.'),
    ),
  }),
]
