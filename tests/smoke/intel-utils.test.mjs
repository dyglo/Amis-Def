import test from 'node:test';
import assert from 'node:assert/strict';

import { dedupeNodesByCoordinates } from '../../server/utils/intel.mjs';
import { searchGoogleNews } from '../../server/services/serperClient.mjs';

test('dedupeNodesByCoordinates removes coordinate duplicates', () => {
  const input = [
    { lat: 10.1211, lng: 20.4511, title: 'A' },
    { lat: 10.1249, lng: 20.4549, title: 'B' },
    { lat: -4.1, lng: 40.1, title: 'C' },
  ];

  const out = dedupeNodesByCoordinates(input);
  assert.equal(out.length, 2);
  assert.equal(out[0].title, 'A');
  assert.equal(out[1].title, 'C');
});

test('searchGoogleNews retries on transient failure and eventually resolves', async () => {
  const originalFetch = global.fetch;
  let calls = 0;

  global.fetch = async () => {
    calls += 1;
    if (calls < 2) {
      throw new Error('transient network error');
    }

    return {
      ok: true,
      async json() {
        return {
          news: [
            {
              title: 'Conflict report',
              snippet: 'Escalation observed',
              source: 'Test Source',
              link: 'https://example.com/a',
              date: '2024-01-01',
            },
          ],
        };
      },
    };
  };

  try {
    const items = await searchGoogleNews({
      apiKey: 'x',
      query: 'test',
      temporalDate: '2026-02-10',
      timePeriod: 'custom',
      startDate: '2020-01-01',
      endDate: '2026-02-10',
    });

    assert.equal(calls, 2);
    assert.equal(items.length, 1);
    assert.equal(items[0].source, 'Test Source');
  } finally {
    global.fetch = originalFetch;
  }
});
