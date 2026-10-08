import type { Metadata } from "next";
import Link from "next/link";
import { Filter, Search, X } from "lucide-react";
import { CreatorCard } from "@/components/creator-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { getBrandMembership } from "@/lib/access";
import { getAllNiches, getSavedCreatorIds, searchCreators, type CreatorSearch } from "@/lib/creators";

export const metadata: Metadata = {
  title: "Find creators",
  description: "Browse approved emerging creators by niche, platform and collaboration preference.",
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const numberOrUndefined = (value: string | undefined) => value && Number.isFinite(Number(value)) ? Number(value) : undefined;
const checked = (value: string | undefined) => value === "on" || value === "true";

export default async function CreatorsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const user = await getCurrentUser();
  const membership = user?.role === "brand" ? await getBrandMembership(user.id) : null;
  const hasMemberAccess = membership?.hasAccess ?? false;
  const search: CreatorSearch = {
    q: one(raw.q), niche: one(raw.niche), platform: one(raw.platform), country: one(raw.country), location: one(raw.location),
    instagramMin: numberOrUndefined(one(raw.instagramMin)), instagramMax: numberOrUndefined(one(raw.instagramMax)),
    tiktokMin: numberOrUndefined(one(raw.tiktokMin)), tiktokMax: numberOrUndefined(one(raw.tiktokMax)),
    gifting: checked(one(raw.gifting)), paid: checked(one(raw.paid)), ugc: checked(one(raw.ugc)), available: checked(one(raw.available)), format: one(raw.format),
    maxPrice: numberOrUndefined(one(raw.maxPrice)) === undefined ? undefined : numberOrUndefined(one(raw.maxPrice))! * 100, audienceCountry: one(raw.audienceCountry), sort: one(raw.sort), page: numberOrUndefined(one(raw.page)),
  };
  const [directory, nicheRows, savedIds] = await Promise.all([
    searchCreators(search, hasMemberAccess), getAllNiches(), getSavedCreatorIds(hasMemberAccess ? membership?.brandId ?? null : null),
  ]);
  const currentParams = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => { const item = one(value); if (item) currentParams.set(key, item); });
  const returnTo = `/creators${currentParams.size ? `?${currentParams}` : ""}`;
  const active = [
    search.q && `“${search.q}”`, search.niche && nicheRows.find((n) => n.slug === search.niche)?.name,
    search.platform && search.platform[0].toUpperCase() + search.platform.slice(1),
    hasMemberAccess && search.country && `Creator country: ${search.country}`,
    hasMemberAccess && search.location && `Location: ${search.location}`,
    hasMemberAccess && search.gifting && "Gifting", hasMemberAccess && search.paid && "Paid", hasMemberAccess && search.ugc && "UGC for brand social",
    hasMemberAccess && search.available && "Accepting collaborations", hasMemberAccess && search.format,
    hasMemberAccess && search.instagramMin !== undefined && `Instagram from ${search.instagramMin.toLocaleString()}`,
    hasMemberAccess && search.instagramMax !== undefined && `Instagram to ${search.instagramMax.toLocaleString()}`,
    hasMemberAccess && search.tiktokMin !== undefined && `TikTok from ${search.tiktokMin.toLocaleString()}`,
    hasMemberAccess && search.tiktokMax !== undefined && `TikTok to ${search.tiktokMax.toLocaleString()}`,
    hasMemberAccess && search.maxPrice !== undefined && `Starting price up to £${search.maxPrice / 100}`,
    hasMemberAccess && search.audienceCountry && `Audience: ${search.audienceCountry}`,
  ].filter(Boolean) as string[];
  const pageHref = (page: number) => { const params = new URLSearchParams(currentParams); params.set("page", String(page)); return `/creators?${params}`; };

  return (
    <>
      <a className="skip-link" href="#directory-results">Skip to creator results</a>
      <SiteHeader />
      <main>
        <section className="page-hero"><div className="container"><span className="eyebrow">Creator directory</span><h1>Find creators with the right kind of spark.</h1><p>Browse every approved public profile. Search by keyword, niche and platform for free; brand members unlock detailed filters, supplied analytics and creator-approved contact details.</p></div></section>
        <div className="container search-shell">
          <form className="search-bar" action="/creators" role="search">
            <div className="search-input-wrap"><Search size={21} aria-hidden="true" /><label className="sr-only" htmlFor="directory-search">Search creators</label><input id="directory-search" name="q" defaultValue={search.q} placeholder="Try ‘food’, ‘Manchester’ or a creator name" /></div>
            <button className="button button-dark" type="submit">Search</button>
          </form>
        </div>
        <div className="container directory-layout">
          <form className="filters" id="filters" action="/creators">
            <input type="hidden" name="q" value={search.q || ""} />
            <div className="filter-heading"><h2>Filters</h2><Link href="/creators">Clear all</Link><Link className="mobile-filter-toggle" href="#directory-results" aria-label="Close filters"><X size={19} /></Link></div>
            <div className="filter-group"><label htmlFor="niche">Niche</label><select id="niche" name="niche" defaultValue={search.niche || ""}><option value="">All niches</option>{nicheRows.map((niche) => <option key={niche.id} value={niche.slug}>{niche.name}</option>)}</select></div>
            <div className="filter-group"><label htmlFor="platform">Platform</label><select id="platform" name="platform" defaultValue={search.platform || ""}><option value="">Instagram or TikTok</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select></div>
            {!hasMemberAccess && <div className="locked-box"><strong>More ways to narrow your search</strong><p>Active brand members can filter by follower range, location, budget, audience and collaboration preferences.</p><Link className="text-link" href={user?.role === "brand" ? "/brand/dashboard#billing" : "/pricing"}>Unlock member filters</Link></div>}
            <fieldset disabled={!hasMemberAccess} style={{ border: 0, padding: 0, margin: 0 }}>
              <div className={`filter-group ${!hasMemberAccess ? "locked-filter" : ""}`}><label htmlFor="location">Creator location</label><input id="location" name="location" defaultValue={search.location || ""} placeholder="City or region" /><label htmlFor="country" style={{ marginTop: 10 }}>Creator country</label><input id="country" name="country" defaultValue={search.country || ""} placeholder="e.g. United Kingdom" /></div>
              <div className={`filter-group ${!hasMemberAccess ? "locked-filter" : ""}`}><label>Instagram followers</label><div className="form-grid"><input aria-label="Minimum Instagram followers" name="instagramMin" type="number" min="0" defaultValue={search.instagramMin} placeholder="Min" /><input aria-label="Maximum Instagram followers" name="instagramMax" type="number" min="0" defaultValue={search.instagramMax} placeholder="Max" /></div><label style={{ marginTop: 12 }}>TikTok followers</label><div className="form-grid"><input aria-label="Minimum TikTok followers" name="tiktokMin" type="number" min="0" defaultValue={search.tiktokMin} placeholder="Min" /><input aria-label="Maximum TikTok followers" name="tiktokMax" type="number" min="0" defaultValue={search.tiktokMax} placeholder="Max" /></div></div>
              <div className={`filter-group ${!hasMemberAccess ? "locked-filter" : ""}`}><label>Collaboration preferences</label><label className="checkbox"><input type="checkbox" name="gifting" defaultChecked={search.gifting} />Product-only gifting considered</label><label className="checkbox"><input type="checkbox" name="paid" defaultChecked={search.paid} />Paid collaborations considered</label><label className="checkbox"><input type="checkbox" name="ugc" defaultChecked={search.ugc} />UGC for a brand’s organic social channels</label><p className="field-help">Content for the brand to post—not paid ads, boosting or whitelisting.</p><label className="checkbox"><input type="checkbox" name="available" defaultChecked={search.available} />Currently accepting</label></div>
              <div className={`filter-group ${!hasMemberAccess ? "locked-filter" : ""}`}><label htmlFor="format">Content format</label><select id="format" name="format" defaultValue={search.format || ""}><option value="">Any format</option>{["Photos", "Stories", "Instagram Reels", "TikToks", "Brand-owned content"].map((format) => <option key={format}>{format}</option>)}</select></div>
              <div className={`filter-group ${!hasMemberAccess ? "locked-filter" : ""}`}><label htmlFor="maxPrice">Maximum starting price (£)</label><input id="maxPrice" name="maxPrice" type="number" min="0" defaultValue={search.maxPrice === undefined ? "" : search.maxPrice / 100} placeholder="e.g. 150" /><p className="field-help">Profiles without a price are excluded from this filter.</p></div>
              <div className={`filter-group ${!hasMemberAccess ? "locked-filter" : ""}`}><label htmlFor="audienceCountry">Main audience country</label><input id="audienceCountry" name="audienceCountry" defaultValue={search.audienceCountry || ""} placeholder="e.g. United Kingdom" /></div>
            </fieldset>
            <button className="button button-dark button-full" type="submit">Apply filters</button>
          </form>

          <section id="directory-results" aria-live="polite">
            <div className="results-head"><div><Link className="button button-dark button-small mobile-filter-toggle" href="#filters"><Filter size={17} /> Filters</Link><h2>{directory.total} {directory.total === 1 ? "creator" : "creators"}</h2></div><form action="/creators">{Object.entries(raw).filter(([key]) => !["sort", "page"].includes(key)).map(([key, value]) => <input key={key} type="hidden" name={key} value={one(value) || ""} />)}<label className="sr-only" htmlFor="sort">Sort creators</label><select id="sort" name="sort" defaultValue={search.sort || "relevance"}><option value="relevance">Relevance</option><option value="newest">Newest profiles</option><option value="updated">Recently updated</option><option value="price">Starting price</option></select><button className="button button-dark button-small" type="submit">Sort</button></form></div>
            {active.length > 0 && <div className="active-filters">{active.map((label) => <span className="filter-chip" key={label}>{label}</span>)}<Link className="text-link" href="/creators">Clear all</Link></div>}
            {!hasMemberAccess && <div className="membership-nudge"><p><strong>Public preview:</strong> You can browse profiles and portfolios freely. Brand membership reveals detailed supplied analytics, indicative prices, approved contact details and shortlist tools.</p><Link className="button button-dark button-small" href="/pricing">See membership</Link></div>}
            <div hidden data-sponsored-placement="disabled-at-launch" aria-hidden="true" />
            {directory.results.length ? <div className="creator-grid">{directory.results.map((creator) => <CreatorCard key={creator.id} creator={creator} canSave={hasMemberAccess} saved={savedIds.has(creator.id)} returnTo={returnTo} />)}</div> : <div className="empty-state"><h3>No creators match those filters yet.</h3><p>Try widening your follower range, removing a preference, or clearing all filters. New approved profiles will appear here.</p><Link className="button button-dark" href="/creators">Clear filters</Link></div>}
            {directory.pages > 1 && <nav className="pagination" aria-label="Creator results pages">{directory.page > 1 && <Link href={pageHref(directory.page - 1)} aria-label="Previous page">←</Link>}{Array.from({ length: directory.pages }, (_, index) => index + 1).map((page) => page === directory.page ? <span className="current" key={page} aria-current="page">{page}</span> : <Link key={page} href={pageHref(page)}>{page}</Link>)}{directory.page < directory.pages && <Link href={pageHref(directory.page + 1)} aria-label="Next page">→</Link>}</nav>}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
