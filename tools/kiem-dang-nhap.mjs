#!/usr/bin/env node
/**
 * KIỂM ĐĂNG NHẬP và logo.
 *
 * DỰNG MỘT MÁY CHỦ RIÊNG trên cổng khác, truyền mật khẩu bằng BIẾN MÔI TRƯỜNG.
 *   Không đụng `.env` thật, và không bắt máy chủ đang chạy phải đổi trạng thái.
 *   Bài kiểm mà sửa cấu hình thật thì chạy xong người dùng bị khoá ra ngoài.
 *
 * HAI TRẠNG THÁI PHẢI CANH, VÀ TRẠNG THÁI ĐẦU QUAN TRỌNG HƠN:
 *   1. CHƯA đặt mật khẩu → app chạy y như cũ, KHÔNG chặn ai. Chặn sớm là khoá
 *      chính chủ ra khỏi công cụ của họ, mà cách vào lại là sửa file trên máy
 *      chủ — thứ người dùng của công cụ này không làm được.
 *   2. ĐÃ đặt → mọi đường đều phải qua cửa, trừ đúng những thứ trang đăng nhập
 *      cần để hiện ra.
 *
 *   node tools/kiem-dang-nhap.mjs
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const MK = 'mat-khau-kiem-thu-123';
const DUOI = '@kiem-thu.test';
const TK = 'nguoi-duoc-phep';
const EMAIL = `${TK}${DUOI}`;
const CONG_CO = 7897;      // máy chủ CÓ mật khẩu
const CONG_KHONG = 7896;   // máy chủ KHÔNG mật khẩu

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const { bam } = await import(path.join(M, 'server', 'dangnhap.js'));

function moMayChu(cong, them) {
  const con = spawn('node', [path.join(M, 'server', 'main.js')], {
    cwd: M, stdio: ['ignore', 'pipe', 'pipe'],
    /* `MOTION_KHOA_PHIEN` truyền vào để `dangnhap.js` KHỎI tự sinh rồi ghi vào
       `.env` thật — bài kiểm không được để lại dấu vết trong cấu hình. */
    env: { ...process.env, PORT: String(cong), MOTION_KHOA_PHIEN: 'khoa-kiem-thu',
      MOTION_DUOI_EMAIL: DUOI, MOTION_TAI_KHOAN: TK, ...them },
  });
  return con;
}
const cho = async (cong) => {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`http://127.0.0.1:${cong}/health`)).ok) return true; } catch { /* chưa lên */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};
const ma = async (cong, duong, opt = {}) => {
  const r = await fetch(`http://127.0.0.1:${cong}${duong}`, { redirect: 'manual', ...opt });
  return { ma: r.status, toi: r.headers.get('location'), r };
};

