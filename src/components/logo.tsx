import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`wordmark ${inverse ? "wordmark-inverse" : ""}`} href="/" aria-label="inflascope home">
      infla<span className="logo-lens">o</span>scope
    </Link>
  );
}