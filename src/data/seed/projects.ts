import { isoDay } from '@/lib/date'
import type { Project, SeedEntity } from '@/types/domain'

export const PROJECT_IDS = {
  situs: 'prj-situs-layanan',
  portofolio: 'prj-portofolio',
  inggris: 'prj-belajar-inggris',
  batik: 'prj-toko-batik',
  laravel: 'prj-sertifikasi-laravel',
} as const

export const seedProjects = (): SeedEntity<Project>[] => [
  {
    id: PROJECT_IDS.situs,
    name: 'Situs layanan kecamatan',
    description: 'Sistem pengajuan dokumen warga dengan verifikasi berjenjang oleh petugas.',
    status: 'active',
    phase: 'pengembangan',
    deadline: isoDay(21),
    color: 'slate',
    startDate: isoDay(-40),
    goal: 'Warga mengajukan surat tanpa datang ke kantor, dan petugas memverifikasi dalam satu hari kerja.',
    milestones: [
      { id: 'ms-situs-desain', title: 'Alur verifikasi disetujui pihak kecamatan', dueDate: isoDay(-12), done: true },
      { id: 'ms-situs-form', title: 'Form pengajuan dan unggah berkas selesai', dueDate: isoDay(5), done: false },
      { id: 'ms-situs-uji', title: 'Uji coba dengan petugas kecamatan', dueDate: isoDay(14), done: false },
      { id: 'ms-situs-rilis', title: 'Rilis ke seluruh kelurahan', dueDate: isoDay(21), done: false },
    ],
    links: [
      { id: 'lnk-situs-repo', title: 'Repositori kode', url: 'https://github.com/innerdesk/situs-layanan', kind: 'dokumen' },
      { id: 'lnk-situs-spec', title: 'Dokumen kebutuhan dari kecamatan', url: 'https://docs.google.com/document/d/situs-layanan-kebutuhan', kind: 'dokumen' },
      { id: 'lnk-situs-figma', title: 'Rancangan layar petugas', url: 'https://www.figma.com/file/situs-layanan', kind: 'desain' },
      { id: 'lnk-situs-hosting', title: 'Panel hosting', url: 'https://panel.hosting-lokal.example/situs-layanan', kind: 'akun' },
    ],
  },
  {
    id: PROJECT_IDS.portofolio,
    name: 'Portofolio pribadi 2026',
    description: 'Situs portofolio baru dengan studi kasus dan halaman proses kerja.',
    status: 'active',
    phase: 'desain',
    deadline: isoDay(35),
    color: 'clay',
    startDate: isoDay(-20),
    goal: 'Tiga studi kasus yang menunjukkan cara berpikir, bukan hanya hasil akhir.',
    milestones: [
      { id: 'ms-porto-riset', title: 'Riset referensi portofolio selesai', dueDate: isoDay(-10), done: true },
      { id: 'ms-porto-wire', title: 'Wireframe semua halaman', dueDate: isoDay(8), done: false },
      { id: 'ms-porto-konten', title: 'Naskah tiga studi kasus siap', dueDate: isoDay(24), done: false },
    ],
    links: [
      { id: 'lnk-porto-figma', title: 'Berkas desain portofolio', url: 'https://www.figma.com/file/portofolio-2026', kind: 'desain' },
      { id: 'lnk-porto-ref', title: 'Kumpulan referensi', url: 'https://www.notion.so/referensi-portofolio', kind: 'lainnya' },
    ],
  },
  {
    id: PROJECT_IDS.inggris,
    name: 'Platform belajar bahasa Inggris',
    description: 'Latihan kosakata dan grammar harian dengan pelacak progres.',
    status: 'active',
    phase: 'riset',
    deadline: isoDay(60),
    color: 'teal',
    startDate: isoDay(-5),
    goal: 'Prototipe latihan kosakata yang bisa dipakai lima menit sehari.',
    milestones: [
      { id: 'ms-ing-banding', title: 'Perbandingan tiga aplikasi', dueDate: isoDay(7), done: false },
      { id: 'ms-ing-wawancara', title: 'Wawancara dua pengguna', done: false },
    ],
    links: [{ id: 'lnk-ing-ref', title: 'Daftar aplikasi pembanding', url: 'https://docs.google.com/spreadsheets/d/banding-aplikasi', kind: 'dokumen' }],
  },
  {
    id: PROJECT_IDS.batik,
    name: 'Toko online Batik Nusantara',
    description: 'Katalog produk, keranjang, dan checkout untuk klien UMKM.',
    status: 'active',
    phase: 'peluncuran',
    deadline: isoDay(9),
    color: 'ochre',
    startDate: isoDay(-60),
    goal: 'Toko siap menerima pesanan pertama dengan pembayaran dan pengiriman yang berfungsi.',
    milestones: [
      { id: 'ms-batik-katalog', title: 'Katalog 40 produk terunggah', dueDate: isoDay(-30), done: true },
      { id: 'ms-batik-bayar', title: 'Pembayaran produksi aktif', dueDate: isoDay(0), done: false },
      { id: 'ms-batik-launch', title: 'Toko dibuka untuk umum', dueDate: isoDay(9), done: false },
    ],
    links: [
      { id: 'lnk-batik-admin', title: 'Dasbor admin toko', url: 'https://batiknusantara.example/admin', kind: 'akun' },
      { id: 'lnk-batik-panduan', title: 'Panduan pengelolaan produk', url: 'https://docs.google.com/document/d/panduan-produk-batik', kind: 'dokumen' },
    ],
  },
  {
    id: PROJECT_IDS.laravel,
    name: 'Belajar Laravel lanjutan',
    description: 'Queue, policy, testing, dan arsitektur modular.',
    status: 'paused',
    phase: 'riset',
    color: 'rosewood',
    milestones: [],
    links: [],
  },
]
