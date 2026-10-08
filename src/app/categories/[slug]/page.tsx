import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { niches } from "@/db/schema";
import { CreatorCard } from "@/components/creator-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { searchCreators } from "@/lib/creators";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const [niche] = await db.select().from(niches).where(eq(niches.slug, slug)).limit(1); if (!niche || !niche.active) return { title: "Category not found", robots: { index: false, follow: false } }; return { title: `${niche.name} creators`, description: `Discover approved ${niche.name.toLowerCase()} creators open to gifting and paid collaborations on inflascope.`, alternates: { canonical: `/categories/${niche.slug}` } }; }
export default async function CategoryPage({ params }: Props) { const { slug } = await params; const [niche] = await db.select().from(niches).where(eq(niches.slug, slug)).limit(1); if (!niche || !niche.active) notFound(); const directory = await searchCreators({ niche: slug }, false); return <><SiteHeader /><main><section className="page-hero"><div className="container"><span className="eyebrow">Browse by category</span><h1>{niche.name} creators</h1><p>Explore approved public profiles from creators working in {niche.name.toLowerCase()}. Gifting and paid badges reflect what each creator says they will consider.</p></div></section><section className="section section-white"><div className="container">{directory.results.length ? <div className="creator-grid">{directory.results.map((creator) => <CreatorCard creator={creator} key={creator.id} />)}</div> : <div className="empty-state"><h3>No approved profiles here yet.</h3><p>Try the full directory or check back as new creator applications are approved.</p></div>}<div style={{ marginTop: 34 }}><Link className="button button-dark" href={`/creators?niche=${slug}`}>Search with filters</Link></div></div></section></main><SiteFooter /></>; }