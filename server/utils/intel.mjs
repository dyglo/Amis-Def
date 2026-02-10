export const dedupeNodesByCoordinates = (nodes) => {
  const seen = new Set();
  const unique = [];

  for (const node of nodes) {
    const key = `${Number(node.lat).toFixed(2)},${Number(node.lng).toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(node);
  }

  return unique;
};
