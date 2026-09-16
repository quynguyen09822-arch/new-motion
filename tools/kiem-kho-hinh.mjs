#!/usr/bin/env node
/**
 * KIỂM ĐỔI KHỔ HÌNH — nhân một hệ số, KHÔNG xếp lại bố cục.
 *
 * Hai chiều đều phải đúng:
 *
 *   · CÙNG tỉ lệ thì phải đổi được, và đổi SẠCH: mọi toạ độ, cỡ chữ, bo góc,
 *     quãng bay đều nhân đúng hệ số — còn giây, bậc và độ thì TUYỆT ĐỐI không.
 *     Nhân nhầm một khoá giây là clip chạy sai nhịp; nhân nhầm một khoá bậc là
 *     khoảng thở phình gấp rưỡi rồi vỡ bố cục. Cả hai đều hỏng lặng lẽ.
 *   · KHÁC tỉ lệ thì phải TỪ CHỐI, không âm thầm bóp méo clip rồi để người dùng
 *     tự phát hiện lúc xuất video.
 *
 * Và phép thử đắt nhất ở cuối: dựng thật clip ở khổ cũ và khổ mới rồi so ảnh.
 * Nhân đúng thì hai khung hình phải GIỐNG NHAU, chỉ khác độ lớn.
 *
 *   node tools/kiem-kho-hinh.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const { cungTiLe, doiKhoHinh, khoGoiY } =
  await import(new URL('../web/khohinh.js', import.meta.url));

const GOC = process.argv[2] || 'http://127.0.0.1:7803';
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* ---------- 1. phép nhân ---------- */
console.log('\n1. Nhân đúng khoá: điểm ảnh thì nhân, giây và bậc thì không');
const mau = () => ({
  meta: { width: 1280, height: 720, density: 1 },
  scenes: [{ id: 'c1', duration: 5, elements: [{
    id: 'a', kind: 'panel', x: 100, y: 50, w: 400, h: 200, size: 48, radius: 16,
    at: 1.5, for: 3, pad: 5, gap: 4, rotate: 10, opacity: 0.8, soft: 3, push: 2,
    lineStagger: 0.12, subScale: 0.6, rows: 4,
    in: { kind: 'rise', ease: 'out', dur: 0.55, dist: 80 },
    out: { kind: 'fade', dur: 0.4, dist: 60 },
    children: [{ id: 'b', kind: 'text', x: 10, y: 20, w: 100, h: 40, size: 24 }],
  }] }],
});
const d = mau();
const kq = doiKhoHinh(d, 1920, 1080);
const e = d.scenes[0].elements[0];
dat('đổi được khi cùng tỉ lệ', kq.ok && kq.s === 1.5, JSON.stringify(kq));
dat('meta đổi theo', d.meta.width === 1920 && d.meta.height === 1080);

const nhanDung = { x: 150, y: 75, w: 600, h: 300, size: 72, radius: 24 };
const saiNhan = Object.entries(nhanDung).filter(([k, v]) => e[k] !== v);
dat('toạ độ, cỡ chữ, bo góc nhân đúng 1,5×', saiNhan.length === 0,
  saiNhan.map(([k, v]) => `${k}: ${e[k]} ≠ ${v}`).join(', ') || 'x y w h size radius');
dat('quãng bay vào/ra cũng nhân', e.in.dist === 120 && e.out.dist === 90,
  `in.dist ${e.in.dist} · out.dist ${e.out.dist}`);
dat('món con nhân theo', e.children[0].x === 15 && e.children[0].size === 36);

const giuNguyen = { at: 1.5, for: 3, pad: 5, gap: 4, rotate: 10, opacity: 0.8,
  soft: 3, push: 2, lineStagger: 0.12, subScale: 0.6, rows: 4 };
const saiGiu = Object.entries(giuNguyen).filter(([k, v]) => e[k] !== v);
dat('giây, bậc, độ, tỉ lệ, số đếm KHÔNG bị nhân', saiGiu.length === 0,
  saiGiu.map(([k, v]) => `${k}: ${e[k]} ≠ ${v}`).join(', ') || Object.keys(giuNguyen).join(' '));
