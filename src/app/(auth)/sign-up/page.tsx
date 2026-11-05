import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create your account", description: "Start free with 3 paystub documents. No card required.", alternates: { canonical: "/sign-up" } };

export default function SignUpPage() {
  return (
    <Suspense>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}
