---
name: aLinha
description: Calm, information-dense compliance workspace for Portuguese SMEs, their IT technician and their consultant.
colors:
  paper: "#ffffff"
  paper-soft: "#f7f7f8"
  paper-deep: "#e5e7e9"
  ink: "#202124"
  ink-soft: "#555a5f"
  muted: "#646a6f"
  brand: "#0b4f4a"
  brand-deep: "#063632"
  brand-soft: "#d2e4e1"
  signal: "#12786e"
  signal-soft: "#cdedea"
  silver: "#747b82"
  line: "#858b90"
  line-soft: "#d9dde0"
  risk-low: "#e3ebe9"
  risk-low-ink: "#2f514b"
  risk-medium: "#f3e7c9"
  risk-medium-ink: "#66460b"
  risk-high: "#f3dbd5"
  risk-high-ink: "#7a2617"
  danger: "#9b2c1c"
typography:
  headline:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.18
    letterSpacing: "-0.015em"
  headline-dialog:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.18
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
  body-small:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  display-onboarding:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  subtitle:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  stat-value:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.25
  chip:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
  label-lg:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.06em"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.06em"
rounded:
  xs: "8px"
  control-sm: "9px"
  control: "10px"
  option: "12px"
  card: "14px"
  table: "16px"
  feature: "20px"
  pill: "999px"
spacing:
  chip-y: "4px"
  stack-sm: "8px"
  stack: "12px"
  card-x: "20px"
  section: "28px"
  content-y: "44px"
  content-x: "56px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "13px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-soft}"
  button-small:
    rounded: "{rounded.control-sm}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  chip-signal:
    backgroundColor: "{colors.signal-soft}"
    textColor: "{colors.brand}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-neutral:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-dark:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  card-highlight:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.feature}"
    padding: "30px 32px"
  nav-item:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
  nav-item-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
  note:
    backgroundColor: "{colors.signal-soft}"
    textColor: "{colors.brand}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  dialog:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.feature}"
    padding: "28px 32px"
    width: "540px"
  toast:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.option}"
    padding: "12px 16px"
---

# Design System: aLinha

## Overview

**Creative North Star: "The Calm Ledger"**

aLinha reads like a well-kept ledger: white paper, one deep teal ink, and records you can trust. Most screens are tables, lists and forms that someone has to work through, so the system favours order over spectacle. Information is dense but never noisy, the hierarchy comes from type weight and spacing rather than colour, and every state (empty, loading, error, done) is stated plainly. Detail opens in side panels so the list stays in view, much like turning to a ledger's margin notes instead of leaving the page.

The palette is almost monochrome. Neutral paper and ink carry the structure, and the Alinha Teal family marks what is actionable, current or reassuring. The only other hues are the three risk levels and danger, and they always come with an icon and words. Surfaces are flat with hairline borders. Shadows appear only on things that float above the ledger: dialogs, drawers, toasts and menus.

The system serves a non-technical officer, a part-time technician and a consultant handling many clients. It therefore keeps one calm voice everywhere and lets density vary by screen. It has no generic cybersecurity imagery (no shields, padlocks or hooded figures). It also runs in a dark theme and three colour-vision modes, so meaning never depends on a single hue.

**Key Characteristics:**
- Near-monochrome: paper and ink, with one deep teal accent family.
- Flat surfaces separated by hairline borders, with shadows reserved for overlays.
- Nunito Sans for everything readable, and IBM Plex Mono in uppercase only for eyebrows and table headers.
- Tables and side panels are the main way information is shown.
- Every semantic state pairs colour with an icon and text.
- Dark theme and colour-vision palettes are first-class, not afterthoughts.

## Colors

The palette is quiet neutral paper with one deep teal ink. Colour means "act here" or "this is the level", never decoration.

### Primary
- **Alinha Teal** (brand): primary buttons, links, the text of the active nav item, the selected option border, and AI badge text. This is the colour of the one action that matters on a screen.
- **Deep Lagoon** (brand-deep): highlight cards, toasts, the dark "Alta" criticality chip, and the primary-button hover. It is the darkest surface in the light theme and is used sparingly.
- **Sea Glass** (brand-soft): the active nav background, avatars, selected-option fill, and the input focus halo.

