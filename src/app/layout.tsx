import type { Metadata, Viewport } from "next";
import { Orbitron, Saira, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
// Orbitron paling mirip wordmark logo; Saira lebar untuk judul; Plus Jakarta Sans untuk teks isi.
const logo = Orbitron({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-logo",
});
const display = Saira({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
});
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });
export const metadata: Metadata = {
  title: {
    default: "PINJEK — Pinjam komponen teruji, cek dulu baru ganti",
    template: "%s · PINJEK",
  },
  description:
    "PINJEK: komponen pembanding bersama untuk diagnosis bengkel yang dapat dipercaya.",
};
export const viewport: Viewport = { themeColor: "#1b0442" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${logo.variable} ${display.variable} ${body.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
