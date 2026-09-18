#!/usr/bin/env node
/**
 * KIỂM CLIP ĐỜI CŨ — chỉ xem, nhưng phải XEM CHO RA XEM.
 *
 * Lỗi đã vấp: chọn một clip đời cũ thì trình sửa tự nhảy sang thẻ "Khung nhấn",
 * mà thẻ đó THAY LUÔN sân khấu ở giữa — nên người dùng rơi vào một ô đen ghi
 * "clip này chưa chỉnh khung được", còn chính cái clip thì không thấy đâu. Muốn
 * liếc qua một clip cũ thì đi mở file nguồn còn nhanh hơn.
 *
 * Lỗi thứ hai, âm thầm hơn: những trang ấy phơi `window.__clip` (đủ
 * `duration/ready/play/at/seek`) nhưng CHỈ khi có `?export=1`. Trình sửa không
 * bật tham số đó nên nút Chạy và thanh tua chết cứng, đồng hồ ghi "trang tự
 * chạy" — xem một clip 90 giây phải ngồi đợi đủ 90 giây.
 *
 * Chỉ ĐỌC, không sửa gì — clip đời cũ là file .html của dự án chung.
 *
 *   node tools/kiem-doi-cu.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1600, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });

  /* ---------- 1. tên clip không còn thực thể HTML ---------- */
  console.log('\n1. Tên clip đọc ra chữ thật, không phải thực thể HTML');
  const ds = await trang.$$eval('#chon-clip optgroup[label*="đời cũ"] option',
    (o) => o.map((x) => ({ slug: x.value, ten: x.textContent })));
  dat('có clip đời cũ để kiểm', ds.length > 0, `${ds.length} clip`);
  const xau = ds.filter((c) => /&(amp|lt|gt|quot|#\d+);/.test(c.ten));
  dat('không tên nào còn "&amp;" hay bạn của nó', xau.length === 0,
    xau.map((c) => c.ten).join(' · ') || 'sạch cả ' + ds.length);

  /* ---------- 2. mở clip nào cũng THẤY clip đó ---------- */
  console.log('\n2. Mở clip đời cũ thì thấy ngay chính clip, không nhảy đi đâu');
  const kq = [];
  for (const c of ds) {
    await trang.selectOption('#chon-clip', c.slug);
    await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 45000 });
    await trang.waitForTimeout(500);
    kq.push(await trang.evaluate(() => {
      const boc = document.getElementById('boc-khung').getBoundingClientRect();
      const kh = document.getElementById('khung').getBoundingClientRect();
      return {
        the: document.querySelector('.the[aria-selected="true"]')?.textContent.trim(),
        khungHien: !document.getElementById('san-clip').classList.contains('an'),
        khoa: document.getElementById('nut-chay').disabled,
        dai: document.getElementById('dong-ho').textContent,
        vua: kh.width <= boc.width + 2 && kh.height <= boc.height + 2,
        rong: Math.round(kh.width), bocRong: Math.round(boc.width),
      };
    }));
  }
  const saiThe = kq.filter((k) => k.the !== 'Thuộc tính');
  dat('luôn đứng ở thẻ "Thuộc tính", KHÔNG tự nhảy sang "Khung nhấn"',
    saiThe.length === 0, saiThe.map((k) => k.the).join(', ') || `cả ${kq.length} clip`);
  dat('khung xem luôn hiện', kq.every((k) => k.khungHien), `${kq.filter((k) => k.khungHien).length}/${kq.length}`);
  dat('clip thu vừa khung, không tràn ra ngoài', kq.every((k) => k.vua),
    kq.find((k) => !k.vua) ? `${kq.find((k) => !k.vua).rong}px > ${kq.find((k) => !k.vua).bocRong}px` : `cả ${kq.length} clip`);

  /* ---------- 3. chạy và tua được ---------- */
  console.log('\n3. Chạy và tua được, không phải ngồi đợi trang tự chạy');
  const moDuoc = kq.filter((k) => !k.khoa);
  dat('nút Chạy mở cho clip đời cũ', moDuoc.length === kq.length,
    `${moDuoc.length}/${kq.length} clip điều khiển được`);
  /* Đọc SỐ ra mà so, đừng so bằng chuỗi: "0,0 / 50,0 giây" kết thúc bằng đúng
     chữ "0,0 giây" nên phép so chuỗi báo oan — đã mắc ngay lần chạy đầu. */
  const daiGiay = (t) => Number.parseFloat(String(t).split('/')[1]?.replace(',', '.')) || 0;
  const coDai = kq.filter((k) => daiGiay(k.dai) > 0);
  dat('đồng hồ biết thời lượng thật', coDai.length === kq.length,
    `${coDai.length}/${kq.length} · ${kq.find((k) => daiGiay(k.dai) <= 0)?.dai || 'ngắn nhất ' + Math.min(...coDai.map((k) => daiGiay(k.dai))) + 's'}`);

  await trang.selectOption('#chon-clip', ds[0].slug);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 45000 });
  await trang.waitForTimeout(600);
  await trang.click('#nut-chay');
  await trang.waitForTimeout(1300);
  const dangChay = await trang.evaluate(() => ({
    nhan: document.getElementById('nut-chay').textContent.trim(),
    giay: document.getElementById('dong-ho').textContent,
  }));
  dat('bấm Chạy thì đồng hồ nhích lên', /^[1-9]|^0,[3-9]/.test(dangChay.giay), dangChay.giay);
  dat('nhãn đổi thành "Dừng"', dangChay.nhan.includes('Dừng'), dangChay.nhan);
  await trang.click('#nut-chay');
  await trang.waitForTimeout(300);

  // tua bằng thanh tua
  const truoc = await trang.evaluate(() => document.getElementById('dong-ho').textContent);
  await trang.evaluate(() => {
    const t = document.getElementById('thanh-tua');
    t.value = '600';
    t.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await trang.waitForTimeout(500);
  const sau = await trang.evaluate(() => document.getElementById('dong-ho').textContent);
  dat('kéo thanh tua thì nhảy tới đúng chỗ', truoc !== sau, `${truoc} → ${sau}`);

  /* ---------- 4. thẻ Khung nhấn vẫn bấm được ---------- */
  console.log('\n4. Thẻ "Khung nhấn" vẫn còn đó để bấm');
  const coThe = await trang.evaluate(() => {
    const t = document.getElementById('the-khung');
    return { hien: !t.classList.contains('an'), doc: Boolean(t.offsetParent) };
  });
  dat('thẻ Khung nhấn hiện ra', coThe.hien && coThe.doc);

  console.log('\n5. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
}

console.log(hong === 0 ? '\n✅ Clip đời cũ: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
