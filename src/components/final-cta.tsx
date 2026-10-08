import Link from "next/link";

export function FinalCta() {
  return (
    <section className="final-cta">
      <div className="container">
        <h2>Your next collaboration starts here.</h2>
        <div className="hero-buttons">
          <Link className="button button-cream" href="/creators">Find creators</Link>
          <Link className="button button-outline" href="/signup/creator">Join as a creator</Link>
        </div>
      </div>
    </section>
  );
}