### Secondary
- **Signal Teal** (signal): progress fills, completion ticks and the focus ring. It is not used for body text on white, because it misses AA there; text uses Alinha Teal instead.
- **Pale Signal** (signal-soft): notes, the "Média" criticality chip and the eyebrow on highlight cards.

### Tertiary (semantic, risk scale)
- **Low risk** (risk-low / risk-low-ink): a sober grey-green.
- **Medium risk** (risk-medium / risk-medium-ink): muted ochre.
- **High risk** (risk-high / risk-high-ink): a dusty brick tint.
- **Danger** (danger): destructive actions, field errors, and the border of invalid inputs.

The risk pairs are AA-tested. Under protanopia and deuteranopia they shift to blue, amber and dark orange (and signal turns blue). Under tritanopia they shift to teal, magenta and red. Dark-theme equivalents are defined in `src/index.css`.

### Neutral
- **Paper** (paper): the content background, cards and dialogs.
- **Soft Paper** (paper-soft): the side nav, table headers, secondary cards and hover fills.
- **Deep Paper** (paper-deep): the neutral chip, progress track and segmented-control well.
- **Ink** (ink): primary text.
- **Soft Ink** (ink-soft): secondary text, inactive nav items and subtitles.
- **Muted** (muted): eyebrows, captions and hints.
- **Line** (line): borders of fields and secondary buttons, and the dashed "por registar" box. It is darker than the Figma value so form controls meet 3:1.
- **Hairline** (line-soft): card borders and table row separators.
- **Silver** (silver): the disabled primary button.

### Named Rules
**The One Ink Rule.** Alinha Teal is the only accent. If a screen needs a second colour to make sense, the hierarchy is wrong.

**The Never-Colour-Alone Rule.** Risk, criticality and status always carry an icon or a word next to the colour: Circle, TriangleAlert or OctagonAlert, plus the label.

**The Signal-Is-Not-Text Rule.** Signal Teal fills bars, ticks and focus rings. Any text that would sit in signal on white uses Alinha Teal.

## Typography

**Body Font:** Nunito Sans (with system-ui, sans-serif)
**Label/Mono Font:** IBM Plex Mono (with ui-monospace, monospace)

**Character:** Nunito Sans is rounded and friendly without being childish. It suits a non-specialist reading legal obligations. IBM Plex Mono in small uppercase works like the ruled column headings of a ledger: technical, quiet, and never used for content.

### Hierarchy
- **Headline** (800, 1.875rem, 1.18, −0.015em; 1.625rem below md): page titles, one per page, under an eyebrow.
- **Headline, dialog** (800, 1.625rem, 1.18): dialog and drawer titles.
- **Display, highlight** (800, ~1.875rem, title-tight): the title inside a Deep Lagoon highlight card only.
- **Title** (800, 1.0625rem, 1.25, −0.01em): section headings inside a page and card titles.
- **Stat value** (800, 1.125rem): the number or value on stat cards.
- **Body** (400, 0.9375rem, 1.45): default text and field values. Subtitles are 1rem in Soft Ink.
- **Body small** (400–600, 0.8125rem): field labels (600, Soft Ink), hints, captions and table meta.
- **Label / Eyebrow** (Plex Mono 500, 0.6875–0.75rem, 0.06em, UPPERCASE, Muted): page eyebrows, table headers and stat-card labels. Never smaller than 0.6875rem.
- **Display, onboarding** (800, 4rem, 0.98, −0.03em): the "Tudo alinhado." line on the onboarding brand panel only.

There is no 14px step: text is either body (15px) or body small (13px). Tailwind's `text-sm` is remapped to 13px in `src/index.css`.

All sizes are in rem so that iOS Dynamic Type and browser zoom scale the whole UI.

### Named Rules
**The Mono-Is-Metadata Rule.** IBM Plex Mono appears only in uppercase eyebrows and table headers. Never use it for sentences, values or buttons.

**The Weight-Not-Colour Rule.** Emphasis comes from weight (600, 700, 800), not from tinting text. Bold names in tables (700), ExtraBold titles (800).

## Layout

