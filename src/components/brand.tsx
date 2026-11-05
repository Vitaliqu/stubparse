import Link from "next/link";

/** The StubParse mark: a stub with a perforated edge and one highlighted line. */
function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M5 2.5H19Q20.5 2.5 20.5 4V20.2L18.375 19L16.25 20.2L14.125 19L12 20.2L9.875 19L7.75 20.2L5.625 19L3.5 20.2V4Q3.5 2.5 5 2.5Z"
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
