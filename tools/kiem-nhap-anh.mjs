#!/usr/bin/env node
/**
 * KIỂM MANG ẢNH VÀO — dán Ctrl+V và kéo từ ngoài thả vào khung hình.
 *
 * TRƯỚC KHI CÓ TÍNH NĂNG NÀY, bảng thuộc tính chỉ nhận một ĐƯỜNG DẪN chữ
 * (`public/ten-file.png`), tức ảnh phải nằm sẵn trong dự án clip từ trước. Với
 * người dùng của công cụ này thì coi như không có đường nào cả.
 *
 * BỐN CỬA PHẢI CANH:
 *
 *   ① Máy chủ KHÔNG tin `mime` client khai. Nhận nhãn rồi ghi bừa thì ai cũng
 *      gửi được một file bất kỳ kèm nhãn `image/png`.
 *   ② Cùng một tấm ảnh dán hai lần chỉ tốn MỘT file. Dán đi dán lại một ảnh
 *      chụp màn hình là chuyện xảy ra suốt.
 *   ③ Tên ảnh không được dùng để đi ra ngoài thư mục kho.
 *   ④ Bộ xuất video phải lấy được ảnh. Thiếu cửa này thì clip xem trên màn hình
 *      có ảnh mà video xuất ra thủng đúng chỗ đó — im lặng, vì một tấm ảnh 404
 *      chỉ để lại ô trống chứ không báo lỗi gì.
 *
 *   node tools/kiem-nhap-anh.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* Dựng PNG bằng chính Node cho gọn: `zlib` có sẵn, khỏi kéo thêm thư viện. */
