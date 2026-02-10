import OpenAI from 'openai';

const clampRisk = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const safeArray = (value) => (Array.isArray(value) ? value.filter(Boolean).map(String) : []);
const safeObjectArray = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);
const DEFAULT_FALLBACK_MODELS = ['gpt-4o-mini', 'gpt-4.1-mini', 'o1-mini'];

const extractText = (response) => {
  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  const segments = [];
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const c of content) {
      if (c.type === 'output_text' && typeof c.text === 'string') {
        segments.push(c.text);
      }
    }
  }

  return segments.join('\n').trim();
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(text.slice(arrayStart, arrayEnd + 1));
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('Model did not return JSON payload.');
  }
};

const DEFAULT_ANALYSIS = {
  strategicOverview: 'Analysis pipeline produced partial output; fallback synthesis applied.',
  geopoliticalImplications: 'Immediate Facts:\n- Data stream degraded.\n\nStrategic Deductions:\n- Maintain elevated surveillance posture.',
  recommendedResponse: 'Maintain ISR coverage and re-run deep analysis.',
  links: [],
  riskScore: 50,
  immediateFacts: ['Data stream degraded.'],
  strategicDeductions: ['Maintain elevated surveillance posture.'],
  actors: { state: [], nonState: [] },
  reasoningSteps: ['Fallback parser activated.'],
};

const buildAnalysisPrompt = ({ sitrep, rawOsint }) => {
  const osintLines = rawOsint
    .map((item, idx) => `${idx + 1}. [${item.source}] ${item.title} | ${item.snippet} | ${item.link}`)
    .join('\n');

  return [
    'Conduct a deep strategic analysis of the following OSINT news data.',
    'Think through the immediate tactical threat, identify the primary state/non-state actors involved, and deduce the long-term geopolitical implications for the region.',
    'Do not provide a surface-level summary; provide a logic-backed SITREP.',
    '',
    `SITREP CONTEXT: ${sitrep.title} | ${sitrep.category} | ${sitrep.timestamp}`,
    `COORDINATES: ${sitrep.coordinates.join(', ')}`,
    `DESCRIPTION: ${sitrep.description}`,
    '',
    'OSINT FEED:',
    osintLines || 'No OSINT entries were returned.',
    '',
    'Return ONLY valid JSON with keys:',
    '{',
    '  "riskScore": number(0-100),',
    '  "immediateFacts": string[],',
    '  "strategicDeductions": string[],',
    '  "actors": { "state": string[], "nonState": string[] },',
    '  "reasoningSteps": string[],',
    '  "recommendedResponse": string,',
    '  "strategicOverview": string',
    '}',
  ].join('\n');
};

const buildProphetPrompt = ({ osintBatch, temporalDate }) => {
  const feed = osintBatch
    .map((item, idx) => `${idx + 1}. ${item.title} | ${item.snippet} | ${item.source}`)
    .join('\n');

  return [
    `Temporal context date: ${temporalDate}`,
    'Based on news from 2020 to early 2026, identify regions with high latent tension but no active kinetic conflict.',
    'Cross-reference these summaries with economic volatility and historical conflict escalation archetypes.',
    'Return ONLY valid JSON:',
    '{ "prophetNodes": [{ "title": string, "coordinates": [number, number], "confidence": number, "probabilityAnalysis": string, "leadingIndicators": string[], "sourceLinks": string[] }] }',
    '',
    'OSINT FEED:',
    feed || 'No candidate feed.',
  ].join('\n');
};

export const createOpenAiClient = (apiKey) => new OpenAI({ apiKey });

const isOReasoningModel = (model) => /^o\d/i.test(String(model || ''));

const buildModelChain = (primary, fallback) => {
  const chain = [primary, fallback, ...DEFAULT_FALLBACK_MODELS]
    .filter(Boolean)
    .map((m) => String(m).trim());
  return Array.from(new Set(chain));
};

