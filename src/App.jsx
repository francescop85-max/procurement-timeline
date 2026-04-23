import { useState, useEffect, useRef } from "react";
import "./App.css";
import { PROCESSES, MODIFIERS, QUICK_REF, FAO_DARK, FAO_BLUE } from "./data";
import { toISO, formatDate, buildSteps, computeTimeline, computeTrackingTimeline, computeOverallStatus, subtractWorkingDays, countWorkingDays, addWorkingDays, encodePlanToHash, decodePlanFromHash, derivePlanId } from "./utils";
import GanttChart from "./components/GanttChart";
import { useHolidays } from "./hooks/useHolidays";
import { useActuals } from "./hooks/useActuals";
import MonitorHeader from "./components/MonitorHeader";
import ShareMonitorButton from "./components/ShareMonitorButton";
import { useMonitoredPlans } from "./hooks/useMonitoredPlans";

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
        {minDays}–{maxDays} working days
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

  const badgeClass = `status-badge status-badge-${status.type}`;
  const badgeIcon = status.type === 'ok' ? '✓' : status.type === 'risk' ? '!' : '✗';

  if (status.type === 'ok') {
    const bufferDays = desired && maxDate ? countWorkingDays(maxDate, desired, holidays) : 0;
    return (
      <div className="status-banner status-banner-ok">
        <div className="status-banner-header">
          <div className={badgeClass}>{badgeIcon}</div>
          <div style={{ flex: 1 }}>
            <div className="status-banner-title" style={{ color: "#16a34a" }}>{label}: On track</div>
            <div className="status-banner-body">
              Estimated: <strong>{minDate ? formatDate(minDate) : "—"}</strong> – <strong>{maxDate ? formatDate(maxDate) : "—"}</strong>
              <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
              Buffer: <strong>{bufferDays} working day{bufferDays !== 1 ? "s" : ""}</strong> before deadline of <strong>{formatDate(desired)}</strong>
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
          <div className={badgeClass}>{badgeIcon}</div>
          <div style={{ flex: 1 }}>
            <div className="status-banner-title" style={{ color: "#d97706" }}>{label}: At risk</div>
            <div className="status-banner-body">
              Best case: <strong>{minDate ? formatDate(minDate) : "—"}</strong> ✓
              <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
              Worst case: <strong>{maxDate ? formatDate(maxDate) : "—"}</strong> ✗
              <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
              Deadline: <strong>{formatDate(desired)}</strong>
            </div>
          </div>
        </div>
        {(latestPRSafe || latestPRPossible) && (
          <div className="status-latest-pr">
            <strong style={{ color: "#92400e" }}>Latest safe PR approval:</strong>{" "}
            <strong className="mono" style={{ color: "#b45309" }}>{latestPRSafe ? formatDate(latestPRSafe) : "—"}</strong>
            <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
            <strong style={{ color: "#92400e" }}>Absolute latest:</strong>{" "}
            <strong className="mono" style={{ color: "#b45309" }}>{latestPRPossible ? formatDate(latestPRPossible) : "—"}</strong>
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
        <div className={badgeClass}>{badgeIcon}</div>
        <div style={{ flex: 1 }}>
          <div className="status-banner-title" style={{ color: "#dc2626" }}>
            {label}: Late by {delay} working day{delay !== 1 ? "s" : ""}
          </div>
          <div className="status-banner-body">
            Best case: <strong>{minDate ? formatDate(minDate) : "—"}</strong>
            <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
            Deadline: <strong>{desired ? formatDate(desired) : "—"}</strong>
          </div>
        </div>
      </div>
      {latestPRPossible && (
        <div className="status-latest-pr">
          <div>
            <strong style={{ color: "#92400e" }}>Latest possible PR approval:</strong>{" "}
            <strong className="mono" style={{ color: "#b45309" }}>{formatDate(latestPRPossible)}</strong>
            {possibleAlreadyPassed && <span style={{ color: "#dc2626", marginLeft: 8, fontWeight: 600 }}>Already passed</span>}
          </div>
          {latestPRSafe && (
            <div style={{ marginTop: 4 }}>
              For a safe process: <strong className="mono" style={{ color: "#b45309" }}>PR approved by {formatDate(latestPRSafe)}</strong>
              {safeAlreadyPassed && <span style={{ color: "#dc2626", marginLeft: 8, fontWeight: 600 }}>Already passed</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_BADGE = {
  not_started: null,
  in_progress: { label: "Active",   bg: "#dbeafe", color: "#1d4ed8" },
  overdue:     { label: "Overdue",  bg: "#fef3c7", color: "#92400e" },
  on_time:     { label: "Done",     bg: "#dcfce7", color: "#15803d" },
  late:        { label: "Late",     bg: "#fee2e2", color: "#b91c1c" },
};

const ROW_TINT = {
  not_started: undefined,
  in_progress: undefined,
  overdue:     "#fffbeb",
  on_time:     "#f0fdf4",
  late:        "#fef2f2",
};

function StepsTable({ timeline, proc, activeMods, totalMinDays, totalMaxDays, minPoDate, maxPoDate, deliveryWeeks, minDeliveryDate, maxDeliveryDate, isWorks, actuals, onActualChange, trackingMode }) {
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const toggleNote = (i) => setExpandedNotes(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });
  const headerSuffix = isWorks
    ? (deliveryWeeks > 0 ? " → Contract → Construction → DLP" : " → Contract Signature")
    : (deliveryWeeks > 0 ? " → Delivery" : "");
  const totalRowLabel = isWorks ? "TOTAL (PR → Contract)" : "TOTAL (PR → PO)";

  function getStepStatus(step, i) {
    const actual = actuals?.[i];
    if (actual?.actualEnd) {
      const actualDate = new Date(actual.actualEnd);
      return actualDate <= step._originalMaxEnd ? 'on_time' : 'late';
    }
    if (today <= step.minEnd) return 'not_started';
    if (today <= step.maxEnd) return 'in_progress';
    return 'overdue';
  }

  return (
    <div className="card">
      <div className="card-header" style={{ background: proc.color }}>
        Process Steps — Approved PR → {isWorks ? "Contract Signature" : "PO Issuance"}{headerSuffix}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="steps-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Phase</th>
              <th>Responsible</th>
              <th style={{ width: 52 }}>Min</th>
              <th style={{ width: 52 }}>Max</th>
              <th style={{ width: 100 }}>Earliest</th>
              <th style={{ width: 100 }}>Latest</th>
              {trackingMode && <th style={{ width: 110 }}>Actual</th>}
              {trackingMode && <th style={{ width: 80 }}>Status</th>}
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((step, i) => {
              const isExtra = activeMods.some(k => {
                const m = MODIFIERS.find(md => md.key === k);
                return m && m.addStep && m.addStep.name === step.name;
              });
              const isLast = i === timeline.length - 1;
              const hasNotes = !!step.notes;
              const notesOpen = expandedNotes.has(i);
              const stepStatus = trackingMode ? getStepStatus(step, i) : null;
              const rowTint = trackingMode && stepStatus ? ROW_TINT[stepStatus] : null;
              const badge = stepStatus ? STATUS_BADGE[stepStatus] : null;
              const actualVal = actuals?.[i]?.actualEnd ?? "";
              return (
                <tr key={i} style={{ background: rowTint ?? (isLast ? "#f5f0ff" : isExtra ? "#fffbeb" : i % 2 ? "#fafbfc" : "#fff") }}>
                  <td style={{ color: proc.color, fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 11 }}>{i + 1}</td>
                  <td style={{ fontWeight: isLast ? 700 : 500 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span>
                        {isExtra && <span style={{ color: "#d97706", marginRight: 4, fontSize: 10 }}>+</span>}
                        {step.name}
                      </span>
                      {hasNotes && notesOpen && (
                        <span style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, paddingTop: 4, borderTop: "1px dashed #e5e7eb" }}>{step.notes}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "#6b7280", fontSize: 11 }}>{step.owner}</td>
                  <td><span className="day-badge day-badge-min">{step.minDays}d{step.calendarDays && <span style={{ fontSize: 9, marginLeft: 1, opacity: 0.7 }}>c</span>}</span></td>
                  <td><span className="day-badge day-badge-max">{step.maxDays}d{step.calendarDays && <span style={{ fontSize: 9, marginLeft: 1, opacity: 0.7 }}>c</span>}</span></td>
                  <td className="date-cell">{formatDate(step.minEnd)}</td>
                  <td className="date-cell" style={{ fontWeight: isLast ? 700 : 400, color: isLast ? proc.color : undefined }}>{formatDate(step.maxEnd)}</td>
                  {trackingMode && (
                    <td>
                      <input
                        type="date"
                        value={actualVal}
                        max={new Date().toLocaleDateString('sv')}
                        onChange={e => onActualChange(i, e.target.value ? { actualEnd: e.target.value } : null)}
                        style={{ border: "1.5px solid var(--border)", borderRadius: 4, padding: "3px 6px", fontSize: 11, fontFamily: "var(--font-mono)", width: 108 }}
                      />
                    </td>
                  )}
                  {trackingMode && (
                    <td>
                      {badge && (
                        <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                  )}
                  <td>{hasNotes && <button className="notes-toggle" onClick={() => toggleNote(i)} title={step.notes}>{notesOpen ? '−' : 'i'}</button>}</td>
                </tr>
              );
            })}
            {/* Subtotal row */}
            <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
              <td colSpan={3} style={{ textAlign: "right", fontSize: 12, letterSpacing: "-0.2px" }}>{totalRowLabel}</td>
              <td><span className="day-badge day-badge-min">{totalMinDays}d</span></td>
              <td><span className="day-badge day-badge-max">{totalMaxDays}d</span></td>
              <td className="date-cell" style={{ color: proc.color, fontWeight: 700 }}>{minPoDate ? formatDate(minPoDate) : "—"}</td>
              <td className="date-cell" style={{ color: proc.color, fontWeight: 700 }}>{maxPoDate ? formatDate(maxPoDate) : "—"}</td>
              {trackingMode && <td />}
              {trackingMode && <td />}
              <td />
            </tr>
            {/* Delivery / Construction row */}
            {deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate && (
              isWorks ? (
                <tr style={{ background: "#faf5f0", borderTop: "2px solid #d6bcab" }}>
                  <td style={{ color: "#78350f", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 11 }}>C</td>
                  <td style={{ fontWeight: 700, color: "#78350f" }}>Construction Execution Period</td>
                  <td style={{ color: "#6b7280", fontSize: 11 }}>Contractor / Resident Engineer</td>
                  <td><span className="day-badge" style={{ background: "#fef3c7", color: "#92400e" }}>{deliveryWeeks}mo</span></td>
                  <td><span className="day-badge" style={{ background: "#fef3c7", color: "#92400e" }}>{deliveryWeeks}mo</span></td>
                  <td className="date-cell" style={{ fontWeight: 700, color: "#78350f" }}>{formatDate(minPoDate)}</td>
                  <td className="date-cell" style={{ fontWeight: 700, color: "#78350f" }}>{formatDate(maxPoDate)}</td>
                  <td />
                </tr>
              ) : (
                <tr style={{ background: "#eff6ff", borderTop: "2px solid #93c5fd" }}>
                  <td style={{ color: "#1e40af", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 11 }}>D</td>
                  <td style={{ fontWeight: 700, color: "#1e40af" }}>Delivery Period</td>
                  <td style={{ color: "#6b7280", fontSize: 11 }}>Vendor / Supplier</td>
                  <td><span className="day-badge" style={{ background: "#dbeafe", color: "#1e40af" }}>{deliveryWeeks}wk</span></td>
                  <td><span className="day-badge" style={{ background: "#dbeafe", color: "#1e40af" }}>{deliveryWeeks}wk</span></td>
                  <td className="date-cell" style={{ fontWeight: 700, color: "#1e40af" }}>{formatDate(minDeliveryDate)}</td>
                  <td className="date-cell" style={{ fontWeight: 700, color: "#1e40af" }}>{formatDate(maxDeliveryDate)}</td>
                  <td />
                </tr>
              )
            )}
            {/* DLP row — works only */}
            {isWorks && deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate && (() => {
              const dlpMinEnd = new Date(minDeliveryDate); dlpMinEnd.setMonth(dlpMinEnd.getMonth() + 12);
              const dlpMaxEnd = new Date(maxDeliveryDate); dlpMaxEnd.setMonth(dlpMaxEnd.getMonth() + 12);
              return (
                <>
                  <tr style={{ background: "#fdf2f8", borderTop: "1px solid #f9a8d4" }}>
                    <td style={{ color: "#831843", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 11 }}>L</td>
                    <td style={{ fontWeight: 700, color: "#831843" }}>Defects Liability Period (DLP)</td>
                    <td style={{ color: "#6b7280", fontSize: 11 }}>Contract Manager / RE / Contractor</td>
                    <td><span className="day-badge" style={{ background: "#fce7f3", color: "#831843" }}>12mo</span></td>
                    <td><span className="day-badge" style={{ background: "#fce7f3", color: "#831843" }}>12mo</span></td>
                    <td className="date-cell">{formatDate(minDeliveryDate)}</td>
                    <td className="date-cell">{formatDate(maxDeliveryDate)}</td>
                    <td />
                  </tr>
                  <tr style={{ background: "#831843", fontWeight: 700 }}>
                    <td colSpan={3} style={{ textAlign: "right", fontSize: 12, color: "#fff" }}>PROJECT CLOSE (DLP end)</td>
                    <td colSpan={2} style={{ color: "#fda4af", fontSize: 12, fontFamily: "var(--font-mono)" }}>+12mo</td>
                    <td className="date-cell" style={{ color: "#fda4af", fontWeight: 700 }}>{formatDate(dlpMinEnd)}</td>
                    <td className="date-cell" style={{ color: "#fda4af", fontWeight: 700 }}>{formatDate(dlpMaxEnd)}</td>
                    <td />
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

  const typeBtn = (v) => ({
    border: "1.5px solid", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
    borderColor: type === v ? "var(--accent-teal)" : "var(--border)",
    background: type === v ? "#f0fdfa" : "var(--surface)",
    color: type === v ? "var(--accent-teal)" : "var(--text-secondary)",
  });

  const toggleBtn = (active, activeColor, activeBg) => ({
    border: "1.5px solid", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
    borderColor: active ? activeColor : "var(--border)",
    background: active ? activeBg : "var(--surface)",
    color: active ? activeColor : "var(--text-secondary)",
  });

  return (
    <div className="card" style={{ maxWidth: 720, margin: "0 auto 28px", padding: "28px 32px", borderTop: "3px solid var(--accent-teal)" }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 21, marginBottom: 6, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
        Find the right procurement method
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>
        Enter the estimated value and procurement type to get a method recommendation and estimate the length of your procurement process
      </div>

      {/* Row 1: Value + Type */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
        <div style={{ flex: "1 1 180px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Estimated Value (USD)</div>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 15,000"
              value={value ? Number(value).toLocaleString("en-US") : ""}
              onChange={e => {
                // Strip commas/spaces to get raw number string
                const raw = e.target.value.replace(/[,\s]/g, "");
                if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                  updateSel({ value: raw, recommendation: null, hint: null });
                  onValueChange?.(raw ? parseFloat(raw) : null);
                }
              }}
              onKeyDown={e => e.key === "Enter" && recommend()}
              style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 48px 10px 14px", fontSize: 15, fontFamily: "var(--font-mono)", width: "100%", background: "var(--surface-alt)" }}
            />
            {value && !isNaN(parseFloat(value)) && (
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                fontSize: 10, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-body)",
                letterSpacing: 0.5, textTransform: "uppercase", pointerEvents: "none",
              }}>
                {parseFloat(value) >= 1_000_000 ? `${(parseFloat(value) / 1_000_000).toFixed(parseFloat(value) % 1_000_000 === 0 ? 0 : 2)}M`
                  : parseFloat(value) >= 1_000 ? `${(parseFloat(value) / 1_000).toFixed(parseFloat(value) % 1_000 === 0 ? 0 : 1)}K`
                  : ""}
              </span>
            )}
          </div>
        </div>
        <div style={{ flex: "2 1 280px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Type</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["goods", "Goods"], ["services", "Services"], ["works", "Works"]].map(([v, label]) => (
              <button key={v} style={typeBtn(v)} onClick={() => { updateSel({ type: v, recommendation: null, hint: null }); }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Special cases */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 22, paddingTop: 18, borderTop: "1px solid var(--border-light)" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Existing LTA?</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => updateSel({ hasLTA: true, hasFixedLTA: false, isDirect: false, recommendation: null, hint: null })}
              style={toggleBtn(hasLTA, "#0277bd", "#e3f4fd")}>✓ Yes</button>
            <button onClick={() => updateSel({ hasLTA: false, hasFixedLTA: false, recommendation: null, hint: null })}
              style={toggleBtn(!hasLTA, "#78909c", "#eceff1")}>✗ No</button>
            {hasLTA && (
              <>
                <span style={{ fontSize: 12, color: "#555", marginLeft: 4 }}>Fixed unit prices in LTA?</span>
                <button onClick={() => updateSel({ hasFixedLTA: true, recommendation: null, hint: null })}
                  style={toggleBtn(hasFixedLTA, "#0277bd", "#e3f4fd")}>✓ Yes</button>
                <button onClick={() => updateSel({ hasFixedLTA: false, recommendation: null, hint: null })}
                  style={toggleBtn(!hasFixedLTA, "#78909c", "#eceff1")}>✗ No</button>
              </>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Direct / Single Source?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => updateSel({ isDirect: true, hasLTA: false, hasFixedLTA: false, recommendation: null, hint: null })}
              style={toggleBtn(isDirect, "#546e7a", "#eceff1")}>✓ Yes</button>
            <button onClick={() => updateSel({ isDirect: false, recommendation: null, hint: null })}
              style={toggleBtn(!isDirect, "#78909c", "#eceff1")}>✗ No</button>
          </div>
        </div>
      </div>

      {/* Find + Clear buttons */}
      <div style={{ textAlign: "center", display: "flex", gap: 10, justifyContent: "center", marginBottom: hint || recommendation ? 22 : 0 }}>
        <button onClick={recommend}
          style={{ background: "var(--accent-teal)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.2px", transition: "all 0.15s", boxShadow: "0 2px 8px rgba(14,165,160,0.25)" }}>
          Find Method
        </button>
        <button
          onClick={() => updateSel({ value: "", type: "goods", hasLTA: false, hasFixedLTA: false, isDirect: false, recommendation: null, hint: null })}
          style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Clear
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
        <div style={{ background: "var(--surface-alt)", borderRadius: "var(--radius)", padding: "18px 20px", marginTop: 4, border: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.7 }}>{recommendation.reason}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)" }}>Recommended</span>
            <button
              onClick={() => onSelect(recommendation.key, parseFloat(value) || null)}
              style={{ background: PROCESSES[recommendation.key]?.color, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", transition: "all 0.15s" }}>
              {PROCESSES[recommendation.key]?.label} · <span className="mono">{procDuration(recommendation.key)}</span>
            </button>
            {recommendation.alternatives?.length > 0 && (
              <>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>or</span>
                {recommendation.alternatives.map(k => (
                  <button key={k} onClick={() => onSelect(k, parseFloat(value) || null)}
                    style={{ background: "#fff", color: PROCESSES[k]?.color, border: `1.5px solid ${PROCESSES[k]?.color}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                    {PROCESSES[k]?.label} · <span className="mono">{procDuration(k)}</span>
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

// ── Monitored Plans Page ──

function MonitoredPlansPage({ plans, loading, onOpen, onRemove }) {
  const STATUS_CONFIG = {
    on_track:  { bg: "#f0fdf4", color: "#16a34a", label: "On Track" },
    delayed:   { bg: "#fffbeb", color: "#d97706", label: "Delayed" },
    completed: { bg: "#eff6ff", color: "#1d4ed8", label: "Completed" },
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.4px", color: "var(--text-primary)" }}>Monitored Procurements</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
            Click any row to open the live monitoring view for that procurement.
          </div>
        </div>
        {!loading && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {plans.length} {plans.length === 1 ? "plan" : "plans"}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
            No monitored procurements yet.<br />
            <span style={{ fontSize: 12 }}>Go to <strong>Estimator</strong>, configure a timeline, and click <strong>"Share Monitor Link"</strong> to create one.</span>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="steps-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                {["PR Number", "Label", "Process", "PR Date", "Saved", ""].map(h => (
                  <th key={h} style={{ whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map(({ planId, url, snapshot, savedAt }, i) => {
                const proc = PROCESSES[snapshot?.cfg?.selected];
                const prDate = snapshot?.cfg?.prDate ? new Date(snapshot.cfg.prDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                const saved = savedAt ? new Date(savedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                return (
                  <tr
                    key={planId}
                    style={{ cursor: "pointer", background: i % 2 ? "#fafbfc" : "#fff" }}
                    onClick={() => onOpen(url)}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "#fafbfc" : "#fff"}
                  >
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>
                        {snapshot?.prNumber || "—"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {snapshot?.label || <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: proc?.color ?? "#888", display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{proc?.label ?? snapshot?.cfg?.selected?.toUpperCase() ?? "—"}</span>
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{prDate}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{saved}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={e => { e.stopPropagation(); onRemove(planId); }}
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)" }}
                        title="Remove from list"
                      >Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  const [stepOverride, setStepOverride] = useState(null); // null = use defaults
  const [deliveryWeeks, setDeliveryWeeks] = useState(0);
  const [estimatedValue, setEstimatedValue] = useState(null);
  const [sel, setSel] = useState({ value: "", type: "goods", hasLTA: false, hasFixedLTA: false, isDirect: false, recommendation: null, hint: null });
  const updateSel = patch => setSel(s => ({ ...s, ...patch }));
  const { holidays, loading: holidaysLoading, error: holidaysError } = useHolidays();

  // ── Monitored plans list ──
  const { plans: monitoredPlans, loading: plansLoading, savePlan, removePlan } = useMonitoredPlans();
  const [showPlans, setShowPlans] = useState(false);

  // ── Sidebar resize ──
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(null);
  const dragStartWidth = useRef(null);

  function onResizeMouseDown(e) {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    setDragging(true);
    const onMove = ev => {
      const delta = ev.clientX - dragStartX.current;
      setSidebarWidth(Math.min(400, Math.max(140, dragStartWidth.current + delta)));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Tracking / Monitor mode ──
  const [trackingMode, setTrackingMode] = useState(false);
  const [planSnapshot, setPlanSnapshot] = useState(null);
  const planId = planSnapshot ? derivePlanId(planSnapshot.cfg) : null;
  const { actuals, updateActual } = useActuals(planId);

  // Detect #plan= hash on mount and on hash change
  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash;
      const match = hash.match(/^#plan=(.+)$/);
      if (match) {
        const snapshot = decodePlanFromHash(match[1]);
        if (snapshot?.cfg) {
          const cfg = snapshot.cfg;
          setPlanSnapshot(snapshot);
          setSelected(cfg.selected || null);
          setPrDate(cfg.prDate || "");
          setDesiredPoDate(cfg.desiredPoDate || "");
          setDesiredDeliveryDate(cfg.desiredDeliveryDate || "");
          setActiveMods(cfg.activeMods || []);
          setStepOverride(cfg.stepOverride || null);
          setDeliveryWeeks(cfg.deliveryWeeks || 0);
          setEstimatedValue(cfg.estimatedValue ?? null);
          setTrackingMode(true);
          setView("overview");
        }
      } else {
        setTrackingMode(false);
        setPlanSnapshot(null);
      }
    }
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

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

  const steps = selected
    ? (stepOverride ?? buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS))
    : [];
  // Original (planned) timeline — always the baseline
  const originalTimeline = steps.length && prDate ? computeTimeline(steps, prDate, holidays) : [];
  // Tracking timeline — cascades from actuals when in tracking mode
  const timeline = steps.length && prDate
    ? (trackingMode
        // Attach _originalMaxEnd to each step so status calculation can compare
        ? computeTrackingTimeline(
            steps.map((s, i) => ({ ...s, _originalMaxEnd: originalTimeline[i]?.maxEnd })),
            prDate, actuals, holidays
          )
        : originalTimeline)
    : [];

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

  // Overall monitor status (tracking mode only)
  const overallMonitorStatus = (trackingMode && timeline.length && originalTimeline.length)
    ? computeOverallStatus(timeline, originalTimeline, today)
    : null;

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
    setStepOverride(null);
    setDeliveryWeeks(0);
    setDesiredPoDate("");
    setDesiredDeliveryDate("");
    setView("overview");
    if (value !== undefined) setEstimatedValue(value);
  }

  function exitTrackingMode() {
    setTrackingMode(false);
    setPlanSnapshot(null);
    window.location.hash = "";
  }

  // Build the plan config object for ShareMonitorButton
  const currentPlanConfig = selected ? {
    selected,
    prDate,
    activeMods: effectiveActiveMods,
    stepOverride: stepOverride ?? undefined,
    deliveryWeeks,
    estimatedValue,
    desiredPoDate,
    desiredDeliveryDate,
  } : null;

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
            style={{ height: 36, width: "auto", filter: "brightness(0) invert(1)", flexShrink: 0 }}
            onError={e => { e.target.style.display = "none"; }}
          />
          <div>
            <div className="app-header-subtitle">Food and Agriculture Organization of the United Nations</div>
            <div className="app-header-title">Procurement Timeline Estimator</div>
            <div className="app-header-org">FAO Ukraine Country Office (FAOUA) · Manual Section 502 &amp; FAOUA SOPs</div>
            <div style={{ marginTop: 3, fontSize: 10, opacity: 0.6, fontFamily: "var(--font-mono)" }}>
              {holidaysLoading ? "Loading UA holidays…" : holidaysError ? "Holidays unavailable (weekends only)" : `UA public holidays loaded (${holidays.size} days)`}
            </div>
          </div>
          <a
            href="/planner"
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: '#fff',
              opacity: 0.7,
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '3px 10px',
              borderRadius: 3,
              textDecoration: 'none',
              flexShrink: 0,
            }}
            onMouseOver={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseOut={e => { e.currentTarget.style.opacity = '0.7'; }}
          >
            🌱 Agricultural Planner
          </a>
        </div>
      </div>

      {/* BODY — sidebar + main */}
      <div className="app-body" style={{ userSelect: dragging ? "none" : undefined }}>

        {/* ── SIDEBAR ── */}
        <aside className="app-sidebar no-print" style={{ width: sidebarWidth }}>
          {/* Resize handle */}
          <div
            className={`sidebar-resize-handle${dragging ? " dragging" : ""}`}
            onMouseDown={onResizeMouseDown}
          />
          {/* Nav: Estimator */}
          <div className="sidebar-section-title">Tools</div>
          <button
            className={`sidebar-nav-btn${!showPlans ? " active" : ""}`}
            onClick={() => { setShowPlans(false); if (trackingMode) exitTrackingMode(); setSelected(null); }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="16" height="14" rx="2"/><path d="M6 7h8M6 10h8M6 13h5"/></svg>
            Estimator
          </button>

          {/* Nav: Monitored */}
          <button
            className={`sidebar-nav-btn${showPlans ? " active" : ""}`}
            onClick={() => setShowPlans(true)}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></svg>
            Monitored
            {monitoredPlans.length > 0 && (
              <span style={{ marginLeft: "auto", background: "var(--accent-teal)", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                {monitoredPlans.length}
              </span>
            )}
          </button>

        </aside>

        {/* ── MAIN CONTENT ── */}
      <div className="app-content">

        {/* MONITORED PLANS PAGE */}
        {!selected && showPlans && (
          <MonitoredPlansPage
            plans={monitoredPlans}
            loading={plansLoading}
            onOpen={url => { window.location.href = url; }}
            onRemove={removePlan}
          />
        )}

        {/* HOME */}
        {!selected && !showPlans && (
          <>
            <SmartSelector sel={sel} updateSel={updateSel} onSelect={selectProcess} onValueChange={v => setEstimatedValue(v)} />

            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--text-primary)", letterSpacing: "-0.2px" }}>Quick Reference — FAOUA Thresholds &amp; Methods (PR → PO)</div>
              <div style={{ overflowX: "auto" }}>
                <table className="steps-table">
                  <thead>
                    <tr>
                      {["Method", "Value Range", "Award Basis", "Review Required", "PR → PO Duration"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {QUICK_REF.map(([m, v, a, c, d], i) => {
                      const procKeys = ["very_low", "micro", "rfq", "itb", "rfp", "lta_fixed", "lta_mini", "direct_procurement", "itb_works"];
                      return (
                        <tr key={m} className="quick-ref-row" onClick={() => selectProcess(procKeys[i])} style={{ background: i % 2 ? "#fafbfc" : "#fff" }}>
                          <td style={{ fontWeight: 600, color: PROCESSES[procKeys[i]]?.color }}>{m}</td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{v}</td>
                          <td>{a}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{c}</td>
                          <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-teal)" }}>{d}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 16, padding: "14px 18px", background: "var(--surface-warm)", border: "1px solid #e8e0d4", borderRadius: "var(--radius)", fontSize: 12, color: "#78716c", lineHeight: 1.7 }}>
              <strong style={{ color: "#57534e" }}>About the min–max ranges:</strong> The durations shown represent the <strong>theoretical best case (min)</strong> and <strong>realistic worst case (max)</strong> under normal operating conditions. In practice, the minimum range assumes immediate availability of all stakeholders, no revision cycles, and zero queue time — conditions that are rarely met during periods of <strong>high workload</strong>. Requisitioners should plan against the <strong>maximum range</strong> and treat the minimum as an optimistic scenario only achievable under low-workload conditions with full stakeholder availability. When in doubt, add buffer time beyond the maximum.
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

            {/* Monitor header (tracking mode only) */}
            {trackingMode && planSnapshot && (
              <MonitorHeader
                snapshot={planSnapshot}
                overallStatus={overallMonitorStatus}
                onExit={exitTrackingMode}
              />
            )}

            {/* Nav bar */}
            <div className="detail-nav no-print">
              {!trackingMode && <button className="btn" style={{ borderColor: proc.color, color: proc.color }} onClick={() => setSelected(null)}>Back</button>}
              <div className="detail-nav-title" style={{ color: proc.color }}>{proc.label}</div>
              <div className="detail-nav-actions">
                {["overview", "timeline"].map(v => (
                  <button
                    key={v}
                    className={`view-tab${view === v ? " active" : ""}`}
                    style={view === v ? { background: proc.color, borderColor: proc.color } : { borderColor: "var(--border)" }}
                    onClick={() => setView(v)}
                  >
                    {v === "overview" ? "Steps" : "Gantt"}
                  </button>
                ))}
                <button className="btn-print" onClick={() => window.print()}>Print / PDF</button>
              </div>
            </div>

            {/* Date inputs — hidden in tracking mode (plan is frozen) */}
            {!trackingMode && <div className="card no-print" style={{ padding: "16px 20px", marginBottom: 14 }}>
              {!showTimeline && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--surface-alt)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--border)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Enter dates to generate the timeline:</span>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: prDate ? "#f0fdf4" : "#fff", border: `1.5px solid ${prDate ? "#86efac" : "var(--border)"}`, color: prDate ? "#16a34a" : "var(--text-muted)", fontWeight: 600 }}>
                    {prDate ? "✓" : "○"} PR Approval Date
                  </span>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: desiredDeliveryDate ? "#f0fdf4" : "#fff", border: `1.5px solid ${desiredDeliveryDate ? "#86efac" : "var(--border)"}`, color: desiredDeliveryDate ? "#16a34a" : "var(--text-muted)", fontWeight: 600 }}>
                    {desiredDeliveryDate ? "✓" : "○"} {isWorks ? "Desired Works Completion Date" : "Desired Delivery Date"}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                {/* PR date */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>PR Approval Date</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={prDate} onChange={e => setPrDate(e.target.value)}
                      style={{ border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 12px", fontSize: 13, fontFamily: "var(--font-mono)" }} />
                    {prDate && <button onClick={() => setPrDate("")} style={{ fontSize: 11, color: "#fff", background: "var(--text-muted)", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>x</button>}
                  </div>
                </div>
                {/* Desired PO / Contract date */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{isWorks ? "Desired Contract Date" : "Desired PO Date"} <span style={{ fontWeight: 400, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={desiredPoDate} onChange={e => setDesiredPoDate(e.target.value)}
                      style={{ border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 12px", fontSize: 13, fontFamily: "var(--font-mono)" }} />
                    {desiredPoDate && <button onClick={() => setDesiredPoDate("")} style={{ fontSize: 11, color: "#fff", background: "var(--text-muted)", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>x</button>}
                  </div>
                </div>
                {/* Desired delivery / completion date */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{isWorks ? "Desired Works Completion" : "Desired Delivery Date"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={desiredDeliveryDate} onChange={e => setDesiredDeliveryDate(e.target.value)}
                      style={{ border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 12px", fontSize: 13, fontFamily: "var(--font-mono)" }} />
                    {desiredDeliveryDate && <button onClick={() => setDesiredDeliveryDate("")} style={{ fontSize: 11, color: "#fff", background: "var(--text-muted)", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>x</button>}
                  </div>
                </div>
                {/* Reset All */}
                <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
                  <button
                    onClick={() => { setPrDate(""); setDesiredPoDate(""); setDesiredDeliveryDate(""); }}
                    style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
                  >Reset All</button>
                </div>
              </div>
            </div>}

            {/* Delivery picker */}
            {!trackingMode && <DeliveryPicker deliveryWeeks={deliveryWeeks} onChange={setDeliveryWeeks} procColor={proc.color} isWorks={isWorks} />}

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
            {!trackingMode && applicableMods.length > 0 && (
              <div className="modifiers-box no-print">
                <div className="modifiers-title">
                  Additional Circumstances — check all that apply
                  {estimatedValue !== null && !isNaN(estimatedValue) && (
                    <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text-muted)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>
                      (USD {estimatedValue.toLocaleString()})
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {applicableMods.map(mod => (
                    <label key={mod.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 12, padding: "4px 0" }}>
                      <input
                        type="checkbox"
                        checked={effectiveActiveMods.includes(mod.key)}
                        onChange={() => toggleMod(mod.key)}
                        style={{ marginTop: 2, accentColor: proc.color, width: 15, height: 15 }}
                      />
                      <span>
                        <span style={{ fontWeight: 600 }}>{mod.label}</span>
                        <span className="mono" style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 11 }}>
                          +{mod.minDays}–{mod.maxDays}d
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Share Monitor Button (non-tracking mode, when timeline is configured) */}
            {!trackingMode && showTimeline && currentPlanConfig && (
              <div style={{ marginBottom: 14 }}>
                <ShareMonitorButton planConfig={currentPlanConfig} procColor={proc.color} onSave={savePlan} />
              </div>
            )}

            {/* Timeline summary banner */}
            {showTimeline && (
              <div style={{ background: proc.color, borderRadius: "var(--radius)", padding: "18px 24px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 0, justifyContent: "center" }}>
                {/* PO / Contract */}
                <div style={{ textAlign: "center", padding: "4px 28px", borderRight: deliveryWeeks > 0 && minDeliveryDate ? `1px solid rgba(255,255,255,0.2)` : "none" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 500 }}>
                    {isWorks ? "Estimated Contract Signature" : "Estimated PO Issuance"}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono)", letterSpacing: "-0.5px" }}>
                    {minPoDate ? formatDate(minPoDate) : "—"} – {maxPoDate ? formatDate(maxPoDate) : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
                    {totalMinDays}–{totalMaxDays} working days
                  </div>
                </div>
                {/* Delivery / completion */}
                {deliveryWeeks > 0 && minDeliveryDate && maxDeliveryDate && (
                  <div style={{ textAlign: "center", padding: "4px 28px" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 500 }}>
                      {isWorks ? "Estimated Works Completion" : "Estimated Delivery"}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono)", letterSpacing: "-0.5px" }}>
                      {formatDate(minDeliveryDate)} – {formatDate(maxDeliveryDate)}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
                      {deliveryWeeks} {isWorks ? `month${deliveryWeeks !== 1 ? "s" : ""} construction` : `week${deliveryWeeks !== 1 ? "s" : ""} delivery`} after {isWorks ? "contract" : "PO"}
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
                trackingMode={trackingMode}
                actuals={actuals}
                onActualChange={updateActual}
              />
            )}

            {/* Gantt Chart */}
            {view === "timeline" && showTimeline && (
              <div className="card">
                <div className="card-header" style={{ background: proc.color }}>
                  Indicative Calendar — Approved PR → PO Issuance
                </div>
                <div style={{ padding: 16 }}>
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
                    actuals={trackingMode ? actuals : undefined}
                  />
                  <div style={{ marginTop: 10, padding: "9px 14px", background: "var(--surface-warm)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "#78716c", border: "1px solid #e8e0d4" }}>
                    Dates are indicative (working days, Mon–Fri). LPC/RPC meetings depend on quorum. Delivery period is not included in PO timeline.
                  </div>
                </div>
              </div>
            )}

            {/* Fallback if no prDate */}
            {!prDate && (
              <div style={{ background: "var(--surface-warm)", border: "1px solid #e8e0d4", borderRadius: "var(--radius)", padding: "14px 18px", fontSize: 13, color: "#78716c" }}>
                Enter a PR Approval Date above to see the timeline.
              </div>
            )}
          </>
        )}
      </div>
      {/* end app-body */}
      </div>
    </div>
  );
}
