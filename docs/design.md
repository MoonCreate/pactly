# Pactly — Design brief

> Hand this to Claude Design (or any designer). The text is the spec; the tokens are
> non-negotiable; everything else is a starting point that the designer can sharpen.

---

## What Pactly is

Pactly is a dating app where every confirmed date is backed by an on-chain
stake. People match and chat free; when both want to meet, both put up money in
escrow. **Show up → stake returned. Ghost → stake burned. Disagree → both
burned.** Honesty is the only winning strategy — lying never benefits the liar,
which sidesteps the need for arbitration.

The wedge is **crypto-native APAC singles**: people who already have wallets,
understand staking, and feel the ghosting problem acutely. Built on 0G — escrow
+ reputation contracts (0G Chain), encrypted chat storage (0G Storage),
AI-scored matchmaking + an in-chat AI "wingman" (0G Compute), verified-human
reputation (0G Agent ID).

The mechanic is the product: every screen that touches a stake, a
confirmation, or a reputation update has to make the cost feel real without
making the app feel hostile. The design's job is to make honesty legible —
warm, not punitive.

Five surfaces matter most for the demo and for the product:

- **Browse** — Tinder-style swipe deck. First impression and the demo's hero
  shot.
- **Chat + propose date** — where free-chat ends and the stake mechanic
  begins. The most product-defining transition in the app.
- **Post-date confirmation** — the "did you meet?" moment. Two taps decide
  whether stakes return or burn.
- **Resolution outcome** — the celebrate / commiserate beat. Memorable, not
  punitive.
- **Profile** — photo-forward, on-chain interests visible, reputation legible
  without a leaderboard.

What the user sees vs. what the chain does:
- **User language:** *match, chat, propose a pact, show up, get your stake
  back, ghost, lose it.*
- **Chain language (hidden behind subtle "view on chain" links):** *escrow,
  resolveDate, slashed, treasury, reputation contract.*

The full product spec lives in [`docs/plan.md`](./plan.md). This doc is just
the visual + interaction brief that flows from it.

---

## 0. Tone

**Pactly is dating, not DeFi.** Every visual choice should pass this test: would
someone showing this app to a non-crypto friend feel embarrassed? If the answer
is "yes, this looks like a trading dashboard" — change it.

- Warm. Photo-forward. Soft-edged.
- Type at human size, not finance size.
- Crypto details (addresses, hashes, tx links) live in subtle pills, never
  centered headlines.
- Microcopy is light — "show up", "get your stake back", "ghost, lose it" — not
  "execute pact" or "settle escrow".

Reference apps:
- **Hinge** for warmth and photo dominance.
- **Tinder** for the swipe deck mechanic on browse.
- **Linear** for systemic restraint outside the dating surfaces (settings, admin
  views).

Not references:
- **Uniswap, Aave, etherscan** — banned palette and table density.

---

## 1. Color tokens (soft pastel system)

All values are sRGB hex, AA-contrast verified against `--color-bg`. The palette
is designed so any pastel surface can host `--color-text` without further
contrast tuning.

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FFF8F2` | Page background. Warm cream, NEVER pure white. |
| `--color-surface` | `#FFFFFF` | Cards, modals, raised inputs. |
| `--color-surface-muted` | `#F6EFE6` | Sublvl panels, disabled fields. |
| `--color-divider` | `#EFE6DA` | Hairlines, separators. |

### Text

| Token | Hex | Use |
|---|---|---|
| `--color-text` | `#2A2A30` | Body copy, headings. Soft black, never pure `#000`. |
| `--color-text-muted` | `#7C7B82` | Secondary copy, hints, timestamps. |
| `--color-text-soft` | `#A6A2A8` | Tertiary, disabled labels. |
| `--color-text-on-accent` | `#FFFFFF` | Text on `--color-coral`/`--color-mint` buttons. |

### Accents (pastel)

| Token | Hex | Use |
|---|---|---|
| `--color-coral` | `#FF8C7A` | Primary CTA. Match heart. "Stake to meet" button. |
| `--color-coral-soft` | `#FFD9D2` | Hover wash, badges, the right-swipe overlay. |
| `--color-mint` | `#94D2A1` | "We met" confirmation. Successful resolve. |
| `--color-mint-soft` | `#D8EFDB` | Reputation chip background, success toasts. |
| `--color-lavender` | `#C9B8FF` | Secondary accent, decorative. AI / wingman surfaces. |
| `--color-lavender-soft` | `#EBE3FF` | Wingman bubble background. |
| `--color-peach` | `#FFCFA6` | Highlight chips ("trending", "new"). |
| `--color-rose` | `#F4A4A4` | Slash / ghost / unsafe. NEVER pure red. |
| `--color-rose-soft` | `#FBDEDE` | Left-swipe overlay, error backgrounds. |

