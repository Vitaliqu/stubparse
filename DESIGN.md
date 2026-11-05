---
name: StubParse
description: Paystubs in. Spreadsheets out. A ledger-calm world where every lifted number carries a highlighter and every total carries a check.
colors:
  paper: "#ffffff"
  canvas: "#f5f5f7"
  ink: "#0b0b0c"
  ink-2: "#1d1d1f"
  muted: "#6e6e73"
  faint: "#86868b"
  line: "#e5e5ea"
  line-2: "#d2d2d7"
  mark: "#ffe24a"
  mark-soft: "#fff4b8"
  ok: "#0a7d4f"
  ok-soft: "#e6f4ee"
  warn: "#a15c00"
  warn-soft: "#fdf1e0"
  bad: "#c4211b"
  bad-soft: "#fdecea"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 8vw, 5.75rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1.6vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title-panel:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "\"ss01\", \"cv11\""
  body-ui:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  group-label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.03em"
  numeric:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "\"tnum\", \"zero\""
  numeric-detail:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.67
    fontFeature: "\"tnum\", \"zero\""
  title-page:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title-section:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  reading:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  micro:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  mark: "2px"
  check: "5px"
  focus: "6px"
  segment: "7px"
  control-sm: "8px"
  control: "10px"
  control-lg: "12px"
  card: "14px"
  tile: "16px"
  panel: "22px"
  stage: "28px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  panel-pad: "16px"
  card-pad: "20px"
  column-gap: "24px"
  section: "112px"
  section-lg: "144px"
  container: "1200px"
  container-app: "1440px"
  rail: "320px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.ink-2}"
  button-primary-disabled:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.faint}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  button-ghost-hover:
    backgroundColor: "{colors.canvas}"
  button-danger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.bad}"
    rounded: "{rounded.control}"
  button-danger-hover:
    backgroundColor: "{colors.bad-soft}"
  button-inverse:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  button-sm:
    rounded: "{rounded.control-sm}"
    padding: "0 12px"
    height: "32px"
  button-lg:
    rounded: "{rounded.control-lg}"
    padding: "0 24px"
    height: "48px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  ledger-cell:
    textColor: "{colors.ink}"
    typography: "{typography.numeric}"
    rounded: "{rounded.control-sm}"
    padding: "0 10px"
    height: "32px"
  ledger-cell-hover:
    backgroundColor: "{colors.canvas}"
  ledger-cell-focus:
    backgroundColor: "{colors.paper}"
  segmented:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "3px"
  segmented-item:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.segment}"
    height: "32px"
  segmented-item-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "32px"
  stage:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.stage}"
    padding: "48px"
  badge-extracted:
    backgroundColor: "{colors.mark-soft}"
    textColor: "{colors.ink}"
    rounded: "6px"
    padding: "2px 6px"
  status-pill-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-pill-bad:
    backgroundColor: "{colors.bad-soft}"
    textColor: "{colors.bad}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  checkbox-checked:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.check}"
    size: "18px"
  switch-off:
    backgroundColor: "{colors.line-2}"
    rounded: "{rounded.pill}"
    width: "38px"
    height: "22px"
  switch-on:
    backgroundColor: "{colors.ok}"
  toast:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "14px 16px"
  topbar-app:
    backgroundColor: "{colors.paper}"
    height: "56px"
  topbar-site:
    backgroundColor: "{colors.paper}"
    height: "64px"
---

# Design System: StubParse

## Overview

**Creative North Star: "The Reconciled Ledger"**

StubParse looks like a very good accountant's desk lit by a product studio: white paper on a cool grey canvas, near-black ink, hairline rules, and nothing else until a number is touched. When a value is lifted from a paystub it gets a stroke of highlighter yellow; when the totals agree they get a green check. Those two marks, extraction and reconciliation, are the whole of the world's color story. Everything else stays achromatic so that they read instantly.

The craft register is Apple and Vercel product pages: tight Geist display type, generous section air on the marketing side, dense and quiet rows on the workspace side, one soft floating shadow for paper that sits above the canvas. Persuade surfaces (the landing, pricing, legal) and Operate surfaces (the workspace, account, auth) share every token; they differ only in density and scale. The signature move, the Reconciliation strip, is the same component on both: three math checks with a live status that update as the user edits.

Numbers are first-class. Every figure is set in Geist Mono with tabular, slashed-zero numerals so columns align and a 0 never reads as an O. Interfaces are flat at rest and answer state with tone, not decoration.

**Key Characteristics:**
- Achromatic base (paper, canvas, ink, two greys, two hairlines) with one signature hue: highlighter yellow, meaning "extracted".
- Green, amber and red carry state only: math checks, file states, toasts, status pills.
- Geist Sans for words, Geist Mono tabular figures for every number.
- 1px hairline rings (`line`) define panels; depth comes from canvas-vs-paper tone plus one soft float shadow.
- The Reconciliation strip appears wherever a stub's numbers appear.
- Motion is the expo ease-out, short, and fully suppressed under reduced motion.

