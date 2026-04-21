import { useState } from "react";
import { encodePlanToHash, derivePlanId } from "../utils";

/**
 * Button + inline panel that collects PR number + label, then encodes the
 * plan snapshot into the URL hash and copies the link to clipboard.
 */
export default function ShareMonitorButton({ planConfig, procColor, onSave }) {
  const [open, setOpen] = useState(false);
  const [prNumber, setPrNumber] = useState("");
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (!prNumber.trim()) return;
    const snapshot = {
      v: 1,
      prNumber: prNumber.trim(),
      label: label.trim() || null,
      createdAt: new Date().toISOString(),
      cfg: planConfig,
    };
    const encoded = encodePlanToHash(snapshot);
    const url = `${window.location.origin}${window.location.pathname}#plan=${encoded}`;
    window.location.hash = `plan=${encoded}`;
    navigator.clipboard.writeText(url).catch(() => {});
    onSave?.(derivePlanId(planConfig), url, snapshot);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: procColor,
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "9px 20px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          transition: "all 0.15s",
          letterSpacing: "-0.2px",
        }}
      >
        Share Monitor Link
      </button>
    );
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "18px 20px",
      boxShadow: "var(--shadow-md)",
      maxWidth: 480,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, letterSpacing: "-0.2px" }}>
        Share Monitor Link
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 5 }}>
          PR Number <span style={{ color: "#dc2626" }}>*</span>
        </div>
        <input
          type="text"
          placeholder="e.g. FAOUA-2025-0123"
          value={prNumber}
          onChange={e => setPrNumber(e.target.value)}
          onKeyDown={e => e.key === "Enter" && prNumber.trim() && handleShare()}
          style={{
            width: "100%",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
            background: "var(--surface-alt)",
          }}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 5 }}>
          Label <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </div>
        <input
          type="text"
          placeholder="e.g. IT Equipment — Kyiv Field Office"
          value={label}
          onChange={e => setLabel(e.target.value)}
          style={{
            width: "100%",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: "var(--font-body)",
            background: "var(--surface-alt)",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleShare}
          disabled={!prNumber.trim()}
          style={{
            background: prNumber.trim() ? procColor : "var(--border)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "9px 22px",
            fontSize: 13,
            fontWeight: 700,
            cursor: prNumber.trim() ? "pointer" : "not-allowed",
            fontFamily: "var(--font-body)",
            transition: "all 0.15s",
          }}
        >
          {copied ? "Link copied!" : "Generate & Copy Link"}
        </button>
        <button
          onClick={() => { setOpen(false); setCopied(false); }}
          style={{
            background: "none",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
