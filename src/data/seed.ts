import type { State, Evidence, Answer } from "../domain/types";
import { config } from "../domain/config";
import { conclude } from "../domain/engine";
export const cleanEvidence: Evidence = {
  fisik: true,
  fungsi: true,
  kelengkapan: true,
  catatan: "Segel utuh, konektor bersih; fungsi normal.",
  foto: "kondisi-teruji.jpg",
};
export function seed(): State {
  const now = new Date();
  const date = (days: number) => new Date(+now - days * 86400000).toISOString();
  const kinds = [
    "Adaptor",
    "RAM",
    "Baterai laptop",
    "SSD",
    "Power supply",
    "T-con",
    "LCD",
    "Baterai ponsel",
    "Flex charger",
    "Adaptor",
  ];
  const prices = [
    250000, 350000, 650000, 550000, 450000, 300000, 750000, 180000, 45000,
    250000,
  ];
  const s: State = {
    revision: 0,
    bengkel: [
      {
        id: "b1",
        nama: "Bengkel Sinar Elektronik",
        zona: "Cicendo, Bandung",
        km: 0,
        peran: ["peminjam", "pemilik"],
      },
      {
        id: "b2",
        nama: "Bengkel Arus Baik",
        zona: "Antapani, Bandung",
        km: 12,
        peran: ["peminjam", "pemilik"],
      },
    ],
    model: [
      {
        id: "L1",
        merek: "Lenovo",
        nama_model: "ThinkPad T480",
        kategori: "Laptop",
      },
      {
        id: "T1",
        merek: "Samsung",
        nama_model: "LED 32 J4005",
        kategori: "TV LED",
      },
      {
        id: "P1",
        merek: "Xiaomi",
        nama_model: "Redmi Note 8",
        kategori: "Ponsel",
      },
    ],
    komponen: [],
    kasus: [],
    peminjaman: [],
    prosedur: [],
    hasil: [],
    sengketa: [],
  };
  s.komponen = kinds.map((kind, i) => ({
    id: `p${i + 1}`,
    kode_unit: `UG-${String(i + 1).padStart(3, "0")}`,
    jenis_komponen: kind,
    model_kompatibel: [i < 4 || i === 9 ? "L1" : i < 6 ? "T1" : "P1"],
    pemilik_bengkel_id: i % 2 ? "b1" : "b2",
    harga_baru: prices[i],
    status_kesehatan: "teruji",
    jumlah_pinjam: 3,
    pinjam_sejak_uji: 0,
    tanggal_uji_terakhir: date(i % 5),
    status_ketersediaan: "tersedia",
  }));
  s.prosedur = [...new Set(kinds)].map((kind, i) => ({
    id: `pr${i}`,
    jenis_komponen: kind,
    langkah: [
      {
        instruksi: `Pastikan ${kind} kompatibel, suplai aman, dan gejala awal dapat direproduksi.`,
        hasil_yang_diharapkan: "Model cocok, suplai normal, gejala terulang.",
        tipe_input: "pilihan",
      },
      {
        instruksi:
          "Matikan daya, pasang komponen pembanding dan verifikasi konektor serta kondisi kontrol.",
        hasil_yang_diharapkan:
          "Pemasangan benar, pembanding berfungsi, kondisi uji setara.",
        tipe_input: "pilihan",
      },
      {
        instruksi: "Nyalakan dan ulangi pengujian gejala dengan pembanding.",
        hasil_yang_diharapkan:
          "Gejala hilang. Pilih gagal jika gejala tetap muncul.",
        tipe_input: "pilihan",
      },
    ],
  }));
  for (let i = 0; i < 28; i++) {
    const p = s.komponen[i % 10],
      id = `H${String(i + 1).padStart(3, "0")}`;
    s.kasus.push({
      id,
      bengkel_id: i % 2 ? "b2" : "b1",
      model_id: p.model_kompatibel[0],
      gejala: ["Tidak menyala", "Mati sesekali", "Tampilan bermasalah"][i % 3],
      komponen_dicurigai: p.jenis_komponen,
      harga_komponen_dicurigai: p.harga_baru,
      keputusan_awal_tanpa_layanan: [
        "beli_langsung",
        "coba_ganti",
        "tidak_tahu",
      ][i % 3] as "beli_langsung",
      estimasi_waktu_tanpa_layanan_jam: i % 5 === 0 ? 1 : 4 + (i % 3),
    });
    s.peminjaman.push({
      id: `l${id}`,
      kasus_id: id,
      komponen_id: p.id,
      peminjam: s.kasus[i].bengkel_id,
      pemilik: p.pemilik_bengkel_id,
      tanggal_pinjam: date(35 - i),
      tanggal_jatuh_tempo: date(33 - i),
      bukti_kondisi_awal: { ...cleanEvidence },
      bukti_kondisi_kembali: { ...cleanEvidence },
      biaya_penggunaan: 25000,
      ongkos_antar:
        Math.abs(
          s.bengkel.find((w) => w.id === s.kasus[i].bengkel_id)!.km -
            s.bengkel.find((w) => w.id === p.pemilik_bengkel_id)!.km,
        ) * config.ongkosPerKm,
      deposit: p.harga_baru * 0.2,
      biaya_risiko: i === 4 ? 45000 : 0,
      sengketa_diputuskan: i === 4,
      status: i === 4 ? "sengketa" : "selesai",
      uji_ulang: i !== 4,
    });
    const answers: Answer[] =
      i % 4 === 0
        ? ["lulus", "tidak_bisa_dinilai", "gagal"]
        : ["lulus", "lulus", i % 4 === 1 ? "gagal" : "lulus"];
    const change =
      i % 4 === 1 ? "tetap" : i % 4 === 0 ? "tidak_jelas" : "membaik";
    s.hasil.push({
      id: `d${id}`,
      peminjaman_id: `l${id}`,
      prosedur_id: s.prosedur.find(
        (pr) => pr.jenis_komponen === p.jenis_komponen,
      )!.id,
      hasil: answers,
      perubahan: change,
      ...conclude(answers, change),
      keputusan_akhir:
        i % 4 === 1 ? "Periksa jalur lain" : "Evaluasi penggantian",
      waktu_diagnosis_jam: 1 + (i % 3),
      koreksi:
        i < 7
          ? i === 1
            ? "komponen_dicurigai_rusak"
            : conclude(answers, change).kesimpulan
          : undefined,
      diagnosis_meleset: i === 1,
    });
  }
  s.sengketa.push({
    id: "seed-sengketa",
    peminjaman_id: "lH005",
    jenis: "tidak_jelas",
    status: "diputuskan",
    keputusan:
      "Kerusakan historis: potongan Rp45.000 (50% batas deposit); unit sudah diperbaiki dan disertifikasi ulang.",
  });
  s.komponen.forEach((p) => {
    p.jumlah_pinjam = s.peminjaman.filter((l) => l.komponen_id === p.id).length;
  });
  return s;
}