## Colors

A cool, near-neutral grey ladder with one fluorescent accent and three muted state hues.

### Primary
- **Ledger Ink** (ink): primary buttons, headings, checked controls, the free-slot dots, the dark Privacy section and featured Pro plan, focus outlines and the caret. The system's "action" color is ink, not a hue.
- **Highlighter Yellow** (mark): the signature hue. Fills the `.mark`/`.sweep` highlight behind a value that was lifted from a stub, the ring of an extracted/editable sample amount, the yellow bar inside the logo mark, and text selection.
- **Highlighter Wash** (mark-soft): the background of the AI badge, the editable sample-amount inputs, and the brief afterglow of a spreadsheet cell the instant a value lands in it.

### Tertiary (state)
- **Reconciled Green** (ok) / **Green Wash** (ok-soft): passed math checks, the "Balanced" status pill, success toasts, the spreadsheet file icon, the Switch on-state.
- **Caution Amber** (warn) / **Amber Wash** (warn-soft): warning toasts and the partial-free-quota note in the rail.
- **Error Red** (bad) / **Red Wash** (bad-soft): failed checks, the "N issues" pill, failed-file dot, error toasts and inline auth/account errors, the danger button.

### Neutral
- **Paper** (paper): panels, cards, the marketing page ground, top bars, the floating stub.
- **Studio Canvas** (canvas): the workspace and auth ground, alternate marketing sections, segmented-control track, hover fills, spreadsheet header rows, icon tiles.
- **Graphite** (ink-2): body copy inside data rows and long-form legal text, primary-button hover.
- **Secondary Grey** (muted): supporting copy, nav links at rest, column headers, captions. 4.9:1 on white; the lowest grey allowed for running text.
- **Faint Grey** (faint): placeholders, disabled text, unchecked list ticks. Large or decorative only.
- **Hairline** (line): the 1px ring on every panel and card, table rules, dividers.
- **Hairline Strong** (line-2): control borders (secondary button, inputs, checkbox), the dashed drop zone, empty free-slot dots, scrollbar thumb, Switch off-state.

### Named Rules
**The Highlighter Means Extracted Rule.** Yellow appears only where data was lifted from a document (plus the logo mark and text selection). It never decorates headings, buttons, icons or feature lists.

**The State-Only Hue Rule.** Green, amber and red appear only to report a check, a file state, or a message outcome, always as a solid hue on its matching wash. They are never brand color.

**The Ink Is The Accent Rule.** Calls to action are near-black on white (or white on near-black in dark sections). There is no blue link color and no colored primary button.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Body Font:** Geist (with ui-sans-serif, system-ui), stylistic sets `ss01` and `cv11` on globally
**Label/Mono Font:** Geist Mono (with ui-monospace) for every figure, always tabular with slashed zero

**Character:** One family in two cuts. Sans set tight and heavy at display sizes for the product-page voice; mono for numbers so a pay stub reads like a ledger.

### Hierarchy
- **Display** (600, clamp(2.75rem → 5.75rem), 0.98, -0.04em): the landing H1 only. Pricing H1 and the closing CTA use the same weight and tracking at a smaller clamp (max 4.75rem / 4.5rem).
- **Headline** (600, clamp(2.25rem → 3.75rem), 1.02, -0.035em): marketing section heads and legal page titles; balanced wrap.
- **Lead** (400, clamp(1.0625rem → 1.25rem), 1.5, -0.01em): the paragraph under a headline, in muted grey, max ~34–36rem.
- **Title** (600, 19px, -0.02em): mode cards, audience columns. Workspace screen titles step to 20–32px at the same weight and tracking (Results 20px, Account 32px, auth card 26px).
- **Title Panel** (600, 15px, -0.01em): rail panel headings (Extraction, Export) and card names.
- **Body** (400, 15px, 1.625): marketing explanatory copy, FAQ answers, max 44–62ch. Legal long-form is 16px at 1.7.
- **Body UI** (400, 14px): workspace rows, menu items, field labels in the ledger.
- **Label** (500, 13px): segmented options, small buttons, panel subheads, form labels.
- **Group Label** (600, 12px, 0.03em, uppercase): ledger section headers inside a stub (Pay period, Earnings, Taxes, Deductions, Totals) and stub-table column heads. Data-structure labels only.
- **Numeric** (Geist Mono 400, 13–14px, tabular + slashed zero): every amount, date, file size, count. Totals step to 600.
- **Numeric Detail** (Geist Mono 400, 12px): the evidence line under each reconciliation check.

### Named Rules
**The Mono For Money Rule.** Any figure a user might compare, sum or copy is Geist Mono with `tnum` and `zero`. Labels beside it stay in Sans.

