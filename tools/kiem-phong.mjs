#!/usr/bin/env node
/**
 * KIỂM PHÓNG KHUNG LÀM VIỆC (Ctrl + lăn chuột).
 *
 * Phóng to thì dễ. Chuyện khó là MỌI PHÉP QUY ĐỔI TOẠ ĐỘ phải đi theo:
 *
 *   · bấm chọn  — `elementFromPoint` bên trong iframe tính bằng pixel CHƯA
 *     phóng, còn `clientX` của trang cha là pixel ĐÃ phóng. Quên chia là bấm
 *     một đằng trúng một nẻo, và càng phóng to càng lệch xa.
 *   · kéo thả   — `dx` đo trên màn hình đã qua BA tầng phóng: sân khấu, máy
 *     quay, và tầng phóng của trang cha. Quên tầng thứ ba thì kéo một phân món
 *     nhảy hai phân.
 *
 * Nên bài kiểm này không kiểm "có phóng không" mà kiểm "phóng rồi còn bấm và
 * kéo đúng chỗ không".
 *
 *   node tools/kiem-phong.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = 'kiem-phong-tam';
const fTam = path.join(PROJ, 'scenes', `${TAM}.json`);

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
function don() {
  rmSync(fTam, { force: true });
  rmSync(path.join(M, '.hub-video-backups', 'scenes', TAM), { recursive: true, force: true });
  rmSync(path.join(M, '.drafts', `${TAM}.json`), { force: true });
}

/*
 * Clip tạm tự dựng, KHÔNG chép từ clip thật.
 *
 * Đã một lần dùng `cta.json` rồi bài kiểm báo hỏng oan: món chữ trong đó nằm
 * TRONG MỘT CỤM, mà `drag.js` cố tình từ chối kéo tự do món trong cụm — nên
 * "kéo mà không dịch" là đúng chứ không phải lỗi phóng. Ở đây khai thẳng một
 * món đặt tự do, đứng ngoài cùng, để bài kiểm đo đúng thứ nó định đo.
 */
don();
writeFileSync(fTam, JSON.stringify({
  version: 1,
  meta: { name: 'Kiểm phóng', width: 1280, height: 720, density: 1,
    bg: '#101014', ink: '#f0f0f0', accent: '#ff6a1f' },
  scenes: [{ id: 'c1', duration: 5, stagger: 0.16, elements: [
    /* Đặt GẦN TÂM khung. Món ở sát mép thì phóng to lên là nó trôi ra khỏi vùng
       làm việc, khuất sau cột trái — cú bấm rơi vào thanh bên, và bài kiểm báo
       hỏng oan trong khi phép quy đổi vẫn đúng. (Đã mắc: món ở x=120 của khung
       1280 rơi tới x=58 trên màn hình ở mức 246%.) */
    { id: 'khoi-a', kind: 'panel', x: 400, y: 250, w: 300, h: 160,
      fill: '#2c6bed', radius: 12 },
    /* Món thứ hai để KHÁC LOẠI hẳn. Hai khối màu giống nhau thì nhãn trên khung
       chọn đều là "Khối màu", nên bấm trượt sang khối kia bài kiểm vẫn báo qua —
       một phép khẳng định không phân biệt được thứ nó đang khẳng định. */
    { id: 'khoi-b', kind: 'text', x: 660, y: 300, w: 300, h: 160,
      text: 'Khối B', size: 44, align: 'center' },
  ] }],
}, null, 2), 'utf8');

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1700, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

const heSo = () => trang.evaluate(() => {
  const t = getComputedStyle(document.getElementById('boc-khung')).transform;
  return t === 'none' ? 1 : new DOMMatrix(t).a;
});
/** Vị trí trên MÀN HÌNH của một món trong clip, đọc qua chính khung đã phóng. */
const choTrenManHinh = (id) => trang.evaluate((monId) => {
  const kh = document.getElementById('khung');
  const n = kh.contentWindow.document.querySelector(`.el[data-el="${monId}"]`);
  if (!n) return null;
  const r = n.getBoundingClientRect();          // pixel bên trong iframe
  const rk = kh.getBoundingClientRect();        // khung iframe trên màn hình, ĐÃ phóng
  const t = getComputedStyle(document.getElementById('boc-khung')).transform;
  const z = t === 'none' ? 1 : new DOMMatrix(t).a;
  return { x: rk.left + (r.left + r.width / 2) * z, y: rk.top + (r.top + r.height / 2) * z };
}, id);
const dangChon = () => trang.evaluate(() => document.querySelector('.khung-nhan')?.textContent || '');
/** Điểm có nằm trong vùng làm việc không — ngoài vùng thì cú bấm rơi vào cột bên. */
const trongVung = async (c) => {
  const r = await trang.locator('#san-clip').boundingBox();
  return c.x > r.x + 4 && c.x < r.x + r.width - 4 && c.y > r.y + 4 && c.y < r.y + r.height - 4;
};

