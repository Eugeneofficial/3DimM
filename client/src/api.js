const BASE = '/api';

async function request(path, options = {}) {
  const resp = await fetch(`${BASE}${path}`, options);
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      if (body.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return resp;
}

export async function extractUrls(url) {
  const resp = await request(`/extract?url=${encodeURIComponent(url)}`);
  return resp.json();
}

export async function proxyUrl(url) {
  return request(`/proxy?url=${encodeURIComponent(url)}`);
}

export async function speedTest(url) {
  const resp = await request(`/speed-test?url=${encodeURIComponent(url)}`);
  return resp.json();
}

export async function refreshUrl(url, source) {
  const resp = await request(
    `/refresh?url=${encodeURIComponent(url)}${source ? `&source=${encodeURIComponent(source)}` : ''}`,
  );
  return resp.json();
}

export async function getTracks(url) {
  const resp = await request(`/tracks?url=${encodeURIComponent(url)}`);
  return resp.json();
}

export async function startDownload(url, filename) {
  const resp = await request('/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, filename }),
  });
  return resp.json();
}

export async function exportPlaylist(url, quality) {
  const params = new URLSearchParams({ url });
  if (quality) params.set('quality', quality);
  const resp = await request(`/export-playlist?${params.toString()}`);
  return resp.json();
}

export async function detectUrl(url) {
  const resp = await request(`/detect?url=${encodeURIComponent(url)}`);
  return resp.json();
}

export async function getVideoInfo(url) {
  const resp = await request(`/info?url=${encodeURIComponent(url)}`);
  return resp.json();
}

export async function getFormats(url) {
  const resp = await request(`/formats?url=${encodeURIComponent(url)}`);
  return resp.json();
}

export async function universalDownload(url, formatId, filename) {
  const resp = await request('/universal-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formatId, filename }),
  });
  return resp.json();
}

export function subscribeUniversalProgress(downloadId, onProgress) {
  const es = new EventSource(`${BASE}/universal-progress?id=${downloadId}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onProgress(data);
      if (data.status === 'done' || data.status === 'error') {
        es.close();
      }
    } catch {}
  };
  es.onerror = () => es.close();
  return () => es.close();
}

export function subscribeProgress(downloadId, onProgress) {
  const es = new EventSource(`${BASE}/download/progress?id=${downloadId}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onProgress(data);
      if (data.status === 'done' || data.status === 'error') {
        es.close();
      }
    } catch {}
  };
  es.onerror = () => es.close();
  return () => es.close();
}
