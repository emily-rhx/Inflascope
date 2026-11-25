import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { collaborationPreferences, creatorContacts, creatorNiches, creatorProfiles, engagementMetrics, niches, portfolioAssets, socialAccounts, users } from "@/db/schema";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { REVIEW_SECTIONS, type ReviewSectionKey } from "@/lib/review-feedback";
import { formatDate, formatFollowers, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review creator profile", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; updated?: string }> };
type PendingPayload = {
  profile?: Record<string, unknown>;
  socials?: { platform: string; handle: string; followerCount: number | null }[];
  preference?: { considersGifting: boolean; considersPaid: boolean; formats: string[]; minimumStartingPrice: number | null; typicalTurnaround: string | null };
  contact?: { businessEmail: string | null; instagramUrl: string | null; tiktokUrl: string | null; websiteUrl: string | null; shareEmail: boolean; shareInstagram: boolean; shareTiktok: boolean; shareWebsite: boolean };
  nicheSlugs?: string[];
};

function ReviewNote({ section }: { section: ReviewSectionKey }) {
  return <div className="field" style={{ marginTop: 18 }}><label className="checkbox"><input type="checkbox" name="reviewSections" value={section} />Return this section to the creator</label><label htmlFor={`note-${section}`}>Note for {REVIEW_SECTIONS[section].toLowerCase()}</label><textarea id={`note-${section}`} name={`note_${section}`} maxLength={1500} placeholder="Explain exactly what needs changing" /></div>;
}

export default async function AdminCreatorReviewPage({ params, searchParams }: Props) {
  const admin = await requireUser("admin");
  const { id } = await params;
  const state = await searchParams;
  const [profileRow] = await db.select({ profile: creatorProfiles, email: users.email }).from(creatorProfiles).innerJoin(users, eq(creatorProfiles.userId, users.id)).where(eq(creatorProfiles.id, id)).limit(1);
  if (!profileRow) notFound();
  const profile = profileRow.profile;
  const [socialRows, preferenceRows, contactRows, nicheRows, assets, metrics] = await Promise.all([
    db.select().from(socialAccounts).where(eq(socialAccounts.creatorId, id)),
    db.select().from(collaborationPreferences).where(eq(collaborationPreferences.creatorId, id)).limit(1),
    db.select().from(creatorContacts).where(eq(creatorContacts.creatorId, id)).limit(1),
    db.select({ name: niches.name, slug: niches.slug }).from(creatorNiches).innerJoin(niches, eq(creatorNiches.nicheId, niches.id)).where(eq(creatorNiches.creatorId, id)),
    db.select().from(portfolioAssets).where(eq(portfolioAssets.creatorId, id)),
    db.select().from(engagementMetrics).where(eq(engagementMetrics.creatorId, id)),
  ]);
  const pending = (profile.pendingChanges || null) as PendingPayload | null;
  const displayed = { ...profile, ...(pending?.profile || {}) } as Record<string, unknown>;
  const socials = pending?.socials || socialRows;
  const preference = pending?.preference || preferenceRows[0];
  const contact = pending?.contact || contactRows[0];
  const categories = pending?.nicheSlugs || nicheRows.map((item) => item.name);
  const returnTo = `/admin/creators/${id}`;
  const text = (key: string) => typeof displayed[key] === "string" ? displayed[key] as string : "";

  return <DashboardShell user={admin} title={`Review ${text("displayName") || profile.displayName}`}>
    <div className="action-row" style={{ marginBottom: 20 }}><Link className="text-link" href="/admin/dashboard#applications">← Back to applications</Link><span className={`status status-${profile.status}`}>{profile.status.replaceAll("_", " ")}</span>{pending && <span className="status status-pending_review">Reviewing staged changes</span>}</div>
    {state.updated && <p className="form-message form-success">The review action was recorded.</p>}
    {state.error === "ownership" && <p className="form-message form-error">Record the ownership check before approving this profile.</p>}
    {state.error === "notes" && <p className="form-message form-error">Add a review note before requesting changes.</p>}
    {state.error === "section-notes" && <p className="form-message form-error">Every selected section needs a note explaining what the creator must change.</p>}

    <section className="dashboard-section"><div className="dashboard-section-head"><div><h2>Application details</h2><p>{profileRow.email} · Submitted {formatDate(profile.submittedAt)}</p></div>{profile.accountOwnershipChecked ? <span className="status status-approved">Ownership checked</span> : <form action="/api/admin/moderate" method="post"><input type="hidden" name="creatorId" value={id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="button button-pink button-small" name="action" value="ownership_checked" type="submit">Record ownership check</button></form>}</div></section>

    <form action="/api/admin/moderate" method="post">
      <input type="hidden" name="creatorId" value={id} /><input type="hidden" name="returnTo" value={returnTo} />
      <section className="form-section"><span className="eyebrow">Public basics</span><div className="profile-header" style={{ marginTop: 16 }}>{text("photoUrl") ? <Image className="profile-photo" src={text("photoUrl")} alt="Submitted profile" width={240} height={240} /> : <div className="profile-photo" />}<div><h2>{text("displayName") || profile.displayName}</h2><p>{[text("city"), text("region"), text("country")].filter(Boolean).join(", ") || "No location supplied"}</p><p>{text("shortIntro") || "No short introduction supplied"}</p><p><strong>Availability:</strong> {displayed.availability ? "Accepting collaborations" : "Not accepting collaborations"}</p></div></div><ReviewNote section="basics" /></section>

      <section className="form-section"><span className="eyebrow">Social accounts and followers</span><div className="dashboard-grid">{socials.length ? socials.map((social) => <article className="dashboard-card" key={`${social.platform}-${social.handle}`}><h3>{social.platform}</h3><p>@{social.handle}</p><strong>{formatFollowers(social.followerCount)} followers</strong></article>) : <p>No social accounts supplied.</p>}</div><ReviewNote section="socials" /></section>

      <section className="form-section"><span className="eyebrow">Content and categories</span><h3>Biography</h3><p>{text("biography") || "Not supplied"}</p><h3>Content style and interests</h3><p>{text("contentStyle") || "Not supplied"}</p><h3>Brands they want to work with</h3><p>{text("brandInterests") || "Not supplied"}</p><h3>Excluded products or sectors</h3><p>{text("excludedSectors") || "None supplied"}</p><div className="tags">{categories.length ? categories.map((category) => <span className="tag" key={category}>{category}</span>) : <span>No categories selected</span>}</div><ReviewNote section="content" /></section>

      <section className="form-section"><span className="eyebrow">Portfolio and engagement evidence</span>{assets.length ? <div className="portfolio-grid">{assets.map((asset) => <figure key={asset.id}><Link className="text-link" href={asset.url} target="_blank">Open {asset.type}</Link><figcaption>{asset.altText} · {asset.approved ? "Approved" : "Awaiting review"}</figcaption></figure>)}</div> : <p>No portfolio images supplied.</p>}{metrics.length ? <div className="dashboard-grid">{metrics.map((metric) => <article className="dashboard-card" key={metric.id}><h3>{metric.platform}</h3><p>{metric.reportingPeriod || "No reporting period"}</p>{metric.engagementRate != null && <p>Engagement: {metric.engagementRate}%</p>}{metric.evidencePath && <Link className="text-link" href={`/api/evidence/${metric.id}`} target="_blank">Open private evidence</Link>}</article>)}</div> : <p>No engagement evidence supplied.</p>}<ReviewNote section="portfolio" /></section>

      <section className="form-section"><span className="eyebrow">Collaboration preferences</span>{preference ? <><p><strong>Gifting:</strong> {preference.considersGifting ? "Considered" : "No"}</p><p><strong>Paid collaborations:</strong> {preference.considersPaid ? "Considered" : "No"}</p><p><strong>Formats:</strong> {preference.formats?.join(", ") || "None supplied"}</p><p><strong>Indicative starting price:</strong> {preference.minimumStartingPrice != null ? formatMoney(preference.minimumStartingPrice) : "Not supplied"}</p><p><strong>Turnaround:</strong> {preference.typicalTurnaround || "Not supplied"}</p></> : <p>No collaboration preferences supplied.</p>}<ReviewNote section="collaborations" /></section>

      <section className="form-section"><span className="eyebrow">Business contact and consent</span>{contact ? <><p><strong>Email:</strong> {contact.businessEmail || "Not supplied"} {contact.shareEmail ? "(shared)" : "(private)"}</p><p><strong>Instagram:</strong> {contact.instagramUrl || "Not supplied"} {contact.shareInstagram ? "(shared)" : "(private)"}</p><p><strong>TikTok:</strong> {contact.tiktokUrl || "Not supplied"} {contact.shareTiktok ? "(shared)" : "(private)"}</p><p><strong>Website:</strong> {contact.websiteUrl || "Not supplied"} {contact.shareWebsite ? "(shared)" : "(private)"}</p></> : <p>No contact preferences supplied.</p>}<ReviewNote section="contact" /></section>

      <section className="form-section"><h2>Complete the review</h2><p>Select every section that needs work and add a clear note beneath that section. The creator will see the notes separately.</p><div className="field"><label htmlFor="decision-notes">Overall decision note (used for full rejection or suspension)</label><textarea id="decision-notes" name="notes" maxLength={1500} /></div><div className="action-row"><button className="button button-dark" name="action" value="changes_requested" type="submit">Send selected sections back</button><button name="action" value="approve" type="submit" disabled={!profile.accountOwnershipChecked}>Approve entire profile</button><button name="action" value="rejected" type="submit">Reject entire profile</button><button name="action" value="suspended" type="submit">Suspend</button></div></section>
    </form>
  </DashboardShell>;
}
