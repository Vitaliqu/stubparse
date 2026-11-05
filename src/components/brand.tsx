import Link from "next/link";

/** The StubParse mark: a stub with a perforated edge and one highlighted line. */
function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M5 2.5h14a1.5 1.5 0 0 1 1.5 1.5v16.2l-1.75-1.2-1.75 1.2-1.75-1.2-1.75 1.2-1.75-1.2-1.75 1.2-1.75-1.2-1.75 1.2V4A1.5 1.5 0 0 1 5 2.5Z"
        fill="#0b0b0c"
      />
      <rect x="6.5" y="9.5" width="11" height="3" rx="0.6" fill="#ffe24a" />
      <rect x="6.5" y="6" width="6" height="1.5" rx="0.6" fill="#fff" opacity="0.55" />
      <rect x="6.5" y="14.5" width="8" height="1.5" rx="0.6" fill="#fff" opacity="0.55" />
    </svg>
  );
}

export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2 rounded-md ${className}`} aria-label="StubParse home">
      <Mark className="size-[22px]" />
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">StubParse</span>
    </Link>
  );
}
