# Pactly — Build Plan

> Dating, in earnest. Match and chat free. Stake to meet. Show up or get slashed.
> Built on 0G.

## Hackathon

- **Event:** 0G APAC Hackathon
- **Track:** Track 3 — Agentic Economy & Autonomous Applications
- **Submission deadline:** May 16, 2026, 23:59 UTC+8
- **Build window:** Apr 26 – May 16 (3 weeks)
- **Submission platform:** HackQuest

## One-line pitch

Pactly is a dating app where every confirmed date is backed by an on-chain stake. Show up, get your stake back. Ghost, lose it. AI matchmaking and a private wingman — built on 0G.

## The thesis

Modern dating apps fail because nobody has skin in the game. People match, chat, agree to meet, then ghost. Pactly fixes the *one* worst behavior — ghosting on confirmed dates — by making both parties stake crypto when they commit to meeting. The mechanism is simple, intuitive, and verifiable on-chain.

The wedge: **crypto-native APAC singles** — users who already have wallets, understand staking, and feel the ghosting problem acutely.

---

## Product mechanics

### Free tier (everyone gets this)

- Wallet-based signup
- Profile with hobbies + auto-pulled on-chain interests (protocols used, tokens held)
- AI-scored matchmaking via 0G Compute
- E2E-encrypted chat between matches
- Reputation profile (visible to others)

### Stake-to-meet (the core mechanic)

1. Two users match, chat freely
2. One proposes a date: time, place, stake amount (e.g. $25 in test token)
3. Other accepts, both stakes locked in escrow on 0G Chain
4. After date timestamp passes, both users get a "Did you meet?" prompt
5. Resolution rules:
   - **Both confirm met** → both stakes returned
   - **Both report ghost** → both stakes burned to treasury
   - **Conflict (one met, one ghost)** → both stakes burned to treasury
   - **No response within 48h** → both stakes auto-returned (graceful default)
6. Reputation updates either way

The design principle: **honesty is the only winning strategy.** Lying never benefits the liar — at best, both lose. This sidesteps the need for arbitration.

### Wingman (AI helper in chat)

When conversation stalls, user taps "Need a clue?" → 0G Compute returns 3 contextual reply suggestions. Sealed inference if available; otherwise framed as v2 roadmap. Full disclosure in UI.

### Safety override

Any user can flag "felt unsafe" without slashing themselves. This creates a reputation record on the counterparty. Recurring flags = filtered out by future matches.

---

## Architecture

```
[Next.js frontend on Vercel — $0/month, free tier]
        │
        ├─► [0G Chain]       Escrow + reputation contracts
        ├─► [0G Storage]     Profiles, encrypted chats, photos
        ├─► [0G Compute]     Matchmaking + wingman inference
        └─► [0G Agent ID]    Verified-human reputation tracking
```

**No backend server.** Frontend talks directly to 0G primitives. Zero ongoing infra cost when idle. Scales with usage when active.

### Real-time chat strategy

Polling on 0G Storage every ~3 seconds. Suboptimal for production, fine for hackathon. v2 = libp2p / Waku messaging layer.

### Notification / trigger strategy

Lazy resolution. The `resolveDate` function is publicly callable — frontend prompts users on app open, no keeper bot needed.

### Privacy strategy

E2E encryption between matched users. ECDH shared key derived from wallet pubkeys. AES-256-GCM for messages. Ciphertext written to 0G Storage. Pactly (operator), 0G Storage nodes, network observers — none can read plaintext.

Wingman calls: client-side decryption of recent N messages → sent to 0G Compute for the inference → discarded after. UI discloses this honestly. If 0G Compute supports sealed inference / TEE on mainnet, use it; otherwise pitch as v2.

**Trade-off acknowledged:** lost wallet = lost chat history. Documented in README. Acceptable for ephemeral dating chats.

---

## Smart contracts

### `PactlyEscrow.sol`

