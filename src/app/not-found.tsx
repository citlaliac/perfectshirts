import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h2>404 shirt not found</h2>
      <p>that shirt does not exist on this website.</p>
      <p>
        <Link href="/">go home</Link>
      </p>
    </main>
  );
}
