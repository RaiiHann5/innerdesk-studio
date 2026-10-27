import { isoDay } from '@/lib/date'
import { ORDER_STEP } from '@/lib/reorder'
import type { SeedEntity, Task } from '@/types/domain'
import { PROJECT_IDS as P } from './projects'

type Optional = 'timeLog' | 'noteCount' | 'tags' | 'focusCount' | 'subtasks' | 'order'
type Draft = Omit<SeedEntity<Task>, Optional> & Partial<Pick<Task, Optional>>

/** Tasks a focus session can be attributed to. Fixed ids so the seeded sessions can point at them. */
export const TASK_IDS = {
  situsAlur: 'TSK-alur',
  situsForm: 'TSK-form',
  situsSurat: 'TSK-surat',
  portofolioKerangka: 'TSK-kerangka',
  inggrisRiset: 'TSK-riset',
  batikGateway: 'TSK-gateway',
  batikCheckout: 'TSK-checkout',
  laravelQueue: 'TSK-queue',
} as const

/** Subtasks from titles, the first `doneCount` already ticked. Ids are stable so reloads do not reshuffle them. */
const subs = (prefix: string, doneCount: number, ...titles: string[]) =>
  titles.map((title, i) => ({ id: `${prefix}-${i + 1}`, title, done: i < doneCount }))

const log = (...minutesByDaysAgo: number[]) =>
  minutesByDaysAgo.map((minutes, i) => ({ date: isoDay(-i), minutes })).filter((e) => e.minutes > 0)

