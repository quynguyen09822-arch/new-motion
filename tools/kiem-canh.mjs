/**
 * ĐO LẠI CÁC CLIP DỰNG BẰNG CODE, BẰNG TRÌNH DUYỆT THẬT.
 *
 * Bộ sinh (`ve-*.py`) ước bề rộng chữ bằng công thức (số ký tự × cỡ chữ). Ước
 * thì sai vài phần trăm — đủ để một dòng dài lặng lẽ xuống dòng rồi đè thứ bên
 * dưới. Ở đây dựng clip trong Chromium rồi đo `getBoundingClientRect()` thật.
 *
 * Ba loại lỗi bị chặn:
 *   1. Thành phần thò ra ngoài khung hình.
 *   2. Con thò ra ngoài khối cha (bản kê do bộ sinh ghi).
 *   3. Chữ bị BẺ XUỐNG DÒNG ngoài ý muốn — không tràn ngang nên `scrollWidth`
 *      vẫn bằng `clientWidth`, chỉ cao thêm một dòng. Bắt bằng cách ép `nowrap`
 *      rồi đo lại bề rộng thật của từng dòng.
 *
 * HAI CHỖ PHẢI CẨN THẬN, đều học được lúc dựng clip nhiều cảnh:
 *
 *   · CAMERA. Cảnh có `camera.scale` khác 1 thì `getBoundingClientRect()` trả về
 *     toạ độ ĐÃ PHÓNG. Phải gỡ transform của `#cam` ngay trước khi đo, rồi trả
 *     lại — đo trong cùng một lượt `evaluate` nên khung hình không kịp nháy.
 *   · PHẦN TỬ NGOÀI CẢNH chỉ bị `visibility:hidden`, vẫn còn bố cục. Nên đo lúc
 *     nào cũng ra số, nhưng chỉ số của ĐÚNG cảnh đang chốt mới đáng tin —
 *     phần tử cảnh khác có thể đang dở chuyển động.
 *
 * Chạy: node tools/kiem-canh.mjs [slug] [ảnh.png]
 *   Không truyền gì thì kiểm mọi bản kê `tools/kiem-*.json`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production/tools/node_modules/playwright/index.mjs';

const THU_MUC = import.meta.dirname;
const CHON = process.argv[2];
const ANH = process.argv[3];

const banKe = readdirSync(THU_MUC)
  .filter((f) => /^kiem-.+\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(path.join(THU_MUC, f), 'utf8')))
  .filter((k) => !CHON || k.slug === CHON);

if (!banKe.length) {
  console.log(CHON ? `Không có bản kê cho "${CHON}".` : 'Không có bản kê nào.');
  process.exit(1);
}

const b = await chromium.launch();
let tongLoi = 0;

for (const ke of banKe) {
  /*
   * Cửa sổ phải BẰNG ĐÚNG khổ clip. Mở cửa sổ nhỏ hơn thì `fit()` thu sân khấu
   * lại — clip dọc 1080×1920 trong cửa sổ 1360×820 bị thu còn 0,43×, chữ 10px
   * rơi xuống 3,5px. Ở cỡ đó chữ không còn co giãn tuyến tính nữa (hinting,
   * cỡ chữ tối thiểu), nên phép đo bề rộng báo bừa hàng chục lỗi không có thật.
   */
  const p = await b.newPage({ viewport: { width: ke.w, height: ke.h } });
  const loiJS = [];
  p.on('pageerror', (e) => loiJS.push(String(e)));
  await p.goto(`http://127.0.0.1:7803/clip/scene-player.html?scene=${ke.slug}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__clip && window.__clip.duration > 0, { timeout: 20000 });

  const loi = [];
  let soDo = 0;

  for (const canh of ke.canh) {
    await p.evaluate((s) => window.__clip.seek(s), canh.moc);
    await p.waitForTimeout(320);

    const kq = await p.evaluate(({ ke: k, canhId }) => {
      const cam = document.querySelector('#cam');
      const cu = cam.style.transform;
      cam.style.transform = 'none';          // gỡ camera để đo toạ độ gốc
      const goc = cam.getBoundingClientRect();
      // Sân khấu vẫn có thể bị `fit()` thu nhẹ (lề của trang). Quy về toạ độ gốc.
      const ti = k.w / goc.width;

      const doRong = (n) => {
        const dong = [...n.querySelectorAll('.t .d, .s')];
        if (!dong.length) return {};
        const truoc = dong.map((d) => d.style.whiteSpace);
        dong.forEach((d) => { d.style.whiteSpace = 'nowrap'; });
        const can = Math.max(...dong.map((d) => d.scrollWidth));
        dong.forEach((d, i) => { d.style.whiteSpace = truoc[i]; });
        return { can };
      };

      /* Khoá phải gồm CẢ tên cảnh. Dashboard được khai lại ở cả ba cảnh với
         cùng id, nên khoá bằng mỗi id thì cảnh sau đè cảnh trước và một phần
         ba số phần tử lặng lẽ không được kiểm. */
      const doc = {};
      for (const n of document.querySelectorAll('.el')) {
        const r = n.getBoundingClientRect();
        const d = doRong(n);
        doc[`${n.dataset.scene}::${n.dataset.el}`] = {
          canh: n.dataset.scene, ten: n.dataset.el,
          x: (r.left - goc.left) * ti, y: (r.top - goc.top) * ti,
          w: r.width * ti, h: r.height * ti,
          ...(d.can != null ? { can: d.can * ti } : {}),
        };
      }
      cam.style.transform = cu;
      return { doc, ti };
    }, { ke, canhId: canh.id });

    const lam = (n) => `${Math.round(n)}`;
    if (Math.abs(kq.ti - 1) > 0.02) {
      loi.push(`[${canh.id}] sân khấu bị thu ${(1 / kq.ti).toFixed(3)}× — phép đo chữ`
        + ' không tin được ở tỉ lệ này.');
    }
    for (const r of Object.values(kq.doc)) {
      if (r.canh !== canh.id) continue;      // chỉ tin số của cảnh đang chốt
      const id = r.ten;
      soDo++;
      if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > ke.w + 0.5 || r.y + r.h > ke.h + 0.5) {
        loi.push(`[${canh.id}] \`${id}\` thò ra ngoài khung hình: `
          + `(${lam(r.x)},${lam(r.y)}) ${lam(r.w)}×${lam(r.h)}`);
      }
      const cha = ke.trong[id];
      const c = cha && kq.doc[`${canh.id}::${cha}`];
      if (c && (r.x < c.x - 0.5 || r.y < c.y - 0.5
                || r.x + r.w > c.x + c.w + 0.5 || r.y + r.h > c.y + c.h + 0.5)) {
        loi.push(`[${canh.id}] \`${id}\` thò ra ngoài \`${cha}\`: `
          + `(${lam(r.x)},${lam(r.y)}) ${lam(r.w)}×${lam(r.h)}`
          + ` — cha (${lam(c.x)},${lam(c.y)}) ${lam(c.w)}×${lam(c.h)}`);
      }
      if (r.can != null && r.can > r.w + 0.5) {
        loi.push(`[${canh.id}] \`${id}\`: chữ bị bẻ dòng — cần ${lam(r.can)}px, `
          + `ô chỉ khai ${lam(r.w)}px (thiếu ${lam(r.can - r.w)}).`);
      }
    }
  }

  if (ANH && CHON) { await p.screenshot({ path: ANH }); console.log(`Ảnh: ${ANH}`); }
  await p.close();

  console.log(`\n── ${ke.slug} — đo ${soDo} thành phần qua ${ke.canh.length} cảnh`);
  if (loiJS.length) { console.log(`   ✗ Lỗi JS: ${loiJS.join('; ')}`); tongLoi++; }
  if (loi.length) {
    console.log(`   ✗ ${loi.length} chỗ sai:`);
    loi.forEach((l) => console.log('      ·', l));
    tongLoi += loi.length;
  } else {
    console.log('   ✅ toạ độ chuẩn: không thò ra, không bẻ dòng.');
  }
}

await b.close();
process.exit(tongLoi ? 1 : 0);
