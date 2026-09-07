# Step Override (Delete / Add / Reorder Steps) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users delete, add, and reorder procurement steps, with changes persisted in the shareable URL hash.

**Architecture:** A `stepOverride` state array (null = use defaults, array = user-customized list) lives in `App.jsx` alongside the existing state. When non-null it replaces the `buildSteps()` call and the modifier panel is hidden. The override is serialized into the existing `cfg` object in the URL hash. A new `StepEditor` sidebar component provides the editing UI (delete buttons, add form, drag-to-reorder via @dnd-kit/sortable). Changes are available in both planning mode and tracking/monitoring mode.

**Tech Stack:** React 18 (useState), @dnd-kit/core + @dnd-kit/sortable, existing encodePlanToHash/decodePlanFromHash in utils.js.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/StepEditor.jsx` | **Create** | Step list with delete, drag-to-reorder, add-step form, reset button |
| `src/App.jsx` | **Modify** | Add `stepOverride` state; wire into step computation, URL decode, cfg snapshot, and render StepEditor |
| `src/components/ShareMonitorButton.jsx` | **Modify** | Include `stepOverride` in cfg when encoding |

No changes needed to `utils.js` — `buildSteps()` is only called in `App.jsx` line 764; we simply replace its result with `stepOverride` when set.

---

## Task 1: Install @dnd-kit

**Files:**
- Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 1: Install packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: package.json updated, no errors.

- [ ] **Step 2: Verify install**

```bash
grep "@dnd-kit" package.json
```

Expected: three `@dnd-kit/*` entries.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities"
```

---

## Task 2: Add stepOverride state and wire into step computation in App.jsx

**Files:**
- Modify: `src/App.jsx` lines 680–770

**Context:** Currently at line 764:
```js
const steps = selected ? buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS) : [];
```
We add `stepOverride` state (null | array of step objects) and use it instead.

- [ ] **Step 1: Add stepOverride useState after line 680 (after the activeMods state)**

Find this block (lines 679–683):
```js
  const [view, setView] = useState("overview");
  const [activeMods, setActiveMods] = useState([]);
  const [deliveryWeeks, setDeliveryWeeks] = useState(0);
  const [estimatedValue, setEstimatedValue] = useState(null);
```

Replace with:
```js
  const [view, setView] = useState("overview");
  const [activeMods, setActiveMods] = useState([]);
  const [stepOverride, setStepOverride] = useState(null); // null = use defaults
  const [deliveryWeeks, setDeliveryWeeks] = useState(0);
  const [estimatedValue, setEstimatedValue] = useState(null);
```

- [ ] **Step 2: Decode stepOverride from URL hash**

Find the hash-loading block (around line 735) where `cfg` fields are applied:
```js
          setActiveMods(cfg.activeMods || []);
```

Add immediately after that line:
```js
          setStepOverride(cfg.stepOverride || null);
```

- [ ] **Step 3: Reset stepOverride when user selects a new process**

Find where `setSelected` is called from `ProcessCard` and where activeMods is reset. Search for:
```js
  function handleSelect(procKey) {
```
or the equivalent. If no such function exists, search for `setSelected(` calls and find where activeMods is also reset. Add `setStepOverride(null);` alongside the `setActiveMods([])` reset so that picking a new process clears any override.

If the reset pattern is `setActiveMods([])` inline (no wrapper function), wrap or just add the companion call.

- [ ] **Step 4: Use stepOverride in step computation (line 764)**

Find:
```js
  const steps = selected ? buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS) : [];
```

Replace with:
```js
  const steps = selected
    ? (stepOverride ?? buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS))
    : [];
```

- [ ] **Step 5: Include stepOverride in currentPlanConfig snapshot (around line 861)**

Find:
```js
  const currentPlanConfig = selected ? {
    selected,
    prDate,
    activeMods: effectiveActiveMods,
    deliveryWeeks,
    estimatedValue,
    desiredPoDate,
    desiredDeliveryDate,
  } : null;
```

Replace with:
```js
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
```

- [ ] **Step 6: Verify dev server starts without errors**

```bash
npm run dev
```

Expected: Server starts, no console errors. Selecting a process still shows the same timeline as before.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add stepOverride state wired into step computation and URL hash"
```

---

## Task 3: Update ShareMonitorButton to include stepOverride

**Files:**
- Modify: `src/components/ShareMonitorButton.jsx` lines 16–22

- [ ] **Step 1: Add stepOverride to ShareMonitorButton props and cfg**

Open `src/components/ShareMonitorButton.jsx`. Find the snapshot cfg block:
```js
  const snapshot = {
    v: 1,
    prNumber: prNumber.trim(),
    label: label.trim() || null,
    createdAt: new Date().toISOString(),
    cfg: {
      selected,
      prDate,
      activeMods,
      deliveryWeeks,
      estimatedValue,
      desiredPoDate,
      desiredDeliveryDate,
    }
  };
```

Replace the `cfg` block with:
```js
    cfg: {
      selected,
      prDate,
      activeMods,
      stepOverride: stepOverride ?? undefined,
      deliveryWeeks,
      estimatedValue,
      desiredPoDate,
      desiredDeliveryDate,
    }
```

Then update the component's prop signature. Find where `ShareMonitorButton` is defined (likely `function ShareMonitorButton({ selected, prDate, ... })`). Add `stepOverride` as a destructured prop.

- [ ] **Step 2: Pass stepOverride from App.jsx to ShareMonitorButton**

In `App.jsx`, find where `<ShareMonitorButton` is rendered and add the prop:
```jsx
<ShareMonitorButton
  ...existing props...
  stepOverride={stepOverride}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareMonitorButton.jsx src/App.jsx
git commit -m "feat: include stepOverride in shareable monitor URL hash"
```

---

## Task 4: Build StepEditor component

**Files:**
- Create: `src/components/StepEditor.jsx`

This component receives the current step list and callbacks, and renders:
- A header with "Customize Steps" title + "Reset to defaults" button
- A sortable list of steps (drag handle + step name + owner + min/max days + delete button)
- An "Add step" form at the bottom (name, owner, min days, max days, + Add button)

- [ ] **Step 1: Create src/components/StepEditor.jsx**

```jsx
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const EMPTY_NEW = { name: "", owner: "", minDays: "", maxDays: "" };

function SortableStep({ step, index, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    marginBottom: 4,
    fontSize: 13,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: "grab", color: "#aaa", fontSize: 16, userSelect: "none", flexShrink: 0 }}
        title="Drag to reorder"
      >
        ⠿
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {step.name}
        </div>
        <div style={{ color: "#666", fontSize: 11 }}>
          {step.owner} · {step.minDays}–{step.maxDays} days
        </div>
      </div>
      <button
        onClick={() => onDelete(index)}
        title="Delete step"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#c0392b", fontSize: 16, padding: "2px 4px", flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function StepEditor({ steps, onStepsChange, onReset, procColor }) {
  const [newStep, setNewStep] = useState(EMPTY_NEW);
  const [addError, setAddError] = useState("");

  // Attach stable IDs for dnd-kit
  const stepsWithIds = steps.map((s, i) => ({ ...s, _id: s.name + "_" + i }));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stepsWithIds.findIndex(s => s._id === active.id);
    const newIndex = stepsWithIds.findIndex(s => s._id === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex);
    onStepsChange(reordered);
  }

  function handleDelete(index) {
    const updated = steps.filter((_, i) => i !== index);
    onStepsChange(updated);
  }

  function handleAdd() {
    const name = newStep.name.trim();
    const owner = newStep.owner.trim();
    const min = parseInt(newStep.minDays, 10);
    const max = parseInt(newStep.maxDays, 10);
    if (!name) { setAddError("Step name is required."); return; }
    if (!owner) { setAddError("Responsible is required."); return; }
    if (isNaN(min) || min < 1) { setAddError("Min days must be ≥ 1."); return; }
    if (isNaN(max) || max < min) { setAddError("Max days must be ≥ min days."); return; }
    setAddError("");
    onStepsChange([...steps, { name, owner, minDays: min, maxDays: max }]);
    setNewStep(EMPTY_NEW);
  }

  const inputStyle = {
    border: "1px solid #ccc", borderRadius: 4, padding: "4px 7px",
    fontSize: 12, width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: procColor || "#333" }}>
          Customize Steps
        </div>
        <button
          onClick={onReset}
          style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 4,
            border: "1px solid #aaa", background: "#f5f5f5", cursor: "pointer", color: "#555",
          }}
        >
          Reset to defaults
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stepsWithIds.map(s => s._id)} strategy={verticalListSortingStrategy}>
          {stepsWithIds.map((step, i) => (
            <SortableStep key={step._id} step={step} index={i} onDelete={handleDelete} />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add step form */}
      <div style={{ marginTop: 10, padding: "10px", background: "#f9f9f9", borderRadius: 6, border: "1px dashed #ccc" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 6 }}>
          + Add Step
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 5 }}>
          <input style={inputStyle} placeholder="Phase name *" value={newStep.name}
            onChange={e => setNewStep(p => ({ ...p, name: e.target.value }))} />
          <input style={inputStyle} placeholder="Responsible *" value={newStep.owner}
            onChange={e => setNewStep(p => ({ ...p, owner: e.target.value }))} />
          <input style={inputStyle} type="number" min="1" placeholder="Min days *" value={newStep.minDays}
            onChange={e => setNewStep(p => ({ ...p, minDays: e.target.value }))} />
          <input style={inputStyle} type="number" min="1" placeholder="Max days *" value={newStep.maxDays}
            onChange={e => setNewStep(p => ({ ...p, maxDays: e.target.value }))} />
        </div>
        {addError && <div style={{ color: "#c0392b", fontSize: 11, marginBottom: 4 }}>{addError}</div>}
        <button
          onClick={handleAdd}
          style={{
            fontSize: 12, padding: "4px 12px", borderRadius: 4,
            border: `1px solid ${procColor || "#333"}`,
            background: procColor || "#333", color: "#fff", cursor: "pointer", width: "100%",
          }}
        >
          Add Step
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify file saved correctly**

