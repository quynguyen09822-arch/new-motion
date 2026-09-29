#!/usr/bin/env node
/**
 * ĐỌC MỘT TRANG HTML THÀNH BẢN ĐỒ BỐ CỤC.
 *
 * Dùng cho đường Stitch → Motion: Stitch sinh ra màn hình dạng HTML, ta đọc nó
 * thành danh sách khối có TOẠ ĐỘ, MÀU, CỠ CHỮ, ĐỆM chính xác, rồi mới đưa AI
 * ghép sang thành phần của app.
 *
 * VÌ SAO KHÔNG ĐỌC HTML BẰNG CÁCH PHÂN TÍCH CHỮ
 *
 *   Stitch xuất ra Tailwind: `class="px-6 py-4 bg-slate-900/80 rounded-xl"`.
 *   Muốn biết cái khối đó đệm bao nhiêu pixel, màu gì, thì phải dựng lại cả bộ
 *   luật Tailwind — kể cả `/80` là độ mờ, kể cả biến CSS, kể cả thứ tự đè nhau.
 *   Sai một luật là sai cả bản đồ, và sai lặng lẽ.
 *
 *   Mở trong Chromium rồi hỏi `getComputedStyle` thì **trình duyệt đã tính hộ**:
 *   ra `padding: 24px`, `background: rgb(15, 23, 42)`. Không đoán, không dựng
 *   lại luật của ai. Đây cũng là cách `check-layout.mjs` của dự án clip đang đo.
 *
 * VÌ SAO KHÔNG ĐƯA THẲNG HTML CHO AI
 *
 *   43 KB HTML cho một màn. Nhét cả vào lời nhắc là tốn token, chậm, và model
 *   vẫn phải tự suy ra pixel từ tên class — đúng việc nó làm dở. Đưa bản đồ đã
 *   đo rồi thì AI chỉ còn làm phần nó giỏi: nhìn một khối và nói "cái này là
 *   `card`", "cái này là `nut`".
 *
 *   node tools/doc-html.mjs <đường-dẫn-hoặc-URL> [--rong 1280] [--cao 720]
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { doBoCuc } from '../web/dobocuc.js';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const args = process.argv.slice(2);
const nguon = args.find((a) => !a.startsWith('--'));
const lay = (ten, mac) => {
  const i = args.indexOf(`--${ten}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : mac;
};
const RONG = lay('rong', 1280);
const CAO = lay('cao', 720);

if (!nguon) {
  console.error('Cần một đường dẫn file HTML hoặc URL.\n  node tools/doc-html.mjs <file|url>');
  process.exit(1);
}

/* Đọc ở khổ NÀO thì ra toạ độ theo khổ ấy. Đọc trang desktop 2560px rồi đem
   toạ độ đó đặt vào clip 1280px là mọi thứ lệch gấp đôi — nên đặt bề rộng cửa
   sổ đúng bằng bề rộng clip ngay từ đầu, để trang tự dàn lại theo khổ thật. */
const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: RONG, height: CAO } });

const diaChi = /^https?:/.test(nguon)
  ? nguon
  : (existsSync(nguon) ? pathToFileURL(path.resolve(nguon)).href : nguon);

await trang.goto(diaChi, { waitUntil: 'networkidle', timeout: 60000 });
/* Chờ phông: Stitch nạp Be Vietnam Pro từ Google Fonts, và cỡ chữ đo trước khi
   phông về là cỡ của phông dự phòng — lệch hẳn. */
await trang.evaluate(() => document.fonts.ready);
await trang.waitForTimeout(400);

/* Thuật toán đo nằm ở `web/dobocuc.js` — CÙNG một hàm mà trình duyệt người
   dùng chạy trên bản triển khai. Đừng chép lại vào đây. */
const banDo = await trang.evaluate(doBoCuc);

await trinh.close();

/* Dọn trường rỗng cho gọn — bản đồ này sẽ đi vào lời nhắc, mỗi `undefined` in
   ra là token trả tiền mà không mang tin gì. */
const sach = JSON.parse(JSON.stringify(banDo));
console.log(JSON.stringify(sach, null, 1));
