---
name: "Honara7ty Quiet Luxury"
description: "Quiet luxury sacred spiritual companion with soft mist backgrounds, paper-white cards, deep navy headers, and restrained champagne gold accents."
---

## Overview

Honara7ty (هنا راحتى) is crafted with calm, adult reverence. It strips away all cheap gradients, neon glows, aggressive gamification, and clutter. The interface evokes a quiet luxury chapel in morning light: an elegant deep navy header, serene mist background (#F3F5F9), pristine paper-white cards (#FFFFFF), muted steel blue primary accents (#6E93B0), and whisper-soft champagne gold (#D6C39A) used only for liturgical accents and verse details.

## Colors

- **Header Navy:** #0A1124 (used for headers and primary anchors)
- **Soft Mist Ground:** #F3F5F9 (calm, expansive breathing surface)
- **Pure Paper Card:** #FFFFFF (crisp elevation without harsh borders)
- **Steel Blue Accent:** #6E93B0 (understated, meditative focus)
- **Soft Champagne Gold:** #D6C39A (sacred highlights, verse accents, restrained eyebrows)
- **Text Primary:** #0A1124 (near-black deep navy for museum clarity)
- **Text Muted:** #667085 (refined subtexts and metadata)
- **Borders:** #E6EAF1 (barely visible, calm separation)

```yaml
colors:
  navy-header: "#0A1124"
  steel: "#6E93B0"
  steel-light: "#EAF0F6"
  steel-dark: "#4B6B85"
  champagne: "#D6C39A"
  champagne-soft: "#FAF7F0"
  mist: "#F3F5F9"
  paper: "#FFFFFF"
  border-quiet: "#E6EAF1"
  light:
    primary: "#0A1124"
    on-primary: "#FFFFFF"
    surface: "#F3F5F9"
    on-surface: "#0A1124"
    surface-card: "#FFFFFF"
    surface-subtle: "#F8FAFC"
    border-subtle: "#E6EAF1"
    text-muted: "#667085"
  dark:
    primary: "#D6C39A"
    on-primary: "#0A1124"
    surface: "#080D1A"
    on-surface: "#F4F6FB"
    surface-card: "#101626"
    surface-subtle: "#161E33"
    border-subtle: "#1F2B44"
    text-muted: "#8896AB"
```

## Typography

Rooted in classical Arabic hierarchy: **Amiri** for liturgical verses, solemn scripture, and ceremonial headings; **Tajawal** for clean, crystalline interface labels and body copy with generous line-heights.

```yaml
typography:
  display-lg:
    fontFamily: "Amiri"
    fontSize: 34px
    fontWeight: 700
    lineHeight: 46px
    letterSpacing: 0px
  display-lg-mobile:
    fontFamily: "Amiri"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: 0px
  headline-lg:
    fontFamily: "Amiri"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 38px
    letterSpacing: 0px
  headline-lg-mobile:
    fontFamily: "Amiri"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 30px
    letterSpacing: 0px
  headline-md:
    fontFamily: "Tajawal"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 26px
    letterSpacing: 0px
  headline-sm:
    fontFamily: "Tajawal"
    fontSize: 16px
    fontWeight: 700
    lineHeight: 24px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Amiri"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 36px
    letterSpacing: 0px
  body-md:
    fontFamily: "Tajawal"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 26px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Tajawal"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Tajawal"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: "Tajawal"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: 0px
  label-sm:
    fontFamily: "Tajawal"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
```

## Layout & Spacing

Generous, restful margins (20px gutters, 24px vertical section breathing). Never overcrowded. One dominant focal point per section.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 20px
  gutter-xl: 28px
  section: 32px
  page-margin: 20px
```

## Elevation & Depth

No heavy dark shadows. Pure paper white cards floating over a soft mist (#F3F5F9) background, separated by gentle whisper borders (#E6EAF1) and low-opacity diffused ambient light (`0 4px 20px -2px rgba(10,17,36,0.03)`).

## Shapes

Soft, architectural curvature (20px to 24px radius on cards, 12px on secondary actions, full pill for navigation).

```yaml
rounded:
  sm: 8px
  DEFAULT: 12px
  md: 16px
  lg: 22px
  xl: 26px
  full: 9999px
```

## Motion & Micro-interaction

Understated, serene transitions. No bouncing or gamified pulses.

```yaml
motion:
  state-change:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-enter:
    duration: 240ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: ease-in
```

## Voice & Content Strategy

Reverent, calm, and uplifting. Free of synthetic hype or corporate buzzwords.
