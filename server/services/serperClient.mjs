const SERPER_ENDPOINT = 'https://google.serper.dev/news';

const sanitizeSource = (source) => {
  if (!source) return 'Unknown Source';
  if (typeof source === 'string') return source;
  return source.name || source.site || 'Unknown Source';
};

const normalizeNewsItem = (item, temporalDate) => ({
  title: item.title || 'Untitled report',
  snippet: item.snippet || item.description || 'No snippet available.',
  source: sanitizeSource(item.source),
  link: item.link || item.url || '',
  publishedAt: item.date || item.publishedAt,
  queryDateContext: temporalDate,
});

const requestSerperNews = async (apiKey, body) => {
  const response = await fetch(SERPER_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Serper request failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  return Array.isArray(json.news) ? json.news : [];
};

export const searchGoogleNews = async ({ apiKey, query, temporalDate, timePeriod, startDate, endDate }) => {
  const strictQuery = `${query} from ${startDate} to ${endDate}`;
  const strictBody = {
    q: strictQuery,
    gl: 'us',
    hl: 'en',
    num: 20,
    page: 1,
    sort: 'date',
    time_period: timePeriod,
    tbs: `cdr:1,cd_min:${startDate},cd_max:${endDate}`,
    engine: 'google_news',
  };
  const relaxedBody = {
    q: query,
    gl: 'us',
    hl: 'en',
    num: 20,
    page: 1,
    sort: 'date',
    engine: 'google_news',
  };

  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const strictItems = await requestSerperNews(apiKey, strictBody);
      if (strictItems.length > 0) {
        return strictItems.map((item) => normalizeNewsItem(item, temporalDate));
      }

      // If strict date-mode yields nothing, retry with relaxed query for continuity.
      const relaxedItems = await requestSerperNews(apiKey, relaxedBody);
      if (relaxedItems.length > 0) {
        return relaxedItems.map((item) => normalizeNewsItem(item, temporalDate));
      }

      return [];
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError || new Error('Serper request failed.');
};

const dedupeNewsItems = (items) => {
  const map = new Map();
  for (const item of items) {
    const key = `${item.link}|${item.title.toLowerCase()}|${item.source.toLowerCase()}|${item.publishedAt || ''}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
};

export const fetchGlobalConflictNews = async ({ apiKey, temporalDate }) => {
  const startDate = '2020-01-01';
  const endDate = temporalDate;
  const queries = [
    'global military conflicts',
    'civil unrest',
    'armed conflict hotspots',
    'war escalation',
  ];

  const settled = await Promise.allSettled(
    queries.map((query) =>
      searchGoogleNews({
        apiKey,
        query,
        temporalDate,
        timePeriod: 'custom',
        startDate,
        endDate,
      })
    )
  );

  const all = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  return dedupeNewsItems(all)
    .filter((item) => item.title && item.snippet && item.source)
    .map((item) => ({
      title: item.title,
      snippet: item.snippet,
      source: item.source,
      date: item.publishedAt || temporalDate,
      link: item.link || '',
      queryDateContext: item.queryDateContext,
    }))
    .slice(0, 80);
};
