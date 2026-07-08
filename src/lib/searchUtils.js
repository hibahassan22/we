export function normalizeSearchQuery(query) {
  return String(query ?? "").trim().toLowerCase();
}

export function matchesSearchQuery(query, ...fields) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return fields.some((field) => String(field ?? "").toLowerCase().includes(normalized));
}

export function filterByGlobalSearch(items, query, getFields) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return items;
  return items.filter((item) => {
    const fields = getFields(item);
    return fields.some((field) => String(field ?? "").toLowerCase().includes(normalized));
  });
}
