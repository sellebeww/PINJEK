import { dashboardSummary } from "../src/domain/metrics";
import { describe, it, expect } from "vitest";
import { seed, cleanEvidence } from "../src/data/seed";
import { apply } from "../src/domain/actions";
import {
  assertBorrow,
  recommendations,
  comparison,
  procedureFor,
  health,
  active,
} from "../src/domain/engine";
import { accuracy, damageRate, evaluationCsv } from "../src/domain/metrics";

function reserved() {
  const s = seed();
  apply(s, { type: "scenario", scenario: 2 });
  const c = s.kasus.at(-1)!;
  apply(s, { type: "reserve", caseId: c.id, partId: "p1" });
  return { s, c, l: s.peminjaman.at(-1)!, p: s.komponen[0] };
}
describe("regresi audit bisnis", () => {
  it("menolak jenis berbeda meskipun model sama", () => {
    const s = seed();
    expect(() => assertBorrow(s.komponen[1], s.kasus[0], [])).toThrow(
      "Jenis komponen",
    );
  });
  it("rekomendasi hanya pembanding sesuai dugaan", () => {
    const s = seed();
    expect(
      recommendations(s, s.kasus[0]).every(
        (p) => p.jenis_komponen === "Adaptor",
      ),
    ).toBe(true);
  });
  it("menolak kasus dengan jenis yang tidak tersedia pada model", () => {
    const s = seed();
    expect(() =>
      apply(s, {
        type: "case",
        case: { ...s.kasus[0], komponen_dicurigai: "LCD" },
      }),
    ).toThrow("model");
  });
  it("jenis komponen kasus tidak menerima field tambahan pengguna", () => {
    const s = seed();
    apply(s, { type: "case", case: { ...s.kasus[0], admin: true } });
    expect(s.kasus.at(-1)).not.toHaveProperty("admin");
  });
  it("reservasi dapat dibatalkan dan dipesan kembali tanpa biaya", () => {
    const { s, c, l, p } = reserved();
    const count = p.jumlah_pinjam;
    apply(s, { type: "cancel", loanId: l.id });
    expect(active(l)).toBe(false);
    expect(p.jumlah_pinjam).toBe(count);
    apply(s, { type: "reserve", caseId: c.id, partId: p.id });
    expect(s.peminjaman.at(-1)!.status).toBe("dipesan");
  });
  it("pinjaman yang sudah diserahkan tidak bisa dibatalkan", () => {
    const { s, l } = reserved();
    apply(s, { type: "pickup", loanId: l.id, evidence: cleanEvidence });
    expect(() => apply(s, { type: "cancel", loanId: l.id })).toThrow(
      "tidak sah",
    );
  });
  it("serah terima memeriksa ulang masa uji sejak reservasi", () => {
    const { s, l, p } = reserved();
    p.tanggal_uji_terakhir = "2020-01-01";
    expect(() =>
      apply(s, { type: "pickup", loanId: l.id, evidence: cleanEvidence }),
    ).toThrow("Masa uji");
    expect(l.status).toBe("dipesan");
  });
  it("tanggal uji invalid dan masa depan masuk karantina", () => {
    const p = seed().komponen[0];
    expect(health({ ...p, tanggal_uji_terakhir: "invalid" })).toBe(
      "perlu_uji_ulang",
    );
    expect(health({ ...p, tanggal_uji_terakhir: "2099-01-01" })).toBe(
      "perlu_uji_ulang",
    );
  });
  it("prosedur model spesifik didahulukan atas prosedur umum", () => {
    const s = seed();
    s.prosedur.push({ ...s.prosedur[0], id: "specific", model_id: "L1" });
    expect(procedureFor(s, "Adaptor", "L1")?.id).toBe("specific");
  });
  it("koreksi sehat menghapus biaya pembelian dari evaluasi", () => {
    const s = seed();
    const d = {
      ...s.hasil[2],
      koreksi: "komponen_dicurigai_sehat" as const,
      diagnosis_meleset: true,
    };
    const v = comparison(s.kasus[2], s.peminjaman[2], d);
    expect(v.uji).toBe(25000 + 60000 + d.waktu_diagnosis_jam * 50000);
  });
  it("hasil tidak pasti ditandai sementara", () => {
    const s = seed();
    expect(
      comparison(s.kasus[0], s.peminjaman[0], s.hasil[0]).provisional,
    ).toBe(true);
  });
  it("pinjaman aktif tidak dimasukkan hasil evaluasi final", () => {
    const s = seed();
    expect(
      comparison(
        s.kasus[2],
        { ...s.peminjaman[2], status: "sedang_diuji" },
        s.hasil[2],
      ).provisional,
    ).toBe(true);
  });
  it("tinjauan tidak pasti bukan hasil akurat", () => {
    const s = seed();
    expect(
      accuracy([{ ...s.hasil[0], koreksi: "tidak_pasti" }]).percent,
    ).toBeNull();
  });
  it("kerusakan fisik dihitung walaupun uji fungsi lolos; pinjaman aktif dikecualikan", () => {
    const l = seed().peminjaman[0];
    const rate = damageRate([
      {
        ...l,
        uji_ulang: true,
        bukti_kondisi_kembali: { ...cleanEvidence, fisik: false },
      },
      { ...l, status: "dipesan", uji_ulang: undefined },
    ]);
    expect(rate).toEqual({ inspected: 1, damaged: 1, percent: 100 });
  });
  it("sengketa terbuka mencegah sertifikasi", () => {
    const s = seed();
    s.peminjaman[0].status = "diperiksa_ulang";
    apply(s, { type: "retest", loanId: s.peminjaman[0].id, passed: false });
    expect(() =>
      apply(s, { type: "certify", partId: "p1", passed: true }),
    ).toThrow("sengketa");
  });
  it("potongan menggunakan deposit tersimpan, bukan harga unit yang berubah", () => {
    const s = seed();
    const l = s.peminjaman[0];
    l.status = "diperiksa_ulang";
    apply(s, { type: "retest", loanId: l.id, passed: false });
    s.komponen[0].harga_baru = 1;
    apply(s, { type: "settle", loanId: l.id, kind: "rusak_saat_dipakai" });
    expect(l.biaya_risiko).toBe(l.deposit);
    expect(l.sengketa_diputuskan).toBe(true);
  });
  it("CSV menjaga separator, kutipan, dan formula tidak dieksekusi", () => {
    const s = seed();
    s.kasus[0].komponen_dicurigai = '=HYPERLINK("evil");';
    const csv = evaluationCsv(s);
    expect(csv).toContain('"\'=HYPERLINK(""evil"");"');
    expect(csv.split("\r\n")).toHaveLength(29);
  });
  it("payload null ditolak dengan pesan terkontrol", () => {
    expect(() => apply(seed(), null as never)).toThrow("Perintah tidak valid");
  });
});

it("biaya sudah timbul saat serah terima meski diagnosis belum dicatat", () => {
  const { s, l } = reserved();
  const before = dashboardSummary(s);
  apply(s, { type: "pickup", loanId: l.id, evidence: cleanEvidence });
  const after = dashboardSummary(s);
  expect(after.cost - before.cost).toBe(l.biaya_penggunaan + l.ongkos_antar);
  expect(after.net - before.net).toBe(-(l.biaya_penggunaan + l.ongkos_antar));
});
