import React, { useRef, useState } from 'react';

export const userName = (u) => (u?.display_name || u?.username || '').trim();

/** Nén ảnh: cắt vuông giữa ảnh, thu về size x size, xuất JPEG data URL */
export function fileToAvatar(file, size = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Vui lòng chọn một file ảnh'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - s) / 2;
        const sy = (img.naturalHeight - s) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(new Error('Không xử lý được ảnh này'));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh (thử ảnh JPG hoặc PNG)'));
    };
    img.src = url;
  });
}

export function Avatar({ user, size = 42, style }) {
  const name = userName(user);
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...style }}>
      {user?.avatar ? <img src={user.avatar} alt={name} /> : (name[0] || '?').toUpperCase()}
    </div>
  );
}

/** Vòng tròn bấm để chọn ảnh */
export function AvatarPicker({ user, value, onChange, onError, size = 92 }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      onChange(await fileToAvatar(f));
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="picker">
      <button type="button" className="picker-btn" onClick={() => ref.current?.click()} aria-label="Chọn ảnh đại diện" style={{ width: size, height: size }}>
        <Avatar user={{ ...user, avatar: value }} size={size} />
        <span className="picker-badge">{busy ? '…' : '📷'}</span>
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      <div className="picker-actions">
        <button type="button" onClick={() => ref.current?.click()}>{value ? 'Đổi ảnh' : 'Thêm ảnh'}</button>
        {value && <button type="button" className="rm" onClick={() => onChange(null)}>Xóa ảnh</button>}
      </div>
    </div>
  );
}
