import { isoDay } from '@/lib/date'
import type { LibraryItem, LibraryLog, LibraryQuote, NoteContent, NoteNode, SeedEntity } from '@/types/domain'

// Demo data. Every synopsis and note below is written for this app, not copied from any source, and there are no picture
// links: the shelf shows the typographic covers, which is also what a film or book without a cover looks like.

export const LIBRARY_IDS = {
  oppenheimer: 'lib-oppenheimer',
  pastLives: 'lib-past-lives',
  perfectDays: 'lib-perfect-days',
  spiritedAway: 'lib-spirited-away',
  zoneOfInterest: 'lib-zone-of-interest',
  bumiManusia: 'lib-bumi-manusia',
  sapiens: 'lib-sapiens',
  remains: 'lib-remains-of-the-day',
  cantikItuLuka: 'lib-cantik-itu-luka',
  laskarPelangi: 'lib-laskar-pelangi',
} as const

type Seed = SeedEntity<LibraryItem>
const film = (id: string, fields: Omit<Seed, 'id' | 'kind' | 'genres' | 'tags' | 'order'> & { genres: string[]; tags?: string[] }, order: number): Seed => ({
  id,
  kind: 'film',
  tags: [],
  order: order * 1000,
  ...fields,
})
const buku = (id: string, fields: Omit<Seed, 'id' | 'kind' | 'genres' | 'tags' | 'order'> & { genres: string[]; tags?: string[] }, order: number): Seed => ({
  id,
  kind: 'buku',
  tags: [],
  order: order * 1000,
  ...fields,
})

const para = (text: string): NoteNode => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const review = (...paragraphs: string[]): NoteContent => ({ type: 'doc', content: paragraphs.map(para) })

