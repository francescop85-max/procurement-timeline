import { PROCESSES } from "../data";

const STATUS_PILL = {
  on_track:  { bg: "#f0fdf4", color: "#16a34a", label: "On Track" },
  delayed:   { bg: "#fffbeb", color: "#d97706", label: "Delayed" },
  completed: { bg: "#eff6ff", color: "#1d4ed8", label: "Completed" },
  unknown:   { bg: "#f4f7fa", color: "#64748b", label: "Unknown" },
};

function formatShortDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MonitoredPlansList({ plans, loading, onOpen, onRemove, onClose }) {
  if (loading) {
    return (
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", padding: "28px 24px", boxShadow: "var(--shadow-md)", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>Monitored Procurements</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", padding: "0 4px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Loading…</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "28px 24px",
        boxShadow: "var(--shadow-md)",
        maxWidth: 700,
        margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>Monitored Procurements</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", padding: "0 4px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          No monitored procurements yet.<br />
          <span style={{ fontSize: 12 }}>Configure a timeline and click "Share Monitor Link" to create one.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "20px 24px",
      boxShadow: "var(--shadow-md)",
      maxWidth: 700,
      margin: "0 auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>
          Monitored Procurements
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "2px 8px", color: "var(--text-muted)" }}>
            {plans.length}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", padding: "0 4px", lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {plans.map(({ planId, url, snapshot, savedAt }) => {
          const { prNumber, label, cfg } = snapshot;
          const proc = PROCESSES[cfg?.selected];
          const statusKey = "unknown"; // We don't recompute status here — open to see live status
          const pill = STATUS_PILL[statusKey];

          return (
            <div
              key={planId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface-alt)",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onClick={() => onOpen(url)}
              onMouseEnter={e => e.currentTarget.style.borderColor = proc?.color ?? "var(--accent-teal)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {/* Color dot */}
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: proc?.color ?? "#888", flexShrink: 0 }} />

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                    {prNumber || "—"}
                  </span>
                  {label && (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                      {label}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 10 }}>
                  <span>{proc?.label ?? cfg?.selected?.toUpperCase() ?? "—"}</span>
                  {cfg?.prDate && <span>PR: {formatShortDate(cfg.prDate)}</span>}
                  {savedAt && <span>Saved: {formatShortDate(savedAt)}</span>}
                </div>
              </div>

              {/* Open button */}
              <button
                onClick={e => { e.stopPropagation(); onOpen(url); }}
                style={{
                  background: proc?.color ?? "var(--fao-blue)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  flexShrink: 0,
                }}
              >
                Open
              </button>

              {/* Remove button */}
              <button
                onClick={e => { e.stopPropagation(); onRemove(planId); }}
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "5px 10px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  flexShrink: 0,
                }}
                title="Remove from list"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
