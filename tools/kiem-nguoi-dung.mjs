#!/usr/bin/env node
/**
 * KIỂM TÀI KHOẢN NGƯỜI DÙNG — khách hàng vào dùng app, mỗi người một kho.
 *
 * VÌ SAO. Cách cũ: danh sách email trong biến môi trường + MỘT mật khẩu chung.
 * Muốn thêm một khách là phải sửa cấu hình trên Vibe Host rồi triển khai lại —
 * anh Quý không làm được, nên thực tế không thêm được ai (28/09). Và mật khẩu
 * chung nghĩa là khách gõ email của chủ kho cũng vào được kho của chủ.
 *
 * Bài này canh những điều KHÔNG ĐƯỢC SAI, vì sai là mất dữ liệu hoặc lộ kho:
 *
 *   ① Chép danh sách cũ sang CSDL KHÔNG đá ai ra và KHÔNG thêm quyền cho ai.
 *   ② Khách mới có mật khẩu RIÊNG; mật khẩu chung KHÔNG mở được tài khoản họ.
 *   ③ Mỗi người một kho: khách không thấy clip của chủ, chủ không thấy của khách.
 *   ④ Không bao giờ khoá/xoá hết người quản trị — khoá xong là không ai vào được.
 *   ⑤ Người thường KHÔNG gọi được đường quản trị.
 *   ⑥ Xoá một người KHÔNG xoá kho của họ.
 *
 * Chạy bằng Node trần, tự dựng máy chủ riêng CÓ MẬT KHẨU ở cổng 7896 (bộ kiểm
 * chung chạy máy chủ KHÔNG mật khẩu, nhánh này sẽ không bao giờ đi qua).
 *
 *   node tools/kiem-nguoi-dung.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CONG = Number(process.env.CONG_NGUOI || 7896);
const GOC = `http://127.0.0.1:${CONG}`;
const MK_CHUNG = 'mat-khau-chung-2026';
const CHU = 'chu@matbao.com';
const BAN = 'ban-cu@matbao.com';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const { bam } = await import(path.join(M, 'server', 'dangnhap.js'));
const tam = mkdtempSync(path.join(tmpdir(), 'motion-nguoi-'));
const khoTam = path.join(tam, 'kho');

/** Gọi API kèm vé của một người. */
const goi = async (duong, { cach = 'GET', than, ve } = {}) => {
  const r = await fetch(`${GOC}${duong}`, {
    method: cach,
    headers: { ...(than ? { 'Content-Type': 'application/json' } : {}), ...(ve ? { Cookie: `motion_phien=${ve}` } : {}) },
    ...(than ? { body: JSON.stringify(than) } : {}),
    redirect: 'manual',
  });
  const d = await r.json().catch(() => ({}));
  return { ma: r.status, ...d, ve: (r.headers.get('set-cookie') || '').match(/motion_phien=([^;]+)/)?.[1] };
};
const vao = async (email, mk) => goi('/api/dang-nhap', { cach: 'POST', than: { email, mk } });

const mc = spawn('node', [path.join(M, 'server', 'main.js')], {
  cwd: M, stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: String(CONG),
    MOTION_MAT_KHAU_HASH: bam(MK_CHUNG),
    MOTION_KHOA_PHIEN: 'kiem-nguoi-dung',
    MOTION_TAI_KHOAN: `${CHU},${BAN}`,
    MOTION_CHU_KHO: CHU,
    /* Kho riêng và CSDL vào thư mục tạm — tuyệt đối không đụng kho thật. */
    MOTION_GOC_KHO: khoTam,
    MOTION_CSDL: path.join(khoTam, 'motion.db'),
  },
});
let raMC = '';
mc.stdout.on('data', (d) => { raMC += d; });
mc.stderr.on('data', (d) => { raMC += d; });
const dungMC = () => { try { mc.kill(); } catch { /* đã chết */ } };
process.on('exit', () => { dungMC(); try { rmSync(tam, { recursive: true, force: true }); } catch { /* kệ */ } });

let len = false;
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`${GOC}/health`)).ok) { len = true; break; } } catch { /* chưa lên */ }
  await new Promise((r) => setTimeout(r, 300));
}
if (!len) { console.error(`❌ Máy chủ kiểm không lên được.\n${raMC.slice(-800)}`); process.exit(1); }

