import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = { title: "Privacy", description: "What StubParse does and doesn't do with your paystubs and your account.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="November 4, 2026">
      <p>StubParse is built so your paystubs don&apos;t have to leave your device. This page explains exactly what happens to your files and what we keep about you.</p>

      <h2>Your documents</h2>
      <ul>
        <li><strong>Basic mode:</strong> the file is opened and parsed entirely in your browser. Nothing about its contents is sent to us.</li>
        <li><strong>AI mode:</strong> your browser extracts the text first, and only that text is sent to our server. When a scan has no readable text, downscaled images of its pages (up to five) are sent instead. We pass it to Anthropic&apos;s Claude API to read the fields, return the result to your browser, and keep nothing.</li>
        <li><strong>API:</strong> documents sent to the API are passed to Claude for reading and discarded after the response.</li>
        <li>We never write your documents or their raw text to a database or to disk.</li>
      </ul>

      <h2>Saved history (paid plans)</h2>
      <ul>
        <li>On Pro and Business, the extracted figures from each stub (names, dates, amounts, labels) are saved to your account so you can reopen and re-export them. The original file is never saved.</li>
        <li>Saved stubs are deleted automatically after 12 months by default. Choose 3, 6, 12, or 24 months, or keep them until you delete them, in your account preferences.</li>
        <li>On a Business team, saved stubs go to the team&apos;s shared history, where every team member can see them.</li>
        <li>Turn history off in Account → Preferences, delete individual stubs from History, or delete your whole account at any time.</li>
      </ul>

      <h2>Your account</h2>
      <p>We store your email address, your sign-in method, the number of documents you&apos;ve parsed, your subscription status, your preferences, and hashed API keys. Accounts are managed with Google Firebase Authentication and Cloud Firestore.</p>

      <h2>Email</h2>
      <p>We send a welcome email and a few short product emails, for example when you haven&apos;t parsed a stub yet or have one free document left. Every one has an unsubscribe link. Receipts come from Stripe.</p>

      <h2>Analytics and error monitoring</h2>
      <p>We use PostHog to count product events (sign-ups, parses, exports, upgrades) and Sentry to catch errors. Neither receives the contents of your documents: inputs are masked, session recording is off, and request bodies are stripped from error reports.</p>

      <h2>Payments</h2>
      <p>Subscriptions are processed by Stripe. Your card details go directly to Stripe and never reach our servers. We keep your Stripe customer ID and subscription status.</p>

      <h2>Service providers</h2>
      <ul>
        <li>Google Firebase: authentication and account storage</li>
        <li>Stripe: billing</li>
        <li>Anthropic: AI extraction (AI mode and the API)</li>
        <li>Resend: product email</li>
        <li>PostHog: product analytics</li>
        <li>Sentry: error monitoring</li>
        <li>Upstash: rate limiting (no document data)</li>
        <li>Vercel: hosting</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>Delete your account from Account → Delete account. It removes your account record, saved history, preferences, and API keys immediately, and cancels any subscription. Stripe retains invoice records as payment law requires. Questions: <a href="mailto:privacy@stubparse.com">privacy@stubparse.com</a>.</p>
    </LegalPage>
  );
}
