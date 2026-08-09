"use client";

/**
 * Detail-page error UI — offers a hard reload when client routing fails
 * on the static host.
 */
export default function ShirtDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <h2>couldn’t open that shirt</h2>
      <p>try a full reload — static hosting sometimes glitches soft navigation.</p>
      <p>
        <button type="button" className="detail-side-btn" onClick={() => reset()}>
          try again
        </button>{" "}
        <a href="/">← back to all shirts</a>
      </p>
    </main>
  );
}
