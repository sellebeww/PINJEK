"use client";
import { useEffect } from "react";

// Animasi masuk saat digulir + hitung naik angka. Tanpa JS, konten tetap tampil apa adanya.
export function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    const root = document.documentElement;
    root.classList.add("pf-anim");
    const fmt = new Intl.NumberFormat("id-ID");
    const countUp = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / 1200, 1);
        el.textContent = fmt.format(Math.round(to * (1 - (1 - t) ** 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          e.target
            .querySelectorAll<HTMLElement>("[data-count]")
            .forEach(countUp);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("pf-anim");
    };
  }, []);
  return null;
}
