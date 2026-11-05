# Product

## Platform

web

## Users

Anyone who needs paystub data in a spreadsheet (confirmed: broad positioning). In practice this covers three groups with the same job:

- **Bookkeepers, accountants, payroll/HR admins:** turn batches of employee paystubs into rows they can reconcile, every pay cycle.
- **Lenders, loan officers, landlords, leasing agents:** check an applicant's income across several stubs and compare gross, net, and YTD.
- **Individuals:** organize their own stubs for taxes, budgeting, or a loan/rental application.

The job in every case: drop in PDFs or photos of paystubs, check the extracted numbers, and export clean structured data.

## Product Purpose

StubParse extracts structured payroll data (employee, pay period, pay date, earnings, taxes, deductions, totals, YTD) from paystub PDFs and images, lets the user correct any field, and exports to Excel (XLSX), CSV, or JSON. Success: a user goes from a pile of stubs to a correct spreadsheet in minutes without retyping numbers.

## Positioning

- Files are processed in the browser: PDF text extraction (PDF.js) and OCR (Tesseract.js) run on the user's device. Only extracted text (or a downscaled image when no text exists) is sent to the server for AI extraction, and nothing is stored.
- AI extraction (Claude) plus arithmetic validation: earnings sum vs gross, the net-pay formula, YTD ≥ current.
- Every field stays editable before export; exports pivot by pay period (horizontal) or one row per stub (vertical).

## Operating Context

- Inputs: PDF, PNG, JPG, WEBP (also BMP/TIFF in the browser), many files per batch, up to 20 MB each.
- Two modes: Basic (rule-based regex parsing, fully in browser) and AI (Claude extraction).
- Designed for stubs from Square Payroll, Gusto, ADP, Paychex, Intuit QuickBooks, and generic formats. These are formats it handles, not partnerships or endorsements.

## Capabilities and Constraints

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Deploys to Vercel.
- **Accounts:** Firebase Authentication with Google, Apple, email + password, and email magic link.
- **Database:** Cloud Firestore, holding user profile, usage count, and subscription state.
- **Pricing (confirmed):** every account gets 3 free documents for its lifetime. Pro costs $5/month for unlimited documents, with a quiet fair-use cap against abuse. Billing runs on Stripe (Checkout plus Customer Portal).
- **Metering:** one parsed document = one use, whether Basic or AI mode. The count is enforced server-side.
- **Not decided:** annual pricing, team/multi-seat plans, the exact fair-use cap, and a document history/storage feature (nothing is stored today).

## Brand Commitments

- Name: StubParse. Domain: stubparse.com.
- Visual ambition set by the user: should look like it came from a high-end company such as Apple or Vercel.

## Evidence on Hand

- No testimonials, customer logos, usage numbers, press, or case studies exist. Do not invent any.
- No real paystub samples are in the repo. Any product imagery must use clearly fictional sample data.

## Product Principles

1. **Privacy is the mechanism, not a slogan:** say exactly what leaves the device and what doesn't.
2. **Numbers you can trust:** surface the validation and make correction effortless before export.
3. **From pile to spreadsheet in one pass:** batch-first, minimal steps, no setup.
4. **Honest pricing:** 3 free, then one simple plan. No dark patterns around limits or cancellation.

## Accessibility & Inclusion

WCAG 2.2 AA as the baseline. The app is used for long, repetitive data checking, so keyboard operation and legible numeric tables matter.
