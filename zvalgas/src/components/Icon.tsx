const paths = {
  phone:
    "M6.6 3.5h2.2l1.4 3.6-1.7 1.1a10 10 0 0 0 4.3 4.3l1.1-1.7 3.6 1.4v2.2a1.8 1.8 0 0 1-1.9 1.8A13.7 13.7 0 0 1 4.8 5.4a1.8 1.8 0 0 1 1.8-1.9Z",
  list: "M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10",
  plus: "M12 5v14M5 12h14",
  send: "M4 12 20 4l-6 16-2.5-6.5L4 12Z",
  check: "m5 12 5 5 9-10",
  x: "M6 6l12 12M18 6 6 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  edit: "M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4",
  upload: "M12 16V4m-5 5 5-5 5 5M4 20h16",
  download: "M12 4v12m-5-5 5 5 5-5M4 20h16",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18",
  skip: "M6 6l8 6-8 6V6Zm12 0v12",
  trash: "M5 7h14M10 7V5h4v2m-7 0 1 13h8l1-13",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, className = "", stroke = 1.6 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
