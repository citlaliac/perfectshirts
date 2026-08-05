import Image from "next/image";
import Link from "next/link";

/** Large serif brand banner for the intentionally crude 2002 look. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <p className="marquee-line">*** welcome to the perfect shirt website ***</p>
      <Link className="brand-link" href="/">
        <Image
          className="brand-logo"
          src="/assets/logo.gif"
          alt=""
          width={72}
          height={72}
          unoptimized
          priority
        />
        <h1 className="brand-title">perfect shirts</h1>
      </Link>
      <p className="tagline">home of shirts that are perfect</p>
    </header>
  );
}
