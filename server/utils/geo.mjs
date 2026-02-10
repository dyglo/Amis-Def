const REGION_HINTS = [
  { key: 'sudan', center: [15.5007, 32.5599] },
  { key: 'jonglei', center: [7.0, 31.5] },
  { key: 'drc', center: [-1.679, 29.222], label: 'Goma' },
  { key: 'goma', center: [-1.679, 29.222] },
  { key: 'sake', center: [-1.574, 29.043] },
  { key: 'gaza', center: [31.3547, 34.3088] },
  { key: 'ukraine', center: [50.4501, 30.5234] },
  { key: 'south china sea', center: [11.5, 114.0] },
];

const findRegion = (text) => {
  const haystack = text.toLowerCase();
  for (const region of REGION_HINTS) {
    if (haystack.includes(region.key)) {
      return region;
    }
  }
  return null;
};

export const inferCenterFromQuery = (query) => {
  const found = findRegion(query || '');
  return found?.center || [15.5007, 32.5599];
};

export const inferCoordinatesForNews = (query, title, idx) => {
  const found = findRegion(`${query} ${title}`);
  const base = found?.center || inferCenterFromQuery(query);
  const jitter = (idx % 3) * 0.09;
  return [
    Number((base[0] + jitter).toFixed(4)),
    Number((base[1] + jitter).toFixed(4)),
  ];
};

export const inferZoomFromQuery = (query) => {
  const found = findRegion(query || '');
  if (!found) return 5;
  if (found.key === 'south china sea' || found.key === 'ukraine') return 4;
  return 6;
};
