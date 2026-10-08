import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./logo";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const dashboard = user ? `/${user.role}/dashboard` : "/login";
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/creators">Find creators</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <div className="header-actions">
          <Link className="login-link" href={dashboard}>{user ? "Dashboard" : "Log in"}</Link>
          <Link className="button button-dark button-small" href={user ? dashboard : "/signup/creator"}>{user ? "My account" : "Join free"}</Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            <Link href="/creators">Find creators</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/signup/creator">Join as a creator</Link>
            <Link href={dashboard}>{user ? "Dashboard" : "Log in"}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}