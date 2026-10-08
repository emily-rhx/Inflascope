type EmailKind = "verify" | "reset";

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.NEXT_PUBLIC_APP_URL);
}

export async function sendAccountEmail({ to, token, kind }: { to: string; token: string; kind: EmailKind }) {
  if (!emailDeliveryConfigured()) return { sent: false as const, reason: "not_configured" as const };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  const isVerify = kind === "verify";
  const url = isVerify ? `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}` : `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = isVerify ? "Verify your inflascope email" : "Reset your inflascope password";
  const intro = isVerify ? "Confirm your email to submit your inflascope profile or activate brand billing." : "Use the secure link below to choose a new inflascope password.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#141714"><h1 style="color:#175640">inflascope</h1><p>${intro}</p><p><a href="${url}" style="display:inline-block;padding:13px 20px;border-radius:30px;background:#175640;color:#fff;text-decoration:none">${isVerify ? "Verify email" : "Reset password"}</a></p><p style="font-size:13px;color:#5d655f">If you did not request this, you can ignore this email. The link expires automatically.</p></div>`,
    }),
  });
  if (!response.ok) return { sent: false as const, reason: "provider_error" as const };
  return { sent: true as const };
}