```solidity
struct Date {
    address proposer;
    address counterparty;
    uint256 stakeAmount;
    uint256 dateTimestamp;
    bytes32 detailsHash;
    DateStatus status;
    Confirmation proposerConfirm;
    Confirmation counterpartyConfirm;
    uint256 resolveDeadline;
}

enum DateStatus { Proposed, Accepted, Resolved, Cancelled }
enum Confirmation { None, Met, Ghost }
```

**Functions:**

- `proposeDate(address counterparty, uint256 dateTimestamp, bytes32 detailsHash) payable` — locks stake, creates Date
- `acceptDate(uint256 dateId) payable` — counterparty matches stake
- `cancelDateBeforeAccept(uint256 dateId)` — proposer can cancel before counterparty accepts; refunds stake
- `confirmMet(uint256 dateId)` — callable by either party in window
- `reportGhost(uint256 dateId)` — callable by either party in window
- `flagUnsafe(uint256 dateId)` — safety override, auto-returns flagger's stake, marks counterparty
- `resolveDate(uint256 dateId)` — public, callable after `resolveDeadline`

**Resolution logic:**
| Proposer | Counterparty | Outcome |
|----------|-------------|---------|
| Met | Met | Both stakes returned |
| Ghost | Ghost | Both stakes burned |
| Met | Ghost | Both stakes burned |
| Ghost | Met | Both stakes burned |
| None | None | Both stakes returned (auto) |
| Met | None | Burned (treat silence as ghost) |
| None | Met | Burned (treat silence as ghost) |

**Treasury:** burned stakes accumulate in a `PactlyTreasury` contract. Hackathon-scope: just hold them. v2: bonus pool for honest users / ops fund.

### `PactlyReputation.sol`

Per-wallet stats:
- `datesProposed`
- `datesAccepted`
- `datesMet`
- `datesGhosted`
- `safetyFlagsReceived`

Updated by `PactlyEscrow` on every resolution. Public reads. Profile UI surfaces these as reputation.

If 0G Agent ID is mainnet-ready, integrate it instead of (or alongside) this contract.

---

## 0G primitive integration

| Primitive    | Use case                                                 |
|--------------|----------------------------------------------------------|
| 0G Chain     | Escrow contract, reputation contract, treasury           |
| 0G Storage   | User profiles, photos, encrypted chat history            |
| 0G Compute   | Matchmaking inference (compatibility scoring), wingman   |
| 0G Agent ID  | Verified-human reputation, anti-sybil                    |

All four meaningfully integrated. Each one earns its place — no decorative usage.

---

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript
- **Wallet/auth:** wagmi + RainbowKit
- **Styling:** Tailwind + shadcn/ui (warm palette, photo-forward, *not* DeFi-dashboard energy)
- **Contracts:** Solidity 0.8.x, Foundry for tests + deployment
- **Encryption:** noble-ciphers / eth-crypto for ECDH + AES-256-GCM
- **0G SDKs:** as published — verify TS support before Day 1
- **Hosting:** Vercel free tier
- **Repo:** Public GitHub from day 1

---

## Daily milestones

### Week 1 (Apr 26 – May 2): Core mechanism

- **Day 1 (Sun Apr 26):** Repo setup. Foundry init. Frontend skeleton with Next.js + wagmi + wallet connect. Verify 0G testnet RPC + faucet access. Verify 0G Compute is callable from a frontend (or at least from a Node script). Verify 0G Storage SDK works.
- **Day 2:** `PactlyEscrow.sol` — propose, accept, cancel functions + tests. Deploy to 0G testnet.
- **Day 3:** `PactlyEscrow.sol` — confirmMet, reportGhost, flagUnsafe, resolveDate + full test coverage of all 7 outcome paths. `PactlyReputation.sol` skeleton.
- **Day 4:** Profile creation flow. User connects wallet, fills profile, on-chain history pulled in for "interests." Profile written to 0G Storage. Generate/load chat keypair.
- **Day 5:** Match list UI. Browse other profiles. Match request flow. Free chat UI (basic). E2E encryption layer working — messages written as ciphertext to 0G Storage.
- **Day 6:** Stake-to-meet flow inside chat. "Propose a date" modal → details + stake amount → both sign → escrow locked. Show escrow status.
- **Day 7:** Buffer + integration test. Full flow on testnet: profile → match → chat → propose → accept → escrow visible.

