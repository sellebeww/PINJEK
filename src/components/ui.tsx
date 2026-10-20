import { label } from "@/lib/format";
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${["teruji", "tersedia", "selesai", "komponen_dicurigai_sehat"].includes(value) ? "green" : ["sengketa", "pensiun"].includes(value) ? "red" : "orange"}`}
    >
      {label(value)}
    </span>
  );
}
export function Stat({
  title,
  value,
  foot,
  accent = false,
}: {
  title: string;
  value: string;
  foot: string;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? "accent" : ""}`}>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}
export function Metric({ name, value }: { name: string; value: string }) {
  return (
    <div
      className="row spread"
      style={{ padding: "14px 0", borderBottom: "1px solid #efecf5" }}
    >
      <span className="muted mini">{name}</span>
      <b style={{ fontSize: 12 }}>{value}</b>
    </div>
  );
}
// Ikon garis per jenis komponen; gaya sama dengan ikon di beranda.
export function PartIcon({ kind }: { kind: string }) {
  const k = kind.toLowerCase();
  const path = k.includes("baterai") ? (
    <>
      <rect x="3" y="7" width="16" height="10" rx="2" />
      <path d="M21 10.5v3M7 10v4M10.5 10v4" />
    </>
  ) : k === "lcd" || k === "t-con" ? (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ) : k === "ram" || k === "ssd" ? (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ) : (
    <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" />
  );
  return (
    <span className="part-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="30"
        height="30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {path}
      </svg>
    </span>
  );
}
