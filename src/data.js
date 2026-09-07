export const FAO_DARK = "#1a2e44";
export const FAO_BLUE = "#009FDA";

// ─────────────────────────────────────────────────────────────────────────────
// MS 502 — Procurement of Goods, Works and Services (effective 13 August 2026)
//
// Appendix G — Solicitation and Submission Method Selection.
// Thresholds depend on the office tier. Bands in the manual are INCLUSIVE:
//   Table 3 (no IPO): VLVP "Up to 1 000" · Micro "1 001 – 5 000" · RFQ "5 001 – 25 000" · ITB/RFP "Above 25 000"
// so `vlvpMax`/`microMax`/`rfqMax` below are the last value still inside each band.
// ─────────────────────────────────────────────────────────────────────────────
export const OFFICE_TIERS = {
  hq: {
    label: "Headquarters, Rome",
    table: "Appendix G, Table 1",
    vlvpMax: 2000, microMax: 10000, rfqMax: 80000,
  },
  with_ipo: {
    label: "Decentralized Office with an IPO",
    table: "Appendix G, Table 2",
    vlvpMax: 2000, microMax: 10000, rfqMax: 50000,
  },
  without_ipo: {
    label: "Decentralized Office without an IPO",
    table: "Appendix G, Table 3",
    vlvpMax: 1000, microMax: 5000, rfqMax: 25000,
  },
};

// FAO Ukraine Country Office is a Decentralized Office with a CSLP-appointed IPO at P3.
export const DEFAULT_TIER = "with_ipo";
export const DEFAULT_IPO_GRADE = "P3";

// Appendix C1 — Procurement Authority Limits for an FAO Representative /
// Liaison Office Representative, by level of IPO support.
export const AUTHORITY_LIMITS = {
  P4:   { label: "with support of IPO P4", solicitation: 1000000, competitive: 1000000, exceptional: 500000 },
  P3:   { label: "with support of IPO P3", solicitation:  500000, competitive:  500000, exceptional: 300000 },
  none: { label: "without IPO",            solicitation:  300000, competitive:  300000, exceptional: 200000 },
};

// Committee Review Thresholds.
// LPC  — Appendix F2 §2: the Review Threshold *is* the ITB/RFP value for the office
//        (i.e. anything above the RFQ band ceiling).
// RPC  — Appendix E2 §2: USD 200 000 up to USD 499 999.
// HQPC — Appendix D2 §2: USD 500 000 for Decentralized Offices (200 000 at HQ).
// Both RPC and HQPC award review reach ONLY Exceptional, Distributed and Direct
// Procurement awards (E2 §5.2 / D2 §5.2) — never an ordinary Competitive Award.
export const RPC_MIN = 200000;
export const RPC_MAX = 499999;
export const HQPC_MIN_DO = 500000;
export const HQPC_MIN_HQ = 200000;
// Appendix D2 §5.9 — Exceptionally High-Value Procurement, ex ante HQPC review
// regardless of Award Basis, and expressly not waivable in an Emergency or Exigency.
export const HQPC_EXCEPTIONAL_VALUE = 5000000;

export function tierOf(tierKey) {
  return OFFICE_TIERS[tierKey] ?? OFFICE_TIERS[DEFAULT_TIER];
}
/** An office without an IPO cannot have an IPO grade — keep the two in step. */
export function effectiveGrade(tierKey, ipoGrade) {
  if (tierKey === "without_ipo") return "none";
  return ipoGrade === "none" ? DEFAULT_IPO_GRADE : (ipoGrade ?? DEFAULT_IPO_GRADE);
}
export function authorityOf(ipoGrade, tierKey) {
  const grade = tierKey === undefined ? ipoGrade : effectiveGrade(tierKey, ipoGrade);
  return AUTHORITY_LIMITS[grade] ?? AUTHORITY_LIMITS[DEFAULT_IPO_GRADE];
}
export function lpcThreshold(tierKey) {
  return tierOf(tierKey).rfqMax;
}
export function hqpcThreshold(tierKey) {
  return tierKey === "hq" ? HQPC_MIN_HQ : HQPC_MIN_DO;
}
const fmtUsd = n => `USD ${n.toLocaleString("en-US")}`;

/**
 * Which process a value falls into under Appendix G for the given tier.
 * `type` is "goods" | "services" | "works". Works follows the same bands as
 * goods below the formal-solicitation threshold — Appendix G labels the works
 * band "Above <rfqMax> (works)", so a low-value works item is a VLVP, Micro
 * Purchase or RFQ like anything else; only above the threshold does it become
 * an ITB with a lump sum contract. Single source of truth: the Estimator and
 * the Agricultural Input Planner both route through here.
 */
export function methodForValue(value, tierKey, type = "goods") {
  const t = tierOf(tierKey);
  if (value <= t.vlvpMax) return "very_low";
  if (value <= t.microMax) return "micro";
  if (value <= t.rfqMax) return "rfq";
  if (type === "services") return "rfp";
  if (type === "works") return "itb_works";
  return "itb";
}

