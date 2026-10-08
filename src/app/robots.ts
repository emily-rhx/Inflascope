import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return { rules: { userAgent: "*", allow: ["/", "/creators/", "/categories/", "/how-it-works", "/pricing", "/contact"], disallow: ["/creator/", "/brand/", "/admin/", "/api/", "/login", "/signup/", "/forgot-password", "/reset-password", "/verify-email", "/privacy", "/terms"] }, sitemap: `${base}/sitemap.xml` };
}