import Link from "next/link";
import { Logo } from "./logo";
import { brandAccountsOpen } from "@/lib/launch";

export async function SiteFooter() {
  const brandsOpen = await brandAccountsOpen();
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Logo inverse />
          <p className="footer-note">A friendly place for small businesses to discover emerging creators and connect directly.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/creators">Find creators</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div>
          <h2>Join</h2>
          <Link href="/signup/creator">Join as a creator</Link>
          <Link href={brandsOpen ? "/signup/brand" : "https://inflascope.co.uk/#membership"}>{brandsOpen ? "Join as a brand" : "Brand waitlist"}</Link>
          <Link href="/login">Log in</Link>
        </div>
        <div>
          <h2>Important</h2>
          <Link href="/contact">Contact &amp; support</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} inflascope</span><span>Creators join free. Brands connect directly.</span></div>
    </footer>
  );
}
