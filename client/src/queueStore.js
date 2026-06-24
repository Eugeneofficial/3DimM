import { create } from 'zustand';

let queueId = 0;

function subscribeProgress(downloadId, onProgress) {
  const es = new EventSource(`/api/download/progress?id=${downloadId}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onProgress(data);
    } catch {}
  };
  es.onerror = () => es.close();
  return () => es.close();
}

async function apiDownload(url, filename) {
  const resp = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, filename }),
  });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { const b = await resp.json(); if (b.error) msg = b.error; } catch {}
    throw new Error(msg);
  }
  return resp.json();
}

export const useQueueStore = create((set, get) => ({
  queue: [],
  activeId: null,

  addToQueue: (url, filename) => {
    const id = ++queueId;
    const item = { id, url, filename: filename || `video_${Date.now()}.mp4`, status: 'pending', progress: null, error: null };
    set((s) => ({ queue: [...s.queue, item] }));
    get().processNext();
    return id;
  },

  processNext: () => {
    const { queue, activeId } = get();
    if (activeId) return;
    const next = queue.find((q) => q.status === 'pending');
    if (!next) return;

    set({ activeId: next.id });
    set((s) => ({
      queue: s.queue.map((q) => (q.id === next.id ? { ...q, status: 'downloading' } : q)),
    }));

    const close = subscribeProgress(next.id, (p) => {
      set((s) => ({
        queue: s.queue.map((q) => (q.id === next.id ? { ...q, progress: p } : q)),
      }));
      if (p.status === 'done' || p.status === 'error') {
        close();
        set((s) => ({
          queue: s.queue.map((q) =>
            q.id === next.id ? { ...q, status: p.status === 'done' ? 'done' : 'error', error: p.error || null } : q,
          ),
          activeId: null,
        }));
        setTimeout(() => get().processNext(), 200);
      }
    });

    apiDownload(next.url, next.filename).then((data) => {
      if (data.error) {
        set((s) => ({
          queue: s.queue.map((q) => (q.id === next.id ? { ...q, status: 'error', error: data.error } : q)),
          activeId: null,
        }));
        setTimeout(() => get().processNext(), 200);
      }
    }).catch((err) => {
      set((s) => ({
        queue: s.queue.map((q) => (q.id === next.id ? { ...q, status: 'error', error: err.message } : q)),
        activeId: null,
      }));
      setTimeout(() => get().processNext(), 200);
    });
  },

  removeFromQueue: (id) => {
    set((s) => ({ queue: s.queue.filter((q) => q.id !== id) }));
  },

  clearDone: () => {
    set((s) => ({ queue: s.queue.filter((q) => q.status !== 'done' && q.status !== 'error') }));
  },
}));
