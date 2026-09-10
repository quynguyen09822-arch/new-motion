/**
 * CHỤP TRANG `public/html-foot/ttindex.html` LÀM ẢNH XEM TRƯỚC CHO CLIP.
 *
 * Cảnh cuối của `thu-trien-khai-html` bật ra một cửa sổ trình duyệt hiển thị
 * chính trang vừa triển khai. Trước đây tôi vẽ tay lại trang bằng khối và chữ —
 * nhìn hao hao nhưng không phải nó. Vẽ tay một trang thật thì không bao giờ
 * giống: sai phông, thiếu mây, thiếu sao, thiếu ảnh áo.
 *
 * Khổ 1520×784 = đúng 2× vùng trang bên trong cửa sổ của clip (760×392). Giữ
 * đúng tỉ lệ thì `fit: cover` không cắt mất gì, và 2× thì vẫn nét khi xuất
 * 1080p (lúc đó sân khấu phóng 1,5×).
 *
 * Chạy: node tools/chup-ttindex.mjs
 */
import path from 'node:path';
import { chromium } from '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production/tools/node_modules/playwright/index.mjs';

const PROJ = '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const NGUON = path.join(PROJ, 'public/html-foot/ttindex.html');
const RA = path.join(PROJ, 'public/image/ttindex-xem-truoc.png');
const RA_DT = path.join(PROJ, 'public/image/ttindex-dien-thoai.png');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1520, height: 784 }, deviceScaleFactor: 1 });
await p.goto(`file://${NGUON}`, { waitUntil: 'load' });
await p.waitForTimeout(2000);
// Trang có hiệu ứng hiện dần khi cuộn (`.rv`). Không ép thì phần dưới màn hình
// đầu tiên vẫn trong suốt lúc chụp.
await p.evaluate(() => document.querySelectorAll('.rv')
  .forEach((n) => n.classList.add('in', 'vis', 'show')));
await p.waitForTimeout(600);
await p.screenshot({ path: RA });
await p.close();

/*
 * Bản điện thoại: 420×910 ≈ khổ màn hình một chiếc điện thoại thường. Trang có
 * bố cục co theo bề ngang nên ở khổ này nó tự xếp lại thành một cột — đó chính
 * là thứ cần cho cảnh "cùng một link, mở trên điện thoại cũng chạy".
 */
const dt = await b.newPage({ viewport: { width: 420, height: 910 }, deviceScaleFactor: 1 });
await dt.goto(`file://${NGUON}`, { waitUntil: 'load' });
await dt.waitForTimeout(2000);
await dt.evaluate(() => document.querySelectorAll('.rv')
  .forEach((n) => n.classList.add('in', 'vis', 'show')));
await dt.waitForTimeout(600);
await dt.screenshot({ path: RA_DT });
await b.close();
console.log(`✓ ${RA}`);
console.log(`✓ ${RA_DT}`);
