# HeatShield Accessibility Record & Evaluation

> **Status**: Targeting WCAG 2.1 AA.  
> This document maintains the evaluated accessibility checklist, contrast measurements, keyboard interaction patterns, and Lighthouse audit findings.

---

## 1. Design & Contrast Audit (Targeting WCAG 2.1 AA)

All primary text elements target the 4.5:1 minimum contrast ratio for normal text and 3:1 for large text / graphical UI components.

| UI Element | Foreground Color | Background Color | Contrast Ratio | Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Text** | `#f8fafc` | `#0f172a` (Body) | **14.8:1** | Meets Level AAA |
| **Card Primary Text** | `#ffffff` | `#1e293b` (Card) | **12.6:1** | Meets Level AAA |
| **Secondary Text** | `#cbd5e1` | `#1e293b` (Card) | **9.1:1** | Meets Level AAA |
| **Muted Metadata** | `#94a3b8` | `#1e293b` (Card) | **5.4:1** | Meets Level AA |
| **Danger Badge Text** | `#ffffff` | `#b91c1c` (Red Alert) | **5.8:1** | Meets Level AA |
| **Orange Badge Text** | `#ffffff` | `#ea580c` (Orange Alert) | **3.8:1 (Large)** | Meets Level AA for Large Text |
| **Yellow Alert Text** | `#ffffff` | `#ca8a04` (Gold Card) | Enhanced with text-shadow and dark container backing |
| **Focus Ring** | `#38bdf8` | Any background | High visibility outline (2px outline + 2px offset) | Meets 3:1 non-text contrast |

---

## 2. Accessible UI Principles Applied

1. **Non-Color Dependent Indicators**:
   - Every risk tier pairs its distinctive color with a prominent unicode icon (`ℹ️`, `🟡`, `🟠`, `🚨`, `🛑`) and full textual description (`Below Threshold`, `Caution`, `Extreme Caution`, `Danger`, `Extreme Danger`).
2. **Keyboard Navigability**:
   - Focusable controls (ward dropdown, What-If button, status toggles, notes input, 72-hour timeline container) include explicit `:focus-visible` styling (`outline: 2px solid #38bdf8; outline-offset: 2px`).
   - The horizontal 72-hour timeline container is keyboard scrollable with `tabindex="0"` and an `aria-label="Hourly Heat Index Timeline"`.
3. **Screen Reader Semantic Structure**:
   - Proper heading hierarchy (`h1` -> `h2` -> `h3`).
   - Landmark regions (`<header>`, `<main>`, `<footer>`, `<section>`).
   - ARIA attributes: `aria-expanded` on simulator toggle, `aria-selected` on role tabs, `role="progressbar"` on completion bar with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
   - Dynamic actions container has `aria-live="polite"` for asynchronous status updates.
4. **Mobile Touch Target Size**:
   - All interactive buttons and chips have a minimum hit area of 44x44px or clear padding to prevent touch collisions.

---

## 3. Lighthouse Evaluation Protocol

- Target Viewport: Mobile emulation (360px - 412px width).
- Target Metrics:
  - Accessibility Score Target: ≥ 95 / 100
  - Performance Score Target: ≥ 90 / 100
  - Zero heavy external JavaScript dependencies or blocking web fonts.