### Functional

| Token | Hex | Use |
|---|---|---|
| `--color-stake` | `#FF8C7A` | Always coral. Stake amount, escrow indicator. |
| `--color-onchain` | `#C9B8FF` | On-chain interest chips, rep tags. |
| `--color-shadow` | `#2A2A3014` | Long-shadow tint for cards (8% black). |

**Don't use:** Tinder red `#FE3C72`, neon pink, anything `#FFFFFF` for body
backgrounds, anything `#000000` for text. Cream + soft black is the entire
trick.

---

## 2. Typography

**One typeface for everything.** Variable font, two weights.

- **Type:** `"Inter"` (or `"Geist"` if Inter unavailable). Display heading uses
  the same family — tighter tracking only.
- **Mono:** `"Geist Mono"` ONLY for addresses, tx hashes, code. Never for prices
  or stakes.

### Type scale

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-display` | 48px / 52px | 600 | Hero on landing only. |
| `text-h1` | 32px / 40px | 600 | Page titles. |
| `text-h2` | 24px / 32px | 600 | Section headers, card-stack name. |
| `text-h3` | 18px / 26px | 500 | Sub-section, modal titles. |
| `text-body` | 16px / 24px | 400 | Default. Bios, paragraphs. |
| `text-body-sm` | 14px / 20px | 400 | Secondary copy, helper text. |
| `text-caption` | 12px / 16px | 500 | Pills, chips, labels. ALL CAPS optional, +0.05em tracking. |
| `text-mono-sm` | 13px / 18px | 500 | Wallet addresses (truncated). |

Headings use `tracking: -0.02em`. Body uses default tracking.

---

## 3. Spacing, radius, motion

### Spacing (4-px grid)

`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48 · 4xl 64`

Cards never touch each other directly — minimum 12 px gap.

### Radius

| Token | Value | Use |
|---|---|---|
| `radius-pill` | 999px | Buttons, chips, pills, avatars. Default for *anything* people tap. |
| `radius-card` | 24px | Profile cards, modals, sheets. Generous, dating-app-soft. |
| `radius-input` | 14px | Text inputs, textareas. |
| `radius-photo` | 20px | Photos in cards. |

Sharp corners (`radius: 0`) are forbidden everywhere.

### Shadow

Single shadow definition: `0 8px 24px -8px var(--color-shadow)`. Used sparingly
on raised cards in the swipe deck. **No multi-layered shadows, no glows.**

### Motion

- **Spring** for swipe / drag interactions: `damping: 30, stiffness: 320`. Card
  rotation, snap-back.
- **Fade + slide-up 8 px** for modal/sheet entry: `200 ms ease-out`.
- **Cross-fade** for image swap: `180 ms ease`.
- **No bounce, no rubber-band overshoot.** Pastel ≠ trampoline.
- Reduced motion respected: drop springs to fades; disable card tilt.

---

## 4. Component inventory

### Buttons

- **Primary CTA** — coral fill, white text, 48 px height, full-width on mobile
  hero CTAs ("Set up your profile", "Stake $25 to meet"). Exactly one per
  screen.
- **Secondary** — surface fill, soft-black border 1 px, soft-black text. 40 px
  height.
- **Tertiary / link** — text-only, underline on hover, muted color.
- **Icon button** — 40 × 40 px, pill, surface fill. Used on swipe-deck rejects /
  accepts / detail-expand.
- **Destructive** — rose fill, white text. ONLY for "report unsafe" flow,
  nowhere else.

States: hover lifts via shadow + 4% darker background (no scale transform).
Pressed: 2 px translate-y. Disabled: 50% opacity, no pointer.

### Inputs

- 48 px height, `radius-input`, surface fill, divider border, 16 px padding.
- Focus ring: 2 px coral-soft, 2 px offset.
- Label sits above, 14 px, soft-black 600.
- Hint sits below, 12 px, muted.
- Error: rose border + rose hint message.

### Pills / chips

- 28 px tall, 12 px horizontal padding, `radius-pill`.
- **Hobby chip selected:** coral fill, white text.
- **Hobby chip unselected:** surface fill, soft-black text, divider border.
- **On-chain chip:** lavender-soft fill, soft-black text. Lavender circle dot
  on the left.
- **Reputation chip:** mint-soft fill, soft-black text. Used to show
  `12 met · 1 ghosted`.
- **Stake chip:** coral-soft fill, coral text, mono font for amount. e.g.
  `25 0G`.

### Cards

Three card types:

1. **Profile card (swipe deck)** — 320 × 480 px on mobile, 360 × 540 on web.
   Photo fills 70%. Bottom 30% is name, age, top 2 on-chain chips.
2. **Match-list row** — horizontal, 72 px tall. Avatar + name + last-message
   preview + timestamp.
3. **Date card (in-chat)** — embedded in chat thread when one user proposes a
   date. Shows time, place, stake, status. Coral border.

### Avatars

- Always pill / circle.
- Sizes: 32 (list), 56 (chat header), 96 (profile detail).
- Border: 2 px surface against the page bg, so avatars over photo backgrounds
  still pop.

---

## 5. Page-by-page

### 5.1 Landing (`/`, signed out)

```
┌────────────────────────────┐
│                            │
│         Pactly             │   ← text-display, centered
│                            │
│   Dating, in earnest.      │   ← text-h3 muted
│   Match free. Stake to     │
│   meet. Show up — or get   │
│   slashed.                 │
│                            │
│  ┌──────────────────────┐  │
│  │  Connect wallet      │  │   ← <appkit-button>, pill
│  └──────────────────────┘  │
│                            │
│   Built on 0G              │   ← text-caption muted
└────────────────────────────┘
```

Single column, vertically centered, 32 px gap between sections. Subtle peach
gradient on the bg so it doesn't read as flat cream — `radial-gradient(120%
80% at 50% 0%, var(--color-coral-soft), transparent)`.

### 5.2 Landing (signed in, has profile)

Same shell, but the body becomes a **two-button hero**:

- "Browse matches" → primary coral CTA → `/browse`
- "My matches (3)" → secondary → `/matches` (badge count)

Plus a tiny avatar + name + `edit profile` link top-right.

### 5.3 Onboarding (`/onboarding`)

Single page, scrolling form. NOT a wizard. Sections in order:

1. **Display name** + **Photo** (drag-drop card, 200 × 200 px square, photo
   uploads on drop)
2. **Bio** (textarea, 200-char counter)
3. **Hobbies** (pill selector, 3+ required) — 5 columns of pills on web,
   wraps on mobile.
4. **Socials** (X / IG / GitHub) — three rows, prefix icon left, "unverified"
   tag inline.
5. **Spotted on chain** (auto, read-only chips)
6. **Portfolio** — checkbox: `□ Show my portfolio tier on my profile`. When
   on, surfaces a tier card: `🌿 casual` or whatever, with one-line copy
   *"Your wallet across mainnet + L2s."*

Sticky CTA at bottom on mobile: "Save profile" coral pill, full-width.

### 5.4 Browse (`/browse`) — swipe deck

**This is the showcase page.** Tinder-style mechanic. Whatever else looks
mediocre, this needs to be sharp.

```
┌────────────────────────────┐
│  Pactly  ·  browse  · 17 ▾ │   ← top bar, name + filter
│                            │
│   ╭──────────────────╮     │
│   │                  │     │
│   │     PHOTO        │     │   ← profile-card, 70% photo
│   │                  │     │
│   ├──────────────────┤     │
│   │ Aria · 27        │     │
│   │ Coffee, hiking   │     │
│   │ ◉ Uniswap user   │     │   ← top 2 on-chain
│   │ 🌿 casual        │     │   ← portfolio (if shown)
│   ╰──────────────────╯     │
│                            │
│   ╳        ★        ❤      │   ← icon buttons, 56px
│  pass    detail    match   │
└────────────────────────────┘
```

#### Stack visual
- Top card is the active draggable card.
- 2 cards underneath are visible, each ~6 px lower + 0.96 scale + 0.92 opacity.
- New cards animate up into the deck on swipe completion.

#### Drag mechanics
- Drag horizontally → card translates and rotates. Rotation = `(deltaX / cardWidth) * 15deg`, capped.
- At 25% horizontal threshold, edge overlay appears:
  - Right: green-coral wash + a heart icon, 60% opacity at threshold.
  - Left: rose wash + a soft ✕ icon.
- Beyond 40% threshold + release → fly out: card translates off-screen in 220 ms with rotation continuing.
- Below threshold + release → spring back to center.

#### Behaviors
- Right swipe / heart tap → `match.request(counterparty)`. Optimistic — card flies; if request errors, return card with a rose-soft toast.
- Left swipe / ✕ tap → no DB write. Address pushed to a local `seen` set in IndexedDB so we don't reshow. Skipping is silent.
- Up swipe / star tap → "save for later" (post-hack v2 feature; for hackathon make it = expand detail).
- Tap card body → expand into detail sheet (page below).
- Empty deck → "You're caught up. Check back soon." with a soft-peach illustration.

### 5.5 Profile detail (`/profile/$address` or modal sheet)

Half-sheet on mobile (slides up from bottom), full page on web.

```
┌────────────────────────────┐
│  ✕                         │
│   ┌──────────────────────┐ │
│   │  PHOTO (full-width)  │ │
│   └──────────────────────┘ │
│                            │
│   Aria · 27                │   ← text-h1
│   ◉ vitalik.eth            │   ← ENS line
│                            │
│   "Coffee, code, and bad   │
│    jokes."                 │
│                            │
│   HOBBIES                  │   ← text-caption
│   ⬤ coffee  ⬤ hiking      │   ← pills
│   ⬤ DeFi   ⬤ writing      │
│                            │
│   ON CHAIN                 │
│   ◉ Uniswap user           │
│   ◉ USDC holder            │
│   ◉ Power user             │
│                            │
│   PORTFOLIO  🌿 casual     │
│                            │
│   REPUTATION               │
│   ✓ 4 met  · 0 ghosted    │
│                            │
│   SOCIALS (unverified)     │
│   𝕩 @aria · 📷 @aria_     │
│                            │
│  ┌──────────────────────┐  │
│  │   Match              │  │   ← coral CTA
│  └──────────────────────┘  │
└────────────────────────────┘
```

If already matched: button text becomes "Open chat" → `/chat/$matchId`.

### 5.6 Matches list (`/matches`)

Two tabs: **Pending** | **Conversations**

- Pending = match.list({ status: "pending" }), shown as cards with "Accept /
  Decline" buttons.
- Conversations = matches with status `accepted`, shown as match-list rows
  with a last-message preview.

Empty state: "No matches yet. Try **browse**." link.

### 5.7 Chat (`/chat/$matchId`)

```
┌────────────────────────────┐
│ ←  Aria · 27   ·  🔒 E2E   │   ← top bar
├────────────────────────────┤
│                            │
│              ╭───────╮     │   ← my message (coral-soft, right-aligned)
│              │ hi! ☕│     │
│              ╰───────╯     │
│  ╭─────────╮               │   ← peer message (lavender-soft, left)
│  │ heyyy   │               │
│  ╰─────────╯               │
│                            │
│  ╭──────────────────────╮  │   ← Date card (proposed), coral border
│  │ ☕ Sat 7pm · Anomali │  │
│  │ Stake: 25 0G each    │  │
│  │ [ Accept stake ]     │  │
│  ╰──────────────────────╯  │
│                            │
│              ╭───────╮     │
│              │ ok!   │     │
│              ╰───────╯     │
│                            │
├────────────────────────────┤
│  💡 Need a clue?           │   ← wingman button, lavender-soft
│  ┌────────────────────┐ ➤  │   ← input, then send
└────────────────────────────┘
```

- Bubbles: 16 px radius corners, except the inside-corner facing the avatar
  which is 6 px (gives the conversation natural visual rhythm).
- Wingman button is lavender — visually distinct so users know it's AI, not
  a human action.
- Lock icon top-right, tap-to-explain ("Pactly never reads your chat").
- "Propose a date" lives in a + menu next to the input.

### 5.8 Propose-date modal

Half-sheet, comes up when user taps "+ propose date" in chat.

```
Pact details

