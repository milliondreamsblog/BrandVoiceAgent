"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Critic" },
  { href: "/write", label: "Write" },
  { href: "/train", label: "Train" },
  { href: "/library", label: "Library" },
  { href: "/review", label: "Review" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="sitenav">
      <div className="sitenav-inner">
        <span className="sitenav-brand">Bricx</span>
        <div className="sitenav-tabs">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`nav-tab${path === t.href ? " active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
