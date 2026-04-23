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
          color: "#c0392b", fontSize: 18, padding: "2px 4px", flexShrink: 0, lineHeight: 1,
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

  const stepsWithIds = steps.map((s, i) => ({ ...s, _id: s.name + "_" + i }));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stepsWithIds.findIndex(s => s._id === active.id);
    const newIndex = stepsWithIds.findIndex(s => s._id === over.id);
    onStepsChange(arrayMove(steps, oldIndex, newIndex));
  }

  function handleDelete(index) {
    onStepsChange(steps.filter((_, i) => i !== index));
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
    <div style={{ marginTop: 4 }}>
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
