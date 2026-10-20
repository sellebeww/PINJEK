import { config } from "./config";
import type {
  Answer,
  Case,
  Conclusion,
  Diagnosis,
  Evidence,
  Loan,
  Part,
  State,
  Status,
} from "./types";
export const active = (l: Loan) =>
  !["selesai", "sengketa", "dibatalkan"].includes(l.status);
export function health(p: Part, now = new Date()): Part["status_kesehatan"] {
  if (
    p.status_kesehatan === "pensiun" ||
    p.jumlah_pinjam >= config.batasPensiun
  )
    return "pensiun";
  if (
    !Number.isFinite(+new Date(p.tanggal_uji_terakhir)) ||
    +new Date(p.tanggal_uji_terakhir) > +now ||
    p.status_kesehatan === "perlu_uji_ulang" ||
    p.pinjam_sejak_uji >= config.batasPinjamSejakUji ||
    (+now - +new Date(p.tanggal_uji_terakhir)) / 86400000 >
      config.batasUmurUjiHari
  )
    return "perlu_uji_ulang";
  return "teruji";
}
export function assertBorrow(
  p: Part,
  c: Case,
  loans: Loan[],
  now = new Date(),
) {
  if (!p.model_kompatibel.includes(c.model_id))
    throw Error("Komponen tidak kompatibel dengan model kasus.");
  if (p.jenis_komponen !== c.komponen_dicurigai)
    throw Error(
      "Jenis komponen pembanding harus sama dengan komponen yang dicurigai. Buat kasus lanjutan untuk menguji dugaan lain.",
    );
  const occupied = loans.find((l) => l.komponen_id === p.id && active(l));
  if (occupied)
    throw Error(
      `Komponen sedang dipinjam/dipesan. Jadwal kosong terdekat (perkiraan): ${occupied.tanggal_jatuh_tempo}. Menunggu pemeriksaan pemilik.`,
    );
  if (health(p, now) !== "teruji")
    throw Error(
      "Komponen harus diuji ulang atau sudah pensiun; belum dapat dipinjam.",
    );
}
const next: Record<Status, Status[]> = {
  dipesan: ["dipinjam", "dibatalkan"],
  dipinjam: ["sedang_diuji"],
  sedang_diuji: ["dikembalikan"],
  dikembalikan: ["diperiksa_ulang"],
  diperiksa_ulang: ["selesai", "sengketa"],
  selesai: [],
  sengketa: [],
  dibatalkan: [],
};
export function transition(l: Loan, target: Status, evidence?: Evidence): Loan {
  if (
    evidence &&
    (typeof evidence.foto !== "string" ||
      typeof evidence.catatan !== "string" ||
      [evidence.fisik, evidence.fungsi, evidence.kelengkapan].some(
        (v) => typeof v !== "boolean",
      ))
  )
    throw Error("Format bukti kondisi tidak valid.");
  if (!next[l.status].includes(target))
    throw Error(`Transisi ${l.status} → ${target} tidak sah.`);
  if (
    target === "dipinjam" &&
    (!evidence ||
      !evidence.fisik ||
      !evidence.fungsi ||
      !evidence.kelengkapan ||
      !evidence.foto.trim())
  )
    throw Error(
      "Bukti awal wajib: semua checklist lolos dan nama berkas foto.",
    );
  if (target === "dikembalikan" && (!evidence || !evidence.foto.trim()))
    throw Error("Bukti kondisi kembali dan foto wajib.");
  if (target === "selesai" && l.uji_ulang !== true)
    throw Error("Uji ulang harus lulus sebelum selesai.");
  return {
    ...l,
    status: target,
    ...(target === "dipinjam"
      ? { bukti_kondisi_awal: evidence }
      : target === "dikembalikan"
        ? { bukti_kondisi_kembali: evidence }
        : {}),
  };
}
export function conclude(answers: Answer[], change: Diagnosis["perubahan"]) {
  let kesimpulan: Conclusion = "tidak_pasti";
  // Langkah 1 dan 2 merupakan kontrol; langkah 3 menguji hilangnya gejala.
  if (
    answers.length === 3 &&
    answers[0] === "lulus" &&
    answers[1] === "lulus"
  ) {
    if (answers[2] === "lulus" && change === "membaik")
      kesimpulan = "komponen_dicurigai_rusak";
    if (answers[2] === "gagal" && change === "tetap")
      kesimpulan = "komponen_dicurigai_sehat";
  }
  return {
    kesimpulan,
    keyakinan:
      kesimpulan === "tidak_pasti" ? ("rendah" as const) : ("tinggi" as const),
    saran:
      kesimpulan === "tidak_pasti"
        ? "Ulangi kontrol pemasangan dan suplai, lalu uji komponen pembanding lain. Jangan membeli berdasarkan hasil ini."
        : kesimpulan === "komponen_dicurigai_sehat"
          ? "Periksa komponen lain pada jalur yang sama sebelum membeli pengganti."
          : "Kerusakan terkonfirmasi dalam simulasi; dokumentasikan sebelum mengganti.",
  };
}
export const feasible = (price: number, fee: number, delivery: number) =>
  fee + delivery <= price;
