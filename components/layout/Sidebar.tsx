"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Flag, Dumbbell, Activity, Layers } from "lucide-react";

const navItems = [
  { label: "GENERAL", href: "/", icon: Layers },
  { label: "GOLF", href: "/golf", icon: Flag },
  { label: "TENIS", href: "/tenis", icon: Activity },
  { label: "GIMNASIO", href: "/gimnasio", icon: Dumbbell },
  { label: "ACTIVIDADES", href: "/actividades", icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="bg-[#8b1c31] px-5 py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Flag className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-white font-bold text-xs tracking-widest uppercase">Club de Golf</p>
          <p className="text-white/70 text-[10px] tracking-wider uppercase">Los Leones</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-100 text-[#8b1c31] border-l-4 border-[#8b1c31]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Dashboard v1.0</p>
      </div>
    </aside>
  );
}
