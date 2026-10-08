import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import type { CreatorCardData } from "@/lib/creators";
import { formatFollowers, generalLocation } from "@/lib/utils";

export function CreatorCard({ creator, canSave = false, saved = false, returnTo = "/creators" }: { creator: CreatorCardData; canSave?: boolean; saved?: boolean; returnTo?: string }) {
  const primaryNiche = creator.niches.find((niche) => niche.primary) || creator.niches[0];
  return (
    <article className="creator-card">
      <div className="creator-image-wrap">
        {creator.photoUrl ? (
          <Image src={creator.photoUrl} alt={`${creator.displayName}, ${primaryNiche?.name || "creator"}`} fill sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw" />
        ) : <div aria-hidden="true" />}
        {creator.isExample && <span className="example-label">Fictional example</span>}
        {canSave && (
          <form action="/api/shortlist" method="post">
            <input type="hidden" name="creatorId" value={creator.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="intent" value={saved ? "remove" : "save"} />
            <button className="save-button" type="submit" aria-label={saved ? `Remove ${creator.displayName} from shortlist` : `Save ${creator.displayName} to shortlist`}>
              <Heart size={19} fill={saved ? "currentColor" : "none"} />
            </button>
          </form>
        )}
      </div>
      <div className="creator-card-body">
        <h3>{creator.displayName}</h3>
        <div className="location"><MapPin size={14} aria-hidden="true" />{generalLocation(creator.city, creator.region, creator.country)}</div>
        <div className="tags">
          {primaryNiche && <span className="tag">{primaryNiche.name}</span>}
          {creator.preference?.considersGifting && <span className="tag badge-gifting">Gifting considered</span>}
          {creator.preference?.considersPaid && <span className="tag badge-paid">Paid collaborations</span>}
          {creator.availability && <span className="tag badge-available">Accepting collaborations</span>}
        </div>
        <div className="social-counts">
          {creator.socials.map((social) => (
            <div key={social.platform}><span>{social.platform}</span><strong>{formatFollowers(social.followerCount)}</strong></div>
          ))}
        </div>
        <div className="card-action">
          <Link className="text-link" href={`/creators/${creator.slug}`}>View profile <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </article>
  );
}