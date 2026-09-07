import { describe, it, expect } from "vitest";
import {
  methodForValue, lpcThreshold, hqpcThreshold, getModifiers, getProcesses,
  thresholdLabel, authorityOf, effectiveGrade, RPC_MIN, RPC_MAX, HQPC_EXCEPTIONAL_VALUE,
} from "./data";
import { buildSteps } from "./utils";
import { recommendMethod } from "./planner/recommend.js";

// Appendix G bands are inclusive: "Up to 1 000", "1 001 – 5 000", "Above 25 000".
describe("Appendix G — method selection by value", () => {
  it("routes an office WITHOUT an IPO on Table 3 boundaries", () => {
    expect(methodForValue(1000, "without_ipo")).toBe("very_low");
    expect(methodForValue(1001, "without_ipo")).toBe("micro");
    expect(methodForValue(5000, "without_ipo")).toBe("micro");
    expect(methodForValue(5001, "without_ipo")).toBe("rfq");
    expect(methodForValue(25000, "without_ipo")).toBe("rfq");
    expect(methodForValue(25001, "without_ipo")).toBe("itb");
  });

  it("routes an office WITH an IPO on Table 2 boundaries", () => {
    expect(methodForValue(2000, "with_ipo")).toBe("very_low");
    expect(methodForValue(2001, "with_ipo")).toBe("micro");
    expect(methodForValue(10000, "with_ipo")).toBe("micro");
    expect(methodForValue(10001, "with_ipo")).toBe("rfq");
    expect(methodForValue(50000, "with_ipo")).toBe("rfq");
    expect(methodForValue(50001, "with_ipo")).toBe("itb");
  });

  it("routes HQ Rome on Table 1 boundaries", () => {
    expect(methodForValue(80000, "hq")).toBe("rfq");
    expect(methodForValue(80001, "hq")).toBe("itb");
  });

  it("sends services to RFP and goods to ITB above the threshold", () => {
    expect(methodForValue(60000, "with_ipo", "services")).toBe("rfp");
    expect(methodForValue(60000, "with_ipo", "goods")).toBe("itb");
  });

  it("routes works through the same bands as goods, reaching ITB-Works only above the threshold", () => {
    // Appendix G labels the works band "Above <rfqMax> (works)", so a low-value
    // works item is an ordinary VLVP / Micro / RFQ.
    expect(methodForValue(2000, "with_ipo", "works")).toBe("very_low");
    expect(methodForValue(10000, "with_ipo", "works")).toBe("micro");
    expect(methodForValue(50000, "with_ipo", "works")).toBe("rfq");
    expect(methodForValue(50001, "with_ipo", "works")).toBe("itb_works");
    expect(methodForValue(25001, "without_ipo", "works")).toBe("itb_works");
    expect(methodForValue(80000, "hq", "works")).toBe("rfq");
  });

  it("is the case that a USD 30,000 goods buy is an RFQ with an IPO but an ITB without one", () => {
    expect(methodForValue(30000, "with_ipo")).toBe("rfq");
    expect(methodForValue(30000, "without_ipo")).toBe("itb");
  });
});

describe("Committee review thresholds", () => {
  it("derives the LPC threshold from the ITB/RFP value (App. F2 §2)", () => {
    expect(lpcThreshold("with_ipo")).toBe(50000);
    expect(lpcThreshold("without_ipo")).toBe(25000);
    expect(lpcThreshold("hq")).toBe(80000);
  });

  it("uses USD 500k for Decentralized Offices and USD 200k at HQ for HQPC", () => {
    expect(hqpcThreshold("with_ipo")).toBe(500000);
    expect(hqpcThreshold("hq")).toBe(200000);
  });

  it("does NOT escalate an ordinary competitive ITB to RPC or HQPC on value alone", () => {
    const mods = getModifiers("with_ipo", "P3");
    const itbCommittee = mods.filter(m =>
      m.applicable.includes("itb") && /RPC|HQPC/.test(m.addStep?.name ?? ""));
    // Every RPC/HQPC step reachable from an ITB must be conditioned on something
    // other than plain value: a Distributed/Exceptional award basis, a deviation,
    // >5m, or extended term.
    for (const m of itbCommittee) {
      expect(m.key).not.toBe("rpc_itb");
      expect(["rpc_exceptional", "hqpc_exceptional", "hqpc_5m",
              "deviation_rpc", "deviation_hqpc", "extended_term"]).toContain(m.key);
    }
  });

  it("gates RPC review of an Exceptional Award to 200k–499,999", () => {
    const m = getModifiers("with_ipo", "P3").find(x => x.key === "rpc_exceptional");
    expect(m.minValue).toBe(RPC_MIN);
    expect(m.maxValue).toBe(RPC_MAX);
  });

  it("requires ex ante HQPC review above USD 5m regardless of Award Basis", () => {
    const m = getModifiers("with_ipo", "P3").find(x => x.key === "hqpc_5m");
    expect(m.minValue).toBe(HQPC_EXCEPTIONAL_VALUE + 1);
    expect(m.applicable).toContain("itb");
    expect(m.applicable).toContain("direct_procurement");
  });

  it("moves the LPC trigger for Direct Procurement with the office tier", () => {
    expect(getModifiers("with_ipo").find(m => m.key === "lpc_direct").minValue).toBe(50001);
    expect(getModifiers("without_ipo").find(m => m.key === "lpc_direct").minValue).toBe(25001);
  });
});

