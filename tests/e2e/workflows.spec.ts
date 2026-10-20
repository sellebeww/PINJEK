import { test, expect, type Page } from "@playwright/test";
const picture = {
  name: "kondisi.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=",
    "base64",
  ),
};
async function evidence(page: Page, returning = false) {
  await page.getByLabel("Fisik utuh").check();
  await page.getByLabel("Fungsi normal").check();
  await page.getByLabel("Kelengkapan dan segel").check();
  await page.getByLabel("Foto kondisi").setInputFiles(picture);
  await page
    .getByRole("button", {
      name: returning ? "Catat pengembalian" : "Konfirmasi serah terima",
    })
    .click();
}
test.beforeEach(async ({ request }) => {
  const s = await (await request.get("/api/state")).json();
  const r = await request.post("/api/state", {
    data: { type: "reset", revision: s.revision },
  });
  expect(r.ok()).toBeTruthy();
});
for (const n of [1, 2, 3, 4])
  test(`S${n} melalui formulir sampai pengembalian`, async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/app");
    await page.getByRole("button", { name: "Kasus & peminjaman" }).click();
    await page.getByRole("button", { name: new RegExp(`^S${n}`) }).click();
    await page
      .locator(".step")
      .filter({ hasText: "UG-001" })
      .getByRole("button", { name: "Pesan unit" })
      .click();
    await expect(
      page.getByRole("button", { name: "Konfirmasi serah terima" }),
    ).toBeDisabled();
    await evidence(page);
    await page.getByRole("button", { name: "Mulai prosedur" }).click();
    await page.getByLabel("Hasil langkah 1").selectOption("lulus");
    await page
      .getByLabel("Hasil langkah 2")
      .selectOption(n === 3 ? "tidak_bisa_dinilai" : "lulus");
    await page
      .getByLabel("Hasil langkah 3")
      .selectOption(n === 2 ? "gagal" : "lulus");
    await page
      .getByLabel("Perilaku perangkat")
      .selectOption(n === 2 ? "tetap" : "membaik");
    await page
      .getByLabel("Keputusan / tindak lanjut")
      .fill("Lanjutkan berdasarkan hasil uji.");
    await page.getByRole("button", { name: "Hitung & simpan" }).click();
    await expect(
      page
        .locator(".notice")
        .filter({ hasText: n === 3 ? "keyakinan rendah" : "keyakinan tinggi" }),
    ).toBeVisible();
    await evidence(page, true);
    await page.getByRole("button", { name: "Pemilik: bandingkan" }).click();
    await page
      .getByRole("button", {
        name: n === 4 ? "Uji gagal" : "Uji fungsi lulus",
        exact: n !== 4,
      })
      .click();
    if (n === 4) {
      await page
        .getByLabel("Penyebab berdasarkan bukti")
        .selectOption("rusak_saat_dipakai");
      await page
        .getByRole("button", { name: "Catat keputusan sengketa" })
        .click();
      await expect(page.getByText("Sengketa · diputuskan")).toBeVisible();
    } else
      await expect(page.getByText("Peminjaman selesai. Deposit")).toBeVisible();
    const s = await (await request.get("/api/state")).json();
    expect(s.peminjaman.at(-1).status).toBe(n === 4 ? "sengketa" : "selesai");
    expect(s.hasil.at(-1).kesimpulan).toBe(
      n === 2
        ? "komponen_dicurigai_sehat"
        : n === 3
          ? "tidak_pasti"
          : "komponen_dicurigai_rusak",
    );
    expect(errors).toEqual([]);
  });
test("S5 biaya tidak layak dan pembatalan reservasi", async ({
  page,
  request,
}) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Kasus & peminjaman" }).click();
  await page.getByRole("button", { name: /^S5/ }).click();
  await expect(page.getByRole("button", { name: "Pesan unit" })).toBeDisabled();
  await page.getByLabel("Saya memahami").check();
  await page.getByRole("button", { name: "Pesan unit" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Batalkan reservasi" }).click();
  await expect(page.getByRole("button", { name: "Pesan unit" })).toBeVisible();
  const s = await (await request.get("/api/state")).json();
  expect(s.peminjaman.at(-1).status).toBe("dibatalkan");
});
test("form kasus menyaring komponen sesuai model", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Kasus baru" }).click();
  await page.getByLabel("Model perangkat").selectOption("P1");
  await expect(
    page.getByLabel("Komponen dicurigai").locator("option"),
  ).toHaveText(["LCD", "Baterai ponsel", "Flex charger"]);
  await page.getByLabel("Komponen dicurigai").selectOption("Flex charger");
  await expect(page.getByLabel("Harga pengganti")).toHaveValue("45000");
  await page.getByLabel("Gejala").fill("Tidak mengisi daya");
  await page.getByRole("button", { name: "Simpan & cari" }).click();
  await expect(page.locator(".step")).toHaveCount(1);
  await expect(page.locator(".step")).toContainText("Flex charger");
});
test("navigasi ponsel dan ekspor CSV", async ({ page }, testInfo) => {
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Dasbor dampak", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  for (const name of [
    "Katalog komponen",
    "Kasus & peminjaman",
    "Riwayat & mutu",
    "Evaluasi",
  ]) {
    await page.getByRole("navigation").getByRole("button", { name }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor CSV" }).click();
  expect((await download).suggestedFilename()).toBe("pinjek-evaluasi.csv");
});
test("API konflik revision, payload invalid, dan origin asing", async ({
  request,
}) => {
  const s = await (await request.get("/api/state")).json();
  const a = { type: "scenario", scenario: 1, revision: s.revision };
  const results = await Promise.all([
    request.post("/api/state", { data: a }),
    request.post("/api/state", { data: a }),
  ]);
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect(
    (
      await request.post("/api/state", {
        data: null,
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/state", {
        data: a,
        headers: { origin: "https://example.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.post("/api/state", { data: "x" })).status()).toBe(415);
});
test("navigasi aplikasi ↔ profil perusahaan", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app");
  await page.getByRole("link", { name: "Profil perusahaan" }).click();
  await expect(page).toHaveURL(/:3101\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Cek dulu, baru ganti",
  );
  await page
    .getByRole("link", { name: /Buka aplikasi/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Dasbor dampak", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Tentang PINJEK" }).click();
  await expect(page).toHaveURL(/:3101\/$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