const runWithModelChain = async ({ client, prompt, primary, fallback }) => {
  const models = buildModelChain(primary, fallback);
  let lastError;

  for (const model of models) {
    try {
      const request = {
        model,
        input: prompt,
      };

      if (isOReasoningModel(model)) {
        request.reasoning = { effort: 'medium' };
      }

      return await client.responses.create(request);
    } catch (error) {
      lastError = error;
      const isNotFound = error?.code === 'model_not_found' || error?.status === 404;
      if (!isNotFound) {
        // Continue to fallbacks for any provider-side error, but keep track.
      }
    }
  }

  throw lastError || new Error('All model fallbacks failed.');
};

const normalizeCategory = (value) => {
  const v = String(value || '').toUpperCase();
  if (v.includes('CYBER')) return 'CYBER';
  if (v.includes('MARITIME')) return 'MARITIME';
  if (v.includes('POLITICAL')) return 'POLITICAL';
  return 'CONFLICT';
};

const normalizeSeverity = (value) => {
  const v = String(value || '').toUpperCase();
  if (v === 'CRITICAL' || v === 'HIGH' || v === 'MEDIUM' || v === 'LOW') return v;
  return 'MEDIUM';
};

const fallbackCoordinatesFromText = (text, index = 0) => {
  const t = String(text || '').toLowerCase();
  const hints = [
    { keys: ['middle east', 'gaza', 'israel', 'lebanon', 'syria'], point: [31.8, 35.2] },
    { keys: ['sahel', 'mali', 'burkina', 'niger'], point: [15.3, -0.1] },
    { keys: ['eastern europe', 'ukraine', 'donetsk'], point: [48.4, 37.9] },
    { keys: ['southeast asia', 'myanmar', 'south china sea'], point: [14.6, 101.0] },
    { keys: ['sudan', 'khartoum'], point: [15.5007, 32.5599] },
    { keys: ['drc', 'goma'], point: [-1.679, 29.222] },
  ];
  const found = hints.find((h) => h.keys.some((k) => t.includes(k)));
  const base = found ? found.point : [20, 0];
  const jitter = (index % 5) * 0.11;
  return [Number((base[0] + jitter).toFixed(4)), Number((base[1] + jitter).toFixed(4))];
};

const buildNodeGenerationPrompt = ({ query, rawNews, startDate, endDate }) => {
  const feed = rawNews
    .map((item, idx) => `${idx + 1}. source=${item.source} | title=${item.title} | date=${item.publishedAt || 'unknown'} | snippet=${item.snippet} | link=${item.link}`)
    .join('\n');

  return [
    'Analyze these news events. For each distinct conflict, generate a structured Tactical Node.',
    'If multiple reports describe the same event, consolidate them into a single high-confidence node.',
    'Use the actual event date from each news snippet/source field when available, not the current system date.',
    'Focus on Armed Conflict, Civil Unrest, and Cyber Warfare.',
    `Scope query: ${query}`,
    `Date window: ${startDate} to ${endDate}`,
    '',
    'Return ONLY valid JSON:',
    '{ "nodes": [{ "lat": number, "lng": number, "title": string, "severity": "LOW|MEDIUM|HIGH|CRITICAL", "category": "CONFLICT|POLITICAL|CYBER|MARITIME", "timestamp": "ISO date", "summary": string, "actors": string[], "confidence": number, "sourceLinks": string[] }] }',
    '',
    'RAW SERPER JSON:',
    feed || 'No entries.',
  ].join('\n');
};

const buildLiveConflictPrompt = (rawNews) => {
  const feed = rawNews
    .map(
      (item, idx) =>
        `${idx + 1}. source=${item.source} | date=${item.date || item.publishedAt || 'unknown'} | title=${item.title} | snippet=${item.snippet}`
    )
    .join('\n');

  return [
    'Parse these OSINT conflict snippets.',
    'Return ONLY a valid JSON array. Do not return markdown or commentary.',
    'Each array object must have exactly these keys:',
    '{ "id": string, "title": string, "lat": number, "lng": number, "severity": "LOW|MEDIUM|HIGH|CRITICAL", "sitrep": string, "timestamp": string }',
    'Use geographically accurate coordinates for the conflict location in each item.',
    '',
    'OSINT FEED:',
    feed || 'No entries.',
  ].join('\n');
};

