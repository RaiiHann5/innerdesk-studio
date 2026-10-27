import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import type { CalendarEvent, SeedEntity } from '@/types/domain'
import { CATEGORY_IDS as C } from './categories'
import { PROJECT_IDS as P } from './projects'

const day = (offset: number) => startOfDay(addDays(new Date(), offset))
const at = (offset: number, hour: number, minute = 0) => setMinutes(setHours(day(offset), hour), minute).toISOString()

type Draft = Omit<SeedEntity<CalendarEvent>, 'allDay' | 'reminders'> & Partial<Pick<CalendarEvent, 'allDay' | 'reminders'>>

const timed = (offset: number, from: [number, number?], to: [number, number?]) => ({
  start: at(offset, from[0], from[1]),
  end: at(offset, to[0], to[1]),
})
const allDay = (offset: number, days = 1) => ({
  start: day(offset).toISOString(),
  end: day(offset + days).toISOString(),
  allDay: true,
})

const drafts: Draft[] = [
  // Hari ini: dua rapat dan sesi fokus yang saling tumpang tindih
  { title: 'Rapat kemajuan dengan klien Batik Nusantara', ...timed(0, [10], [11]), categoryId: C.kerja, link: 'https://meet.google.com/abc-defg-hij', projectId: P.batik, reminders: [10] },
  { title: 'Sesi fokus: alur verifikasi', ...timed(0, [13, 30], [16]), categoryId: C.kerja, projectId: P.situs },
  { title: 'Sinkronisasi singkat tim pengembang', ...timed(0, [14], [14, 45]), categoryId: C.kerja, link: 'https://meet.google.com/kxp-mnqr-tsv', projectId: P.situs, reminders: [10] },
  { title: 'Latihan speaking 30 menit', ...timed(0, [19, 30], [20]), categoryId: C.belajar, projectId: P.inggris },

  // Besok dan lusa
  { title: 'Uji coba dengan petugas kecamatan', ...timed(1, [9], [11, 30]), categoryId: C.kerja, location: 'Kantor kecamatan', projectId: P.situs, reminders: [60] },
  { title: 'Telepon singkat dengan klien', ...timed(1, [10], [10, 45]), categoryId: C.kerja, link: 'https://meet.google.com/rtw-hxcv-dnk', projectId: P.batik },
  { title: 'Futsal bersama teman kuliah', ...timed(2, [19], [21]), categoryId: C.olahraga, location: 'Lapangan futsal dekat rumah' },

  // Tiga event berantai: A-B dan B-C tumpang tindih, A-C tidak
  { title: 'Review desain portofolio', ...timed(3, [14], [15, 30]), categoryId: C.kerja, projectId: P.portofolio },
  { title: 'Latihan presentasi studi kasus', ...timed(3, [15], [16]), categoryId: C.kerja, projectId: P.portofolio },
  { title: 'Baca dokumentasi queue Laravel', ...timed(3, [15, 30], [17]), categoryId: C.belajar, projectId: P.laravel },

  { title: 'Sesi fokus: halaman studi kasus', ...timed(4, [9], [12]), categoryId: C.kerja, projectId: P.portofolio },
  { title: 'Webinar arsitektur Laravel', ...timed(5, [20], [21, 30]), categoryId: C.belajar, link: 'https://zoom.us/j/8421907365', projectId: P.laravel, reminders: [60] },
  { title: 'Makan malam keluarga', ...timed(6, [18, 30], [20, 30]), categoryId: C.keluarga, location: 'Rumah makan Padang dekat rumah' },
  { title: 'Tenggat peluncuran toko online', ...timed(9, [9], [10]), categoryId: C.kerja, projectId: P.batik, reminders: [1440] },
  { title: 'Sesi fokus: dokumentasi toko online', ...timed(11, [10], [12]), categoryId: C.kerja, projectId: P.batik },

  // Seharian dan lintas hari
  { title: 'Hari tenang tanpa rapat', ...allDay(3), categoryId: C.pribadi },
  { title: 'Perjalanan ke Yogyakarta', ...allDay(12, 3), categoryId: C.perjalanan, location: 'Yogyakarta', description: 'Menemui klien batik dan mengunjungi pengrajin.', reminders: [1440] },
  { title: 'Ulang tahun Ibu', ...allDay(9), categoryId: C.keluarga, recurrence: { freq: 'yearly', exceptions: [] }, reminders: [1440] },
  { title: 'Bayar tagihan listrik', ...allDay(-14), categoryId: C.pribadi, recurrence: { freq: 'monthly', exceptions: [] } },

  // Berulang
  { title: 'Lari pagi', ...timed(-26, [6], [7]), categoryId: C.olahraga, location: 'Lapangan kelurahan', recurrence: { freq: 'weekly', exceptions: [] } },
  { title: 'Telepon keluarga di kampung', ...timed(-20, [19], [19, 45]), categoryId: C.keluarga, recurrence: { freq: 'weekly', exceptions: [] } },

  // Bulan lalu dan bulan depan
  { title: 'Cek kesehatan rutin', ...timed(-33, [8], [9]), categoryId: C.pribadi, location: 'Puskesmas' },
  { title: 'Bimbingan dengan dosen pembimbing', ...timed(-6, [15], [16]), categoryId: C.belajar, link: 'https://meet.google.com/pbm-wdfe-rzh' },
  { title: 'Sesi fokus: form unggah berkas', ...timed(-2, [9], [11, 30]), categoryId: C.kerja, projectId: P.situs },
  { title: 'Sesi fokus: checkout toko online', ...timed(-9, [13], [15, 30]), categoryId: C.kerja, projectId: P.batik },
  { title: 'Rapat evaluasi bulanan', ...timed(17, [10], [11, 30]), categoryId: C.kerja, link: 'https://meet.google.com/evl-bnln-qpa', reminders: [10] },
  { title: 'Workshop desain antarmuka di Bandung', ...timed(28, [10], [16]), categoryId: C.belajar, location: 'Bandung', reminders: [1440] },
  { title: 'Futsal bersama teman kuliah', ...timed(33, [19], [21]), categoryId: C.olahraga, location: 'Lapangan futsal dekat rumah' },
]

export const seedEvents = (): SeedEntity<CalendarEvent>[] =>
  drafts.map((d) => ({ allDay: false, reminders: [], ...d }))
