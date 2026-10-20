import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { seed } from "./seed";
import type { State } from "../domain/types";

export class StorageError extends Error {
  constructor() {
    super(
      "Penyimpanan tidak dapat dibaca atau ditulis. Periksa berkas data dan ruang disk; data tidak direset otomatis.",
    );
  }
}

export function createJsonStore(dir: string) {
  const file = path.join(dir, "ujiganti.json");
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const task = queue.then(fn);
    queue = task.catch(() => {});
    return task;
  }
  async function save(state: State) {
    const temp = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(temp, JSON.stringify(state, null, 2));
      await rename(temp, file);
    } catch {
      await unlink(temp).catch(() => {});
      throw new StorageError();
    }
  }
  async function read(): Promise<State> {
    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        throw new StorageError();
      const initial = seed();
      await save(initial);
      return initial;
    }
    try {
      const state = JSON.parse(raw) as State;
      if (
        !state ||
        !Number.isSafeInteger(state.revision) ||
        state.revision < 0 ||
        ![
          "bengkel",
          "model",
          "komponen",
          "kasus",
          "peminjaman",
          "prosedur",
          "hasil",
          "sengketa",
        ].every((key) => Array.isArray(state[key as keyof State]))
      )
        throw new Error();
      // Kompatibilitas berkas MVP sebelumnya; tidak menghapus perubahan pengguna.
      for (const l of state.peminjaman) {
        if (
          state.sengketa.some(
            (d) => d.peminjaman_id === l.id && d.status === "diputuskan",
          )
        )
          l.sengketa_diputuskan = true;
      }
      return state;
    } catch {
      throw new StorageError();
    }
  }
  return {
    readState: () => enqueue(read),
    transaction: (fn: (state: State) => State) =>
      enqueue(async () => {
        const current = await read();
        const revision = current.revision;
        const next = fn(current);
        next.revision = revision + 1;
        await save(next);
        return next;
      }),
  };
}

// Pertahankan satu antrean saat modul dimuat ulang oleh Next.js dalam proses sama.
const globalStore = globalThis as typeof globalThis & {
  ujiGantiStore?: ReturnType<typeof createJsonStore>;
};
const store = (globalStore.ujiGantiStore ??= createJsonStore(
  process.env.UJIGANTI_DATA_DIR || path.join(process.cwd(), "data"),
));
export const { readState, transaction } = store;
