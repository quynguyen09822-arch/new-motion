#!/usr/bin/env node
/**
 * TỰ XẾP LẠI CHO ĐỔI KHỔ ĐƯỢC — và nói thật là tới đâu thì máy chịu.
 *
 * `place` KHÔNG phải một thuộc tính chỉ đổi CHỖ. Nó đặt **cả chỗ lẫn bề rộng**:
 * một khối 400×220 đang nằm giữa khung, đổi sang `place: 'giua'` là nó phình ra
 * kín cả khung. Nên không thể "tự động chuyển toạ độ sang place" như nghe qua
 * tưởng — với phần lớn phần tử, đó là đổi hình chứ không phải đổi cách khai.
 *
 * Chỉ có đúng MỘT ca thay được mà hình không đổi: phần tử **đã phủ kín khung
 * sẵn** → `place: 'day'` (lọt đúng 0 lề). Công cụ này tìm và đổi những ca đó,
 * rồi báo phần còn lại cần người xếp tay.
 *
 *   node tools/tu-xep-lai.mjs            # chỉ ĐO, không sửa gì
 *   node tools/tu-xep-lai.mjs --ghi      # sửa thật (có sao lưu trước)
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const SCENES = path.join(PROJ, 'scenes');
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GHI = process.argv.includes('--ghi');

/** Phủ kín khung trong sai số 2% — đủ chặt để `place:'day'` không đổi hình. */
function phuKin(e, W, H) {
  const x = e.x ?? 0, y = e.y ?? 0, w = e.w ?? 0, h = e.h ?? 0;
  return w >= W * 0.96 && h >= H * 0.96 && x <= W * 0.02 && y <= H * 0.02;
}

console.log(GHI ? '\nSỬA THẬT (đã sao lưu trước).\n' : '\nCHỈ ĐO — chưa sửa gì. Thêm --ghi để sửa thật.\n');
console.log('clip                     ngoài cùng   đã place   đổi được   phải xếp tay');
console.log('─'.repeat(76));

let tDoi = 0, tTay = 0, tPlace = 0, tCon = 0;
for (const f of readdirSync(SCENES).filter((x) => x.endsWith('.json'))) {
  let d;
  try { d = JSON.parse(readFileSync(path.join(SCENES, f), 'utf8')); } catch { continue; }
  const W = d.meta?.width || 1280, H = d.meta?.height || 720;
  let ngoai = 0, place = 0, doi = 0, tay = 0, con = 0;

  for (const s of d.scenes || []) {
    for (const e of s.elements || []) {
      ngoai++;
      if (e.place) { place++; continue; }
      if (phuKin(e, W, H)) {
        doi++;
        if (GHI) { e.place = 'day'; delete e.w; delete e.h; }
      } else tay++;
    }
    for (const e of s.elements || []) if (e.kind === 'group') con += (e.children || []).length;
  }
  tDoi += doi; tTay += tay; tPlace += place; tCon += con;
  console.log(`${f.replace('.json', '').padEnd(24)}${String(ngoai).padStart(10)}`
    + `${String(place).padStart(11)}${String(doi).padStart(11)}${String(tay).padStart(15)}`);

  if (GHI && doi) {
    const kho = path.join(M, '.hub-video-backups', 'tu-xep-lai');
    mkdirSync(kho, { recursive: true });
    copyFileSync(path.join(SCENES, f), path.join(kho, f));
    // Giữ nguyên cách xuống dòng như `save.js`: mở rồi lưu phải ra y hệt.
    writeFileSync(path.join(SCENES, f), JSON.stringify(d, null, 2));
  }
}

console.log('─'.repeat(76));
console.log(`${'TỔNG'.padEnd(24)}${String(tPlace + tDoi + tTay).padStart(10)}`
  + `${String(tPlace).padStart(11)}${String(tDoi).padStart(11)}${String(tTay).padStart(15)}`);
console.log(`
Đọc bảng này thế nào:

  · "đã place"    — khai vùng đặt sẵn, đổi khổ nào cũng tự xếp lại.
  · "đổi được"    — đang phủ kín khung, đổi sang place:'day' mà HÌNH KHÔNG ĐỔI.
  · "phải xếp tay"— có cỡ riêng. Đổi sang place là phình ra kín khung, tức là
                    ĐỔI HÌNH. Máy không quyết thay người được.
  · ${tCon} món nữa nằm trong cụm — đã do flex xếp, đổi khổ tự chạy.

Nói thẳng: máy chỉ lo được ${tDoi}/${tPlace + tDoi + tTay} món ngoài cùng.
Muốn một clip đổi khổ nào cũng chạy thì phải GOM các món rời vào cụm và cho cụm
khai place — đó là việc xếp lại bố cục, không phải việc đổi một thuộc tính.
Cách đỡ tốn nhất: dựng clip mới bằng "Bộ dựng sẵn", vì mọi bộ đều khai place sẵn.
`);