- **Desktop:** the reference is 1440×900. A sticky side nav (232px, Soft Paper, Hairline right border) sits beside a content column capped at 1152px, centred. Content padding is 44px top and 56px sides (32px below lg), and 28px separates page blocks.
- **Mobile:** the reference is 390×844, and the breakpoint is md (48rem). A top bar with the logo (56px sticky header) and a fixed bottom tab bar replace the side nav. Content padding is 20px, with extra bottom padding (~112px) to clear the tab bar. Scroll padding keeps focused fields clear of both bars (WCAG 2.4.11).
- **Page header:** an eyebrow (with optional help on the right), then the title and an optional subtitle. Actions sit at the right, aligned to the title baseline, and go full width on mobile.
- **Tables to cards:** data tables switch to stacked cards below md (or below xl for wide tables).
- **Side panels:** asset and risk detail opens in a right-hand drawer over a lighter veil (ink 30%), so the list stays visible.
- **Rhythm:** stat cards appear three across with 16px gaps. Cards use 18/20 padding and rows 14/20. Gaps of 6–12px sit inside components and 28px between blocks.

## Elevation & Depth

The ledger is flat at rest. Depth comes from tone (Paper → Soft Paper → Deep Paper) and hairline borders. Shadows mean "this floats above the page". All shadows are tinted from `--shadow-rgb`, which is ink-grey in light and pure black in dark.

### Shadow Vocabulary
- **Hover lift** (`0 2px 10px rgb(var(--shadow-rgb)/0.06)`): appears on clickable stat cards when hovered.
- **Segment thumb** (`0 1px 3px rgb(var(--shadow-rgb)/0.14)`): marks the active segment in a segmented control.
- **Toast** (`0 12px 32px rgb(var(--shadow-rgb)/0.25)`): used on toasts.
- **Popover** (`0 16px 48px rgb(var(--shadow-rgb)/0.18)`): used on menus and popovers.
- **Dialog** (`0 24px 64px rgb(var(--shadow-rgb)/0.22)`): used on modals and drawers.
- **Focus halo** (`0 0 0 3px var(--color-brand-soft)`): marks a focused input. Every other element uses the 2px Signal Teal outline instead.

### Named Rules
**The Float-Only Shadow Rule.** Shadows belong to overlays (dialogs, drawers, toasts, popovers) and to hover on clickable cards. Cards, tables and panels sitting on the page stay borderline-flat.

## Shapes

The corners are gently rounded on a graded scale: small controls are tighter and big surfaces softer. Controls and nav items use 10px (small buttons 9px), options and toasts 12px, cards 14px, tables 16px, and highlight cards and dialogs 20px. Chips, badges and avatars are full pills or circles. Borders are 1px, Hairline on containers and Line on interactive controls. The "por registar" placeholder is the only dashed border, a 36px box with a 4/4 dash.

## Components

### Buttons
Calm and sturdy: bold labels, no gradients, and a 1px press nudge.
- **Shape:** gently rounded (10px; 9px for small).
- **Primary:** Alinha Teal fill with white bold 15px text, padded 13/24. It darkens to Deep Lagoon on hover and turns Silver when disabled. Use one per view.
- **Secondary:** a Paper button with a 1px Line border and Ink text. On hover the border goes to Soft Ink and the fill to Soft Paper.
- **Ghost / Link / Danger / Inverse:** a ghost button is Soft Ink text with a Soft Paper hover. A link is Alinha Teal and underlines on hover. A danger button has Paper fill and Danger text, and its border turns Danger on hover. An inverse button is Paper on Deep Lagoon surfaces.
- **Focus:** a 2px Signal Teal outline offset by 2px.

### Chips
- **Style:** pills with bold 12px text, padded 4/10.
- **Criticality:** Alta is the dark chip (Deep Lagoon), Média the signal chip (Pale Signal with Alinha Teal text), and Baixa the neutral chip (Deep Paper with Soft Ink text).
- **Risk badge:** the risk tint and ink plus an icon (Circle, TriangleAlert, OctagonAlert) and a label. There is a larger 14px variant for detail headers.
- **AI badge:** "✦ Gerado por IA · apenas informativo" or "✦ Proposta pela IA · por validar", outlined with a Sea Glass border. On dark surfaces it is filled Alinha Teal with Pale Signal text. It is mandatory on all AI content.

