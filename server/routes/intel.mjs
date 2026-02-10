import express from 'express';
import { fetchGlobalConflictNews, searchGoogleNews } from '../services/serperClient.mjs';
import {
  createOpenAiClient,
  runNodeGeneration,
  runLiveConflictParsing,
  prefilterProphetCandidates,
  runProphetReasoning,
  runStrategicAnalysis,
} from '../services/openaiClient.mjs';
import { dedupeNodesByCoordinates } from '../utils/intel.mjs';

const router = express.Router();

const toCategory = (text) => {
  const normalized = text.toLowerCase();
  if (normalized.includes('cyber') || normalized.includes('hack')) return 'CYBER';
  if (normalized.includes('naval') || normalized.includes('sea') || normalized.includes('maritime')) return 'MARITIME';
  if (normalized.includes('election') || normalized.includes('diplomatic') || normalized.includes('sanction')) return 'POLITICAL';
  return 'CONFLICT';
};

const dedupeNews = (items) => {
  const map = new Map();
  for (const item of items) {
    const key = `${item.link}|${item.title.toLowerCase()}|${item.source.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
};

const DEFAULT_REGIONS = [
  'Middle East',
  'Sahel',
  'Eastern Europe',
  'Southeast Asia',
  'Horn of Africa',
  'South Asia',
  'East Asia',
  'Latin America',
  'North America',
  'Oceania',
];

const GLOBAL_CONFLICT_QUERY = 'Armed Conflict OR Civil Unrest OR Cyber Warfare';
let lastLiveSnapshot = null;
const FALLBACK_SEED_OSINT = [
  {
    title: 'Ukraine frontline artillery exchanges continue in Donbas',
    snippet: 'Sustained shelling and drone strikes reported near Donetsk and Luhansk sectors.',
    source: 'Fallback OSINT',
    date: '2026-01-15',
    link: '',
    queryDateContext: '2026-02-10',
  },
  {
    title: 'Gaza-Israel cross-border strikes persist',
    snippet: 'Renewed exchanges and urban combat pressure continue around Gaza perimeter.',
    source: 'Fallback OSINT',
    date: '2026-01-12',
    link: '',
    queryDateContext: '2026-02-10',
  },
  {
    title: 'Sudan urban clashes intensify in Khartoum corridor',
    snippet: 'Armed confrontations and mobility restrictions reported in central districts.',
    source: 'Fallback OSINT',
    date: '2026-01-10',
    link: '',
    queryDateContext: '2026-02-10',
  },
  {
    title: 'Sahel insurgent activity spikes across tri-border zone',
    snippet: 'Militant attacks and force deployments reported in Mali-Burkina-Niger belt.',
    source: 'Fallback OSINT',
    date: '2025-12-28',
    link: '',
    queryDateContext: '2026-02-10',
  },
  {
    title: 'Myanmar conflict areas report renewed fighting',
    snippet: 'Armed groups and military units engaged near key transport corridors.',
    source: 'Fallback OSINT',
    date: '2026-01-08',
    link: '',
    queryDateContext: '2026-02-10',
  },
];
const FALLBACK_SEED_NODES = [
  {
    id: 'seed-ukraine-donbas',
    title: 'Donbas frontline pressure',
    lat: 48.4,
    lng: 37.9,
    severity: 'HIGH',
    sitrep: 'Sustained artillery and drone activity across Donbas sectors.',
    timestamp: '2026-01-15T00:00:00Z',
  },
  {
    id: 'seed-gaza',
    title: 'Gaza perimeter combat activity',
    lat: 31.5,
    lng: 34.45,
    severity: 'HIGH',
    sitrep: 'Cross-border strikes and urban combat pressure remain elevated.',
    timestamp: '2026-01-12T00:00:00Z',
  },
  {
    id: 'seed-khartoum',
    title: 'Khartoum urban clashes',
    lat: 15.5007,
    lng: 32.5599,
    severity: 'HIGH',
    sitrep: 'Armed confrontations persist in key Khartoum districts.',
    timestamp: '2026-01-10T00:00:00Z',
  },
  {
    id: 'seed-sahel',
    title: 'Sahel tri-border insurgency activity',
    lat: 15.3,
    lng: -0.1,
    severity: 'MEDIUM',
    sitrep: 'Insurgent mobility and attacks reported across the tri-border belt.',
    timestamp: '2025-12-28T00:00:00Z',
  },
  {
    id: 'seed-myanmar',
    title: 'Myanmar corridor fighting',
    lat: 21.2,
    lng: 96.0,
    severity: 'MEDIUM',
    sitrep: 'Renewed fighting reported along transport corridors.',
    timestamp: '2026-01-08T00:00:00Z',
  },
];

const withTimeout = async (promise, ms, label) => {
  let timeoutId;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

router.get('/live', async (_req, res) => {
  if (!process.env.SERPER_API_KEY) {
    return res.status(500).json({ error: 'SERPER_API_KEY is not configured.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
  }

  try {
    const temporalDate = new Date().toISOString().slice(0, 10);
    let raw = await withTimeout(
      fetchGlobalConflictNews({
        apiKey: process.env.SERPER_API_KEY,
        temporalDate,
      }),
      6000,
      'fetchGlobalConflictNews'
    ).catch(() => []);

    if (raw.length === 0) {
      const fallbackQueries = [
        'armed conflict Middle East',
        'civil unrest Africa',
        'conflict Eastern Europe',
        'insurgency South Asia',
      ];

      const settled = await Promise.allSettled(
        fallbackQueries.map((query) =>
          withTimeout(
            searchGoogleNews({
              apiKey: process.env.SERPER_API_KEY,
              query,
              temporalDate,
              timePeriod: 'custom',
              startDate: '2020-01-01',
              endDate: temporalDate,
            }),
            4000,
            `fallback-search:${query}`
          ).catch(() => [])
        )
      );

      raw = settled
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value)
        .map((item) => ({
          title: item.title,
          snippet: item.snippet,
          source: item.source,
          date: item.publishedAt || temporalDate,
          link: item.link,
          queryDateContext: item.queryDateContext,
        }))
        .slice(0, 80);
    }

    if (raw.length === 0 && lastLiveSnapshot) {
      return res.json({
        ...lastLiveSnapshot,
        metadata: {
          ...lastLiveSnapshot.metadata,
          stale: true,
          rangeEnd: temporalDate,
        },
      });
    }

    if (raw.length === 0) {
      return res.json({
        nodes: FALLBACK_SEED_NODES,
        raw: FALLBACK_SEED_OSINT,
        metadata: {
          source: 'fallback-seed',
          rangeStart: '2020-01-01',
          rangeEnd: temporalDate,
          degraded: true,
        },
      });
    }

    const client = createOpenAiClient(process.env.OPENAI_API_KEY);
    const nodes = await withTimeout(
      runLiveConflictParsing({
        client,
        model: process.env.OPENAI_LIVE_MODEL || 'o1',
        fallbackModel: process.env.OPENAI_REASONING_FALLBACK || 'gpt-4o-mini',
        rawNews: raw,
      }),
      8000,
      'runLiveConflictParsing'
    ).catch(() => []);

    if (nodes.length > 0) {
      lastLiveSnapshot = {
        nodes,
        raw,
        metadata: {
          source: 'serper-news-live',
          rangeStart: '2020-01-01',
          rangeEnd: temporalDate,
          stale: false,
        },
      };
    } else if (lastLiveSnapshot) {
      return res.json({
        ...lastLiveSnapshot,
        metadata: {
          ...lastLiveSnapshot.metadata,
          stale: true,
          rangeEnd: temporalDate,
        },
      });
    }

    if (nodes.length === 0) {
      return res.json({
        nodes: FALLBACK_SEED_NODES,
        raw: raw.length > 0 ? raw : FALLBACK_SEED_OSINT,
        metadata: {
          source: 'fallback-seed',
          rangeStart: '2020-01-01',
          rangeEnd: temporalDate,
          degraded: true,
        },
      });
    }

    return res.json({
      nodes,
      raw,
      metadata: {
        source: 'serper-news-live',
        rangeStart: '2020-01-01',
        rangeEnd: temporalDate,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Live ingestion failed.' });
  }
});

router.post('/search', async (req, res) => {
  const {
    query,
    temporalDate,
    timePeriod = 'custom',
    startDate = '2020-01-01',
    endDate = temporalDate,
    regions = DEFAULT_REGIONS,
    maxNodes = 20,
    includeGlobalHotspots = false,
  } = req.body || {};

  if (!temporalDate) {
    return res.status(400).json({ error: 'temporalDate is required.' });
  }

  try {
    const regionalQueries = includeGlobalHotspots
      ? regions.map((region) => `${GLOBAL_CONFLICT_QUERY} ${region}`)
      : [`${query || GLOBAL_CONFLICT_QUERY}`];

    const searches = process.env.SERPER_API_KEY
      ? regionalQueries.map((regionalQuery) =>
          searchGoogleNews({
            apiKey: process.env.SERPER_API_KEY,
            query: regionalQuery,
            temporalDate,
            timePeriod,
            startDate,
            endDate,
          })
        )
      : [];

    const settled = await Promise.allSettled(searches);
    const rawNews = settled
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value);
    const raw = dedupeNews(rawNews).slice(0, 80);
    const maxNodeCount = Math.max(10, Math.min(20, Number(maxNodes)));
    let generated = [];

    if (raw.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        const client = createOpenAiClient(process.env.OPENAI_API_KEY);
        generated = await runNodeGeneration({
          client,
          model: process.env.OPENAI_REASONING_MODEL || 'gpt-4o',
          fallbackModel: process.env.OPENAI_REASONING_FALLBACK || 'gpt-4o-mini',
          query: includeGlobalHotspots ? GLOBAL_CONFLICT_QUERY : query,
          rawNews: raw,
          startDate,
          endDate,
        });
      } catch (error) {
        console.warn('Node generation failed, returning empty real-data set.', error?.message || error);
      }
    }

    const dedupedNodes = dedupeNodesByCoordinates(generated).slice(0, maxNodeCount);
    const center = [20, 0];
    const zoom = 2;

    const sitreps = dedupedNodes.map((node, idx) => ({
      id: `SR-EXT-${Date.now()}-${idx}`,
      title: node.title,
      coordinates: [node.lat, node.lng],
      timestamp: node.timestamp || `${startDate}T00:00:00Z`,
      threatLevel: node.severity,
      description: node.summary,
      category: node.category || toCategory(node.title),
      entities: {
        people: [],
        places: includeGlobalHotspots ? ['Global'] : [query || 'Global'],
        orgs: node.actors?.length ? node.actors : ['OSINT Source'],
      },
      rawOsint: raw.filter((item) => (node.sourceLinks || []).includes(item.link)),
      riskScore: node.confidence,
    }));

    return res.json({
      sitreps,
      center,
      zoom,
      raw,
      metadata: {
        degraded: raw.length === 0,
        rawCount: raw.length,
        nodeCount: sitreps.length,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Search agent failed.' });
  }
});

router.post('/analyze', async (req, res) => {
  const { sitrep, rawOsint } = req.body || {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
  }

  if (!sitrep) {
    return res.status(400).json({ error: 'sitrep is required.' });
  }

  try {
    const client = createOpenAiClient(process.env.OPENAI_API_KEY);
    const analysis = await runStrategicAnalysis({
      client,
      model: process.env.OPENAI_REASONING_MODEL || 'gpt-4o',
      fallbackModel: process.env.OPENAI_REASONING_FALLBACK || 'gpt-4o-mini',
      sitrep,
      rawOsint: Array.isArray(rawOsint) ? rawOsint : [],
    });

    return res.json(analysis);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Reasoning agent failed.' });
  }
});

router.post('/prophet', async (req, res) => {
  const { osintBatch, temporalDate } = req.body || {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
  }

  if (!Array.isArray(osintBatch)) {
    return res.status(400).json({ error: 'osintBatch must be an array.' });
  }

  try {
    const client = createOpenAiClient(process.env.OPENAI_API_KEY);
    const candidates = await prefilterProphetCandidates({
      client,
      model: process.env.OPENAI_PREFILTER_MODEL || 'gpt-4o-mini',
      osintBatch,
    });

    const nodes = await runProphetReasoning({
      client,
      model: process.env.OPENAI_REASONING_MODEL || 'gpt-4o',
      fallbackModel: process.env.OPENAI_REASONING_FALLBACK || 'gpt-4o-mini',
      osintBatch: candidates,
      temporalDate,
    });

    const prophetNodes = nodes.map((node, idx) => ({
      id: `PR-${Date.now()}-${idx}`,
      title: node.title,
      coordinates: node.coordinates,
      timestamp: `${temporalDate}T00:00:00Z`,
      probabilityAnalysis: node.probabilityAnalysis,
      leadingIndicators: node.leadingIndicators,
      confidence: node.confidence,
      sourceLinks: node.sourceLinks,
    }));

    return res.json({ prophetNodes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Prophet agent failed.' });
  }
});

export default router;