describe("Appendix C1 — procurement authority limits", () => {
  it("reads an FAO Rep with IPO P3 as 500k competitive / 300k exceptional", () => {
    const a = authorityOf("P3");
    expect(a.competitive).toBe(500000);
    expect(a.exceptional).toBe(300000);
  });

  it("triggers re-delegation above the matching authority limit", () => {
    const mods = getModifiers("with_ipo", "P3");
    expect(mods.find(m => m.key === "redelegation").minValue).toBe(500001);
    expect(mods.find(m => m.key === "redelegation_direct").minValue).toBe(300001);
  });

  it("raises the re-delegation trigger for an IPO at P4", () => {
    expect(getModifiers("with_ipo", "P4").find(m => m.key === "redelegation").minValue).toBe(1000001);
  });
});

// The award basis is not knowable when a timeline is planned — the solicitation
// has not been issued, so nobody knows yet how many responsive offers arrive.
describe("Award Basis is not a planning input", () => {
  it("offers no Exceptional Award circumstance to tick at planning time", () => {
    for (const tier of ["with_ipo", "without_ipo", "hq"]) {
      const keys = getModifiers(tier, "P3").map(m => m.key);
      expect(keys, `${tier} still offers an Exceptional Award toggle`)
        .not.toContain("exceptional_award");
    }
  });

  it("adds no Award Basis determination step to any process", () => {
    const P3 = getProcesses("with_ipo");
    for (const key of Object.keys(P3)) {
      const all = buildSteps(key, getModifiers("with_ipo", "P3").map(m => m.key), P3,
                             getModifiers("with_ipo", "P3"));
      expect(all.some(s => /Exceptional Award/.test(s.name)),
        `${key} inserts an Exceptional Award step`).toBe(false);
    }
  });
});

describe("buildSteps — new circumstance shapes", () => {
  const P = getProcesses("with_ipo");
  const M = getModifiers("with_ipo", "P3");
  const names = steps => steps.map(s => s.name);

  it("retimes committee review under email circulation without removing it", () => {
    const base = buildSteps("itb", [], P, M);
    const lpcBase = base.find(s => s.name.startsWith("LPC review"));
    const fast = buildSteps("itb", ["committee_email_circulation"], P, M);
    const lpcFast = fast.find(s => s.name.startsWith("LPC review"));
    expect(lpcBase.maxDays).toBe(10);
    expect(lpcFast.maxDays).toBe(5);
    expect(lpcFast.notes).toMatch(/at least 5 committee members/);
    expect(fast).toHaveLength(base.length);
  });

  it("takes committee review off the critical path under ex post facto review", () => {
    const steps = buildSteps("itb", ["ex_post_facto"], P, M);
    expect(names(steps).some(n => n.startsWith("LPC review"))).toBe(false);
    const last = steps[steps.length - 1];
    expect(last.name).toMatch(/Ex post facto committee review/);
    expect(last.minDays).toBe(0);
    expect(last.maxDays).toBe(0);
  });

  it("still removes an RPC step that another circumstance inserted, when ex post applies", () => {
    const withRpc = buildSteps("itb", ["rpc_exceptional"], P, M);
    expect(names(withRpc).some(n => n.startsWith("RPC review"))).toBe(true);
    const steps = buildSteps("itb", ["rpc_exceptional", "ex_post_facto"], P, M);
    expect(names(steps).some(n => n.startsWith("RPC review"))).toBe(false);
  });

  it("shortens the timeline under Emergency/Exigency rather than adding days", () => {
    // Both circumstances declare minDays/maxDays 0 because they add no step of
    // their own — they retime or relocate committee review. Their real schedule
    // impact must therefore be measured, never read off the circumstance.
    const total = mods => {
      const st = buildSteps("itb", mods, P, M);
      return [st.reduce((a, x) => a + x.minDays, 0), st.reduce((a, x) => a + x.maxDays, 0)];
    };
    const [bMin, bMax] = total([]);
    const [eMin, eMax] = total(["committee_email_circulation"]);
    const [xMin, xMax] = total(["ex_post_facto"]);
    expect(eMin).toBeLessThan(bMin);
    expect(eMax).toBeLessThan(bMax);
    expect(xMin).toBeLessThan(bMin);
    expect(xMax).toBeLessThan(bMax);
    // ex post facto takes committee review off the critical path entirely, so it
    // must save at least as much as merely speeding the meeting up by email.
    expect(bMax - xMax).toBeGreaterThanOrEqual(bMax - eMax);
  });

  it("never takes the RFP evaluation-criteria review ex post — the manual forbids it", () => {
    const steps = buildSteps("rfp", ["ex_post_facto"], P, M);
    expect(names(steps)).toContain("LPC ex-ante review of evaluation methodology & criteria");
    expect(names(steps).some(n => n.startsWith("LPC meeting"))).toBe(false);
  });

  it("keeps RPC review before contract issuance whether or not LPC is also ticked", () => {
    for (const mods of [["lpc_direct", "rpc_direct"], ["rpc_direct"]]) {
      const n = names(buildSteps("direct_procurement", mods, P, M));
      const rpc = n.findIndex(x => x.startsWith("RPC review"));
      expect(rpc).toBeGreaterThan(-1);
      expect(rpc).toBeLessThan(n.length - 1);
      expect(n.at(-1)).toBe("PO / Contract issuance and countersignature");
    }
  });

  it("resolves every modifier anchor against base steps on all three tiers", () => {
    for (const tier of ["hq", "with_ipo", "without_ipo"]) {
      const procs = getProcesses(tier);
      for (const mod of getModifiers(tier, "P3")) {
        for (const key of mod.applicable) {
          if (!mod.addStep || mod.insertAtEnd || mod.insertBeforeLast) continue;
          const anchors = [].concat(mod.insertAfter ?? mod.insertBefore ?? []);
          if (!anchors.length) continue;
          const base = procs[key].steps.map(s => s.name);
          expect(anchors.some(a => base.includes(a)),
            `${mod.key} -> ${key} (${tier}) has no resolvable anchor`).toBe(true);
        }
      }
    }
  });

  it("leaves an unmodified process untouched", () => {
    expect(buildSteps("rfq", [], P, M)).toEqual(P.rfq.steps);
  });
});

