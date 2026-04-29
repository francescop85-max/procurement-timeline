# FAO Ukraine — Procurement & Planning Tools
## User Guide

> **Who this guide is for:** Responsible Officers (ROs) preparing procurement and LOA documentation, and Programme Officers managing agricultural input campaigns. No technical background is required.

---

## Table of Contents

1. [Overview of the Three Tools](#1-overview-of-the-three-tools)
2. [Procurement Timeline Estimator](#2-procurement-timeline-estimator)
3. [Agricultural Input Planner](#3-agricultural-input-planner)
4. [LOA QA Planner](#4-loa-qa-planner)
5. [Settings & Profiles](#5-settings--profiles)
6. [Sharing & Monitoring Links](#6-sharing--monitoring-links)
7. [Quick Reference: Procurement Thresholds](#7-quick-reference-procurement-thresholds)

---

## 1. Overview of the Three Tools

All three tools live at **procurementtimeline.vercel.app** and are accessible from each other's header.

| Tool | Purpose | Who uses it |
|------|---------|-------------|
| **Procurement Timeline Estimator** | Estimates procurement timelines working backward from a desired delivery date. Helps identify when a PR must be raised. | ROs initiating procurement |
| **Agricultural Input Planner** | Plans multiple agricultural input campaigns on a shared timeline, tracking procurement deadlines against planting dates and project end dates. | Programme Officers / ROs for agricultural programmes |
| **LOA QA Planner** | Estimates the QA process timeline for Letters of Agreement (new LoAs and amendments), including LPC steps when applicable. | ROs managing partner implementation through LoAs |

All tools respect Ukrainian public holidays when computing working-day timelines.

---

## 2. Procurement Timeline Estimator

**Access:** [procurementtimeline.vercel.app](https://procurementtimeline.vercel.app)

### What it does

Given a desired delivery date and estimated value, the tool works **backward** to tell you:
- When the Purchase Request (PR) must be raised
- When the Purchase Order (PO) must be issued
- Whether your target date is achievable given the selected procurement method

### Step-by-step: creating a timeline

**Step 1 — Select a process type**
Choose from the left panel: goods, services, works, or a framework contract. The tool auto-recommends a procurement method based on the estimated value you enter.

**Step 2 — Enter the PR date**
Set the date when the PR will be (or was) submitted to procurement. This anchors the forward timeline.

**Step 3 — Set estimated value and desired dates**
- Enter the estimated contract value in USD.
- Set the **desired PO issuance date** and **desired delivery date**.
- The tool will show whether the timeline is **feasible** (green), **at risk** (orange), or **not feasible** (red) given the selected method and the PR date.

**Step 4 — Review the Gantt chart and step table**
The timeline view shows each procurement phase as a bar with two components:
- **Solid bar** — best-case duration (minimum working days)
- **Light bar** — worst-case buffer (maximum working days)

Hover over any bar to see phase details.

**Step 5 — Apply modifiers (if applicable)**
Under "Additional Circumstances", check any conditions that apply to your procurement (e.g., no-objection required, sole source justification needed). Each modifier adds days to the relevant phase and shifts the timeline accordingly.

**Step 6 — Customize steps (optional)**
If the standard process doesn't match your specific case, click **✏️ Customize Steps** to:
- Add or remove individual phases
- Adjust minimum and maximum working days per phase
- Reorder phases by dragging
- Reset to the default process at any time

**Step 7 — Share a monitoring link**
Once the timeline is configured, click **Share Monitor Link**. Enter the PR number and an optional label, then click **Generate & Copy Link**. Share this URL with your supervisor or QA officer — anyone opening the link sees the same timeline and can track actual progress against planned dates.

### Understanding the status indicators

| Status | Meaning |
|--------|---------|
| 🟢 On track | Today is before the earliest expected completion date |
| 🟠 At risk | Today is within the min–max completion range |
| 🔴 Overdue | Today is past the latest expected completion date |

### Monitoring view

When someone opens a shared monitoring link, the app switches to **tracking mode**. In this mode you can record actual completion dates for each phase. The Gantt chart updates in real time to reflect actual vs. planned progress.

---

## 3. Agricultural Input Planner

**Access:** [procurementtimeline.vercel.app/planner](https://procurementtimeline.vercel.app/planner)

### What it does

The Agricultural Input Planner works **backward from a target planting/delivery date**. For each agricultural input campaign (e.g. spring wheat seeds, fertilizers), it calculates the latest possible PR date and shows all campaigns on a shared Gantt timeline — making bottlenecks and scheduling conflicts immediately visible.

### Step-by-step: adding a campaign

**Step 1 — Click "+ New Campaign"**
Opens the campaign panel on the right side of the screen.

**Step 2 — Fill in campaign details**

| Field | What to enter |
|-------|---------------|
| **Crop / Input Type** | Descriptive name (e.g. "Spring Wheat Seeds", "Urea Fertilizer") |
| **Target Planting / Delivery Date** | The date by which inputs must be delivered to beneficiaries |
| **Estimated Value (USD)** | Contract value — used to auto-recommend a procurement method |
| **Procurement Type** | Goods, Services, or Works |
| **Delivery Lead Time** | Weeks the supplier needs to deliver after PO issuance |

**Step 3 — Review the recommended procurement method**
Based on value and type, the tool recommends a method (e.g. RFQ for USD 5,000–25,000). You can override this if needed.

**Step 4 — Add funding projects (optional but recommended)**
Link the campaign to one or more funding projects. Enter the project name/code and its end date. The tool will flag if the procurement timeline puts project expenditure at risk of missing the project end date.

**Step 5 — Apply modifiers and add a custom step**
Check any "Additional Circumstances" that affect your procurement. You can also insert a one-off custom step (e.g. a specific approval step) at any position in the process.

**Step 6 — Save the campaign**
Click **Add Campaign**. The campaign appears in the shared Gantt timeline and the campaign table below it.

### Reading the Gantt timeline

- Each row is one campaign.
- The horizontal bars represent the procurement window: from PR deadline (leftmost) to delivery deadline (rightmost).
- A **red dashed line** marks today.
- **Click any bar** to expand the campaign's individual phase breakdown.
- **Drag a phase bar** to manually adjust its timing — all dependent phases shift accordingly.

### Campaign table

Below the Gantt, the table lists all campaigns with:
- PR deadline, PO deadline, delivery deadline
- Funding project status (✓ on track / ⚠ at risk)
- Quick Edit and Delete buttons

### Profile selector

If multiple procurement profiles are configured (see [Settings](#5-settings--profiles)), a dropdown appears in the header letting you switch between profiles. Useful when managing campaigns across different field offices with different lead time norms.

### Print / PDF

Click **🖨 Print / PDF** in the header to generate a print-friendly view of the timeline and table.

---

## 4. LOA QA Planner

**Access:** [procurementtimeline.vercel.app/loa](https://procurementtimeline.vercel.app/loa)

### What it does

The LOA QA Planner estimates the time required to complete the full quality assurance process for a Letter of Agreement — from documentation preparation through GRMS order approval. It covers both **new LoAs** and **amendments**, and automatically includes LPC review steps when the LoA value crosses the relevant threshold.

> **Important:** This tool covers only LoAs **within FAO Ukraine's delegated authority (≤ USD 100,000)**. For LoAs above this amount, submit directly to the CSLP/LOA Unit.

### Process types

| Process | When to use |
|---------|------------|
| **New LoA — Direct Selection** | Single-source LoA with justification |
| **New LoA — Competitive (EOI)** | Open expression of interest to select a partner |
| **New LoA — Competitive (IFP with scoring criteria)** | Invitation for Proposals with evaluation criteria |
| **Amendment — No Cost** | Extension or scope change with no budget change |
| **Amendment — Additional Cost** | Increase in LoA value |
| **Amendment — Reduction of Cost** | Decrease in LoA value |

### LPC review — when it applies

The **Local Procurement Committee (LPC)** review steps are **automatically included** when the LoA value exceeds **USD 25,000**.

For IFP (Invitation for Proposals with scoring criteria) processes above this threshold, the tool adds two LPC stages:
- **LPC ex-ante** — review and endorsement of scoring criteria before issuance
- **LPC ex-post** — review and decision after proposal evaluation

For EOI and amendment processes above the threshold, a single LPC review step is added.

When the value is at or below USD 25,000, LPC steps are removed from the timeline automatically.

### Step-by-step: creating a LOA plan

**Step 1 — Click "+ New" in the sidebar**

**Step 2 — Enter plan details**

| Field | What to enter |
|-------|--------------|
| **Plan Name** | Descriptive name (e.g. "Seeds distribution — NGO Name") |
| **Process Type** | Select from the six process types above |
| **LoA Value (USD)** | Determines whether LPC steps are included; triggers alert if > USD 100,000 |
| **Process Start Date** | The date the RO begins preparing documentation |

**Step 3 — Set target dates (optional but recommended)**

- **Desired LoA Signing Date** — the date by which the LoA must be effective. The tool will immediately show whether this is **feasible** or **not feasible** given the start date.
- **LoA End Date** — the planned end date of the LoA implementation period (for reference only).

**Step 4 — Review feasibility**
If the target signing date is not achievable from the chosen start date, the tool shows a red warning with the **latest start date** that would still meet the target.

**Step 5 — Review step details (Step Details tab)**
The default view shows a table of all process steps with:
- Earliest possible start date
- Latest possible end date
- Min–max working days per step

**Step 6 — View the Gantt chart (Gantt Chart tab)**
Switch to the Gantt tab for a visual timeline. Each step shows as a bar:
- **Solid portion** — best-case window (minimum days)
- **Light portion** — worst-case buffer

If you set a desired signing date, a coloured vertical marker appears: **green** if the process finishes before it, **red** if not.

You can **drag any bar** left or right to adjust when that step starts. All subsequent steps shift accordingly. Changes are saved automatically.

Hovering over a bar shows a tooltip with dates and duration.

**Step 7 — Customize steps (optional)**
Click **✏️ Customize Steps** at the bottom of the Step Details tab to:
- Adjust min/max working days for any step
- Rename steps
- Add or remove steps
- Reset to the default process template at any time

**Step 8 — Share a monitoring link**
Click **📤 Share Monitor Link** in the plan header. The URL is copied to your clipboard. Anyone opening the link lands directly on this plan.

### Reading the sidebar

Each plan in the sidebar shows:
- Process type colour indicator
- Status badge (On track / At risk / Overdue)
- Estimated effective date range

Status is calculated based on today's date relative to the last step's estimated completion window.

---

## 5. Settings & Profiles

**Access:** Click **⚙ Settings** in the Procurement Timeline Estimator header.

Settings are divided into two tabs:

### Procurement Profiles

Profiles let you configure different sets of lead times for different operational contexts (e.g., different field offices or emergency vs. standard procedures).

**Default profile** — the baseline lead times used unless another profile is selected. You can modify the default lead times directly.

**Creating a custom profile:**
1. Click **+ New Profile**
2. Give it a name and optionally a country code
3. For each process step, set custom minimum and maximum durations
4. Click Save — the profile becomes available in the Procurement Timeline Estimator and the Agricultural Input Planner

**Activating a profile:** Click **Set Active** next to any profile. The active profile's lead times are used for all new timeline calculations.

### LOA QA Settings

Configure the lead times for each of the six LOA process types. Changes apply globally (there are no per-profile LOA settings).

**LPC threshold** — the value above which LPC review steps are triggered. Default: USD 25,000.

**Authority limit** — the maximum LoA value within FAO Ukraine's delegated authority. Default: USD 100,000.

To adjust step durations: expand any process type, then set the minimum and maximum working days for each step.

---

## 6. Sharing & Monitoring Links

All three tools support sharing a direct link to a specific plan or timeline.

### How sharing works

| Tool | What the link contains |
|------|----------------------|
| Procurement Timeline Estimator | Full plan snapshot encoded in the URL — no account needed to view |
| Agricultural Input Planner | *(Print/PDF available; monitoring links not yet supported)* |
| LOA QA Planner | Plan ID — recipient must have access to the same Vercel deployment |

### Generating a link

**Procurement Timeline Estimator:**
1. Configure the full timeline (process type, dates, modifiers)
2. Click **Share Monitor Link**
3. Enter the PR number (required) and a label (optional)
4. Click **Generate & Copy Link** — the URL is copied to your clipboard
5. Share via email or Teams

**LOA QA Planner:**
1. Open the plan you want to share
2. Click **📤 Share Monitor Link** in the plan header
3. The URL is copied immediately — share it directly

### What recipients see

- **Procurement Estimator links** open in tracking mode, showing the full timeline. Recipients can record actual completion dates.
- **LOA Planner links** open the LOA Planner and automatically select the shared plan.

---

## 7. Quick Reference: Procurement Thresholds

### Goods & Services

| Value range (USD) | Method |
|-------------------|--------|
| < 1,000 | Very Low Value |
| 1,000 – 4,999 | Micro Purchase |
| 5,000 – 24,999 | Request for Quotation (RFQ) |
| ≥ 25,000 | Invitation to Bid (ITB) |

### Works

| Value range (USD) | Method |
|-------------------|--------|
| < 1,000 | Very Low Value |
| 1,000 – 4,999 | Micro Purchase |
| 5,000 – 24,999 | RFQ |
| ≥ 25,000 | ITB (Works) |

### LOA thresholds

| Threshold | Trigger |
|-----------|---------|
| > USD 25,000 | LPC review steps added to LOA process |
| > USD 100,000 | Outside FAO Ukraine delegated authority — submit to CSLP/LOA Unit |

---

*Last updated: April 2026 — FAO Ukraine*
