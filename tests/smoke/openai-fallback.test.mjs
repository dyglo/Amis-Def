import test from 'node:test';
import assert from 'node:assert/strict';

import { runStrategicAnalysis } from '../../server/services/openaiClient.mjs';

test('runStrategicAnalysis falls back when configured model is not found', async () => {
  const calls = [];
  const mockClient = {
    responses: {
      create: async ({ model }) => {
        calls.push(model);
        if (model === 'o1-preview') {
          const err = new Error('model not found');
          err.code = 'model_not_found';
          err.status = 400;
          throw err;
        }

        return {
          output_text: JSON.stringify({
            riskScore: 72,
            immediateFacts: ['Escalation observed'],
            strategicDeductions: ['Regional spillover likely'],
            actors: { state: ['State A'], nonState: ['Group B'] },
            reasoningSteps: ['Compared event velocity'],
            recommendedResponse: 'Increase ISR coverage.',
            strategicOverview: 'High-risk operating environment.',
          }),
        };
      },
    },
  };

  const result = await runStrategicAnalysis({
    client: mockClient,
    model: 'o1-preview',
    fallbackModel: 'o1-mini',
    sitrep: {
      id: 'T1',
      title: 'Test',
      coordinates: [0, 0],
      timestamp: '2025-01-01T00:00:00Z',
      threatLevel: 'MEDIUM',
      description: 'desc',
      category: 'CONFLICT',
      entities: { people: [], places: [], orgs: [] },
    },
    rawOsint: [{ title: 'n', snippet: 's', source: 'x', link: 'https://x', queryDateContext: '2026-01-01' }],
  });

  assert.ok(calls.includes('o1-preview'));
  assert.ok(calls.includes('o1-mini'));
  assert.equal(result.riskScore, 72);
  assert.equal(result.immediateFacts[0], 'Escalation observed');
});
