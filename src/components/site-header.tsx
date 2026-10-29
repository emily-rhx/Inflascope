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
          <Link href="https://inflascope.co.uk/how-it-works">How it works</Link>
          <Link href="https://inflascope.co.uk/packages">Packages</Link>
          <Link href="https://inflascope.co.uk/#founding-progress">Our progress</Link>
          <Link href="https://inflascope.co.uk/#membership">Brand waitlist</Link>
          <Link href="https://inflascope.co.uk/contact">Contact</Link>
        </nav>
        <div className="header-actions">
          <Link className="login-link" href={dashboard}>{user ? "Dashboard" : "Sign in"}</Link>
          <Link className="button button-dark button-small" href={dashboard}>{user ? "My account" : "Open account"}</Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            <Link href="https://inflascope.co.uk/how-it-works">How it works</Link>
            <Link href="https://inflascope.co.uk/packages">Packages</Link>
            <Link href="https://inflascope.co.uk/#founding-progress">Our progress</Link>
            <Link href="https://inflascope.co.uk/#membership">Brand waitlist</Link>
            <Link href="https://inflascope.co.uk/contact">Contact</Link>
            <Link href={dashboard}>{user ? "Dashboard" : "Sign in"}</Link>
            <Link href={dashboard}>{user ? "My account" : "Open account"}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
