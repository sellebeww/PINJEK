import { beforeEach, describe, expect, it, vi } from "vitest";
import { seed } from "../src/data/seed";
const { read, mutate } = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn() }));
vi.mock("../src/data/store", () => ({
  readState: read,
  transaction: mutate,
  StorageError: class StorageError extends Error {
    constructor() {
      super("Penyimpanan bermasalah.");
    }
  },
}));
import { GET, POST } from "../src/app/api/state/route";
beforeEach(() => {
  read.mockReset().mockResolvedValue(seed());
  mutate.mockReset().mockImplementation(async (fn) => fn(seed()));
});
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3101/api/state", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "127.0.0.1:3101",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
describe("kontrak HTTP", () => {
  it("origin browser dibandingkan dengan Host bukan URL internal Next", async () => {
    const res = await POST(
      request(
        { type: "scenario", scenario: 1, revision: 0 },
        { origin: "http://127.0.0.1:3101" },
      ),
    );
    expect(res.status).toBe(200);
  });
  it("origin asing dan fetch cross-site ditolak", async () => {
    expect(
      (await POST(request({}, { origin: "https://example.invalid" }))).status,
    ).toBe(403);
    expect(
      (await POST(request({}, { "sec-fetch-site": "cross-site" }))).status,
    ).toBe(403);
  });
  it("konflik revision memiliki status 409", async () => {
    expect(
      (await POST(request({ type: "scenario", scenario: 1, revision: 3 })))
        .status,
    ).toBe(409);
  });
  it("payload null, array, revision negatif ditolak sebelum transaksi", async () => {
    for (const value of [null, [], { type: "reset", revision: -1 }])
      expect((await POST(request(value))).status).toBe(400);
    expect(mutate).not.toHaveBeenCalled();
  });
  it("payload besar ditolak sebelum transaksi", async () => {
    const r = await POST(
      request({ type: "case", revision: 0, data: "a".repeat(65536) }),
    );
    expect(r.status).toBe(400);
    expect(mutate).not.toHaveBeenCalled();
  });
  it("kegagalan baca tidak mengekspos path atau isi error", async () => {
    read.mockRejectedValue(Error("/private/user/secret.json"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("/private");
  });
  it("GET dan POST tidak boleh di-cache", async () => {
    expect((await GET()).headers.get("cache-control")).toBe("no-store");
    expect(
      (
        await POST(request({ type: "scenario", scenario: 1, revision: 0 }))
      ).headers.get("cache-control"),
    ).toBe("no-store");
  });
});