**The Negative Tracking Rule.** Sans tracking tightens as size grows: -0.01em at UI sizes, -0.02em at titles, -0.035/-0.04em at headlines and display. Positive tracking is reserved for the uppercase group label.

## Layout

Marketing pages sit in a 1200px container with a 16px gutter (24px from `sm`). Sections breathe at 112px vertical padding, 144px from `sm`, and alternate paper and canvas grounds, with one full-bleed ink section (Privacy) for the claim that needs the most weight. Section heads are centered (max 720px) except where a sticky left column pairs with a live demo. Content groups use 1px ink top-rules (`border-t` in ink) to start columns instead of boxes.

The workspace is a 1440px container on the canvas ground under a 56px paper top bar. It uses a named-area grid: on mobile the order is intake, rail, results; from 1024px it becomes a flexible main column plus a 320px sticky rail (top offset 80px) spanning both rows, with a 24px column gap and 16px row gap. Account is a single 760px column; auth is a single 400px card centred on canvas.

Density follows mode: ledger rows are 40px minimum with 32px editable cells; rail panels pad 16px; marketing panels pad 28–40px.

## Elevation & Depth

Flat by default. Depth comes from tone (paper panels on a canvas ground) and 1px hairline rings. Shadows are reserved for objects that genuinely float above the page: the sample paper stub and document previews, and transient overlays (toasts, menus). The marketing header gains a hairline shadow only after scroll.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 1px 2px rgb(11 11 12 / 0.04), 0 12px 32px -8px rgb(11 11 12 / 0.14)`): the sample stub on the Stage, document previews in a stub card, auth cards.
- **Pop** (`box-shadow: 0 2px 4px rgb(11 11 12 / 0.06), 0 16px 40px -12px rgb(11 11 12 / 0.22)`): toasts and the account menu.
- **Thumb** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 0 0 0.5px rgb(0 0 0 / 0.06)`): the active segment of a segmented control. The Switch knob uses `0 1px 3px rgb(0 0 0 / 0.2)`.
- **Scrolled Header** (`box-shadow: 0 1px 0 var(--color-line)`): marketing header once the page scrolls past 8px.

### Named Rules
**The Paper Floats Rule.** Only paper documents and transient overlays cast shadows. Panels and cards are defined by a hairline ring, never a shadow.

## Shapes

Softly rounded, stepped by object size: the bigger and more "stage-like" the surface, the larger the radius. Checkboxes 5px, segment thumbs 7px, small buttons 8px, default buttons, inputs and segmented tracks 10px, large buttons 12px, cards and workspace panels 14px (the base radius), toasts and icon tiles 16px, marketing panels (mode grid, pricing plans, reconcile demo, privacy zones, auth cards) 22px, the hero Stage 28px. Pills (status, usage meter, avatar, Switch) are fully round. The sample paper stub is 10px and tilts -1.2deg on large screens; it is the only rotated object.

Borders are drawn as inset 1px rings (`line` for containers, `line-2` for controls) so they never shift layout. The drop zone is the one dashed border. Grids of equal panels are built as 1px gaps over a `line` background, producing shared hairlines rather than doubled borders.

## Components

### Buttons
Confident, quiet, ink-first.
- **Shape:** gently rounded (10px default; 8px small; 12px large), heights 32 / 40 / 48px, medium weight, -0.01em tracking.
- **Primary:** ink fill, white text; hover to graphite. Disabled becomes canvas with faint text and a hairline ring.
- **Secondary:** paper with an inset `line-2` ring; hover fills canvas.
- **Ghost:** text only; hover fills canvas. Used for the hero's secondary action with a trailing arrow that nudges 2px right on hover.
- **Danger:** paper, red text, `line-2` ring; hover red wash.
- **Inverse:** white on ink surfaces (featured Pro plan).
- **Press / Focus:** all variants scale to 0.98 on press over 150ms; focus is the global 2px ink outline at 2px offset. A loading button shows the spinner and sets `aria-busy`.

### Chips and Pills
- **Extracted badge:** "AI" with a sparkle icon, highlighter wash fill, inset `mark` ring, 11px medium, 6px radius. An "OCR" sibling uses canvas fill with a hairline ring.
- **Status pill:** fully round, 12px medium: "Balanced" (green on green wash), "N issues" (red on red wash), "Unchecked" (muted on canvas).
- **Usage meter:** a round hairline pill with three 8px dots (ink = left, `line-2` = used), "N of 3 free" in tabular figures, and an ink "Upgrade" pill. Pro collapses to an ink "PRO" pill.

