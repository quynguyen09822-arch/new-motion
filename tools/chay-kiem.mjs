#!/usr/bin/env node
/**
 * CHẠY TOÀN BỘ BÀI KIỂM.
 *
 *   npm run kiem            # chạy hết
 *   npm run kiem -- tieng   # chỉ những bài có chữ "tieng" trong tên
 *
 * TỰ DỰNG MỘT MÁY CHỦ RIÊNG, KHÔNG MẬT KHẨU, TRÊN CỔNG KHÁC.
 *
 * Từ khi có đăng nhập, máy chủ thật đòi mật khẩu — mà 25 bài kiểm đều gọi thẳng
 * vào đường dẫn, không có vé. Ba cách xử, và chỉ một cách đúng:
 *
 *   ✗ Mở cửa hậu trong mã ("bỏ qua đăng nhập nếu gọi từ localhost") — cửa hậu
 *     nào rồi cũng có ngày bị bật nhầm trên bản chạy thật.
 *   ✗ Bắt 25 bài tự đăng nhập — sửa 25 file, và mỗi bài mới lại phải nhớ làm.
 *   ✓ Dựng một máy chủ riêng cho bài kiểm, tắt mật khẩu bằng biến môi trường.
 *     Mã nguồn không có ngoại lệ nào, máy chủ thật không bị đụng tới.
 *
 * Cổng 7804 — KHÔNG phải 7803. Dùng chung cổng với máy chủ đang chạy thì bài
 * kiểm hoặc chiếm cổng của người dùng, hoặc âm thầm chạy vào máy chủ của họ và
 * sửa clip thật.
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONG = Number(process.env.CONG_KIEM || 7804);
const GOC = `http://127.0.0.1:${CONG}`;
const loc = process.argv.slice(2).filter((x) => !x.startsWith('-'));

const bai = readdirSync(path.join(M, 'tools'))
  .filter((f) => f.startsWith('kiem-') && f.endsWith('.mjs'))
  .filter((f) => !loc.length || loc.some((x) => f.includes(x)))
  .sort();

if (!bai.length) { console.error('Không có bài kiểm nào khớp.'); process.exit(1); }

console.log(`Dựng máy chủ kiểm thử ở cổng ${CONG} (không mật khẩu)…`);
const mc = spawn('node', [path.join(M, 'server', 'main.js')], {
  cwd: M, stdio: ['ignore', 'ignore', 'pipe'],
  /* Chuỗi RỖNG, không phải bỏ trống: `dangnhap.js` hiểu biến đã đặt-mà-rỗng là
     "cố ý không có mật khẩu". Bỏ trống thì nó rơi xuống đọc `.env` thật. */
  env: { ...process.env, PORT: String(CONG), MOTION_MAT_KHAU_HASH: '', MOTION_KHOA_PHIEN: 'kiem-thu' },
});
let loiMC = '';
mc.stderr.on('data', (d) => { loiMC += d; });

const dung = () => { try { mc.kill(); } catch { /* đã chết */ } };
process.on('exit', dung);
process.on('SIGINT', () => { dung(); process.exit(130); });

let len = false;
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`${GOC}/health`)).ok) { len = true; break; } } catch { /* chưa lên */ }
  await new Promise((r) => setTimeout(r, 400));
}
if (!len) {
  console.error(`❌ Máy chủ kiểm thử không lên được.\n${loiMC.slice(-600)}`);
  process.exit(1);
}

const chay = (f) => new Promise((xong) => {
  const t = Date.now();
  /* Truyền địa chỉ bằng BIẾN MÔI TRƯỜNG, không bằng tham số: `kiem-canh.mjs`
     nhận TÊN CLIP ở tham số thứ nhất, nhét địa chỉ vào đó là nó đi tìm một clip
     tên "http://127.0.0.1:7804". */
  const c = spawn('node', [path.join(M, 'tools', f)],
    { cwd: M, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, MOTION_GOC: GOC } });
  let ra = '';
  c.stdout.on('data', (d) => { ra += d; });
  c.stderr.on('data', (d) => { ra += d; });
  const gio = setTimeout(() => { try { c.kill(); } catch { /* kệ */ } }, 700_000);
  c.on('close', (m) => { clearTimeout(gio); xong({ ma: m, ra, giay: (Date.now() - t) / 1000 }); });
});

console.log(`Chạy ${bai.length} bài kiểm…\n`);
const hong = [];
for (const f of bai) {
  const ten = f.replace(/^kiem-|\.mjs$/g, '');
  process.stdout.write(`  ${ten.padEnd(14)} `);
  const r = await chay(f);
  if (r.ma === 0) console.log(`✅ ${r.giay.toFixed(0)}s`);
  else { console.log(`❌ ${r.giay.toFixed(0)}s`); hong.push({ ten, ra: r.ra }); }
}

if (hong.length) {
  console.log(`\n${'─'.repeat(52)}`);
  for (const h of hong) {
    console.log(`\n❌ ${h.ten}`);
    // Chỉ in những dòng ✗ và vài dòng cuối — in cả log của 28 bài thì không đọc nổi.
    const x = h.ra.split('\n').filter((d) => d.includes('✗'));
    console.log((x.length ? x : h.ra.split('\n').slice(-12)).map((d) => `   ${d}`).join('\n'));
  }
}
console.log(`\n${hong.length ? `❌ ${hong.length}/${bai.length} bài hỏng.` : `✅ ${bai.length}/${bai.length} bài đạt.`}\n`);
dung();
process.exit(hong.length ? 1 : 0);
