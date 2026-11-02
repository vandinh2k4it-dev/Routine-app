import { useEffect, useState } from 'react';

/** Tải dữ liệu khi `deps` đổi; `reload()` để tải lại. Dữ liệu cũ vẫn hiện trong lúc tải bản mới. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setErr('');
    fn().then((d) => alive && setData(d)).catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { data, setData, err, loading: data === null && !err, reload: () => setN((x) => x + 1) };
}

// ---------- Giao diện sáng / tối ----------
export function getTheme() {
  return localStorage.getItem('theme') || 'auto';
}
export function applyTheme(t = getTheme()) {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
  else root.removeAttribute('data-theme');
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'light');
}
export function setTheme(t) {
  if (t === 'auto') localStorage.removeItem('theme');
  else localStorage.setItem('theme', t);
  applyTheme(t);
}