```bash
node -e "require('./src/components/StepEditor.jsx')" 2>&1 | head -5
```

(This will error on JSX but confirms file exists. Alternatively just check via the dev server.)

- [ ] **Step 3: Commit**

```bash
git add src/components/StepEditor.jsx
git commit -m "feat: add StepEditor component with dnd-kit reorder, delete, and add-step form"
```

---

## Task 5: Integrate StepEditor into App.jsx UI

**Files:**
- Modify: `src/App.jsx`

The StepEditor appears in the sidebar below the Modifiers section (or in place of it when stepOverride is active). It is only shown when a process is selected and we're NOT in tracking mode. The Modifiers section is hidden when stepOverride is active.

- [ ] **Step 1: Import StepEditor at top of App.jsx**

Find the existing imports block and add:
```js
import StepEditor from "./components/StepEditor";
```

- [ ] **Step 2: Add handleStepsChange and handleStepsReset callbacks**

After the `stepOverride` useState declaration, add these two handlers:

```js
  function handleStepsChange(newSteps) {
    setStepOverride(newSteps);
  }

  function handleStepsReset() {
    setStepOverride(null);
  }
```

- [ ] **Step 3: Add "Customize Steps" toggle button and StepEditor to the sidebar**

Find the block that renders the modifiers section (around line 1144):
```jsx
            {!trackingMode && applicableMods.length > 0 && (
```

