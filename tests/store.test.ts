import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createJsonStore } from "../src/data/store";
import { apply } from "../src/domain/actions";
const dirs: string[] = [];
async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "ujiganti-unit-"));
  dirs.push(dir);
  return { dir, store: createJsonStore(dir) };
}
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
describe("persistensi dan transaksi", () => {
  it("GET pertama menyimpan seed stabil", async () => {
    const { dir, store } = await setup();
    const a = await store.readState();
    const b = await store.readState();
    expect(a).toEqual(b);
    expect(
      JSON.parse(await readFile(path.join(dir, "ujiganti.json"), "utf8")),
    ).toEqual(a);
  });
  it("dua reservasi serentak hanya satu berhasil", async () => {
    const { store } = await setup();
    const s = await store.transaction((s) =>
      apply(s, { type: "scenario", scenario: 2 }),
    );
    const c = s.kasus.at(-1)!;
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        store.transaction((s) =>
          apply(s, { type: "reserve", caseId: c.id, partId: "p1" }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await store.readState()).peminjaman.filter((l) => l.kasus_id === c.id),
    ).toHaveLength(1);
  });
  it("kegagalan mutasi tidak tersimpan dan antrean tetap jalan", async () => {
    const { store } = await setup();
    await expect(
      store.transaction((s) => {
        s.kasus = [];
        throw Error("gagal");
      }),
    ).rejects.toThrow("gagal");
    expect((await store.readState()).kasus).toHaveLength(28);
    await expect(
      store.transaction((s) => apply(s, { type: "scenario", scenario: 1 })),
    ).resolves.toHaveProperty("revision", 1);
  });
  it("reset tetap menaikkan revision", async () => {
    const { store } = await setup();
    await store.transaction((s) => apply(s, { type: "scenario", scenario: 1 }));
    const reset = await store.transaction((s) => apply(s, { type: "reset" }));
    expect(reset.revision).toBe(2);
  });
  it("berkas rusak tidak ditimpa seed", async () => {
    const { dir, store } = await setup();
    await writeFile(path.join(dir, "ujiganti.json"), "broken");
    await expect(store.readState()).rejects.toThrow("tidak direset");
    expect(await readFile(path.join(dir, "ujiganti.json"), "utf8")).toBe(
      "broken",
    );
  });
});
