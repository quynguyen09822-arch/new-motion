#!/usr/bin/env node
/**
 * KIỂM "ĐÓNG TAB RỒI MỞ LẠI THÌ VỀ ĐÚNG CHỖ".
 *
 * VÌ SAO. Anh Quý dặn: tài khoản con phải có dự án riêng và "lưu phiên làm mỗi
 * lần out ra" (28/09). Hai chuyện tách bạch, và cả hai đều dễ hỏng lặng lẽ:
 *
 *   ① NHÁP CHƯA KỊP LƯU. Nháp tự lưu sau 5 giây rảnh tay; ai sửa xong đóng tab
 *      ngay thì đúng những sửa đổi CUỐI CÙNG bay mất — thứ người ta nhớ rõ nhất
 *      và tiếc nhất. Nay `pagehide` gửi nốt bằng `sendBeacon`, mà beacon LUÔN
 *      là POST nên máy chủ phải nhận cả POST.
 *   ② VỀ ĐÚNG CHỖ. Mở app lên phải là dự án đang làm dở, đúng giây đang xem —
 *      không phải dự án đầu danh sách.
 *
 * Và điều không được sai: chỗ làm việc là RIÊNG TỪNG TÀI KHOẢN. Hai người cùng
 * mở app mà thấy chỗ làm của nhau thì vừa lộ tên dự án, vừa mở nhầm clip.
 *
 *   node tools/kiem-phien-lam.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CONG = Number(process.env.CONG_PHIEN || 7887);
const GOC = `http://127.0.0.1:${CONG}`;
const MK = 'mat-khau-chung-2026';
const CHU = 'chu@matbao.com';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* Cổng đang bận thì DỪNG, đừng nói chuyện với máy chủ của người khác rồi báo
   đỏ oan — đã dính một lần với `kiem-nhat-ky` (28/09). */
try {
  if ((await fetch(`${GOC}/health`, { signal: AbortSignal.timeout(800) })).ok) {
    console.error(`\n❌ Cổng ${CONG} đang có người chiếm. Dọn rồi chạy lại.`);
    process.exit(1);
  }
} catch { /* trống, đúng như mong đợi */ }

const { bam } = await import(path.join(M, 'server', 'dangnhap.js'));
const tam = mkdtempSync(path.join(tmpdir(), 'motion-phien-'));
const mc = spawn('node', [path.join(M, 'server', 'main.js')], {
  cwd: M, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(CONG), MOTION_MAT_KHAU_HASH: bam(MK),
    MOTION_KHOA_PHIEN: 'kiem-phien-lam', MOTION_TAI_KHOAN: CHU, MOTION_CHU_KHO: CHU,
    MOTION_GOC_KHO: path.join(tam, 'kho') },
});
let raMC = '';
mc.stdout.on('data', (d) => { raMC += d; });
mc.stderr.on('data', (d) => { raMC += d; });
const don = () => {
  try { mc.kill(); } catch { /* đã chết */ }
  try { rmSync(tam, { recursive: true, force: true }); } catch { /* kệ */ }
};
process.on('exit', don);
process.on('uncaughtException', (e) => { don(); console.error(e); process.exit(1); });

let len = false;
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`${GOC}/health`)).ok) { len = true; break; } } catch { /* chưa lên */ }
  await new Promise((r) => setTimeout(r, 300));
}
if (!len) { console.error(`❌ Máy chủ kiểm không lên được.\n${raMC.slice(-600)}`); process.exit(1); }

const goi = async (duong, { cach = 'GET', than, ve } = {}) => {
  const r = await fetch(`${GOC}${duong}`, {
    method: cach,
    headers: { ...(than ? { 'Content-Type': 'application/json' } : {}), ...(ve ? { Cookie: `motion_phien=${ve}` } : {}) },
    ...(than ? { body: JSON.stringify(than) } : {}), redirect: 'manual',
  });
  const d = await r.json().catch(() => ({}));
  return { ma: r.status, ...d, ve: (r.headers.get('set-cookie') || '').match(/motion_phien=([^;]+)/)?.[1] };
};
const vao = async (em, mk) => (await goi('/api/dang-nhap', { cach: 'POST', than: { email: em, mk } })).ve;

