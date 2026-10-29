import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Create your creator profile", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ error?: string }> };

const categories = [
  "Beauty & skincare", "Fashion", "Food & drink", "Lifestyle", "Fitness & wellbeing", "Parenting & family",
  "Pets", "Travel", "Home & interiors", "Technology & gaming", "Books & education", "Arts & crafts",
  "Finance & business", "Sustainability", "Automotive", "Entertainment & culture",
];

const socialPlatforms = ["Instagram", "TikTok", "YouTube", "Facebook", "LinkedIn", "X", "Threads", "Other"];

export default async function CreatorSignupPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return <>
    <SiteHeader />
    <main className="creator-signup-page">
      <section className="creator-signup-intro">
        <span className="eyebrow">Creator onboarding</span>
        <h1>Create your creator profile.</h1>
        <p>Tell growing brands what you create, who follows you and how you would like to collaborate. Creator profiles are free.</p>
        <div className="signup-intro-card">
          <strong>Be one of our first 200 creators</strong>
          <p>Your profile stays in draft until you verify your email and submit it for review.</p>
        </div>
        <ul className="check-list">
          <li>Choose every brand category that suits you</li>
          <li>Keep your phone number private if you prefer</li>
          <li>Select gifting, paid work and organic social UGC independently</li>
        </ul>
      </section>

      <section className="creator-signup-form-wrap">
        <form className="creator-signup-form" action="/api/auth/signup" method="post">
          <div className="signup-form-heading">
            <span className="eyebrow">Your details</span>
            <h2>Build your profile</h2>
            <p>Create your secure account and save the information brands will eventually use to find you.</p>
          </div>
          {error && <p className="form-message form-error">{error}</p>}
          <input type="hidden" name="role" value="creator" />

          <div className="form-grid creator-signup-grid">
            <div className="field"><label htmlFor="displayName">Display name</label><input id="displayName" name="displayName" required minLength={2} maxLength={80} autoComplete="name" placeholder="e.g. Alex Creates" /><p className="field-help">A first name or creator name is fine. A surname is not required.</p></div>
            <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>
            <div className="field"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" required autoComplete="tel" maxLength={30} placeholder="e.g. 07700 900000" /></div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /><p className="field-help">At least 8 characters, including a letter and a number.</p></div>

            <label className="checkbox signup-span-two privacy-choice"><input type="checkbox" name="phonePrivate" /><span><strong>Keep my phone number private.</strong> Inflascope can still use it for account support, but it will not appear to brands.</span></label>

            <fieldset className="signup-span-two option-fieldset">
              <legend>Which brand categories would you like to create content for?</legend>
              <p className="field-help">Choose all that suit your content, interests and audience.</p>
              <div className="category-option-grid">{categories.map((category) => <label key={category}><input type="checkbox" name="contentCategories" value={category} /><span>{category}</span></label>)}</div>
            </fieldset>

            <fieldset className="signup-span-two option-fieldset">
              <legend>How would you prefer brands to contact you?</legend>
              <div className="choice-row"><label><input type="radio" name="preferredContact" value="email" defaultChecked /><span>Email</span></label><label><input type="radio" name="preferredContact" value="phone" /><span>Phone</span></label><label><input type="radio" name="preferredContact" value="social" /><span>Social media message</span></label></div>
            </fieldset>

            <div className="field"><label htmlFor="socialPlatform">Contact social platform <small>(optional)</small></label><select id="socialPlatform" name="socialPlatform" defaultValue=""><option value="">Choose one</option>{socialPlatforms.map((platform) => <option key={platform}>{platform}</option>)}</select></div>
            <div className="field"><label htmlFor="socialHandle">Social username <small>(optional)</small></label><input id="socialHandle" name="socialHandle" maxLength={80} placeholder="e.g. @alexcreates" /></div>
            <div className="field"><label htmlFor="location">Location</label><input id="location" name="location" required maxLength={80} placeholder="e.g. Manchester" /></div>
            <div className="field"><label htmlFor="platform">Main platform</label><select id="platform" name="platform" required defaultValue=""><option value="">Choose one</option><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Blog</option></select></div>
            <div className="field"><label htmlFor="followers">Followers</label><input id="followers" name="followers" type="number" min={0} max={100000000} required placeholder="e.g. 4500" /></div>
            <div className="field signup-span-two"><label htmlFor="bio">Short introduction</label><textarea id="bio" name="bio" required minLength={20} maxLength={180} placeholder="Tell brands about your content style and audience…" /></div>

            <fieldset className="signup-span-two option-fieldset">
              <legend>Collaboration preferences</legend>
              <p className="field-help">Choose every option you are genuinely open to.</p>
              <div className="choice-row"><label><input type="checkbox" name="collabs" value="Gifting" /><span>Gifting</span></label><label><input type="checkbox" name="collabs" value="Paid projects" /><span>Paid projects</span></label><label><input type="checkbox" name="collabs" value="Organic social UGC" /><span>UGC for brand social media</span></label></div>
            </fieldset>

            <label className="checkbox signup-span-two"><input type="checkbox" name="over18" required /><span>I confirm I am 18 or over.</span></label>
            <label className="checkbox signup-span-two"><input type="checkbox" name="terms" required /><span>I agree to the <Link className="text-link" href="/terms" target="_blank">creator terms</Link> and confirm I have read the <Link className="text-link" href="/privacy" target="_blank">privacy notice</Link>.</span></label>
            <label className="checkbox signup-span-two"><input type="checkbox" name="marketingConsent" /><span>Email me occasional Inflascope news and launch updates. Optional.</span></label>
          </div>

          <button className="button button-dark button-full creator-signup-submit" type="submit">Create account &amp; verify email</button>
          <p className="auth-switch">Already joined? <Link className="text-link" href="/login">Log in</Link>.</p>
        </form>
      </section>
    </main>
    <SiteFooter />
  </>;
}
