import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing", description: "Compare Inflascope Standard and Advanced brand memberships, including the limited founding prices." };

const plans = [
  { name: "Founding Standard", price: "£10.99", note: "First 50 Standard brands", advanced: false, founding: true },
  { name: "Standard", price: "£12.99", note: "Standard ongoing price", advanced: false, founding: false },
  { name: "Founding Advanced", price: "£14.99", note: "First 50 Advanced brands", advanced: true, founding: true },
  { name: "Advanced", price: "£17.99", note: "Advanced ongoing price", advanced: true, founding: false },
];

export default function PricingPage() {
  const checkoutConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET);
  return <><SiteHeader /><main>
    <section className="page-hero"><div className="container"><span className="eyebrow">Clear monthly pricing</span><h1>Choose the workspace your brand needs.</h1><p>Creator accounts are always free. Standard is designed for creator discovery; Advanced adds the tools for managing ongoing campaigns and relationships.</p></div></section>
    <section className="section section-white"><div className="container">
      <div className="membership-price-grid">
        {plans.map((plan) => <article className={`pricing-card pricing-card-compact ${plan.advanced ? "pricing-card-advanced" : ""}`} key={plan.name}>
          {plan.founding && <span className="tag badge-gifting">Limited founding tier</span>}
          <h2>{plan.name}</h2>
          <div className="price">{plan.price} <small>/ month</small></div>
          <p>{plan.note}</p>
          <ul className="check-list">{plan.advanced ? <><li>Everything in Standard</li><li>Creator Match Requests and alerts</li><li>Campaign workspace</li><li>Saved searches, CRM notes and templates</li></> : <><li>Creator search and filters</li><li>Full approved creator profiles</li><li>Creator-approved contact details</li><li>Private creator shortlist</li></>}</ul>
          <Link className="button button-dark button-full" href="/signup/brand">Create a brand account</Link>
        </article>)}
      </div>
      <p className="founding-price-note"><strong>Founding price locked for as long as your membership remains active.</strong> Limited to the first 50 brands in each founding tier.</p>
      {!checkoutConfigured && <p className="form-message form-error"><strong>Billing setup notice:</strong> Stripe checkout remains disabled until the matching production price IDs and webhook credentials are configured. No payment will be accepted in the meantime.</p>}
    </div></section>
    <section className="section"><div className="narrow"><div className="section-heading"><span className="eyebrow">Good to know</span><h2>Creator fees stay separate.</h2></div><div className="prose"><p>Membership provides access to Inflascope’s discovery and workspace tools. Gifts, creator fees, usage rights and every collaboration term are agreed directly between the brand and creator.</p><h3>What happens if I cancel?</h3><p>Future renewal stops and access continues until the end of the current paid period. Your saved workspace information remains attached to your account.</p></div></div></section>
  </main><SiteFooter /></>;
}