try {
  const veChu = await vao(CHU, MK);
  /* Hai khách — KHÔNG dùng tài khoản chủ kho để tạo dự án: kho của chủ chính là
     `scenes/` thật của dự án clip, không có git. Cùng luật với `kiem-kho-rieng`. */
  const a = await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu, than: { email: 'a@congty.com' } });
  const b = await goi('/api/nguoi-dung', { cach: 'POST', ve: veChu, than: { email: 'b@congty.com' } });
  const veA = await vao('a@congty.com', a.matKhau);
  const veB = await vao('b@congty.com', b.matKhau);

  console.log('\n① Dự án tạo ra là của riêng tài khoản đó');
  const daA = await goi('/api/du-an', { cach: 'POST', ve: veA, than: { ten: 'Viec Cua A', kho: 'ngang' } });
  const daB = await goi('/api/du-an', { cach: 'POST', ve: veB, than: { ten: 'Viec Cua B', kho: 'ngang' } });
  dat('hai khách tạo được dự án', daA.ok === true && daB.ok === true, daA.loi || daB.loi || '');
  const dsA = ((await goi('/api/clips', { ve: veA })).clips || []).map((c) => c.slug);
  dat('A chỉ thấy dự án của A', dsA.includes(daA.slug) && !dsA.includes(daB.slug), dsA.join(', '));
  dat('A không mở được dự án của B dù biết tên',
    (await goi(`/api/kich-ban/${daB.slug}`, { ve: veA })).ma === 404);

  console.log('\n② Đóng tab thì nháp được lưu nốt — kể cả bằng sendBeacon (POST)');
  const goc = await goi(`/api/clip/${daA.slug}`, { ve: veA });
  const sua = structuredClone(goc.doc);
  sua.meta.name = 'Đã sửa dở rồi đóng tab';
  /* Đúng thứ trình duyệt gửi lúc đóng tab: POST, không phải PUT. */
  const beacon = await goi(`/api/draft/${daA.slug}`, { cach: 'POST', ve: veA, than: { doc: sua } });
  dat('máy chủ nhận nháp gửi bằng POST', beacon.ok === true, beacon.loi || beacon.cau);
  const moLai = await goi(`/api/clip/${daA.slug}`, { ve: veA });
  dat('mở lại thì thấy nháp đang chờ', Boolean(moLai.nhap), JSON.stringify(moLai.nhap?.doc?.meta?.name));
  dat('nháp giữ đúng nội dung sửa dở', moLai.nhap?.doc?.meta?.name === 'Đã sửa dở rồi đóng tab');
  /* Nháp KHÔNG được tự áp vào file thật — người dùng phải được hỏi. */
  dat('file thật CHƯA bị đổi (nháp chỉ là đề xuất)', moLai.doc?.meta?.name !== 'Đã sửa dở rồi đóng tab',
    moLai.doc?.meta?.name);

  console.log('\n③ Mở lại thì về đúng chỗ đang làm dở');
  dat('lúc đầu chưa nhớ gì', (await goi('/api/cho-lam-viec', { ve: veA })).cho === null);
  const luu = await goi('/api/cho-lam-viec', { cach: 'POST', ve: veA,
    than: { slug: daA.slug, canh: 'canh-1', giay: 3.5 } });
  dat('lưu được bằng POST (sendBeacon)', luu.ok === true, luu.loi);
  const cho = (await goi('/api/cho-lam-viec', { ve: veA })).cho;
  dat('nhớ đúng dự án, cảnh và giây',
    cho?.slug === daA.slug && cho?.canh === 'canh-1' && cho?.giay === 3.5, JSON.stringify(cho));

  /* Điều không được sai: chỗ làm việc là của RIÊNG từng tài khoản. */
  dat('B KHÔNG thấy chỗ làm việc của A', (await goi('/api/cho-lam-viec', { ve: veB })).cho === null);
  await goi('/api/cho-lam-viec', { cach: 'POST', ve: veB, than: { slug: daB.slug, giay: 9 } });
  dat('A vẫn giữ nguyên chỗ của A sau khi B lưu chỗ của B',
    (await goi('/api/cho-lam-viec', { ve: veA })).cho?.slug === daA.slug);

  /* Đăng xuất rồi vào lại — chỗ làm việc phải còn, vì nó đi theo TÀI KHOẢN chứ
     không theo vé đăng nhập. */
  const veA2 = await vao('a@congty.com', a.matKhau);
  dat('đăng xuất rồi vào lại vẫn nhớ chỗ cũ',
    (await goi('/api/cho-lam-viec', { ve: veA2 })).cho?.slug === daA.slug);
  dat('tên dự án bậy bị từ chối',
    (await goi('/api/cho-lam-viec', { cach: 'POST', ve: veA, than: { slug: '../../etc/passwd' } })).ok !== true);
} finally {
  don();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Giữ chỗ làm việc đạt hết.\n');
process.exit(hong ? 1 : 0);
