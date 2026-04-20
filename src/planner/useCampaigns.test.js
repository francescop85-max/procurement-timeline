import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCampaigns } from './useCampaigns.js';

const mockCampaign = {
  id: 'abc123',
  cropName: 'Spring Wheat',
  plantingDate: '2025-05-01',
  prDeadline: '2025-01-10',
  poDeadline: '2025-03-26',
  deliveryDeadline: '2025-05-01',
  fundingProjects: [],
  remarks: '',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useCampaigns', () => {
  it('fetches campaigns on mount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockCampaign],
    }));

    const { result } = renderHook(() => useCampaigns());

    await act(async () => {});

    expect(result.current.campaigns).toEqual([mockCampaign]);
    expect(result.current.loading).toBe(false);
  });

  it('sets loading true while fetching', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(r => { resolve = r; })));

    const { result } = renderHook(() => useCampaigns());
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve({ ok: true, json: async () => [] });
    });
    expect(result.current.loading).toBe(false);
  });

  it('saveCampaign POSTs and updates local state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCampaigns());
    await act(async () => {});

    await act(async () => {
      await result.current.saveCampaign(mockCampaign);
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockCampaign),
    }));
    expect(result.current.campaigns).toContainEqual(mockCampaign);
  });

  it('deleteCampaign DELETEs and removes from local state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [mockCampaign] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCampaigns());
    await act(async () => {});

    await act(async () => {
      await result.current.deleteCampaign('abc123');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns?id=abc123', expect.objectContaining({
      method: 'DELETE',
    }));
    expect(result.current.campaigns).toEqual([]);
  });
});
