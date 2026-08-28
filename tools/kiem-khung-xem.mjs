#!/usr/bin/env node
/**
 * KIỂM KHUNG XEM — chạy thật bằng Chromium, không đoán.
 *
 * Cửa ải của bước M0: trình sửa có với được vào `window.__clip` bên trong iframe
 * hay không. Nếu không thì cả thiết kế sụp, nên phải kiểm bằng trình duyệt thật
 * chứ không phải bằng suy luận.
 *
 * Mượn Playwright của dự án clip (nó cài sẵn rồi) để trình sửa không phải có gói
 * phụ thuộc nào.
 *
 *   node tools/kiem-khung-xem.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const GOC = process.argv[2] || 'http://127.0.0.1:7803';
const ANH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.kiem');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1600, height: 950 } });

/*
 * Tách hai loại hỏng. Lỗi JS là hỏng của trình sửa — phải chặn. Còn tài nguyên
 * 404 là dữ liệu của dự án clip thiếu file (vd bản 18 giây đang trỏ vào
 * `public/deployed-site.mp4` mà file thật nằm ở `public/image/`) — đó là chuyện
 * của dự án bên kia, có từ trước, và máy chủ 7800 của chính họ cũng 404 y hệt.
 * Trình sửa báo ra chứ không tự vá, và không vì thế mà coi là mình hỏng.
 */
