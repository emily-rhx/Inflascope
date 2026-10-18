import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ sent?: string; verified?: string; error?: string }> };
export default async function VerifyEmailPage({ searchParams }: Props) {
  const state = await searchParams;
  const user = await getCurrentUser();
  const verified = Boolean(state.verified || user?.emailVerifiedAt);
  const errorMessage =
    state.error === "config"
      ? "Email delivery is not configured yet. Add RESEND_API_KEY, EMAIL_FROM and NEXT_PUBLIC_APP_URL in Vercel, then redeploy."
      : state.error === "rate"
        ? "Too many verification emails have been requested. Please wait 30 minutes and try again."
        : state.error === "send"
          ? "The email provider could not send that message. Check the Resend sender domain and delivery logs, then try again."
          : state.error
            ? "That link is invalid, expired or already used. Request a new verification email below."
            : null;

  return (
    <>
      <SiteHeader />
      <main className="content-page">
        <div className="narrow">
          <div className="pricing-card" style={{ textAlign: "center" }}>
            {verified ? (
              <>
                <CheckCircle2 size={52} style={{ margin: "0 auto 20px", color: "var(--green)" }} />
                <h1 style={{ fontSize: "3rem" }}>Email verified.</h1>
                <p>You can now continue to your {user?.role || "account"} dashboard.</p>
                <Link className="button button-dark" href={user ? `/${user.role}/dashboard` : "/login"}>Continue</Link>
              </>
            ) : (
              <>
                <Mail size={52} style={{ margin: "0 auto 20px", color: "var(--green)" }} />
                <h1 style={{ fontSize: "3rem" }}>Check your email.</h1>
                {errorMessage ? <p className="form-message form-error">{errorMessage}</p> : state.sent === "1" ? <p className="form-message form-success">We sent a new 24-hour verification link to your account email.</p> : <p>Use the verification link sent to your account email. It expires after 24 hours.</p>}
                {user ? (
                  <form action="/api/auth/resend-verification" method="post" style={{ margin: "24px 0 18px" }}>
                    <button className="button button-dark" type="submit">Resend verification email</button>
                  </form>
                ) : (
                  <p><Link className="button button-dark" href="/login?next=/verify-email">Log in to resend</Link></p>
                )}
                <Link className="text-link" href={user ? `/${user.role}/dashboard` : "/login"}>Go to account</Link>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
