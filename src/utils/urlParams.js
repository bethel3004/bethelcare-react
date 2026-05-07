// ── 공통 URL 파라미터 유틸 ─────────────────────────────────
export function getHashParams() {
  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return {};
  const params = {};
  hash.slice(qIdx + 1).split('&').forEach(part => {
    const eq = part.indexOf('=');
    if (eq === -1) return;
    params[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(part.slice(eq + 1));
  });
  return params;
}

export function buildHash(page, params) {
  const entries = Object.entries(params)
    .filter(([, v]) => v && v !== '전체' && v !== 'list' && v !== '');
  const base = `#${page}`;
  if (!entries.length) return base;
  const query = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `${base}?${query}`;
}

export function pushHashParams(page, params) {
  const newHash = buildHash(page, params);
  if (window.location.hash !== newHash) window.history.pushState(null, '', newHash);
}
