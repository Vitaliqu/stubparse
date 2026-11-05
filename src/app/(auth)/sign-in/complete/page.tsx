import type { Metadata } from "next";
import { Suspense } from "react";
import { CompleteEmailLink } from "@/components/auth/CompleteEmailLink";

export const metadata: Metadata = { title: "Finishing sign-in", robots: { index: false } };

export default function CompletePage() {
  return (
    <Suspense>
      <CompleteEmailLink />
    </Suspense>
  );
}
