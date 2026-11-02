/** Thu nhỏ ảnh về tối đa 1600px, JPEG 85%: đủ rõ để đọc chữ số, nhẹ để gửi nhanh. */
export async function shrinkImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không mở được ảnh này')); i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(url); }
}