Just before that block, add a "Customize Steps" button that snapshots steps when first clicked:
```jsx
            {!trackingMode && selected && (
              <div className="card no-print" style={{ padding: "12px 16px", marginBottom: 14 }}>
                {stepOverride === null ? (
                  <button
                    className="btn"
                    style={{ borderColor: proc.color, color: proc.color, fontSize: 12, width: "100%" }}
                    onClick={() => setStepOverride(buildSteps(selected, effectiveActiveMods, PROCESSES, MODIFIERS))}
                  >
                    ✏️ Customize Steps
                  </button>
                ) : (
                  <StepEditor
                    steps={stepOverride}
                    onStepsChange={handleStepsChange}
                    onReset={handleStepsReset}
                    procColor={proc.color}
                  />
                )}
              </div>
            )}
```

- [ ] **Step 4: Hide the Modifiers section when stepOverride is active**

Find:
```jsx
            {!trackingMode && applicableMods.length > 0 && (
```

Change to:
```jsx
            {!trackingMode && stepOverride === null && applicableMods.length > 0 && (
```

- [ ] **Step 5: Test in browser**

Run `npm run dev`. Select any procurement method. Verify:
- "Customize Steps" button appears below form options
- Clicking it shows the step list editor with all steps from the selected method
- Modifiers panel disappears
- Delete a step → timeline recalculates immediately  
- Add a step → it appears at the bottom of the list
- Drag a step → order updates
- "Reset to defaults" → step list clears, modifiers return
- The shareable URL hash changes when stepOverride is active (check via ShareMonitorButton)

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate StepEditor into sidebar with customize/reset toggle"
```

---

## Task 6: Persist stepOverride in tracking/monitoring mode

**Files:**
- Modify: `src/App.jsx`

When a shared monitor link is loaded (tracking mode), `stepOverride` is already decoded from the hash (Task 2 Step 2). We need to verify it renders correctly and that the StepEditor is NOT shown in tracking mode (it's read-only).

- [ ] **Step 1: Verify tracking mode hides StepEditor**

The StepEditor block added in Task 5 is already guarded with `{!trackingMode && ...}` so it will not render in tracking mode. In tracking mode the customized steps still flow through `steps` (because `stepOverride ?? buildSteps(...)` is evaluated) and into the timeline — so the Gantt and StepsTable automatically reflect the override.

No code change needed; just verify in browser:

1. Set up a plan with stepOverride (delete a step or add one)
2. Click "Share Monitor Link" and copy the URL
3. Open the URL in a new tab
4. Verify: tracking mode loads with the customized step list visible in the Gantt/table, and no StepEditor UI is shown

- [ ] **Step 2: Commit (only if any fix was needed)**

```bash
git add src/App.jsx
git commit -m "fix: ensure stepOverride persists correctly in tracking mode"
```

---

## Self-Review Checklist

### Spec Coverage
| Requirement | Covered by |
|---|---|
| Delete any step | Task 4 (`handleDelete` in SortableStep) |
| Automatic date recalculation after delete | Task 2 Step 4 (`steps = stepOverride ?? buildSteps(...)`) |
| Add custom step (name, responsible, min, max days) | Task 4 (`handleAdd` in StepEditor) |
| Drag to reorder | Task 4 (dnd-kit SortableContext) |
| Available in planning mode | Task 5 (renders when `!trackingMode`) |
| Available in tracking/monitor mode (read-only) | Task 6 — override flows through on load |
| Persist in URL hash | Task 2 (state), Task 3 (ShareMonitorButton) |
| Modifiers disabled while override active | Task 5 Step 4 (`stepOverride === null` guard) |
| Reset to defaults | Task 4 (`onReset` → `setStepOverride(null)`) |

### No Placeholder Scan
- All steps contain actual code — no TBDs.

### Type Consistency
- `stepOverride`: `null | Array<{name, owner, minDays, maxDays}>` — consistent across App.jsx, StepEditor props, and ShareMonitorButton.
- `handleStepsChange(newSteps)` → `setStepOverride(newSteps)` → `steps` — consistent chain.
- `_id` field added to steps only inside StepEditor for dnd-kit; not leaked to parent state.
