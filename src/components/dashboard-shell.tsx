import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut, Search } from "lucide-react";
import { Logo } from "./logo";
import type { SessionUser } from "@/lib/auth";

export function DashboardShell({ user, title, children }: { user: SessionUser; title: string; children: ReactNode }) {
  const links = user.role === "creator"
    ? [["Overview", "/creator/dashboard"], ["Edit profile", "/creator/onboarding"], ["Public preview", "/creator/dashboard?view=preview"]]
    : user.role === "brand"
      ? [["Overview", "/brand/dashboard"], ["Saved creators", "/brand/dashboard#saved"], ["Account & billing", "/brand/dashboard#billing"]]
      : [["Overview", "/admin/dashboard"], ["Applications", "/admin/dashboard#applications"], ["Moderation log", "/admin/dashboard#log"]];
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Logo inverse />
        <div className="account-chip"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.role}</small></div></div>
        <nav aria-label="Dashboard navigation">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/creators"><Search size={17} /> Browse directory</Link>
          <form action="/api/auth/logout" method="post"><button type="submit"><LogOut size={17} /> Log out</button></form>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-top"><div><span className="eyebrow">{user.role} area</span><h1>{title}</h1></div><Link className="text-link" href="/">Back to website</Link></header>
        {children}
      </main>
    </div>
  );
}