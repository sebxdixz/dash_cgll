import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-4xl font-serif italic font-bold text-[#8b1c31] tracking-wide leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
