import { describe, it, expect } from 'vitest';
import {
  computeBackwardTimeline,
  computeCampaignStatus,
  computeProjectStatuses,
} from './utils.js';
import { PROCESSES, MODIFIERS } from './data.js';

const NO_HOLIDAYS = new Set();

// rfq has 7 steps: maxDays sum = 3+1+6+4+3+3+2 = 22 working days

describe('computeBackwardTimeline', () => {
  it('returns prDeadline earlier than plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01', 'rfq', [], null, 2, NO_HOLIDAYS, PROCESSES, MODIFIERS,
    );
    expect(new Date(result.prDeadline) < new Date('2025-05-01')).toBe(true);
  });

  it('poDeadline is deliveryWeeks * 7 calendar days before plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01', 'rfq', [], null, 2, NO_HOLIDAYS, PROCESSES, MODIFIERS,
    );
    const expectedPo = new Date('2025-05-01');
    expectedPo.setDate(expectedPo.getDate() - 14);
    expect(result.poDeadline).toBe(expectedPo.toLocaleDateString('sv'));
  });

  it('deliveryDeadline equals plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01', 'rfq', [], null, 3, NO_HOLIDAYS, PROCESSES, MODIFIERS,
    );
    expect(result.deliveryDeadline).toBe('2025-05-01');
  });

  it('returns steps array with same length as process steps', () => {
    const result = computeBackwardTimeline(
      '2025-05-01', 'rfq', [], null, 2, NO_HOLIDAYS, PROCESSES, MODIFIERS,
    );
    expect(result.steps).toHaveLength(PROCESSES.rfq.steps.length);
  });

  it('injects custom modifier step before last step', () => {
    const result = computeBackwardTimeline(
      '2025-05-01', 'rfq', [], { label: 'Beneficiary check', days: 5 }, 2,
      NO_HOLIDAYS, PROCESSES, MODIFIERS,
    );
    expect(result.steps).toHaveLength(PROCESSES.rfq.steps.length + 1);
    const customStep = result.steps[result.steps.length - 2];
    expect(customStep.name).toBe('Beneficiary check');
    expect(customStep.maxDays).toBe(5);
  });

  it('earlier plantingDate produces earlier prDeadline', () => {
    const r1 = computeBackwardTimeline('2025-04-01', 'rfq', [], null, 2, NO_HOLIDAYS, PROCESSES, MODIFIERS);
    const r2 = computeBackwardTimeline('2025-05-01', 'rfq', [], null, 2, NO_HOLIDAYS, PROCESSES, MODIFIERS);
    expect(new Date(r1.prDeadline) < new Date(r2.prDeadline)).toBe(true);
  });

  it('zero deliveryWeeks: poDeadline equals plantingDate', () => {
    const result = computeBackwardTimeline(
      '2025-05-01', 'rfq', [], null, 0, NO_HOLIDAYS, PROCESSES, MODIFIERS,
    );
    expect(result.poDeadline).toBe('2025-05-01');
  });
});

describe('computeCampaignStatus', () => {
  const futurePR = '2099-01-01';
  const pastPR = '2000-01-01';
  const futurePO = '2099-02-01';
  const pastPO = '2000-02-01';
  const futureDelivery = '2099-03-01';

  it('returns on_track when today before prDeadline and no project constraints', () => {
    const campaign = {
      prDeadline: futurePR, poDeadline: futurePO, deliveryDeadline: futureDelivery, fundingProjects: [],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('on_track');
  });

  it('returns at_risk when today is after prDeadline', () => {
    const campaign = {
      prDeadline: pastPR, poDeadline: futurePO, deliveryDeadline: futureDelivery, fundingProjects: [],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('at_risk');
  });

  it('returns at_risk when poDeadline exceeds a project end date', () => {
    const campaign = {
      prDeadline: futurePR, poDeadline: '2025-06-01', deliveryDeadline: '2025-07-01',
      fundingProjects: [{ name: 'EU-2025', endDate: '2025-04-30' }],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('at_risk');
  });

  it('returns overdue when deliveryDeadline exceeds a project end date', () => {
    const campaign = {
      prDeadline: futurePR, poDeadline: '2025-03-01', deliveryDeadline: '2025-06-01',
      fundingProjects: [{ name: 'EU-2025', endDate: '2025-04-30' }],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('overdue');
  });

  it('ignores projects without endDate', () => {
    const campaign = {
      prDeadline: futurePR, poDeadline: futurePO, deliveryDeadline: futureDelivery,
      fundingProjects: [{ name: 'TBD', endDate: '' }],
    };
    expect(computeCampaignStatus(campaign, new Date('2025-01-01'))).toBe('on_track');
  });
});

describe('computeProjectStatuses', () => {
  it('marks project ok when PO and delivery are before end date', () => {
    const campaign = {
      poDeadline: '2025-03-01', deliveryDeadline: '2025-04-01',
      fundingProjects: [{ name: 'USAID', endDate: '2025-12-31' }],
    };
    const result = computeProjectStatuses(campaign);
    expect(result[0].status).toBe('ok');
  });

  it('marks project at_risk when PO exceeds end date', () => {
    const campaign = {
      poDeadline: '2025-06-01', deliveryDeadline: '2025-07-01',
      fundingProjects: [{ name: 'EU', endDate: '2025-04-30' }],
    };
    const result = computeProjectStatuses(campaign);
    expect(result[0].status).toBe('at_risk');
  });

  it('returns empty array for no funding projects', () => {
    const campaign = { poDeadline: '2025-03-01', deliveryDeadline: '2025-04-01', fundingProjects: [] };
    expect(computeProjectStatuses(campaign)).toEqual([]);
  });
});
