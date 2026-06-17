"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ChartIcon, ScaleIcon, GearIcon, LeafIcon } from "./icons";

const ITEMS = [
  { href: "/", label: "Hoy", Icon: HomeIcon },
  { href: "/guia", label: "Guía", Icon: LeafIcon },
  { href: "/historial", label: "Historial", Icon: ChartIcon },
  { href: "/peso", label: "Peso", Icon: ScaleIcon },
  { href: "/ajustes", label: "Ajustes", Icon: GearIcon },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
              }`}
            >
              <Icon size={22} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
