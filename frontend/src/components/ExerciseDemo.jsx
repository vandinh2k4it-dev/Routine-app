import React, { useState } from 'react';
import { demoImages } from '../program.js';

/** Ảnh minh họa hai tư thế của bài tập, tự đổi qua lại như ảnh động. Không có ảnh hoặc mất mạng thì không hiện gì. */
export default function ExerciseDemo({ item }) {
  const [failed, setFailed] = useState(false);
  const imgs = demoImages(item);
  if (!imgs || failed) return null;
  return (
    <div className="exdemo" aria-label={`Minh họa ${item.name}`}>
      <img src={imgs[0]} alt={`${item.name} - tư thế đầu`} loading="lazy" onError={() => setFailed(true)} />
      <img className="b" src={imgs[1]} alt={`${item.name} - tư thế cuối`} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}