**End of Week 1:** Two test wallets complete the full stake-to-meet escrow flow on testnet.

### Week 2 (May 3 – May 9): AI features + post-date flow

- **Day 8:** Matchmaking agent. Embed profiles (hobbies + on-chain interests) → similarity + LLM reranker via 0G Compute. Show compatibility scores on profile cards.
- **Day 9:** Wingman agent. "Need a clue?" button → client-side decrypt last N messages → 0G Compute → 3 reply suggestions. UI disclosure line.
- **Day 10:** Post-date confirmation UI. Did-you-meet prompt on app open after date timestamp. confirmMet / reportGhost calls. Resolution outcome modal.
- **Day 11:** Reputation display on profiles. Met/proposed/ghosted/safety stats visible. Ties to matchmaking (low-reputation users deprioritized).
- **Day 12:** Edge cases + error handling. Mid-flow disconnects, gas failures, missing counterparty responses.
- **Day 13:** Visual design pass. Soft palette, photo-forward, warm typography. Make it *feel* like a dating app, not a DeFi app. Apply frontend-design skill if available.
- **Day 14:** Buffer + mainnet preparation. Migrate contracts to 0G mainnet. Verify on explorer.

**End of Week 2:** Full app deployed to 0G mainnet, all features functional.

### Week 3 (May 10 – May 16): Submission materials

- **Day 15:** Mainnet smoke test. Run 2–3 complete date cycles on mainnet with different outcomes (met/met, conflict, no-response) so the explorer link shows real activity.
- **Day 16:** Demo video script + storyboard. Set up two demo users with profiles, conversation history, scheduled date.
- **Day 17:** Record demo video (3 min max). Loom or similar. Re-record until tight.
- **Day 18:** README. Project overview, architecture diagram, 0G modules used + how, local deployment steps, test account info.
- **Day 19:** X post. Project name, demo clip/screenshot, hashtags `#0GHackathon #BuildOn0G`, tags `@0G_labs @0g_CN @0g_Eco @HackQuest_`.
- **Day 20:** HackQuest submission form. Fill all fields. Triple-check.
- **Day 21 (May 16, deadline):** Buffer for last-minute fixes. **Submit by 18:00 local — do not push to 23:59.**

---

## Demo video script (3 min)

**0:00–0:20 — Hook**
> "Dating apps are broken. People match, chat, agree to meet — and then ghost. Pactly fixes this. Every date starts with a pact, on-chain."

**0:20–0:50 — Profile + matchmaking (User A)**
- Wallet connect
- Profile shows: bio + hobbies + on-chain interests (auto-pulled: "Uniswap LP, Pendle farmer, ETHJKT member")
- Browse matches with compatibility scores from 0G Compute
- Match with User B

**0:50–1:20 — E2E encrypted chat + wingman**
- Chat opens, lock icon visible: "End-to-end encrypted"
- Conversation stalls
- Tap "Need a clue?" → wingman returns 3 suggestions via 0G Compute
- Pick one, send. Chat continues.
- Voiceover: *"Pactly never reads your chat. Messages are encrypted between you and your match."*

**1:20–2:00 — Stake to meet**
- "Coffee Saturday 7pm at Anomali" → both agree
- Both stake $25 (test token) → escrow locks on 0G Chain
- Show 0G Explorer link with locked escrow
- Voiceover: *"Now it's real. Show up, get your stake back. Ghost, lose it."*

**2:00–2:30 — Successful resolution**
- Time-skip indicator
- Both tap "We met!" → contract releases stakes
- Reputation updates: +1 successful date each
- Profile shows updated stats

