"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/referrals", label: "Refer", icon: "↗" },
  { href: "/wallet", label: "Wallet", icon: "◒" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="floating-nav fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center justify-around rounded-[24px] px-3 py-2">
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${active ? "active-nav" : ""}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