/** Appendix G band label for a process, for the given tier. */
export function thresholdLabel(procKey, tierKey) {
  const t = tierOf(tierKey);
  switch (procKey) {
    case "very_low": return `Up to ${fmtUsd(t.vlvpMax)}`;
    case "micro":    return `${fmtUsd(t.vlvpMax + 1)} – ${fmtUsd(t.microMax)}`;
    case "rfq":      return `${fmtUsd(t.microMax + 1)} – ${fmtUsd(t.rfqMax)}`;
    case "itb":      return `Above ${fmtUsd(t.rfqMax)} (goods)`;
    case "itb_works":return `Above ${fmtUsd(t.rfqMax)} (works)`;
    case "rfp":      return `Above ${fmtUsd(t.rfqMax)} (services)`;
    default:         return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Process definitions. `threshold` is filled in per office tier by getProcesses().
// ─────────────────────────────────────────────────────────────────────────────
export const PROCESSES = {
  very_low: {
    label: "Very Low Value (VLVP)",
    description: "Simplified purchase by direct selection of a Vendor (MS 502.6.3.4.1 / 502.6.7.1.3). No competitive quotations or canvassing required where the goods are readily available or the price is generally known and deemed reasonable. Does not require the involvement of procurement staff unless the Procurement Authority decides otherwise. The expenditure must be documented with a description of the goods/works/services and written evidence of the price paid.",
    color: "#5ba4d4",
    steps: [
      { name: "Review & Approval of PR by Budget Holder", owner: "Budget Holder", minDays: 1, maxDays: 1, notes: "Budget availability confirmed." },
      { name: "Identification of vendor & price reasonableness check", owner: "Budget Holder", minDays: 1, maxDays: 1, notes: "Single source acceptable at this value. Price reasonableness may rest on previous solicitations, known market prices, or the cost of running a new solicitation." },
      { name: "LVO / PO preparation and issuance (if required)", owner: "Buyer / Authorized Official", minDays: 0, maxDays: 1, notes: "PO is not mandatory. A Low Value Order (LVO) or simple written record suffices for non-recurrent purchases. PO only required if purchase is recurrent or vendor requires it." },
    ]
  },
  micro: {
    label: "Micro Purchasing",
    description: "Simplified and informal method for low-value, readily available goods, standardized services and small works (MS 502.6.3.4.2). Undertaken by canvassing at least 3 Vendors, or with a justification for Direct Procurement. To be used on an exceptional basis — where there is forecast recurring demand (catering, fuel, stationery, vehicle maintenance…), a formal method or an LTA must be used instead for the total quantity required.",
    color: "#3a8bbf",
    steps: [
      { name: "Review & Approval of PR by Procurement Officer", owner: "Procurement Officer / Budget Holder", minDays: 1, maxDays: 1, notes: "Adequacy of specs and fund availability checked. Confirm the requirement is not recurrent — if it is, a formal method or LTA is required instead." },
      { name: "Canvassing of at least 3 Vendors (phone/internet/shopping)", owner: "Buyer", minDays: 1, maxDays: 2, notes: "Minimum 3 Vendors canvassed. Non-sealed submission method." },
      { name: "Preparation of Micro Purchase Canvassing Form", owner: "Buyer", minDays: 0, maxDays: 1, notes: "Form summarises all quotes received and justifies selection. Can be completed same day quotes are received." },
      { name: "Award decision & PO issuance", owner: "Buyer / Authorized Official", minDays: 1, maxDays: 2, notes: "Award to lowest compliant quote. PO issued." },
    ]
  },
  rfq: {
    label: "Request for Quotation (RFQ)",
    description: "Informal but written method for readily available goods, simple works or services (MS 502.6.3.1). Requires prices from at least 3 sources in writing, or by consulting published catalogue/internet prices. Where fewer than 3 quotations are obtained, the Buyer must document the reasons. Non-sealed submission.",
    color: "#1e72aa",
    steps: [
      { name: "Review of PR & preparation of RFQ document", owner: "Procurement Officer / Buyer", minDays: 2, maxDays: 3, notes: "Formal RFQ template must be used. Specs clearly defined." },
      { name: "Issuance of RFQ to at least 3 sources", owner: "Buyer", minDays: 1, maxDays: 1, notes: "E-tendering is recommended but NOT mandatory for RFQs (MS 502.6.5.6). May be sent via UNGM restricted list or FAOUA-tender email. If fewer than 3 quotations are obtained, document the reasons." },
      { name: "Vendor submission period", owner: "Vendors", minDays: 5, maxDays: 6, notes: "MS 502.6.5.5 sets no fixed minimum — the Buyer sets the closing date with the Requisitioner, allowing adequate time. 5–6 working days is the FAOUA working default, not a manual requirement." },
      { name: "Technical evaluation", owner: "Evaluation Panel / Requisitioner", minDays: 2, maxDays: 4, notes: "Technical compliance assessment of all submissions. Led by requisitioner or evaluation panel." },
      { name: "Commercial evaluation", owner: "Buyer / Procurement Officer", minDays: 1, maxDays: 3, notes: "Price-based evaluation and comparison of technically compliant quotations." },
      { name: "Award recommendation & PO preparation", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 3, notes: "Below the LPC Review Threshold no committee review is required. Summary prepared." },
      { name: "PO issuance", owner: "Authorized Official", minDays: 1, maxDays: 2, notes: "PO signed and issued to vendor." },
    ]
  },
  itb: {
    label: "Invitation to Bid (ITB) — Goods",
    description: "Formal solicitation for goods or works with clearly and completely specified, objectively measurable requirements (MS 502.6.3.2). Sealed submissions through the Organization's e-tendering system. Award to the lowest-priced responsive bid. LPC review of the award recommendation is mandatory above the Review Threshold.",
    color: "#0d5c96",
    steps: [
      { name: "Review of PR & preparation of solicitation documents", owner: "Buyer / Requisitioner", minDays: 4, maxDays: 7, notes: "Detailed specs, BoQ, evaluation criteria defined." },
      { name: "Solicitation issuance (public — e-tendering / UNGM)", owner: "Buyer", minDays: 1, maxDays: 1, notes: "E-tendering is MANDATORY for all formal solicitation methods (MS 502.6.8). Any deviation requires written approval from Chief, CSLP before solicitation starts. Published publicly via UNGM." },
      { name: "Bidding / publication period", owner: "Vendors", minDays: 15, maxDays: 21, calendarDays: true, notes: "MS 502.6.5.5 sets no fixed minimum — the Buyer sets the closing date with the Requisitioner, taking account of delivery requirements, complexity and urgency, allowing adequate time. 15–21 calendar days is the FAOUA working default. The closing date may be extended, never brought forward." },
      { name: "Tender opening", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Formal opening by the Opening Panel. Minutes recorded." },
      { name: "Technical evaluation", owner: "Evaluation Panel / Requisitioner", minDays: 10, maxDays: 20, notes: "Technical compliance assessment. Led by requisitioner/evaluation panel — not procurement. Conflict-of-interest declarations required." },
      { name: "Commercial evaluation & clearances", owner: "Buyer / Procurement Officer", minDays: 5, maxDays: 10, notes: "Price comparison and compliance review. Clearances obtained by procurement." },
      { name: "LPC review — submission & approval", owner: "LPC Members / Buyer", minDays: 5, maxDays: 10, notes: "Mandatory above the LPC Review Threshold. The LPC meets at least twice a month (MS 502.9.3), so the wait depends on the meeting calendar — the Chair may call an extra meeting or authorise a virtual/email review for urgent submissions. Quorum required." },
      { name: "PO preparation and review", owner: "Buyer / Procurement Officer", minDays: 3, maxDays: 7, notes: "Draft PO reviewed." },
      { name: "PO issuance and countersignature", owner: "Authorized Official / Vendor", minDays: 3, maxDays: 7, notes: "Signed by both parties." },
    ]
  },
  itb_works: {
    label: "ITB — Works (Civil/Construction)",
    description: "Public tendering for civil/construction works, always via ITB with a lump sum contract. Requires a complete Technical Dossier, CSLI clearance and a Resident Engineer — these come from the FAO Construction Guidelines, not MS 502; MS 502.11.5 governs the contract itself. LPC review mandatory above the Review Threshold.",
    color: "#083f6e",
    steps: [
      { name: "Legal authorizations verification", owner: "Requester / Budget Holder", minDays: 5, maxDays: 30, notes: "All permits and authorizations must be secured BEFORE procurement starts: construction permit, EIA clearance (if required), certificate of property, fire dept certification, utility connection authorizations, etc." },
      { name: "Technical Dossier preparation (BoQ, SoW, specs, drawings)", owner: "Technical Expert / Engineer / Consultant", minDays: 10, maxDays: 30, notes: "Must include: Bill of Quantities (no contingency sums), Scope of Works, technical specifications, architectural/structural/MEP drawings, and work planning. Must be cleared by CSLI or delegated Technical Officer." },
      { name: "CSLI clearance of Technical Dossier", owner: "CSLI / Delegated Technical Officer", minDays: 5, maxDays: 14, notes: "Design/drawings, BoQ, technical specs and SoW must be cleared by CSLI or a Technical Officer delegated by CSLI. Required before ITB issuance." },
      { name: "Resident Engineer (RE) identification & engagement", owner: "Buyer / Budget Holder", minDays: 5, maxDays: 14, notes: "RE must be identified early to avoid delays at contract start. RE may be FAO staff, consultant, or the firm that prepared the Technical Dossier (if selected competitively from the onset)." },
      { name: "ITB document preparation incl. draft lump sum contract", owner: "Buyer", minDays: 4, maxDays: 7, notes: "Lump sum contract (not re-measurement). ITB includes: Letter of Invitation, Technical Dossier, and draft contract with financial securities clauses (BG/PB/Retention as applicable — MS 502.11.5)." },
      { name: "ITB issuance (public — e-tendering / UNGM)", owner: "Buyer", minDays: 1, maxDays: 1, notes: "E-tendering is MANDATORY for all formal solicitation methods (MS 502.6.8). Published publicly via UNGM. Must specify whether the site visit is mandatory." },
      { name: "Bidding period incl. pre-bid conference & mandatory site visit", owner: "Vendors / Buyer / RE", minDays: 15, maxDays: 21, calendarDays: true, notes: "MS 502.6.5.5 sets no fixed minimum — the Buyer sets the closing date allowing adequate time. 15–21 calendar days is the FAOUA working default. Site visit is a standard requirement for Works. Pre-bid conference clarifies lump sum contract terms, payment milestones, financial securities, and site conditions." },
      { name: "Tender opening", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Formal opening. Minutes recorded." },
      { name: "Technical evaluation", owner: "Evaluation Panel / RE / TCO", minDays: 10, maxDays: 20, notes: "Technical compliance and contractor capacity assessment. Resident Engineer plays a key role. Conflict-of-interest declarations required." },
      { name: "Commercial evaluation & clearances", owner: "Buyer / Procurement Officer", minDays: 5, maxDays: 10, notes: "Price reasonableness check against internal cost estimate. Clearances obtained by procurement." },
      { name: "LPC review — submission & approval", owner: "LPC Members / Buyer", minDays: 5, maxDays: 10, notes: "Mandatory above the LPC Review Threshold. The LPC meets at least twice a month (MS 502.9.3) — the wait depends on the meeting calendar. Quorum required." },
      { name: "Contract preparation incl. financial securities (BG / PB / Retention)", owner: "Buyer / Procurement Officer", minDays: 5, maxDays: 10, notes: "Lump sum contract prepared. Includes clauses for Performance Bond, Bank Guarantee for advance payment, and/or Retention (MS 502.11.5 g / 502.11.7). Contractor must review and confirm." },
      { name: "Contract signature (both parties)", owner: "Procurement Authority / Contractor", minDays: 3, maxDays: 7, notes: "Signed by both parties. Financial securities (BG/PB) must be submitted at or before signature. Works may only commence after contract signature and all required securities are in place." },
    ]
  },
  rfp: {
    label: "Request for Proposal (RFP) — Services / Complex",
    description: "Formal two-envelope solicitation used where requirements are complex, cannot be completely specified, detailed technical evaluations are needed, and/or price is not the sole basis of award (MS 502.6.3.3). Sealed submissions via e-tendering. Procurement Committee ex-ante review of the evaluation criteria is mandatory above the Review Threshold — and may NEVER be done ex post facto, even in an Emergency or Exigency (MS 502.9.9).",
    color: "#1558a0",
    steps: [
      { name: "Review of PR & preparation of draft RFP + evaluation methodology", owner: "Buyer / Requisitioner", minDays: 3, maxDays: 7, notes: "TOR, evaluation criteria, scoring methodology prepared." },
      { name: "LPC ex-ante review of evaluation methodology & criteria", owner: "LPC Members / Procurement Officer", minDays: 5, maxDays: 10, notes: "⚠️ Mandatory above the LPC Review Threshold (Appendix F2 §4.1). Criteria must be approved BEFORE issuance. Ex post facto review of RFP evaluation criteria is expressly disallowed, even in Emergencies. LPC meets at least twice a month." },
      { name: "Finalisation and issuance of RFP (public — e-tendering / UNGM)", owner: "Buyer", minDays: 1, maxDays: 2, notes: "E-tendering is MANDATORY for all formal solicitation methods (MS 502.6.8). Published publicly. Bidders' conference may be organised." },
      { name: "Submission period (1st Envelope — Technical)", owner: "Vendors", minDays: 21, maxDays: 28, calendarDays: true, notes: "MS 502.6.5.5 sets no fixed minimum — the Buyer sets the closing date allowing adequate time for a complex proposal. 21–28 calendar days is the FAOUA working default." },
      { name: "Tender opening (1st Envelope — Technical)", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Technical envelopes opened and logged." },
      { name: "Technical evaluation", owner: "Evaluation Panel", minDays: 10, maxDays: 20, notes: "Technical scoring and shortlisting. Led by the evaluation panel — not procurement's responsibility." },
      { name: "Clearances (TCO / LTO review)", owner: "TCO / LTO / Procurement Officer", minDays: 3, maxDays: 7, notes: "Technical and legal clearances obtained from relevant FAO offices." },
      { name: "Tender opening (2nd Envelope — Financial)", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Only technically qualified offers proceed." },
      { name: "Financial evaluation & award recommendation draft", owner: "Buyer", minDays: 3, maxDays: 7, notes: "Combined technical-financial scoring prepared." },
      { name: "Review of award recommendation by Procurement Officer", owner: "Procurement Officer", minDays: 2, maxDays: 3, notes: "" },
      { name: "LPC meeting & award approval", owner: "LPC Members / Buyer / Requisitioner", minDays: 5, maxDays: 10, notes: "Mandatory above the LPC Review Threshold (Appendix F2 §4.2 — applies to new solicitations regardless of Award Basis). LPC meets at least twice a month; timing depends on quorum and the meeting calendar." },
      { name: "Preparation and review of Contractual Instrument", owner: "Buyer / Procurement Officer", minDays: 3, maxDays: 7, notes: "" },
      { name: "Signature of Contractual Instrument (both parties)", owner: "Procurement Authority / Vendor", minDays: 2, maxDays: 5, notes: "Contract / PO signed. Process complete." },
    ]
  },
  lta_fixed: {
    label: "LTA — Fixed Prices",
    description: "Fixed unit prices in the LTA. Identify the lowest-priced LTA holder, request a call-off offer, issue the PO directly. Call-offs remain subject to the Procurement Authority limits in Appendix C1 unless the LTA's own procedures say otherwise. No committee review for the call-off itself.",
    color: "#4a7fc1",
    steps: [
      { name: "Review of PR & check LTA catalogue / prices", owner: "Buyer / Requisitioner", minDays: 1, maxDays: 2, notes: "Review fixed prices across all LTA holders for the category." },
      { name: "Identify lowest-priced LTA holder & request offer", owner: "Buyer", minDays: 1, maxDays: 3, notes: "Formal call-off request sent to selected LTA holder." },
      { name: "Receive and verify offer against LTA terms", owner: "Buyer / Procurement Officer", minDays: 1, maxDays: 2, notes: "Confirm offer matches LTA fixed prices and scope." },
      { name: "PO preparation and issuance", owner: "Buyer / Authorized Official", minDays: 1, maxDays: 3, notes: "PO issued directly. No LPC approval required for the call-off." },
    ]
  },
  lta_mini: {
    label: "LTA — Mini Solicitation (No Fixed Prices)",
    description: "No fixed prices in the LTA. Competitive mini-solicitation among LTA holders on pre-established criteria, with the PO awarded to the most competitive offer (MS 502.6.3.4.3). Commercial evaluation required.",
    color: "#2e6da8",
    steps: [
      { name: "Review of PR & identify applicable LTA holders", owner: "Buyer / Requisitioner", minDays: 1, maxDays: 2, notes: "Confirm eligible LTA holders per the specific LTA SOP." },
      { name: "Prepare & issue mini solicitation to LTA holders", owner: "Buyer", minDays: 1, maxDays: 2, notes: "Solicitation documents per LTA SOP sent to all eligible holders. Award criteria must be those pre-established in the LTA." },
      { name: "Submission period for LTA holders", owner: "LTA Holders", minDays: 3, maxDays: 7, notes: "Typically 3–7 working days per SOP." },
      { name: "Opening & commercial evaluation", owner: "Buyer", minDays: 2, maxDays: 4, notes: "Commercial evaluation prepared to justify selection against the LTA's pre-established criteria." },
      { name: "Award notification & PO issuance", owner: "Buyer / Authorized Official", minDays: 1, maxDays: 3, notes: "PO issued to winning LTA holder." },
    ]
  },
  direct_procurement: {
    label: "Direct Procurement (Single Source)",
    description: "Single-source award under a permitted exception to competitive solicitation (MS 502.6.7). Permitted grounds include no competitive marketplace, approved standardization, VLVP, Exigency, Emergency Situation, venue rental, and other justified single-source cases. Note the FAO Representative's own authority for Direct Procurement is LOWER than for a competitive award — see Appendix C1. Committee review thresholds apply.",
    color: "#4a6d8c",
    steps: [
      { name: "Review & verification of approved PR and exception justification", owner: "Procurement Officer / Buyer", minDays: 1, maxDays: 2, notes: "Verify the single-source exception is duly approved under MS 502.6.7.1 and the GRMS PR is in place before proceeding." },
      { name: "Request for Quotation to single source", owner: "Buyer", minDays: 1, maxDays: 3, notes: "Formal RFQ sent to the single identified source with full specifications." },
      { name: "Commercial evaluation", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 5, notes: "Price reasonableness check, compliance with specifications, and comparison with market benchmarks where available." },
      { name: "Award recommendation preparation", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 4, notes: "Preparation of award recommendation memo. Add the applicable committee review via Additional Circumstances." },
      { name: "Contracting / PO preparation and review", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 5, notes: "Contract or Purchase Order drafted, reviewed, and cleared by Procurement Officer." },
      { name: "PO / Contract issuance and countersignature", owner: "Authorized Official / Vendor", minDays: 2, maxDays: 5, notes: "Signed by both parties. Process complete." },
    ]
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Additional Circumstances.
//
// Committee-review targeting follows Appendices D2/E2/F2 of the 13 Aug 2026 MS 502:
//   • LPC  (F2 §4.2) reviews award recommendations for new solicitations
//     REGARDLESS of Award Basis, above the Review Threshold.
//   • RPC  (E2 §5.2) and HQPC (D2 §5.2) review award recommendations ONLY for
//     Exceptional, Distributed and Direct Procurement awards — an ordinary
//     Competitive Award is NOT escalated to RPC/HQPC on value alone.
//   • RPC (E2 §5.1) / HQPC (D2 §5.1) additionally review RFP EVALUATION CRITERIA
//     ex ante above their thresholds.
//   • HQPC (D2 §5.9) reviews any award above USD 5m ex ante regardless of basis.
// ─────────────────────────────────────────────────────────────────────────────
const COMMITTEE_STEP_MATCH = ["LPC review", "LPC meeting", "LPC ex-ante", "RPC review", "HQPC review"];

export function getModifiers(tierKey = DEFAULT_TIER, ipoGrade = DEFAULT_IPO_GRADE) {
  const lpcMin = lpcThreshold(tierKey) + 1;
  const hqpcMin = hqpcThreshold(tierKey);
  const auth = authorityOf(ipoGrade, tierKey);

  return [
    // ── Award Basis ─────────────────────────────────────────────────────────
    { key: "exceptional_award",
      label: "Fewer than 3 responsive offers, or award not to the highest-ranked Vendor → Exceptional Award",
      minDays: 2, maxDays: 4,
      addStep: { name: "Exceptional Award — justification & Award Basis determination", owner: "Buyer / Procurement Officer",
        notes: "⚠️ MS 502.10.1.1.2: an award is Exceptional where fewer than 3 responsive offers are obtained, where the award goes to other than the highest-ranked Vendor, or where the recommendation deviates from the standard evaluation basis. This is what pulls a competitive tender into RPC/HQPC review — add the matching committee circumstance below." },
      applicable: ["itb", "itb_works", "rfp", "rfq", "micro"],
      insertAfter: ["Commercial evaluation & clearances", "Financial evaluation & award recommendation draft", "Commercial evaluation", "Preparation of Micro Purchase Canvassing Form"] },

    { key: "rpc_exceptional",
      label: `Exceptional / Distributed Award, ${fmtUsd(RPC_MIN)} – ${fmtUsd(RPC_MAX)} → RPC review (select Exceptional Award above too)`,
      minDays: 5, maxDays: 10, minValue: RPC_MIN, maxValue: RPC_MAX,
      addStep: { name: "RPC review — submission & approval", owner: "RPC Members / Buyer / Requisitioner",
        notes: "⚠️ Appendix E2 §5.2 — required for an Exceptional, Distributed or Direct Procurement award above the Review Threshold. Submitted ex ante via the IPO after Budget Holder and LTO/TCU clearance. REU confirmation needed in advance. Does NOT apply to an ordinary Competitive Award." },
      applicable: ["itb", "itb_works", "rfp"],
      insertAfter: ["LPC review — submission & approval", "LPC meeting & award approval"] },

    { key: "hqpc_exceptional",
      label: `Exceptional / Distributed Award ≥ ${fmtUsd(hqpcMin)} → HQPC review (select Exceptional Award above too)`,
      minDays: 7, maxDays: 14, minValue: hqpcMin,
      addStep: { name: "HQPC review — submission & approval", owner: "HQ Procurement Committee / Buyer / Requisitioner",
        notes: "⚠️ Appendix D2 §5.2 — required for an Exceptional, Distributed or Direct Procurement award above the Review Threshold. Reviewed by the FAO HQ Procurement Committee in Rome. Submissions prepared by the Requisitioner via the Buyer. Does NOT apply to an ordinary Competitive Award." },
      applicable: ["itb", "itb_works", "rfp"],
      insertAfter: ["LPC review — submission & approval", "LPC meeting & award approval"] },

    // ── RFP evaluation criteria, reviewed ex ante ───────────────────────────
    { key: "rpc_evalcriteria",
      label: `RFP evaluation criteria ${fmtUsd(RPC_MIN)} – ${fmtUsd(RPC_MAX)} → RPC ex-ante review of criteria`,
      minDays: 5, maxDays: 10, minValue: RPC_MIN, maxValue: RPC_MAX,
      addStep: { name: "RPC ex-ante review of evaluation criteria", owner: "RPC Members / Procurement Officer",
        notes: "⚠️ Appendix E2 §5.1 — evaluation criteria for proposals expected to exceed the Review Threshold are reviewed by the RPC BEFORE issuance. This review can never be done ex post facto, even in an Emergency or Exigency (MS 502.9.9)." },
      applicable: ["rfp"],
      insertAfter: "LPC ex-ante review of evaluation methodology & criteria" },

    { key: "hqpc_evalcriteria",
      label: `RFP evaluation criteria ≥ ${fmtUsd(hqpcMin)} → HQPC ex-ante review of criteria`,
      minDays: 7, maxDays: 14, minValue: hqpcMin,
      addStep: { name: "HQPC ex-ante review of evaluation criteria", owner: "HQ Procurement Committee / Procurement Officer",
        notes: "⚠️ Appendix D2 §5.1 — evaluation criteria for proposals expected to exceed the Review Threshold are reviewed by the HQPC BEFORE issuance. Never permitted ex post facto (MS 502.9.9)." },
      applicable: ["rfp"],
      insertAfter: "LPC ex-ante review of evaluation methodology & criteria" },

    // ── Exceptionally High-Value Procurement ────────────────────────────────
    { key: "hqpc_5m",
      label: `Value above ${fmtUsd(HQPC_EXCEPTIONAL_VALUE)} → mandatory ex-ante HQPC review (any Award Basis)`,
      minDays: 7, maxDays: 14, minValue: HQPC_EXCEPTIONAL_VALUE + 1,
      addStep: { name: "HQPC review — Exceptionally High-Value Procurement", owner: "HQ Procurement Committee / Buyer / Requisitioner",
        notes: "⚠️ Appendix D2 §5.9 — any single award, or the aggregate of awards from a single tender, above USD 5 million is reviewed ex ante by the HQPC regardless of Award Basis. Expressly NOT waivable and NOT available ex post facto, including in Emergency Situations and Exigencies." },
      applicable: ["itb", "itb_works", "rfp", "direct_procurement", "lta_fixed", "lta_mini"],
      insertBeforeLast: true },

    // ── Direct Procurement committee reviews ────────────────────────────────
    { key: "lpc_direct",
      label: `Value above ${fmtUsd(lpcMin - 1)} → LPC review required (mandatory)`,
      minDays: 5, maxDays: 10, minValue: lpcMin,
      addStep: { name: "LPC review — submission & approval (Direct Procurement)", owner: "LPC Members / Buyer / Procurement Officer",
        notes: `⚠️ Appendix F2 §4.2 — mandatory for Direct Procurement above the LPC Review Threshold, which for this office is ${fmtUsd(lpcMin - 1)} (the ITB/RFP value in Appendix G). LPC meets at least twice a month. Quorum required.` },
      applicable: ["direct_procurement"],
      insertAfter: "Award recommendation preparation" },

    { key: "rpc_direct",
      label: `Direct Procurement ${fmtUsd(RPC_MIN)} – ${fmtUsd(RPC_MAX)} → RPC review (select LPC above too)`,
      minDays: 5, maxDays: 10, minValue: RPC_MIN, maxValue: RPC_MAX,
      addStep: { name: "RPC review — submission & approval (Direct Procurement)", owner: "RPC Members / Buyer / Requisitioner",
        notes: "⚠️ Appendix E2 §5.2 — required for Direct Procurement above the Review Threshold. Follows LPC approval. REU confirmation needed in advance." },
      applicable: ["direct_procurement"],
      // Falls back to the base step so the order stays sane if LPC is not also ticked.
      insertAfter: ["LPC review — submission & approval (Direct Procurement)", "Award recommendation preparation"] },

    { key: "hqpc_direct",
      label: `Direct Procurement ≥ ${fmtUsd(hqpcMin)} → HQPC review (select LPC above too)`,
      minDays: 7, maxDays: 14, minValue: hqpcMin,
      addStep: { name: "HQPC review — submission & approval (Direct Procurement)", owner: "HQ Procurement Committee / Buyer / Requisitioner",
        notes: "⚠️ Appendix D2 §5.2 — required for Direct Procurement above the Review Threshold. Reviewed by the FAO HQ Procurement Committee in Rome. Follows LPC approval." },
      applicable: ["direct_procurement"],
      // Falls back to the base step so the order stays sane if LPC is not also ticked.
      insertAfter: ["LPC review — submission & approval (Direct Procurement)", "Award recommendation preparation"] },

    // ── Procurement Authority / re-delegation (Appendix C1) ─────────────────
    { key: "redelegation",
      label: `Value above ${fmtUsd(auth.competitive)} → exceeds FAO Rep competitive-award authority (${auth.label}); ad-hoc re-delegation required`,
      minDays: 3, maxDays: 7, minValue: auth.competitive + 1,
      addStep: { name: "Request for ad-hoc re-delegation of authority", owner: "Procurement Team / Country Office / REU or CSLP",
        notes: `⚠️ Appendix C1 — an FAO Representative ${auth.label} may issue solicitations and approve Competitive/UN Awards up to ${fmtUsd(auth.competitive)}. Above that an ad-hoc re-delegation must be obtained from the Regional Office or CSLP BEFORE tender issuance (MS 502.2.5.2). An FAO Rep cannot re-delegate this authority onward.` },
      applicable: ["itb", "itb_works", "rfp"],
      insertBefore: ["Solicitation issuance (public — e-tendering / UNGM)", "ITB issuance (public — e-tendering / UNGM)", "Finalisation and issuance of RFP (public — e-tendering / UNGM)"] },

    { key: "redelegation_direct",
      label: `Value above ${fmtUsd(auth.exceptional)} → exceeds FAO Rep Exceptional/Direct authority (${auth.label}); ad-hoc re-delegation required`,
      minDays: 3, maxDays: 7, minValue: auth.exceptional + 1,
      addStep: { name: "Request for ad-hoc re-delegation of authority", owner: "Procurement Team / Country Office / REU or CSLP",
        notes: `⚠️ Appendix C1 — the authority for an Exceptional Award or Direct Procurement is LOWER than for a competitive award: ${fmtUsd(auth.exceptional)} for an FAO Representative ${auth.label}. Above that an ad-hoc re-delegation is required.` },
      applicable: ["direct_procurement"],
      insertAfter: "Review & verification of approved PR and exception justification" },

    // ── Deviations (MS 502.16) ──────────────────────────────────────────────
    { key: "deviation_rpc",
      label: "Deviation from MS 502, above USD 50,000 up to USD 100,000 → RPC ex-ante review",
      minDays: 5, maxDays: 10, minValue: 50001, maxValue: 100000,
      addStep: { name: "RPC ex-ante review of deviation", owner: "RPC Members / Procurement Officer",
        notes: "⚠️ MS 502.16 / Appendix E2 §5.7 — deviations from the Manual Section require a comprehensive justification and ex-ante review by the RPC in this value band. Required even in Emergency Situations." },
      applicable: ["itb", "itb_works", "rfp", "rfq", "direct_procurement", "lta_fixed", "lta_mini"],
      insertBeforeLast: true },

    { key: "deviation_hqpc",
      label: "Deviation from MS 502 above USD 100,000 → HQPC ex-ante review",
      minDays: 7, maxDays: 14, minValue: 100001,
      addStep: { name: "HQPC ex-ante review of deviation", owner: "HQ Procurement Committee / Procurement Officer",
        notes: "⚠️ MS 502.16 / Appendix D2 §5.10 — deviations above USD 100,000 require ex-ante HQPC review. Required even in Emergency Situations." },
      applicable: ["itb", "itb_works", "rfp", "rfq", "direct_procurement", "lta_fixed", "lta_mini"],
      insertBeforeLast: true },

    // ── Extended Term Contract ──────────────────────────────────────────────
    { key: "extended_term",
      label: "Contract or LTA term exceeds 5 years → Extended Term Contract review (any value)",
      minDays: 5, maxDays: 10,
      addStep: { name: "Extended Term Contract review (LPC — and HQPC above threshold)", owner: "LPC / HQ Procurement Committee / Buyer",
        notes: "⚠️ Appendix F2 §4.7 — LPC review is required for any contract or LTA with an original or amended term exceeding 5 years, REGARDLESS of value. Appendix D2 §5.8 adds HQPC review where the estimated total exceeds the HQPC Review Threshold." },
      applicable: ["itb", "itb_works", "rfp", "direct_procurement", "lta_fixed", "lta_mini"],
      insertBeforeLast: true },

    // ── Emergency Situations and Exigencies ─────────────────────────────────
    { key: "emergency_situation",
      label: "Emergency Situation → single-source Direct Procurement justified (MS 502.6.7.1.5)",
      minDays: 1, maxDays: 2,
      addStep: { name: "Emergency Situation justification & approval", owner: "Procurement Authority / Budget Holder",
        notes: "MS 502.6.7.1.5 — single source is permitted because the nature or phase of the Emergency Situation does not allow sufficient time for a formal solicitation, even on a shortened submission deadline. Per MS 502.6.7.6, procure by Direct Procurement ONLY what is immediately required; the balance must go through a competitive process." },
      applicable: ["direct_procurement"],
      insertAfter: "Review & verification of approved PR and exception justification" },

    { key: "exigency",
      label: "Exigency → single-source Direct Procurement justified (MS 502.6.7.1.4)",
      minDays: 1, maxDays: 2,
      addStep: { name: "Exigency justification & approval", owner: "Procurement Authority / Budget Holder",
        notes: "MS 502.6.7.1.4 — permitted where an Exigency NOT attributable to poor planning or project deadlines leaves insufficient time for a formal solicitation even on a shortened deadline, and where not proceeding would cause serious damage, loss or injury to property or persons, or significant economic loss." },
      applicable: ["direct_procurement"],
      insertAfter: "Review & verification of approved PR and exception justification" },

    { key: "committee_email_circulation",
      label: "Emergency/Exigency → committee review by email circulation (5 members) instead of a meeting",
      minDays: 0, maxDays: 0,
      overrideMatching: { match: COMMITTEE_STEP_MATCH, minDays: 2, maxDays: 5,
        noteSuffix: " ⚡ Emergency/Exigency: reviewed by written comments circulated by email to at least 5 committee members (Appendices D2 §4 / E2 §4), or by a 'virtual meeting' authorised by the Chair (MS 502.9.3). Review is NOT waived." },
      applicable: ["itb", "itb_works", "rfp", "direct_procurement"] },

    { key: "ex_post_facto",
      label: "Emergency/Exigency → committee review ex post facto (within 60 calendar days of contract issuance)",
      minDays: 0, maxDays: 0,
      removeMatching: ["LPC review", "LPC meeting", "RPC review", "HQPC review"],
      insertAtEnd: true,
      addStep: { name: "Ex post facto committee review (within 60 calendar days)", owner: "LPC / RPC / HQPC / Procurement Authority", minDays: 0, maxDays: 0, calendarDays: true,
        notes: "⚠️ MS 502.9.9 — where finalisation cannot await even an email ex-ante review, the action may be submitted ex post facto no later than 60 CALENDAR DAYS from issuance of the contractual agreement, subject to agreement by the Procurement Authority and with a detailed explanation of why ex ante review was not feasible. OFF the critical path — it does not delay contract signature. Failure to submit in time is a breach of MS 502. Does NOT apply to RFP evaluation criteria (never permitted ex post) nor to Exceptionally High-Value Procurement above USD 5m." },
      applicable: ["itb", "itb_works", "rfp", "direct_procurement"] },

    // ── Technical clearances and inspection ─────────────────────────────────
    { key: "tco_lto_rfq", label: "TCO / LTO clearance required", minDays: 3, maxDays: 7,
      addStep: { name: "TCO / LTO clearance", owner: "TCO / LTO / Procurement Officer",
        notes: "Technical and/or legal clearances from relevant FAO offices (MS 502.2.2.4–5). Required when procurement involves significant technical complexity or legal considerations." },
      applicable: ["rfq"], insertAfter: "Technical evaluation" },

    { key: "tco_lto_direct", label: "Technical evaluation with TCO / LTO clearances required", minDays: 3, maxDays: 7,
      addStep: { name: "Technical evaluation & clearances (TCO / LTO)", owner: "Evaluation Panel / TCO / LTO / Procurement Officer",
        notes: "Technical assessment and clearances from relevant FAO offices. Required when goods/services have significant technical complexity." },
      applicable: ["direct_procurement"], insertAfter: "Request for Quotation to single source" },

    { key: "inspection", label: "Third-party inspection required (goods)", minDays: 5, maxDays: 7,
      addStep: { name: "Third-party inspection, reporting & clearance", owner: "Inspection Agency / Procurement Officer / Requisitioner",
        notes: "⚠️ MS 502.12.5.2 — adds min. 1 week for inspection, report and required clearances." },
      applicable: ["itb", "lta_fixed", "lta_mini", "rfq", "micro", "direct_procurement"], insertBeforeLast: true },

    // ── Works-specific ──────────────────────────────────────────────────────
    { key: "eia_works", label: "Environmental Impact Assessment required (external clearance)", minDays: 10, maxDays: 20,
      addStep: { name: "Environmental Impact Assessment (EIA) & external clearance", owner: "Requester / Environmental Consultant / Competent Authority",
        notes: "⚠️ Required when works may have significant adverse environmental impact (e.g. pesticide stores). Cleared by the relevant competent authority. Runs before/during the legal authorizations step." },
      applicable: ["itb_works"], insertBefore: "Legal authorizations verification" },

    { key: "geotech_works", label: "Geotechnical / topographic survey required", minDays: 5, maxDays: 15,
      addStep: { name: "Geotechnical / topographic survey", owner: "Specialized Surveyor / Consultant",
        notes: "Required for most construction works. Must be completed before finalizing the Technical Dossier. Proper justification required if not carried out." },
      applicable: ["itb_works"], insertBefore: "Technical Dossier preparation (BoQ, SoW, specs, drawings)" },
  ];
}

export const MODIFIERS = getModifiers(DEFAULT_TIER, DEFAULT_IPO_GRADE);

export function getProcesses(tierKey = DEFAULT_TIER) {
  const out = {};
  for (const [key, p] of Object.entries(PROCESSES)) {
    out[key] = { ...p, threshold: thresholdLabel(key, tierKey) ?? p.threshold ?? "Any value" };
  }
  out.lta_fixed.threshold = "Any value (existing LTA)";
  out.lta_mini.threshold = "Any value (existing LTA)";
  out.direct_procurement.threshold = "Any value (justified exception)";
  return out;
}

export const DEFAULT_PROFILE = {
  id: "default", name: "Default", countryCode: "UA",
  tier: DEFAULT_TIER, ipoGrade: DEFAULT_IPO_GRADE, leadTimes: {},
};

export function getQuickRef(tierKey = DEFAULT_TIER) {
  const t = tierOf(tierKey);
  const lpc = fmtUsd(t.rfqMax);
  const row = (key, method, range, basis, review, duration) => ({ key, method, range, basis, review, duration });
  return [
    row("very_low", "Very Low Value (VLVP)", thresholdLabel("very_low", tierKey), "Direct selection", "None", "2–3 days"),
    row("micro", "Micro Purchasing", thresholdLabel("micro", tierKey), "Lowest of 3 canvassed", "None (Canvassing Form)", "3–6 days"),
    row("rfq", "RFQ", thresholdLabel("rfq", tierKey), "Lowest compliant quote", "None below the Review Threshold", "14–22 days"),
    row("itb", "ITB — Goods", thresholdLabel("itb", tierKey), "Lowest compliant bid", `LPC above ${lpc}`, "47–86 days"),
    row("rfp", "RFP — Services", thresholdLabel("rfp", tierKey), "Best value (tech+fin)", `LPC ex-ante criteria + LPC award, above ${lpc}`, "58–107 days"),
    row("itb_works", "ITB — Works (Construction)", thresholdLabel("itb_works", tierKey), "Lowest compliant bid (lump sum)", `LPC above ${lpc}`, "74–175 days"),
    row("lta_fixed", "LTA — Fixed Price", "Any (LTA exists)", "Lowest LTA price", "None for the call-off", "4–10 days"),
    row("lta_mini", "LTA — Mini Solicitation", "Any (LTA exists)", "Most competitive offer", "None for the call-off", "8–18 days"),
    row("direct_procurement", "Direct Procurement", "Any (justified exception)", "Single source / negotiated", `LPC above ${lpc}; RPC ${fmtUsd(RPC_MIN)}–${fmtUsd(RPC_MAX)}; HQPC above`, "10–24 days (excl. committees)"),
  ];
}

export const QUICK_REF = getQuickRef(DEFAULT_TIER);
