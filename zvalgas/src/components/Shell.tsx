"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";
import { useLeads } from "./LeadsProvider";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Skambinti", icon: "phone" },
  { href: "/kontaktai", label: "Kontaktai", icon: "list" },
  { href: "/paieska", label: "Paieška", icon: "spark" },
  { href: "/statistika", label: "Statistika", icon: "chart" },
];

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login";
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me, leads, error } = useLeads();
  const queue = leads.filter((l) => l.status === "new").length;

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      {/* Rail (tablet/desktop) */}
      <nav className="hidden w-[76px] shrink-0 flex-col items-center bg-rail py-4 text-rail-text md:flex">
        <Link href="/" className="mb-6 font-serif text-[30px] leading-none text-paper" aria-label="Žvalgas">
          Ž<span className="text-accent">.</span>
        </Link>
        <div className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex w-[64px] flex-col items-center gap-1 rounded-xl py-2.5 text-[10.5px] transition-colors hover:text-paper aria-[current=page]:bg-rail-2 aria-[current=page]:text-paper"
              >
                {active && <span className="absolute left-[-6px] top-3 h-6 w-[3px] rounded-full bg-accent" />}
                <span className="relative">
                  <Icon name={n.icon} size={20} />
                  {n.href === "/" && queue > 0 && (
                    <span className="tnum absolute -right-2.5 -top-1.5 rounded-full bg-accent px-1 text-[9px] font-medium leading-[14px] text-white">
                      {queue > 99 ? "99+" : queue}
                    </span>
                  )}
                </span>
                {n.label}
              </Link>
            );
          })}
        </div>
        <div className="mt-auto flex flex-col items-center gap-3">
          <span title={me}>
            <Avatar name={me} size={32} />
          </span>
          <button type="button" onClick={logout} title="Atsijungti" className="rounded-lg p-1.5 hover:bg-rail-2 hover:text-paper">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </nav>

      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {error && (
          <div className="absolute inset-x-0 top-0 z-40 bg-accent px-4 py-2 text-center text-[13px] text-white">{error}</div>
        )}
        {children}
      </main>

      {/* Bottom tabs (phone) */}
      <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 py-2 text-[10.5px] text-muted aria-[current=page]:text-ink"
            >
              <Icon name={n.icon} size={20} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
