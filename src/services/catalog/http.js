const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getText(url, { timeoutMs = 9000, retries = 1, fetchImpl } = {}) {
  const run = fetchImpl || fetch;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await run(url, { signal: controller.signal });
      if (response.ok) return await response.text();
      lastError = Object.assign(new Error(`http-${response.status}`), { status: response.status });
      if (response.status < 500 && response.status !== 429) throw lastError;
    } catch (error) {
      lastError = error;
      if (error?.status && error.status < 500 && error.status !== 429) throw error;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(400 * (attempt + 1));
  }
  throw lastError || new Error('network');
}

export async function getJson(url, options) {
  return JSON.parse(await getText(url, options));
}

export function describeError(error) {
  if (!error) return 'erro desconhecido';
  if (error.name === 'AbortError') return 'demorou demais';
  if (error.status === 429) return 'limite de consultas atingido';
  if (error.status) return `erro ${error.status}`;
  if (error instanceof TypeError) return 'sem conexão';
  return 'indisponível';
}
