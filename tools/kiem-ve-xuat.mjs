#!/usr/bin/env node
/**
 * KIỂM VÉ XUẤT VIDEO — chiếc chìa cho đúng một việc, không phải một lần đăng nhập.
 *
 * Chạy bằng Node trần: dựng máy chủ riêng có mật khẩu, rồi gọi bằng `fetch`.
 * Không cần Chromium.
 *
 * VÌ SAO PHẢI CÓ BÀI NÀY. Đây là chỗ DUY NHẤT trong cả ứng dụng mà một đường
 * dẫn tự nó mở được cửa đăng nhập. Nới nó ra một ly — cho thêm một đường, quên
 * mất hạn, hay lỡ tay bỏ điều kiện `xuat` — là biến một chiếc chìa thành một
 * cửa sau. Mà cửa sau thì không kêu, không log, và không ai biết cho tới lúc
 * muộn.
 *
 *   node tools/kiem-ve-xuat.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MK = 'mat-khau-ve-xuat-123';
const DUOI = '@ve-kiem.test';
const AI = `nguoi-kiem${DUOI}`;
const CONG = 7893;
const KHOA = 'khoa-ve-kiem';

/* ĐẶT KHOÁ KÝ TRƯỚC KHI NẠP `dangnhap.js`, và đây là hai việc trong một:
 *
 *  1. Bài kiểm này TỰ KÝ vé rồi gửi cho máy chủ, nên hai bên phải dùng chung
 *     một khoá. Khác khoá thì mọi vé đều bị từ chối và bài kiểm đỏ vì chính nó
 *     sai, chứ không phải vì mã sai.
 *  2. Quan trọng hơn: không đặt thì `khoaKy()` KHÔNG thấy khoá nào, tự sinh một
 *     cái rồi GHI VÀO `.env` THẬT. Một bài kiểm mà sửa cấu hình thật thì chạy
 *     xong người dùng bị khoá ra ngoài — luật đã ghi trong DANG-NHAP.md. */
process.env.MOTION_KHOA_PHIEN = KHOA;

const nap = (f) => import(pathToFileURL(path.join(M, 'server', f)).href);
const { bam, taoVe, taoVeXuat, duocVaoKhiXuat } = await nap('dangnhap.js');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const con = spawn('node', [path.join(M, 'server', 'main.js')], {
  cwd: M, stdio: ['ignore', 'ignore', 'pipe'],
  env: { ...process.env, PORT: String(CONG),
    MOTION_KHOA_PHIEN: KHOA,
    MOTION_MAT_KHAU_HASH: bam(MK),
    MOTION_DUOI_EMAIL: DUOI,
    MOTION_TAI_KHOAN: 'nguoi-kiem' },
});

const goc = `http://127.0.0.1:${CONG}`;
const goi = (duong, opt = {}) => fetch(goc + duong, { redirect: 'manual', ...opt });

