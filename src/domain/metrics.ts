import { config } from "./config";
import { comparison, impact } from "./engine";
import type { Diagnosis, Loan, State } from "./types";

export function accuracy(diagnoses: Diagnosis[]) {
  // Hasil yang masih tidak pasti bukan ground truth untuk mengukur akurasi.
  const reviewed = diagnoses.filter(
    (d) => d.koreksi && d.koreksi !== "tidak_pasti",
  );
  const correct = reviewed.filter((d) => d.koreksi === d.kesimpulan).length;
  return {
    reviewed: reviewed.length,
    correct,
    percent: reviewed.length ? (correct / reviewed.length) * 100 : null,
  };
}

export function damageRate(loans: Loan[]) {
  const inspected = loans.filter((l) => typeof l.uji_ulang === "boolean");
  const damaged = inspected.filter(
    (l) =>
      l.uji_ulang === false ||
      (l.bukti_kondisi_kembali &&
        (!l.bukti_kondisi_kembali.fisik ||
          !l.bukti_kondisi_kembali.fungsi ||
          !l.bukti_kondisi_kembali.kelengkapan)),
  );
  return {
    inspected: inspected.length,
    damaged: damaged.length,
    percent: inspected.length
      ? (damaged.length / inspected.length) * 100
      : null,
  };
}

export function evaluationRecords(s: State) {
  return s.hasil.flatMap((d) => {
    const l = s.peminjaman.find((l) => l.id === d.peminjaman_id);
    const c = s.kasus.find((c) => c.id === l?.kasus_id);
    if (!l || !c) return [];
    return [{ d, l, c, m: impact(c, l, d), compare: comparison(c, l, d) }];
  });
}

export function evaluationCsv(s: State) {
  const rows: (string | number)[][] = [
    [
      "Kasus",
      "Bengkel",
      "Komponen",
      "Kesimpulan awal",
      "Koreksi",
      "Status evaluasi",
      "Biaya biasa Rp",
      "Biaya kenalan Rp",
      "Biaya PINJEK Rp",
      "Selisih Rp",
      "Waktu biasa jam",
      "Waktu kenalan jam",
      "Waktu PINJEK jam",
    ],
  ];
  for (const { c, d, compare: v } of evaluationRecords(s))
    rows.push([
      c.id,
      s.bengkel.find((w) => w.id === c.bengkel_id)?.nama || "",
      c.komponen_dicurigai,
      d.kesimpulan,
      d.koreksi || "",
      v.provisional ? "Sementara" : "Final",
      v.biasa,
      v.kenalan,
      v.uji,
      v.hemat,
      v.waktuBiasa,
      v.waktuKenalan,
      v.waktuUji,
    ]);
  // Escape sel CSV dan netralkan formula jika berkas dibuka di spreadsheet.
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const raw = String(value);
            const safe =
              typeof value === "string" && /^[\s]*[=+@\-]/.test(raw)
                ? "'" + raw
                : raw;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}

export function dashboardSummary(s: State, workshopId?: string) {
  const records = evaluationRecords(s).filter(
    (r) => !workshopId || r.c.bengkel_id === workshopId,
  );
  const incurred = s.peminjaman.filter(
    (l) =>
      (!workshopId || l.peminjam === workshopId) &&
      !["dipesan", "dibatalkan"].includes(l.status),
  );
  const avoided = records.reduce((sum, r) => sum + r.m.avoided, 0);
  const actual = records.reduce((sum, r) => sum + r.d.waktu_diagnosis_jam, 0);
  const baseline = records.reduce(
    (sum, r) => sum + r.c.estimasi_waktu_tanpa_layanan_jam,
    0,
  );
  const cost = incurred.reduce(
    (sum, l) => sum + l.biaya_penggunaan + l.ongkos_antar + l.biaya_risiko,
    0,
  );
  return {
    avoided,
    actual,
    baseline,
    cost,
    net: avoided + (baseline - actual) * config.nilaiJamTeknisi - cost,
  };
}
