export const config = {
  nilaiJamTeknisi: 50000,
  batasPinjamSejakUji: 8,
  batasUmurUjiHari: 30,
  batasPensiun: 100,
  biayaPenggunaan: 25000,
  ongkosPerKm: 5000,
  depositPersen: 0.2,
  durasiPinjamJam: 48,
  tanggungan: {
    rusak_saat_dipakai: 1,
    rusak_di_perjalanan: 0,
    tidak_jelas: 0.5,
  },
  kenalan: { ketersediaan: 0.5, biaya: 15000, waktuJam: 3 },
} as const;
