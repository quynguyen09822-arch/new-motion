#!/usr/bin/env node
/**
 * KIỂM KÉO ĐỔI BỀ RỘNG HAI CỘT.
 *
 * Phần dễ là kéo cho cột rộng ra. Phần dễ hỏng là thứ đi theo sau nó:
 *
 *   · KHUNG CHỌN LỆCH. Lớp phủ vẽ khung chọn nằm ở TRANG CHA và tính theo toạ
 *     độ màn hình. Cột rộng ra thì khung xem ở giữa hẹp lại, mà không vẽ lại
 *     lớp phủ là cái khung xanh đứng nguyên chỗ cũ — lệch hẳn khỏi món. Hỏng
 *     lặng lẽ: nhìn vẫn thấy "có khung", chỉ là không đúng chỗ.
 *   · BÓP CHẾT KHUNG XEM. Kéo hết cỡ mà không chặn thì khung hình còn một sợi
 *     chỉ, và người dùng không có đường quay lại.
 *   · QUÊN. Kéo xong đổi clip hay tải lại trang mà về như cũ thì thà đừng có.
 *
 *   node tools/kiem-keo-cot.mjs [http://127.0.0.1:7803]
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

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1600, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

const rong = () => trang.evaluate(() => ({
  trai: Math.round(document.querySelector('.cot-trai').getBoundingClientRect().width),
  phai: Math.round(document.querySelector('.cot-phai').getBoundingClientRect().width),
  giua: Math.round(document.querySelector('.giua').getBoundingClientRect().width),
}));

async function keo(ben, dx) {
  const tay = await trang.$(`.keo-cot[data-cot="${ben}"]`);
  const b = await tay.boundingBox();
  await trang.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await trang.mouse.down();
  await trang.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2, { steps: 12 });
  await trang.mouse.up();
  await trang.waitForTimeout(350);
}

try {
  await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  // Về mặc định trước, không thì bài kiểm chạy lần hai lại nhận bề rộng lần một.
  await trang.evaluate(() => localStorage.removeItem('mb-video:cot'));
  await trang.reload({ waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.selectOption('#chon-clip', 'cta');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(1200);

  /* ---------- 1. có tay nắm, và kéo được ---------- */
  console.log('\n1. Hai tay nắm kéo được bằng chuột');
  const dau = await rong();
  dat('có đủ hai tay nắm',
    await trang.evaluate(() => document.querySelectorAll('.keo-cot').length) === 2);

  await keo('trai', 120);
  const a1 = await rong();
  dat('kéo tay trái sang phải thì cột trái rộng ra', a1.trai > dau.trai + 80,
    `${dau.trai} → ${a1.trai}px`);
  dat('khung xem ở giữa hẹp lại đúng phần đó', a1.giua < dau.giua - 80,
    `${dau.giua} → ${a1.giua}px`);

  await keo('phai', -90);
  const a2 = await rong();
  dat('kéo tay phải sang TRÁI thì cột phải rộng ra', a2.phai > a1.phai + 60,
    `${a1.phai} → ${a2.phai}px`);

  /* ---------- 2. khung chọn phải bám theo món ---------- */
  /* Đây là mục đáng giá nhất của cả bài: chọn một món, ghi lại chỗ khung xanh
     nằm SO VỚI chính món đó trong khung hình, kéo cột, rồi đo lại. */
  /*
   * PHẢI DÙNG CLIP NGANG. `cta` là clip dọc 720×1280, trong khung xem nó vừa
   * theo CHIỀU CAO — bóp hẹp cột giữa thì hệ số thu không đổi, nên khung chọn
   * đứng yên vẫn "đúng" và mục này báo qua dù lớp phủ không hề vẽ lại. Đã mắc:
   * thử gỡ hẳn lời gọi `veLopPhu()` mà mục vẫn xanh.
   * `thu-ve-lai-s02` là 1280×720, vừa theo CHIỀU NGANG — hẹp cột giữa là hệ số
   * thu đổi thật, và khung chọn cũ lệch ngay.
   */
  console.log('\n2. Kéo xong khung chọn vẫn ôm đúng món (clip NGANG)');
  await trang.selectOption('#chon-clip', 'thu-ve-lai-s02');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(1300);
  await trang.evaluate(() =>
    [...document.querySelectorAll('.lop-hang')].find((x) => x.dataset.mon === 't-nav')?.click());
  await trang.waitForTimeout(600);

  const doLech = () => trang.evaluate(() => {
    const k = document.querySelector('.khung-chon');
    if (!k || getComputedStyle(k).display === 'none') return null;
    const d = document.getElementById('khung').contentWindow.document;
    const n = d.querySelector('.el[data-el="t-nav"]');
    if (!n) return null;
    const a = k.getBoundingClientRect();
    const bK = document.getElementById('khung').getBoundingClientRect();
    const bN = n.getBoundingClientRect();   // toạ độ trong iframe
    // Quy về cùng hệ: mép món trên màn hình = mép iframe + mép món trong iframe.
    return { dx: Math.abs(a.left - (bK.left + bN.left)), dy: Math.abs(a.top - (bK.top + bN.top)) };
  });

  const truoc = await doLech();
  dat('khung chọn hiện ra và ôm đúng món', truoc && truoc.dx < 4 && truoc.dy < 4,
    truoc ? `lệch ${truoc.dx.toFixed(1)}×${truoc.dy.toFixed(1)}px` : 'không thấy khung chọn');

  await keo('trai', 110);
  const sau = await doLech();
  dat('kéo cột xong khung chọn VẪN ôm đúng món', sau && sau.dx < 4 && sau.dy < 4,
    sau ? `lệch ${sau.dx.toFixed(1)}×${sau.dy.toFixed(1)}px` : 'không thấy khung chọn');

  /* ---------- 3. chặn ---------- */
  console.log('\n3. Không kéo bóp chết khung xem được');
  await keo('trai', 1200);
  const het = await rong();
  dat('cột trái dừng ở mức tối đa', het.trai <= 560, `${het.trai}px`);
  dat('khung xem ở giữa vẫn còn chỗ', het.giua >= 410, `${het.giua}px`);
  await keo('trai', -1200);
  const nho = await rong();
  dat('cột trái không kéo mất hẳn được', nho.trai >= 190, `${nho.trai}px`);

  /* ---------- 4. nhớ ---------- */
  console.log('\n4. Nhớ bề rộng qua lần mở sau');
  await keo('trai', 150);
  const luc = await rong();
  await trang.reload({ waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(900);
  const lai = await rong();
  dat('tải lại trang vẫn giữ bề rộng', Math.abs(lai.trai - luc.trai) < 4,
    `${luc.trai} → ${lai.trai}px`);

  /* ---------- 5. bàn phím và bấm đúp ---------- */
  console.log('\n5. Bàn phím dùng được, bấm đúp về mặc định');
  await trang.focus('.keo-cot[data-cot="trai"]');
  const t1 = (await rong()).trai;
  await trang.keyboard.press('ArrowLeft');
  await trang.keyboard.press('ArrowLeft');
  await trang.waitForTimeout(300);
  const t2 = (await rong()).trai;
  dat('mũi tên trái làm cột hẹp lại', t2 < t1, `${t1} → ${t2}px`);
  dat('tay nắm khai đúng cho trình đọc màn hình',
    await trang.evaluate(() => {
      const k = document.querySelector('.keo-cot[data-cot="trai"]');
      return k.getAttribute('role') === 'separator' && Boolean(k.getAttribute('aria-label'));
    }));
  await trang.dblclick('.keo-cot[data-cot="trai"]');
  await trang.waitForTimeout(300);
  dat('bấm đúp về mặc định 272px', (await rong()).trai === 272, `${(await rong()).trai}px`);

  console.log('\n6. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
}

console.log(hong === 0 ? '\n✅ Kéo đổi bề rộng cột: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