try {
  /* ---------- ① chép danh sách cũ ---------- */
  console.log('\n① Chép danh sách tài khoản cũ vào CSDL');
  dat('lúc khởi động có báo đã chép', /chép 2 tài khoản/.test(raMC), raMC.match(/Tài khoản:.*/)?.[0] || '');
  const chuVao = await vao(CHU, MK_CHUNG);
  dat('chủ kho vẫn vào được bằng ĐÚNG mật khẩu cũ', chuVao.ok === true && Boolean(chuVao.ve),
    chuVao.loi || chuVao.email);
  dat('và được ghi là quản trị', chuVao.vai === 'quan_tri', chuVao.vai);
  const banVao = await vao(BAN, MK_CHUNG);
  dat('người trong danh sách cũ cũng vào được, nhưng KHÔNG phải quản trị',
    banVao.ok === true && banVao.vai === 'nguoi_dung', banVao.vai);
  const laVao = await vao('nguoi-la@matbao.com', MK_CHUNG);
  dat('người ngoài danh sách vẫn KHÔNG vào được', laVao.ok !== true, laVao.loi);
  const veChu = chuVao.ve, veBan = banVao.ve;

  /* ---------- ⑤ quyền ---------- */
  /* ---------- ⑨ gõ TÊN TRỐNG cũng vào được ----------
   * Người quản trị đưa khách cái tên `demo12345`; khách gõ đúng cái tên ấy mà
   * bị từ chối vì ô đăng nhập đòi email đầy đủ. Anh Quý vấp đúng chỗ này
   * (28/09) và kết luận là "chưa tạo được tài khoản dùng bình thường", trong
   * khi tài khoản có thật và chạy tốt.
   */
  console.log('\n⑨ Gõ tên trống (không có @) cũng đăng nhập được');
  const tenTron = await vao(CHU.split('@')[0], MK_CHUNG);
  dat('chủ kho gõ mỗi tên vẫn vào được', tenTron.ok === true, tenTron.loi || tenTron.email);
  dat('và vào đúng tài khoản ấy, không phải ai khác', tenTron.email === CHU, tenTron.email);
  const hoaThuong = await vao(CHU.toUpperCase(), MK_CHUNG);
  dat('gõ HOA cũng vào được', hoaThuong.ok === true, hoaThuong.loi);
  dat('gõ tên không có thật thì vẫn bị từ chối', (await vao('khong-co-ai', MK_CHUNG)).ok !== true);

  console.log('\n⑤ Chỉ người quản trị mở được danh sách');
  dat('người thường bị từ chối', (await goi('/api/nguoi-dung', { ve: veBan })).ma === 403);
  dat('chưa đăng nhập cũng bị từ chối', [401, 403, 302].includes((await goi('/api/nguoi-dung')).ma));
  dat('chủ kho xem được', (await goi('/api/nguoi-dung', { ve: veChu })).ok === true);
  dat('người thường KHÔNG tự thêm được ai',
    (await goi('/api/nguoi-dung', { cach: 'POST', ve: veBan, than: { email: 'x@y.com' } })).ma === 403);

  /* ---------- ② khách mới có mật khẩu riêng ---------- */
  console.log('\n② Khách mới — mật khẩu riêng, không phải mật khẩu chung');
  const them = await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu,
    than: { email: 'khach@congty.com', ten: 'Khách A' } });
  dat('tạo được tài khoản khách', them.ok === true && Boolean(them.matKhau), them.loi || them.email);
  dat('mật khẩu sinh ra đủ dài và đọc được qua điện thoại',
    (them.matKhau || '').length >= 12 && /^[a-z0-9-]+$/.test(them.matKhau || ''), them.matKhau);
  const khachVao = await vao('khach@congty.com', them.matKhau);
  dat('khách vào được bằng mật khẩu riêng', khachVao.ok === true, khachVao.loi);
  /* Điều QUAN TRỌNG NHẤT của cả bài: khách không được dùng mật khẩu chung. */
  dat('mật khẩu CHUNG không mở được tài khoản khách',
    (await vao('khach@congty.com', MK_CHUNG)).ok !== true);
  dat('khách KHÔNG mượn được email của chủ kho với mật khẩu của mình',
    (await vao(CHU, them.matKhau)).ok !== true);
  /* Người quản trị GÕ SẴN mật khẩu — họ đã hứa một mật khẩu với khách rồi. */
  const tuGo = await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu,
    than: { email: 'khach-tu-go@congty.com', matKhau: 'Demo@12345' } });
  dat('gõ sẵn mật khẩu thì dùng đúng cái đó', tuGo.ok === true && tuGo.matKhau === 'Demo@12345',
    tuGo.loi || tuGo.matKhau);
  dat('và vào được bằng chính nó', (await vao('khach-tu-go@congty.com', 'Demo@12345')).ok === true);
  const ngan = await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu,
    than: { email: 'mk-ngan@congty.com', matKhau: 'abc' } });
  dat('mật khẩu quá ngắn bị từ chối ngay lúc tạo', ngan.ok !== true, (ngan.loi || '').slice(0, 40));
  dat('và KHÔNG tạo ra tài khoản nửa vời',
    (await goi('/api/nguoi-dung', { ve: veChu })).nguoi.every((n) => n.email !== 'mk-ngan@congty.com'));

  dat('thêm trùng email thì báo, không đè lên tài khoản cũ',
    (await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu, than: { email: 'khach@congty.com' } })).ok !== true);
  const veKhach = khachVao.ve;

  /* ---------- ③ mỗi người một kho ----------
   *
   * HAI KHÁCH, KHÔNG PHẢI CHỦ KHO. Kho của chủ kho CHÍNH LÀ `scenes/` thật của
   * dự án clip (447 MB, không có git) — bài kiểm tạo dự án bằng tài khoản chủ là
   * ghi thẳng vào đó. Đã lỡ một lần: bản đầu của bài này đẻ ra `cua-chu-kho.json`
   * nằm giữa 11 clip thật. Cùng luật với `kiem-kho-rieng.mjs`.
   */
  console.log('\n③ Kho riêng — không ai thấy dự án của ai');
  const khach2 = await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu, than: { email: 'khach-b@congty.com' } });
  const veKhach2 = (await vao('khach-b@congty.com', khach2.matKhau)).ve;
  const taoDA = (ve, ten) => goi('/api/du-an', { cach: 'POST', ve, than: { ten, kho: 'ngang' } });
  const daA = await taoDA(veKhach, 'Cua Khach A');
  const daB = await taoDA(veKhach2, 'Cua Khach B');
  dat('cả hai khách tạo được dự án trong kho của mình', daA.ok === true && daB.ok === true,
    `${daA.loi || daA.slug} · ${daB.loi || daB.slug}`);
  const sA = ((await goi('/api/clips', { ve: veKhach })).clips || []).map((c) => c.slug);
  const sB = ((await goi('/api/clips', { ve: veKhach2 })).clips || []).map((c) => c.slug);
  dat('khách A thấy đúng dự án của mình', sA.includes(daA.slug), sA.join(', '));
  dat('khách A KHÔNG thấy dự án của khách B', !sA.includes(daB.slug));
  dat('khách B KHÔNG thấy dự án của khách A', !sB.includes(daA.slug), sB.join(', '));
  dat('khách B KHÔNG đọc được kịch bản của khách A dù biết tên',
    (await goi(`/api/kich-ban/${daA.slug}`, { ve: veKhach2 })).ma === 404);
  /* Kho của CHỦ là `scenes/` thật — chỉ ĐỌC để chắc khách không nhìn thấy nó. */
  const sChu = ((await goi('/api/clips', { ve: veChu })).clips || []).map((c) => c.slug);
  dat('kho của chủ có clip thật, và khách không thấy clip nào trong đó',
    sChu.length > 0 && !sChu.some((x) => sA.includes(x)), `chủ có ${sChu.length} clip`);
  const daKhach = daA;

  /* ---------- ④ không tự khoá hết đường vào ---------- */
  console.log('\n④ Không bao giờ khoá hết người quản trị');
  const u = (e) => `/api/nguoi-dung/${encodeURIComponent(e)}`;
  dat('khoá người quản trị DUY NHẤT → bị từ chối',
    (await goi(u(CHU), { cach: 'PATCH', ve: veChu, than: { dangHoatDong: false } })).ok !== true);
  dat('xoá người quản trị duy nhất → bị từ chối',
    (await goi(u(CHU), { cach: 'DELETE', ve: veChu })).ok !== true);
  dat('hạ quyền người quản trị duy nhất → bị từ chối',
    (await goi(u(CHU), { cach: 'PATCH', ve: veChu, than: { vai: 'nguoi_dung' } })).ok !== true);
  /* Có hai quản trị rồi thì khoá bớt một là hợp lệ. */
  await goi(u(BAN), { cach: 'PATCH', ve: veChu, than: { vai: 'quan_tri' } });
  dat('có hai quản trị thì khoá bớt một được',
    (await goi(u(BAN), { cach: 'PATCH', ve: veChu, than: { dangHoatDong: false } })).ok === true);
  dat('người bị khoá KHÔNG vào được nữa, và được nói rõ vì sao',
    /khoá/i.test((await vao(BAN, MK_CHUNG)).loi || ''), (await vao(BAN, MK_CHUNG)).loi);
  dat('mở khoá lại thì vào được', (await goi(u(BAN), { cach: 'PATCH', ve: veChu,
    than: { dangHoatDong: true } })).ok === true && (await vao(BAN, MK_CHUNG)).ok === true);

  console.log('\n⑥ Đặt lại mật khẩu và xoá người');
  const dat2 = await goi(u('khach@congty.com'), { cach: 'PATCH', ve: veChu, than: { matKhau: '' } });
  dat('đặt lại được, trả mật khẩu mới', dat2.ok === true && dat2.matKhau !== them.matKhau);
  dat('mật khẩu CŨ hết dùng được', (await vao('khach@congty.com', them.matKhau)).ok !== true);
  dat('mật khẩu MỚI vào được', (await vao('khach@congty.com', dat2.matKhau)).ok === true);

  /* Xoá người KHÔNG được xoá kho của họ — thêm lại là thấy lại clip cũ. */
  dat('xoá được khách', (await goi(u('khach@congty.com'), { cach: 'DELETE', ve: veChu })).ok === true);
  dat('xoá xong họ không vào được nữa', (await vao('khach@congty.com', dat2.matKhau)).ok !== true);
  const conKho = existsSync(khoTam) && readdirSync(khoTam).some((d) => d.startsWith('khach-congty-com'));
  dat('KHO của họ vẫn còn nguyên trên đĩa', conKho, readdirSync(khoTam).join(', '));
  const lai = await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu, than: { email: 'khach@congty.com' } });
  const veLai = (await vao('khach@congty.com', lai.matKhau)).ve;
  dat('thêm lại đúng email thì thấy lại dự án cũ',
    ((await goi('/api/clips', { ve: veLai })).clips || []).some((c) => c.slug === daKhach.slug));

  /* ---------- ⑧ xoá người CÓ trong cấu hình máy chủ ----------
   *
   * `kiemVao` chỉ phán với email BẢNG BIẾT; email lạ thì đi tiếp đường cũ (env
   * + mật khẩu chung). Nên xoá hẳn một người vẫn còn trong `MOTION_TAI_KHOAN`
   * là mở đường cho họ quay lại bằng mật khẩu chung — trong khi người quản trị
   * vừa bấm Xoá và tin là xong. Phải KHOÁ thay vì xoá.
   */
  console.log('\n⑧ Xoá người còn trong cấu hình máy chủ thì KHOÁ, không xoá hờ');
  await goi(u(BAN), { cach: 'PATCH', ve: veChu, than: { vai: 'nguoi_dung' } });
  const xoaBan = await goi(u(BAN), { cach: 'DELETE', ve: veChu });
  dat('báo rõ là chỉ khoá được', xoaBan.ok === true && xoaBan.khoaThay === true,
    (xoaBan.cau || '').slice(0, 60));
  dat('và họ KHÔNG quay lại được bằng mật khẩu chung', (await vao(BAN, MK_CHUNG)).ok !== true,
    (await vao(BAN, MK_CHUNG)).loi);

  console.log('\n⑦ Tự đổi mật khẩu của mình');
  dat('gõ sai mật khẩu hiện tại thì không đổi được',
    (await goi('/api/doi-mat-khau-cua-toi', { cach: 'POST', ve: veChu,
      than: { cu: 'sai-bet', moi: 'mat-khau-moi-2026' } })).ok !== true);
  dat('gõ đúng thì đổi được', (await goi('/api/doi-mat-khau-cua-toi', { cach: 'POST', ve: veChu,
    than: { cu: MK_CHUNG, moi: 'mat-khau-moi-2026' } })).ok === true);
  dat('mật khẩu chung cũ hết mở được tài khoản chủ kho', (await vao(CHU, MK_CHUNG)).ok !== true);
  dat('mật khẩu mới vào được', (await vao(CHU, 'mat-khau-moi-2026')).ok === true);
  dat('mật khẩu quá ngắn bị từ chối', (await goi('/api/doi-mat-khau-cua-toi', { cach: 'POST',
    ve: (await vao(CHU, 'mat-khau-moi-2026')).ve, than: { cu: 'mat-khau-moi-2026', moi: 'abc' } })).ok !== true);
} finally {
  dungMC();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Tài khoản người dùng đạt hết.\n');
process.exit(hong ? 1 : 0);