const drafts: Draft[] = [
  { id: TASK_IDS.situsAlur, title: 'Rancang alur verifikasi dokumen berjenjang', description: 'Petugas desa, lalu kecamatan. Tentukan status dan notifikasi di tiap tahap.', status: 'doing', priority: 'urgent', projectId: P.situs, dueDate: isoDay(2), dueTime: '16:00', tags: ['backend', 'alur'], noteCount: 3, timeLog: log(150, 120, 90, 0, 60), estimateMinutes: 600, subtasks: subs('alur', 3, 'Petakan peran petugas desa dan kecamatan', 'Tentukan status di tiap tahap', 'Rancang notifikasi ke warga', 'Tulis diagram alur', 'Review dengan pihak kecamatan') },
  { id: TASK_IDS.situsForm, title: 'Buat form unggah berkas dengan validasi ukuran', status: 'doing', priority: 'high', projectId: P.situs, dueDate: isoDay(4), dueTime: '15:30', tags: ['frontend'], noteCount: 1, timeLog: log(95, 0, 45), estimateMinutes: 240, subtasks: subs('form', 1, 'Komponen pilih berkas', 'Validasi ukuran maksimal 2 MB', 'Pesan galat yang jelas') },
  { id: TASK_IDS.situsSurat, title: 'Tulis kebijakan akses per peran', status: 'todo', priority: 'high', projectId: P.situs, dueDate: isoDay(6), dueTime: '10:00', tags: ['keamanan'], estimateMinutes: 90 },
  { title: 'Uji coba dengan dua petugas kecamatan', status: 'todo', priority: 'medium', projectId: P.situs, dueDate: isoDay(14), tags: ['uji coba'], estimateMinutes: 180, subtasks: subs('uji', 0, 'Jadwalkan dengan dua petugas', 'Siapkan skenario uji', 'Catat temuan') },
  { title: 'Tentukan format nomor surat otomatis', status: 'review', priority: 'medium', projectId: P.situs, dueDate: isoDay(1), tags: ['backend'], noteCount: 2, timeLog: log(0, 70, 40) },
  { title: 'Siapkan seed data wilayah', status: 'done', priority: 'low', projectId: P.situs, tags: ['data'], completedAt: isoDay(-3), timeLog: log(0, 0, 0, 80) },
  { id: TASK_IDS.portofolioKerangka, title: 'Susun kerangka halaman studi kasus', status: 'doing', priority: 'high', projectId: P.portofolio, dueDate: isoDay(5), tags: ['desain'], noteCount: 2, timeLog: log(60, 85, 0, 110), estimateMinutes: 300, subtasks: subs('kerangka', 2, 'Tentukan alur cerita tiap studi kasus', 'Gambar kerangka kasar', 'Uji dengan satu teman', 'Rapikan di Figma') },
  { title: 'Pilih tiga proyek untuk ditampilkan', status: 'review', priority: 'medium', projectId: P.portofolio, dueDate: isoDay(3), tags: ['konten'] },
  { title: 'Tulis ulang bagian tentang saya', status: 'todo', priority: 'low', projectId: P.portofolio, dueDate: isoDay(18), tags: ['konten'] },
  { title: 'Optimalkan gambar hero di perangkat mobile', status: 'todo', priority: 'medium', projectId: P.portofolio, dueDate: isoDay(-1), tags: ['performa'] },
  { id: TASK_IDS.inggrisRiset, title: 'Riset tiga aplikasi belajar bahasa sebagai pembanding', status: 'doing', priority: 'medium', projectId: P.inggris, dueDate: isoDay(7), tags: ['riset'], noteCount: 4, timeLog: log(0, 55, 0, 0, 35), estimateMinutes: 180, subtasks: subs('riset', 1, 'Pilih tiga aplikasi', 'Catat fitur dan harga', 'Tulis kesimpulan') },
  { title: 'Rancang model data kartu kosakata', status: 'todo', priority: 'medium', projectId: P.inggris, dueDate: isoDay(12), tags: ['backend'] },
  { title: 'Wawancara dua teman tentang kebiasaan belajar', status: 'todo', priority: 'low', projectId: P.inggris, dueDate: isoDay(10), tags: ['riset'] },
  { id: TASK_IDS.batikGateway, title: 'Pasang gateway pembayaran mode produksi', status: 'doing', priority: 'urgent', projectId: P.batik, dueDate: isoDay(0), dueTime: '14:00', tags: ['pembayaran'], noteCount: 2, timeLog: log(135, 100, 75, 60), estimateMinutes: 360, subtasks: subs('gateway', 2, 'Ganti kunci API ke mode produksi', 'Daftarkan alamat webhook', 'Tes pembayaran dengan nominal kecil', 'Aktifkan notifikasi gagal bayar') },
  { id: TASK_IDS.batikCheckout, title: 'Tes checkout di tiga ukuran layar', status: 'review', priority: 'high', projectId: P.batik, dueDate: isoDay(3), tags: ['uji coba'], timeLog: log(0, 50) },
  { title: 'Kirim panduan pengelolaan produk ke klien', status: 'todo', priority: 'medium', projectId: P.batik, dueDate: isoDay(7), tags: ['dokumen'] },
  { title: 'Atur backup basis data harian', status: 'done', priority: 'high', projectId: P.batik, tags: ['server'], completedAt: isoDay(-2), timeLog: log(0, 0, 65) },
  { title: 'Foto produk dari klien sudah dikompres', status: 'done', priority: 'low', projectId: P.batik, tags: ['konten'], completedAt: isoDay(-5) },
  { id: TASK_IDS.laravelQueue, title: 'Selesaikan modul queue dan job', status: 'todo', priority: 'medium', projectId: P.laravel, tags: ['belajar'], estimateMinutes: 150 },
  { title: 'Perpanjang domain pribadi', status: 'todo', priority: 'urgent', dueDate: isoDay(-2), tags: ['administrasi'] },
  { title: 'Rapikan folder desain lama', status: 'todo', priority: 'low', tags: ['administrasi'] },
  { title: 'Latihan kosakata 15 menit', status: 'todo', priority: 'low', projectId: P.inggris, dueDate: isoDay(0), tags: ['rutin'], estimateMinutes: 15, recurrence: { freq: 'daily', interval: 1 } },
  { title: 'Cadangkan berkas proyek ke penyimpanan awan', status: 'todo', priority: 'medium', dueDate: isoDay(3), tags: ['administrasi'], estimateMinutes: 20, recurrence: { freq: 'weekly', interval: 1 } },
  { title: 'Bayar langganan hosting', status: 'todo', priority: 'high', projectId: P.batik, dueDate: isoDay(12), tags: ['administrasi'], recurrence: { freq: 'monthly', interval: 1 } },
  { title: 'Pilih nama domain portofolio', status: 'done', priority: 'low', projectId: P.portofolio, tags: ['administrasi'], completedAt: isoDay(-14), archivedAt: new Date(Date.now() - 10 * 86_400_000).toISOString() },
]

/** Position inside the status column follows the order written above, in steps of ORDER_STEP. */
export const seedTasks = (): SeedEntity<Task>[] => {
  const placed: Record<string, number> = {}
  return drafts.map((d) => {
    placed[d.status] = (placed[d.status] ?? 0) + 1
    return { tags: [], noteCount: 0, timeLog: [], focusCount: 0, subtasks: [], order: placed[d.status] * ORDER_STEP, ...d }
  })
}
