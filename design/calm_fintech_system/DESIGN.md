---
name: Calm Fintech System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#960014'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc1d25'
  on-tertiary-container: '#ffd0cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-currency:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-currency-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 24px
  container-padding-desktop: 48px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

This design system is built on the principles of **Minimalism** and **Corporate Modernism**. It prioritizes clarity, financial confidence, and emotional "breathing room" to reduce the anxiety often associated with personal finance management. 

The aesthetic is characterized by generous whitespace, a restricted but purposeful color palette, and high-quality typography. The goal is to evoke a sense of professional reliability and quiet sophistication, ensuring that the user feels in control of their data rather than overwhelmed by it. All visual elements are secondary to the data itself, using subtle depth and soft transitions to guide the user's focus.

## Colors

The color strategy uses a logic of **functional signaling**. 
- **Primary (Indigo):** Reserved for primary actions, progress indicators, and active states. It represents the "intellect" of the app.
- **Success (Green):** Used exclusively for income, positive trends, and completed goals.
- **Negative (Red):** Used for expenses, overspent budgets, and critical alerts.
- **Neutrals:** A scale of cool grays derived from Slate (#64748B) to maintain a crisp, professional tone against the #FAFAFA background.

Avoid using the primary indigo for informational text; keep it purely for interactive or "hero" moments to maintain its significance.

## Typography

This design system utilizes **Inter** for its exceptional legibility and neutral character. A critical requirement for this fintech application is the use of **Tabular Numerals** (tnum) for all currency displays to ensure that decimal points and digits align vertically in lists and tables.

For the Indonesian Rupiah (IDR), the prefix "Rp" should be styled with a slightly lighter font weight or a smaller size than the main amount to emphasize the numerical value.
- **Currency formatting:** `Rp 1.250.000` (Use dot as thousand separator).
- **Negative values:** `-Rp 50.000` (Red).
- **Positive values:** `+Rp 50.000` (Green).

## Layout & Spacing

The system follows a strict **8px grid** to maintain mathematical harmony. 
- **Mobile:** 4-column fluid grid with 24px side margins and 16px gutters.
- **Desktop:** 12-column fixed grid (max-width 1200px) with 48px side margins.

Content is organized primarily in "vertical stacks." Use `stack-lg` (24px) to separate distinct logical sections (e.g., between a chart and a transaction list) and `stack-md` (16px) for elements within a section (e.g., between individual transaction items). Whitespace should be used aggressively to prevent the financial data from feeling cramped.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. 
- **Level 0 (Background):** #FAFAFA. This is the canvas.
- **Level 1 (Cards):** Pure White (#FFFFFF) with a soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.04)`. This is the primary container for all data.
- **Level 2 (Modals/Popovers):** Pure White with a more pronounced shadow: `0px 10px 32px rgba(0, 0, 0, 0.08)`.

Avoid harsh borders. Instead, use a subtle 1px stroke in #F1F5F9 (Slate 100) on cards to define edges if they appear against white backgrounds.

## Shapes

The design system uses a "Rounded" (Level 2) language to appear approachable and modern.
- **Cards & Primary Containers:** 16px (`rounded-lg`) corner radius.
- **Buttons & Inputs:** 12px corner radius.
- **Chips & Segmented Controls:** Fully rounded (pill-shaped) to distinguish them from primary action buttons.

Consistency in corner radius is vital; do not mix sharp and rounded elements within the same view.

## Components

### Buttons
- **Primary:** Solid Indigo background with white text. No gradient.
- **Secondary:** Ghost style with an Indigo 1px border or a light Indigo tint background (#EEF2FF).

### Segmented Controls
Used for toggling views (e.g., "Weekly" vs "Monthly"). These should be styled as a pill-shaped "track" with a sliding white surface behind the active text label.

### Cards
All financial data (Transactions, Portfolio Value, Budgets) must be housed in 16px rounded cards. Cards should have a 24px internal padding to ensure data doesn't feel crowded.

### Bottom Navigation
The navigation bar should be blur-backed (Glassmorphism) or pure white with a 1px top border. Icons should be 24px, using a 2px stroke weight. Active states are indicated by the Primary Indigo color and a small 4px dot below the icon.

### Input Fields
Inputs should use a 12px radius with a light gray border (#E2E8F0). On focus, the border transitions to Indigo with a 3px soft outer glow in the same color (20% opacity). Labels should always be visible above the input in `label-caps` style.