export const runNodeGeneration = async ({ client, model, fallbackModel, query, rawNews, startDate, endDate }) => {
  const prompt = buildNodeGenerationPrompt({ query, rawNews, startDate, endDate });
  const response = await runWithModelChain({
    client,
    prompt,
    primary: model,
    fallback: fallbackModel,
  });

  try {
    const parsed = parseJson(extractText(response));
    return safeObjectArray(parsed.nodes).map((node, idx) => {
      const [lat, lng] = [
        Number(node.lat),
        Number(node.lng),
      ];

      const fallback = fallbackCoordinatesFromText(`${node.title} ${node.summary} ${query}`, idx);
      const resolvedLat = Number.isFinite(lat) ? lat : fallback[0];
      const resolvedLng = Number.isFinite(lng) ? lng : fallback[1];
      const sourceLinks = safeArray(node.sourceLinks);
      const timestamp = String(node.timestamp || startDate);

      return {
        lat: resolvedLat,
        lng: resolvedLng,
        title: String(node.title || 'Global Hotspot'),
        severity: normalizeSeverity(node.severity),
        category: normalizeCategory(node.category),
        timestamp: timestamp.includes('T') ? timestamp : `${timestamp}T00:00:00Z`,
        summary: String(node.summary || 'OSINT event cluster identified.'),
        actors: safeArray(node.actors),
        confidence: clampRisk(node.confidence),
        sourceLinks,
      };
    });
  } catch (error) {
    console.error('Node generation parse failure:', error);
    return rawNews.slice(0, 12).map((item, idx) => {
      const [lat, lng] = fallbackCoordinatesFromText(`${item.title} ${item.snippet} ${query}`, idx);
      return {
        lat,
        lng,
        title: item.title,
        severity: 'MEDIUM',
        category: normalizeCategory(`${item.title} ${item.snippet}`),
        timestamp: item.publishedAt || `${startDate}T00:00:00Z`,
        summary: item.snippet,
        actors: [],
        confidence: 60,
        sourceLinks: [item.link].filter(Boolean),
      };
    });
  }
};

export const runLiveConflictParsing = async ({ client, model, fallbackModel, rawNews }) => {
  const systemPrompt =
    'You are a Defense Intelligence Analyst. Parse these news snippets and return a valid JSON array of objects. Each object must contain: { id, title, lat, lng, severity, sitrep, timestamp }. Ensure the coordinates (lat/lng) are geographically accurate for the conflict mentioned.';
  const userPrompt = buildLiveConflictPrompt(rawNews);

  const models = buildModelChain(model, fallbackModel);
  let response;
  let lastError;
  for (const currentModel of models) {
    try {
      const request = {
        model: currentModel,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }],
          },
        ],
      };
      if (isOReasoningModel(currentModel)) {
        request.reasoning = { effort: 'high' };
      }
      response = await client.responses.create(request);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!response) {
    throw lastError || new Error('Live conflict parsing model chain failed.');
  }

  try {
    const parsed = parseJson(extractText(response));
    const items = safeObjectArray(Array.isArray(parsed) ? parsed : []);
    return items.map((item, idx) => {
      const fallback = fallbackCoordinatesFromText(`${item.title} ${item.sitrep}`, idx);
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      const timestamp = String(item.timestamp || rawNews[idx]?.date || new Date().toISOString());

      return {
        id: String(item.id || `live-${idx + 1}`),
        title: String(item.title || rawNews[idx]?.title || 'Global Conflict Update'),
        lat: Number.isFinite(lat) ? lat : fallback[0],
        lng: Number.isFinite(lng) ? lng : fallback[1],
        severity: normalizeSeverity(item.severity),
        sitrep: String(item.sitrep || rawNews[idx]?.snippet || 'No sitrep provided.'),
        timestamp: timestamp.includes('T') ? timestamp : `${timestamp}T00:00:00Z`,
      };
    });
  } catch (error) {
    console.error('Live conflict parsing failed:', error);
    return rawNews.slice(0, 20).map((item, idx) => {
      const [lat, lng] = fallbackCoordinatesFromText(`${item.title} ${item.snippet}`, idx);
      return {
        id: `live-fallback-${idx + 1}`,
        title: item.title,
        lat,
        lng,
        severity: 'MEDIUM',
        sitrep: item.snippet,
        timestamp: item.date || item.publishedAt || new Date().toISOString(),
      };
    });
  }
};

