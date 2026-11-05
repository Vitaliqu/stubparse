import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { FREE_DOCUMENTS, TIERS } from "@/lib/plan";

export const metadata: Metadata = { title: "Terms", description: "The terms for using StubParse.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 4, 2026">
      <p>By creating an account or using StubParse you agree to these terms.</p>

      <h2>The service</h2>
      <p>StubParse extracts data from paystub documents you provide and lets you export it. Extraction can be wrong. Review every value before you rely on it for tax, lending, payroll, or any other decision. StubParse is not financial, tax, or legal advice.</p>

      <h2>Your content</h2>
      <p>Only upload documents you have the right to process. You keep all rights to your documents and the data extracted from them.</p>

      <h2>Plans and billing</h2>
      <ul>
        <li>Every account includes {FREE_DOCUMENTS} free documents.</li>
        <li>Pro costs ${TIERS.pro.monthly} per month or ${TIERS.pro.yearly} per year. Business costs ${TIERS.business.monthly} per month or ${TIERS.business.yearly} per year. Plans are billed in advance through Stripe and renew until you cancel.</li>
        <li>Paid plans are unlimited for normal use, subject to a monthly fair-use ceiling. We may limit accounts whose volume points to automated or abusive use.</li>
        <li>Plan changes made from your billing page are prorated by Stripe.</li>
        <li>Business includes five seats. The subscriber (team owner) is responsible for the team&apos;s use. Members can see, edit, and delete the team&apos;s shared history. If the owner&apos;s subscription ends, members lose Business features.</li>
        <li>You can cancel any time. Access continues until the end of the paid period. Payments already made are not refunded except where the law requires.</li>
      </ul>

      <h2>Income reports and integrity checks</h2>
      <p>Income reports and integrity signals are calculations on the documents you provide. They are not consumer reports, credit decisions, or findings of fraud. If you use them for lending, tenancy, or employment decisions, you are responsible for complying with the laws that apply to those decisions, including verifying information through other sources where required.</p>

      <h2>API</h2>
      <p>API keys are for your own systems. Keep them secret. You are responsible for activity on your keys, and we may revoke keys that are abused.</p>

      <h2>Acceptable use</h2>
      <p>Don&apos;t attempt to bypass usage limits, overload the service, or use it to process documents unlawfully.</p>

      <h2>Liability</h2>
      <p>The service is provided as is. To the extent the law allows, our total liability is limited to the amount you paid us in the 12 months before the claim.</p>

      <h2>Changes</h2>
      <p>We may update these terms and will post the new date above. Continuing to use StubParse after a change means you accept it.</p>

      <p>Questions: <a href="mailto:support@stubparse.com">support@stubparse.com</a></p>
    </LegalPage>
  );
}
