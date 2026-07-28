// Bộ icon nét mảnh, lấy cảm hứng từ phù điêu và gốm sứ Hy Lạp cổ đại.
// Không phụ thuộc thư viện ngoài — chỉ là SVG thuần, dùng currentColor để ăn theme.
import type { SVGProps } from "react";

type IconProps = {
  className?: string;
};

const base: SVGProps<SVGSVGElement> = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
};

export function IconColumn({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 3h14M5 21h14M7 3v2M17 3v2M7 19v2M17 19v2" />
      <path d="M6.5 5c1 1.2 2.2 1.8 5.5 1.8S16 6.2 17.5 5" />
      <path d="M7 7v12M11 7v12M13 7v12M17 7v12" />
    </svg>
  );
}

export function IconLaurel({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v13" />
      <path d="M12 19a3 3 0 0 1-3-3" />
      <path d="M5 5c2 1 3 3 3 5s-1 3-2.5 3C4 12 3 10 3 8s1-3 2-3Z" />
      <path d="M6 9c1.5.3 2.5 1.1 3 2.2" />
      <path d="M19 5c-2 1-3 3-3 5s1 3 2.5 3c1.5 0 2.5-2 2.5-4s-1-3-2-4Z" />
      <path d="M18 9c-1.5.3-2.5 1.1-3 2.2" />
    </svg>
  );
}

export function IconTorch({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2c1.5 1.6 2.3 3 2.3 4.4 0 1.5-1 2-1 3.2 0 .8.6 1.2 1.2 1.7A3.4 3.4 0 0 1 15.6 14a3.6 3.6 0 0 1-7.2 0c0-1.4.8-2 1.5-2.7.6-.5 1.2-.9 1.2-1.7 0-1.2-1-1.7-1-3.2C10 5 10.5 3.6 12 2Z" />
      <path d="M10.5 15.5 9 22h6l-1.5-6.5" />
    </svg>
  );
}

export function IconLightning({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2 4 14h6l-1 8 9-13h-6l1-7Z" />
    </svg>
  );
}

export function IconScroll({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 4h11a2 2 0 0 1 2 2v11a2 2 0 0 0 2 2" />
      <path d="M6 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13" />
      <path d="M8 8h8M8 11h8M8 14h5" />
    </svg>
  );
}

export function IconAmphora({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 3h6M10 3c0 1.6-.8 2.3-1.8 3.2C6.8 7.7 6 9.4 6 11.8 6 16 8.5 19 12 19s6-3 6-7.2c0-2.4-.8-4.1-2.2-5.6C14.8 5.3 14 4.6 14 3" />
      <path d="M4.5 9.5c1 .8 1.8 1 3 .6M19.5 9.5c-1 .8-1.8 1-3 .6" />
      <path d="M9 21h6M12 19v2" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3v2.4M12 18.6V21M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M3 12h2.4M18.6 12H21M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
    </svg>
  );
}

export function IconEye({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconGate({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M4 21h16M9 21v-8h6v8" />
      <path d="M4 9h16" />
    </svg>
  );
}