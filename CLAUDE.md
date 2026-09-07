# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Three FAO Ukraine Country Office (FAOUA) procurement tools, built as one Vite +
React 19 multi-page app and deployed to Vercel at
<https://procurementtimeline.vercel.app>.

| Route | Entry | Source | Purpose |
|---|---|---|---|
| `/` | `index.html` | `src/App.jsx` | Procurement Timeline Estimator — the main tool |
| `/loa` | `loa.html` | `src/loa/` | LOA QA Planner (Letters of Agreement) — plan editor plus a read-only Monitor view (`LoaMonitor.jsx`, per-step on track / at risk / overdue status), reached from `#monitor=<planId>` or the "Open Monitor" button; `#plan=<planId>` opens the editor |
| `/planner` | `planner.html` | `src/planner/` | Agricultural Input Planner |
| `/guide` | `guide.html` | hand-written HTML | User guide covering all three |

`api/` holds three Vercel Functions (`plans`, `loa-plans`, `campaigns`) backed by
Vercel Blob, used for shared/monitored plans. Routes are mapped in `vercel.json`.

## Commands

```
npm run dev      # Vite dev server on :5173
npm run build    # production build (all four HTML entries)
npm test         # vitest run
npm run lint     # eslint
```

`npm run lint` reports ~43 **pre-existing** errors across 18 files — `no-undef`
on the Node globals in `api/*.js`, `react-hooks/set-state-in-effect` and
`react-hooks/refs` in the LOA and Planner components, `react-hooks/purity`
(`Date.now()` in render) in `PlannerTimeline.jsx`, plus a few unused vars.
`npm test` is the real gate (46 tests, all passing). Compare lint against `HEAD`
before assuming you introduced an error.

## The rules engine — read this before touching `src/data.js`

The Estimator encodes **FAO Manual Section 502, effective 13 August 2026**
(`docs/latest manual/`). Getting these rules right matters more than anything
else in the repo; they drive what users tell auditors.

### Thresholds are not constants

MS 502 Appendix G gives **three threshold tables**, selected by office tier.
`OFFICE_TIERS` in `src/data.js` holds all three. FAO Ukraine is a Decentralized
Office **with an IPO** (currently graded **P3**), so `DEFAULT_TIER = "with_ipo"`.

Bands in the manual are **inclusive** (`Up to 1 000`, `1 001 – 5 000`,
`Above 25 000`). `vlvpMax`/`microMax`/`rfqMax` are the last value *inside* each
band — do not reintroduce `< 1000` style exclusive comparisons.

The **LPC Review Threshold is derived, never hard-coded**: Appendix F2 §2
defines it as the ITB/RFP value for that office (`lpcThreshold()`).

### Committee review is scoped by Award Basis, not just value

The single easiest rule to get wrong. Appendices E2 §5.2 and D2 §5.2 restrict
RPC and HQPC **award** review to **Exceptional, Distributed and Direct
Procurement** awards. An ordinary **Competitive Award is never escalated to
RPC/HQPC on value alone.**

What actually pulls a competitive ITB/RFP into RPC/HQPC is the award becoming
*Exceptional* — most often fewer than three responsive offers
(MS 502.10.1.1.2(c)). That is modelled as the `exceptional_award` circumstance,
with `rpc_exceptional` / `hqpc_exceptional` as its value-gated companions.

Separately, RPC/HQPC review **RFP evaluation criteria** ex ante above their
thresholds (E2 §5.1 / D2 §5.1), and HQPC reviews **anything above USD 5m** ex
ante regardless of Award Basis (D2 §5.9) — never waivable.

### Appendix C1 authority limits

`AUTHORITY_LIMITS` holds the FAO Representative's limits by level of IPO
support. Note the **exceptional/direct limit is lower than the competitive
limit** (P3: 500k competitive, 300k exceptional/direct). This drives the two
re-delegation circumstances. `effectiveGrade()` keeps tier and grade
consistent — an office `without_ipo` is always coerced to grade `none`.

### Emergency Situations and Exigencies

Committee review is **never waived**, only reshaped: email circulation to ≥5
members, or ex post facto within **60 calendar days** of contract issuance
(MS 502.9.9). Two hard exclusions that must not regress: **RFP evaluation
criteria** and **anything above USD 5m** can never go ex post.

### What is *not* in MS 502

- **LoAs** are MS 507 and expressly excluded from MS 502 (Appendix B §5). The
  LOA tool's thresholds are unrelated — do not "align" them with Appendix G.
- **Works** detail (Resident Engineer, Technical Dossier, CSLI clearance,
  performance bonds) comes from the FAO Construction Guidelines, not MS 502.
  Works **method selection** is still Appendix G, though: it follows the same
  inclusive bands as goods, and only above the ITB/RFP value does it become
  `itb_works` (a lump sum ITB). A low-value works item is an ordinary VLVP,
  Micro Purchase or RFQ — the Construction Guidelines requirements apply to the
  work either way, which is what the caveat appended to the sub-threshold
  recommendation in `App.jsx` says.
- MS 502.6.5.5 sets **no minimum bidding period**. The 15/21 calendar-day
  defaults in the step data are FAOUA practice; the step notes say so, and
  should keep saying so.

## Architecture notes

- `src/data.js` — process definitions, circumstances, thresholds. Exports both
  static (`PROCESSES`, `MODIFIERS`, `QUICK_REF`, resolved at `DEFAULT_TIER`) and
  tier-aware factories (`getProcesses`, `getModifiers`, `getQuickRef`). Use the
  factories anywhere the active profile's tier is available; the static exports
  exist for tier-independent lookups (colour, label).
- `src/utils.js` — date maths (working days vs `calendarDays` steps) and
  `buildSteps()`, which applies circumstances in four ordered passes: insert →
  remove (`removeMatching`) → retime (`overrideMatching`) → append
  (`insertAtEnd`). Removals and retimes run *after* insertions so they can act
  on steps another circumstance added.
- Circumstance anchors (`insertAfter` / `insertBefore`) accept an array; the
  first name that matches wins, so one circumstance can serve several processes.
  **If you rename a step, update every anchor that targets it** — there is a
  test that asserts every anchor resolves on every tier.
- **One source of truth for band routing.** `methodForValue(value, tier, type)`
  decides the method for *both* the Estimator and the Agricultural Input
  Planner (via `src/planner/recommend.js`). The Planner used to carry its own
  hard-coded `< 1000 / < 5000 / < 25000` ladder and disagreed with the Estimator
  on 9 of 13 band boundaries. Never reintroduce a second ladder; a test asserts
  the two tools return the same method for every value, tier and type.
- Profiles (name, country/holidays, office tier, IPO grade, edited step lists)
  live in `localStorage` and are edited in `SettingsPage.jsx`. The step editor
  is not just lead-time overrides: steps can be renamed, retimed, added, deleted
  and drag-reordered, and a process is stored in the profile only when its list
  differs from the built-in default (`ProcessStepsEditor` diffs against
  `PROCESSES` on save). The edited list is passed to `buildSteps()` as
  `baseSteps`, so circumstance anchors resolve against *your* step names — see
  the anchor rule above. Shared plan links encode the tier so a recipient reads
  the plan under the same thresholds.

## Conventions

- Plain JavaScript + JSX, no TypeScript. Inline styles; no CSS framework.
- Cite the manual paragraph in step `notes` and circumstance labels
  (e.g. "Appendix F2 §4.2"). Users rely on these to justify decisions.
- When changing a rule, add a test in `src/utils.procurement.test.js` that
  states the rule in the test name.
- Do not commit or deploy unless asked.
