"use client";
import { Badge, Stat, Metric, PartIcon } from "@/components/ui";
import { LoanFlow } from "@/components/loan-flow";
import { LogoMark } from "@/components/logo";
import Link from "next/link";
import { rp, label, date, dec } from "@/lib/format";
import { useEffect, useState, useRef } from "react";
import type { State } from "@/domain/types";
import { active, health, recommendations, feasible } from "@/domain/engine";
import {
  accuracy,
  damageRate,
  evaluationRecords,
  evaluationCsv,
  dashboardSummary,
} from "@/domain/metrics";
import { config } from "@/domain/config";
const tabs = [
  "Dasbor dampak",
  "Katalog komponen",
  "Kasus & peminjaman",
  "Riwayat & mutu",
  "Evaluasi",
];
const symbols = ["◫", "▦", "⇄", "◷", "↗"];
type Action = { type: string; [key: string]: unknown };
export default function App() {
  const [s, setS] = useState<State | null>(null),
    [tab, setTab] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [model, setModel] = useState(""),
    [distance, setDistance] = useState("100"),
    [workshop, setWorkshop] = useState("b1"),
    [showForm, setShowForm] = useState(false),
    [ack, setAck] = useState(false),
    [toast, setToast] = useState(""),
    [draftModel, setDraftModel] = useState("L1"),
    [draftKind, setDraftKind] = useState("Adaptor"),
    [draftPrice, setDraftPrice] = useState(250000),
    [search, setSearch] = useState("");
  const inFlight = useRef(false);
  function startCase(model = "L1", kind = "Adaptor", price = 250000) {
    setDraftModel(model);
    setDraftKind(kind);
    setDraftPrice(price);
    setTab(2);
    setShowForm(true);
    setSelected("");
    setError("");
    setToast("");
  }
  function exportCsv() {
    if (!s) return;
    const url = URL.createObjectURL(
      new Blob([evaluationCsv(s)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "pinjek-evaluasi.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function load() {
    try {
      const r = await fetch("/api/state");
      if (!r.ok) throw Error("Tidak dapat memuat data.");
      setS(await r.json());
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  async function act(a: Action) {
    if (!s || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setToast("");
    try {
      const r = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, revision: s.revision }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setS(data);
      setToast("Perubahan berhasil disimpan.");
      if (a.type === "case" || a.type === "scenario") {
        setSelected(data.kasus.at(-1).id);
        setShowForm(false);
        setTab(2);
        setAck(false);
      }
    } catch (e) {
      setError((e as Error).message);
      await load();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (!s)
    return (
      <main className="boot" aria-busy={!error}>
        <LogoMark size={64} className={error ? "" : "logo-pulse"} />
        <h1>PINJEK</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Memuat ruang diagnosis…"}
        </p>
        {error && (
          <button className="btn" onClick={load}>
            Coba lagi
          </button>
        )}
      </main>
    );
  const records = evaluationRecords(s);
  const quality = accuracy(s.hasil),
    damage = damageRate(s.peminjaman);
  const pending = s.peminjaman.filter(active);
  const finalRecords = records.filter((r) => !r.compare.provisional);
  const total = dashboardSummary(s);
  const outcome = (k: string) =>
    records.filter((r) => r.d.kesimpulan === k).length;
  const maxBar = Math.max(
    1,
    outcome("komponen_dicurigai_sehat"),
    outcome("komponen_dicurigai_rusak"),
    outcome("tidak_pasti"),
  );

  const current = s.kasus.find((c) => c.id === selected),
    loan = s.peminjaman.find(
      (l) => l.kasus_id === selected && l.status !== "dibatalkan",
    );
  const available = s.komponen.filter(
    (p) =>
      health(p) === "teruji" &&
      !s.peminjaman.some((l) => l.komponen_id === p.id && active(l)),
  ).length;
  const viewerKm = s.bengkel.find((w) => w.id === workshop)?.km ?? 0;
  const catalog = s.komponen
    .filter((p) => !model || p.model_kompatibel.includes(model))
    .map((p) => {
      const owner = s.bengkel.find((w) => w.id === p.pemilik_bengkel_id)!;
      return { p, owner, km: Math.abs(owner.km - viewerKm) };
    })
    .filter(({ km }) => km <= Number(distance));
  const createCase = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    void act({
      type: "case",
      case: {
        bengkel_id: workshop,
        model_id: data.get("model"),
        gejala: data.get("gejala"),
        komponen_dicurigai: data.get("kind"),
        harga_komponen_dicurigai: Number(data.get("price")),
        keputusan_awal_tanpa_layanan: data.get("decision"),
        estimasi_waktu_tanpa_layanan_jam: Number(data.get("hours")),
      },
    });
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Langsung ke konten
      </a>
      <aside>
        <Link href="/" className="brand" title="Lihat profil perusahaan PINJEK">
          <span className="brand-badge">
            <LogoMark size={26} title="" />
          </span>
          <span className="brand-word">PINJEK</span>
        </Link>
        <div className="tagline">Cek dulu, baru ganti</div>
        <div className="nav-label">RUANG KERJA</div>
        <nav aria-label="Navigasi utama">
          {tabs.map((t, i) => (
            <button
              key={t}
              aria-current={tab === i ? "page" : undefined}
              disabled={busy}
              className={tab === i ? "selected" : ""}
              onClick={(e) => {
                setTab(i);
                // Di ponsel nav bergulir horizontal; pastikan tab aktif terlihat.
                e.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                });
                setError("");
                setToast("");
              }}
            >
              <span className="nav-icon">{symbols[i]}</span>
              {t}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="dot" />
          Mode simulasi MVP
          <br />
          <span style={{ color: "#98b3a2" }}>
            2 bengkel · 3 model perangkat
            <br />
            Tanpa transaksi pembayaran
          </span>
          <Link href="/" className="sidebar-link">
            Profil perusahaan →
          </Link>
        </div>
      </aside>
      <main id="main">
        <header className="topbar">
          <span>
            Ruang kerja <span style={{ margin: "0 10px" }}> / </span>
            <strong>{tabs[tab]}</strong>
          </span>
          <span className="row">
            <span className="context">Jaringan Bandung</span>
            <Link href="/" className="topbar-link">
              Tentang PINJEK
            </Link>
            <span className="avatar" aria-hidden="true">
              PJ
            </span>
          </span>
        </header>
        <div className="heading">
          <div>
            <div className="eyebrow">DIAGNOSIS YANG BISA DIPERCAYA</div>
            <h1>{tabs[tab]}</h1>
            <p className="muted" style={{ margin: "9px 0 0" }}>
              {
                [
                  "Lihat nilai diagnosis yang tepat, bukan sekadar komponen yang diganti.",
                  "Komponen teruji, siap membantu menemukan sumber masalah.",
                  "Dari gejala hingga kepastian, setiap langkah tercatat.",
                  "Jejak diagnosis dan kesehatan komponen dalam satu tempat.",
                  "Ukur manfaatnya pada semua kasus, termasuk yang tidak menguntungkan.",
                ][tab]
              }
            </p>
          </div>
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => startCase()}
          >
            ＋ Kasus baru
          </button>
        </div>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {toast && (
          <div role="status" className="notice success">
            {toast}
          </div>
        )}
        {tab === 0 && (
          <>
            {pending.length > 0 && (
              <section className="card attention">
                <div className="row spread">
                  <h2>Perlu ditindaklanjuti</h2>
                  <span className="badge orange">
                    {pending.length} peminjaman aktif
                  </span>
                </div>
                {pending.map((l) => (
                  <button
                    key={l.id}
                    className="task-row"
                    onClick={() => {
                      setSelected(l.kasus_id);
                      setTab(2);
                      setShowForm(false);
                    }}
                  >
                    <span>
                      <b>
                        {
                          s.komponen.find((p) => p.id === l.komponen_id)
                            ?.kode_unit
                        }
                      </b>{" "}
                      · {label(l.status)}
                    </span>
                    <span>
                      {+new Date(l.tanggal_jatuh_tempo) < Date.now()
                        ? "Lewat jatuh tempo"
                        : `Jatuh tempo ${date(l.tanggal_jatuh_tempo)}`}{" "}
                      →
                    </span>
                  </button>
                ))}
              </section>
            )}
            <div className="stats">
              <Stat
                title="Pembelian berhasil dihindari"
                value={rp(total.avoided)}
                foot={`${records.filter((r) => r.m.avoided > 0).length} kasus dengan dasar keputusan awal`}
                accent
              />
              <Stat
                title="Rata-rata waktu diagnosis"
                value={`${dec(total.actual / (records.length || 1))} jam`}
                foot={`Estimasi tanpa layanan: ${dec(total.baseline / (records.length || 1))} jam`}
              />
              <Stat
                title="Manfaat bersih bengkel"
                value={rp(total.net)}
                foot="Termasuk waktu dan biaya yang sudah timbul"
              />
              <Stat
                title="Komponen siap dipinjam"
                value={`${available} / ${s.komponen.length}`}
                foot="Teruji dan tidak sedang dipesan"
              />
            </div>
            <p className="mini muted">
              Biaya dicatat sejak serah terima. Dampak kasus aktif/tidak pasti
              masih sementara; hasil final dapat dilihat di Evaluasi.
            </p>
            <div className="hero">
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  DIAGNOSIS DULU. BELANJA KEMUDIAN.
                </div>
                <h2>
                  Satu komponen pembanding.
                  <br />
                  Keputusan yang lebih pasti.
                </h2>
                <p className="muted">
                  Pinjam unit yang sudah terbukti berfungsi. Uji dugaan
                  kerusakan tanpa harus membeli komponen yang belum tentu
                  diperlukan.
                </p>
                <button
                  className="link"
                  style={{ marginTop: 17 }}
                  onClick={() => setTab(1)}
                >
                  Jelajahi komponen tersedia →
                </button>
              </div>
              <div className="hero-mark" aria-hidden="true">
                <LogoMark size={96} title="" />
              </div>
            </div>
            <div className="split">
              <section className="card">
                <div className="row spread">
                  <h2>Hasil diagnosis</h2>
                  <span className="badge">{records.length} kasus tercatat</span>
                </div>
                <p className="muted mini">
                  Kesimpulan berasal dari pola pemeriksaan terpandu.
                </p>
                <div className="bars">
                  {(
                    [
                      "komponen_dicurigai_sehat",
                      "komponen_dicurigai_rusak",
                      "tidak_pasti",
                    ] as const
                  ).map((k, i) => {
                    const n = records.filter(
                      (r) => r.d.kesimpulan === k,
                    ).length;
                    return (
                      <div className="bar-group" key={k}>
                        <b>
                          {n}{" "}
                          <span className="muted mini">
                            ({Math.round((n / (records.length || 1)) * 100)}%)
                          </span>
                        </b>
                        <div
                          className="bar"
                          style={{
                            // Batang tertinggi 72px = ruang tersisa di .bars (140px) setelah angka dan label.
                            height: `${(n / maxBar) * 72}px`,
                            background: ["#27d99a", "#5b06fa", "#e2c27a"][i],
                          }}
                        />
                        <span className="bar-label">
                          {
                            ["Komponen sehat", "Komponen rusak", "Tidak pasti"][
                              i
                            ]
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="card">
                <h2>Kepercayaan, terukur.</h2>
                <p className="muted mini">
                  Kualitas layanan lebih dari jumlah peminjaman.
                </p>
                <Metric
                  name="Akurasi pada kasus ditinjau"
                  value={
                    quality.percent === null
                      ? "Belum ada hasil pasti"
                      : `${Math.round(quality.percent)}% (${quality.correct}/${quality.reviewed})`
                  }
                />
                <Metric name="Total biaya layanan" value={rp(total.cost)} />
                <Metric
                  name="Sengketa tercatat"
                  value={String(s.sengketa.length)}
                />
                <Metric
                  name="Kerusakan pinjaman tercatat"
                  value={
                    damage.percent === null
                      ? "Belum diperiksa"
                      : `${dec(damage.percent)}% (${damage.damaged}/${damage.inspected})`
                  }
                />
              </section>
            </div>
            <section className="card">
              <div className="row spread">
                <h2>Dampak per bengkel</h2>
                <button className="link" onClick={() => setTab(4)}>
                  Lihat evaluasi →
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bengkel</th>
                      <th>Kasus</th>
                      <th>Pembelian dihindari</th>
                      <th>Biaya layanan</th>
                      <th>Manfaat bersih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.bengkel.map((w) => {
                      const summary = dashboardSummary(s, w.id);
                      const rows = records.filter(
                        (r) => r.c.bengkel_id === w.id,
                      );
                      return (
                        <tr key={w.id}>
                          <td>
                            <b>{w.nama}</b>
                            <div className="muted mini">{w.zona}</div>
                          </td>
                          <td>{rows.length}</td>
                          <td>
                            {rp(rows.reduce((a, r) => a + r.m.avoided, 0))}
                          </td>
                          <td>{rp(summary.cost)}</td>
                          <td>
                            <b>{rp(summary.net)}</b>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {tab === 1 && (
          <>
            <div className="row card" style={{ marginBottom: 22 }}>
              <div style={{ flex: 1 }}>
                <label className="field" style={{ margin: 0 }}>
                  Model perangkat
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <option value="">Semua model</option>
                    {s.model.map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.merek} {m.nama_model}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ flex: 1 }}>
                <label className="field" style={{ margin: 0 }}>
                  Bengkel peminjam
                  <select
                    value={workshop}
                    onChange={(e) => setWorkshop(e.target.value)}
                  >
                    {s.bengkel.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nama}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ flex: 1 }}>
                <label className="field" style={{ margin: 0 }}>
                  Jarak maksimum
                  <select
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                  >
                    <option value="100">Semua jarak</option>
                    <option value="5">5 km</option>
                    <option value="15">15 km</option>
                  </select>
                </label>
              </div>
            </div>
            {catalog.length === 0 && (
              <div className="empty card">
                Tidak ada komponen yang cocok dengan filter ini. Coba pilih
                “Semua model” atau perbesar jarak maksimum.
              </div>
            )}
            <div className="grid">
              {catalog.map(({ p, owner, km }) => {
                const booked = s.peminjaman.find(
                  (l) => l.komponen_id === p.id && active(l),
                );
                return (
                  <section className="card" key={p.id}>
                    <div className="row spread">
                      <PartIcon kind={p.jenis_komponen} />
                      <Badge value={health(p)} />
                    </div>
                    <h2>{p.jenis_komponen}</h2>
                    <span className="muted mini">
                      {p.kode_unit} ·{" "}
                      {
                        s.model.find((m) => m.id === p.model_kompatibel[0])
                          ?.nama_model
                      }
                    </span>
                    <div className="part-details">
                      {owner.nama} · {km} km
                      <br />
                      Terakhir diuji {date(p.tanggal_uji_terakhir)} ·{" "}
                      {p.jumlah_pinjam}× dipinjam
                      <br />
                      Ongkos antar {rp(km * config.ongkosPerKm)}
                    </div>
                    <div
                      className="calendar"
                      aria-label="Ketersediaan tujuh hari"
                    >
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = new Date(Date.now() + i * 86400000);
                        return (
                          <span
                            key={i}
                            className={
                              health(p) !== "teruji" ||
                              (booked &&
                                (+new Date(booked.tanggal_jatuh_tempo) <
                                  Date.now() ||
                                  day.toLocaleDateString("en-CA", {
                                    timeZone: "Asia/Jakarta",
                                  }) <=
                                    new Date(
                                      booked.tanggal_jatuh_tempo,
                                    ).toLocaleDateString("en-CA", {
                                      timeZone: "Asia/Jakarta",
                                    })))
                                ? "busy"
                                : ""
                            }
                          >
                            {day.toLocaleDateString("id-ID", {
                              day: "numeric",
                              timeZone: "Asia/Jakarta",
                            })}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mini muted">
                      {health(p) !== "teruji"
                        ? "Belum tersedia: menunggu uji ulang atau sudah pensiun."
                        : booked
                          ? +new Date(booked.tanggal_jatuh_tempo) < Date.now()
                            ? "Terlambat dikembalikan; jadwal tersedia belum dapat dipastikan."
                            : `Perkiraan tersedia ${date(booked.tanggal_jatuh_tempo)}; menunggu uji ulang.`
                          : "Tidak ada peminjaman aktif. Kalender 7 hari ke depan."}
                    </p>
                    <div className="row spread part-footer">
                      <b>
                        {rp(config.biayaPenggunaan)}{" "}
                        <span className="mini muted">/ pinjam</span>
                      </b>
                      <button
                        className="link"
                        onClick={() =>
                          startCase(
                            p.model_kompatibel[0],
                            p.jenis_komponen,
                            p.harga_baru,
                          )
                        }
                      >
                        Buat kasus →
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
        {tab === 2 && (
          <>
            <section className="card" style={{ marginBottom: 20 }}>
              <div className="row spread">
                <h2>Skenario siap-jalan</h2>
                <span className="mini muted">
                  Membuat kasus baru · lanjutkan alur di bawah
                </span>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                {[
                  "Rusak terkonfirmasi",
                  "Pembanding membuktikan sehat",
                  "Hasil tidak pasti",
                  "Rusak saat dikembalikan",
                  "Biaya tidak layak",
                ].map((t, i) => (
                  <button
                    key={t}
                    className="scenario"
                    disabled={busy}
                    onClick={() => act({ type: "scenario", scenario: i + 1 })}
                  >
                    <b>S{i + 1} ↗</b>
                    <span className="mini">{t}</span>
                  </button>
                ))}
              </div>
            </section>
            {showForm ? (
              <section className="card">
                <h2>Buat kasus diagnosis</h2>
                <p className="muted">
                  Catat keputusan awal sebelum melihat hasil uji. Gunakan kode
                  kasus, tanpa data pelanggan.
                </p>
                <form onSubmit={createCase}>
                  <div className="form-grid">
                    <label className="field">
                      Bengkel
                      <select
                        value={workshop}
                        onChange={(e) => setWorkshop(e.target.value)}
                      >
                        {s.bengkel.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.nama}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Model perangkat
                      <select
                        name="model"
                        required
                        value={draftModel}
                        onChange={(e) => {
                          setDraftModel(e.target.value);
                          const p = s.komponen.find((p) =>
                            p.model_kompatibel.includes(e.target.value),
                          )!;
                          setDraftKind(p.jenis_komponen);
                          setDraftPrice(p.harga_baru);
                        }}
                      >
                        {s.model.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.merek} {m.nama_model}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Komponen dicurigai
                      <select
                        name="kind"
                        value={draftKind}
                        onChange={(e) => {
                          setDraftKind(e.target.value);
                          setDraftPrice(
                            s.komponen.find(
                              (p) =>
                                p.jenis_komponen === e.target.value &&
                                p.model_kompatibel.includes(draftModel),
                            )!.harga_baru,
                          );
                        }}
                      >
                        {[
                          ...new Set(
                            s.komponen
                              .filter((p) =>
                                p.model_kompatibel.includes(draftModel),
                              )
                              .map((p) => p.jenis_komponen),
                          ),
                        ].map((kind) => (
                          <option key={kind}>{kind}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Harga pengganti (Rp)
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="1"
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(Number(e.target.value))}
                        required
                      />
                    </label>
                    <label className="field">
                      Keputusan awal tanpa layanan
                      <select name="decision">
                        <option value="beli_langsung">Beli langsung</option>
                        <option value="coba_ganti">Coba ganti</option>
                        <option value="tidak_tahu">Tidak tahu</option>
                      </select>
                    </label>
                    <label className="field">
                      Estimasi waktu tanpa layanan (jam)
                      <input
                        name="hours"
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue="5"
                        required
                      />
                    </label>
                  </div>
                  <label className="field">
                    Gejala
                    <textarea
                      name="gejala"
                      required
                      placeholder="Contoh: laptop tidak menyala, lampu pengisian mati."
                    />
                  </label>
                  <button className="btn primary" disabled={busy}>
                    Simpan & cari pembanding →
                  </button>{" "}
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => setShowForm(false)}
                  >
                    Batal
                  </button>
                </form>
              </section>
            ) : (
              <>
                <label className="field">
                  Cari kode, komponen, atau gejala
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Contoh: S2, adaptor, tidak menyala"
                  />
                </label>
                <label className="field">
                  Pilih kasus
                  <select
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setAck(false);
                    }}
                  >
                    <option value="">Pilih kasus untuk melanjutkan</option>
                    {[...s.kasus]
                      .reverse()
                      .filter(
                        (c) =>
                          c.id === selected ||
                          `${c.id} ${c.komponen_dicurigai} ${c.gejala}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id.slice(0, 12)} · {c.komponen_dicurigai} ·{" "}
                          {c.gejala}
                        </option>
                      ))}
                  </select>
                </label>
                {current && (
                  <section className="card">
                    <div className="row spread">
                      <h2>
                        {current.komponen_dicurigai} · {current.id.slice(0, 12)}
                      </h2>
                      {loan && <Badge value={loan.status} />}
                    </div>
                    <p className="muted">
                      {current.gejala} · Harga dugaan{" "}
                      {rp(current.harga_komponen_dicurigai)} · Keputusan awal:{" "}
                      {label(current.keputusan_awal_tanpa_layanan)}
                    </p>
                    {current.id.startsWith("S") && (
                      <div className="notice success">
                        {current.id.startsWith("S2")
                          ? "Panduan S2: dua langkah kontrol lulus, langkah terakhir gagal, perilaku tetap."
                          : current.id.startsWith("S3")
                            ? "Panduan S3: pilih “tidak bisa dinilai” pada salah satu langkah."
                            : current.id.startsWith("S4")
                              ? "Panduan S4: diagnosis lulus, lalu kembalikan dan pilih uji ulang gagal."
                              : current.id.startsWith("S5")
                                ? "Panduan S5: pilih Flex charger dari bengkel lain; biaya Rp85.000 melebihi harga Rp45.000."
                                : "Panduan S1: semua langkah lulus dan perilaku membaik."}
                      </div>
                    )}
                    {!loan ? (
                      <>
                        <h3>Rekomendasi pembanding</h3>
                        <p className="muted mini">
                          Hanya jenis pembanding yang sesuai dugaan dan model.
                          Diurutkan menurut ketersediaan, jarak, dan kesegaran
                          uji.
                        </p>
                        {recommendations(s, current).length === 0 && (
                          <div className="empty">
                            Belum ada pembanding yang cocok. Buat kasus dengan
                            dugaan lain jika ada bukti baru.
                          </div>
                        )}
                        {recommendations(s, current).map((p) => {
                          const cost =
                            config.biayaPenggunaan +
                            p.distance * config.ongkosPerKm;
                          const ok = feasible(
                            current.harga_komponen_dicurigai,
                            config.biayaPenggunaan,
                            p.distance * config.ongkosPerKm,
                          );
                          return (
                            <div className="step" key={p.id}>
                              <div className="row spread">
                                <div>
                                  <b>
                                    {p.jenis_komponen} · {p.kode_unit}
                                  </b>
                                  <p className="mini muted">
                                    {p.distance} km · Biaya {rp(cost)} · Deposit
                                    terpisah{" "}
                                    {rp(p.harga_baru * config.depositPersen)}
                                  </p>
                                  <Badge
                                    value={
                                      p.available
                                        ? "tersedia"
                                        : p.health === "teruji"
                                          ? "dipinjam"
                                          : p.health
                                    }
                                  />
                                  {!p.available &&
                                    s.peminjaman
                                      .filter(
                                        (l) =>
                                          l.komponen_id === p.id && active(l),
                                      )
                                      .map((l) => (
                                        <p className="mini" key={l.id}>
                                          Perkiraan kosong{" "}
                                          {date(l.tanggal_jatuh_tempo)} setelah
                                          pemeriksaan.
                                        </p>
                                      ))}
                                </div>
                                <button
                                  className="btn primary"
                                  disabled={
                                    busy || !p.available || (!ok && !ack)
                                  }
                                  onClick={() =>
                                    act({
                                      type: "reserve",
                                      caseId: current.id,
                                      partId: p.id,
                                      ack,
                                    })
                                  }
                                >
                                  Pesan unit →
                                </button>
                              </div>
                              {!ok && (
                                <div className="notice">
                                  <b>Layanan tidak layak untuk kasus ini.</b>{" "}
                                  Biaya penggunaan + antar {rp(cost)} melebihi
                                  harga komponen.
                                  <label className="check">
                                    <input
                                      type="checkbox"
                                      checked={ack}
                                      onChange={(e) => setAck(e.target.checked)}
                                    />
                                    Saya memahami dan ingin melanjutkan
                                    simulasi.
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <LoanFlow
                        key={loan.id}
                        s={s}
                        loan={loan}
                        act={act}
                        busy={busy}
                      />
                    )}
                  </section>
                )}
                {!current && (
                  <div className="empty">
                    Buat kasus baru atau pilih skenario untuk memulai diagnosis.
                  </div>
                )}
              </>
            )}
          </>
        )}
        {tab === 3 && (
          <>
            <div className="split">
              <section className="card">
                <h2>Akurasi per prosedur</h2>
                <p className="muted mini">
                  Hanya tinjauan dengan hasil nyata sehat/rusak masuk penyebut.
                  Tinjauan yang masih tidak pasti tidak dianggap benar.
                </p>
                {s.prosedur.map((p) => {
                  const q = accuracy(
                    s.hasil.filter((d) => d.prosedur_id === p.id),
                  );
                  return (
                    <Metric
                      key={p.id}
                      name={p.jenis_komponen}
                      value={
                        q.percent !== null
                          ? `${Math.round(q.percent)}% · ${q.reviewed} hasil pasti`
                          : "Belum ada hasil pasti"
                      }
                    />
                  );
                })}
              </section>
              <section className="card">
                <h2>Kontrol kesehatan unit</h2>
                <p className="muted mini">
                  Batas {config.batasPinjamSejakUji} kali per uji /{" "}
                  {config.batasUmurUjiHari} hari. Pensiun pada{" "}
                  {config.batasPensiun} kali total.
                </p>
                {s.komponen.map((p) => (
                  <div key={p.id} className="step">
                    <div className="row spread">
                      <b>
                        {p.kode_unit} · {p.jenis_komponen}
                      </b>
                      <Badge value={health(p)} />
                    </div>
                    <p className="mini muted">
                      {p.jumlah_pinjam}× total · {p.pinjam_sejak_uji}× sejak uji
                      ·{" "}
                      {Math.floor(
                        (Date.now() - +new Date(p.tanggal_uji_terakhir)) /
                          86400000,
                      )}{" "}
                      hari sejak uji
                    </p>
                    {health(p) === "perlu_uji_ulang" && (
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          act({ type: "certify", partId: p.id, passed: true })
                        }
                      >
                        Catat uji fungsi ulang lulus
                      </button>
                    )}
                  </div>
                ))}
              </section>
            </div>
            <section className="card">
              <h2>Log hasil & koreksi diagnosis</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Kasus / prosedur</th>
                      <th>Kesimpulan awal</th>
                      <th>Keputusan akhir</th>
                      <th>Tinjauan hasil nyata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...records].reverse().map(({ c, d }) => (
                      <tr key={d.id}>
                        <td>
                          <b>{c.id.slice(0, 12)}</b>
                          <div className="muted">
                            {c.komponen_dicurigai} · {d.waktu_diagnosis_jam} jam
                          </div>
                        </td>
                        <td>
                          {label(d.kesimpulan)}
                          <div className="muted">Keyakinan {d.keyakinan}</div>
                        </td>
                        <td>
                          {d.keputusan_akhir}
                          {d.diagnosis_meleset && (
                            <div>
                              <Badge value="diagnosis_meleset" />
                            </div>
                          )}
                        </td>
                        <td>
                          <select
                            aria-label={`Koreksi ${c.id}`}
                            disabled={busy}
                            value={d.koreksi || ""}
                            onChange={(e) =>
                              act({
                                type: "quality",
                                id: d.id,
                                correction: e.target.value,
                              })
                            }
                          >
                            <option value="" disabled>
                              Belum ditinjau
                            </option>
                            <option value="komponen_dicurigai_sehat">
                              Terbukti sehat
                            </option>
                            <option value="komponen_dicurigai_rusak">
                              Terbukti rusak
                            </option>
                            <option value="tidak_pasti">
                              Tetap tidak pasti
                            </option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {tab === 4 && (
          <>
            <div className="stats">
              <Stat
                title="PINJEK lebih hemat"
                value={`${finalRecords.filter((r) => r.compare.hemat > 0).length} kasus`}
                foot={`${finalRecords.length} final · ${records.length - finalRecords.length} sementara`}
                accent
              />
              <Stat
                title="Tidak lebih hemat"
                value={`${finalRecords.filter((r) => r.compare.hemat <= 0).length} kasus`}
                foot="Seluruh kasus tetap ditampilkan"
              />
              <Stat
                title="Nilai waktu teknisi"
                value={rp(config.nilaiJamTeknisi)}
                foot="Per jam · biaya ekonomi"
              />
              <Stat
                title="Ketersediaan kenalan"
                value={`${config.kenalan.ketersediaan * 100}%`}
                foot="Asumsi, menggunakan nilai harapan"
              />
            </div>
            <div className="notice">
              Perbandingan mencakup biaya layanan, pembelian pengganti bila
              rusak terkonfirmasi, dan nilai waktu. “Tidak tahu” tidak
              diasumsikan membeli. Kasus tidak pasti, pinjaman aktif, dan
              sengketa terbuka ditandai sementara; tidak masuk jumlah kasus
              hemat/final. Biaya diagnosis lanjutan belum tercakup.
            </div>
            <section className="card">
              <div className="row spread">
                <h2>Biaya ekonomi & waktu pada set kasus yang sama</h2>
                <button className="btn" onClick={exportCsv}>
                  ↓ Ekspor CSV
                </button>
              </div>
              <p className="muted mini">
                Biaya kenalan adalah nilai harapan: tersedia{" "}
                {config.kenalan.ketersediaan * 100}% dengan biaya{" "}
                {rp(config.kenalan.biaya)} dan {config.kenalan.waktuJam} jam;
                jika tidak tersedia, kembali ke proses biasa.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Kasus</th>
                      <th>Proses biasa</th>
                      <th>Pinjam kenalan</th>
                      <th>PINJEK</th>
                      <th>Selisih vs biasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(({ c, compare: v }) => (
                      <tr key={c.id}>
                        <td>
                          <b>{c.id.slice(0, 12)}</b>
                          <div className="muted">{c.komponen_dicurigai}</div>
                          {v.provisional && (
                            <Badge value="evaluasi_sementara" />
                          )}
                        </td>
                        <td>
                          {rp(v.biasa)}
                          <div className="muted">{dec(v.waktuBiasa)} jam</div>
                        </td>
                        <td>
                          {rp(v.kenalan)}
                          <div className="muted">{dec(v.waktuKenalan)} jam</div>
                        </td>
                        <td>
                          {rp(v.uji)}
                          <div className="muted">{dec(v.waktuUji)} jam</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${!v.provisional && v.hemat > 0 ? "green" : "orange"}`}
                          >
                            {v.provisional
                              ? "Selisih sementara"
                              : v.hemat > 0
                                ? "Hemat"
                                : "Tidak lebih hemat"}{" "}
                            {rp(v.provisional ? v.hemat : Math.abs(v.hemat))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        <footer className="footer-note row spread">
          <span>
            PINJEK · Data simulasi, bukan hasil studi lapangan. Semua angka
            dapat ditelusuri ke kasus.
          </span>
          <button
            className="link mini"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Hapus seluruh perubahan lokal dan pulihkan 28 kasus seed?",
                )
              ) {
                setSelected("");
                setSearch("");
                void act({ type: "reset" });
              }
            }}
          >
            Pulihkan seed
          </button>
        </footer>
      </main>
    </>
  );
}
