import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchGlobalConflictNews } from '../../server/services/serperClient.mjs';
import { runLiveConflictParsing } from '../../server/services/openaiClient.mjs';

test('fetchGlobalConflictNews aggregates and normalizes Serper query set', async () => {
  const originalFetch = global.fetch;
  let calls = 0;

  global.fetch = async (_url, options) => {
    calls += 1;
    const body = JSON.parse(options?.body || '{}');
    const q = String(body.q || '').toLowerCase();
    const topic = q.includes('civil unrest')
      ? 'civil'
      : q.includes('armed conflict hotspots')
        ? 'hotspots'
        : q.includes('war escalation')
          ? 'escalation'
          : 'military';
    return {
      ok: true,
      async json() {
        return {
          news: [
            {
              title: `Conflict Brief ${topic}`,
              snippet: 'Escalation observed',
              source: 'Wire',
              link: `https://example.com/${topic}`,
              date: '2025-12-01',
            },
          ],
        };
      },
    };
  };

  try {
    const out = await fetchGlobalConflictNews({
      apiKey: 'test',
      temporalDate: '2026-02-10',
    });

    assert.equal(calls, 4);
    assert.equal(out.length, 4);
    assert.equal(out[0].source, 'Wire');
    assert.equal(typeof out[0].date, 'string');
  } finally {
    global.fetch = originalFetch;
  }
});

test('runLiveConflictParsing returns strict live node schema', async () => {
  const mockClient = {
    responses: {
      create: async () => ({
        output_text: JSON.stringify([
          {
            id: 'live-1',
            title: 'Khartoum clashes intensify',
            lat: 15.5007,
            lng: 32.5599,
            severity: 'HIGH',
            sitrep: 'Urban combat reported in central districts.',
            timestamp: '2026-01-10T00:00:00Z',
          },
        ]),
      }),
    },
  };

  const nodes = await runLiveConflictParsing({
    client: mockClient,
    model: 'o1',
    fallbackModel: 'gpt-4o-mini',
    rawNews: [
      {
        title: 'Khartoum clashes intensify',
        snippet: 'Urban combat reported in central districts.',
        source: 'Wire',
        date: '2026-01-10',
      },
    ],
  });

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].id, 'live-1');
  assert.equal(nodes[0].severity, 'HIGH');
  assert.equal(nodes[0].lat, 15.5007);
});
