export const ACCESS = {
  DOMINIO_PUBLICO: 'dominio_publico',
  ACESSO_ABERTO: 'acesso_aberto',
  LIVRE: 'livre',
  EMPRESTIMO: 'emprestimo',
  PREVIA: 'previa',
  RESTRITO: 'restrito',
  SEM_TEXTO: 'sem_texto',
  NAO_CONFIRMADO: 'nao_confirmado',
};

export const ACCESS_INFO = {
  [ACCESS.DOMINIO_PUBLICO]: { label: 'Domínio público', free: true, rank: 100, tone: 'good', hint: 'Obra em domínio público, de leitura gratuita.' },
  [ACCESS.ACESSO_ABERTO]: { label: 'Acesso aberto', free: true, rank: 90, tone: 'good', hint: 'Disponibilizado com licença aberta, de leitura gratuita.' },
  [ACCESS.LIVRE]: { label: 'Gratuito', free: true, rank: 80, tone: 'good', hint: 'Leitura gratuita confirmada pela fonte.' },
  [ACCESS.NAO_CONFIRMADO]: { label: 'Condição não confirmada', free: false, rank: 40, tone: 'warn', hint: 'A fonte oferece o texto, mas a condição de direitos não foi confirmada.' },
  [ACCESS.EMPRESTIMO]: { label: 'Empréstimo digital', free: false, rank: 30, tone: 'warn', hint: 'Exige empréstimo na plataforma de origem; não é leitura livre.' },
  [ACCESS.PREVIA]: { label: 'Só prévia', free: false, rank: 20, tone: 'muted', hint: 'Apenas trechos disponíveis; o livro completo não é gratuito.' },
  [ACCESS.RESTRITO]: { label: 'Acesso restrito', free: false, rank: 10, tone: 'muted', hint: 'Acesso limitado por direitos ou necessidades específicas.' },
  [ACCESS.SEM_TEXTO]: { label: 'Sem texto online', free: false, rank: 0, tone: 'muted', hint: 'Apenas registro do livro; nenhum texto disponível nesta fonte.' },
};

export function accessInfo(level) {
  return ACCESS_INFO[level] || ACCESS_INFO[ACCESS.NAO_CONFIRMADO];
}

export function isFree(level) {
  return Boolean(accessInfo(level).free);
}

const has = (list, value) => (Array.isArray(list) ? list : []).some((item) => String(item).toLowerCase() === value);
const joined = (list) => (Array.isArray(list) ? list : []).map((v) => String(v).toLowerCase());

export function classifyOpenLibrary(doc) {
  const state = doc.ebook_access;
  const hasIa = Array.isArray(doc.ia) && doc.ia.length > 0;
  if (state === 'public' && (doc.public_scan_b || hasIa)) {
    return { level: ACCESS.LIVRE, confirmed: true, inApp: false, formats: ['online'], note: 'Acesso público no Internet Archive. A condição legal exata da edição não é informada.' };
  }
  if (state === 'borrowable') return { level: ACCESS.EMPRESTIMO, confirmed: true, inApp: false, formats: ['online'], note: 'Empréstimo digital no Internet Archive; exige conta.' };
  if (state === 'printdisabled') return { level: ACCESS.RESTRITO, confirmed: true, inApp: false, formats: [], note: 'Acesso restrito a leitores com deficiência de leitura impressa.' };
  if (state === 'no_ebook' || !state) return { level: ACCESS.SEM_TEXTO, confirmed: true, inApp: false, formats: [], note: '' };
  return { level: ACCESS.NAO_CONFIRMADO, confirmed: false, inApp: false, formats: [], note: '' };
}

