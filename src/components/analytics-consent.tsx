"use client";

import { useEffect, useState } from "react";

const MEASUREMENT_ID = "G-1N8705EJCY";
const CONSENT_COOKIE = "inflascope_analytics_consent";
type Consent = "granted" | "denied" | null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsent(): Consent {
  const match = document.cookie.split("; ").find((item) => item.startsWith(`${CONSENT_COOKIE}=`));
  const value = match?.split("=")[1];
  return value === "granted" || value === "denied" ? value : null;
}

function saveConsent(value: Exclude<Consent, null>) {
  const sharedDomain = window.location.hostname.endsWith("inflascope.co.uk") ? "; Domain=.inflascope.co.uk" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax; Secure${sharedDomain}`;
}

function startAnalytics() {
  if (document.querySelector(`script[data-inflascope-analytics="${MEASUREMENT_ID}"]`)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  script.dataset.inflascopeAnalytics = MEASUREMENT_ID;
  document.head.appendChild(script);
}

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<Consent | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    setConsent(saved);
    if (saved === "granted") startAnalytics();
  }, []);

  const choose = (value: Exclude<Consent, null>) => {
    saveConsent(value);
    setConsent(value);
    setSettingsOpen(false);
    if (value === "granted") startAnalytics();
  };

  if (consent === undefined) return null;
  const showBanner = consent === null || settingsOpen;

  return showBanner ? (
    <section aria-label="Cookie choices" role="dialog" aria-modal="false" style={bannerStyle}>
      <strong style={{ display: "block", marginBottom: 7, fontSize: 18 }}>Help us improve Inflascope</strong>
      <p style={{ margin: "0 0 14px", lineHeight: 1.5, fontSize: 15 }}>
        We use optional Google Analytics cookies to understand visits and improve the site. We do not use them for advertising. You can accept or decline.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => choose("granted")} style={primaryButtonStyle}>Accept analytics</button>
        <button type="button" onClick={() => choose("denied")} style={secondaryButtonStyle}>Decline</button>
        <a href="/privacy" target="_top" style={{ alignSelf: "center", color: "#155c48", fontWeight: 700 }}>Privacy notice</a>
      </div>
    </section>
  ) : (
    <button type="button" onClick={() => setSettingsOpen(true)} style={settingsButtonStyle}>Cookie settings</button>
  );
}

const bannerStyle = {
  position: "fixed" as const, zIndex: 10000, left: 16, right: 16, bottom: 16, maxWidth: 620,
  margin: "0 auto", padding: "18px 20px", border: "1px solid #155c48", borderRadius: 18,
  background: "#fffaf2", color: "#163e33", boxShadow: "0 14px 40px rgba(15, 61, 49, .2)",
  fontFamily: "Arial, sans-serif",
};
const primaryButtonStyle = { border: "1px solid #155c48", borderRadius: 999, padding: "10px 16px", background: "#155c48", color: "white", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle = { ...primaryButtonStyle, background: "transparent", color: "#155c48" };
const settingsButtonStyle = { position: "fixed" as const, zIndex: 9999, left: 12, bottom: 12, padding: "7px 11px", border: "1px solid #155c48", borderRadius: 999, background: "#fffaf2", color: "#155c48", fontSize: 12, fontWeight: 700, cursor: "pointer" };