const { deflateSync } = await import('node:zlib');
const { crc32 } = await import('node:zlib');
function taoPng(r, c, mau) {
  const khoi = (ten, d) => {
    const than = Buffer.concat([Buffer.from(ten, 'latin1'), d]);
    const dai = Buffer.alloc(4); dai.writeUInt32BE(d.length);
    const ma = Buffer.alloc(4); ma.writeUInt32BE(crc32(than) >>> 0);
    return Buffer.concat([dai, than, ma]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(r, 0); ihdr.writeUInt32BE(c, 4);
  ihdr[8] = 8; ihdr[9] = 2;   // 8 bit, RGB
  const hang = Buffer.concat(
    Array.from({ length: c }, () => Buffer.concat([
      Buffer.from([0]), Buffer.concat(Array.from({ length: r }, () => Buffer.from(mau))),
    ])),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    khoi('IHDR', ihdr), khoi('IDAT', deflateSync(hang)), khoi('IEND', Buffer.alloc(0)),
  ]);
}

/* Chụp danh sách ảnh TRƯỚC khi chạy. Ảnh của bài kiểm rơi vào dự án clip thật —
   một thư mục KHÔNG có git. Để lại thì mỗi lần chạy thả thêm rác, mà xoá cả thư
   mục thì xoá luôn ảnh người dùng đã dán vào clip của họ. Chỉ dọn đúng phần
   mình vừa sinh ra. */
const { khoCua } = await import(path.join(M, 'server', 'kho.js'));
const { thuMucAnh } = await import(path.join(M, 'server', 'anh.js'));
const THU_MUC_ANH = thuMucAnh(khoCua(''));
const coSan = new Set(existsSync(THU_MUC_ANH) ? readdirSync(THU_MUC_ANH) : []);
const donDep = () => {
  if (!existsSync(THU_MUC_ANH)) return 0;
  let n = 0;
  for (const f of readdirSync(THU_MUC_ANH)) {
    if (coSan.has(f)) continue;
    rmSync(path.join(THU_MUC_ANH, f), { force: true });
    n += 1;
  }
  return n;
};
process.on('exit', donDep);

const goi = async (duong, than, cach = 'POST') => {
  const r = await fetch(`${GOC}${duong}`, {
    method: cach, headers: { 'Content-Type': 'application/json' },
    body: than ? JSON.stringify(than) : undefined,
  });
  return { ma: r.status, ...(await r.json().catch(() => ({}))) };
};

/* ---------- ① nhận dạng bằng chữ ký, không bằng lời khai ---------- */
console.log('\n① Máy chủ nhận ảnh — nhận dạng bằng chữ ký file');
const anh = taoPng(6, 4, [0x31, 0xd9, 0x75]);   // 6×4 để lát nữa kiểm tỉ lệ
const b64 = anh.toString('base64');

const len1 = await goi('/api/anh', { b64 });
dat('nhận một PNG thật', len1.ok === true && /^\/anh\/[0-9a-f]{16}\.png$/.test(len1.src || ''),
  len1.src || len1.loi);

const gia = await goi('/api/anh', { b64: Buffer.from('#!/bin/sh\nrm -rf /').toString('base64') });
dat('KHÔNG nhận file không phải ảnh, dù client khai gì',
  gia.ok === false && gia.ma === 415, gia.loi?.slice(0, 50));
dat('chặn ảnh quá nặng, và nói đúng con số',
  /4 MB/.test((await goi('/api/anh', { b64: 'A'.repeat(7 * 1024 * 1024) })).loi || ''));
dat('không có gì thì chặn', (await goi('/api/anh', {})).ok === false);

/* ---------- ② cùng ảnh, một file ---------- */
console.log('\n② Dán lại đúng tấm ảnh cũ thì không đẻ thêm file');
const len2 = await goi('/api/anh', { b64 });
dat('lần hai trả về ĐÚNG đường dẫn cũ', len2.src === len1.src, `${len1.src} vs ${len2.src}`);
dat('và nói rõ là file đã có sẵn', len2.moi === false);
/* Đổi một điểm ảnh là ra một file khác — nếu không thì hai ảnh khác nhau đè
   lên nhau, và người dùng thấy ảnh mình vừa dán biến thành ảnh của lần trước. */
const khac = await goi('/api/anh', { b64: taoPng(6, 4, [0x00, 0x00, 0x00]).toString('base64') });
dat('ảnh KHÁC thì ra file khác', khac.ok === true && khac.src !== len1.src, khac.src);

/* ---------- ③ tên ảnh không đi ra ngoài kho ---------- */
console.log('\n③ Tên ảnh không dùng để đi ra ngoài thư mục kho');
/* `../` KHÔNG tới được route này: `new URL()` chuẩn hoá đường dẫn trước, nên
   `/anh/../../etc/passwd` biến thành `/etc/passwd` và rơi vào trang chủ. Canh
   theo NỘI DUNG chứ đừng canh theo mã: đòi 404 ở đây là bài kiểm đỏ vì một lý
   do chẳng liên quan gì tới bảo mật. */
{
  const r = await fetch(`${GOC}/anh/../../etc/passwd`);
  const than = await r.text();
  dat('"../../etc/passwd" không trả về nội dung file hệ thống',
    !/root:.*:0:0:/.test(than), than.slice(0, 40));
}
/* Còn đường ĐÃ MÃ HOÁ thì tới được route, và phải bị khuôn tên chặn. */
for (const bay of ['..%2f..%2fetc%2fpasswd', '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  'a.png', 'ABCDEF0123456789.png', '0123456789abcdef.exe']) {
  const r = await fetch(`${GOC}/anh/${bay}`);
  dat(`"${bay}" không lấy được gì`, r.status === 400 || r.status === 404, `mã ${r.status}`);
}
const co = await fetch(`${GOC}${len1.src}`);
dat('ảnh thật thì lấy được, đúng kiểu',
  co.status === 200 && co.headers.get('content-type') === 'image/png',
  `mã ${co.status} · ${co.headers.get('content-type')}`);

/* ---------- ④ bộ xuất video lấy được ảnh ---------- */
console.log('\n④ Bộ xuất video (không có cookie, chỉ có vé) lấy được ảnh');
{
  /* Đây là cửa dễ quên nhất và hỏng im lặng nhất: xem trên màn hình thì có ảnh,
     video xuất ra thì thủng đúng chỗ đó. Gọi thẳng `duocVaoKhiXuat` thay vì dựng
     cả một lượt xuất — lượt xuất mất vài phút mà chỉ để canh đúng một dòng. */
  const { duocVaoKhiXuat } = await import(path.join(M, 'server', 'dangnhap.js'));
  dat('đường ảnh nằm trong danh sách vé xuất được phép đi', duocVaoKhiXuat(len1.src) === true);
  dat('vé xuất vẫn KHÔNG mở được đường khác', duocVaoKhiXuat('/api/clip/cta') === false);
}

/* ---------- ⑤ phép tính cỡ hiển thị ---------- */
console.log('\n⑤ Cỡ mặc định giữ đúng tỉ lệ ảnh');
{
  const { coVua } = await import(path.join(M, 'web', 'nhapanh.js'));
  const meta = { width: 1280, height: 720 };
  const ngang = coVua(1600, 400, meta);
  dat('ảnh bìa rất ngang: chạm trần bề rộng, giữ tỉ lệ 4:1',
    ngang.w === 512 && ngang.h === 128, JSON.stringify(ngang));
  const doc2 = coVua(800, 1600, meta);
  dat('ảnh chân dung: chạm trần bề CAO, không tràn khung',
    doc2.h === 288 && doc2.w === 144, JSON.stringify(doc2));
  dat('ảnh không đo được thì ra ô vuông, không chia cho 0',
    coVua(0, 0, meta).w === coVua(0, 0, meta).h && coVua(0, 0, meta).w > 0,
    JSON.stringify(coVua(0, 0, meta)));
}

/* ---------- ⑥ dán và kéo thả thật trên trình duyệt ---------- */
console.log('\n⑥ Dán Ctrl+V và kéo thả thật');
const trinh = await chromium.launch();
try {
  const tr = await trinh.newPage({ viewport: { width: 1500, height: 980 } });
  const loiJS = [];
  tr.on('pageerror', (e) => loiJS.push(String(e)));
  await tr.goto(`${GOC}/sua?clip=cta`, { waitUntil: 'load' });
  await tr.waitForTimeout(4500);

  const demAnh = () => tr.evaluate(() => {
    const d = document.getElementById('khung')?.contentDocument;
    return d ? d.querySelectorAll('.el img').length : -1;
  });
  const truoc = await demAnh();

  /* Dựng một sự kiện `paste` mang FILE thật. `DataTransfer` trong trang làm
     được việc này mà không cần quyền truy cập khay nhớ tạm của hệ điều hành —
     thứ trình duyệt chạy tự động không có. */
  await tr.evaluate(async (b) => {
    const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bin], 'dan.png', { type: 'image/png' }));
    document.body.focus();
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, b64);
  await tr.waitForTimeout(2500);

  dat('dán Ctrl+V thì cảnh có thêm một ảnh', await demAnh() === truoc + 1,
    `${truoc} → ${await demAnh()}`);

  const mon = await tr.evaluate(() => {
    const d = document.getElementById('khung')?.contentDocument;
    const i = [...(d?.querySelectorAll('.el img') || [])].pop();
    const e = i?.closest('.el');
    return { src: i?.getAttribute('src'), rong: e?.style.width, cao: e?.style.height };
  });
  dat('ảnh trỏ vào kho ảnh của mình, không phải dữ liệu nhúng',
    /^\/anh\/[0-9a-f]{16}\.png$/.test(mon.src || ''), mon.src);
  /* 6×4 thu vừa 40% của 1280×720: chạm trần bề rộng → 512×341. Con số cụ thể
     không quan trọng bằng việc TỈ LỆ ĐÚNG — ảnh méo là thứ nhìn ra ngay. */
  dat('cỡ mặc định giữ đúng tỉ lệ 3:2 của ảnh',
    Math.abs(parseFloat(mon.rong) / parseFloat(mon.cao) - 1.5) < 0.02,
    `${mon.rong} × ${mon.cao}`);

  dat('dán xong thì món mới được chọn sẵn, khỏi phải đi tìm',
    await tr.evaluate(() => document.querySelector('.khung-chon')?.style.display === 'block'));

  /* Kéo thả: đặt ảnh vào đúng một điểm trên khung, rồi xem `x` có bám điểm đó
     không. Thả một chỗ mà ảnh nhảy vào giữa khung là bắt người ta kéo lại đúng
     việc họ vừa làm. */
  const truoc2 = await demAnh();
  const diem = await tr.evaluate(() => {
    const r = document.getElementById('boc-khung').getBoundingClientRect();
    return { x: Math.round(r.left + r.width * 0.25), y: Math.round(r.top + r.height * 0.3) };
  });
  await tr.evaluate(async ([b, d]) => {
    const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bin], 'keo.png', { type: 'image/png' }));
    const boc = document.getElementById('boc-khung');
    const tao = (ten) => new DragEvent(ten, {
      dataTransfer: dt, bubbles: true, cancelable: true, clientX: d.x, clientY: d.y });
    boc.dispatchEvent(tao('dragenter'));
    boc.dispatchEvent(tao('dragover'));
    boc.dispatchEvent(tao('drop'));
  }, [taoPng(6, 4, [0x10, 0x20, 0x30]).toString('base64'), diem]);
  await tr.waitForTimeout(2500);

  dat('kéo từ ngoài thả vào cũng thêm được ảnh', await demAnh() === truoc2 + 1,
    `${truoc2} → ${await demAnh()}`);

  const cho = await tr.evaluate(() => {
    const d = document.getElementById('khung')?.contentDocument;
    const e = [...(d?.querySelectorAll('.el img') || [])].pop()?.closest('.el');
    const cam = d?.querySelector('#cam')?.getBoundingClientRect();
    const r = e?.getBoundingClientRect();
    return r && cam ? { giua: r.left + r.width / 2 - cam.left, camRong: cam.width } : null;
  });
  /* Thả ở 25% bề ngang → tâm ảnh phải nằm quanh đó. Sai số 6% cho phần khung
     xem không khít iframe (clip dọc nằm giữa hai dải đen). */
  dat('ảnh ra đúng chỗ vừa thả, không nhảy vào giữa khung',
    cho && Math.abs(cho.giua / cho.camRong - 0.25) < 0.06,
    cho ? `tâm ở ${(cho.giua / cho.camRong * 100).toFixed(1)}% bề ngang` : 'không đo được');

  /* Người dùng đang gõ trong một ô chữ mà Ctrl+V lại đẻ ra một tấm ảnh thì đó
     là công cụ cướp phím của họ. */
  const truoc3 = await demAnh();
  await tr.evaluate(async (b) => {
    const o = document.querySelector('#bang-thuoc-tinh input[type=text], #bang-thuoc-tinh textarea')
      || document.querySelector('input[type=text]');
    o?.focus();
    const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bin], 'x.png', { type: 'image/png' }));
    (o || document).dispatchEvent(new ClipboardEvent('paste',
      { clipboardData: dt, bubbles: true, cancelable: true }));
  }, b64);
  await tr.waitForTimeout(1200);
  dat('đang gõ trong ô chữ thì Ctrl+V KHÔNG cướp mất để dán ảnh',
    await demAnh() === truoc3, `${truoc3} → ${await demAnh()}`);

  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await tr.close();
} finally {
  await trinh.close();
}

/* ---------- dọn ---------- */
console.log(`\n  · dọn ${donDep()} tấm ảnh do bài kiểm sinh ra.`);

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Mang ảnh vào đạt hết.\n');
process.exit(hong ? 1 : 0);
