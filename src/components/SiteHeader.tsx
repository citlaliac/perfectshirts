import Image from "next/image";
import Link from "next/link";

/** Brand mark + title; the gif sits to the left of “perfect shirts”. */
export function SiteHeader() {
  return (
    <header className="site-header">
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
    </header>
  );
}
