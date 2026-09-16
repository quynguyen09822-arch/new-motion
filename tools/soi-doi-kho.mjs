#!/usr/bin/env node
/**
 * SOI TRƯỚC KHI ĐỔI KHỔ — đổi clip sang 16:9 / 9:16 / 1:1 thì hỏng những gì?
 *
 * Chưa đổi gì cả. Đây là phép ĐO trên dữ liệu, chạy bằng Node trần, để trả lời
 * một câu trước khi viết một dòng nào của tính năng đổi khổ:
 *
 *   "Bao nhiêu phần của clip này xếp lại được bằng máy, bao nhiêu phần phải
 *    dựng lại bằng tay hoặc nhờ AI?"
 *
 * Cách tính: thu cả bố cục cho VỪA khổ mới (contain) — giữ đúng tỉ lệ, không
 * bóp méo. Món khai `place` thì bỏ qua, bộ dựng tự xếp lại cho chúng.
 *
 *   node tools/soi-doi-kho.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const SCENES = path.join(PROJ, 'scenes');

const KHO = [
  { ten: '16:9  1920×1080', w: 1920, h: 1080 },
  { ten: '9:16  1080×1920', w: 1080, h: 1920 },
  { ten: '1:1   1080×1080', w: 1080, h: 1080 },
];

/** Cỡ chữ nhỏ hơn mức này thì trên điện thoại coi như không đọc được. */
const CHU_TOI_THIEU = 11;

function duyet(els, ra = []) {
  for (const e of els || []) {
    if (!e || typeof e !== 'object') continue;
    ra.push(e);
    if (e.children) duyet(e.children, ra);
  }
  return ra;
}

function soi(doc, dich) {
  const m = doc.meta || {};
  const W = m.width || 1280, H = m.height || 720;
  const s = Math.min(dich.w / W, dich.h / H);      // contain: giữ tỉ lệ
  const bang = { tong: 0, place: 0, cung: 0, chuMo: 0, s };
  for (const canh of doc.scenes || []) {
    for (const e of duyet(canh.elements)) {
      bang.tong++;
      if (e.place) { bang.place++; continue; }
      bang.cung++;
      if (typeof e.size === 'number' && e.size * s < CHU_TOI_THIEU) bang.chuMo++;
    }
  }
  // Dải trống còn lại sau khi thu vừa: phần khổ mới không được lấp.
  bang.trong = 1 - (W * s * (H * s)) / (dich.w * dich.h);
  return bang;
}

const ds = readdirSync(SCENES).filter((f) => f.endsWith('.json'));
console.log('\nĐổi khổ bằng phép THU VỪA (contain) — chưa đổi gì, chỉ đo trước.\n');
console.log('clip                    khổ gốc      món   place  toạ độ cứng   → khổ đích        thu     dải trống  chữ mờ');
console.log('─'.repeat(112));

const tong = {};
for (const f of ds) {
  let d;
  try { d = JSON.parse(readFileSync(path.join(SCENES, f), 'utf8')); } catch { continue; }
  const m = d.meta || {};
  const goc = `${m.width || 1280}×${m.height || 720}`;
  ds.indexOf(f) && console.log('');
  for (const [i, k] of KHO.entries()) {
    const b = soi(d, k);
    // Khổ đích trùng khổ gốc thì không phải đổi gì.
    const trung = (m.width === k.w && m.height === k.h)
      || Math.abs((m.width / m.height) - (k.w / k.h)) < 0.01;
    const ten = i === 0 ? f.replace('.json', '') : '';
    console.log(
      `${ten.padEnd(23)} ${(i === 0 ? goc : '').padEnd(12)}`
      + `${(i === 0 ? String(b.tong) : '').padStart(4)}  ${(i === 0 ? String(b.place) : '').padStart(5)}`
      + `  ${(i === 0 ? String(b.cung) : '').padStart(11)}   → ${k.ten.padEnd(16)}`
      + `${b.s.toFixed(2)}×  ${(b.trong * 100).toFixed(0).padStart(7)}%`
      + `  ${String(b.chuMo).padStart(6)}${trung ? '   (cùng tỉ lệ)' : ''}`,
    );
    tong[k.ten] = tong[k.ten] || { trong: 0, chuMo: 0, n: 0 };
    if (!trung) { tong[k.ten].trong += b.trong; tong[k.ten].chuMo += b.chuMo; tong[k.ten].n++; }
  }
}

console.log('\n' + '─'.repeat(112));
console.log('Trung bình khi PHẢI đổi tỉ lệ (bỏ qua clip vốn đã đúng tỉ lệ):');
for (const [k, v] of Object.entries(tong)) {
  if (!v.n) continue;
  console.log(`  ${k.padEnd(18)} dải trống ${(v.trong / v.n * 100).toFixed(0)}% khung`
    + ` · ${v.chuMo} món chữ tụt xuống dưới ${CHU_TOI_THIEU}px`);
}
console.log(`
Đọc bảng này thế nào:
  · "dải trống" = phần khổ mới KHÔNG được lấp sau khi thu vừa. Trên 25% là hai
    dải đen to đùng — máy xếp lại kiểu này là đúng toán nhưng xấu, đây chính là
    ca "cần AI can thiệp".
  · "chữ mờ" = số món chữ tụt xuống dưới ${CHU_TOI_THIEU}px sau khi thu.
  · Món khai "place" thì bộ dựng tự xếp lại, không tính vào đây.
`);
