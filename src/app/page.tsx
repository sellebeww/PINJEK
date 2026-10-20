import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { config } from "@/domain/config";
import { Reveal } from "./reveal";
import "./profil.css";

export const metadata: Metadata = {
  description:
    "PINJEK menghubungkan bengkel elektronik dengan komponen pembanding teruji agar diagnosis lebih pasti sebelum membeli suku cadang.",
};

const parts = [
  "Adaptor",
  "RAM",
  "Baterai laptop",
  "SSD",
  "Power supply",
  "T-con",
  "LCD",
  "Baterai ponsel",
  "Flex charger",
];

const icons = {
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 3h6v3H9z" />
      <path d="M7 4.5H5V21h14V4.5h-2M8 12h8M8 16h5" />
    </>
  ),
  chart: <path d="M3 20h18M6 16v-5M11 16V6M16 16v-8" />,
  scale: (
    <>
      <path d="M12 4v16M6 20h12M5 7h14" />
      <path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg
      className="pf-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

const steps = [
  {
    title: "Catat kasus",
    text: "Teknisi mencatat gejala, komponen yang dicurigai, dan keputusan awal sebelum melihat hasil uji.",
  },
  {
    title: "Pinjam pembanding",
    text: "Sistem merekomendasikan unit teruji yang cocok dengan model, diurutkan menurut ketersediaan dan jarak.",
  },
  {
    title: "Uji terpandu",
    text: "Tiga langkah prosedur menghasilkan kesimpulan: komponen sehat, rusak, atau tidak pasti, lengkap dengan tingkat keyakinan.",
  },
  {
    title: "Kembalikan & ukur",
    text: "Bukti kondisi dua sisi, uji ulang oleh pemilik, lalu dampak biaya dan waktu tercatat per kasus.",
  },
];

const features: { icon: keyof typeof icons; title: string; text: string }[] = [
  {
    icon: "shield",
    title: "Unit selalu teruji",
    text: `Setelah ${config.batasPinjamSejakUji}× pinjam atau ${config.batasUmurUjiHari} hari, unit wajib uji ulang. Pensiun pada ${config.batasPensiun}× pinjam.`,
  },
  {
    icon: "pin",
    title: "Rekomendasi terdekat",
    text: "Hanya pembanding yang sesuai model dan dugaan, diurutkan menurut ketersediaan, jarak, dan kesegaran uji.",
  },
  {
    icon: "clipboard",
    title: "Bukti kondisi dua sisi",
    text: "Checklist dan foto saat serah terima dan saat kembali. Kerusakan tidak bisa disembunyikan.",
  },
  {
    icon: "chart",
    title: "Evaluasi yang jujur",
    text: "Kasus yang tidak lebih hemat tetap ditampilkan. Semua angka bisa ditelusuri ke kasus dan diekspor CSV.",
  },
  {
    icon: "scale",
    title: "Sengketa transparan",
    text: `Deposit ${config.depositPersen * 100}% harga unit. Pemilik memutuskan penyebab berdasarkan bukti, dengan potongan yang jelas aturannya.`,
  },
  {
    icon: "lock",
    title: "Tanpa data pelanggan",
    text: "Kasus memakai kode, bukan identitas pemilik perangkat. Privasi pelanggan bengkel tetap terjaga.",
  },
];

const numbers = [
  { value: config.durasiPinjamJam, unit: "jam", label: "Masa pinjam per unit" },
  {
    value: config.depositPersen * 100,
    unit: "%",
    label: "Deposit dari harga unit",
  },
  {
    value: config.batasPinjamSejakUji,
    unit: "×",
    label: "Pinjam sebelum uji ulang",
  },
  {
    value: config.biayaPenggunaan,
    unit: "",
    prefix: "Rp",
    label: "Biaya penggunaan per pinjam",
  },
];

export default function Profil() {
  return (
    <div className="pf">
      <a className="skip-link" href="#konten">
        Langsung ke konten
      </a>
      <header className="pf-nav">
        <div className="pf-wrap pf-nav-inner">
          <Link href="/" className="pf-brand" aria-label="PINJEK beranda">
            <LogoMark size={30} title="" />
            <span>PINJEK</span>
          </Link>
          <nav aria-label="Navigasi profil" className="pf-links">
            <a href="#tentang">Tentang</a>
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#fitur">Keunggulan</a>
            <a href="#visi">Visi</a>
          </nav>
          <Link href="/app" className="pf-btn pf-btn-mint pf-btn-sm">
            Buka aplikasi <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <main id="konten" className="pf-main">
        <section className="pf-hero">
          <div className="pf-blob pf-blob-a" aria-hidden="true" />
          <div className="pf-blob pf-blob-b" aria-hidden="true" />
          <div className="pf-wrap pf-hero-grid">
            <div className="pf-hero-copy">
              <p
                className="pf-eyebrow pf-in"
                style={{ "--d": "0.1s" } as React.CSSProperties}
              >
                Pinjam · Cek · Putuskan
              </p>
              <h1
                className="pf-in"
                style={{ "--d": "0.25s" } as React.CSSProperties}
              >
                Pinjam komponen teruji.{" "}
                <span className="pf-grad">Cek dulu, baru ganti.</span>
              </h1>
              <p
                className="pf-lead pf-in"
                style={{ "--d": "0.4s" } as React.CSSProperties}
              >
                PINJEK membantu bengkel elektronik menguji dugaan kerusakan
                dengan komponen pembanding yang sudah terbukti berfungsi,
                sebelum membeli suku cadang yang belum tentu dibutuhkan.
              </p>
              <div
                className="pf-cta pf-in"
                style={{ "--d": "0.55s" } as React.CSSProperties}
              >
                <Link href="/app" className="pf-btn pf-btn-mint">
                  Masuk ke aplikasi <span aria-hidden="true">→</span>
                </Link>
                <a href="#cara-kerja" className="pf-btn pf-btn-ghost">
                  Lihat cara kerja
                </a>
              </div>
            </div>
            <div className="pf-hero-art" aria-hidden="true">
              <div className="pf-ring" />
              <div className="pf-ring pf-ring-2" />
              <LogoMark size={250} className="pf-hero-logo" title="" />
              <span className="pf-chip pf-chip-a">✓ Unit teruji</span>
              <span className="pf-chip pf-chip-b">
                ⇄ Pinjam {config.durasiPinjamJam} jam
              </span>
              <span className="pf-chip pf-chip-c">◎ Kesimpulan terukur</span>
            </div>
          </div>
        </section>

        <div className="pf-marquee" aria-label="Contoh komponen pembanding">
          <div className="pf-marquee-track">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1}>
                {parts.map((p) => (
                  <li key={p}>
                    <span aria-hidden="true">✓</span> {p}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        <section id="tentang" className="pf-section">
          <div className="pf-wrap pf-about">
            <div data-reveal>
              <p className="pf-eyebrow pf-eyebrow-dark">Tentang PINJEK</p>
              <h2>
                Nama kami adalah cara kerja kami:{" "}
                <span className="pf-hl">PIN</span>jam dan c
                <span className="pf-hl">EK</span>.
              </h2>
              <p>
                Di bengkel, komponen sering diganti hanya untuk membuktikan
                dugaan. Jika ternyata bukan sumber masalah, suku cadang sudah
                terlanjur dibeli dan waktu teknisi terbuang.
              </p>
              <p>
                PINJEK membangun jaringan komponen pembanding bersama antar
                bengkel. Unit yang terbukti berfungsi dipinjam, diuji dengan
                prosedur terpandu, lalu dikembalikan, sehingga keputusan membeli
                diambil berdasarkan bukti.
              </p>
            </div>
            <div className="pf-problems">
              {[
                [
                  "Ganti dulu, baru tahu",
                  "Pembelian suku cadang dipakai sebagai alat diagnosis.",
                ],
                [
                  "Waktu teknisi terbuang",
                  "Mencari, memesan, dan menunggu komponen yang belum tentu rusak.",
                ],
                [
                  "Stok tidur di rak",
                  "Komponen sehat di satu bengkel tidak bermanfaat bagi bengkel lain.",
                ],
              ].map(([t, d], i) => (
                <div
                  key={t}
                  className="pf-problem"
                  data-reveal
                  style={{ "--d": `${i * 0.12}s` } as React.CSSProperties}
                >
                  <span className="pf-problem-n">0{i + 1}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="pf-section pf-soft">
          <div className="pf-wrap">
            <div className="pf-head" data-reveal>
              <p className="pf-eyebrow pf-eyebrow-dark">Cara kerja</p>
              <h2>Dari gejala hingga kepastian, empat langkah.</h2>
            </div>
            <ol className="pf-steps">
              {steps.map((s, i) => (
                <li
                  key={s.title}
                  data-reveal
                  style={{ "--d": `${i * 0.12}s` } as React.CSSProperties}
                >
                  <span className="pf-step-n">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="fitur" className="pf-section">
          <div className="pf-wrap">
            <div className="pf-head" data-reveal>
              <p className="pf-eyebrow pf-eyebrow-dark">Keunggulan</p>
              <h2>Kepercayaan yang dibangun dari aturan, bukan janji.</h2>
            </div>
            <div className="pf-features">
              {features.map((f, i) => (
                <article
                  key={f.title}
                  className="pf-feature"
                  data-reveal
                  style={{ "--d": `${(i % 3) * 0.1}s` } as React.CSSProperties}
                >
                  <Icon name={f.icon} />
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pf-numbers" aria-label="Aturan layanan dalam angka">
          <div className="pf-wrap pf-numbers-grid">
            {numbers.map((n, i) => (
              <div
                key={n.label}
                data-reveal
                style={{ "--d": `${i * 0.1}s` } as React.CSSProperties}
              >
                <div className="pf-number">
                  {n.prefix}
                  <span data-count={n.value}>
                    {n.value.toLocaleString("id-ID")}
                  </span>
                  <small>{n.unit}</small>
                </div>
                <p>{n.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="visi" className="pf-section">
          <div className="pf-wrap pf-vision">
            <div data-reveal>
              <p className="pf-eyebrow pf-eyebrow-dark">Visi</p>
              <h2>Setiap penggantian komponen didasari bukti.</h2>
              <p>
                Kami ingin bengkel elektronik di Indonesia mengambil keputusan
                perbaikan yang lebih pasti, hemat, dan dapat
                dipertanggungjawabkan kepada pelanggannya.
              </p>
            </div>
            <div data-reveal style={{ "--d": "0.15s" } as React.CSSProperties}>
              <p className="pf-eyebrow pf-eyebrow-dark">Misi & nilai</p>
              <ul className="pf-values">
                <li>
                  <b>Teruji sebelum dipinjam.</b> Hanya unit yang lolos uji
                  fungsi yang boleh beredar.
                </li>
                <li>
                  <b>Jujur pada data.</b> Hasil yang tidak menguntungkan tetap
                  dicatat dan ditampilkan.
                </li>
                <li>
                  <b>Bengkel lebih dulu.</b> Biaya layanan harus lebih kecil
                  daripada nilai kepastian yang didapat.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="pf-section pf-final">
          <div className="pf-wrap">
            <div className="pf-final-card" data-reveal>
              <LogoMark size={64} className="pf-final-logo" title="" />
              <h2>Siap mencoba ruang kerja PINJEK?</h2>
              <p>
                Jalankan skenario siap pakai, buat kasus diagnosis, dan lihat
                dampaknya langsung di dasbor.
              </p>
              <Link href="/app" className="pf-btn pf-btn-mint">
                Buka aplikasi <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="pf-footer">
        <div className="pf-wrap pf-footer-inner">
          <Image
            src="/pinjek-logo.png"
            alt="Logo PINJEK"
            width={1355}
            height={1161}
            className="pf-footer-logo"
          />
          <nav aria-label="Tautan footer" className="pf-footer-links">
            <Link href="/app">Aplikasi</Link>
            <a href="#tentang">Tentang</a>
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#fitur">Keunggulan</a>
          </nav>
          <p>
            © {new Date().getFullYear()} PINJEK · Prototipe MVP dengan data
            simulasi.
          </p>
        </div>
      </footer>
      <Reveal />
    </div>
  );
}
