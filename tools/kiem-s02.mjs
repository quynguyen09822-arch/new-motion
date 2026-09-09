/**
 * ĐO LẠI MÀN S02 BẰNG TRÌNH DUYỆT THẬT.
 *
 * `ve-s02.py` ước bề rộng chữ bằng công thức (số ký tự × cỡ chữ). Ước thì sai
 * vài phần trăm — đủ để một dòng dài tràn khỏi bong bóng mà bộ kiểm phía Python
 * không thấy. Ở đây dựng clip trong Chromium rồi đo `getBoundingClientRect()`
 * thật, và bắt ba loại lỗi:
 *
 *   1. Thành phần thò ra ngoài khung hình.
 *   2. Con thò ra ngoài cửa sổ chứa nó (bản kê `kiem-s02.json` do Python ghi).
 *   3. Chữ bị BẺ XUỐNG DÒNG ngoài ý muốn. Đây là lỗi khó thấy nhất: chữ không
 *      tràn ngang (nên `scrollWidth` vẫn bằng `clientWidth`) mà cao thêm một
 *      dòng rồi đè lên thứ bên dưới. Bắt bằng cách ép `nowrap` rồi đo lại bề
 *      rộng thật của từng dòng — rộng hơn ô đã khai tức là nó đã bị bẻ.
 *
 * Chạy: node tools/kiem-s02.mjs [đường-dẫn-ảnh.png]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production/tools/node_modules/playwright/index.mjs';

const BANG_KE = JSON.parse(readFileSync(path.join(import.meta.dirname, 'kiem-s02.json'), 'utf8'));
const URL_CLIP = 'http://127.0.0.1:7803/clip/scene-player.html?scene=thu-ve-lai-s02';
const ANH = process.argv[2];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const loiJS = [];
p.on('pageerror', (e) => loiJS.push(String(e)));

await p.goto(URL_CLIP, { waitUntil: 'load' });
await p.waitForFunction(() => window.__clip && window.__clip.duration > 0, { timeout: 20000 });
// Chốt ở cuối clip: lúc đó MỌI thành phần đã hiện, mới đo được hết.
await p.evaluate(() => window.__clip.seek(window.__clip.duration - 0.4));
await p.waitForTimeout(500);

const kq = await p.evaluate((ke) => {
  /** Bề rộng THẬT của dòng dài nhất, đo khi cấm bẻ dòng. */
  const doRong = (n) => {
    const dong = [...n.querySelectorAll('.t .d, .s')];
    if (!dong.length) return {};
    const cu = dong.map((d) => d.style.whiteSpace);
    dong.forEach((d) => { d.style.whiteSpace = 'nowrap'; });
    const can = Math.max(...dong.map((d) => d.scrollWidth));
    dong.forEach((d, i) => { d.style.whiteSpace = cu[i]; });
    return { can, soDong: dong.length };
  };
  const cam = document.querySelector('#cam').getBoundingClientRect();
  // Quy về hệ toạ độ gốc của clip: sân khấu bị `fit()` thu nhỏ cho vừa cửa sổ.
  const ti = ke.w / cam.width;
  const doc = {};
  for (const n of document.querySelectorAll('.el')) {
    const r = n.getBoundingClientRect();
    doc[n.dataset.el] = {
      x: (r.left - cam.left) * ti, y: (r.top - cam.top) * ti,
      w: r.width * ti, h: r.height * ti,
      ...doRong(n),
    };
  }
  return { doc, ti, soEl: Object.keys(doc).length };
}, BANG_KE);

const loi = [];
const lam = (n) => `${Math.round(n)}`;
for (const [id, r] of Object.entries(kq.doc)) {
  if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > BANG_KE.w + 0.5 || r.y + r.h > BANG_KE.h + 0.5) {
    loi.push(`\`${id}\` thò ra ngoài khung hình: (${lam(r.x)},${lam(r.y)}) ${lam(r.w)}×${lam(r.h)}`);
  }
  const cha = BANG_KE.trong[id];
  const c = cha && kq.doc[cha];
  if (c && (r.x < c.x - 0.5 || r.y < c.y - 0.5
            || r.x + r.w > c.x + c.w + 0.5 || r.y + r.h > c.y + c.h + 0.5)) {
    loi.push(`\`${id}\` thò ra ngoài \`${cha}\`: (${lam(r.x)},${lam(r.y)}) ${lam(r.w)}×${lam(r.h)}`
      + ` — cửa sổ (${lam(c.x)},${lam(c.y)}) ${lam(c.w)}×${lam(c.h)}`);
  }
  if (r.can != null && r.can * kq.ti > r.w + 0.5) {
    loi.push(`\`${id}\`: chữ bị bẻ dòng — cần ${lam(r.can * kq.ti)}px, `
      + `ô chỉ khai ${lam(r.w)}px (thiếu ${lam(r.can * kq.ti - r.w)}).`);
  }
}

if (ANH) { await p.screenshot({ path: ANH }); console.log(`Ảnh: ${ANH}`); }
await b.close();

console.log(`Đo ${kq.soEl} thành phần (sân khấu thu ${(1 / kq.ti).toFixed(3)}×).`);
if (loiJS.length) console.log(`✗ Lỗi JS: ${loiJS.join('; ')}`);
if (loi.length) {
  console.log(`✗ ${loi.length} chỗ sai:`);
  loi.forEach((l) => console.log('   ·', l));
  process.exit(1);
}
console.log('✅ Toạ độ chuẩn: không thành phần nào thò ra, không chữ nào tràn.');
