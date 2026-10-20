import { describe, it, expect } from "vitest";
import { seed, cleanEvidence } from "../src/data/seed";
import {
  assertBorrow,
  transition,
  conclude,
  impact,
  feasible,
  health,
  comparison,
} from "../src/domain/engine";
import { apply } from "../src/domain/actions";
import { config } from "../src/domain/config";
describe("aturan inti", () => {
  it("menolak peminjaman ganda dan memberi jadwal", () => {
    const s = seed();
    s.peminjaman[0].status = "dipesan";
    expect(() => assertBorrow(s.komponen[0], s.kasus[0], s.peminjaman)).toThrow(
      "Jadwal kosong",
    );
  });
  it("menolak model tidak kompatibel", () => {
    const s = seed();
    expect(() =>
      assertBorrow(s.komponen[0], { ...s.kasus[0], model_id: "P1" }, []),
    ).toThrow("kompatibel");
  });
  it("menolak transisi ilegal", () =>
    expect(() =>
      transition(seed().peminjaman[0], "dipinjam", cleanEvidence),
    ).toThrow("tidak sah"));
  it("mewajibkan bukti awal", () =>
    expect(() =>
      transition({ ...seed().peminjaman[0], status: "dipesan" }, "dipinjam"),
    ).toThrow("Bukti awal"));
  it("hasil tidak dinilai menjadi tidak pasti", () =>
    expect(
      conclude(["lulus", "tidak_bisa_dinilai", "lulus"], "membaik").kesimpulan,
    ).toBe("tidak_pasti"));
  it("hasil bertentangan menjadi tidak pasti", () =>
    expect(conclude(["lulus", "lulus", "gagal"], "membaik").kesimpulan).toBe(
      "tidak_pasti",
    ));
  it("S1 rusak terkonfirmasi", () =>
    expect(conclude(["lulus", "lulus", "lulus"], "membaik").kesimpulan).toBe(
      "komponen_dicurigai_rusak",
    ));
  it("S2 sehat terkonfirmasi", () =>
    expect(conclude(["lulus", "lulus", "gagal"], "tetap").kesimpulan).toBe(
      "komponen_dicurigai_sehat",
    ));
  it("tidak tahu tidak mengklaim pembelian dihindari", () => {
    const s = seed();
    expect(
      impact(
        { ...s.kasus[0], keputusan_awal_tanpa_layanan: "tidak_tahu" },
        s.peminjaman[0],
        { ...s.hasil[0], kesimpulan: "komponen_dicurigai_sehat" },
      ).avoided,
    ).toBe(0);
  });
  it("S5 biaya tidak layak", () =>
    expect(feasible(45000, 25000, 60000)).toBe(false));
  it("pensiun otomatis", () =>
    expect(
      health({ ...seed().komponen[0], jumlah_pinjam: config.batasPensiun }),
    ).toBe("pensiun"));
  it("umur uji memblokir pinjam", () =>
    expect(
      health({ ...seed().komponen[0], tanggal_uji_terakhir: "2020-01-01" }),
    ).toBe("perlu_uji_ulang"));
  it("batas siklus memblokir pinjam", () =>
    expect(health({ ...seed().komponen[0], pinjam_sejak_uji: 8 })).toBe(
      "perlu_uji_ulang",
    ));
  it("S4 gagal uji ulang membuka sengketa", () => {
    const s = seed();
    s.peminjaman[0].status = "diperiksa_ulang";
    apply(s, { type: "retest", loanId: s.peminjaman[0].id, passed: false });
    expect(s.peminjaman[0].status).toBe("sengketa");
    expect(s.komponen[0].status_kesehatan).toBe("perlu_uji_ulang");
    expect(s.sengketa).toHaveLength(2);
  });
  it("deposit bukan biaya sebelum potongan", () => {
    const s = seed();
    expect(impact(s.kasus[0], s.peminjaman[0], s.hasil[0]).cost).toBe(85000);
  });
  it("koreksi menghapus klaim pembelian dihindari", () => {
    const s = seed();
    expect(impact(s.kasus[1], s.peminjaman[1], s.hasil[1]).avoided).toBe(0);
  });
  it("evaluasi tetap menampilkan kasus lebih mahal", () => {
    const s = seed();
    expect(
      s.kasus.some(
        (c, i) => comparison(c, s.peminjaman[i], s.hasil[i]).hemat < 0,
      ),
    ).toBe(true);
  });
});

describe("alur skenario lengkap", () => {
  for (const n of [1, 2, 3, 4, 5])
    it(`S${n}: kasus sampai akhir`, () => {
      let s = seed();
      s = apply(s, { type: "scenario", scenario: n });
      const c = s.kasus.at(-1)!;
      if (n === 5)
        expect(() =>
          apply(s, { type: "reserve", caseId: c.id, partId: "p9" }),
        ).toThrow("tidak layak");
      s = apply(s, {
        type: "reserve",
        caseId: c.id,
        partId: n === 5 ? "p9" : "p1",
        ack: true,
      });
      const l = s.peminjaman.at(-1)!;
      apply(s, { type: "pickup", loanId: l.id, evidence: cleanEvidence });
      apply(s, { type: "begin", loanId: l.id });
      apply(s, {
        type: "diagnose",
        loanId: l.id,
        answers:
          n === 3
            ? ["lulus", "tidak_bisa_dinilai", "lulus"]
            : n === 2
              ? ["lulus", "lulus", "gagal"]
              : ["lulus", "lulus", "lulus"],
        change: n === 2 ? "tetap" : "membaik",
        decision: "Tindakan uji",
        hours: 1,
      });
      const d = s.hasil.at(-1)!;
      expect(d.kesimpulan).toBe(
        n === 3
          ? "tidak_pasti"
          : n === 2
            ? "komponen_dicurigai_sehat"
            : "komponen_dicurigai_rusak",
      );
      expect(impact(c, l, d).avoided).toBe(
        n === 2 ? c.harga_komponen_dicurigai : 0,
      );
      apply(s, { type: "return", loanId: l.id, evidence: cleanEvidence });
      apply(s, { type: "inspect", loanId: l.id });
      apply(s, { type: "retest", loanId: l.id, passed: n !== 4 });
      expect(l.status).toBe(n === 4 ? "sengketa" : "selesai");
      if (n === 4) {
        apply(s, { type: "settle", loanId: l.id, kind: "rusak_saat_dipakai" });
        expect(l.biaya_risiko).toBe(l.deposit);
        expect(s.komponen[0].status_kesehatan).toBe("perlu_uji_ulang");
      }
    });
});
