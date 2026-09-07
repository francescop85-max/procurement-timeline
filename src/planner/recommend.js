// src/planner/recommend.js
import { methodForValue } from '../data.js';

/**
 * Appendix G routing for the campaign form. Delegates to methodForValue() so the
 * Planner and the Estimator can never disagree about which method a value needs:
 * the bands are inclusive and move with the profile's office tier, which the
 * hard-coded 1 000 / 5 000 / 25 000 ladder this replaced did not.
 *
 * Lives outside CampaignPanel.jsx so it stays importable from tests without
 * pulling in the component.
 */
export function recommendMethod(value, type, tierKey) {
  if (value === '' || value === null || value === undefined || !type) return null;
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) return null;
  return methodForValue(v, tierKey, type);
}
