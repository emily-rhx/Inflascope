import { readPublicImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("public/")) return new Response("Not found", { status: 404 });

  try {
    const image = await readPublicImage(key);
    return new Response(image.bytes as BodyInit, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