const con = [];
const trinh = await chromium.launch();
try {
  /* ---------- 0. băm mật khẩu ---------- */
  console.log('\n0. Băm mật khẩu');
  const h1 = bam(MK);
  const h2 = bam(MK);
  dat('băm ra đúng khuôn scrypt', /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(h1), h1.slice(0, 22) + '…');
  /* Muối ngẫu nhiên: cùng một mật khẩu phải ra hai chuỗi KHÁC nhau. Giống nhau
     nghĩa là không có muối, và khi đó một bảng tra sẵn là đủ để phá. */
  dat('cùng mật khẩu, hai lần băm khác nhau (có muối)', h1 !== h2);
  dat('mật khẩu KHÔNG nằm nguyên văn trong chuỗi băm', !h1.includes(MK));

  /* ---------- 1. CHƯA đặt mật khẩu → không chặn ai ---------- */
  console.log('\n1. Chưa đặt mật khẩu thì app chạy như cũ');
  con.push(moMayChu(CONG_KHONG, { MOTION_MAT_KHAU_HASH: '' }));
  dat('máy chủ lên được', await cho(CONG_KHONG));
  for (const d of ['/', '/api/clips', '/app.js']) {
    dat(`${d} vào thẳng, không hỏi gì`, (await ma(CONG_KHONG, d)).ma === 200);
  }
  const ai0 = await (await fetch(`http://127.0.0.1:${CONG_KHONG}/api/toi-la-ai`)).json();
  dat('máy chủ tự khai là chưa có mật khẩu', ai0.coMatKhau === false && ai0.daVao === true);

  /* ---------- 2. ĐÃ đặt → cửa đóng ---------- */
  console.log('\n2. Đặt mật khẩu rồi thì mọi đường qua cửa');
  con.push(moMayChu(CONG_CO, { MOTION_MAT_KHAU_HASH: bam(MK) }));
  dat('máy chủ lên được', await cho(CONG_CO));

  dat('/health vẫn mở (để máy khác biết app còn sống)', (await ma(CONG_CO, '/health')).ma === 200);
  const g = await ma(CONG_CO, '/');
  dat('trang chủ đá sang trang đăng nhập', g.ma === 302 && g.toi?.startsWith('/dang-nhap'), g.toi);
  dat('và giữ lại chỗ định tới', /tiep=/.test(g.toi || ''), g.toi);
  /* API trả 401 chứ KHÔNG đá 302: giao diện gọi `fetch` mà nhận trang HTML đăng
     nhập thì nó vỡ ở chỗ `JSON.parse`, và người dùng thấy một lỗi vô nghĩa. */
  dat('lời gọi API trả 401, không phải trang HTML', (await ma(CONG_CO, '/api/clips')).ma === 401);
  dat('file của dự án clip cũng bị chặn', (await ma(CONG_CO, '/clip/scenes/cta.json')).ma === 302);
  for (const d of ['/dang-nhap', '/dang-nhap.css', '/logo/motion-mark.png', '/logo/favicon.png']) {
    dat(`${d} mở được (trang đăng nhập cần)`, (await ma(CONG_CO, d)).ma === 200);
  }

  /* ---------- 3. đăng nhập ---------- */
  console.log('\n3. Đăng nhập');
  const dn = (mk, email = EMAIL) => fetch(`http://127.0.0.1:${CONG_CO}/api/dang-nhap`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mk }), redirect: 'manual' });

  /* Email sai khuôn / sai đuôi phải báo NGAY và KHÔNG tính vào số lần gõ sai
     mật khẩu — gõ nhầm địa chỉ là chuyện thường, không phải dấu hiệu dò mật khẩu. */
  const km = await dn(MK, 'khong-phai-email');
  dat('email sai khuôn thì 400, không phải 401', km.status === 400, (await km.json()).loi);
  const kd = await dn(MK, 'ai-do@cho-khac.com');
  dat('email sai đuôi thì bị từ chối', kd.status === 400, (await kd.json()).loi);

  /* ĐÂY LÀ MỤC QUAN TRỌNG NHẤT CỦA CẢ BÀI KIỂM.
   *
   * Bản đầu chỉ kiểm ĐUÔI email, nên gõ `abc@matbao.com` — một địa chỉ không có
   * thật — cũng vào được. Lớp email khi đó chỉ là trang trí, mà lại tạo cảm giác
   * an toàn giả: người ta sẽ đặt mật khẩu dễ hơn mức cần vì "đã có lọc email rồi".
   *
   * quynd chỉ ra đúng chỗ này khi dùng thật. Mục dưới canh để nó không quay lại. */
  const bay = await dn(MK, `ai-cung-duoc${DUOI}`);
  dat('ĐÚNG ĐUÔI nhưng KHÔNG trong danh sách thì vẫn bị chặn',
    bay.status === 400, (await bay.json()).loi);
  const hoa = await dn(MK, EMAIL.toUpperCase());
  dat('viết HOA vẫn nhận ra đúng tài khoản', hoa.status === 200);
  const trong = await dn(MK, DUOI);
  dat('chỉ có đuôi, không có tên thì cũng bị chặn', trong.status === 400, (await trong.json()).loi);

  const sai = await dn('sai-be-bet');
  dat('mật khẩu sai thì 401', sai.status === 401, (await sai.json()).loi);
  const dung = await dn(MK);
  dat('email đúng đuôi + mật khẩu đúng thì 200', dung.status === 200);
  dat('trả về email đã đăng nhập', (await dung.clone().json()).email === EMAIL);
  const ck = dung.headers.get('set-cookie') || '';
  dat('có đặt vé phiên', /motion_phien=/.test(ck));
  /* HttpOnly là cửa chặn quan trọng nhất của cookie này: thiếu nó thì một đoạn
     script lạ trên trang đọc được vé và dùng lại được. */
  dat('vé có HttpOnly', /HttpOnly/i.test(ck), ck.split(';').slice(1).join(';').trim());
  dat('vé có SameSite', /SameSite/i.test(ck));
  /* KHÔNG có `Secure` khi chạy http: bật bừa thì trình duyệt không gửi cookie ở
     `http://127.0.0.1` và đăng nhập thành vòng lặp không bao giờ vào được. */
  dat('chạy http thì KHÔNG bật Secure', !/;\s*Secure/i.test(ck));

  const ve = (ck.match(/motion_phien=([^;]+)/) || [])[1];
  const H = { Cookie: `motion_phien=${ve}` };
  for (const d of ['/', '/api/clips', '/clip/scenes/cta.json']) {
    dat(`${d} vào được bằng vé`, (await ma(CONG_CO, d, { headers: H })).ma === 200);
  }
  const lai = await ma(CONG_CO, '/dang-nhap', { headers: H });
  dat('vào rồi mà mở lại trang đăng nhập thì đá về trình sửa', lai.ma === 302 && lai.toi === '/');
  /* Vé phải MANG THEO email — không thì thanh trên không biết ai đang sửa, mà
     giữ một cuốn sổ riêng trong bộ nhớ thì khởi động lại là mất. */
  const ai = await (await fetch(`http://127.0.0.1:${CONG_CO}/api/toi-la-ai`, { headers: H })).json();
  dat('vé mang theo email, đọc lại được', ai.email === EMAIL, ai.email);

  console.log('\n4. Vé giả không dùng được');
  for (const [ten, v] of [['bịa hẳn', 'abc.xyz'], ['thiếu chữ ký', ve?.split('.')[0] || 'x'],
    ['chữ ký sai', `${ve?.split('.')[0]}.saibet`]]) {
    dat(`vé ${ten} bị từ chối`, (await ma(CONG_CO, '/api/clips', { headers: { Cookie: `motion_phien=${v}` } })).ma === 401);
  }

  /* ---------- 5. đếm lần gõ sai ---------- */
  console.log('\n5. Gõ sai nhiều lần thì bị khoá');
  let khoa = 0;
  for (let i = 0; i < 10; i++) { const r = await dn('sai-nua'); if (r.status === 429) { khoa = i + 1; break; } }
  dat('bị khoá sau khoảng 8 lần', khoa > 0 && khoa <= 10, `lần thứ ${khoa}`);
  /* Đang khoá thì mật khẩu ĐÚNG cũng phải bị chặn — nếu không, kẻ dò chỉ cần
     thử tiếp là vào, và bộ đếm thành đồ trang trí. */
  dat('đang khoá thì gõ ĐÚNG cũng không vào được', (await dn(MK)).status === 429);

  /* ---------- 5b. KHÔNG lách được bộ đếm bằng đầu đề tự khai ---------- */
  console.log('\n5b. Không lách được bộ đếm bằng địa chỉ máy giả');
  /* Bản đầu lấy PHẦN ĐẦU của `x-forwarded-for` — thứ người gọi tự khai. Đo thật
     trên bản chạy: gõ sai 12 lần kèm 12 địa chỉ giả thì 7 lần LỌT. Nay lấy phần
     cuối (do proxy ghi) và đếm thêm theo TÀI KHOẢN. */
  const con2 = moMayChu(CONG_CO + 1, { MOTION_MAT_KHAU_HASH: bam(MK) });
  con.push(con2);
  await cho(CONG_CO + 1);
  let bikhoa = 0;
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`http://127.0.0.1:${CONG_CO + 1}/api/dang-nhap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `203.0.113.${i + 1}` },
      body: JSON.stringify({ email: EMAIL, mk: 'sai-be-bet' }) });
    if (r.status === 429) bikhoa++;
  }
  dat('đổi địa chỉ máy mỗi lần vẫn bị khoá', bikhoa >= 3, `bị khoá ${bikhoa}/12 lần`);

  /* ---------- 5c. đầu đề bảo mật ---------- */
  console.log('\n5c. Đầu đề bảo mật');
  const dd = (await fetch(`http://127.0.0.1:${CONG_CO}/dang-nhap`)).headers;
  for (const [h, ten] of [['content-security-policy', 'CSP'],
    ['x-content-type-options', 'chặn đoán kiểu file'],
    ['referrer-policy', 'giữ kín đường dẫn'],
    ['permissions-policy', 'khoá máy ảnh/micro']]) {
    dat(`có ${ten}`, Boolean(dd.get(h)), (dd.get(h) || '').slice(0, 42));
  }
  /* CSP PHẢI cho phông Google: 12 clip đời cũ nạp Be Vietnam Pro từ đó. Bản CSP
     đầu chặn mất và 5 bài kiểm đỏ ngay. */
  dat('CSP vẫn cho phông Google (12 clip đời cũ cần)',
    /fonts\.googleapis\.com/.test(dd.get('content-security-policy') || ''));
  dat('CSP cho phép tự nhúng iframe cùng origin (khung xem clip)',
    /frame-ancestors 'self'/.test(dd.get('content-security-policy') || ''));
  // HSTS chỉ khi thật sự https — bật lúc chạy http là tự khoá trình duyệt của mình.
  dat('chạy http thì KHÔNG bật HSTS', !dd.get('strict-transport-security'));
  const dd2 = (await fetch(`http://127.0.0.1:${CONG_CO}/dang-nhap`,
    { headers: { 'X-Forwarded-Proto': 'https' } })).headers;
  dat('sau proxy https thì CÓ bật HSTS', Boolean(dd2.get('strict-transport-security')));

  /* ---------- 6. trang đăng nhập nhìn thấy được ---------- */
  console.log('\n6. Trang đăng nhập');
  const tr = await trinh.newPage({ viewport: { width: 900, height: 700 } });
  const loiJS = [];
  tr.on('pageerror', (e) => loiJS.push(String(e)));
  await tr.goto(`http://127.0.0.1:${CONG_CO}/dang-nhap`, { waitUntil: 'networkidle' });
  await tr.waitForTimeout(600);
  const t = await tr.evaluate(() => ({
    tieuDe: document.title,
    logo: document.querySelector('.logo')?.naturalWidth || 0,
    oGo: document.querySelector('#mk')?.type,
    troVao: document.activeElement?.id,
    nut: document.querySelector('#vao')?.textContent,
    hien: Boolean(document.querySelector('#hien')),
    coEmail: Boolean(document.querySelector('#email')),
    goiY: document.querySelector('#email')?.placeholder,
    rongBang: Math.abs(
      (document.querySelector('#email')?.getBoundingClientRect().width || 0)
      - (document.querySelector('.o-hang')?.getBoundingClientRect().width || 0)) < 2,
  }));
  dat('trang mở được và có tiêu đề riêng', /Đăng nhập/.test(t.tieuDe), t.tieuDe);
  dat('logo tải được (không phải ảnh vỡ)', t.logo > 0, `${t.logo}px`);
  dat('ô mật khẩu che chữ', t.oGo === 'password');
  dat('có ô email', t.coEmail);
  /* Gợi ý phải lấy đuôi TỪ MÁY CHỦ. Viết cứng ở trang thì đổi đuôi trong `.env`
     mà chỗ này vẫn ghi đuôi cũ — tức là nói dối người dùng. */
  dat('gợi ý email lấy đúng đuôi máy chủ khai', String(t.goiY || '').endsWith(DUOI), t.goiY);
  dat('hai ô rộng bằng nhau', t.rongBang);
  dat('con trỏ nhảy sẵn vào ô đầu', t.troVao === 'email');
  dat('có nút hiện/ẩn mật khẩu', t.hien);
  await tr.click('#hien');
  await tr.waitForTimeout(200);
  dat('bấm hiện thì đọc được mật khẩu', await tr.evaluate(() => document.querySelector('#mk').type === 'text'));
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await tr.close();

  /* ---------- 7. logo trong trình sửa ---------- */
  console.log('\n7. Logo trong trình sửa');
  const t2 = await trinh.newPage({ viewport: { width: 1400, height: 400 } });
  await t2.goto(`http://127.0.0.1:${CONG_KHONG}/`, { waitUntil: 'networkidle' });
  await t2.waitForTimeout(2200);
  const l = await t2.evaluate(() => {
    const i = document.querySelector('.o-hieu');
    return { the: i?.tagName, src: i?.getAttribute('src'), rong: i?.naturalWidth || 0,
      cao: Math.round(i?.getBoundingClientRect().height || 0),
      chu: document.querySelector('.hieu')?.textContent,
      nhac: document.querySelector('#o-tai-khoan')?.textContent };
  });
  dat('logo là ảnh thật, tải được', l.the === 'IMG' && l.rong > 0, `${l.src} · gốc ${l.rong}px`);
  /* Ảnh gốc phải LỚN HƠN cỡ hiển thị: màn hình 2× cần gấp đôi, không thì logo rỗ. */
  /* Phải có `l.rong > 0`: thiếu điều kiện đó thì ảnh KHÔNG tải được (0px) vẫn
     "đạt" vì 0 >= 0 — một mục xanh giả, tệ hơn không có mục nào. */
  dat('ảnh gốc đủ nét cho màn hình 2×', l.rong > 0 && l.rong >= l.cao * 2,
    `hiện ${l.cao}px, gốc ${l.rong}px`);
  dat('cạnh logo có tên sản phẩm', /Motion/.test(l.chu || ''), l.chu);
  dat('chưa đặt mật khẩu thì NÓI RA ngay trên thanh', /Chưa đặt mật khẩu/.test(l.nhac || ''), l.nhac);
  await t2.close();

  /* ---------- 8. không để lại dấu vết ---------- */
  console.log('\n8. Bài kiểm không đụng vào cấu hình thật');
  const env = path.join(M, '.env');
  const noiDung = existsSync(env) ? readFileSync(env, 'utf8') : '';
  dat('không ghi mật khẩu kiểm thử vào .env', !noiDung.includes(MK));
  dat('không ghi khoá phiên kiểm thử vào .env', !noiDung.includes('khoa-kiem-thu'));
} finally {
  for (const c of con) { try { c.kill(); } catch { /* đã chết */ } }
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Đăng nhập và logo đạt hết.\n');
process.exit(hong ? 1 : 0);
