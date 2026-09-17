#!/usr/bin/env node
/**
 * KIỂM MỐC CHUYỂN ĐỘNG (keyframe).
 *
 * Bốn điều phải canh, và cả bốn đều là chỗ dễ hỏng lặng lẽ:
 *
 *   1. Mốc thật sự lái khung hình — đo `transform` và `opacity` qua Chromium,
 *      không tin vào việc "có ghi `keys` vào file là xong".
 *   2. TỪNG THUỘC TÍNH MỘT ĐƯỜNG RIÊNG. Mốc chỉ khai `x` thì `opacity` vẫn phải
 *      chạy theo hai mốc gần nhất CÓ khai `opacity`. Làm sai chỗ này thì món
 *      nhấp nháy, mà người dùng không đoán nổi vì sao.
 *   3. Có mốc thì hiệu ứng vào/ra phải NGHỈ HẲN. Hai hệ cùng ghi `transform` là
 *      ra kết quả không ai đoán được.
 *   4. `x`/`y` trong mốc là ĐỘ DỜI, không phải toạ độ. Hiểu nhầm thành toạ độ
 *      thì món nhảy về góc trên trái ngay khung đầu.
 *
 *   node tools/kiem-moc.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const GOC = process.argv[2] || 'http://127.0.0.1:7803';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const X0 = 400, Y0 = 200;
const canh = (them) => ({
  version: 2,
  meta: { name: 'thu moc', width: 1280, height: 720, density: 1, bg: '#ffffff', ink: '#111111' },
  scenes: [{ id: 'c1', duration: 6, stagger: 0, elements: [{
    id: 'o', kind: 'panel', x: X0, y: Y0, w: 200, h: 120, fill: '#3366cc',
    in: { kind: 'rise', ease: 'out', dur: 0.6, dist: 200 }, ...them }] }],
});

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await trang.evaluate(() => window.__clip.ready());

  const doc = async (them, giay) => {
    await trang.evaluate(([c, g]) => { window.__clip.load(c); window.__clip.step(g); }, [canh(them), giay]);
    await trang.waitForTimeout(200);
    return trang.evaluate(() => {
      const n = document.querySelector('.el[data-el="o"]');
      if (!n) return null;
      const cs = getComputedStyle(n);
      const m = /matrix\(([^)]+)\)/.exec(cs.transform);
      const s = m ? m[1].split(',').map(Number) : null;
      return s
        ? { a: s[0], b: s[1], dx: s[4], dy: s[5], mo: Number(cs.opacity) }
        : { a: 1, b: 0, dx: 0, dy: 0, mo: Number(cs.opacity) };
    });
  };

  /* ---------- 1. mốc lái khung hình ---------- */
  console.log('\n1. Mốc lái thật sự khung hình');
  const KEYS = [
    { t: 0, y: 100, opacity: 0, scale: 0.5 },
    { t: 2, y: 0, opacity: 1, scale: 1, ease: 'linear' },
    { t: 4, y: -60, ease: 'linear' },
  ];
  const a0 = await doc({ keys: KEYS }, 0);
  const a1 = await doc({ keys: KEYS }, 1);
  const a2 = await doc({ keys: KEYS }, 2);
  dat('mốc đầu đúng giá trị đã khai', Math.abs(a0.dy - 100) < 1 && a0.mo < 0.02 && Math.abs(a0.a - 0.5) < 0.02,
    `dời dọc ${a0.dy.toFixed(1)} · mờ ${a0.mo.toFixed(2)} · phóng ${a0.a.toFixed(2)}`);
  dat('giữa hai mốc thì nội suy đúng nửa đường',
    Math.abs(a1.dy - 50) < 2 && Math.abs(a1.mo - 0.5) < 0.05 && Math.abs(a1.a - 0.75) < 0.03,
    `dời dọc ${a1.dy.toFixed(1)} (mong 50) · mờ ${a1.mo.toFixed(2)} (mong 0,50)`);
  dat('mốc cuối của quãng đúng giá trị đã khai',
    Math.abs(a2.dy) < 1 && a2.mo > 0.98 && Math.abs(a2.a - 1) < 0.02,
    `dời dọc ${a2.dy.toFixed(1)} · mờ ${a2.mo.toFixed(2)}`);

  /* ---------- 2. từng thuộc tính một đường riêng ---------- */
  console.log('\n2. Mốc chỉ khai một thứ thì thứ khác vẫn chạy tiếp');
  const a3 = await doc({ keys: KEYS }, 3);
  dat('`y` chạy tiếp tới mốc thứ ba', Math.abs(a3.dy - -30) < 2, `dời dọc ${a3.dy.toFixed(1)} (mong -30)`);
  dat('`opacity` giữ nguyên vì mốc ba không khai nó', a3.mo > 0.98, `mờ ${a3.mo.toFixed(2)} (mong 1,00)`);
  dat('`scale` cũng giữ nguyên', Math.abs(a3.a - 1) < 0.02, `phóng ${a3.a.toFixed(3)}`);

  /* ---------- 3. ngoài quãng thì giữ giá trị đầu/cuối ---------- */
  console.log('\n3. Ngoài quãng mốc thì đứng yên, không nhảy về 0');
  const a5 = await doc({ keys: KEYS }, 5.5);
  dat('sau mốc cuối thì giữ nguyên giá trị cuối', Math.abs(a5.dy - -60) < 2, `dời dọc ${a5.dy.toFixed(1)}`);

  /* ---------- 4. có mốc thì hiệu ứng vào nghỉ ---------- */
  console.log('\n4. Có mốc thì hiệu ứng vào/ra nghỉ hẳn');
  // `in` khai rise dist 200: không có mốc thì ở giây 0,05 phải dời xuống gần 200.
  const khong = await doc({}, 0.05);
  const co = await doc({ keys: [{ t: 0, y: 10 }, { t: 3, y: 10 }] }, 0.05);
  dat('không mốc thì hiệu ứng vào vẫn chạy', khong.dy > 120, `dời dọc ${khong.dy.toFixed(1)}`);
  dat('có mốc thì hiệu ứng vào bị bỏ qua', Math.abs(co.dy - 10) < 2, `dời dọc ${co.dy.toFixed(1)} (mong 10)`);

  /* ---------- 5. `x`/`y` là ĐỘ DỜI, không phải toạ độ ---------- */
  console.log('\n5. `x`/`y` trong mốc là độ dời, không phải toạ độ');
  const vt = await trang.evaluate(([c, g]) => {
    window.__clip.load(c); window.__clip.step(g);
    const n = document.querySelector('.el[data-el="o"]');
    return { trai: n.style.left, tren: n.style.top };
  }, [canh({ keys: [{ t: 0, x: 0, y: 0 }, { t: 3, x: 50, y: 0, ease: 'linear' }] }), 0]);
  dat('món vẫn đứng đúng toạ độ gốc của nó',
    vt.trai === `${X0}px` && vt.tren === `${Y0}px`, `left ${vt.trai} · top ${vt.tren}`);
  const d15 = await doc({ keys: [{ t: 0, x: 0 }, { t: 3, x: 60, ease: 'linear' }] }, 1.5);
  dat('mốc chỉ dời thêm, cộng vào chỗ cũ', Math.abs(d15.dx - 30) < 2, `dời ngang ${d15.dx.toFixed(1)} (mong 30)`);

  /* ---------- 6. đà đi tới mốc ---------- */
  console.log('\n6. Đà nằm trên mốc ĐÍCH, tả đường đi TỚI nó');
  const th = await doc({ keys: [{ t: 0, y: 0 }, { t: 2, y: 100, ease: 'linear' }] }, 1);
  const cong = await doc({ keys: [{ t: 0, y: 0 }, { t: 2, y: 100, ease: 'manh' }] }, 1);
  dat('đổi đà thì đường đi khác hẳn', Math.abs(th.dy - cong.dy) > 12,
    `đều tay ${th.dy.toFixed(1)} · "manh" ${cong.dy.toFixed(1)}`);
  dat('đường "đều tay" đi đúng nửa quãng ở nửa thời gian', Math.abs(th.dy - 50) < 2, `${th.dy.toFixed(1)}`);

  /* ---------- 7. vẫn tất định ---------- */
  console.log('\n7. Vẫn là hàm thuần của thời gian');
  const p1 = await doc({ keys: KEYS }, 1.37);
  await doc({ keys: KEYS }, 5);
  const p2 = await doc({ keys: KEYS }, 1.37);
  dat('nhảy tới cùng một giây bằng hai đường ra cùng kết quả',
    Math.abs(p1.dy - p2.dy) < 0.01 && Math.abs(p1.mo - p2.mo) < 0.01,
    `${p1.dy.toFixed(3)} vs ${p2.dy.toFixed(3)}`);

  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');

  /* ---------- 8. bảng trong trình sửa ---------- */
  console.log('\n8. Bảng mốc trong trình sửa');
  const t2 = await trinh.newPage({ viewport: { width: 1500, height: 950 } });
  const loi2 = []; t2.on('pageerror', (e) => loi2.push(String(e)));
  await t2.goto(GOC, { waitUntil: 'networkidle' });
  await t2.waitForTimeout(2000);
  await t2.selectOption('#chon-clip', 'wireframe-thu');
  await t2.waitForTimeout(2000);
  await t2.click('.lop-ten >> nth=2');
  await t2.waitForTimeout(800);
  /* `.hd-nut` (nút hỏi "?") cũng là <button>, nên phải chỉ đích danh `.nut` —
     bộ chọn chung sẽ vớ nhầm nút hỏi và cả mục này báo sai. */
  dat('chưa có mốc thì chỉ hiện một nút mời bật',
    (await t2.textContent('.muc-moc button.nut')) === 'Tự đặt mốc chuyển động');
  await t2.click('.muc-moc button.nut');
  await t2.waitForTimeout(900);
  const b = await t2.evaluate(() => {
    const m = document.querySelector('.muc-moc');
    return { moc: m.querySelectorAll('.moc').length, vach: m.querySelectorAll('.moc-vach').length,
      bat: m.querySelectorAll('.moc-o.bat').length, tat: m.querySelectorAll('.moc-o:not(.bat)').length };
  });
  dat('bật xong ra hai mốc kèm hai vạch', b.moc === 2 && b.vach === 2, `${b.moc} mốc · ${b.vach} vạch`);
  dat('chỉ bật những thuộc tính có khai', b.bat === 4 && b.tat === 6,
    `bật ${b.bat} · tắt ${b.tat} (2 mốc × 5 thuộc tính)`);
  // Kim đang ở giây 0, mà mốc đầu cũng ở giây 0 → nút phải bị KHOÁ và nói rõ lý do.
  const nutThem = t2.locator('.muc-moc .hang-nut button').nth(0);
  dat('kim đứng ngay trên một mốc thì nút thêm bị khoá', await nutThem.isDisabled(),
    (await nutThem.getAttribute('title')) || '');
  // Tua tới chỗ khác rồi thêm — đây mới là đường dùng thật.
  await t2.evaluate(() => document.querySelector('#khung').contentWindow.__clip.seek(1.6));
  await t2.waitForTimeout(400);
  await t2.click('.lop-ten >> nth=1'); await t2.waitForTimeout(500);
  await t2.click('.lop-ten >> nth=2'); await t2.waitForTimeout(700);   // vẽ lại bảng theo kim mới
  dat('tua đi chỗ khác thì nút mở lại', !(await t2.locator('.muc-moc .hang-nut button').nth(0).isDisabled()));
  await t2.locator('.muc-moc .hang-nut button').nth(0).click();
  await t2.waitForTimeout(700);
  const soMoc = await t2.evaluate(() => document.querySelectorAll('.muc-moc .moc').length);
  dat('thêm được mốc mới tại chỗ kim đứng', soMoc === 3, `${soMoc} mốc`);
  await t2.click('.muc-moc .hang-nut button >> nth=1');   // bỏ hết
  await t2.waitForTimeout(700);
  dat('bỏ hết mốc thì quay về nút mời bật',
    (await t2.textContent('.muc-moc button.nut')) === 'Tự đặt mốc chuyển động');
  dat('không có lỗi JS trong trình sửa', loi2.length === 0, loi2.slice(0, 2).join(' | ') || 'sạch');
  await t2.close();
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Mốc chuyển động đạt hết.\n');
process.exit(hong ? 1 : 0);