**2:30–2:50 — Ghost path (alternate)**
- Quick cut: another date pair
- One reports ghost, other says met → mismatch → both stakes burned to treasury
- Voiceover: *"Lying doesn't pay. Honesty is the only winning strategy."*

**2:50–3:00 — Close**
- Logo
- *"Pactly. Dating, in earnest. Built on 0G."*
- Hashtags + URL

---

## Submission requirements checklist

Per HackQuest requirements:

- [ ] Project name: **Pactly**
- [ ] One-sentence description (≤30 words)
- [ ] Short summary: what it does, problem solved, 0G components used
- [ ] Public GitHub repo with substantial commits during build window
- [ ] 0G mainnet contract address(es)
- [ ] 0G Explorer link with verifiable on-chain activity
- [ ] Demo video (≤3 min) on YouTube or Loom
- [ ] README in English with: overview, architecture diagram, 0G modules, local deployment, reviewer notes
- [ ] Public X post with project name, demo clip, hashtags `#0GHackathon #BuildOn0G`, tags `@0G_labs @0g_CN @0g_Eco @HackQuest_`
- [ ] HackQuest form fully filled out

---

## Day 0 verification (do this BEFORE Day 1)

Before writing a line of contract code, confirm:

1. **0G testnet RPC + faucet.** Can you deploy a hello-world contract?
2. **0G mainnet readiness.** Is mainnet live and submission-ready?
3. **0G Storage SDK.** Can you write/read a JSON blob from a Next.js client?
4. **0G Compute.** Can you make an inference call from a Node script? From a browser?
5. **0G Agent ID.** Is it a mainnet-usable primitive, or do we use a custom reputation contract and label it Agent-ID-compatible?
6. **Sealed inference.** Available on mainnet, or pitch as v2?

If anything is testnet-only or not ready, route around it. The architecture above assumes all 6 work; adjustments may be needed.

---

## Risks + mitigations

| Risk | Mitigation |
|------|-----------|
| 0G Compute not frontend-callable | Tiny Cloudflare Worker forwards signed calls (still ~$0/month) |
| 0G Agent ID not mainnet-ready | Custom reputation contract, pitch as Agent-ID-compatible |
| Sealed inference not available | Pitch as v2 roadmap, current version still has E2E + per-call disclosure |
| Demo collusion question | "Both stakes burned in conflict + Agent ID requires on-chain history → Sybil-resistant by design" |
| Polish/UX bar for consumer app | Day 13 dedicated visual pass; use frontend-design skill |
| Real-time chat feels laggy | Polling at 3s is fine for hackathon demo; pre-recorded video hides any rough edges |
| Last-minute submission stress | Submit Day 21 by 18:00 local, not 23:59 |

---

## What's explicitly out of scope for the hackathon

- Real-time messaging via libp2p / Waku (post-hack v2)
- Mobile native apps (web only)
- Photo verification / KYC (acknowledged in README, post-hack)
- Passive matchmaking / push notifications (lazy on-app-open only)
- Multi-language UI (English only for demo; Indonesian post-hack)
- Treasury reward distribution (treasury just holds; post-hack mechanic)
- Group chats / multi-party dates
- Public dispute arbitration (mechanism design avoids needing it)

Document these honestly in the README. Judges respect founders who know what they shipped vs. what's roadmap.

---

## Post-hackathon decision point

Pactly is hackathon-first, but architected to stay alive at $0 ongoing cost so it can be released to the X audience after submission. After May 16, evaluate:

- Did the demo land with judges?
- Did the X post get traction?
- Did anyone try the live mainnet version?

If signals are positive → continue building. If not → it's a strong portfolio piece either way. No infra burn either way.

---

## Pitch sentence (final)

> *Pactly is dating where you have skin in the game. Match and chat free. Stake to meet. Show up, get your stake back. Ghost, lose it. Built on 0G.*