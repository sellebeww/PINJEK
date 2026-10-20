import { useId } from "react";

// Tanda logo PINJEK (P + centang + tiga pin) digambar ulang dari logo resmi agar tajam dan bisa dianimasikan.
export function LogoMark({
  size = 40,
  className = "",
  title = "PINJEK",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  const cut = useId();
  return (
    <svg
      className={`logo-mark ${className}`}
      width={size}
      height={Math.round(size * (610 / 540))}
      viewBox="440 140 540 610"
      role="img"
      aria-label={title}
    >
      <mask
        id={cut}
        maskUnits="userSpaceOnUse"
        x="400"
        y="100"
        width="620"
        height="700"
      >
        <rect x="400" y="100" width="620" height="700" fill="white" />
        <path d="M430 316H592" stroke="black" strokeWidth="30" />
        <path
          d="M598 338L684 432L912 222"
          fill="none"
          stroke="black"
          strokeWidth="68"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </mask>
      <g mask={`url(#${cut})`}>
        <path
          className="logo-body"
          fill="var(--logo-purple, #5b06fa)"
          d="M455 222Q455 155 522 155H790A165 182 0 0 1 790 519H712Q688 519 688 543V600Q688 638 650 638H492Q455 638 455 600Z"
        />
      </g>
      <g className="logo-pins" fill="var(--logo-purple, #5b06fa)">
        <rect x="480" y="610" width="38" height="126" rx="15" />
        <rect x="554" y="610" width="38" height="126" rx="15" />
        <rect x="627" y="610" width="38" height="126" rx="15" />
      </g>
      <path
        className="logo-check"
        d="M598 338L684 432L912 222"
        fill="none"
        stroke="var(--logo-mint, #27f2a8)"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}