export const runStrategicAnalysis = async ({ client, model, fallbackModel, sitrep, rawOsint }) => {
  if (!rawOsint || rawOsint.length === 0) {
    return DEFAULT_ANALYSIS;
  }

  const prompt = buildAnalysisPrompt({ sitrep, rawOsint });
  const response = await runWithModelChain({
    client,
    prompt,
    primary: model,
    fallback: fallbackModel,
  });

  try {
    const parsed = parseJson(extractText(response));
    const immediateFacts = safeArray(parsed.immediateFacts);
    const strategicDeductions = safeArray(parsed.strategicDeductions);

    return {
      strategicOverview: String(parsed.strategicOverview || 'Strategic posture updated.'),
      geopoliticalImplications: `Immediate Facts:\n${immediateFacts.map((x) => `- ${x}`).join('\n') || '- No immediate facts captured.'}\n\nStrategic Deductions:\n${strategicDeductions.map((x) => `- ${x}`).join('\n') || '- No strategic deductions captured.'}`,
      recommendedResponse: String(parsed.recommendedResponse || 'Escalate regional monitoring cadence.'),
      links: rawOsint.map((item) => ({ title: item.source, uri: item.link })).filter((item) => item.uri),
      riskScore: clampRisk(parsed.riskScore),
      immediateFacts,
      strategicDeductions,
      actors: {
        state: safeArray(parsed.actors?.state),
        nonState: safeArray(parsed.actors?.nonState),
      },
      reasoningSteps: safeArray(parsed.reasoningSteps),
    };
  } catch (error) {
    console.error('Analysis parse failure:', error);
    return DEFAULT_ANALYSIS;
  }
};

export const prefilterProphetCandidates = async ({ client, model, osintBatch }) => {
  if (osintBatch.length === 0) return [];

  const prompt = [
    'Select only items showing latent tension likely to escalate within 30 days.',
    'Return ONLY JSON: { "indices": number[] } where each number is 1-based.',
    '',
    ...osintBatch.map((item, idx) => `${idx + 1}. ${item.title} | ${item.snippet}`),
  ].join('\n');

  try {
    const response = await client.responses.create({ model, input: prompt });
    const parsed = parseJson(extractText(response));
    const picks = safeArray(parsed.indices).map((n) => Number(n) - 1).filter((n) => Number.isInteger(n));
    return picks.filter((idx) => idx >= 0 && idx < osintBatch.length).map((idx) => osintBatch[idx]);
  } catch (error) {
    console.error('Prefilter failed:', error);
    return osintBatch.slice(0, 3);
  }
};

export const runProphetReasoning = async ({ client, model, fallbackModel, osintBatch, temporalDate }) => {
  const prompt = buildProphetPrompt({ osintBatch, temporalDate });
  const response = await runWithModelChain({
    client,
    prompt,
    primary: model,
    fallback: fallbackModel,
  });

  try {
    const parsed = parseJson(extractText(response));
    return safeObjectArray(parsed.prophetNodes).map((node) => ({
      title: String(node.title || 'Latent Conflict Projection'),
      coordinates: [
        Number(node.coordinates?.[0] ?? 0),
        Number(node.coordinates?.[1] ?? 0),
      ],
      confidence: clampRisk(node.confidence),
      probabilityAnalysis: String(node.probabilityAnalysis || 'Elevated latent tension observed.'),
      leadingIndicators: safeArray(node.leadingIndicators),
      sourceLinks: safeArray(node.sourceLinks),
    }));
  } catch {
    return [];
  }
};
