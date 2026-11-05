function foldText(value) {
  return (value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matchesQuery(query, fields) {
  const needle = foldText(query).trim();
  if (!needle) return true;
  return fields.some(field => foldText(field).includes(needle));
}
