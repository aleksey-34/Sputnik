import Link from "next/link";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/about" as const, label: "О приложении" },
  { href: "/privacy" as const, label: "Конфиденциальность" },
  { href: "/terms" as const, label: "Условия" }
];

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/about" className="text-lg font-bold">
            <span className="text-primary">Спутник</span>
            <span className="text-accent"> — Шаги</span>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} className="hover:text-primary">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <article className="container max-w-3xl py-10">
        <h1 className="mb-8 text-3xl font-semibold">{title}</h1>
        <div className="prose prose-slate max-w-none space-y-4 text-slate-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-1">
          {children}
        </div>
        <footer className="mt-12 border-t pt-6 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Спутnik · Telegram:{" "}
            <a href="https://t.me/WeGoWithSputnik_bot" className="text-primary">@WeGoWithSputnik_bot</a>
          </p>
          <p className="mt-1">Поддержка: <a href="mailto:foresterufa@gmail.com" className="text-primary">foresterufa@gmail.com</a></p>
        </footer>
      </article>
    </main>
  );
}