### Cards / Containers
- **Corner Style:** 14px (tables 16px, highlight 20px).
- **Background:** Paper, or Soft Paper for secondary cards.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px Hairline.
- **Internal Padding:** 18/20.
- **Stat card:** a mono eyebrow, an ExtraBold value and a 13px Soft Ink caption.
- **Highlight card:** a Deep Lagoon block (30/32 padding) with a Pale Signal eyebrow, a white ExtraBold title and Sea Glass body text. Use at most one per page, for the next important thing.

### Inputs / Fields
- **Style:** Paper fill, 1px Line border, 10px radius, padded 12/14, 15px value. The label sits above it in SemiBold 13px Soft Ink, with a 6px gap.
- **Focus:** the border turns Alinha Teal and gains a 3px Sea Glass halo.
- **Error / Disabled:** an error turns the border Danger and adds a SemiBold 13px Danger message with `role="alert"`. A disabled field is filled Soft Paper with Muted text.
- **Option cards (radio):** 12px radius, padded 14/16. When selected they get a Sea Glass fill, Alinha Teal border and bold Alinha Teal label.
- **Segmented control:** a well of Deep Paper at 70% with 4px padding. The active segment is lifted Paper with Alinha Teal text, a thin brand ring and the segment-thumb shadow. It deliberately never uses the brand fill, so it doesn't compete with the primary button.

### Navigation
- **Side nav:** Soft Paper, 232px wide. Items are 40px tall with a 10px radius, 15px SemiBold Soft Ink text and a Deep Paper hover. The active item has a Sea Glass fill and bold Alinha Teal text, marked with `aria-current="page"`. The aLinha logo sits at the top and the avatar with name and role at the bottom.
- **Mobile:** a bottom tab bar with the same entries, plus a "Mais" overflow sheet.
- **Forced colours:** current, selected and pressed states switch to system Highlight.

### Data Table (signature)
The heart of the ledger. A 16px-radius bordered card with a Soft Paper header row of 11px mono uppercase Muted headings (sortable, with arrow icons). Rows are padded 14/20 with Hairline separators, cells use the 15px body size, and asset names are Bold. Each row opens a drawer through a stretched button, while links and controls inside cells keep their own clicks. Bulk selection uses brand-accent checkboxes. Below md the table becomes cards.

### Note
A full-width Pale Signal band (10px radius, padded 10/14) with an info icon and SemiBold 13px Alinha Teal text. Use it for gentle guidance, never for errors. A `warning` tone (Medium-risk tint and ink, TriangleAlert icon) asks for attention before a decision, such as validating a roadmap with no risk-prioritised actions.

### Toast
A Deep Lagoon pill (12px radius) at the bottom-left of the content area (at the top on mobile). It shows a Pale Signal "✓" and bold white 15px text. Errors use the high-risk ink as the fill, with a dismiss button.

## Do's and Don'ts

### Do:
- **Do** keep one primary (Alinha Teal) button per view; everything else is secondary, ghost or link.
- **Do** pair every risk, criticality or status colour with an icon and a pt-PT label.
- **Do** use the mono uppercase eyebrow above every page title and as table headers.
- **Do** open detail in a right-hand drawer and keep the list visible behind it.
- **Do** define new colours as tokens in `src/index.css`, with dark-theme and colour-vision overrides at the same time.
- **Do** design empty, loading (skeleton rows) and error states for every data surface.
- **Do** label all AI content with the AI badge.

### Don't:
- **Don't** use shields, padlocks, hooded hackers or other generic cybersecurity imagery.
- **Don't** put Signal Teal text on white; use Alinha Teal.
- **Don't** add shadows to cards or tables at rest.
- **Don't** introduce a second accent hue or decorative gradients.
- **Don't** use IBM Plex Mono for sentences, values or buttons.
- **Don't** use the brand fill on segmented controls or tabs; it belongs to the primary action.
- **Don't** hard-code hex values in components; reference the tokens so the themes and colour-vision modes keep working.
