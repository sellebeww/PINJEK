export type Health = "teruji" | "perlu_uji_ulang" | "pensiun";
export type Status =
  | "dipesan"
  | "dipinjam"
  | "sedang_diuji"
  | "dikembalikan"
  | "diperiksa_ulang"
  | "selesai"
  | "sengketa"
  | "dibatalkan";
export type Answer = "lulus" | "gagal" | "tidak_bisa_dinilai";
export type Conclusion =
  "komponen_dicurigai_rusak" | "komponen_dicurigai_sehat" | "tidak_pasti";
export interface Workshop {
  id: string;
  nama: string;
  zona: string;
  km: number;
  peran: string[];
}
export interface Device {
  id: string;
  merek: string;
  nama_model: string;
  kategori: string;
}
export interface Part {
  id: string;
  kode_unit: string;
  jenis_komponen: string;
  model_kompatibel: string[];
  pemilik_bengkel_id: string;
  harga_baru: number;
  status_kesehatan: Health;
  jumlah_pinjam: number;
  pinjam_sejak_uji: number;
  tanggal_uji_terakhir: string;
  status_ketersediaan: "tersedia" | "dipinjam";
}
export interface Case {
  id: string;
  bengkel_id: string;
  model_id: string;
  gejala: string;
  komponen_dicurigai: string;
  harga_komponen_dicurigai: number;
  keputusan_awal_tanpa_layanan: "beli_langsung" | "coba_ganti" | "tidak_tahu";
  estimasi_waktu_tanpa_layanan_jam: number;
}
export interface Evidence {
  fisik: boolean;
  fungsi: boolean;
  kelengkapan: boolean;
  catatan: string;
  foto: string;
}
export interface Loan {
  id: string;
  kasus_id: string;
  komponen_id: string;
  peminjam: string;
  pemilik: string;
  tanggal_pinjam: string;
  tanggal_jatuh_tempo: string;
  bukti_kondisi_awal?: Evidence;
  bukti_kondisi_kembali?: Evidence;
  biaya_penggunaan: number;
  ongkos_antar: number;
  deposit: number;
  biaya_risiko: number;
  status: Status;
  sengketa_diputuskan?: boolean;
  uji_ulang?: boolean;
}
export interface Procedure {
  id: string;
  jenis_komponen: string;
  model_id?: string;
  langkah: {
    instruksi: string;
    hasil_yang_diharapkan: string;
    tipe_input: "pilihan";
  }[];
}
export interface Diagnosis {
  id: string;
  peminjaman_id: string;
  prosedur_id: string;
  hasil: Answer[];
  perubahan: "membaik" | "tetap" | "tidak_jelas";
  kesimpulan: Conclusion;
  keyakinan: "tinggi" | "sedang" | "rendah";
  saran: string;
  keputusan_akhir: string;
  waktu_diagnosis_jam: number;
  koreksi?: Conclusion;
  diagnosis_meleset?: boolean;
}
export interface Dispute {
  id: string;
  peminjaman_id: string;
  jenis: "rusak_saat_dipakai" | "rusak_di_perjalanan" | "tidak_jelas";
  status: "terbuka" | "diputuskan";
  keputusan: string;
}
export interface State {
  revision: number;
  bengkel: Workshop[];
  model: Device[];
  komponen: Part[];
  kasus: Case[];
  peminjaman: Loan[];
  prosedur: Procedure[];
  hasil: Diagnosis[];
  sengketa: Dispute[];
}