export function impact(c: Case, l: Loan, d: Diagnosis) {
  const valid =
    !d.diagnosis_meleset && (!d.koreksi || d.koreksi === d.kesimpulan);
  const avoided =
    valid &&
    c.keputusan_awal_tanpa_layanan !== "tidak_tahu" &&
    d.kesimpulan === "komponen_dicurigai_sehat"
      ? c.harga_komponen_dicurigai
      : 0;
  const cost = l.biaya_penggunaan + l.ongkos_antar + l.biaya_risiko;
  const time = c.estimasi_waktu_tanpa_layanan_jam - d.waktu_diagnosis_jam;
  return {
    avoided,
    cost,
    time,
    net: avoided + time * config.nilaiJamTeknisi - cost,
  };
}
export function recommendations(s: State, c: Case) {
  const w = s.bengkel.find((w) => w.id === c.bengkel_id)!;
  return s.komponen
    .filter(
      (p) =>
        p.model_kompatibel.includes(c.model_id) &&
        p.jenis_komponen === c.komponen_dicurigai,
    )
    .map((p) => ({
      ...p,
      health: health(p),
      available:
        health(p) === "teruji" &&
        !s.peminjaman.some((l) => l.komponen_id === p.id && active(l)),
      distance: Math.abs(
        w.km - s.bengkel.find((w) => w.id === p.pemilik_bengkel_id)!.km,
      ),
      relevant:
        p.jenis_komponen === c.komponen_dicurigai ||
        c.gejala.toLowerCase().includes(p.jenis_komponen.toLowerCase()),
    }))
    .sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        Number(b.relevant) - Number(a.relevant) ||
        a.distance - b.distance ||
        +new Date(b.tanggal_uji_terakhir) - +new Date(a.tanggal_uji_terakhir),
    );
}
export function comparison(c: Case, l: Loan, d: Diagnosis) {
  const m = impact(c, l, d);
  const planned = c.keputusan_awal_tanpa_layanan !== "tidak_tahu";
  const effective = d.koreksi ?? d.kesimpulan;
  const replacement =
    effective === "komponen_dicurigai_rusak" ? c.harga_komponen_dicurigai : 0;
  const provisional =
    effective === "tidak_pasti" ||
    active(l) ||
    (l.status === "sengketa" && !l.sengketa_diputuskan);
  const biasa =
    (planned ? c.harga_komponen_dicurigai : 0) +
    c.estimasi_waktu_tanpa_layanan_jam * config.nilaiJamTeknisi;
  const uji =
    m.cost + replacement + d.waktu_diagnosis_jam * config.nilaiJamTeknisi;
  const kenalan =
    config.kenalan.ketersediaan *
      (config.kenalan.biaya +
        replacement +
        config.kenalan.waktuJam * config.nilaiJamTeknisi) +
    (1 - config.kenalan.ketersediaan) * biasa;
  return {
    provisional,
    biasa,
    uji,
    kenalan,
    hemat: biasa - uji,
    waktuBiasa: c.estimasi_waktu_tanpa_layanan_jam,
    waktuUji: d.waktu_diagnosis_jam,
    waktuKenalan:
      config.kenalan.ketersediaan * config.kenalan.waktuJam +
      (1 - config.kenalan.ketersediaan) * c.estimasi_waktu_tanpa_layanan_jam,
  };
}

export function procedureFor(s: State, kind: string, model: string) {
  return (
    s.prosedur.find((p) => p.jenis_komponen === kind && p.model_id === model) ??
    s.prosedur.find((p) => p.jenis_komponen === kind && !p.model_id)
  );
}