export function classifyInternetArchive(item) {
  const collections = joined(item.collection);
  const license = String(Array.isArray(item.licenseurl) ? item.licenseurl[0] : item.licenseurl || '').toLowerCase();
  const formats = joined(item.format);
  const readable = [];
  if (formats.some((f) => f.includes('epub'))) readable.push('epub');
  if (formats.some((f) => f.includes('text') || f.includes('djvutxt'))) readable.push('txt');
  if (formats.some((f) => f.includes('pdf'))) readable.push('pdf');
  const online = ['online', ...readable];

  if (item['access-restricted-item'] === 'true' || item['access-restricted-item'] === true) {
    const lending = collections.some((c) => ['inlibrary', 'lendinglibrary', 'printdisabled'].includes(c));
    return lending
      ? { level: ACCESS.EMPRESTIMO, confirmed: true, inApp: false, formats: ['online'], note: 'Empréstimo digital no Internet Archive; exige conta.' }
      : { level: ACCESS.RESTRITO, confirmed: true, inApp: false, formats: [], note: 'Item com acesso restrito.' };
  }
  if (collections.some((c) => ['inlibrary', 'lendinglibrary'].includes(c))) {
    return { level: ACCESS.EMPRESTIMO, confirmed: true, inApp: false, formats: ['online'], note: 'Empréstimo digital no Internet Archive; exige conta.' };
  }
  if (collections.includes('printdisabled') && !collections.includes('opensource')) {
    return { level: ACCESS.RESTRITO, confirmed: true, inApp: false, formats: [], note: 'Acesso restrito a leitores com deficiência de leitura impressa.' };
  }
  if (license.includes('publicdomain') || license.includes('/zero/')) {
    return { level: ACCESS.LIVRE, confirmed: false, inApp: false, formats: online, note: 'Marcado como domínio público por quem enviou ao Internet Archive; não verificado de forma independente.' };
  }
  if (license.includes('creativecommons')) {
    return { level: ACCESS.ACESSO_ABERTO, confirmed: true, inApp: false, formats: online, note: 'Licença Creative Commons indicada pelo responsável pelo envio.' };
  }
  return { level: ACCESS.NAO_CONFIRMADO, confirmed: false, inApp: false, formats: online, note: 'Envio da comunidade sem licença informada. Confira os direitos antes de usar.' };
}

export function classifyGoogle(volume) {
  const access = volume.accessInfo || {};
  const sale = volume.saleInfo || {};
  const view = access.viewability;
  const formats = [];
  if (access.epub?.isAvailable) formats.push('epub');
  if (access.pdf?.isAvailable) formats.push('pdf');
  if (view === 'ALL_PAGES' && access.publicDomain) {
    return { level: ACCESS.DOMINIO_PUBLICO, confirmed: true, inApp: false, formats: formats.length ? formats : ['online'], note: 'Domínio público no Google Books; a leitura abre na plataforma deles.' };
  }
  if (view === 'ALL_PAGES') {
    return { level: ACCESS.LIVRE, confirmed: true, inApp: false, formats: formats.length ? formats : ['online'], note: 'Leitura completa no Google Books; abre na plataforma deles.' };
  }
  if (sale.saleability === 'FREE') {
    return { level: ACCESS.LIVRE, confirmed: true, inApp: false, formats: formats.length ? formats : ['online'], note: 'Marcado como gratuito no Google Books.' };
  }
  if (view === 'PARTIAL') return { level: ACCESS.PREVIA, confirmed: true, inApp: false, formats: ['online'], note: 'Apenas prévia no Google Books.' };
  if (view === 'NO_PAGES') return { level: ACCESS.SEM_TEXTO, confirmed: true, inApp: false, formats: [], note: '' };
  return { level: ACCESS.NAO_CONFIRMADO, confirmed: false, inApp: false, formats: [], note: '' };
}

export function classifyGutenberg() {
  return {
    level: ACCESS.DOMINIO_PUBLICO,
    confirmed: true,
    inApp: true,
    formats: ['epub', 'html', 'txt'],
    note: 'Domínio público nos Estados Unidos, conforme o Project Gutenberg. Pode ser lido dentro do app.',
  };
}

export function classifyWikisource() {
  return {
    level: ACCESS.ACESSO_ABERTO,
    confirmed: true,
    inApp: false,
    formats: ['online'],
    note: 'Texto da Wikisource, de domínio público ou licença livre; a leitura abre no navegador.',
  };
}

export function bestOffer(offers) {
  return [...offers].sort((a, b) => {
    const byRank = accessInfo(b.access.level).rank - accessInfo(a.access.level).rank;
    if (byRank) return byRank;
    if (a.access.inApp !== b.access.inApp) return a.access.inApp ? -1 : 1;
    const aEpub = has(a.access.formats, 'epub');
    const bEpub = has(b.access.formats, 'epub');
    if (aEpub !== bEpub) return aEpub ? -1 : 1;
    return (b.access.formats?.length || 0) - (a.access.formats?.length || 0);
  })[0];
}
