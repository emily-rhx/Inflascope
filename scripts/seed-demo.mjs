import "dotenv/config";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import pg from "pg";

if (process.env.DEMO_SEED_CONFIRM !== "yes") throw new Error("Refusing to seed. Set DEMO_SEED_CONFIRM=yes for a non-production demo database.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const adminPassword = process.env.DEMO_ADMIN_PASSWORD || `Demo-${randomUUID().slice(0, 10)}-9a`;
const creatorPassword = `Demo-${randomUUID().slice(0, 10)}-8b`;
const adminHash = await hash(adminPassword, 12);
const creatorHash = await hash(creatorPassword, 12);
const nicheNames = ["Parenting", "Beauty", "Food", "Fashion", "Fitness", "Home", "Pets", "Lifestyle"];
const examples = [
  { email: "maya@inflascope-demo.invalid", name: "Maya Makes", slug: "maya-makes-example", photo: "/demo/maya.jpg", city: "Bristol", country: "United Kingdom", intro: "Warm, colourful recipes and easy hosting ideas for thoughtful everyday brands.", bio: "I create relaxed food and lifestyle content built around achievable recipes, happy tables and the stories behind independent products. My audience comes for useful ideas, natural styling and a genuinely personal point of view.", style: "Natural-light recipe videos, overhead photography, friendly voiceovers and practical kitchen storytelling.", brands: "Independent food, tableware, kitchen, hosting and considered lifestyle brands.", excluded: "Alcohol, gambling and diet-culture products.", niche: "food", instagram: 18400, tiktok: 9200, gifting: true, paid: true, price: 6500, formats: ["Photos", "Stories", "Instagram Reels", "Brand-owned content"], portfolio: [["/demo/portfolio-food.jpg", "A colourful brunch styled on handmade ceramic tableware"], ["/demo/portfolio-home.jpg", "A warm home setting used for relaxed lifestyle storytelling"]] },
  { email: "ruby@inflascope-demo.invalid", name: "Ruby Creates", slug: "ruby-creates-example", photo: "/demo/ruby.jpg", city: "Manchester", country: "United Kingdom", intro: "Honest, expressive beauty content with close-up detail and a bright editorial feel.", bio: "I make approachable beauty content for people who enjoy colour, texture and straightforward product experiences. My work combines polished close-ups with conversational demonstrations and inclusive, honest storytelling.", style: "Bold studio colour, detailed tutorials, product textures and direct-to-camera reviews.", brands: "Inclusive skincare, haircare, colour cosmetics and independent wellbeing brands.", excluded: "Skin-lightening products, unsubstantiated health claims and fast-fashion hauls.", niche: "beauty", instagram: 32700, tiktok: 24600, gifting: false, paid: true, price: 11000, formats: ["Stories", "Instagram Reels", "TikToks", "Brand-owned content"], portfolio: [["/demo/portfolio-beauty.jpg", "Unbranded skincare products arranged on colourful sculptural blocks"], ["/demo/portfolio-home.jpg", "A calm interior scene used as a wellbeing campaign backdrop"]] },
  { email: "jonah@inflascope-demo.invalid", name: "Jonah & Moss", slug: "jonah-and-moss-example", photo: "/demo/jonah.jpg", city: "Leeds", country: "United Kingdom", intro: "Playful pet and home content starring Moss, with practical tips and gentle humour.", bio: "Moss and I share pet-friendly home ideas, honest product trials and small everyday adventures. The content is warm, useful and lightly funny, with plenty of room for products to appear naturally rather than feeling forced.", style: "Candid pet photography, short comedic videos, practical explainers and cosy home scenes.", brands: "Responsible pet care, enrichment, outdoor, cleaning and durable home brands.", excluded: "Unsafe pet products, shock collars and irresponsible breeding services.", niche: "pets", instagram: 7800, tiktok: 41200, gifting: true, paid: true, price: null, formats: ["Photos", "Instagram Reels", "TikToks"], portfolio: [["/demo/portfolio-pet.jpg", "A small terrier playing with a coral enrichment toy at home"], ["/demo/portfolio-home.jpg", "A pet-friendly reading corner styled in warm natural colours"]] },
];

try {
  await client.query("begin");
  await client.query("delete from users where email like '%@inflascope-demo.invalid'");
  const nicheIds = new Map();
  for (let index = 0; index < nicheNames.length; index++) {
    const name = nicheNames[index]; const slug = name.toLowerCase();
    const result = await client.query("insert into niches (name, slug, sort_order, active) values ($1,$2,$3,true) on conflict (slug) do update set name=excluded.name, sort_order=excluded.sort_order, active=true returning id", [name, slug, index]);
    nicheIds.set(slug, result.rows[0].id);
  }
  await client.query("insert into users (email,password_hash,role,display_name,email_verified_at) values ($1,$2,'admin','Demo Admin',now())", ["admin@inflascope-demo.invalid", adminHash]);
  for (const item of examples) {
    const user = await client.query("insert into users (email,password_hash,role,display_name,email_verified_at) values ($1,$2,'creator',$3,now()) returning id", [item.email, creatorHash, item.name]);
    const profile = await client.query("insert into creator_profiles (user_id,slug,display_name,photo_url,city,country,short_intro,biography,content_style,brand_interests,excluded_sectors,languages,main_audience_country,audience_summary,status,availability,account_ownership_checked,ownership_checked_at,is_example,submitted_at,approved_at,last_updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'English','United Kingdom','Primarily UK-based adults interested in practical, independent-brand recommendations.','approved',true,true,now(),true,now(),now(),now()) returning id", [user.rows[0].id,item.slug,item.name,item.photo,item.city,item.country,item.intro,item.bio,item.style,item.brands,item.excluded]);
    const creatorId = profile.rows[0].id;
    await client.query("insert into creator_niches (creator_id,niche_id,is_primary) values ($1,$2,true)", [creatorId,nicheIds.get(item.niche)]);
    await client.query("insert into creator_niches (creator_id,niche_id,is_primary) values ($1,$2,false) on conflict do nothing", [creatorId,nicheIds.get("lifestyle")]);
    await client.query("insert into social_accounts (creator_id,platform,handle,follower_count,account_control_confirmed) values ($1,'instagram',$2,$3,true),($1,'tiktok',$4,$5,true)", [creatorId,`${item.slug}-ig`,item.instagram,`${item.slug}-tt`,item.tiktok]);
    await client.query("insert into collaboration_preferences (creator_id,considers_gifting,considers_paid,formats,minimum_starting_price,typical_turnaround,gifting_note) values ($1,$2,$3,$4,$5,'10–14 days','Product fit, timing and deliverables are considered case by case.')", [creatorId,item.gifting,item.paid,item.formats,item.price]);
    await client.query("insert into creator_contacts (creator_id,share_email,share_instagram,share_tiktok,share_website) values ($1,false,false,false,false)", [creatorId]);
    for (let i = 0; i < item.portfolio.length; i++) await client.query("insert into portfolio_assets (creator_id,type,url,alt_text,sort_order,approved) values ($1,'image',$2,$3,$4,true)", [creatorId,item.portfolio[i][0],item.portfolio[i][1],i]);
    await client.query("insert into engagement_metrics (creator_id,platform,follower_count,average_views,average_reach,engagement_rate,engagement_rate_basis,reporting_period,measured_at,audience_location_summary,audience_age_summary,evidence_status,reviewed_at) values ($1,'instagram',$2,$3,$4,'4.20','Total interactions divided by followers × 100','Previous 30 days',now() - interval '7 days','United Kingdom is the largest supplied audience country','Largest supplied group: 25–34','reviewed',now()),($1,'tiktok',$5,$6,null,null,null,'Previous 30 days',now() - interval '7 days','United Kingdom is the largest supplied audience country','Not supplied','not_reviewed',null)", [creatorId,item.instagram,Math.round(item.instagram*.42),Math.round(item.instagram*.61),item.tiktok,Math.round(item.tiktok*.78)]);
  }
  await client.query("commit");
  console.log("Demo seed complete. All creator records are marked as fictional examples.");
  console.log(`One-time demo admin login: admin@inflascope-demo.invalid / ${adminPassword}`);
} catch (error) {
  await client.query("rollback"); throw error;
} finally { await client.end(); }
