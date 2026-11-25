type EmailKind = "verify" | "reset";

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function accountBaseUrl() {
  if (process.env.ACCOUNT_APP_URL) return process.env.ACCOUNT_APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "https://account.inflascope.co.uk";
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendFirstAdminClaimEmail({ to, token }: { to: string; token: string }) {
  if (!emailDeliveryConfigured()) return { sent: false as const, reason: "not_configured" as const };
  const url = `${accountBaseUrl()}/api/admin/claim?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: "Set up your Inflascope administrator account",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#14201a;background:#fffdf8;border:2px solid #155c48;border-radius:24px"><h1 style="margin:0 0 22px;color:#155c48;font-family:Georgia,serif;font-size:34px">Inflascope administrator setup</h1><p>Use the secure button below to claim the first Inflascope administrator account. You will then receive a separate link to choose its password.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:13px 22px;border-radius:30px;background:#155c48;color:#fff;text-decoration:none;font-weight:700">Claim administrator account</a></p><p style="font-size:13px;line-height:1.5;color:#5d655f">If you did not request this, ignore this email. The link expires after one hour.</p></div>`,
    }),
  });
  if (!response.ok) return { sent: false as const, reason: "provider_error" as const };
  return { sent: true as const };
}

export async function sendAccountEmail({ to, token, kind }: { to: string; token: string; kind: EmailKind }) {
  if (!emailDeliveryConfigured()) return { sent: false as const, reason: "not_configured" as const };
  const baseUrl = accountBaseUrl();
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

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function sendProfileSubmissionEmail({ creatorName, creatorEmail }: { creatorName: string; creatorEmail: string }) {
  if (!emailDeliveryConfigured()) return { sent: false as const, reason: "not_configured" as const };
  const baseUrl = accountBaseUrl();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [process.env.PROFILE_REVIEW_EMAIL || "info@inflascope.co.uk"],
      subject: `Creator profile submitted: ${creatorName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#14201a;background:#fffdf8;border:2px solid #155c48;border-radius:24px"><h1 style="margin:0 0 22px;color:#155c48;font-family:Georgia,serif;font-size:34px">New creator profile</h1><p><strong>${escapeHtml(creatorName)}</strong> has submitted a profile for approval.</p><p>Account email: ${escapeHtml(creatorEmail)}</p><p style="margin:28px 0"><a href="${baseUrl}/admin/dashboard" style="display:inline-block;padding:13px 22px;border-radius:30px;background:#155c48;color:#fff;text-decoration:none;font-weight:700">Review the profile</a></p></div>`,
    }),
  });
  if (!response.ok) return { sent: false as const, reason: "provider_error" as const };
  return { sent: true as const };
}
