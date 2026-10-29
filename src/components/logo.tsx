import Link from "next/link";
import Image from "next/image";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`wordmark ${inverse ? "wordmark-inverse" : "wordmark-image"}`} href="https://inflascope.co.uk/#top" aria-label="Inflascope home">
      {inverse ? <>infla<span className="logo-lens">o</span>scope</> : <Image src="/inflascope-green-pink-wordmark.png" alt="Inflascope" width={2172} height={724} priority />}
    </Link>
  );
}
