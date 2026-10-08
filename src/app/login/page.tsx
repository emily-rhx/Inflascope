import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ error?: string; next?: string; reset?: string }> };
export default async function LoginPage({ searchParams }: Props) {
  const state = await searchParams;
  const next = safeNextPath(state.next, "");
  return <><SiteHeader /><main className="auth-page"><section className="auth-art"><span className="eyebrow">Welcome back</span><h1>Your next great connection is waiting.</h1><p>Log in to manage your creator profile, revisit your shortlist or review the directory as an administrator.</p></section><section className="auth-form-wrap"><form className="auth-form" action="/api/auth/login" method="post"><h2>Log in to inflascope</h2><p>Use the email and password attached to your account.</p>{state.error === "invalid" && <p className="form-message form-error">Email or password not recognised.</p>}{state.error === "rate" && <p className="form-message form-error">Too many attempts. Please wait and try again.</p>}{state.reset && <p className="form-message form-success">Password updated. You can log in now.</p>}<input type="hidden" name="next" value={next} /><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div><div style={{ textAlign: "right", marginBottom: 18 }}><Link className="text-link" href="/forgot-password">Forgot password?</Link></div><button className="button button-dark button-full" type="submit">Log in</button><p className="auth-switch">New here? <Link className="text-link" href="/signup/creator">Join free as a creator</Link> or <Link className="text-link" href="/signup/brand">create a brand account</Link>.</p></form></section></main></>;
}