describe("Process labels follow the tier", () => {
  it("labels the RFQ band per Appendix G", () => {
    expect(thresholdLabel("rfq", "with_ipo")).toBe("USD 10,001 – USD 50,000");
    expect(thresholdLabel("rfq", "without_ipo")).toBe("USD 5,001 – USD 25,000");
  });
});

describe("Office tier and IPO grade stay consistent", () => {
  it("forces the grade to 'none' for an office without an IPO", () => {
    expect(effectiveGrade("without_ipo", "P3")).toBe("none");
    expect(effectiveGrade("without_ipo", "P4")).toBe("none");
  });

  it("restores a real grade when the tier does have an IPO", () => {
    expect(effectiveGrade("with_ipo", "none")).toBe("P3");
    expect(effectiveGrade("with_ipo", "P4")).toBe("P4");
  });

  it("uses the no-IPO authority limits when the tier has no IPO, whatever the stored grade", () => {
    const mods = getModifiers("without_ipo", "P3");
    expect(mods.find(m => m.key === "redelegation").minValue).toBe(300001);
    expect(mods.find(m => m.key === "redelegation_direct").minValue).toBe(200001);
  });
});

// The Agricultural Input Planner used to carry its own hard-coded 1 000 / 5 000 /
// 25 000 ladder with exclusive comparisons, so it disagreed with the Estimator on
// 9 of 13 band boundaries. Both tools now route through methodForValue().
describe("Planner and Estimator agree on the method", () => {
  const TIERS = ["with_ipo", "without_ipo", "hq"];
  const TYPES = ["goods", "services", "works"];
  const VALUES = [0, 1000, 1001, 2000, 2001, 5000, 5001, 10000, 10001,
                  25000, 25001, 30000, 50000, 50001, 80000, 80001, 250000];

  it("recommends the same method for the same value, on every tier and type", () => {
    for (const tier of TIERS) {
      for (const type of TYPES) {
        for (const v of VALUES) {
          expect(recommendMethod(v, type, tier),
            `planner disagrees at ${v} (${type}, ${tier})`).toBe(methodForValue(v, tier, type));
        }
      }
    }
  });

  it("moves the Planner's recommendation when the office tier changes", () => {
    expect(recommendMethod(30000, "goods", "with_ipo")).toBe("rfq");
    expect(recommendMethod(30000, "goods", "without_ipo")).toBe("itb");
  });

  it("returns no recommendation until a value and type are given", () => {
    expect(recommendMethod("", "goods", "with_ipo")).toBe(null);
    expect(recommendMethod(1000, "", "with_ipo")).toBe(null);
    expect(recommendMethod(-1, "goods", "with_ipo")).toBe(null);
  });
});
