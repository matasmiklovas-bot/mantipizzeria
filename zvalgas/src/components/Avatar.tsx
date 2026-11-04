import { initials, personColor } from "@/lib/format";

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, background: personColor(name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