### Cards / Containers
- **Corner Style:** 14px in the workspace; 22px on marketing panels; 28px for the Stage.
- **Background:** paper on canvas (workspace) or paper ringed on paper (marketing); featured/pricing and privacy use ink with white text.
- **Shadow Strategy:** none; see The Paper Floats Rule.
- **Border:** 1px inset `line` ring; internal sections divided by `line` rules, with sub-bands on `canvas/60`.
- **Internal Padding:** 16px (rail), 16–20px (stub card), 28–40px (marketing).

### Inputs / Fields
- **Form input:** 44px tall, 10px radius, paper with inset `line-2` ring, 15px text, faint placeholder; focus thickens to a 2px ink ring.
- **Ledger cell:** borderless at rest (transparent, 32px tall, 8px radius, mono right-aligned for numbers, grouped as 1,960.00); hover reveals canvas fill and a hairline ring; focus turns paper with a 2px ink ring and shows the raw value. YTD cells are muted.
- **Extracted amount (demo):** 32px, highlighter wash with an inset `mark` ring, mono right-aligned; focus becomes a 2px ink ring.
- **Segmented control:** canvas track with hairline ring and 3px inset; 32px segments at 13px medium; active segment is paper with the Thumb shadow, inactive is muted and inks on hover. Used for mode (AI/Basic), format (XLSX/CSV/JSON) and layout (Horizontal/Vertical), with 14px icons.
- **Checkbox:** 18px, 5px radius; unchecked paper with `line-2` ring (hover to muted), checked/indeterminate ink with a white stroke.
- **Switch:** 38x22 pill, `line-2` off, green on, 18px white knob sliding with the expo ease.
- **Error:** inline red text on red wash at 10px radius.

### Navigation
- **Marketing header:** sticky, 64px, paper; wordmark, then 14px muted links that ink on hover, with "Sign in" ghost link and a small primary "Start free" on the right. Links hide below `md`.
- **App top bar:** sticky, 56px, paper with a bottom hairline; wordmark, Workspace/Account tabs (14px; active is canvas fill, medium, ink; inactive muted), then usage meter and a 32px ink avatar opening a 14px-radius menu with the Pop shadow.
- **Footer:** canvas ground, wordmark plus two 13px link columns, closing hairline and 12px legal line.

### Reconciliation Strip (signature)
Three math checks: earnings add up to gross; gross minus taxes and deductions equals net; YTD is at least current. Each row is an 18px round status dot (green check pass, red X fail, `line-2` dash skipped) beside a 13px medium label and a 12px mono evidence line ("$2,319.40 = $2,319.40") tinted by status. Pending checks show a shrunken `line` dot and "checking…" in faint grey, and reveal with a 300ms expo scale. It lays out three-across from `sm`/`md` and stacks in narrow demos, always sits in its own band separated by hairlines (canvas or translucent paper), and lives in a polite live region so edits announce. It appears on the hero Stage, in the interactive demo, and at the top of every expanded stub card.

### Stage (landing hero)
A canvas slab (28px radius, hairline ring) holding the tilted paper stub on the left and a `paystubs.xlsx` sheet on the right, with the Reconciliation strip in a footer band. Played once on first view: every 360ms a stub value sweeps highlighter left-to-right (520ms) and its cell wipes in (560ms clip after 160ms) with a yellow-wash afterglow fading over 1.1s; then the checks tick. The whole page is a drop target, and dragging a file turns the Stage into a 92% paper "Drop to parse" overlay with a 2px ink ring. Captioned as fictional sample data with a Replay link.

### Drop Zone (workspace)
A full-width dashed `line-2` button on translucent paper, 14px radius, with a 56px ink icon tile (16px radius) that lifts 2px on hover, a 24–28px semibold prompt and a muted format line. It compacts once files exist; dragging sets an ink border on solid paper.

## Do's and Don'ts

### Do:
- **Do** use ink (#0b0b0c) for every primary action and white-on-ink for actions inside dark sections.
- **Do** set every amount, date and count in Geist Mono with tabular, slashed-zero figures.
- **Do** put the Reconciliation strip beside any stub data a user can edit, and keep it in a live region.
- **Do** draw containers with a 1px inset `line` ring on paper, 14px radius in the app and 22px on marketing panels.
- **Do** reserve shadows for floating paper (Float) and overlays (Pop).
- **Do** animate with the expo ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`), 150–300ms for UI state, and rely on the global reduced-motion override.
- **Do** label any product imagery as fictional sample data.

### Don't:
- **Don't** use highlighter yellow for anything that was not extracted from a document (headings, icons, feature ticks, buttons).
- **Don't** use green, amber or red as decoration or brand color; they only report a check, a file state, or a message outcome.
- **Don't** introduce a colored primary button or a blue link color.
- **Don't** use `faint` (#86868b) for running text; `muted` (#6e6e73) is the floor for readable copy.
- **Don't** put shadows on panels, cards or rail sections.
- **Don't** hard-code hex values in components; use the tokens.
