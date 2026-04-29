export const LOA_DEFAULTS = {
  lpcThreshold: 25000,
  authorityLimit: 100000,
};

export const LOA_PROCESSES = {
  direct: {
    label: 'New LoA — Direct Selection',
    color: '#1a7abf',
    steps: [
      { id: 'ds_01', name: 'Direct selection justification preparation', minDays: 3, maxDays: 5 },
      { id: 'ds_02', name: 'Preparation of LoA documentation (LoA + Annex/TOR + Note for File + Routing Slip)', minDays: 3, maxDays: 5 },
      { id: 'ds_03', name: 'Submission to QA Officer', minDays: 1, maxDays: 2 },
      { id: 'ds_04', name: 'Quality Assurance review', minDays: 3, maxDays: 5 },
      { id: 'ds_05', name: 'QA findings and recommendations to RO', minDays: 1, maxDays: 1 },
      { id: 'ds_06', name: 'RO revises documentation / addresses QA comments', minDays: 2, maxDays: 3 },
      { id: 'ds_07', name: 'RRS record creation', minDays: 1, maxDays: 2 },
      { id: 'ds_08', name: 'Submission for approval (Authorized Official)', minDays: 1, maxDays: 2 },
      { id: 'ds_09', name: 'Approvals received', minDays: 1, maxDays: 1 },
      { id: 'ds_10', name: 'Service Provider countersignature', minDays: 1, maxDays: 3 },
      { id: 'ds_11', name: 'GRMS LOA Order creation and submission for approval', minDays: 1, maxDays: 2 },
      { id: 'ds_12', name: 'GRMS LOA Order approved — LoA effective', minDays: 1, maxDays: 1 },
    ],
  },
  eoi: {
    label: 'New LoA — Competitive (EOI)',
    color: '#0d5c96',
    steps: [
      { id: 'eoi_01', name: 'Preparation of EOI documents', minDays: 3, maxDays: 5 },
      { id: 'eoi_02', name: 'QA review and clearance of solicitation documents', minDays: 3, maxDays: 5 },
      { id: 'eoi_03', name: 'Issuance of EOI to market', minDays: 1, maxDays: 2 },
      { id: 'eoi_04', name: 'Receipt and evaluation of expressions of interest / selection of Service Provider', minDays: 7, maxDays: 15 },
      { id: 'eoi_05', name: 'Preparation of LoA documentation (LoA + Annex/TOR + Note for File + Routing Slip)', minDays: 3, maxDays: 5 },
      { id: 'eoi_06', name: 'Submission to QA Officer', minDays: 1, maxDays: 1 },
      { id: 'eoi_07', name: 'Quality Assurance review', minDays: 3, maxDays: 5 },
      { id: 'eoi_08', name: 'QA findings and recommendations to RO', minDays: 1, maxDays: 1 },
      { id: 'eoi_09', name: 'RO revises documentation / addresses QA comments', minDays: 2, maxDays: 3 },
      { id: 'eoi_10', name: 'LPC preparation and submission', minDays: 2, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'eoi_11', name: 'LPC meeting and decision', minDays: 1, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'eoi_12', name: 'RRS record creation', minDays: 1, maxDays: 2 },
      { id: 'eoi_13', name: 'Submission for approval (Authorized Official)', minDays: 1, maxDays: 2 },
      { id: 'eoi_14', name: 'Approvals received', minDays: 1, maxDays: 2 },
      { id: 'eoi_15', name: 'Service Provider countersignature', minDays: 1, maxDays: 3 },
      { id: 'eoi_16', name: 'GRMS LOA Order creation and submission for approval', minDays: 1, maxDays: 2 },
      { id: 'eoi_17', name: 'GRMS LOA Order approved — LoA effective', minDays: 1, maxDays: 2 },
    ],
  },
  ifp: {
    label: 'New LoA — Competitive (IFP with scoring criteria)',
    color: '#083f6e',
    steps: [
      { id: 'ifp_01', name: 'Preparation of IFP documents with scoring criteria', minDays: 3, maxDays: 5 },
      { id: 'ifp_02', name: 'LPC ex-ante: preparation and submission of scoring criteria for endorsement', minDays: 2, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'ifp_03', name: 'LPC ex-ante: meeting and endorsement of scoring criteria', minDays: 1, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'ifp_04', name: 'QA review and clearance of solicitation documents', minDays: 3, maxDays: 5 },
      { id: 'ifp_05', name: 'Issuance of IFP to market', minDays: 1, maxDays: 2 },
      { id: 'ifp_06', name: 'Receipt and evaluation of proposals / selection of Service Provider', minDays: 7, maxDays: 15 },
      { id: 'ifp_07', name: 'Preparation of LoA documentation (LoA + Annex/TOR + Note for File + Routing Slip)', minDays: 3, maxDays: 5 },
      { id: 'ifp_08', name: 'Submission to QA Officer', minDays: 1, maxDays: 1 },
      { id: 'ifp_09', name: 'Quality Assurance review', minDays: 3, maxDays: 5 },
      { id: 'ifp_10', name: 'QA findings and recommendations to RO', minDays: 1, maxDays: 1 },
      { id: 'ifp_11', name: 'RO revises documentation / addresses QA comments', minDays: 2, maxDays: 3 },
      { id: 'ifp_12', name: 'LPC ex-post: preparation and submission', minDays: 2, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'ifp_13', name: 'LPC ex-post: meeting and decision', minDays: 1, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'ifp_14', name: 'RRS record creation', minDays: 1, maxDays: 2 },
      { id: 'ifp_15', name: 'Submission for approval (Authorized Official)', minDays: 1, maxDays: 2 },
      { id: 'ifp_16', name: 'Approvals received', minDays: 1, maxDays: 2 },
      { id: 'ifp_17', name: 'Service Provider countersignature', minDays: 1, maxDays: 3 },
      { id: 'ifp_18', name: 'GRMS LOA Order creation and submission for approval', minDays: 1, maxDays: 2 },
      { id: 'ifp_19', name: 'GRMS LOA Order approved — LoA effective', minDays: 1, maxDays: 2 },
    ],
  },
  amendment_nocost: {
    label: 'Amendment — No Cost',
    color: '#4a7fc1',
    steps: [
      { id: 'amd_nc_01', name: 'Preparation of amendment documentation', minDays: 2, maxDays: 3 },
      { id: 'amd_nc_02', name: 'Submission to QA Officer', minDays: 1, maxDays: 1 },
      { id: 'amd_nc_03', name: 'Quality Assurance review', minDays: 2, maxDays: 3 },
      { id: 'amd_nc_04', name: 'QA findings to RO / RO revises documentation', minDays: 1, maxDays: 2 },
      { id: 'amd_nc_05', name: 'RRS record creation', minDays: 1, maxDays: 2 },
      { id: 'amd_nc_06', name: 'Submission for approval (Authorized Official)', minDays: 1, maxDays: 2 },
      { id: 'amd_nc_07', name: 'Approvals received', minDays: 1, maxDays: 1 },
      { id: 'amd_nc_08', name: 'Service Provider countersignature', minDays: 1, maxDays: 3 },
      { id: 'amd_nc_09', name: 'GRMS LOA Order creation and submission for approval', minDays: 1, maxDays: 2 },
      { id: 'amd_nc_10', name: 'GRMS LOA Order approved — Amendment effective', minDays: 1, maxDays: 1 },
    ],
  },
  amendment_addcost: {
    label: 'Amendment — Additional Cost',
    color: '#1558a0',
    steps: [
      { id: 'amd_ac_01', name: 'Preparation of amendment documentation and Note for File', minDays: 3, maxDays: 5 },
      { id: 'amd_ac_02', name: 'Submission to QA Officer', minDays: 1, maxDays: 1 },
      { id: 'amd_ac_03', name: 'Quality Assurance review', minDays: 3, maxDays: 5 },
      { id: 'amd_ac_04', name: 'QA findings to RO / RO revises documentation', minDays: 2, maxDays: 3 },
      { id: 'amd_ac_05', name: 'LPC preparation and submission', minDays: 2, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'amd_ac_06', name: 'LPC meeting and decision', minDays: 1, maxDays: 3, conditional: 'lpc_threshold' },
      { id: 'amd_ac_07', name: 'RRS record creation', minDays: 1, maxDays: 2 },
      { id: 'amd_ac_08', name: 'Submission for approval (Authorized Official)', minDays: 1, maxDays: 2 },
      { id: 'amd_ac_09', name: 'Approvals received', minDays: 1, maxDays: 2 },
      { id: 'amd_ac_10', name: 'Service Provider countersignature', minDays: 1, maxDays: 3 },
      { id: 'amd_ac_11', name: 'GRMS LOA Order creation and submission for approval', minDays: 1, maxDays: 2 },
      { id: 'amd_ac_12', name: 'GRMS LOA Order approved — Amendment effective', minDays: 1, maxDays: 1 },
    ],
  },
  amendment_reduction: {
    label: 'Amendment — Reduction of Cost',
    color: '#2e6da8',
    steps: [
      { id: 'amd_rc_01', name: 'Preparation of amendment documentation and Note for File', minDays: 3, maxDays: 5 },
      { id: 'amd_rc_02', name: 'Submission to QA Officer', minDays: 1, maxDays: 1 },
      { id: 'amd_rc_03', name: 'Quality Assurance review', minDays: 3, maxDays: 5 },
      { id: 'amd_rc_04', name: 'QA findings to RO / RO revises documentation', minDays: 2, maxDays: 3 },
      { id: 'amd_rc_05', name: 'RRS record creation', minDays: 1, maxDays: 2 },
      { id: 'amd_rc_06', name: 'Submission for approval (Authorized Official)', minDays: 1, maxDays: 2 },
      { id: 'amd_rc_07', name: 'Approvals received', minDays: 1, maxDays: 2 },
      { id: 'amd_rc_08', name: 'Service Provider countersignature', minDays: 1, maxDays: 3 },
      { id: 'amd_rc_09', name: 'GRMS LOA Order creation and submission for approval', minDays: 1, maxDays: 2 },
      { id: 'amd_rc_10', name: 'GRMS LOA Order approved — Amendment effective', minDays: 1, maxDays: 1 },
    ],
  },
};

export function loadLoaSettings() {
  try {
    const raw = localStorage.getItem('loa_settings');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveLoaSettings(settings) {
  try { localStorage.setItem('loa_settings', JSON.stringify(settings)); } catch {}
}

export function getEffectiveSteps(processType, value, loaSettings) {
  const lpcThreshold = loaSettings?.lpcThreshold ?? LOA_DEFAULTS.lpcThreshold;
  const baseSteps = loaSettings?.processSteps?.[processType] ?? LOA_PROCESSES[processType]?.steps ?? [];
  const lpcActive = Number(value) > lpcThreshold;
  return baseSteps.filter(s => !s.conditional || lpcActive);
}
