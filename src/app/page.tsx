import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgePoundSterling, Search, Send } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CreatorCard } from "@/components/creator-card";
import { FinalCta } from "@/components/final-cta";
import { getFeaturedCreators } from "@/lib/creators";

export const dynamic = "force-dynamic";

const categories = ["Parenting", "Beauty", "Food", "Fashion", "Fitness", "Home", "Pets", "Lifestyle"];

export default async function HomePage() {
  const creators = await getFeaturedCreators(3);
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <div className="coral-arrow" aria-hidden="true">↘</div>
            <h1>Small creators.<span>Big <span className="outline-word">possibilities.</span></span></h1>
            <p>Discover creators who fit your brand, your budget and your next big idea.</p>
            <div className="hero-buttons">
              <Link className="button button-cream" href="/creators">Find creators <ArrowUpRight size={18} /></Link>
              <Link className="button button-outline" href="/signup/creator">Join as a creator</Link>
            </div>
          </div>
          <div className="hero-visual" aria-label="Illustration showing fictional creator profiles and collaboration preferences">
            <div className="hero-grid" />
            <div className="hero-blob pink" />
            <div className="hero-blob green" />
            <div className="hero-swoop" />
            <div className="phone">
              <div className="phone-notch" />
              <Image src="/demo/ruby.jpg" alt="Fictional example creator Ruby" width={240} height={250} priority />
              <div className="phone-copy"><small>Beauty · Manchester</small><strong>Ruby creates</strong><p>Colourful, honest beauty content for thoughtful brands.</p><span className="mini-pill">Paid collaborations</span></div>
            </div>
            <div className="floating-portrait floating-one"><Image src="/demo/maya.jpg" alt="Fictional example creator Maya" width={130} height={130} /><span>Maya · Food</span></div>
            <div className="floating-portrait floating-two"><Image src="/demo/jonah.jpg" alt="Fictional example creator Jonah" width={130} height={130} /><span>Jonah · Pets</span></div>
            <div className="preference-card"><strong>Open to new ideas</strong><span>✓ Gifting considered</span><span>✓ Paid projects</span></div>
            <div className="social-symbol" aria-hidden="true">#</div>
          </div>
        </section>

        <section className="section section-white">
          <div className="container">
            <div className="section-heading centered"><span className="eyebrow">A simpler way to connect</span><h2>Find the right creators for your small business.</h2><p>Discover emerging creators open to gifting and paid collaborations. Find your match and connect directly.</p></div>
            <form className="search-bar" action="/creators" role="search">
              <div className="search-input-wrap"><Search size={21} aria-hidden="true" /><label className="sr-only" htmlFor="home-search">Search creators</label><input id="home-search" name="q" placeholder="Search by niche, creator or location" /></div>
              <button className="button button-dark" type="submit">Search creators</button>
            </form>
            <div className="benefit-grid section-tight">
              <article className="benefit"><div className="benefit-icon"><Search size={34} /></div><h3>Find your fit</h3><p>Search by niche, location and content style to find creators who feel right for your brand.</p></article>
              <article className="benefit"><div className="benefit-icon"><BadgePoundSterling size={34} /></div><h3>Work within your budget</h3><p>Discover creators considering gifting, paid collaborations or both—without awkward guesswork.</p></article>
              <article className="benefit"><div className="benefit-icon"><Send size={34} /></div><h3>Connect directly</h3><p>Brand members can reveal creator-approved contact details and arrange collaborations independently.</p></article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading"><span className="eyebrow">Explore by interest</span><h2>Start with what matters to your brand.</h2></div>
            <div className="category-grid">{categories.map((category) => <Link className="category-link" key={category} href={`/creators?niche=${category.toLowerCase()}`}>{category}</Link>)}</div>
          </div>
        </section>

        <section className="section section-white">
          <div className="container">
            <div className="section-heading"><span className="eyebrow">Creator spotlight</span><h2>Fresh voices, ready to discover.</h2><p>Approved public profiles show the essentials. Brand members unlock creator-approved contact details, collaboration preferences and supplied analytics.</p></div>
            {creators.length ? <div className="creator-grid">{creators.map((creator) => <CreatorCard key={creator.id} creator={creator} />)}</div> : <div className="empty-state"><h3>Creator profiles are being reviewed</h3><p>Approved profiles will appear here soon. You can still explore the directory or apply as a creator.</p></div>}
            <div style={{ marginTop: 32 }}><Link className="button button-dark" href="/creators">Browse all creators</Link></div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading centered"><span className="eyebrow">How it works</span><h2>From search to hello in three simple steps.</h2></div>
            <div className="steps">
              <article className="step"><h3>Search</h3><p>Browse approved creators by niche and platform. Members can narrow results with detailed filters.</p></article>
              <article className="step"><h3>Explore profiles</h3><p>Understand a creator’s style, audience and collaboration preferences before reaching out.</p></article>
              <article className="step"><h3>Connect directly</h3><p>Reveal the details a creator has chosen to share, then agree scope, price and terms together.</p></article>
            </div>
          </div>
        </section>

        <section className="section section-pink">
          <div className="container">
            <div className="section-heading centered"><span className="eyebrow">Creators join free</span><h2>Your profile. Your preferences. Your contacts.</h2><p>Creators never need a paid subscription. Build a profile, choose what you consider and decide which business details brand members can see.</p><Link className="button button-dark" href="/signup/creator">Create your free profile</Link></div>
          </div>
        </section>

        <section className="section section-white" id="pricing">
          <div className="container">
            <div className="section-heading centered"><span className="eyebrow">Two clear brand memberships</span><h2>Transparent from day one.</h2></div>
            <div className="membership-price-grid"><div className="pricing-card pricing-card-compact"><span className="tag badge-gifting">Standard</span><h3>Creator discovery</h3><div className="price">£12.99 <small>/ month</small></div><p><strong>Founding Standard: £10.99/month</strong> for the first 50 brands.</p><ul className="check-list"><li>Creator search and filters</li><li>Approved creator profiles and contacts</li><li>Private creator shortlist</li></ul><Link className="button button-dark button-full" href="/pricing">Compare Standard</Link></div><div className="pricing-card pricing-card-compact pricing-card-advanced"><span className="tag badge-gifting">Advanced</span><h3>Complete campaign workspace</h3><div className="price">£17.99 <small>/ month</small></div><p><strong>Founding Advanced: £14.99/month</strong> for the first 50 brands.</p><ul className="check-list"><li>Everything in Standard</li><li>Creator Match Requests and alerts</li><li>Campaign tools, CRM and templates</li></ul><Link className="button button-dark button-full" href="/pricing">Compare Advanced</Link></div></div>
            <p className="founding-price-note"><strong>Founding price locked for as long as your membership remains active.</strong> Limited to the first 50 brands in each founding tier.</p>
          </div>
        </section>
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
