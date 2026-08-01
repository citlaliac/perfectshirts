import Link from "next/link";

/** Large serif brand banner for the intentionally crude 2002 look. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <p className="marquee-line">*** welcome to the perfect shirt website ***</p>
      <h1 className="brand-title">
        <Link href="/">perfect t shirts</Link>
      </h1>
      <p className="tagline">home of shirts that are perfect</p>
      <hr className="ugly-hr" />
      {/*
      <nav className="top-nav" aria-label="Primary">
        <Link href="/">home</Link>
        {" | "}
        <a href="#shirts">shirts</a>
        {" | "}
        <a href="mailto:hello@example.com">email me</a>
      </nav>
      <hr className="ugly-hr" />
      */}
    </header>
  );
}