const loiTrang = [];
const thieuFile = [];
trang.on('pageerror', (e) => loiTrang.push(String(e)));
trang.on('console', (m) => {
  if (m.type() !== 'error') return;
  const s = m.text();
  (/\b40[34]\b|Failed to load resource/.test(s) ? thieuFile : loiTrang).push(s);
});
trang.on('response', (r) => {
  if (r.status() >= 400) thieuFile.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

console.log(`\nMở ${GOC}`);
// Chờ tín hiệu sẵn sàng của chính ứng dụng, KHÔNG chờ 'networkidle': trang có
// khung xem bên trong tự nạp ảnh và phông, mạng không bao giờ thật sự lặng.
await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
  { timeout: 40000 });

/* ---------- 1. Khung xem có với được vào __clip không ---------- */
console.log('\n1. Khung xem');
const khung = trang.frameLocator('#khung');
await trang.waitForFunction(
  () => document.getElementById('khung')?.contentWindow?.__clip,
  null,
  { timeout: 20000 },
).catch(() => {});

const co = await trang.evaluate(() => Boolean(document.getElementById('khung')?.contentWindow?.__clip));
dat('trang cha với được vào window.__clip trong iframe', co);
if (!co) {
  console.log('\n  Cùng origin là điều kiện sống còn — không có __clip thì dừng ở đây.');
  await trinh.close();
  process.exit(1);
}

/* ---------- 2. Kịch bản đã nạp, không rơi vào bản dự phòng ---------- */
console.log('\n2. Kịch bản');
const tt = await trang.evaluate(() => {
  const c = document.getElementById('khung').contentWindow.__clip;
  return { dai: c.duration, canh: c.scenes() };
});
dat('có thời lượng > 0', tt.dai > 0, `${tt.dai.toFixed(2)}s`);
dat('scenes() trả về danh sách cảnh', tt.canh.length > 0, `${tt.canh.length} cảnh`);
dat('không rơi vào kịch bản dự phòng', !tt.canh.some((c) => c.id === 'err'),
  tt.canh.map((c) => c.id).join(', '));

/* ---------- 3. Mỗi món trên khung hình có mang tên của nó không ---------- */
console.log('\n3. Bấm chọn được (dataset.el)');
const mon = await trang.evaluate(() => {
  const d = document.getElementById('khung').contentWindow.document;
  const els = [...d.querySelectorAll('.el')];
  return {
    tong: els.length,
    coTen: els.filter((e) => e.dataset.el).length,
    coCanh: els.filter((e) => e.dataset.scene).length,
    loai: [...new Set(els.map((e) => [...e.classList].find((c) => c.startsWith('k-'))))],
  };
});
dat('có phần tử .el trong khung', mon.tong > 0, `${mon.tong} phần tử`);
dat('mọi phần tử đều mang data-el', mon.tong > 0 && mon.coTen === mon.tong, `${mon.coTen}/${mon.tong}`);
dat('mọi phần tử đều mang data-scene', mon.tong > 0 && mon.coCanh === mon.tong, `${mon.coCanh}/${mon.tong}`);
console.log(`     loại có mặt: ${mon.loai.join(' ')}`);

/* ---------- 4. Nền và vệt sáng phải không ăn cú bấm ---------- */
console.log('\n4. Bấm không trúng nhầm nền');
const xuyen = await trang.evaluate(() => {
  const d = document.getElementById('khung').contentWindow.document;
  const ke = (s) => {
    const n = d.querySelector(s);
    return n ? getComputedStyle(n).pointerEvents : null;
  };
  return { nen: ke('.k-nen'), sweep: ke('.k-sweep') };
});
dat('.k-nen không ăn cú bấm', xuyen.nen === null || xuyen.nen === 'none', xuyen.nen ?? 'không có trong clip này');
dat('.k-sweep không ăn cú bấm', xuyen.sweep === null || xuyen.sweep === 'none', xuyen.sweep ?? 'không có trong clip này');

/* ---------- 5. BẪY 1 — load() tua về 0, nap() phải giữ chỗ ---------- */
console.log('\n5. Bẫy: load() tua về giây 0');
const bay1 = await trang.evaluate(async () => {
  const c = document.getElementById('khung').contentWindow.__clip;
  const doc = await (await fetch('/clip/scenes/cta.json')).json();
  c.seek(3.5);
  const truoc = c.at();
  c.load(doc);            // gọi trần — phải thấy nó nhảy về 0
  const sauTran = c.at();
  c.seek(truoc);          // đúng cách mà player.js đang làm
  return { truoc, sauTran, sauVa: c.at() };
});
dat('gọi load() trần đúng là bị tua về 0', bay1.sauTran === 0,
  `${bay1.truoc} → ${bay1.sauTran}`);
dat('tua lại thì về đúng chỗ cũ', Math.abs(bay1.sauVa - bay1.truoc) < 0.01,
  `${bay1.sauVa}`);

/* ---------- 6. BẪY 2 — phép quy đổi toạ độ ---------- */
console.log('\n6. Bẫy: phép quy đổi pixel màn hình ↔ toạ độ sân khấu');
const bay2 = await trang.evaluate(() => {
  const d = document.getElementById('khung').contentWindow.document;
  const lay = (s) => {
    const n = d.querySelector(s);
    if (!n) return 1;
    const t = getComputedStyle(n).transform;
    return !t || t === 'none' ? 1 : new DOMMatrix(t).a || 1;
  };
  const fit = lay('#stage');
  const cam = lay('#cam');
  const heSo = fit * cam;

  // Đối chiếu độc lập. Phải đo trên #cam chứ KHÔNG phải #stage: #cam nằm BÊN
  // TRONG #stage, nên khung của #stage chỉ phản ánh mỗi `fit`, còn khung của
  // #cam mới gộp cả hai tầng — đúng thứ mà một món nằm trong đó phải chịu.
  const camEl = d.querySelector('#cam');
  const doThat = camEl.getBoundingClientRect().width / camEl.offsetWidth;

  // Kiểm thẳng vào cái mà lúc kéo thật sự cần: dời `left` đi một quãng đã biết
  // trong toạ độ sân khấu, rồi đo xem trên màn hình nó nhích đúng chừng ấy nhân
  // hệ số hay không. Đây mới là bất biến mà bộ kéo dựa vào.
  const mon = d.querySelector('#cam .el');
  const cu = mon.style.left;
  const truoc = mon.getBoundingClientRect().left;
  const DOI = 100; // px trong toạ độ sân khấu
  mon.style.left = `${(parseFloat(cu) || 0) + DOI}px`;
  const sau = mon.getBoundingClientRect().left;
  mon.style.left = cu; // trả lại nguyên trạng

  return { heSo, doThat, fit, cam, nhichThat: sau - truoc, nhichMong: DOI * heSo };
});

const lech = Math.abs(bay2.heSo - bay2.doThat) / bay2.doThat;
dat('hệ số phóng khớp bề rộng #cam đo thật (sai < 1%)', lech < 0.01,
  `tính ${bay2.heSo.toFixed(4)} vs đo ${bay2.doThat.toFixed(4)} (fit ${bay2.fit.toFixed(3)} × cam ${bay2.cam.toFixed(3)})`);

const lech2 = Math.abs(bay2.nhichThat - bay2.nhichMong) / bay2.nhichMong;
dat('dời 100px sân khấu thì trên màn hình nhích đúng chừng ấy', lech2 < 0.01,
  `mong ${bay2.nhichMong.toFixed(2)}px, thật ${bay2.nhichThat.toFixed(2)}px`);

/* ---------- 7. Bấm thật vào một món ---------- */
console.log('\n7. Thử bấm thật lên khung hình');
const bam = await trang.evaluate(() => {
  const w = document.getElementById('khung').contentWindow;
  const d = w.document;
  const chu = d.querySelector('.el.k-text');
  if (!chu) return { boQua: true };
  const r = chu.getBoundingClientRect();
  const trung = d.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const chon = trung?.closest('.el');
  return { mong: chu.dataset.el, duoc: chon?.dataset.el ?? null, trongCum: Boolean(chon?.closest('.k-group')) };
});
if (bam.boQua) {
  console.log('     (clip này không có chữ, bỏ qua)');
} else {
  dat('bấm vào giữa một món thì chọn trúng một .el', bam.duoc !== null, `được "${bam.duoc}"`);
}

/* ---------- 8. Không có lỗi JS ---------- */
console.log('\n8. Lỗi trên trang');
dat('không có lỗi JS', loiTrang.length === 0, loiTrang.slice(0, 3).join(' | ') || 'sạch');

await trang.screenshot({ path: path.join(ANH, 'khung-xem.png'), scale: 'css' });
console.log(`\nẢnh: ${path.join(ANH, 'khung-xem.png')}`);

/* ---------- 9. Quét qua từng clip ---------- */
console.log('\n9. Quét qua tất cả clip');
const dsSlug = await trang.evaluate(() =>
  [...document.querySelectorAll('#chon-clip option')].filter((o) => !o.disabled).map((o) => o.value));

const thieuTheoClip = [];
for (const slug of dsSlug) {
  loiTrang.length = 0;
  thieuFile.length = 0;
  // Đánh dấu đang mở TRƯỚC khi đổi, rồi chờ trình sửa tự báo xong. Không chờ
  // `__clip` được: cho tới lúc tài liệu mới thật sự thay vào, `contentWindow`
  // vẫn còn giữ `__clip` CŨ, nên chờ nó là chờ nhầm một giá trị ôi.
  await trang.evaluate(() => { document.getElementById('app').dataset.trangThai = 'doi'; });
  await trang.selectOption('#chon-clip', slug);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
    { timeout: 30000 });

  const kq = await trang.evaluate(() => {
    const w = document.getElementById('khung').contentWindow;
    const d = w.document;
    const c = w.__clip;
    // Clip đời cũ chỉ dựng `__clip` khi có `export=1`, mà ta cố tình không bật.
    // Với chúng, "đạt" nghĩa là trang mở ra và có vẽ được cái gì đó, chứ không
    // phải là có `__clip`.
    if (!c) {
      return {
        doiCu: true,
        coThan: d.body ? d.body.children.length : 0,
        tieuDe: d.title || '(không tên)',
      };
    }
    const els = [...d.querySelectorAll('.el')];
    const canh = c.scenes();
    return {
      dai: c.duration,
      soCanh: canh.length,
      duPhong: canh.some((x) => x.id === 'err'),
      tong: els.length,
      thieuTen: els.filter((e) => !e.dataset.el || !e.dataset.scene).length,
    };
  });

  // Khoá điều khiển: clip đời cũ phải khoá, clip đời mới phải mở.
  const khoa = await trang.evaluate(() => document.getElementById('nut-chay').disabled);

  const ok = kq.doiCu
    ? kq.coThan > 0 && khoa && loiTrang.length === 0
    : !kq.duPhong && kq.dai > 0 && kq.thieuTen === 0 && !khoa && loiTrang.length === 0;

  dat(
    `${slug}`.padEnd(16),
    ok,
    (kq.doiCu
      ? `đời cũ · "${kq.tieuDe}" · điều khiển ${khoa ? 'đã khoá ✓' : '⚠ CHƯA KHOÁ'}`
      : `${kq.dai.toFixed(1)}s · ${kq.soCanh} cảnh · ${kq.tong} phần tử` +
        (kq.duPhong ? ' · ⚠ RƠI VÀO KỊCH BẢN DỰ PHÒNG' : '') +
        (kq.thieuTen ? ` · ⚠ ${kq.thieuTen} phần tử thiếu tên` : '') +
        (khoa ? ' · ⚠ ĐIỀU KHIỂN BỊ KHOÁ NHẦM' : '')) +
      (loiTrang.length ? ` · ⚠ lỗi JS: ${loiTrang[0].slice(0, 70)}` : ''),
  );
  if (thieuFile.length) {
    thieuTheoClip.push({ slug, thieu: [...new Set(thieuFile)] });
  }
}

if (thieuTheoClip.length) {
  console.log('\n   Tài nguyên thiếu trong dự án clip (có từ trước, không phải lỗi trình sửa):');
  for (const { slug, thieu } of thieuTheoClip) {
    for (const t of thieu) console.log(`     · ${slug}: ${t}`);
  }
}

await trinh.close();

console.log(hong === 0 ? '\n✅ Cửa ải M0: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
