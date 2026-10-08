import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ExternalLink, Heart, Lock, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth";
import { getBrandMembership } from "@/lib/access";
import { getMemberCreatorDetails, getPublicCreator, getSavedCreatorIds } from "@/lib/creators";
import { formatDate, formatFollowers, formatMoney, generalLocation } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const creator = await getPublicCreator(slug);
  if (!creator) return { title: "Creator not found", robots: { index: false, follow: false } };
  const niche = creator.card.niches.find((item) => item.primary)?.name || creator.card.niches[0]?.name || "creator";
  return {
    title: `${creator.profile.displayName} — ${niche} creator`,
    description: creator.profile.shortIntro || `Explore ${creator.profile.displayName}'s creator profile on inflascope.`,
    alternates: { canonical: `/creators/${creator.profile.slug}` },
    openGraph: { title: `${creator.profile.displayName} on inflascope`, description: creator.profile.shortIntro || undefined, images: creator.profile.photoUrl ? [creator.profile.photoUrl] : [] },
  };
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPublicCreator(slug);
  if (!data) notFound();
  const user = await getCurrentUser();
  const membership = user?.role === "brand" ? await getBrandMembership(user.id) : null;
  const ownerCanPreview = user?.role === "creator" && user.id === data.profile.userId;
  const canViewMember = Boolean(membership?.hasAccess || ownerCanPreview || user?.role === "admin");
  const member = canViewMember ? await getMemberCreatorDetails(data.profile.id) : null;
  const saved = membership?.hasAccess ? (await getSavedCreatorIds(membership.brandId)).has(data.profile.id) : false;
  const preference = data.card.preference;
  const primaryNiche = data.card.niches.find((item) => item.primary) || data.card.niches[0];

  return (
    <>
      <a className="skip-link" href="#profile-content">Skip to profile content</a>
      <SiteHeader />
      <main className="profile-page" id="profile-content">
        <div className="container">
          <header className="profile-header">
            {data.profile.photoUrl ? <Image className="profile-photo" src={data.profile.photoUrl} alt={`${data.profile.displayName}, ${primaryNiche?.name || "creator"}`} width={420} height={420} priority /> : <div className="profile-photo" />}
            <div>
              {data.profile.isExample && <span className="tag badge-gifting">Fictional demo profile</span>}
              <h1>{data.profile.displayName}</h1>
              <div className="profile-meta"><span><MapPin size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {generalLocation(data.profile.city, data.profile.region, data.profile.country)}</span><span>{data.profile.availability ? "Accepting collaborations" : "Not currently accepting"}</span><span>Updated {formatDate(data.profile.lastUpdatedAt)}</span></div>
              <p className="profile-intro">{data.profile.shortIntro}</p>
              <div className="tags">{data.card.niches.map((niche) => <span className="tag" key={niche.slug}>{niche.name}</span>)}{preference?.considersGifting && <span className="tag badge-gifting">Gifting considered</span>}{preference?.considersPaid && <span className="tag badge-paid">Paid collaborations</span>}</div>
              <div className="social-counts">{data.card.socials.map((social) => <div key={social.platform}><span>{social.platform}</span><strong>{formatFollowers(social.followerCount)} followers</strong></div>)}</div>
            </div>
          </header>

          <div className="profile-layout">
            <div>
              <section className="profile-section"><h2>About {data.profile.displayName}</h2><p>{data.profile.biography}</p>{data.profile.contentStyle && <><h3>Content style &amp; interests</h3><p>{data.profile.contentStyle}</p></>}{data.profile.brandInterests && <><h3>Brands I’d love to work with</h3><p>{data.profile.brandInterests}</p></>}{data.profile.excludedSectors && <><h3>Not a fit for</h3><p>{data.profile.excludedSectors}</p></>}{data.profile.languages && <><h3>Content languages</h3><p>{data.profile.languages}</p></>}</section>
              <section className="profile-section"><h2>Portfolio</h2>{data.assets.length ? <div className="portfolio-grid">{data.assets.map((asset) => asset.type === "image" ? <figure key={asset.id}><Image src={asset.url} alt={asset.altText} width={700} height={700} loading="lazy" /><figcaption>{asset.altText}</figcaption></figure> : <figure key={asset.id}><a className="locked-box" href={asset.url} target="_blank" rel="noopener noreferrer">Watch video example <ExternalLink size={16} /></a><figcaption>{asset.altText}. Opens without autoplay.</figcaption></figure>)}</div> : <div className="empty-state"><p>Portfolio examples are being prepared.</p></div>}</section>

              <section className="profile-section">
                <h2>Engagement &amp; audience</h2>
                {member ? member.metrics.length ? <div className="evidence-grid">{member.metrics.map((metric) => <article className="metric-card" key={metric.id}><h3>{metric.platform}</h3><div className="metric-row"><span>Followers</span><strong>{formatFollowers(metric.followerCount)}</strong></div>{metric.averageViews != null && <div className="metric-row"><span>Average views</span><strong>{formatFollowers(metric.averageViews)}</strong></div>}{metric.averageReach != null && <div className="metric-row"><span>Average reach</span><strong>{formatFollowers(metric.averageReach)}</strong></div>}{metric.engagementRate != null && <div className="metric-row"><span>Engagement rate</span><strong>{metric.engagementRate}%</strong></div>}{metric.engagementRateBasis && <div className="metric-row"><span>Rate basis</span><strong>{metric.engagementRateBasis}</strong></div>}<div className="metric-row"><span>Reporting period</span><strong>{metric.reportingPeriod || "Not supplied"}</strong></div><div className="metric-row"><span>Figure date</span><strong>{formatDate(metric.measuredAt)}</strong></div>{metric.audienceLocationSummary && <div className="metric-row"><span>Audience location</span><strong>{metric.audienceLocationSummary}</strong></div>}{metric.audienceAgeSummary && <div className="metric-row"><span>Audience age</span><strong>{metric.audienceAgeSummary}</strong></div>}<p className="source-note">Creator supplied · Analytics evidence {metric.evidenceStatus === "reviewed" ? "reviewed" : "not reviewed"}. Screenshots do not guarantee authentic followers or future results.</p></article>)}</div> : <p>No detailed engagement figures have been supplied.</p> : <div className="locked-box"><Lock size={24} /><h3>Detailed figures for brand members</h3><p>Active members can view creator-supplied engagement figures, reporting dates, rate basis and evidence-review status.</p><Link className="button button-dark button-small" href="/pricing">See brand membership</Link></div>}
              </section>

              <details><summary className="text-link">Report a concern about this profile</summary><form action="/api/reports" method="post"><input type="hidden" name="creatorId" value={data.profile.id} /><div className="field"><label htmlFor="reportEmail">Your email (optional)</label><input id="reportEmail" name="email" type="email" /></div><div className="field"><label htmlFor="reason">What should we review?</label><textarea id="reason" name="reason" minLength={10} maxLength={1000} required /></div><button className="button button-dark button-small" type="submit">Send report</button></form></details>
            </div>

            <aside className="collab-sidebar" aria-label="Collaboration details">
              <h2>Work with {data.profile.displayName}</h2>
              <div className="tags">{preference?.considersGifting && <span className="tag badge-gifting">Gifting considered</span>}{preference?.considersPaid && <span className="tag badge-paid">Paid collaborations</span>}</div>
              <ul className="detail-list">
                <li><small>Availability</small><strong>{data.profile.availability ? "Currently accepting collaborations" : "Not currently accepting"}</strong></li>
                {member?.preference?.formats?.length ? <li><small>Offered formats</small><strong>{member.preference.formats.join(", ")}</strong></li> : null}
                {member?.preference?.startingPrices && Object.entries(member.preference.startingPrices).map(([format, price]) => <li key={format}><small>{format}</small><strong>From {formatMoney(Number(price))}</strong></li>)}
                {member?.preference?.minimumStartingPrice != null && Object.keys(member.preference.startingPrices || {}).length === 0 && <li><small>Indicative starting price</small><strong>{formatMoney(member.preference.minimumStartingPrice)}</strong></li>}
                {member?.preference?.typicalTurnaround && <li><small>Typical turnaround</small><strong>{member.preference.typicalTurnaround}</strong></li>}
                <li><small>Account ownership</small><strong>{data.profile.accountOwnershipChecked ? <><CheckCircle2 size={15} style={{ display: "inline" }} /> Checked by inflascope</> : "Not yet marked as checked"}</strong></li>
              </ul>
              {member ? <div className="contact-list"><h3>Creator-approved contact</h3>{member.contact?.businessEmail && <a href={`mailto:${member.contact.businessEmail}`}>{member.contact.businessEmail}</a>}{member.contact?.instagramUrl && <a href={member.contact.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <ExternalLink size={14} style={{ display: "inline" }} /></a>}{member.contact?.tiktokUrl && <a href={member.contact.tiktokUrl} target="_blank" rel="noopener noreferrer">TikTok <ExternalLink size={14} style={{ display: "inline" }} /></a>}{member.contact?.websiteUrl && <a href={member.contact.websiteUrl} target="_blank" rel="noopener noreferrer">Business website <ExternalLink size={14} style={{ display: "inline" }} /></a>}{!member.contact || !Object.values(member.contact).some(Boolean) ? <p>No contact method is currently shared.</p> : null}{membership?.hasAccess && <form action="/api/shortlist" method="post"><input type="hidden" name="creatorId" value={data.profile.id} /><input type="hidden" name="returnTo" value={`/creators/${slug}`} /><input type="hidden" name="intent" value={saved ? "remove" : "save"} /><button className="button button-dark button-full" type="submit"><Heart size={18} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved to shortlist" : "Save creator"}</button></form>}</div> : <div className="locked-box"><Lock size={24} /><h3>Reveal contact details</h3><p>Brand members can access contact methods this creator has chosen to share. Membership does not imply these details are unavailable elsewhere.</p><Link className="button button-dark button-full" href={user?.role === "brand" ? "/brand/dashboard#billing" : "/signup/brand"}>Unlock with membership</Link></div>}
              <p className="source-note">Gifting is considered case by case. Prices are indicative; scope, final price, usage rights and all terms are agreed directly with the creator. inflascope does not process bookings or payments.</p>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}