try {
  let len = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await goi('/health')).ok) { len = true; break; } } catch { /* chưa lên */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  dat('máy chủ lên được', len);

  const ve = taoVeXuat(AI);

  console.log('\n1. Không có vé thì không vào được khung xem');
  {
    const r = await goi('/clip/scene-player.html?scene=cta');
    dat('trang khung xem bị chặn', r.status === 302, `nhận ${r.status}`);
    dat('kịch bản bị chặn', (await goi('/api/kich-ban/cta')).status === 401);
  }

  console.log('\n2. Có vé thì mở được ĐÚNG những đường để vẽ hình');
  {
    const r = await goi(`/clip/scene-player.html?scene=cta&ve=${encodeURIComponent(ve)}`);
    dat('mở được trang khung xem', r.status === 200, `nhận ${r.status}`);
    /* Trang khung xem kéo theo hàng chục đường con không mang tham số nào. Vé
       phải biến thành cookie ngay ở lời đáp đầu, không thì trang mở được mà
       rỗng ruột — và video quay ra một khung trắng. */
    const dat2 = r.headers.get('set-cookie') || '';
    dat('vé được đặt vào cookie cho các đường con', dat2.includes('motion_phien='));
    dat('cookie sống đúng một giờ, không phải 14 ngày', dat2.includes('Max-Age=3600'), dat2.slice(0, 60));
    dat('cookie vẫn HttpOnly', dat2.includes('HttpOnly'));

    const ck = dat2.split(';')[0];
    dat('đường con đi được bằng cookie vừa nhận',
      (await goi('/clip/public/fonts/chu.css', { headers: { Cookie: ck } })).status === 200);
    dat('kịch bản đọc được', (await goi('/api/kich-ban/cta', { headers: { Cookie: ck } })).status === 200);
  }

  console.log('\n3. Vé xuất KHÔNG mở một đường ghi nào');
  {
    const ck = `motion_phien=${encodeURIComponent(ve)}`;
    const ghi = async (duong, method = 'POST') =>
      (await goi(duong, { method, headers: { Cookie: ck, 'Content-Type': 'application/json' }, body: '{}' })).status;
    /* Lọt một trong mấy đường này thì một đường dẫn nhặt được trong log đủ để
       sửa hoặc xoá clip của người khác. */
    dat('lưu clip → 401', await ghi('/api/clip/cta') === 401);
    dat('tạo dự án → 401', await ghi('/api/du-an') === 401);
    dat('ghi nháp → 401', await ghi('/api/draft/cta', 'PUT') === 401);
    dat('khôi phục bản cũ → 401', await ghi('/api/restore/cta') === 401);
    dat('gọi AI → 401', await ghi('/api/hoi-ai') === 401);
    dat('xem danh sách clip → 401',
      (await goi('/api/clips', { headers: { Cookie: ck } })).status === 401);
    dat('xem kho dự án → 401',
      (await goi('/api/kho', { headers: { Cookie: ck } })).status === 401);
  }

  console.log('\n4. Danh sách trắng đúng như khai');
  {
    for (const d of ['/clip/scene-player.html', '/clip/public/anh.png', '/api/kich-ban/x', '/api/canh-mau', '/health']) {
      dat(`mở: ${d}`, duocVaoKhiXuat(d) === true);
    }
    for (const d of ['/', '/sua', '/api/clips', '/api/clip/x', '/api/du-an', '/api/export', '/app.js']) {
      dat(`đóng: ${d}`, duocVaoKhiXuat(d) === false);
    }
  }

  console.log('\n5. Vé hỏng, vé hết hạn, vé giả');
  {
    const het = taoVe(AI, { xuat: true, song: -10 });   // đã hết hạn
    dat('vé hết hạn không vào được',
      (await goi(`/clip/scene-player.html?ve=${encodeURIComponent(het)}`)).status === 302);
    const gia = `${ve.split('.')[0]}.chu-ky-bia-dat`;
    dat('vé sai chữ ký không vào được',
      (await goi(`/clip/scene-player.html?ve=${encodeURIComponent(gia)}`)).status === 302);
    /* Vé THƯỜNG (đăng nhập thật) vẫn phải mở được mọi thứ — nếu không thì bản vá
       này vừa khoá luôn người dùng thật ra ngoài. */
    const thuong = taoVe(AI);
    dat('vé đăng nhập thật vẫn mở được mọi đường',
      (await goi('/api/clips', { headers: { Cookie: `motion_phien=${encodeURIComponent(thuong)}` } })).status === 200);
  }

  console.log('\n6. Không để lại dấu vết trong cấu hình thật');
  {
    const { existsSync, readFileSync } = await import('node:fs');
    const f = path.join(M, '.env');
    const noiDung = existsSync(f) ? readFileSync(f, 'utf8') : '';
    /* `.env` của máy có thể đã có sẵn khoá phiên do `npm run dev` sinh ra — đó
       là chuyện bình thường. Thứ KHÔNG được phép có là dấu vết của bài kiểm. */
    dat('không có mật khẩu của bài kiểm trong .env', !noiDung.includes(bam(MK).slice(0, 12)));
    dat('không có khoá của bài kiểm trong .env', !noiDung.includes(KHOA));
    dat('không có đuôi email của bài kiểm trong .env', !noiDung.includes(DUOI));
  }
} finally {
  try { con.kill(); } catch { /* đã chết */ }
}

console.log(hong ? `\n❌ ${hong} mục hỏng.` : '\n✅ Vé xuất video: tất cả các mục đều qua.');
process.exit(hong ? 1 : 0);
