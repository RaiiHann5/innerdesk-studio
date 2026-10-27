import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-1.5">
    <h3 className="text-sm font-medium">{title}</h3>
    {children}
  </section>
)
const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
)

/**
 * The threat model, in plain language. The same limits are written in src/lib/crypto/index.ts and
 * docs/vault-security.md; change all three together. It must never claim the vault is unhackable.
 */
export function HowItWorks() {
  return (
    <div className="space-y-5">
      <Section title="Cara kerjanya">
        <p className="text-sm text-muted">
          Kata sandi utamamu diubah menjadi kunci dengan PBKDF2 (600.000 putaran, sengaja lambat). Kunci itu hanya membungkus sebuah kunci vault acak. Setiap item dienkripsi dengan kunci vault itu memakai AES-256-GCM, dengan IV acak baru di setiap penyimpanan. Semuanya terjadi di perangkat ini dengan fitur kriptografi bawaan peramban, tanpa server dan tanpa pustaka tambahan. Yang tersimpan hanyalah data terenkripsi.
        </p>
      </Section>

      <Section title="Yang dilindungi">
        <List
          items={[
            'Orang yang membaca penyimpanan peramban atau salinan database: yang terlihat hanya data terenkripsi.',
            'Backup yang bocor: file backup tidak bisa dibuka tanpa kata sandi utama (atau kunci pemulihan).',
            'Orang yang sebentar memegang layar yang tampak terbuka: vault terkunci otomatis dan semua rahasia disamarkan sampai ditampilkan.',
          ]}
        />
      </Section>

      <Section title="Yang tidak dilindungi">
        <List
          items={[
            'Malware atau keylogger di perangkat ini. Apa yang kamu ketik atau lihat bisa direkam.',
            'Skrip jahat yang berjalan di halaman ini (misalnya lewat celah XSS atau ekstensi peramban) saat vault terbuka.',
            'Kehilangan kata sandi utama sekaligus kunci pemulihan. Tidak ada pemulihan oleh siapa pun, termasuk pembuat aplikasi ini.',
            'Kata sandi utama yang lemah. Penyerang yang memegang salinan data bisa menebaknya di komputernya sendiri; PBKDF2 hanya memperlambat, tidak mencegah.',
            'Seseorang yang sudah tahu kata sandi utamamu.',
          ]}
        />
      </Section>

      <Section title="Batasan yang perlu kamu tahu">
        <List
          items={[
            'Papan klip dibersihkan otomatis setelah 20 detik hanya sebagai upaya terbaik. Peramban bisa menolak, dan aplikasi lain mungkin sudah menyalinnya.',
            'Jeda setelah salah memasukkan kata sandi hanya kenyamanan di sisi klien. Perlindungan sebenarnya adalah biaya penurunan kunci.',
            'Rahasia yang sudah dibuka ada di memori peramban sampai dibuang. JavaScript tidak bisa menghapus memori dengan tuntas.',
            '"Samarkan saat jendela tidak aktif" hanya efek tampilan. Itu bukan kunci, dan tidak menghentikan tangkapan layar.',
            'Ukuran dan waktu ubah tiap item terlihat di penyimpanan, walau isi dan judulnya tidak.',
            'Backup lama tetap bisa dibuka dengan kata sandi lama (atau kunci pemulihan yang berlaku saat itu). Mengganti kata sandi atau merotasi kunci tidak mencabut backup yang sudah ada.',
            'Kode autentikasi dua langkah (TOTP) sengaja tidak disimpan di sini, karena menyimpannya di samping kata sandi menghilangkan gunanya.',
          ]}
        />
      </Section>

      <Section title="Untuk pengembang">
        <p className="text-sm text-muted">Tidak ada skrip pihak ketiga yang boleh ditambahkan ke aplikasi ini. Satu skrip jahat saja bisa membaca vault yang sedang terbuka.</p>
      </Section>
    </div>
  )
}

/** A text link that opens the same explanation in a dialog, for screens where the vault is still closed. */
export function HowItWorksLink() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-accent-text underline underline-offset-2">
        Cara kerja dan batasan
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} label="Cara kerja dan batasan" className="max-w-lg">
        <div className="max-h-[80dvh] space-y-4 overflow-y-auto p-5">
          <h2 className="font-display text-lg font-bold tracking-tight">Cara kerja dan batasan</h2>
          <HowItWorks />
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
