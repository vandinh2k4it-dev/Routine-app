import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Chặn zoom bằng hai ngón trên iOS Safari (nhấn đúp đã chặn bằng CSS touch-action)
['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
  document.addEventListener(ev, (e) => e.preventDefault())
);

// Một số bản iOS khi chạy từ Màn hình chính chừa lại một dải ở đáy màn hình ngoài vùng hiển thị.
// Đo phần chênh để thanh tab không cộng thêm vùng an toàn lần nữa.
function measureViewportGap() {
  try {
    const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    let gap = 0;
    if (standalone && window.innerHeight < window.innerWidth * 3) {
      const d = Math.round(window.screen.height - window.innerHeight);
      if (d > 0 && d < 120) gap = d;
    }
    document.documentElement.style.setProperty('--vp-gap', gap + 'px');
  } catch { /* bỏ qua */ }
}
measureViewportGap();
window.addEventListener('resize', measureViewportGap);
window.addEventListener('orientationchange', () => setTimeout(measureViewportGap, 300));

createRoot(document.getElementById('root')).render(<App />);