try {
  await trang.goto(`${GOC}/sua`, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
    { timeout: 40000 });
  await trang.selectOption('#chon-clip', TAM);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });
  await trang.waitForTimeout(800);

  /* ---------- 1. lăn thường KHÔNG được phóng ---------- */
  console.log('\n1. Lăn chuột thường thì không phóng');
  const kh = await trang.locator('#boc-khung').boundingBox();
  const gx = kh.x + kh.width / 2, gy = kh.y + kh.height / 2;
  await trang.mouse.move(gx, gy);
  for (let i = 0; i < 4; i++) await trang.mouse.wheel(0, -120);
  await trang.waitForTimeout(250);
  dat('lăn không giữ Ctrl thì hệ số vẫn là 1', Math.abs(await heSo() - 1) < 0.001);

  /* ---------- 2. Ctrl + lăn thì phóng ---------- */
  console.log('\n2. Ctrl + lăn');
  await trang.keyboard.down('Control');
  for (let i = 0; i < 4; i++) { await trang.mouse.move(gx, gy); await trang.mouse.wheel(0, -120); await trang.waitForTimeout(50); }
  await trang.keyboard.up('Control');
  await trang.waitForTimeout(250);
  const z1 = await heSo();
  dat('lăn lên thì to ra', z1 > 1.3, `${(z1 * 100).toFixed(0)}%`);
  dat('chỉ báo hiện đúng phần trăm',
    (await trang.evaluate(() => document.getElementById('so-phong').textContent)) === `${Math.round(z1 * 100)}%`);

  await trang.keyboard.down('Control');
  for (let i = 0; i < 2; i++) { await trang.mouse.move(gx, gy); await trang.mouse.wheel(0, 120); await trang.waitForTimeout(50); }
  await trang.keyboard.up('Control');
  await trang.waitForTimeout(250);
  dat('lăn xuống thì nhỏ lại', (await heSo()) < z1);

  /* ---------- 3. BẤM CHỌN vẫn trúng khi đang phóng ---------- */
  /* Đây là mục quan trọng nhất của cả bài kiểm. */
  console.log('\n3. Đang phóng mà bấm thì có trúng món không');
  await trang.evaluate(() => document.getElementById('phong-lai').click());
  await trang.waitForTimeout(200);

  const monGiua = 'khoi-a';

  for (const nac of [1.6, 2.6, 0.6]) {
    // Lăn cho tới khi đạt xấp xỉ mức muốn thử.
    await trang.evaluate(() => document.getElementById('phong-lai').click());
    await trang.waitForTimeout(120);
    const len = nac > 1;
    await trang.keyboard.down('Control');
    for (let i = 0; i < 12; i++) {
      const cur = await heSo();
      if ((len && cur >= nac) || (!len && cur <= nac)) break;
      await trang.mouse.move(gx, gy);
      await trang.mouse.wheel(0, len ? -120 : 120);
      await trang.waitForTimeout(45);
    }
    await trang.keyboard.up('Control');
    await trang.waitForTimeout(250);

    const z = await heSo();
    /*
     * Bấm LUÂN PHIÊN hai khối, không bấm mãi một khối: bấm lại đúng món đang
     * chọn thì `picker.js` LEO LÊN cụm cha — đúng lối Figma đã thiết kế, nhưng
     * làm bài kiểm báo hỏng oan nếu không biết. Bấm sang khối kia thì mỗi lần
     * đều là một lần chọn mới.
     */
    for (const id of ['khoi-a', 'khoi-b']) {
      const cho = await choTrenManHinh(id);
      if (!cho) { dat(`ở mức ${(z * 100).toFixed(0)}% tìm được ${id}`, false); continue; }
      /*
       * TUYỆT ĐỐI không bấm khi điểm rơi ra ngoài vùng làm việc.
       *
       * Đã mắc: ở mức 294% khối thứ hai trôi tới x=1482, tức là nằm trên CỘT
       * THUỘC TÍNH. Bài kiểm vẫn bấm, cú bấm rơi trúng một thanh trượt trong
       * bảng, và nó lặng lẽ đổi toạ độ của khối kia thành 48,48 — rồi mục kéo
       * thả bên dưới báo hỏng, trong khi tính năng chẳng làm sao cả.
       */
      if (!(await trongVung(cho))) {
        console.log(`  · ở mức ${(z * 100).toFixed(0)}% ${id} trôi ra ngoài vùng nhìn — bỏ qua`);
        continue;
      }
      await trang.mouse.click(cho.x, cho.y);
      await trang.waitForTimeout(280);
      const ten = await dangChon();
      const mong = id === 'khoi-a' ? /^Khối màu/ : /^Chữ · Khối B/;
      dat(`ở mức ${(z * 100).toFixed(0)}% bấm vào ${id} thì chọn đúng nó`,
        mong.test(ten), ten || 'không chọn được gì');
    }
  }

  /* ---------- 4. KÉO vẫn đúng quãng khi đang phóng ---------- */
  console.log('\n4. Đang phóng mà kéo thì món dịch đúng quãng');
  await trang.evaluate(() => document.getElementById('phong-lai').click());
  await trang.waitForTimeout(200);
  await trang.keyboard.down('Control');
  for (let i = 0; i < 5; i++) { await trang.mouse.move(gx, gy); await trang.mouse.wheel(0, -120); await trang.waitForTimeout(45); }
  await trang.keyboard.up('Control');
  await trang.waitForTimeout(300);
  const zKeo = await heSo();

  // `khoi-a` khai sẵn x/y, không `place`, không nằm trong cụm → kéo tự do được.
  const cho = await choTrenManHinh(monGiua);
  dat('khối cần kéo còn nằm trong vùng làm việc', await trongVung(cho),
    `(${cho.x.toFixed(0)}, ${cho.y.toFixed(0)})`);
  await trang.mouse.click(cho.x, cho.y);
  await trang.waitForTimeout(300);
  dat('chọn được khối để kéo', /Khối màu/.test(await dangChon()));

  const truoc = await trang.evaluate((id) => {
    const n = document.getElementById('khung').contentWindow.document
      .querySelector(`.el[data-el="${id}"]`);
    return { left: parseFloat(n.style.left) || 0, top: parseFloat(n.style.top) || 0 };
  }, monGiua);

  const heSoTrong = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    const doc = (el) => { const t = el ? getComputedStyle(el).transform : 'none';
      return t === 'none' ? 1 : new DOMMatrix(t).a; };
    return doc(d.querySelector('#stage')) * doc(d.querySelector('#cam'));
  });

  const cho2 = await choTrenManHinh(monGiua);
  const DX = 120, DY = 80;
  await trang.mouse.move(cho2.x, cho2.y);
  await trang.mouse.down();
  await trang.mouse.move(cho2.x + DX / 2, cho2.y + DY / 2, { steps: 4 });
  await trang.mouse.move(cho2.x + DX, cho2.y + DY, { steps: 4 });
  await trang.mouse.up();
  await trang.waitForTimeout(400);

  const sau = await trang.evaluate((id) => {
    const n = document.getElementById('khung').contentWindow.document
      .querySelector(`.el[data-el="${id}"]`);
    return { left: parseFloat(n.style.left) || 0, top: parseFloat(n.style.top) || 0 };
  }, monGiua);

  // Quãng dịch mong đợi = pixel màn hình ÷ (phóng trong iframe × phóng trang cha)
  const mongX = DX / (heSoTrong * zKeo), mongY = DY / (heSoTrong * zKeo);
  const thatX = sau.left - truoc.left, thatY = sau.top - truoc.top;
  dat(`kéo ${DX}×${DY}px màn hình ở mức ${(zKeo * 100).toFixed(0)}% thì món dịch đúng quãng`,
    Math.abs(thatX - mongX) < 6 && Math.abs(thatY - mongY) < 6,
    `mong ~(${mongX.toFixed(0)}, ${mongY.toFixed(0)}) · thật (${thatX.toFixed(0)}, ${thatY.toFixed(0)})`
);

  /* ---------- 5. về 100% ---------- */
  console.log('\n5. Về lại 100%');
  await trang.keyboard.press('Control+0');
  await trang.waitForTimeout(300);
  dat('Ctrl+0 đưa về đúng 100%', Math.abs(await heSo() - 1) < 0.001);
  dat('chỉ báo ẩn đi khi đã về 100%',
    await trang.evaluate(() => document.getElementById('chi-phong').classList.contains('an')));
  dat('bỏ hẳn transform, không để lại scale(1)',
    await trang.evaluate(() => !document.getElementById('boc-khung').style.transform));

  console.log('\n6. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await trang.screenshot({ path: path.join(M, '.kiem', 'phong.png'), scale: 'css' });
} finally {
  await trinh.close();
  don();
  console.log('Đã xoá clip tạm.');
}

console.log(hong === 0 ? '\n✅ Phóng khung làm việc: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
