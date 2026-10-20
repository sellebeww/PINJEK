import { readState, transaction, StorageError } from "@/data/store";
import { apply } from "@/domain/actions";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
class ConflictError extends Error {}
class PayloadError extends Error {}

async function parseAction(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new PayloadError("Perintah JSON wajib diisi.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new PayloadError("Ukuran perintah melebihi 64 KB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let action;
  try {
    action = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PayloadError("Format JSON tidak valid.");
  }
  if (
    !action ||
    Array.isArray(action) ||
    typeof action !== "object" ||
    typeof action.type !== "string" ||
    !Number.isSafeInteger(action.revision) ||
    action.revision < 0
  )
    throw new PayloadError("Perintah dan revision tidak valid.");
  return action;
}
export async function GET() {
  try {
    return json(await readState());
  } catch {
    return json({ error: new StorageError().message }, 500);
  }
}
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  // Next dapat menormalisasi req.url ke localhost; Host menyimpan host yang dibuka browser.
  const requestUrl = new URL(req.url);
  const expectedOrigin = `${requestUrl.protocol}//${req.headers.get("host") || requestUrl.host}`;
  if (
    (origin && origin !== expectedOrigin) ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    return json({ error: "Origin tidak diizinkan." }, 403);
  if (
    req.headers.get("content-type")?.split(";")[0].trim() !== "application/json"
  )
    return json({ error: "Gunakan Content-Type application/json." }, 415);
  try {
    const action = await parseAction(req);
    const state = await transaction((s) => {
      if (action.revision !== s.revision)
        throw new ConflictError(
          "Data berubah di sesi lain. Data terbaru dimuat; periksa kembali sebelum menyimpan.",
        );
      return apply(s, action);
    });
    return json(state);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Data tidak valid." },
      e instanceof StorageError ? 500 : e instanceof ConflictError ? 409 : 400,
    );
  }
}
