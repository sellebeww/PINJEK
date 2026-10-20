"use client";
import { useState } from "react";
import type { State, Loan, Evidence, Answer, Diagnosis } from "@/domain/types";
import { health, procedureFor } from "@/domain/engine";
import { rp, label, date } from "@/lib/format";
type Action = { type: string; [key: string]: unknown };
function EvidenceForm({
  onSubmit,
  busy,
  returning = false,
}: {
  onSubmit: (e: Evidence) => void;
  busy: boolean;
  returning?: boolean;
}) {
  const [e, set] = useState<Evidence>({
    fisik: false,
    fungsi: false,
    kelengkapan: false,
    catatan: "",
    foto: "",
  });
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onSubmit(e);
      }}
    >
      <h3>{returning ? "Bukti kondisi kembali" : "Bukti kondisi awal"}</h3>
      <p className="muted mini">
        {returning
          ? "Catat kondisi apa adanya. Checklist yang tidak lolos akan membuka sengketa."
          : "Seluruh checklist harus lolos sebelum unit diserahkan."}
      </p>
      {(["fisik", "fungsi", "kelengkapan"] as const).map((k) => (
        <label className="check" key={k}>
          <input
            type="checkbox"
            checked={e[k]}
            onChange={(ev) => set({ ...e, [k]: ev.target.checked })}
          />
          {k === "fisik"
            ? "Fisik utuh, tanpa kerusakan baru"
            : k === "fungsi"
              ? "Fungsi normal saat diperiksa"
              : "Kelengkapan dan segel sesuai"}
        </label>
      ))}
      <label className="field">
        Catatan pemeriksaan
        <textarea
          value={e.catatan}
          onChange={(ev) => set({ ...e, catatan: ev.target.value })}
        />
      </label>
      <label className="field">
        Foto kondisi (simulasi, hanya nama berkas disimpan)
        <input
          type="file"
          accept="image/*"
          required
          onChange={(ev) =>
            set({ ...e, foto: ev.target.files?.[0]?.name || "" })
          }
        />
      </label>
      <button
        className="btn primary"
        disabled={
          busy ||
          !e.foto ||
          (!returning && (!e.fisik || !e.fungsi || !e.kelengkapan))
        }
      >
        {returning ? "Catat pengembalian" : "Konfirmasi serah terima"} →
      </button>
    </form>
  );
}
export function LoanFlow({
  s,
  loan: l,
  act,
  busy,
}: {
  s: State;
  loan: Loan;
  act: (a: Action) => Promise<void>;
  busy: boolean;
}) {
  const [answers, setAnswers] = useState<Answer[]>([
      "tidak_bisa_dinilai",
      "tidak_bisa_dinilai",
      "tidak_bisa_dinilai",
    ]),
    [change, setChange] = useState<Diagnosis["perubahan"]>("tidak_jelas"),
    [hours, setHours] = useState(1),
    [decision, setDecision] = useState(""),
    [kind, setKind] = useState("tidak_jelas");
  const p = s.komponen.find((p) => p.id === l.komponen_id)!,
    pr = procedureFor(
      s,
      p.jenis_komponen,
      s.kasus.find((c) => c.id === l.kasus_id)!.model_id,
    ),
    d = s.hasil.find((d) => d.peminjaman_id === l.id),
    dispute = s.sengketa.find((d) => d.peminjaman_id === l.id);
  return (
    <>
      <div className="progress">
        {[
          "dipesan",
          "dipinjam",
          "sedang_diuji",
          "dikembalikan",
          "diperiksa_ulang",
          "selesai",
          "sengketa",
        ].map((st) => (
          <span key={st} className={l.status === st ? "on" : ""}>
            {label(st)}
          </span>
        ))}
      </div>
      <div className="row spread">
        <p className="mini muted">
          {p.kode_unit} · Jatuh tempo {date(l.tanggal_jatuh_tempo)}
        </p>
        <p className="mini">
          Layanan {rp(l.biaya_penggunaan + l.ongkos_antar)} · Deposit{" "}
          {rp(l.deposit)}
        </p>
      </div>
      {l.status === "dipesan" && (
        <>
          {health(p) === "teruji" ? (
            <EvidenceForm
              key="awal"
              busy={busy}
              onSubmit={(e) =>
                act({ type: "pickup", loanId: l.id, evidence: e })
              }
            />
          ) : (
            <div className="notice">
              Masa uji unit habis. Batalkan reservasi lalu lakukan uji ulang.
            </div>
          )}
          <button
            className="btn danger"
            style={{ marginTop: 16 }}
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Batalkan reservasi dan lepaskan unit? Tidak ada biaya yang dicatat.",
                )
              )
                void act({ type: "cancel", loanId: l.id });
            }}
          >
            Batalkan reservasi
          </button>
        </>
      )}
      {l.status === "dipinjam" && (
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => act({ type: "begin", loanId: l.id })}
        >
          Mulai prosedur pemeriksaan →
        </button>
      )}
      {l.status === "sedang_diuji" && !d && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act({
              type: "diagnose",
              loanId: l.id,
              answers,
              change,
              hours,
              decision,
            });
          }}
        >
          <h2>Pemeriksaan terpandu · {p.jenis_komponen}</h2>
          {pr?.langkah.map((step, i) => (
            <div className="step" key={i}>
              <h3>
                <span className="step-num">{i + 1}</span>
                {step.instruksi}
              </h3>
              <p className="muted mini">
                Diharapkan: {step.hasil_yang_diharapkan}
              </p>
              <select
                aria-label={`Hasil langkah ${i + 1}`}
                value={answers[i]}
                onChange={(e) =>
                  setAnswers(
                    answers.map((a, j) =>
                      j === i ? (e.target.value as Answer) : a,
                    ),
                  )
                }
              >
                <option value="tidak_bisa_dinilai">Tidak bisa dinilai</option>
                <option value="lulus">Lulus</option>
                <option value="gagal">Gagal</option>
              </select>
            </div>
          ))}
          <div className="form-grid" style={{ marginTop: 20 }}>
            <label className="field">
              Perilaku perangkat setelah dipasang
              <select
                value={change}
                onChange={(e) =>
                  setChange(e.target.value as Diagnosis["perubahan"])
                }
              >
                <option value="tidak_jelas">Tidak jelas</option>
                <option value="membaik">Membaik, gejala hilang</option>
                <option value="tetap">Tetap, gejala masih ada</option>
              </select>
            </label>
            <label className="field">
              Waktu diagnosis aktual (jam)
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="field">
            Keputusan / tindak lanjut
            <textarea
              required
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Catat tindakan bengkel setelah pengujian."
            />
          </label>
          <button className="btn primary" disabled={busy || !pr}>
            Hitung & simpan kesimpulan →
          </button>
        </form>
      )}
      {d && (
        <div
          className={`notice ${d.kesimpulan !== "tidak_pasti" ? "success" : ""}`}
        >
          <b>
            {label(d.kesimpulan)} · keyakinan {d.keyakinan}
          </b>
          <p>{d.saran}</p>
          <span className="mini">Keputusan: {d.keputusan_akhir}</span>
        </div>
      )}
      {l.status === "sedang_diuji" && d && (
        <EvidenceForm
          key="kembali"
          returning
          busy={busy}
          onSubmit={(e) => act({ type: "return", loanId: l.id, evidence: e })}
        />
      )}
      {l.bukti_kondisi_kembali && (
        <div className="form-grid">
          {[l.bukti_kondisi_awal, l.bukti_kondisi_kembali].map((ev, i) => (
            <div className="card" key={i} style={{ marginBottom: 20 }}>
              <h3>
                {i === 0 ? "Kondisi saat dipinjam" : "Kondisi saat kembali"}
              </h3>
              <p className="mini">
                Fisik {ev?.fisik ? "lolos" : "gagal"} · Fungsi{" "}
                {ev?.fungsi ? "lolos" : "gagal"} · Kelengkapan{" "}
                {ev?.kelengkapan ? "lolos" : "gagal"}
              </p>
              <p className="muted mini">{ev?.catatan || "Tanpa catatan"}</p>
              <span className="mini">Berkas: {ev?.foto}</span>
            </div>
          ))}
        </div>
      )}
      {l.status === "dikembalikan" && (
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => act({ type: "inspect", loanId: l.id })}
        >
          Pemilik: bandingkan bukti & mulai uji ulang →
        </button>
      )}
      {l.status === "diperiksa_ulang" && (
        <div>
          <h3>Uji ulang singkat oleh pemilik</h3>
          <p className="muted">
            Periksa fisik dan konektor. Pasang pada perangkat kontrol yang
            normal, lalu verifikasi fungsi. Perubahan kondisi pada bukti
            pengembalian tetap membuka sengketa meskipun uji fungsi lulus.
          </p>
          <div className="row">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                act({ type: "retest", loanId: l.id, passed: true })
              }
            >
              Uji fungsi lulus
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() =>
                act({ type: "retest", loanId: l.id, passed: false })
              }
            >
              Uji gagal · buka sengketa
            </button>
          </div>
        </div>
      )}
      {dispute && (
        <div className="notice">
          <h3>Sengketa · {label(dispute.status)}</h3>
          <p>{dispute.keputusan}</p>
          {dispute.status === "terbuka" && (
            <>
              <label className="field">
                Penyebab berdasarkan bukti
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="tidak_jelas">
                    Tidak jelas · peminjam 50% batas deposit
                  </option>
                  <option value="rusak_saat_dipakai">
                    Saat dipakai · peminjam 100% batas deposit
                  </option>
                  <option value="rusak_di_perjalanan">
                    Perjalanan · peminjam 0%
                  </option>
                </select>
              </label>
              <button
                className="btn"
                disabled={busy}
                onClick={() => act({ type: "settle", loanId: l.id, kind })}
              >
                Catat keputusan sengketa
              </button>
            </>
          )}
        </div>
      )}
      {l.status === "selesai" && (
        <div className="notice success">
          Peminjaman selesai. Deposit dikembalikan penuh. Kesehatan unit
          diperbarui setelah uji ulang.
        </div>
      )}
    </>
  );
}