export const seedLibraryItems = (): Seed[] => [
  film(
    LIBRARY_IDS.oppenheimer,
    {
      title: 'Oppenheimer',
      year: 2023,
      status: 'done',
      rating: 9,
      favorite: true,
      accent: 'clay',
      finishedAt: '2023-08-14',
      runtimeMin: 180,
      director: 'Christopher Nolan',
      genres: ['Drama', 'Sejarah'],
      tags: ['biografi', 'bioskop'],
      synopsis:
        'Kisah fisikawan J. Robert Oppenheimer, dari ruang kuliah sampai gurun Los Alamos, ketika ia memimpin pembuatan bom atom. Film ini lebih banyak berbicara tentang apa yang terjadi sesudahnya: rasa bersalah, politik, dan sidang yang menguliti reputasinya.',
      cast: [
        { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer' },
        { name: 'Emily Blunt', character: 'Kitty Oppenheimer' },
        { name: 'Robert Downey Jr.', character: 'Lewis Strauss' },
        { name: 'Matt Damon', character: 'Leslie Groves' },
      ],
      crew: [
        { name: 'Christopher Nolan', job: 'Penulis' },
        { name: 'Hoyte van Hoytema', job: 'Sinematografi' },
        { name: 'Ludwig Göransson', job: 'Musik' },
      ],
      reviewHasSpoilers: false,
      review: review(
        'Tiga jam yang terasa pendek. Bagian yang paling menempel justru bukan ledakannya, melainkan keheningan sesaat sebelum suaranya sampai.',
        'Montase persidangan dan kilas balik berwarna-hitam-putih membuat cerita tidak pernah jadi biografi yang datar. Akting Murphy hampir seluruhnya di mata.',
      ),
      reviewExcerpt:
        'Tiga jam yang terasa pendek. Bagian yang paling menempel justru bukan ledakannya, melainkan keheningan sesaat sebelum suaranya sampai.',
    },
    1,
  ),
  film(
    LIBRARY_IDS.pastLives,
    {
      title: 'Past Lives',
      year: 2023,
      status: 'done',
      rating: 8,
      accent: 'teal',
      finishedAt: isoDay(-75),
      runtimeMin: 106,
      director: 'Celine Song',
      genres: ['Drama', 'Romansa'],
      synopsis: 'Dua teman masa kecil yang terpisah ketika salah satunya pindah negara bertemu lagi dua dekade kemudian. Tidak ada yang meledak; yang ada hanya hal-hal yang tidak sempat dikatakan.',
      cast: [
        { name: 'Greta Lee', character: 'Nora' },
        { name: 'Teo Yoo', character: 'Hae Sung' },
      ],
      crew: [{ name: 'Celine Song', job: 'Penulis' }],
    },
    2,
  ),
  film(
    LIBRARY_IDS.perfectDays,
    {
      title: 'Perfect Days',
      year: 2023,
      status: 'done',
      rating: 10,
      favorite: true,
      accent: 'moss',
      finishedAt: isoDay(-40),
      runtimeMin: 124,
      director: 'Wim Wenders',
      genres: ['Drama'],
      synopsis: 'Seorang pembersih toilet umum di Tokyo menjalani hari-hari yang nyaris sama: kaset lama, pohon kecil, buku bekas. Film tentang cukup, dan tentang apa yang terlihat kalau kita benar-benar memperhatikan.',
      cast: [
        { name: 'Koji Yakusho', character: 'Hirayama' },
        { name: 'Tokio Emoto', character: 'Takashi' },
      ],
      reviewHasSpoilers: false,
      review: review('Film yang membuat saya pelan-pelan di sisa hari itu. Adegan senyum di akhir layak ditonton ulang.'),
      reviewExcerpt: 'Film yang membuat saya pelan-pelan di sisa hari itu. Adegan senyum di akhir layak ditonton ulang.',
    },
    3,
  ),
  film(
    LIBRARY_IDS.spiritedAway,
    {
      title: 'Spirited Away',
      originalTitle: 'Sen to Chihiro no Kamikakushi',
      year: 2001,
      status: 'done',
      rating: 9,
      accent: 'ochre',
      finishedAt: isoDay(-200),
      runtimeMin: 125,
      director: 'Hayao Miyazaki',
      genres: ['Animasi', 'Fantasi'],
      synopsis: 'Seorang anak perempuan tersesat ke pemandian roh dan harus bekerja di sana agar bisa membawa orang tuanya pulang.',
    },
    4,
  ),
  film(
    LIBRARY_IDS.zoneOfInterest,
    {
      title: 'The Zone of Interest',
      year: 2023,
      status: 'planned',
      accent: 'slate',
      runtimeMin: 105,
      director: 'Jonathan Glazer',
      genres: ['Drama', 'Sejarah'],
      synopsis: 'Keluarga komandan kamp hidup tenang di rumah berkebun tepat di sebelah tembok.',
    },
    5,
  ),
  buku(
    LIBRARY_IDS.bumiManusia,
    {
      title: 'Bumi Manusia',
      year: 1980,
      status: 'active',
      accent: 'rosewood',
      authors: ['Pramoedya Ananta Toer'],
      pages: 535,
      currentPage: 212,
      publisher: 'Hasta Mitra',
      format: 'cetak',
      genres: ['Fiksi', 'Sejarah'],
      tags: ['klasik'],
      synopsis: 'Minke, pelajar pribumi di masa kolonial, jatuh cinta dan mulai melihat betapa timpang aturan yang membungkus hidupnya.',
    },
    1,
  ),
  buku(
    LIBRARY_IDS.sapiens,
    {
      title: 'Sapiens',
      year: 2011,
      status: 'done',
      rating: 7,
      accent: 'ochre',
      finishedAt: isoDay(-110),
      authors: ['Yuval Noah Harari'],
      pages: 443,
      currentPage: 443,
      format: 'ebook',
      genres: ['Nonfiksi', 'Sejarah'],
      synopsis: 'Sejarah manusia dalam satu tarikan napas: dari kemampuan bercerita bersama sampai uang dan negara.',
      reviewHasSpoilers: false,
      review: review('Enak dibaca dan memancing banyak pertanyaan, tetapi beberapa kesimpulannya terlalu rapi untuk bahan yang serumit itu.'),
      reviewExcerpt: 'Enak dibaca dan memancing banyak pertanyaan, tetapi beberapa kesimpulannya terlalu rapi untuk bahan yang serumit itu.',
    },
    2,
  ),
  buku(
    LIBRARY_IDS.remains,
    {
      title: 'The Remains of the Day',
      year: 1989,
      status: 'done',
      rating: 10,
      favorite: true,
      accent: 'slate',
      finishedAt: isoDay(-20),
      authors: ['Kazuo Ishiguro'],
      pages: 258,
      currentPage: 258,
      format: 'cetak',
      genres: ['Fiksi', 'Klasik modern'],
      synopsis: 'Seorang kepala pelayan menyetir sendirian melintasi Inggris dan, sepanjang jalan, menghitung ulang kesetiaan yang ia kira tidak perlu dipertanyakan.',
      reviewHasSpoilers: true,
      review: review('Buku yang paling banyak mengajari saya cara membaca apa yang tidak dikatakan narator. Baca pelan, jangan terburu-buru ke akhir.', 'Kesedihannya baru terasa beberapa hari setelah selesai.'),
      reviewExcerpt: 'Buku yang paling banyak mengajari saya cara membaca apa yang tidak dikatakan narator. Baca pelan, jangan terburu-buru ke akhir.',
    },
    3,
  ),
  buku(
    LIBRARY_IDS.cantikItuLuka,
    {
      title: 'Cantik Itu Luka',
      year: 2002,
      status: 'planned',
      accent: 'clay',
      authors: ['Eka Kurniawan'],
      pages: 520,
      format: 'cetak',
      genres: ['Fiksi'],
      synopsis: 'Saga keluarga di sebuah kota pesisir, bermula dari seorang perempuan yang bangkit dari kubur.',
    },
    4,
  ),
  buku(
    LIBRARY_IDS.laskarPelangi,
    {
      title: 'Laskar Pelangi',
      year: 2005,
      status: 'dropped',
      accent: 'moss',
      authors: ['Andrea Hirata'],
      pages: 529,
      currentPage: 90,
      format: 'cetak',
      genres: ['Fiksi'],
      synopsis: 'Sepuluh murid sekolah dasar di Belitung dan guru-guru yang bertahan di sekolah nyaris roboh.',
    },
    5,
  ),
]

export const seedLibraryLogs = (): SeedEntity<LibraryLog>[] => [
  { itemId: LIBRARY_IDS.oppenheimer, date: '2023-08-14', place: 'Bioskop', withWhom: 'Rani' },
  { itemId: LIBRARY_IDS.oppenheimer, date: isoDay(-120), place: 'Di rumah', withWhom: 'Sendiri' },
  { itemId: LIBRARY_IDS.perfectDays, date: isoDay(-40), place: 'Bioskop', withWhom: 'Sendiri' },
  { itemId: LIBRARY_IDS.bumiManusia, date: isoDay(-9), fromPage: 150, toPage: 180, minutes: 45 },
  { itemId: LIBRARY_IDS.bumiManusia, date: isoDay(-3), fromPage: 180, toPage: 212, minutes: 50 },
]

export const seedLibraryQuotes = (): SeedEntity<LibraryQuote>[] => [
  { itemId: LIBRARY_IDS.oppenheimer, text: 'Adegan uji coba Trinity: hening dulu, suaranya menyusul belakangan.', locator: '1:58:00', comment: 'Pilihan paling berani di seluruh film.' },
  { itemId: LIBRARY_IDS.oppenheimer, text: 'Ruang sidang yang makin sempit di sekeliling Oppenheimer.', locator: '2:30:00' },
  { itemId: LIBRARY_IDS.remains, text: 'Percakapan di bangku tepi laut menjelang akhir.', locator: 'hlm. 240', comment: 'Bagian yang baru kena dua hari kemudian.' },
]