When         [date · time picker]
Where        [text input]

Stake amount [25] 0G            ← number input + currency badge

Both of you put 25 0G into escrow on 0G.
Show up — get it back. Ghost — lose it.

[Cancel]              [Propose pact]
```

The "both of you put X into escrow" copy is ALWAYS visible. This is the
mechanic — never hide it behind a tooltip.

### 5.9 Post-date prompt

Appears as a **toast at top of screen** on app open if any of your dates
have passed and aren't resolved.

```
╭──────────────────────────────────╮
│  Did you meet Aria last night?  │
│                                  │
│   ✓  Yes, we met                 │   ← mint pill
│   ✗  No, ghosted                 │   ← rose pill
│   ⚐  Felt unsafe                 │   ← tertiary link
╰──────────────────────────────────╯
```

After tap, the modal celebrates / commiserates with one micro-illustration
+ one line of copy. **No graphs, no charts, no balance updates centred.**

### 5.10 Resolve outcome

Full-screen takeover for ~3 seconds, then auto-fades to chat.

- **Both met:** mint-soft bg, large ✓, "You both met. Stakes returned. +1
  reputation each."
- **Conflict:** peach bg, hand-drawn shrug, "Mismatch — both stakes burned."
- **Both ghost:** rose-soft bg, soft cloud icon, "Both ghosted. Stakes
  burned."
- **Auto:** cream bg, dotted-line clock, "Window closed without a verdict.
  Stakes returned."

---

## 6. Responsive

- **Mobile-first.** Design at 375 × 812. The web version is just "centered in
  a 480-px column with breathing room either side."
- Tablet & desktop use the same column on most screens; only `/browse` gets a
  wider deck (max 480 px).
- All tap targets ≥ 44 × 44 px.

---

## 7. Empty / loading / error states

Every page must define these. Treat them as features, not afterthoughts.

| State | Shape |
|---|---|
| Empty | Soft-peach illustration (line art, single colour) + 1-line copy + 1 CTA. |
| Loading | Skeleton shimmer in `--color-surface-muted`. NEVER spinners — too DeFi. |
| Error | Rose-soft toast, top-center, auto-dismiss after 4 s. Persistent errors get an inline "retry" link. |

---

## 8. Accessibility

- Contrast: every body text passes AA. Verified for `--color-text` on all
  surface tokens.
- Focus: visible 2-px coral-soft ring, 2-px offset, on every interactive
  element. Don't kill the default outline.
- Keyboard: swipe deck has keyboard equivalents — `←` pass, `→` match, `↓`
  detail.
- Screen readers: card-stack is announced as a list; each card's name +
  hobbies + on-chain chips are read in order. Chip emoji icons are
  `aria-hidden`; their meaning lives in surrounding text.
- Motion: respect `prefers-reduced-motion` — disable spring tilt on cards,
  use cross-fade for transitions.

---

## 9. Specific don'ts

- ❌ Tables. Anywhere. (Reputation is chips, not a leaderboard.)
- ❌ Charts. (Portfolio is a tier word, not a graph.)
- ❌ Etherscan links front-and-centre. They live behind a small "view on
  chain" link beneath each tx confirmation.
- ❌ "Connect Wallet" as the only CTA on the landing — the AppKit button
  handles connection; the headline CTA should sell the product.
- ❌ Pure white. Pure black. Neon. Glassmorphism. Glows. Gradients on text.
- ❌ Crypto jargon in user-visible copy: no "EOA", "smart-account", "L1",
  "gas", "calldata". "Wallet", "transaction", "fee" are fine.

---

## 10. Asset list (what Claude Design needs to produce)

1. **Logo** — wordmark only. Lowercase, single-weight, optional heart-pact
   icon ligature. SVG, monochrome (uses `currentColor`).
2. **Onboarding-empty illustration** — soft line art, 1 accent colour, ~120 ×
   120 px.
3. **Browse-empty illustration** — same style, "you're caught up" theme.
4. **Resolve-outcome illustrations** — 4 variants (met / conflict / ghost /
   auto), all in the same hand-drawn style, each ~200 × 200 px.
5. **Wingman icon** — small lavender lightbulb or sparkle, used inline in the
   chat input.
6. **Stake icon** — pact-themed, used in the date card; could be linked-rings
   or a coin-with-handshake. Whatever's chosen, reuse it as the empty-state
   accent on `/matches`.
7. **Match-celebration micro-animation** — Lottie or CSS, plays when a swipe-
   right results in a mutual match. <1 second, soft confetti, no audio.

---

## 11. Open questions for the designer

1. Do we want a custom display typeface for the wordmark, or stick to Inter
   tracked tight? (Custom adds ~80 KB; identity gain may be worth it.)
2. Dark mode: ship at v1, or hackathon-light-only? Recommendation: light-only
   for the demo; design tokens can be dark-mapped later.
3. Subscription / paid tier visuals: out of scope for hackathon, but the
   palette should leave room for a "premium" lavender-gold accent later.

---

## 12. Implementation handoff

Once design is signed off:

- Tokens land in `packages/frontend/src/styles.css` as CSS custom properties.
- Tailwind 4 reads them via `@theme` block. Component classes use the
  tokens — never hex literals — so dark mode and re-skinning are one-edit.
- `radix-ui` primitives (or shadcn/ui) used for Dialog, Popover, Toast.
  Style every primitive against the token system.
- Framer Motion (or `motion`) for the swipe deck only. No motion library
  elsewhere — CSS transitions cover everything else.
- All page components live under `src/routes/`. All shared bits under
  `src/components/ui/`. Hard rule: no business logic inside `components/ui/`.

