#!/usr/bin/env node
/**
 * KIỂM KHE MEDIA — thả ảnh HOẶC phim vào màn hình điện thoại và cửa sổ trình duyệt.
 *
 * Trước đây hai chỗ này là ngõ cụt: màn hình điện thoại chỉ nhận ẢNH, còn cửa sổ
 * trình duyệt không nhận gì cả — thân nó là mấy vạch xám giả, không có chỗ đặt
 * hình thật. Muốn khoe một đoạn quay màn hình thì phải đặt món video đè lên rồi
 * căn tay cho khớp khung máy.
 *
 * BẪY LỚN NHẤT của việc này KHÔNG phải chuyện dựng thẻ `<video>`, mà là ĐỒNG HỒ.
 * Thẻ video tự phát theo đồng hồ thật; xem trong trình sửa thì tưởng đúng, mà
 * tua tới giây nào nền cũng đứng ở giây 0, và mỗi lần xuất video lại ra một
 * khung khác nhau. Nên mục 3 đo đúng chuyện đó: tua tới giây nào thì phim bên
 * trong phải đứng ở giây đó.
 *
 * Không đụng vào clip nào — cảnh thử nạp thẳng bằng `__clip.load()`.
 *
 *   node tools/kiem-khe-media.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const { NUM_RIENG } = await import(new URL('../web/inspector/schema.js', import.meta.url));

/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* ---------- 1. bộ dựng còn giữ phần vá ---------- */
console.log('\n1. `scene-player.html` còn giữ khe media');
const bo = readFileSync(path.join(PROJ, 'scene-player.html'), 'utf8');
dat('có hàm `khePhim`', bo.includes('function khePhim('));
dat('màn hình điện thoại dùng nó', /phone\(el, n\) \{\s*if \(el\.src\) n\.innerHTML = khePhim\(/.test(bo));
dat('cửa sổ trình duyệt có nhánh `co-hinh`', bo.includes("than co-hinh"));
dat('phim trong món khác được đồng bộ theo đồng hồ clip',
  /el\.kind !== 'video' && el\.src && node\.querySelector\('video'\)/.test(bo));
dat('bảng thuộc tính bày núm file cho cả hai',
  NUM_RIENG.phone.some((n) => n.id === 'src' && n.kieu === 'hinh')
  && NUM_RIENG.browser.some((n) => n.id === 'src' && n.kieu === 'hinh'));

/* ---------- chọn một file phim MỞ ĐƯỢC ---------- */
const nguon = await (await fetch(`${GOC}/api/nguon-video`)).json();
const phim = (nguon.video || []).find((v) => v.chayDuoc);
if (!phim) {
  console.log('\n⚠ Không có file phim nào trình duyệt mở được — bỏ qua phần đo.');
  process.exit(0);
}

const canh = {
  version: 2,
  meta: { name: 'thu khe', width: 1280, height: 720, density: 1, bg: '#f3f5f8', ink: '#1e2430' },
  scenes: [{ id: 'c1', duration: 12, stagger: 0, elements: [
    { id: 'dt-anh',   kind: 'phone',   x: 30,  y: 40,  w: 200, h: 400,
      src: 'public/mat-bao-logo.png', in: { kind: 'none', dur: 0.001 } },
    { id: 'dt-phim',  kind: 'phone',   x: 260, y: 40,  w: 200, h: 400,
      src: phim.duongDan, in: { kind: 'none', dur: 0.001 } },
    { id: 'tr-trong', kind: 'browser', x: 500, y: 40,  w: 340, h: 220,
      url: 'vi-du.vn', in: { kind: 'none', dur: 0.001 } },
    { id: 'tr-phim',  kind: 'browser', x: 500, y: 290, w: 340, h: 220,
      url: 'vi-du.vn', src: phim.duongDan, in: { kind: 'none', dur: 0.001 } },
    { id: 'tr-anh',   kind: 'browser', x: 880, y: 40,  w: 340, h: 220,
      url: 'vi-du.vn', src: 'public/mat-bao-logo.png', in: { kind: 'none', dur: 0.001 } },
  ] }],
};

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await trang.evaluate(() => window.__clip.ready());
  await trang.evaluate((c) => window.__clip.load(c), canh);
  await trang.waitForTimeout(1500);

  const soi = async (g) => {
    await trang.evaluate((x) => window.__clip.seek(x), g);
    await trang.waitForTimeout(500);
    return trang.evaluate(() => Object.fromEntries([...document.querySelectorAll('.el')].map((n) => {
      const v = n.querySelector('video'); const i = n.querySelector('img');
      return [n.dataset.el, {
        the: v ? 'video' : i ? 'img' : 'không',
        giay: v ? +v.currentTime.toFixed(2) : null,
        rong: v ? v.videoWidth : i ? i.naturalWidth : 0,
        vach: n.querySelectorAll('.than i').length,
      }];
    })));
  };

  /* ---------- 2. dựng đúng thẻ ---------- */
  console.log(`\n2. Đúng thẻ cho đúng loại file (phim thử: ${phim.ten})`);
  const a = await soi(0.2);
  dat('màn hình điện thoại + ảnh → thẻ ảnh', a['dt-anh'].the === 'img' && a['dt-anh'].rong > 0);
  dat('màn hình điện thoại + phim → thẻ phim', a['dt-phim'].the === 'video' && a['dt-phim'].rong > 0,
    `${a['dt-phim'].rong}px ngang`);
  dat('cửa sổ trình duyệt + phim → thẻ phim', a['tr-phim'].the === 'video' && a['tr-phim'].rong > 0);
  dat('cửa sổ trình duyệt + ảnh → thẻ ảnh', a['tr-anh'].the === 'img' && a['tr-anh'].rong > 0);
  dat('có hình thật thì bỏ mấy vạch giả', a['tr-phim'].vach === 0 && a['tr-anh'].vach === 0);
  dat('bỏ trống thì GIỮ mấy vạch giả', a['tr-trong'].vach === 3, `${a['tr-trong'].vach} vạch`);

  /* ---------- 3. đồng hồ ---------- */
  console.log('\n3. Phim trong khe chạy theo đồng hồ CỦA CLIP');
  /* Phim ngắn hơn cảnh thì nó CHẠY VÒNG — mốc cần so là `giây % độ dài phim`,
     không phải giây của clip. Bài kiểm này lúc đầu so thẳng nên báo oan ở giây
     9: `BG-web.mp4` dài 8,04s nên đúng ra phải đang ở 0,96s. */
  const mocPhim = (g) => (phim.giay ? g % phim.giay : g);
  for (const g of [1.5, 5, 9]) {
    const can = mocPhim(g);
    const k = await soi(g);
    for (const [mon, cho] of [['dt-phim', 'điện thoại'], ['tr-phim', 'trình duyệt']]) {
      const lech = Math.abs(k[mon].giay - can);
      dat(`tua tới ${g}s thì phim trong ${cho} ở ${can.toFixed(2)}s`, lech < 0.35,
        `phim đang ở ${k[mon].giay}s (lệch ${lech.toFixed(2)}s)`);
    }
  }

  console.log('\n4. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
}

console.log(hong === 0 ? '\n✅ Khe media: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
