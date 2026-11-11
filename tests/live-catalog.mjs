import { createCatalog } from '../src/services/catalog/unifiedSearch.js';
import { accessInfo } from '../src/services/catalog/availability.js';

const queries = process.argv.slice(2);
const catalog = createCatalog();

for (const query of queries.length ? queries : ['dom casmurro']) {
  const result = await catalog.search({ query, language: process.env.LANG_FILTER || null });
  console.log(`\n== "${query}" -> ${result.works.length} obras`);
  result.statuses.forEach((s) => console.log(`  ${s.source}: ${s.ok ? `${s.count} registros em ${s.ms} ms` : `FALHOU (${s.error})`}`));
  result.works.slice(0, 6).forEach((w) => {
    const ed = w.editions.length;
    console.log(`  - ${w.title} | ${w.authors.join(', ') || 's/ autor'} | ${w.sources.join('+')} | ${ed} ed. | ${accessInfo(w.best.access.level).label}${w.best.access.inApp ? ' (no app)' : ''} | conf ${w.confidence}`);
  });
}
