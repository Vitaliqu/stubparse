import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <Suspense>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
