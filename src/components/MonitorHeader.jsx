import { useState } from "react";
import { formatDate } from "../utils";

const STATUS_CONFIG = {
  on_track:  { bg: "#f0fdf4", border: "#86efac", pill: "#16a34a", label: "On Track" },
  delayed:   { bg: "#fffbeb", border: "#fcd34d", pill: "#d97706", label: "Delayed" },
  completed: { bg: "#eff6ff", border: "#93c5fd", pill: "#1d4ed8", label: "Completed" },
};

export default function MonitorHeader({ snapshot, overallStatus, onExit }) {
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  const { prNumber, label, createdAt, cfg } = snapshot;
  const cfg_prDate = cfg.prDate ? new Date(cfg.prDate) : null;
  const created = createdAt ? new Date(createdAt) : null;

  const sc = STATUS_CONFIG[overallStatus?.type] ?? STATUS_CONFIG.on_track;
  const statusLabel =
    overallStatus?.type === "delayed"
      ? `Delayed — ${overallStatus.delayDays} working day${overallStatus.delayDays !== 1 ? "s" : ""}`
      : overallStatus?.type === "on_track" && overallStatus.aheadDays > 0
      ? `On Track — ${overallStatus.aheadDays}d ahead`
      : sc.label;

  return (
    <div style={{
      background: sc.bg,
      border: `1.5px solid ${sc.border}`,
      borderRadius: "var(--radius)",
      padding: "18px 22px",
      marginBottom: 16,
    }}>
      {/* Top row: PR number + status pill */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 4 }}>
            PR Number
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            {prNumber || "—"}
          </div>
        </div>
        <div style={{
          background: sc.pill,
          color: "#fff",
          borderRadius: 20,
          padding: "6px 18px",
          fontSize: 13,
          fontWeight: 700,
          alignSelf: "flex-start",
          letterSpacing: "-0.2px",
        }}>
          {statusLabel}
        </div>
      </div>

      {/* Details row */}
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
        {label && (
          <div>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
          </div>
        )}
        <div>
          <span style={{ color: "var(--text-muted)" }}>Process: </span>
          <span style={{ fontWeight: 600 }}>{cfg.selected?.toUpperCase()}</span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>PR Approved: </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            {cfg_prDate ? formatDate(cfg_prDate) : "—"}
          </span>
        </div>
        {created && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>Created: </span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {created.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        )}
      </div>

      {/* Footer row: back link + copy link */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <button
          onClick={onExit}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)",
            padding: 0, fontWeight: 500,
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          ← Back to configurator
        </button>
        <button
          onClick={handleCopyLink}
          style={{
            background: copied ? "#f0fdf4" : "var(--surface-alt)",
            border: `1.5px solid ${copied ? "#86efac" : "var(--border)"}`,
            borderRadius: "var(--radius-sm)",
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            color: copied ? "#16a34a" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          {copied ? "✓ Link copied!" : "Copy monitor link"}
        </button>
      </div>
    </div>
  );
}
