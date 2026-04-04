import { useState } from "react";
import "./App.css";
import { PROCESSES, MODIFIERS, QUICK_REF, FAO_DARK, FAO_BLUE } from "./data";
import { toISO, formatDate, buildSteps, computeTimeline, subtractWorkingDays, countWorkingDays, addWorkingDays } from "./utils";
import GanttChart from "./components/GanttChart";
import { useHolidays } from "./hooks/useHolidays";

// ── Sub-components defined OUTSIDE App to avoid recreation on re-render ──

function ProcessCard({ procKey, proc, onSelect }) {
  const minDays = proc.steps.reduce((s, st) => s + st.minDays, 0);
  const maxDays = proc.steps.reduce((s, st) => s + st.maxDays, 0);
  return (
    <div
      className="process-card"
      style={{ borderColor: proc.color }}
      onClick={() => onSelect(procKey)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(procKey)}
    >
      <div className="process-card-label" style={{ color: proc.color }}>{proc.label}</div>
      <div className="process-card-threshold">{proc.threshold}</div>
      <div className="process-card-desc">{proc.description}</div>
      <div className="process-card-duration" style={{ color: proc.color }}>
        {minDays}–{maxDays} working days (PR → PO) →
      </div>
    </div>
  );
}

function DeliveryPicker({ deliveryWeeks, onChange, procColor, isWorks }) {
  const options = isWorks
    ? [
        { label: "Not set", value: 0 },
        { label: "1 month", value: 1 },
        { label: "2 months", value: 2 },
        { label: "3 months", value: 3 },
        { label: "4 months", value: 4 },
        { label: "6 months", value: 6 },
        { label: "9 months", value: 9 },
        { label: "12 months", value: 12 },
        { label: "18 months", value: 18 },
        { label: "24 months", value: 24 },
      ]
    : [
        { label: "None", value: 0 },
        { label: "1 week", value: 1 },
        { label: "2 weeks", value: 2 },
        { label: "3 weeks", value: 3 },
        { label: "4 weeks", value: 4 },
        { label: "6 weeks", value: 6 },
        { label: "8 weeks", value: 8 },
        { label: "10 weeks", value: 10 },
        { label: "12 weeks", value: 12 },
        { label: "16 weeks", value: 16 },
        { label: "20 weeks", value: 20 },
        { label: "6 months", value: 26 },
        { label: "9 months", value: 39 },
        { label: "12 months", value: 52 },
      ];

  return (
    <div className="delivery-picker">
      <div className="delivery-picker-label">
        {isWorks ? "🏗 Construction Execution Period" : "🚚 Delivery Period after PO"}{" "}
        <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span>
      </div>
      <div className="delivery-pills">
        {options.map(opt => {
          const active = deliveryWeeks === opt.value;
          return (
            <button key={opt.value} className="delivery-pill"
              style={{ borderColor: procColor, background: active ? procColor : "#fff", color: active ? "#fff" : procColor }}
              onClick={() => onChange(opt.value)}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBanner({ label, status, minDate, maxDate, desiredDate, latestPRSafe, latestPRPossible, holidays = new Set() }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const desired = desiredDate ? new Date(desiredDate) : null;

  if (!status || !desiredDate) return null;

  if (status.type === 'ok') {
    const bufferDays = desired && maxDate ? countWorkingDays(maxDate, desired, holidays) : 0;
    return (
      <div className="status-banner status-banner-ok">
        <div className="status-banner-header">
          <span className="status-banner-icon">✅</span>
          <div>
            <div className="status-banner-title" style={{ color: "#2e7d32" }}>{label}: On track (best &amp; worst case)</div>
            <div className="status-banner-body" style={{ color: "#388e3c" }}>
              Estimated: <strong>{minDate ? formatDate(minDate) : "—"}</strong> – <strong>{maxDate ? formatDate(maxDate) : "—"}</strong>
              &nbsp;|&nbsp;Buffer: <strong>{bufferDays} working day{bufferDays !== 1 ? "s" : ""}</strong> before your deadline of <strong>{formatDate(desired)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status.type === 'risk') {
    return (
      <div className="status-banner status-banner-risk">
        <div className="status-banner-header">
          <span className="status-banner-icon">⚠️</span>
          <div>
            <div className="status-banner-title" style={{ color: "#f57f17" }}>{label}: At risk — achievable in best case, may run late</div>
            <div className="status-banner-body" style={{ color: "#795548" }}>
              Best case: <strong>{minDate ? formatDate(minDate) : "—"}</strong> ✓ &nbsp;|&nbsp; Worst case: <strong>{maxDate ? formatDate(maxDate) : "—"}</strong> ✗ &nbsp;|&nbsp; Your deadline: <strong>{formatDate(desired)}</strong>
            </div>
          </div>
        </div>
        {(latestPRSafe || latestPRPossible) && (
          <div className="status-latest-pr">
            📌 <strong style={{ color: "#e65100" }}>Latest safe PR approval:</strong>{" "}
            <strong style={{ color: "#bf360c" }}>{latestPRSafe ? formatDate(latestPRSafe) : "—"}</strong>
            &nbsp;|&nbsp;
            <strong style={{ color: "#e65100" }}>Absolute latest:</strong>{" "}
            <strong style={{ color: "#bf360c" }}>{latestPRPossible ? formatDate(latestPRPossible) : "—"}</strong>
          </div>
        )}
      </div>
    );
  }

  // RED — late
  const delay = desired && minDate ? countWorkingDays(desired, minDate) : 0;
  const safeAlreadyPassed = latestPRSafe && latestPRSafe < today;
  const possibleAlreadyPassed = latestPRPossible && latestPRPossible < today;
  return (
    <div className="status-banner status-banner-late">
      <div className="status-banner-header">
        <span className="status-banner-icon">🚨</span>
        <div>
          <div className="status-banner-title" style={{ color: "#c62828" }}>
            {label}: LATE — even in best case, will miss deadline by {delay} working day{delay !== 1 ? "s" : ""}
          </div>
          <div className="status-banner-body" style={{ color: "#b71c1c" }}>
            Best case: <strong>{minDate ? formatDate(minDate) : "—"}</strong>
            &nbsp;|&nbsp;Your deadline: <strong>{desired ? formatDate(desired) : "—"}</strong>
          </div>
        </div>
      </div>
      {latestPRPossible && (
        <div className="status-latest-pr">
          <div>
            📌 <strong style={{ color: "#e65100" }}>Latest possible PR approval:</strong>{" "}
            <strong style={{ color: "#bf360c" }}>{formatDate(latestPRPossible)}</strong>
            {possibleAlreadyPassed && <span style={{ color: "#c62828", marginLeft: 8 }}>⚠️ Already passed</span>}
          </div>
          {latestPRSafe && (
            <div style={{ marginTop: 4 }}>
              For a safe process: <strong style={{ color: "#e65100" }}>PR approved by {formatDate(latestPRSafe)}</strong>
              {safeAlreadyPassed && <span style={{ color: "#c62828", marginLeft: 8 }}>⚠️ Already passed</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepsTable({ timeline, proc, activeMods, totalMinDays, totalMaxDays, minPoDate, maxPoDate, deliveryWeeks, minDeliveryDate, maxDeliveryDate, isWorks }) {
  const headerSuffix = isWorks
    ? (deliveryWeeks > 0 ? " → Contract → Construction → DLP" : " → Contract Signature")
    : (deliveryWeeks > 0 ? " → Delivery" : "");
  const totalRowLabel = isWorks ? "TOTAL (PR → Contract)" : "TOTAL (PR → PO)";

  return (
    <div className="card">
      <div className="card-header" style={{ background: proc.color }}>
        Process Steps — Approved PR → {isWorks ? "Contract Signature" : "PO Issuance"}{headerSuffix}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f4f7fa" }}>
              {["#", "Phase", "Responsible", "Min", "Max", "Earliest Date", "Latest Date", "Notes"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #e0e6ef" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeline.map((step, i) => {
              const isExtra = activeMods.some(k => {
                const m = MODIFIERS.find(md => md.key === k);
                return m && m.addStep && m.addStep.name === step.name;
              });
              const isLast = i === timeline.length - 1;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: isLast ? "#f3e5f5" : isExtra ? "#fff8e1" : i % 2 ? "#fafbfc" : "#fff" }}>
                  <td style={{ padding: "8px 10px", color: proc.color, fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "8px 10px", fontWeight: isLast ? 700 : 600 }}>
                    {isExtra && <span style={{ color: "#f57c00", marginRight: 4 }}>⚠️</span>}
                    {isLast && <span style={{ marginRight: 4 }}>📌</span>}
                    {step.name}
                  </td>
                  <td style={{ padding: "8px 10px", color: "#555" }}>{step.owner}</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: "#e8f4fd", color: FAO_BLUE, padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>{step.minDays}d</span></td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: "#fce4ec", color: "#c62828", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>{step.maxDays}d</span></td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: "#444" }}>{formatDate(step.minEnd)}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: isLast ? 700 : 400, color: isLast ? proc.color : "#444" }}>{formatDate(step.maxEnd)}</td>
                  <td style={{ padding: "8px 10px", color: "#666", fontSize: 11 }}>{step.notes || "—"}</td>
                </tr>
              );
            })}
            {/* Subtotal row */}
            <tr style={{ background: "#f0f4f8", fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: "9px 10px", textAlign: "right", fontSize: 12 }}>{totalRowLabel}</td>
              <td style={{ padding: "9px 10px", color: FAO_BLUE, fontSize: 12 }}>{totalMinDays}d</td>
              <td style={{ padding: "9px 10px", color: "#c62828", fontSize: 12 }}>{totalMaxDays}d</td>
              <td style={{ padding: "9px 10px", color: proc.color, fontSize: 12 }}>{minPoDate ? formatDate(minPoDate) : "—"}</td>
              <td style={{ padding: "9px 10px", color: proc.color, fontSize: 12 }}>{maxPoDate ? formatDate(maxPoDate) : "—"}</td>
              <td style={{ padding: "9px 10px" }} />
            </tr>
            {/* Delivery / Construction row */}
            {deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate && (
              isWorks ? (
                <tr style={{ background: "#efebe9", borderTop: "2px solid #bcaaa4" }}>
                  <td style={{ padding: "8px 10px", color: "#4e342e", fontWeight: 700 }}>🏗</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#4e342e" }}>Construction Execution Period</td>
                  <td style={{ padding: "8px 10px", color: "#555" }}>Contractor / Resident Engineer</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: "#d7ccc8", color: "#4e342e", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>{deliveryWeeks} mo</span></td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: "#d7ccc8", color: "#4e342e", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>{deliveryWeeks} mo</span></td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 700, color: "#4e342e" }}>{formatDate(minPoDate)}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 700, color: "#4e342e" }}>{formatDate(maxPoDate)}</td>
                  <td style={{ padding: "8px 10px", color: "#666", fontSize: 11 }}>{deliveryWeeks}-month lump sum construction contract. RE monitors progress and certifies completion milestones.</td>
                </tr>
              ) : (
                <tr style={{ background: "#e3f2fd", borderTop: "2px solid #90caf9" }}>
                  <td style={{ padding: "8px 10px", color: "#0277bd", fontWeight: 700 }}>🚚</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0277bd" }}>Delivery Period</td>
                  <td style={{ padding: "8px 10px", color: "#555" }}>Vendor / Supplier</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: "#bbdefb", color: "#0277bd", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>{deliveryWeeks}wk</span></td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: "#bbdefb", color: "#0277bd", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>{deliveryWeeks}wk</span></td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 700, color: "#0277bd" }}>{formatDate(minDeliveryDate)}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 700, color: "#0277bd" }}>{formatDate(maxDeliveryDate)}</td>
                  <td style={{ padding: "8px 10px", color: "#666", fontSize: 11 }}>{deliveryWeeks * 7} calendar days after PO issuance.</td>
                </tr>
              )
            )}
            {/* DLP row — works only */}
            {isWorks && deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate && (() => {
              const dlpMinEnd = new Date(minDeliveryDate); dlpMinEnd.setMonth(dlpMinEnd.getMonth() + 12);
              const dlpMaxEnd = new Date(maxDeliveryDate); dlpMaxEnd.setMonth(dlpMaxEnd.getMonth() + 12);
              return (
                <>
                  <tr style={{ background: "#fce4ec", borderTop: "1px solid #f48fb1" }}>
                    <td style={{ padding: "8px 10px", color: "#880e4f", fontWeight: 700 }}>📋</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#880e4f" }}>Defects Liability Period (DLP)</td>
                    <td style={{ padding: "8px 10px", color: "#555" }}>Contract Manager / RE / Contractor</td>
                    <td style={{ padding: "8px 10px" }}><span style={{ background: "#fce4ec", color: "#880e4f", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>12 mo</span></td>
                    <td style={{ padding: "8px 10px" }}><span style={{ background: "#fce4ec", color: "#880e4f", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>12 mo</span></td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: "#444" }}>{formatDate(minDeliveryDate)}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: "#444" }}>{formatDate(maxDeliveryDate)}</td>
                    <td style={{ padding: "8px 10px", color: "#666", fontSize: 11 }}>Mandatory 12-month period after Works completion. PB reduced 50% at Works completion; extinguished at DLP end. Critical for project NTE planning.</td>
                  </tr>
                  <tr style={{ background: "#880e4f", fontWeight: 700 }}>
                    <td colSpan={3} style={{ padding: "9px 10px", textAlign: "right", fontSize: 12, color: "#fff" }}>PROJECT CLOSE (DLP end)</td>
                    <td colSpan={2} style={{ padding: "9px 10px", color: "#ffcdd2", fontSize: 12 }}>+12 mo</td>
                    <td style={{ padding: "9px 10px", color: "#ffcdd2", fontSize: 12, fontWeight: 700 }}>{formatDate(dlpMinEnd)}</td>
                    <td style={{ padding: "9px 10px", color: "#ffcdd2", fontSize: 12, fontWeight: 700 }}>{formatDate(dlpMaxEnd)}</td>
                    <td style={{ padding: "9px 10px" }} />
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SmartSelector({ sel, updateSel, onSelect, onValueChange }) {
  const { value, type, hasLTA, hasFixedLTA, isDirect, recommendation, hint } = sel;

  function procDuration(key) {
    const p = PROCESSES[key];
    if (!p) return null;
    const mn = p.steps.reduce((s, st) => s + st.minDays, 0);
    const mx = p.steps.reduce((s, st) => s + st.maxDays, 0);
    return `${mn}–${mx} working days`;
  }

  function recommend() {
    const v = parseFloat(value);
    if (isDirect) {
      updateSel({ hint: null, recommendation: {
        key: "direct_procurement",
        reason: "Direct Procurement (single-source) is selected. This method is only permitted as a justified exception with a duly approved GRMS PR and documented justification for non-competitive procurement. LPC/RPC/HQPC review thresholds still apply.",
      }});
      return;
    }
    if (hasLTA) {
      if (hasFixedLTA) {
        updateSel({ hint: null, recommendation: {
          key: "lta_fixed",
          reason: "An LTA with fixed unit prices is available. Identify the lowest-priced LTA holder and issue a direct call-off PO — no LPC approval required.",
          alternatives: ["lta_mini"],
        }});
      } else {
        updateSel({ hint: null, recommendation: {
          key: "lta_mini",
          reason: "An LTA without fixed unit prices is available. Run a mini competition among all LTA holders per the applicable SOP. No LPC approval required.",
          alternatives: ["lta_fixed"],
        }});
      }
      return;
    }
    if (type === 'works') {
      const reason = isNaN(v)
        ? "Works / construction procurement always uses an ITB with a lump sum contract. Value is not required to determine the method. Ensure all legal authorizations, CSLI clearance, and Technical Dossier are in place before issuing the ITB."
        : `Value USD ${v.toLocaleString()} for works/construction requires a public ITB with a lump sum contract. Technical Dossier, CSLI clearance, and Resident Engineer must be in place before the ITB is issued. LPC review is mandatory.`;
      updateSel({ hint: null, recommendation: { key: "itb_works", reason }});
      return;
    }
    if (isNaN(v) || v < 0) {
      updateSel({ hint: "Please enter an estimated value, or select a special case (LTA or Direct Procurement).", recommendation: null });
      return;
    }
    updateSel({ hint: null });
    if (v < 1000) {
      updateSel({ recommendation: { key: "very_low", reason: `Value USD ${v.toLocaleString()} qualifies for a Very Low Value simplified purchase. Direct award with budget holder approval — no formal solicitation required.` }});
    } else if (v < 5000) {
      updateSel({ recommendation: { key: "micro", reason: `Value USD ${v.toLocaleString()} falls in the Micro Purchasing range (USD 1,000 – < 5,000). At least 3 sources must be solicited and a Canvassing Form prepared.` }});
    } else if (v < 25000) {
      updateSel({ recommendation: { key: "rfq", reason: `Value USD ${v.toLocaleString()} requires a formal Request for Quotation (USD 5,000 – < 25,000). Minimum 3 vendors via UNGM or FAOUA-tender email.` }});
    } else if (type === "goods") {
      updateSel({ recommendation: { key: "itb", reason: `Value USD ${v.toLocaleString()} for goods requires a public Invitation to Bid (ITB). Award to lowest compliant bid. LPC review is mandatory.`, alternatives: ["direct_procurement"] }});
    } else {
      updateSel({ recommendation: { key: "rfp", reason: `Value USD ${v.toLocaleString()} for services/complex procurement requires a public Request for Proposal (RFP). Two-envelope process with LPC ex-ante review.`, alternatives: ["direct_procurement"] }});
    }
  }

  const typeBtn = (v, label) => ({
    border: "2px solid", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    borderColor: type === v ? "#005f92" : "#cdd5e0",
    background: type === v ? "#e3f4fd" : "#fff",
    color: type === v ? "#005f92" : "#555",
  });

  const toggleBtn = (active, activeColor, activeBg) => ({
    border: "2px solid", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    borderColor: active ? activeColor : "#cdd5e0",
    background: active ? activeBg : "#fff",
    color: active ? activeColor : "#555",
  });

  return (
    <div className="card" style={{ maxWidth: 700, margin: "0 auto 28px", padding: "28px 32px", borderTop: "4px solid #005f92" }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 20, marginBottom: 6, color: "#1a2e44" }}>
        🔍 Find the right procurement method
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: "#666", marginBottom: 24 }}>
        Enter the estimated value and type to get a recommendation
      </div>

      {/* Row 1: Value + Type */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ flex: "1 1 180px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Estimated Value (USD)</div>
          <input
            type="number" min="0" placeholder="e.g. 15,000"
            value={value}
            onChange={e => { updateSel({ value: e.target.value, recommendation: null, hint: null }); onValueChange?.(parseFloat(e.target.value) || null); }}
            onKeyDown={e => e.key === "Enter" && recommend()}
            style={{ border: "1.5px solid #cdd5e0", borderRadius: 8, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", width: "100%" }}
          />
        </div>
        <div style={{ flex: "2 1 280px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Type</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["goods", "📦 Goods"], ["services", "🔧 Services"], ["works", "🏗 Works"]].map(([v, label]) => (
              <button key={v} style={typeBtn(v)} onClick={() => { updateSel({ type: v, recommendation: null, hint: null }); }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Special cases */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Existing LTA?</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => updateSel({ hasLTA: !hasLTA, hasFixedLTA: false, isDirect: false, recommendation: null, hint: null })}
              style={toggleBtn(hasLTA, "#0277bd", "#e3f4fd")}>{hasLTA ? "✓ Yes" : "No"}</button>
            {hasLTA && (
              <>
                <span style={{ fontSize: 12, color: "#555" }}>Fixed unit prices in LTA?</span>
                <button onClick={() => updateSel({ hasFixedLTA: !hasFixedLTA, recommendation: null, hint: null })}
                  style={toggleBtn(hasFixedLTA, "#0277bd", "#e3f4fd")}>{hasFixedLTA ? "✓ Yes" : "No"}</button>
              </>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Direct / Single Source?</div>
          <button onClick={() => updateSel({ isDirect: !isDirect, hasLTA: false, hasFixedLTA: false, recommendation: null, hint: null })}
            style={toggleBtn(isDirect, "#546e7a", "#eceff1")}>{isDirect ? "✓ Yes" : "No"}</button>
        </div>
      </div>

      {/* Find button */}
      <div style={{ textAlign: "center", marginBottom: hint || recommendation ? 20 : 0 }}>
        <button onClick={recommend}
          style={{ background: "#005f92", color: "#fff", border: "none", borderRadius: 8, padding: "11px 36px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Find Method →
        </button>
      </div>

      {/* Hint */}
      {hint && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#795548", textAlign: "center" }}>
          ⚠️ {hint}
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div style={{ borderTop: "1px solid #e0e6ef", paddingTop: 18 }}>
          <div style={{ fontSize: 13, color: "#444", marginBottom: 14, lineHeight: 1.65 }}>{recommendation.reason}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#444" }}>Recommended:</span>
            <button
              onClick={() => onSelect(recommendation.key, parseFloat(value) || null)}
              style={{ background: PROCESSES[recommendation.key]?.color, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {PROCESSES[recommendation.key]?.label} &nbsp;·&nbsp; {procDuration(recommendation.key)} →
            </button>
            {recommendation.alternatives?.length > 0 && (
              <>
                <span style={{ fontSize: 12, color: "#888" }}>or:</span>
                {recommendation.alternatives.map(k => (
                  <button key={k} onClick={() => onSelect(k, parseFloat(value) || null)}
                    style={{ background: "#fff", color: PROCESSES[k]?.color, border: `2px solid ${PROCESSES[k]?.color}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {PROCESSES[k]?.label} &nbsp;·&nbsp; {procDuration(k)}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──

export default function App() {
  const [selected, setSelected] = useState(null);
  const [prDate, setPrDate] = useState("");
  const [desiredPoDate, setDesiredPoDate] = useState("");
  const [desiredDeliveryDate, setDesiredDeliveryDate] = useState("");
  const [view, setView] = useState("overview");
  const [activeMods, setActiveMods] = useState([]);
  const [deliveryWeeks, setDeliveryWeeks] = useState(0);
  const [estimatedValue, setEstimatedValue] = useState(null);
  const [sel, setSel] = useState({ value: "", type: "goods", hasLTA: false, hasFixedLTA: false, isDirect: false, recommendation: null, hint: null });
  const updateSel = patch => setSel(s => ({ ...s, ...patch }));
  const { holidays, loading: holidaysLoading, error: holidaysError } = useHolidays();

  const proc = selected ? PROCESSES[selected] : null;
  const isWorks = selected === 'itb_works';

  const applicableMods = selected ? MODIFIERS.filter(m => {
    if (!m.applicable.includes(selected)) return false;
    if (estimatedValue !== null && !isNaN(estimatedValue)) {
      if (m.minValue !== undefined && estimatedValue < m.minValue) return false;
      if (m.maxValue !== undefined && estimatedValue > m.maxValue) return false;
    }
    return true;
  }) : [];
  const effectiveActiveMods = activeMods.filter(key => applicableMods.some(m => m.key === key));

  const steps = selected ? buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS) : [];
  const timeline = steps.length && prDate ? computeTimeline(steps, prDate, holidays) : [];

  const totalMinDays = steps.reduce((s, st) => s + st.minDays, 0);
  const totalMaxDays = steps.reduce((s, st) => s + st.maxDays, 0);

  const minPoDate = timeline.length ? timeline[timeline.length - 1].minEnd : null;
  const maxPoDate = timeline.length ? timeline[timeline.length - 1].maxEnd : null;

  // Delivery dates: for works = calendar months; for others = calendar weeks
  const minDeliveryDate = (deliveryWeeks > 0 && minPoDate)
    ? isWorks
      ? (() => { const d = new Date(minPoDate); d.setMonth(d.getMonth() + deliveryWeeks); return d; })()
      : new Date(minPoDate.getTime() + deliveryWeeks * 7 * 86400000)
    : null;
  const maxDeliveryDate = (deliveryWeeks > 0 && maxPoDate)
    ? isWorks
      ? (() => { const d = new Date(maxPoDate); d.setMonth(d.getMonth() + deliveryWeeks); return d; })()
      : new Date(maxPoDate.getTime() + deliveryWeeks * 7 * 86400000)
    : null;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  function calcStatus(minDate, maxDate, targetDate) {
    if (!targetDate || !minDate || !maxDate) return null;
    const de = new Date(targetDate); de.setHours(0, 0, 0, 0);
    const minD = new Date(minDate); minD.setHours(0, 0, 0, 0);
    const maxD = new Date(maxDate); maxD.setHours(0, 0, 0, 0);
    if (maxD <= de) return { type: 'ok' };
    if (minD <= de) return { type: 'risk' };
    return { type: 'late' };
  }

  // When no desired PO date and no delivery period, use desired delivery date as the PO target
  const effectivePoTarget = desiredPoDate || (deliveryWeeks === 0 ? desiredDeliveryDate : "");

  const poStatus = calcStatus(minPoDate, maxPoDate, effectivePoTarget);
  const deliveryStatus = deliveryWeeks > 0 ? calcStatus(minDeliveryDate, maxDeliveryDate, desiredDeliveryDate) : null;

  // Latest PR approval dates — for PO target
  const latestPRSafe = effectivePoTarget && totalMaxDays > 0 ? subtractWorkingDays(new Date(effectivePoTarget), totalMaxDays, holidays) : null;
  const latestPRPossible = effectivePoTarget && totalMinDays > 0 ? subtractWorkingDays(new Date(effectivePoTarget), totalMinDays, holidays) : null;
  // Latest PR approval dates — for delivery target
  const latestPRDeliverySafe = desiredDeliveryDate && totalMaxDays > 0 && deliveryWeeks > 0
    ? (() => {
        const base = new Date(desiredDeliveryDate);
        if (isWorks) base.setMonth(base.getMonth() - deliveryWeeks);
        else base.setTime(base.getTime() - deliveryWeeks * 7 * 86400000);
        return subtractWorkingDays(base, totalMaxDays, holidays);
      })()
    : null;
  const latestPRDeliveryPossible = desiredDeliveryDate && totalMinDays > 0 && deliveryWeeks > 0
    ? (() => {
        const base = new Date(desiredDeliveryDate);
        if (isWorks) base.setMonth(base.getMonth() - deliveryWeeks);
        else base.setTime(base.getTime() - deliveryWeeks * 7 * 86400000);
        return subtractWorkingDays(base, totalMinDays, holidays);
      })()
    : null;

  function toggleMod(key) {
    setActiveMods(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  }

  function selectProcess(key, value) {
    setSelected(key);
    setActiveMods([]);
    setDeliveryWeeks(0);
    setDesiredPoDate("");
    setDesiredDeliveryDate("");
    setView("overview");
    if (value !== undefined) setEstimatedValue(value);
  }

  // Print timestamp for print-only block
  const printTimestamp = new Date().toLocaleString('en-GB');
  const showTimeline = timeline.length > 0 && !!prDate && !!desiredDeliveryDate;

  return (
    <div className="app-wrapper">

      {/* HEADER */}
      <div className="app-header">
        <div className="app-header-inner">
          <img
            src="https://www.fao.org/images/corporatelibraries/fao-logo/fao-logo-en.svg"
            alt="FAO Logo"
            style={{ height: 34, width: "auto", filter: "brightness(0) invert(1)" }}
            onError={e => { e.target.style.display = "none"; }}
          />
          <div>
            <div className="app-header-subtitle">Food and Agriculture Organization of the United Nations</div>
            <div className="app-header-title">Procurement Timeline Estimator</div>
            <div className="app-header-org">FAO Ukraine Country Office (FAOUA) · Based on Manual Section 502 &amp; FAOUA SOPs</div>
            <div style={{ marginTop: 3, fontSize: 10, opacity: 0.75 }}>
              {holidaysLoading ? "⏳ Loading UA holidays…" : holidaysError ? "⚠️ Holidays unavailable (weekends only)" : `✓ UA public holidays loaded (${holidays.size} days)`}
            </div>
          </div>
        </div>
      </div>

      <div className="app-content">

        {/* HOME */}
        {!selected && (
          <>
            <SmartSelector sel={sel} updateSel={updateSel} onSelect={selectProcess} onValueChange={v => setEstimatedValue(v)} />

            <div className="card" style={{ padding: 17 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 9 }}>📋 Quick Reference — FAOUA Thresholds &amp; Methods (PR → PO)</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f0f4f8" }}>
                      {["Method", "Value Range", "Award Basis", "Review Required", "PR → PO Duration"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {QUICK_REF.map(([m, v, a, c, d], i) => (
                      <tr key={m} style={{ borderTop: "1px solid #eee", background: i % 2 ? "#fafbfc" : "#fff" }}>
                        <td style={{ padding: "7px 10px", fontWeight: 600 }}>{m}</td>
                        <td style={{ padding: "7px 10px" }}>{v}</td>
                        <td style={{ padding: "7px 10px" }}>{a}</td>
                        <td style={{ padding: "7px 10px" }}>{c}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 700, color: FAO_BLUE }}>{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 14, padding: "13px 16px", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 9, fontSize: 12, color: "#5d4037", lineHeight: 1.7 }}>
              <strong>⚠️ About the min–max ranges:</strong> The durations shown represent the <strong>theoretical best case (min)</strong> and <strong>realistic worst case (max)</strong> under normal operating conditions. In practice, the minimum range assumes immediate availability of all stakeholders, no revision cycles, and zero queue time — conditions that are rarely met during periods of <strong>high workload</strong>. Requisitioners should plan against the <strong>maximum range</strong> and treat the minimum as an optimistic scenario only achievable under low-workload conditions with full stakeholder availability. When in doubt, add buffer time beyond the maximum.
            </div>
          </>
        )}

        {/* DETAIL */}
        {selected && proc && (
          <>
            {/* Print-only header */}
            <div className="print-only" style={{ marginBottom: 16, padding: "12px 16px", background: "#f4f7fa", borderRadius: 8, border: "1px solid #e0e6ef" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: FAO_DARK, marginBottom: 4 }}>{proc.label}</div>
              <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7 }}>
                <div>PR Approval Date: <strong>{prDate ? formatDate(new Date(prDate)) : "—"}</strong></div>
                <div>{isWorks ? "Earliest Contract Signature" : "Earliest PO"}: <strong>{minPoDate ? formatDate(minPoDate) : "—"}</strong> &nbsp;|&nbsp; {isWorks ? "Latest Contract Signature" : "Latest PO"}: <strong>{maxPoDate ? formatDate(maxPoDate) : "—"}</strong></div>
                {desiredPoDate && <div>{isWorks ? "Desired Contract Signature Date" : "Desired PO Date"}: <strong>{formatDate(new Date(desiredPoDate))}</strong></div>}
                {deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate && (
                  isWorks ? (
                    <>
                      <div>Construction Period: <strong>{deliveryWeeks} month{deliveryWeeks !== 1 ? "s" : ""}</strong> | Works Completion: <strong>{formatDate(minDeliveryDate)}</strong> – <strong>{formatDate(maxDeliveryDate)}</strong></div>
                      {(() => {
                        const dlpMinEnd = new Date(minDeliveryDate); dlpMinEnd.setMonth(dlpMinEnd.getMonth() + 12);
                        const dlpMaxEnd = new Date(maxDeliveryDate); dlpMaxEnd.setMonth(dlpMaxEnd.getMonth() + 12);
                        return <div>DLP End (Project Close): <strong>{formatDate(dlpMinEnd)}</strong> – <strong>{formatDate(dlpMaxEnd)}</strong></div>;
                      })()}
                    </>
                  ) : (
                    <div>Expected Delivery: <strong>{formatDate(minDeliveryDate)}</strong> – <strong>{formatDate(maxDeliveryDate)}</strong></div>
                  )
                )}
                {desiredDeliveryDate && <div>Desired {isWorks ? "Works Completion" : "Delivery"} Date: <strong>{formatDate(new Date(desiredDeliveryDate))}</strong></div>}
                <div style={{ marginTop: 4, color: "#888", fontSize: 11 }}>Printed: {printTimestamp}</div>
              </div>
            </div>

            {/* Nav bar */}
            <div className="detail-nav no-print">
              <button className="btn" style={{ borderColor: proc.color, color: proc.color }} onClick={() => setSelected(null)}>← Back</button>
              <div className="detail-nav-title" style={{ color: proc.color }}>{proc.label}</div>
              <div className="detail-nav-actions">
                {["overview", "timeline"].map(v => (
                  <button
                    key={v}
                    className="btn"
                    style={{
                      background: view === v ? proc.color : "#fff",
                      color: view === v ? "#fff" : proc.color,
                      borderColor: proc.color,
                    }}
                    onClick={() => setView(v)}
                  >
                    {v === "overview" ? "📋 Steps" : "📅 Gantt"}
                  </button>
                ))}
                <button className="btn-print" onClick={() => window.print()}>🖨 Print / Save PDF</button>
              </div>
            </div>

            {/* Date inputs */}
            <div className="card no-print" style={{ padding: "14px 16px", marginBottom: 14 }}>
              {!showTimeline && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f0f7ff", borderRadius: 7, border: "1px dashed #90c4e8", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>Enter dates to generate the timeline:</span>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: prDate ? "#e8f5e9" : "#fff", border: `1.5px solid ${prDate ? "#43a047" : "#b0bec5"}`, color: prDate ? "#2e7d32" : "#888", fontWeight: 600 }}>
                    {prDate ? "✓" : "○"} PR Approval Date
                  </span>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: desiredDeliveryDate ? "#e8f5e9" : "#fff", border: `1.5px solid ${desiredDeliveryDate ? "#43a047" : "#b0bec5"}`, color: desiredDeliveryDate ? "#2e7d32" : "#888", fontWeight: 600 }}>
                    {desiredDeliveryDate ? "✓" : "○"} {isWorks ? "Desired Works Completion Date" : "Desired Delivery Date"}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                {/* PR date */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#444" }}>📅 PR Approval Date</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={prDate} onChange={e => setPrDate(e.target.value)}
                      style={{ border: "1px solid #cdd5e0", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }} />
                    {prDate && <button onClick={() => setPrDate("")} style={{ fontSize: 11, color: "#fff", background: "#b0bec5", border: "none", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>✕</button>}
                  </div>
                </div>
                {/* Desired PO / Contract date */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#444" }}>🎯 {isWorks ? "Desired Contract Signature Date" : "Desired PO Issuance Date"} <span style={{ fontWeight: 400, color: "#888", fontSize: 11 }}>(optional)</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={desiredPoDate} onChange={e => setDesiredPoDate(e.target.value)}
                      style={{ border: "1px solid #cdd5e0", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }} />
                    {desiredPoDate && <button onClick={() => setDesiredPoDate("")} style={{ fontSize: 11, color: "#fff", background: "#b0bec5", border: "none", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>✕</button>}
                  </div>
                </div>
                {/* Desired delivery / completion date */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#444" }}>{isWorks ? "🏗 Desired Works Completion Date" : "🚚 Desired Delivery Date"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={desiredDeliveryDate} onChange={e => setDesiredDeliveryDate(e.target.value)}
                      style={{ border: "1px solid #cdd5e0", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }} />
                    {desiredDeliveryDate && <button onClick={() => setDesiredDeliveryDate("")} style={{ fontSize: 11, color: "#fff", background: "#b0bec5", border: "none", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>✕</button>}
                  </div>
                </div>
                {/* Reset All */}
                <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
                  <button
                    onClick={() => { setPrDate(""); setDesiredPoDate(""); setDesiredDeliveryDate(""); }}
                    style={{ fontSize: 11, color: "#fff", background: "#78909c", border: "none", borderRadius: 5, padding: "5px 11px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
                  >↺ Reset All Dates</button>
                </div>
              </div>
            </div>

            {/* Delivery picker */}
            <DeliveryPicker deliveryWeeks={deliveryWeeks} onChange={setDeliveryWeeks} procColor={proc.color} isWorks={isWorks} />

            {/* PO / Contract Status Banner */}
            <StatusBanner
              label={isWorks ? "Contract Signature" : "PO Issuance"}
              status={poStatus}
              minDate={minPoDate}
              maxDate={maxPoDate}
              desiredDate={effectivePoTarget}
              latestPRSafe={latestPRSafe}
              latestPRPossible={latestPRPossible}
              holidays={holidays}
            />

            {/* Delivery / Works Completion Status Banner */}
            {deliveryWeeks > 0 && (
              <StatusBanner
                label={isWorks ? "Works Completion" : "Delivery"}
                status={deliveryStatus}
                minDate={minDeliveryDate}
                maxDate={maxDeliveryDate}
                desiredDate={desiredDeliveryDate}
                latestPRSafe={latestPRDeliverySafe}
                latestPRPossible={latestPRDeliveryPossible}
                holidays={holidays}
              />
            )}

            {/* Modifiers */}
            {applicableMods.length > 0 && (
              <div className="modifiers-box no-print">
                <div className="modifiers-title">
                  ⚙️ Additional Circumstances — check all that apply:
                  {estimatedValue !== null && !isNaN(estimatedValue) && (
                    <span style={{ fontWeight: 400, fontSize: 11, color: "#888", marginLeft: 8 }}>
                      (filtered for USD {estimatedValue.toLocaleString()})
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {applicableMods.map(mod => (
                    <label key={mod.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={effectiveActiveMods.includes(mod.key)}
                        onChange={() => toggleMod(mod.key)}
                        style={{ marginTop: 2, accentColor: proc.color, width: 14, height: 14 }}
                      />
                      <span>
                        <strong>{mod.label}</strong>
                        <span style={{ color: "#888", marginLeft: 6 }}>
                          (+{mod.minDays}–{mod.maxDays} working days)
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline summary banner */}
            {showTimeline && (
              <div style={{ background: proc.color, borderRadius: 10, padding: "14px 20px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 0, justifyContent: "center" }}>
                {/* PO / Contract */}
                <div style={{ textAlign: "center", padding: "4px 24px", borderRight: deliveryWeeks > 0 && minDeliveryDate ? `1px solid rgba(255,255,255,0.3)` : "none" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    {isWorks ? "Estimated Contract Signature" : "Estimated PO Issuance"}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                    {minPoDate ? formatDate(minPoDate) : "—"} – {maxPoDate ? formatDate(maxPoDate) : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
                    {totalMinDays}–{totalMaxDays} working days from PR approval
                  </div>
                </div>
                {/* Delivery / completion */}
                {deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate && (
                  <div style={{ textAlign: "center", padding: "4px 24px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      {isWorks ? "Estimated Works Completion" : "Estimated Delivery"}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                      {formatDate(minDeliveryDate)} – {formatDate(maxDeliveryDate)}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
                      {deliveryWeeks} {isWorks ? `month${deliveryWeeks !== 1 ? "s" : ""} construction` : `week${deliveryWeeks !== 1 ? "s" : ""} delivery`} after {isWorks ? "contract signature" : "PO"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Steps table */}
            {view === "overview" && showTimeline && (
              <StepsTable
                timeline={timeline}
                proc={proc}
                activeMods={effectiveActiveMods}
                totalMinDays={totalMinDays}
                totalMaxDays={totalMaxDays}
                minPoDate={minPoDate}
                maxPoDate={maxPoDate}
                deliveryWeeks={deliveryWeeks}
                minDeliveryDate={minDeliveryDate}
                maxDeliveryDate={maxDeliveryDate}
                isWorks={isWorks}
              />
            )}

            {/* Gantt Chart */}
            {view === "timeline" && showTimeline && (
              <div className="card">
                <div className="card-header" style={{ background: proc.color }}>
                  📅 Indicative Calendar — Approved PR → PO Issuance
                </div>
                <div style={{ padding: 15 }}>
                  <GanttChart
                    timeline={timeline}
                    proc={proc}
                    prDate={prDate}
                    desiredDate={effectivePoTarget}
                    deliveryWeeks={deliveryWeeks}
                    minDeliveryDate={minDeliveryDate}
                    maxDeliveryDate={maxDeliveryDate}
                    activeMods={effectiveActiveMods}
                    MODIFIERS={MODIFIERS}
                    status={poStatus}
                  />
                  <div style={{ marginTop: 8, padding: "8px 11px", background: "#fffde7", borderRadius: 7, fontSize: 11, color: "#795548", border: "1px solid #ffe082" }}>
                    ⚠️ Dates are indicative (working days, Mon–Fri). LPC/RPC meetings depend on quorum. Delivery period is not included in PO timeline.
                  </div>
                </div>
              </div>
            )}

            {/* Fallback if no prDate */}
            {!prDate && (
              <div style={{ background: "#fff3e0", border: "1px solid #ffb300", borderRadius: 9, padding: "12px 16px", fontSize: 13, color: "#e65100" }}>
                ⚠️ Please enter a PR Approval Date above to see the timeline.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
