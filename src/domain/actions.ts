import { config } from "./config";
import {
  active,
  assertBorrow,
  conclude,
  feasible,
  health,
  transition,
  procedureFor,
} from "./engine";
import type {
  State,
  Case,
  Evidence,
  Answer,
  Diagnosis,
  Dispute,
} from "./types";
import { seed } from "../data/seed";
type Action = { type: string; [key: string]: unknown };
const number = (v: unknown) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e12)
    throw Error("Angka harus valid dan tidak negatif.");
  return v;
};
const str = (v: unknown) => {
  if (typeof v !== "string" || !v.trim() || v.length > 4000)
    throw Error("Isian wajib belum lengkap.");
  return v.trim();
};
export function apply(s: State, a: Action): State {
  if (
    !a ||
    typeof a !== "object" ||
    Array.isArray(a) ||
    typeof a.type !== "string"
  )
    throw Error("Perintah tidak valid.");
  const id = () => crypto.randomUUID();
  if (a.type === "reset") return seed();
  s.komponen.forEach((p) => (p.status_kesehatan = health(p)));
  if (a.type === "case") {
    const c = a.case as Case;
    if (
      !c ||
      !s.bengkel.some((w) => w.id === c.bengkel_id) ||
      !s.model.some((m) => m.id === c.model_id)
    )
      throw Error("Bengkel/model tidak valid.");
    if (
      !["beli_langsung", "coba_ganti", "tidak_tahu"].includes(
        c.keputusan_awal_tanpa_layanan,
      )
    )
      throw Error("Keputusan awal tidak valid.");
    if (
      !s.komponen.some(
        (p) =>
          p.model_kompatibel.includes(c.model_id) &&
          p.jenis_komponen === c.komponen_dicurigai,
      )
    )
      throw Error("Jenis komponen tidak tersedia untuk model ini.");
    s.kasus.push({
      bengkel_id: c.bengkel_id,
      model_id: c.model_id,
      keputusan_awal_tanpa_layanan: c.keputusan_awal_tanpa_layanan,
      id: id(),
      gejala: str(c.gejala),
      komponen_dicurigai: str(c.komponen_dicurigai),
      harga_komponen_dicurigai: number(c.harga_komponen_dicurigai),
      estimasi_waktu_tanpa_layanan_jam: number(
        c.estimasi_waktu_tanpa_layanan_jam,
      ),
    });
    return s;
  }
  if (a.type === "scenario") {
    const n = number(a.scenario);
    if (![1, 2, 3, 4, 5].includes(n)) throw Error("Skenario tidak valid.");
    const p = s.komponen.find((p) => p.id === (n === 5 ? "p9" : "p1"))!;
    s.kasus.push({
      id: `S${n}-${id().slice(0, 8)}`,
      bengkel_id: "b1",
      model_id: p.model_kompatibel[0],
      gejala: n === 5 ? "Port tidak mengisi daya" : "Perangkat tidak menyala",
      komponen_dicurigai: p.jenis_komponen,
      harga_komponen_dicurigai: p.harga_baru,
      keputusan_awal_tanpa_layanan: "beli_langsung",
      estimasi_waktu_tanpa_layanan_jam: 5,
    });
    return s;
  }
  if (a.type === "reserve") {
    const p = s.komponen.find((p) => p.id === a.partId),
      c = s.kasus.find((c) => c.id === a.caseId);
    if (!p || !c) throw Error("Kasus atau komponen tidak ditemukan.");
    if (
      s.peminjaman.some((l) => l.kasus_id === c.id && l.status !== "dibatalkan")
    )
      throw Error("Kasus sudah memiliki peminjaman; buat kasus lanjutan.");
    assertBorrow(p, c, s.peminjaman);
    if (!procedureFor(s, p.jenis_komponen, c.model_id))
      throw Error("Prosedur untuk komponen ini belum tersedia.");
    const distance = Math.abs(
      s.bengkel.find((w) => w.id === c.bengkel_id)!.km -
        s.bengkel.find((w) => w.id === p.pemilik_bengkel_id)!.km,
    );
    if (
      !feasible(
        c.harga_komponen_dicurigai,
        config.biayaPenggunaan,
        distance * config.ongkosPerKm,
      ) &&
      a.ack !== true
    )
      throw Error(
        "Layanan tidak layak untuk kasus ini. Konfirmasi peringatan biaya terlebih dahulu.",
      );
    s.peminjaman.push({
      id: id(),
      kasus_id: c.id,
      komponen_id: p.id,
      peminjam: c.bengkel_id,
      pemilik: p.pemilik_bengkel_id,
      tanggal_pinjam: new Date().toISOString(),
      tanggal_jatuh_tempo: new Date(
        Date.now() + config.durasiPinjamJam * 3600000,
      ).toISOString(),
      biaya_penggunaan: config.biayaPenggunaan,
      ongkos_antar: distance * config.ongkosPerKm,
      deposit: p.harga_baru * config.depositPersen,
      biaya_risiko: 0,
      status: "dipesan",
    });
    p.status_ketersediaan = "dipinjam";
    return s;
  }
  if (a.type === "quality") {
    const d = s.hasil.find((d) => d.id === a.id);
    if (
      !d ||
      ![
        "komponen_dicurigai_sehat",
        "komponen_dicurigai_rusak",
        "tidak_pasti",
      ].includes(String(a.correction))
    )
      throw Error("Koreksi tidak valid.");
    d.koreksi = a.correction as Diagnosis["kesimpulan"];
    d.diagnosis_meleset = d.koreksi !== d.kesimpulan;
    return s;
  }
  if (a.type === "certify") {
    const p = s.komponen.find((p) => p.id === a.partId);
    if (
      !p ||
      health(p) === "pensiun" ||
      s.peminjaman.some((l) => l.komponen_id === p.id && active(l)) ||
      s.sengketa.some(
        (d) =>
          d.status === "terbuka" &&
          s.peminjaman.find((l) => l.id === d.peminjaman_id)?.komponen_id ===
            p.id,
      )
    )
      throw Error(
        "Tidak dapat sertifikasi: masih aktif, sengketa terbuka, atau pensiun.",
      );
    if (a.passed !== true) throw Error("Uji fungsi harus lulus.");
    p.status_kesehatan = "teruji";
    p.pinjam_sejak_uji = 0;
    p.tanggal_uji_terakhir = new Date().toISOString();
    return s;
  }
  const l = s.peminjaman.find((l) => l.id === a.loanId);
  if (!l) throw Error("Peminjaman tidak ditemukan.");
  const p = s.komponen.find((p) => p.id === l.komponen_id)!;
  if (a.type === "cancel") {
    Object.assign(l, transition(l, "dibatalkan"));
    p.status_ketersediaan = "tersedia";
  } else if (a.type === "pickup") {
    if (health(p) !== "teruji")
      throw Error(
        "Masa uji komponen sudah habis. Batalkan reservasi dan lakukan uji ulang sebelum serah terima.",
      );
    Object.assign(l, transition(l, "dipinjam", a.evidence as Evidence));
    p.jumlah_pinjam++;
    p.pinjam_sejak_uji++;
  } else if (a.type === "begin")
    Object.assign(l, transition(l, "sedang_diuji"));
  else if (a.type === "diagnose") {
    if (
      l.status !== "sedang_diuji" ||
      s.hasil.some((d) => d.peminjaman_id === l.id)
    )
      throw Error("Diagnosis tidak dapat dicatat pada status ini.");
    const answers = a.answers as Answer[];
    if (
      !Array.isArray(answers) ||
      answers.length !== 3 ||
      answers.some((v) => !["lulus", "gagal", "tidak_bisa_dinilai"].includes(v))
    )
      throw Error("Lengkapi tiga langkah pemeriksaan.");
    const change = a.change as Diagnosis["perubahan"];
    if (!["membaik", "tetap", "tidak_jelas"].includes(change))
      throw Error("Perubahan perilaku wajib.");
    const c = s.kasus.find((c) => c.id === l.kasus_id)!;
    if (p.jenis_komponen !== c.komponen_dicurigai)
      throw Error(
        "Jenis pembanding berbeda dari dugaan kasus. Diagnosis tidak boleh disimpulkan.",
      );
    const pr = procedureFor(s, p.jenis_komponen, c.model_id);
    if (!pr) throw Error("Prosedur tidak ditemukan.");
    s.hasil.push({
      id: id(),
      peminjaman_id: l.id,
      prosedur_id: pr.id,
      hasil: answers,
      perubahan: change,
      ...conclude(answers, change),
      keputusan_akhir: str(a.decision),
      waktu_diagnosis_jam: number(a.hours),
    });
  } else if (a.type === "return") {
    if (!s.hasil.some((d) => d.peminjaman_id === l.id))
      throw Error("Catat hasil diagnosis sebelum mengembalikan.");
    Object.assign(l, transition(l, "dikembalikan", a.evidence as Evidence));
  } else if (a.type === "inspect")
    Object.assign(l, transition(l, "diperiksa_ulang"));
  else if (a.type === "retest") {
    if (l.status !== "diperiksa_ulang" || typeof a.passed !== "boolean")
      throw Error("Uji ulang hanya pada tahap diperiksa ulang.");
    const damaged =
      !l.bukti_kondisi_kembali?.fisik ||
      !l.bukti_kondisi_kembali?.fungsi ||
      !l.bukti_kondisi_kembali?.kelengkapan;
    l.uji_ulang = a.passed;
    const failed = !a.passed || damaged;
    Object.assign(l, transition(l, failed ? "sengketa" : "selesai"));
    p.status_kesehatan = failed
      ? p.jumlah_pinjam >= config.batasPensiun
        ? "pensiun"
        : "perlu_uji_ulang"
      : "teruji";
    if (!failed) {
      p.pinjam_sejak_uji = 0;
      p.tanggal_uji_terakhir = new Date().toISOString();
      p.status_kesehatan = health(p);
    }
    p.status_ketersediaan = "tersedia";
    if (failed)
      s.sengketa.push({
        id: id(),
        peminjaman_id: l.id,
        jenis: "tidak_jelas",
        status: "terbuka",
        keputusan:
          "Bukti kondisi berubah atau uji ulang gagal. Pilih penyebab berdasarkan bukti.",
      });
  } else if (a.type === "settle") {
    const d = s.sengketa.find((d) => d.peminjaman_id === l.id);
    const kind = a.kind as Dispute["jenis"];
    if (!d || d.status !== "terbuka" || !Object.hasOwn(config.tanggungan, kind))
      throw Error("Sengketa/penyebab tidak valid.");
    d.jenis = kind;
    d.status = "diputuskan";
    l.sengketa_diputuskan = true;
    l.biaya_risiko = Math.round(l.deposit * config.tanggungan[kind]);
    d.keputusan = `Peminjam menanggung ${config.tanggungan[kind] * 100}% dari batas deposit: Rp${l.biaya_risiko}. Sisa risiko ditanggung pemilik/pengelola.`;
  } else throw Error("Aksi tidak dikenal.");
  return s;
}
