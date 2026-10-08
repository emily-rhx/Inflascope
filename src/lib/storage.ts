import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function storageMode(): "s3" | "local" | null {
  if (process.env.OBJECT_STORAGE_ENDPOINT && process.env.OBJECT_STORAGE_BUCKET && process.env.OBJECT_STORAGE_ACCESS_KEY_ID && process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY && process.env.OBJECT_STORAGE_PUBLIC_BASE_URL) return "s3";
  if (process.env.ALLOW_LOCAL_UPLOADS === "true") return "local";
  return null;
}

function validMagic(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

function client() {
  return new S3Client({
    region: process.env.OBJECT_STORAGE_REGION || "auto",
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!, secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY! },
  });
}

export async function storeImage(file: File, visibility: "public" | "private") {
  const extension = acceptedTypes.get(file.type);
  if (!extension || file.size < 100 || file.size > 8 * 1024 * 1024) throw new Error("invalid_file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validMagic(bytes, file.type)) throw new Error("invalid_file");
  const key = `${visibility}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
  const mode = storageMode();
  if (!mode) throw new Error("storage_unavailable");
  if (mode === "s3") {
    await client().send(new PutObjectCommand({ Bucket: process.env.OBJECT_STORAGE_BUCKET!, Key: key, Body: bytes, ContentType: file.type, CacheControl: visibility === "public" ? "public, max-age=31536000, immutable" : "no-store", ACL: visibility === "public" ? "public-read" : "private" }));
    return { key, publicUrl: visibility === "public" ? `${process.env.OBJECT_STORAGE_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}` : null, contentType: file.type };
  }
  const base = visibility === "public" ? path.join(process.cwd(), "public", "uploads") : path.join(process.cwd(), "storage", "private");
  const localName = `${randomUUID()}.${extension}`;
  await mkdir(base, { recursive: true });
  await writeFile(path.join(base, localName), bytes, { flag: "wx" });
  return { key: `${visibility}/${localName}`, publicUrl: visibility === "public" ? `/uploads/${localName}` : null, contentType: file.type };
}

export async function readPrivateImage(key: string) {
  if (!key.startsWith("private/")) throw new Error("invalid_key");
  const mode = storageMode();
  if (mode === "s3") {
    const result = await client().send(new GetObjectCommand({ Bucket: process.env.OBJECT_STORAGE_BUCKET!, Key: key }));
    if (!result.Body) throw new Error("not_found");
    return { bytes: await result.Body.transformToByteArray(), contentType: result.ContentType || "application/octet-stream" };
  }
  if (mode === "local") {
    const name = path.basename(key);
    const bytes = await readFile(path.join(process.cwd(), "storage", "private", name));
    const extension = path.extname(name).toLowerCase();
    return { bytes, contentType: extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg" };
  }
  throw new Error("storage_unavailable");
}