dat('thời lượng chuyển động không bị nhân', e.in.dur === 0.55 && e.out.dur === 0.4);

/* ---------- 2. từ chối khác tỉ lệ ---------- */
console.log('\n2. Khác tỉ lệ thì TỪ CHỐI, không bóp méo');
const d2 = mau();
const kq2 = doiKhoHinh(d2, 1080, 1920);
dat('không cho đổi', kq2.ok === false && kq2.khacTiLe === true);
dat('nói rõ lý do đọc được', /khác TỈ LỆ/.test(kq2.ly || ''), (kq2.ly || '').slice(0, 60) + '…');
dat('kịch bản KHÔNG bị đụng vào', JSON.stringify(d2) === JSON.stringify(mau()));
dat('cùng khổ thì cũng không làm gì', doiKhoHinh(mau(), 1280, 720).ok === false);
dat('số vô lý thì chặn', doiKhoHinh(mau(), 0, 0).ok === false);

console.log('\n3. Khổ gợi ý giữ đúng tỉ lệ');
for (const [w, h] of [[1280, 720], [720, 1280], [1080, 1080]]) {
  const ds = khoGoiY(w, h);
  const sai = ds.filter((k) => !cungTiLe(w, h, k.w, k.h));
  dat(`${w}×${h} → ${ds.length} khổ, đều đúng tỉ lệ`, sai.length === 0 && ds.length === 4,
    ds.map((k) => `${k.w}×${k.h}`).join(' '));
}

/* ---------- 4. dựng thật: hai khổ phải ra CÙNG một hình ---------- */
console.log('\n4. Dựng thật — đổi khổ xong khung hình chỉ TO HƠN, không lệch');
const goc = JSON.parse(readFileSync(path.join(PROJ, 'scenes', 'thu-ve-lai-s02.json'), 'utf8'));
const to = JSON.parse(JSON.stringify(goc));
const kq4 = doiKhoHinh(to, goc.meta.width * 1.5, goc.meta.height * 1.5);

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
const loiJS = [];
trang.on('pageerror', (e2) => loiJS.push(String(e2)));
try {
  dat('đổi được clip thật', kq4.ok, `${goc.meta.width}×${goc.meta.height} → ${to.meta.width}×${to.meta.height}`);
  await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await trang.evaluate(() => window.__clip.ready());

  /* So CHỖ TƯƠNG ĐỐI của từng món trong khung, không so pixel: khổ to gấp rưỡi
     thì mọi số px đều gấp rưỡi, mà tỉ lệ so với khung thì phải y hệt. */
  const doTiLe = async (doc2) => {
    await trang.evaluate(([c]) => { window.__clip.load(c); window.__clip.seek(6); }, [doc2]);
    await trang.waitForTimeout(450);
    return trang.evaluate(() => {
      const st = document.getElementById('stage');
      const W = st.offsetWidth, H = st.offsetHeight;
      const ra = {};
      for (const n of document.querySelectorAll('.el')) {
        ra[n.dataset.el] = [n.offsetLeft / W, n.offsetTop / H, n.offsetWidth / W, n.offsetHeight / H];
      }
      return ra;
    });
  };
  const a = await doTiLe(goc);
  const b = await doTiLe(to);
  const chung = Object.keys(a).filter((k) => b[k]);
  const lech = chung.filter((k) => a[k].some((v, i) => Math.abs(v - b[k][i]) > 0.004));
  dat('mọi món giữ nguyên chỗ tương đối trong khung', lech.length === 0,
    lech.length ? `${lech.length}/${chung.length} lệch — ${lech.slice(0, 3).join(', ')}`
      : `${chung.length} món khớp`);
  dat('không món nào biến mất', chung.length === Object.keys(a).length,
    `${chung.length}/${Object.keys(a).length}`);
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
}

console.log(hong === 0 ? '\n✅ Đổi khổ hình: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
