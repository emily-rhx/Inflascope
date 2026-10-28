type EmailKind = "verify" | "reset";

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.NEXT_PUBLIC_APP_URL);
}

export async function sendAccountEmail({ to, token, kind }: { to: string; token: string; kind: EmailKind }) {
  if (!emailDeliveryConfigured()) return { sent: false as const, reason: "not_configured" as const };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  const isVerify = kind === "verify";
  const url = isVerify ? `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}` : `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = isVerify ? "Verify your Inflascope email" : "Reset your Inflascope password";
  const intro = isVerify ? "Confirm your email to finish creating your Inflascope account and continue building your creator profile." : "Use the secure link below to choose a new Inflascope password.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#14201a;background:#fffdf8;border:2px solid #155c48;border-radius:24px"><h1 style="margin:0 0 22px;color:#155c48;font-family:Georgia,serif;font-size:38px">Infla<span style="color:#e889ad;font-style:italic">scope</span></h1><p style="font-size:16px;line-height:1.6">${intro}</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:13px 22px;border-radius:30px;background:#155c48;color:#fff;text-decoration:none;font-weight:700">${isVerify ? "Verify my email" : "Reset my password"}</a></p><p style="font-size:13px;line-height:1.5;color:#5d655f">If you did not request this, you can ignore this email. This secure link expires automatically.</p></div>`,
    }),
  });
  if (!response.ok) return { sent: false as const, reason: "provider_error" as const };
  return { sent: true as const };
}
