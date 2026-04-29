export const FAO_DARK = "#1a2e44";
export const FAO_BLUE = "#009FDA";

export const PROCESSES = {
  very_low: {
    label: "Very Low Value", threshold: "< USD 1,000",
    description: "Simplified purchase. No formal solicitation required. Direct award with budget holder approval. A PO is not mandatory — for non-recurrent purchases, a Low Value Order (LVO) or simple approval record is sufficient.",
    color: "#5ba4d4",
    steps: [
      { name: "Review & Approval of PR by Budget Holder", owner: "Budget Holder", minDays: 1, maxDays: 1, notes: "Budget availability confirmed." },
      { name: "Identification of vendor & price check", owner: "Buyer", minDays: 1, maxDays: 1, notes: "Single source acceptable at this value." },
      { name: "LVO / PO preparation and issuance (if required)", owner: "Buyer / Authorized Official", minDays: 0, maxDays: 1, notes: "PO is not mandatory. A Low Value Order (LVO) or simple written record suffices for non-recurrent purchases. PO only required if purchase is recurrent or vendor requires it." },
    ]
  },
  micro: {
    label: "Micro Purchasing", threshold: "USD 1,000 – < USD 5,000",
    description: "At least 3 sources solicited via email or phone. Micro Purchase Canvassing Form must be prepared to summarize results.",
    color: "#3a8bbf",
    steps: [
      { name: "Review & Approval of PR by Procurement Officer", owner: "Procurement Officer / Budget Holder", minDays: 1, maxDays: 1, notes: "Adequacy of specs and fund availability checked." },
      { name: "Solicitation of at least 3 sources (email/phone)", owner: "Buyer", minDays: 1, maxDays: 2, notes: "Minimum 3 sources contacted. Responses collected via email or phone." },
      { name: "Preparation of Micro Purchase Canvassing Form", owner: "Buyer", minDays: 0, maxDays: 1, notes: "Form summarises all quotes received and justifies selection. Can be completed same day quotes are received." },
      { name: "Award decision & PO issuance", owner: "Buyer / Authorized Official", minDays: 1, maxDays: 2, notes: "Award to lowest compliant quote. PO issued." },
    ]
  },
  rfq: {
    label: "Request for Quotation (RFQ)", threshold: "USD 5,000 – < USD 25,000",
    description: "Informal but structured. At least 3 sources via formal RFQ template, sent through UNGM (restricted list) or FAOUA-tender email.",
    color: "#1e72aa",
    steps: [
      { name: "Review of PR & preparation of RFQ document", owner: "Procurement Officer / Buyer", minDays: 2, maxDays: 3, notes: "Formal RFQ template must be used. Specs clearly defined." },
      { name: "Issuance of RFQ to at least 3 vendors", owner: "Buyer", minDays: 1, maxDays: 1, notes: "Sent via UNGM restricted list or FAOUA-tender email." },
      { name: "Vendor submission period", owner: "Vendors", minDays: 5, maxDays: 6, notes: "Vendors given min. 5–6 working days to respond." },
      { name: "Technical evaluation", owner: "Evaluation Panel / Requisitioner", minDays: 2, maxDays: 4, notes: "Technical compliance assessment of all submissions. Led by requisitioner or evaluation panel." },
      { name: "Commercial evaluation", owner: "Buyer / Procurement Officer", minDays: 1, maxDays: 3, notes: "Price-based evaluation and comparison of technically compliant quotations." },
      { name: "Award recommendation & PO preparation", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 3, notes: "No LPC review required at this threshold. Summary prepared." },
      { name: "PO issuance", owner: "Authorized Official", minDays: 1, maxDays: 2, notes: "PO signed and issued to vendor." },
    ]
  },
  itb: {
    label: "Invitation to Bid (ITB) — Goods", threshold: "> USD 25,000 (goods)",
    description: "Public tendering for clearly defined goods. Award to lowest compliant bid. LPC/RPC review required.",
    color: "#0d5c96",
    steps: [
      { name: "Review of PR & preparation of solicitation documents", owner: "Buyer / Requisitioner", minDays: 4, maxDays: 7, notes: "Detailed specs, BoQ, evaluation criteria defined." },
      { name: "Solicitation issuance (public — UNGM)", owner: "Buyer", minDays: 1, maxDays: 1, notes: "Published publicly via UNGM." },
      { name: "Bidding / publication period", owner: "Vendors", minDays: 15, maxDays: 21, calendarDays: true, notes: "Min. 15 calendar days. Bidders' conference may be organised." },
      { name: "Tender opening", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Formal opening. Minutes recorded." },
      { name: "Technical evaluation", owner: "Evaluation Panel / Requisitioner", minDays: 10, maxDays: 20, notes: "Technical compliance assessment. Led by requisitioner/evaluation panel — not procurement." },
      { name: "Commercial evaluation & clearances", owner: "Buyer / Procurement Officer", minDays: 5, maxDays: 10, notes: "Price comparison and compliance review. Clearances obtained by procurement." },
      { name: "LPC review — submission & approval", owner: "LPC Members / Buyer", minDays: 5, maxDays: 7, notes: "Preparation of submission, presentation to LPC, and obtaining formal approval. Quorum required." },
      { name: "PO preparation and review", owner: "Buyer / Procurement Officer", minDays: 3, maxDays: 7, notes: "Draft PO reviewed." },
      { name: "PO issuance and countersignature", owner: "Authorized Official / Vendor", minDays: 3, maxDays: 7, notes: "Signed by both parties." },
    ]
  },
  itb_works: {
    label: "ITB — Works (Civil/Construction)",
    threshold: "> USD 25,000 (works)",
    description: "Public tendering for civil/construction works. Always uses ITB with lump sum contracts. Requires a complete Technical Dossier, CSLI clearance, and Resident Engineer. LPC review mandatory.",
    color: "#083f6e",
    steps: [
      { name: "Legal authorizations verification", owner: "Requester / Budget Holder", minDays: 5, maxDays: 30, notes: "All permits and authorizations must be secured BEFORE procurement starts: construction permit, EIA clearance (if required), certificate of property, fire dept certification, utility connection authorizations, etc." },
      { name: "Technical Dossier preparation (BoQ, SoW, specs, drawings)", owner: "Technical Expert / Engineer / Consultant", minDays: 10, maxDays: 30, notes: "Must include: Bill of Quantities (no contingency sums), Scope of Works, technical specifications, architectural/structural/MEP drawings, and work planning. Must be cleared by CSLI or delegated Technical Officer." },
      { name: "CSLI clearance of Technical Dossier", owner: "CSLI / Delegated Technical Officer", minDays: 5, maxDays: 14, notes: "Design/drawings, BoQ, technical specs and SoW must be cleared by CSLI or a Technical Officer delegated by CSLI. Required before ITB issuance." },
      { name: "Resident Engineer (RE) identification & engagement", owner: "Buyer / Budget Holder", minDays: 5, maxDays: 14, notes: "RE must be identified early to avoid delays at contract start. RE may be FAO staff, consultant, or the firm that prepared the Technical Dossier (if selected competitively from the onset)." },
      { name: "ITB document preparation incl. draft lump sum contract", owner: "Buyer", minDays: 4, maxDays: 7, notes: "Lump sum contract (not re-measurement). ITB includes: Letter of Invitation, Technical Dossier, and draft contract with financial securities clauses (BG/PB/Retention as applicable)." },
      { name: "ITB issuance (public — UNGM)", owner: "Buyer", minDays: 1, maxDays: 1, notes: "Published publicly via UNGM. Must specify whether site visit is mandatory." },
      { name: "Bidding period incl. pre-bid conference & mandatory site visit", owner: "Vendors / Buyer / RE", minDays: 15, maxDays: 21, calendarDays: true, notes: "Min. 15 calendar days. Site visit is a standard requirement for Works. Pre-bid conference clarifies lump sum contract terms, payment milestones, financial securities, and site conditions. Both held during bidding period." },
      { name: "Tender opening", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Formal opening. Minutes recorded." },
      { name: "Technical evaluation", owner: "Evaluation Panel / RE / TCO", minDays: 10, maxDays: 20, notes: "Technical compliance and contractor capacity assessment. Resident Engineer plays a key role. Conflict-of-interest declarations required." },
      { name: "Commercial evaluation & clearances", owner: "Buyer / Procurement Officer", minDays: 5, maxDays: 10, notes: "Price reasonableness check against internal cost estimate. Clearances obtained by procurement." },
      { name: "LPC review — submission & approval", owner: "LPC Members / Buyer", minDays: 5, maxDays: 7, notes: "Mandatory for all works contracts. Preparation of submission, presentation to LPC, and obtaining formal approval. Quorum required." },
      { name: "Contract preparation incl. financial securities (BG / PB / Retention)", owner: "Buyer / Procurement Officer", minDays: 5, maxDays: 10, notes: "Lump sum contract prepared. Includes clauses for Performance Bond (20%, reduced to 10% if used with retention), Bank Guarantee for advance payment (up to 20% if requested), and/or Retention (5–10%). Contractor must review and confirm." },
      { name: "Contract signature (both parties)", owner: "Procurement Authority / Contractor", minDays: 3, maxDays: 7, notes: "Signed by both parties. Financial securities (BG/PB) must be submitted at or before signature. Works may only commence after contract signature and all required securities are in place." },
    ]
  },
  rfp: {
    label: "Request for Proposal (RFP) — Services / Complex", threshold: "> USD 25,000",
    description: "Two-envelope public process. LPC ex-ante review of evaluation methodology mandatory before issuance.",
    color: "#1558a0",
    steps: [
      { name: "Review of PR & preparation of draft RFP + evaluation methodology", owner: "Buyer / Requisitioner", minDays: 3, maxDays: 7, notes: "TOR, evaluation criteria, scoring methodology prepared." },
      { name: "LPC ex-ante review of evaluation methodology & criteria", owner: "LPC Members / Procurement Officer", minDays: 5, maxDays: 7, notes: "⚠️ Mandatory for RFP. LPC must approve evaluation criteria BEFORE issuance. Adds ~1 week." },
      { name: "Finalisation and issuance of RFP (public — UNGM)", owner: "Buyer", minDays: 1, maxDays: 2, notes: "Published publicly. Bidders' conference may be organised." },
      { name: "Submission period (1st Envelope — Technical)", owner: "Vendors", minDays: 21, maxDays: 28, calendarDays: true, notes: "Min. 21 calendar days. Bidders' conference held to clarify requirements." },
      { name: "Tender opening (1st Envelope — Technical)", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Technical envelopes opened and logged." },
      { name: "Technical evaluation", owner: "Evaluation Panel", minDays: 10, maxDays: 20, notes: "Technical scoring and shortlisting. Led by the evaluation panel — not procurement's responsibility." },
      { name: "Clearances (TCO / LTO review)", owner: "TCO / LTO / Procurement Officer", minDays: 3, maxDays: 7, notes: "Technical and legal clearances obtained from relevant FAO offices." },
      { name: "Tender opening (2nd Envelope — Financial)", owner: "Buyer / Opening Panel", minDays: 1, maxDays: 1, notes: "Only technically qualified offers proceed." },
      { name: "Financial evaluation & award recommendation draft", owner: "Buyer", minDays: 3, maxDays: 7, notes: "Combined technical-financial scoring prepared." },
      { name: "Review of award recommendation by Procurement Officer", owner: "Procurement Officer", minDays: 2, maxDays: 3, notes: "" },
      { name: "LPC meeting & award approval", owner: "LPC Members / Buyer / Requisitioner", minDays: 3, maxDays: 7, notes: "Tentative — depends on quorum availability." },
      { name: "Preparation and review of Contractual Instrument", owner: "Buyer / Procurement Officer", minDays: 3, maxDays: 7, notes: "" },
      { name: "Signature of Contractual Instrument (both parties)", owner: "Procurement Authority / Vendor", minDays: 2, maxDays: 5, notes: "Contract / PO signed. Process complete." },
    ]
  },
  lta_fixed: {
    label: "LTA — Fixed Prices", threshold: "Any value (existing LTA)",
    description: "Fixed unit prices in LTA. Identify lowest-priced LTA holder, request call-off offer, issue PO directly. No LPC approval needed.",
    color: "#4a7fc1",
    steps: [
      { name: "Review of PR & check LTA catalogue / prices", owner: "Buyer / Requisitioner", minDays: 1, maxDays: 2, notes: "Review fixed prices across all LTA holders for the category." },
      { name: "Identify lowest-priced LTA holder & request offer", owner: "Buyer", minDays: 1, maxDays: 3, notes: "Formal call-off request sent to selected LTA holder." },
      { name: "Receive and verify offer against LTA terms", owner: "Buyer / Procurement Officer", minDays: 1, maxDays: 2, notes: "Confirm offer matches LTA fixed prices and scope." },
      { name: "PO preparation and issuance", owner: "Buyer / Authorized Official", minDays: 1, maxDays: 3, notes: "PO issued directly. No LPC approval required." },
    ]
  },
  lta_mini: {
    label: "LTA — Mini Solicitation (No Fixed Prices)", threshold: "Any value (existing LTA)",
    description: "No fixed prices in LTA. Mini competition among LTA holders per SOP. Lowest bid awarded. Commercial evaluation required — no LPC approval.",
    color: "#2e6da8",
    steps: [
      { name: "Review of PR & identify applicable LTA holders", owner: "Buyer / Requisitioner", minDays: 1, maxDays: 2, notes: "Confirm eligible LTA holders per the specific LTA SOP." },
      { name: "Prepare & issue mini solicitation to LTA holders", owner: "Buyer", minDays: 1, maxDays: 2, notes: "Solicitation documents per LTA SOP sent to all eligible holders." },
      { name: "Submission period for LTA holders", owner: "LTA Holders", minDays: 3, maxDays: 7, notes: "Typically 3–7 working days per SOP." },
      { name: "Opening & commercial evaluation", owner: "Buyer", minDays: 2, maxDays: 4, notes: "Commercial evaluation prepared to justify selection. No LPC required." },
      { name: "Award notification & PO issuance", owner: "Buyer / Authorized Official", minDays: 1, maxDays: 3, notes: "PO issued to winning LTA holder." },
    ]
  },
  direct_procurement: {
    label: "Direct Procurement (Single Source)", threshold: "Any value (justified exception)",
    description: "Single source procurement following a duly approved exception in GRMS. LPC approval mandatory for contracts ≥ USD 25,000. Use additional circumstances to add technical evaluation, LPC, RPC, or HQPC review as applicable.",
    color: "#4a6d8c",
    steps: [
      { name: "Review & verification of approved PR and exception justification", owner: "Procurement Officer / Buyer", minDays: 1, maxDays: 2, notes: "Verify that the single-source exception is duly approved and GRMS PR is in place before proceeding." },
      { name: "Request for Quotation to single source", owner: "Buyer", minDays: 1, maxDays: 3, notes: "Formal RFQ sent to the single identified source with full specifications." },
      { name: "Commercial evaluation", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 5, notes: "Price reasonableness check, compliance with specifications, and comparison with market benchmarks where available." },
      { name: "Award recommendation preparation", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 4, notes: "Preparation of award recommendation memo. For ≥ USD 25,000, LPC review is mandatory — add it via Additional Circumstances." },
      { name: "Contracting / PO preparation and review", owner: "Buyer / Procurement Officer", minDays: 2, maxDays: 5, notes: "Contract or Purchase Order drafted, reviewed, and cleared by Procurement Officer." },
      { name: "PO / Contract issuance and countersignature", owner: "Authorized Official / Vendor", minDays: 2, maxDays: 5, notes: "Signed by both parties. Process complete." },
    ]
  },
};

export const MODIFIERS = [
  { key: "rpc_rfp", label: "RFP value USD 200,000 – < USD 500,000 → RPC review required", minDays: 5, maxDays: 7,
    minValue: 200000, maxValue: 499999,
    addStep: { name: "RPC review of award recommendation", owner: "RPC Members / Buyer / Requisitioner", notes: "⚠️ Required when RFP value is ≥ USD 200,000 and < USD 500,000. REU office confirmation needed in advance. Adds ~7 working days." },
    applicable: ["rfp"], insertAfter: "LPC meeting & award approval" },
  { key: "hqpc", label: "RFP value ≥ USD 500,000 → HQPC review required (HQ Procurement Committee)", minDays: 5, maxDays: 7,
    minValue: 500000,
    addStep: { name: "HQPC review of award recommendation", owner: "HQ Procurement Committee / Buyer / Requisitioner", notes: "⚠️ Required when RFP value ≥ USD 500,000. Reviewed by FAO HQ Procurement Committee in Rome. Adds ~7 working days." },
    applicable: ["rfp"], insertAfter: "LPC meeting & award approval" },
  { key: "rpc_itb", label: "ITB value ≥ USD 200,000 → RPC review required", minDays: 5, maxDays: 7,
    minValue: 200000,
    addStep: { name: "RPC review — submission & approval (ITB)", owner: "RPC Members / Buyer / Requisitioner", notes: "⚠️ Required when ITB value ≥ USD 200,000. Separate from LPC. Each review requires ~1 week for submission prep, presentation, and approval." },
    applicable: ["itb"], insertAfter: "LPC review — submission & approval" },
  { key: "redelegation", label: "Value exceeds country procurement authority → Ad-hoc re-delegation required", minDays: 3, maxDays: 5,
    addStep: { name: "Request for ad-hoc re-delegation of authority", owner: "Procurement Team / Country Office", notes: "⚠️ Must be completed BEFORE tender issuance. Adds ~1 week." },
    applicable: ["itb", "rfp"], insertBefore: ["Solicitation issuance (public — UNGM)", "Finalisation and issuance of RFP (public — UNGM)"] },
  { key: "tco_lto_rfq", label: "TCO / LTO clearance required", minDays: 3, maxDays: 7,
    addStep: { name: "TCO / LTO clearance", owner: "TCO / LTO / Procurement Officer", notes: "Technical and/or legal clearances from relevant FAO offices. Required when procurement involves significant technical complexity or legal considerations." },
    applicable: ["rfq"], insertAfter: "Technical evaluation" },
  { key: "inspection", label: "Third-party inspection required (goods)", minDays: 5, maxDays: 7,
    addStep: { name: "Third-party inspection, reporting & clearance", owner: "Inspection Agency / Procurement Officer / Requisitioner", notes: "⚠️ Adds min. 1 week for inspection, report and required clearances." },
    applicable: ["itb", "lta_fixed", "lta_mini", "rfq", "micro", "direct_procurement"], insertBeforeLast: true },
  { key: "tco_lto_direct", label: "Technical evaluation with TCO / LTO clearances required", minDays: 3, maxDays: 7,
    addStep: { name: "Technical evaluation & clearances (TCO / LTO)", owner: "Evaluation Panel / TCO / LTO / Procurement Officer", notes: "Technical assessment and clearances from relevant FAO offices. Required when goods/services have significant technical complexity." },
    applicable: ["direct_procurement"], insertAfter: "Request for Quotation to single source" },
  { key: "lpc_direct", label: "Value ≥ USD 25,000 → LPC approval required (mandatory)", minDays: 5, maxDays: 7,
    minValue: 25000,
    addStep: { name: "LPC review — submission & approval (Direct Procurement)", owner: "LPC Members / Buyer / Procurement Officer", notes: "⚠️ Mandatory for all direct procurement ≥ USD 25,000. Preparation of submission, presentation to LPC, and obtaining formal approval. Quorum required." },
    applicable: ["direct_procurement"], insertAfter: "Award recommendation preparation" },
  { key: "rpc_direct", label: "Value USD 200,000 – < USD 500,000 → RPC review required (select LPC above too)", minDays: 5, maxDays: 7,
    minValue: 200000, maxValue: 499999,
    addStep: { name: "RPC review — submission & approval (Direct Procurement)", owner: "RPC Members / Buyer / Requisitioner", notes: "⚠️ Required when value ≥ USD 200,000 and < USD 500,000. Follows LPC approval. REU office confirmation needed in advance." },
    applicable: ["direct_procurement"], insertAfter: "LPC review — submission & approval (Direct Procurement)" },
  { key: "hqpc_direct", label: "Value ≥ USD 500,000 → HQPC review required (select LPC above too)", minDays: 7, maxDays: 14,
    minValue: 500000,
    addStep: { name: "HQPC review — submission & approval (Direct Procurement)", owner: "HQ Procurement Committee / Buyer / Requisitioner", notes: "⚠️ Required when value ≥ USD 500,000. Reviewed by FAO HQ Procurement Committee in Rome. Follows LPC approval." },
    applicable: ["direct_procurement"], insertAfter: "LPC review — submission & approval (Direct Procurement)" },
  { key: "eia_works", label: "Environmental Impact Assessment required (external clearance)", minDays: 10, maxDays: 20,
    addStep: { name: "Environmental Impact Assessment (EIA) & external clearance", owner: "Requester / Environmental Consultant / Competent Authority", notes: "⚠️ Required when works may have significant adverse environmental impact (e.g. pesticide stores). Cleared by relevant competent authority. Runs before/during legal authorizations step." },
    applicable: ["itb_works"], insertBefore: "Legal authorizations verification" },
  { key: "geotech_works", label: "Geotechnical / topographic survey required", minDays: 5, maxDays: 15,
    addStep: { name: "Geotechnical / topographic survey", owner: "Specialized Surveyor / Consultant", notes: "Required for most construction works. Must be completed before finalizing Technical Dossier. Proper justification required if not carried out." },
    applicable: ["itb_works"], insertBefore: "Technical Dossier preparation (BoQ, SoW, specs, drawings)" },
  { key: "rpc_works", label: "Value USD 200,000 – < USD 500,000 → RPC review required", minDays: 5, maxDays: 7,
    minValue: 200000, maxValue: 499999,
    addStep: { name: "RPC review — submission & approval (Works)", owner: "RPC Members / Buyer / Requisitioner", notes: "⚠️ Required when works contract value ≥ USD 200,000 and < USD 500,000. Follows LPC approval." },
    applicable: ["itb_works"], insertAfter: "LPC review — submission & approval" },
  { key: "hqpc_works", label: "Value ≥ USD 500,000 → HQPC review required (HQ Procurement Committee)", minDays: 7, maxDays: 14,
    minValue: 500000,
    addStep: { name: "HQPC review — submission & approval (Works)", owner: "HQ Procurement Committee / Buyer / Requisitioner", notes: "⚠️ Required when works contract value ≥ USD 500,000. Reviewed by FAO HQ Procurement Committee in Rome. Follows LPC approval." },
    applicable: ["itb_works"], insertAfter: "LPC review — submission & approval" },
  { key: "redelegation_works", label: "Value exceeds country procurement authority → Ad-hoc re-delegation required", minDays: 4, maxDays: 7,
    addStep: { name: "Request for ad-hoc re-delegation of authority", owner: "Procurement Team / Country Office", notes: "⚠️ Must be completed BEFORE ITB issuance." },
    applicable: ["itb_works"], insertBefore: "ITB issuance (public — UNGM)" },
];

export const DEFAULT_PROFILE = { id: 'default', name: 'Default', countryCode: 'UA', leadTimes: {} };

export const QUICK_REF = [
  ["Very Low Value", "< $1,000", "Direct award", "None", "2–3 days"],
  ["Micro Purchasing", "$1K – < $5K", "Lowest of 3 quotes", "None (Canvassing Form)", "3–6 days"],
  ["RFQ", "$5K – < $25K", "Lowest compliant quote", "None (summary required)", "14–22 days"],
  ["ITB", "> $25K (goods)", "Lowest compliant bid", "LPC + RPC", "47–81 days"],
  ["RFP", "> $25K (services/complex)", "Best value (tech+fin)", "LPC ex-ante + LPC award", "58–102 days"],
  ["LTA — Fixed Price", "Any (LTA exists)", "Lowest LTA price", "None", "4–10 days"],
  ["LTA — Mini Solicitation", "Any (LTA exists)", "Lowest bid (comm. eval.)", "None (commercial eval.)", "8–18 days"],
  ["Direct Procurement", "Any (justified exception)", "Single source / negotiated", "LPC if ≥ $25K; RPC/HQPC if higher", "10–24 days (excl. committees)"],
  ["ITB — Works (Construction)", "> $25K (works)", "Lowest compliant bid (lump sum)", "LPC review (mandatory)", "74–172 days"],
];
