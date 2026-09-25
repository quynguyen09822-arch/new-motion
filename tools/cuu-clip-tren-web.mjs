#!/usr/bin/env node
/**
 * CỨU CLIP ĐANG NẰM TRÊN BẢN CHẠY THẬT, TRƯỚC KHI TRIỂN KHAI LẠI.
 *
 * VÌ SAO CẦN.
 *   Vibe Host dựng container mới mỗi lượt triển khai. Thư mục nào KHÔNG được
 *   khai là "dữ liệu bền" thì nằm ở lớp ghi-được của container cũ và bị bỏ lại
 *   cùng container đó. Dự án `motion` khai đúng SỐ KHÔNG thư mục bền, nghĩa là
 *   mọi clip lưu trên web từ trước tới nay đều đã và đang mất sau mỗi lượt
 *   triển khai — im lặng, không ai được báo.
 *
 *   Khai thư mục bền thì từ lượt SAU trở đi được giữ. Nhưng đúng lượt triển
 *   khai bật nó lên vẫn mất, vì ổ mới được mồi từ ảnh Docker chứ không phải từ
 *   container cũ. Nên phải kéo hết về TRƯỚC, rồi mới triển khai.
 *
 * KHÔNG NHẬN MẬT KHẨU QUA THAM SỐ DÒNG LỆNH.
 *   Tham số dòng lệnh nằm trong `ps`, trong lịch sử shell, và trong log của bất
 *   cứ thứ gì đang theo dõi tiến trình. Mật khẩu đọc từ biến môi trường
 *   `MOTION_MK`, hoặc gõ vào lúc chạy (không hiện lên màn hình).
 *
 * CHỈ ĐỌC. Script này không gọi một đường ghi nào — không lưu, không xoá, không
 * tạo. Chạy nhầm mười lần cũng không hỏng gì trên máy chủ.
 *
 *   MOTION_MK='…' node tools/cuu-clip-tren-web.mjs https://motion.n1.tinhgon.xyz
 *   node tools/cuu-clip-tren-web.mjs https://… --ra /đường/dẫn/cất
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const GOC = (args.find((a) => !a.startsWith('--')) || 'https://motion.n1.tinhgon.xyz')
  .replace(/\/+$/, '');
const lay = (ten, mac) => {
  const i = args.indexOf(`--${ten}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : mac;
};
/* Mặc định cất vào thư mục CÓ NGÀY THÁNG. Ghi đè lên bản cứu lần trước là mất
   đúng cái mình vừa cất công cứu. */
const RA = path.resolve(lay('ra', path.join(
  process.cwd(), '.cuu-tren-web', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'))));

/** Gõ mật khẩu mà không hiện lên màn hình. */
function hoiMatKhau(loiNhac) {
  return new Promise((xong) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const ra = process.stdout;
    const viet = rl._writeToOutput?.bind(rl);
    rl._writeToOutput = (s) => { if (/\n/.test(s)) ra.write('\n'); };
    ra.write(loiNhac);
    rl.question('', (mk) => { rl._writeToOutput = viet; rl.close(); xong(mk); });
  });
}

/* Đọc mật khẩu từ FILE nếu được chỉ. Có người không gõ được vào terminal —
   readline ẩn ký tự nên tưởng không nhập được, hoặc mật khẩu có ký tự đặc biệt
   bị shell hiểu nhầm. Dán vào một file bằng trình soạn thảo thì né cả hai.
   Đọc xong XOÁ NGAY, để mật khẩu không nằm lại trên đĩa. */
async function docTuFile(duong) {
  const { readFileSync, rmSync } = await import('node:fs');
  const mk = readFileSync(duong, 'utf8').trim();
  try { rmSync(duong); } catch { /* xoá không được thì thôi, đã đọc xong */ }
  return mk;
}
const mkFile = lay('mk-file', '');
const mk = mkFile ? await docTuFile(mkFile)
  : (process.env.MOTION_MK || await hoiMatKhau('Mật khẩu của bản chạy thật: '));
if (!mk) { console.error('Chưa có mật khẩu — không làm gì cả.'); process.exit(1); }

/* ---------- đăng nhập ---------- */
const email = process.env.MOTION_EMAIL || process.env.CODER_USER_EMAIL || '';
const r = await fetch(`${GOC}/api/dang-nhap`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(email ? { email, mk } : { mk }), redirect: 'manual',
});
const ve = (r.headers.get('set-cookie') || '').match(/motion_phien=([^;]+)/)?.[1];
if (!ve) {
  const than = await r.json().catch(() => ({}));
  console.error(`Không đăng nhập được (mã ${r.status}). ${than.loi || ''}`);
  /* Chỉ mách chuyện email khi lỗi ĐÚNG là chuyện tài khoản. Mách kèm cả lúc sai
     mật khẩu là đẩy người ta đi sửa nhầm chỗ — mà đây là công cụ người ta chạy
     lúc đang cuống vì sắp mất dữ liệu. */
  if (/tài khoản|không được phép|email/i.test(than.loi || '')) {
    console.error('Máy chủ này có danh sách tài khoản thì phải khai cả email:');
    console.error("  MOTION_EMAIL='ban@matbao.com' MOTION_MK='…' node tools/cuu-clip-tren-web.mjs …");
  }
  process.exit(1);
}
const dem = { Cookie: `motion_phien=${ve}` };
console.log(`Đã vào ${GOC}${email ? ` với ${email}` : ''}.`);

/* ---------- liệt kê ---------- */
const ds = await (await fetch(`${GOC}/api/clips`, { headers: dem })).json();
if (!ds.ok) { console.error(`Không đọc được danh sách clip: ${ds.loi || ''}`); process.exit(1); }

/* Clip ĐỜI CŨ là file HTML nằm trong ảnh Docker, không phải thứ người dùng sửa
   trên web — chúng luôn quay lại nguyên vẹn sau mỗi lượt triển khai. Chỉ kéo về
   clip đời 2, tức thứ THẬT SỰ có thể mất. */
const canCuu = (ds.clips || []).filter((c) => c.doi !== 1);
console.log(`Có ${ds.clips?.length || 0} clip, trong đó ${canCuu.length} clip đời mới cần cứu.`);
if (!canCuu.length) { console.log('Không có gì để cứu. Triển khai lại được rồi.'); process.exit(0); }

mkdirSync(RA, { recursive: true });

/* ---------- kéo về ---------- */
let xong = 0;
const hong = [];
for (const c of canCuu) {
  try {
    /* THỬ NHIỀU ĐƯỜNG, vì bản chạy thật có thể là bản CŨ. Bản mới có
       `/api/tai-kich-ban` (trả kịch bản thẳng); bản cũ (21/09) chỉ có
       `/api/clip/:slug` (trả {doc}) và `/api/kich-ban/:slug` (trả doc thẳng).
       Không dò đúng đường thì mọi clip trả 404 và ta tưởng không có gì để cứu —
       trong khi dữ liệu vẫn nằm đó. */
    const s = encodeURIComponent(c.slug);
    let doc = null;
    for (const d of [`/api/tai-kich-ban/${s}`, `/api/kich-ban/${s}`, `/api/clip/${s}`]) {
      const k = await fetch(`${GOC}${d}`, { headers: dem });
      if (!k.ok) continue;
      let j; try { j = JSON.parse(await k.text()); } catch { continue; }
      /* `/api/clip` bọc trong {doc}; hai đường kia trả doc thẳng. */
      const thu = (j && j.meta && Array.isArray(j.scenes)) ? j
        : (j?.doc?.meta && Array.isArray(j.doc.scenes)) ? j.doc : null;
      if (thu) { doc = thu; break; }
    }
    if (!doc) throw new Error('không đường nào trả về kịch bản');
    const chu = JSON.stringify(doc, null, 2);
    writeFileSync(path.join(RA, `${c.slug}.json`), chu, 'utf8');
    console.log(`  ✓ ${c.slug} — ${doc.scenes.length} cảnh, ${Buffer.byteLength(chu)} byte`);
    xong += 1;
  } catch (e) {
    console.log(`  ✗ ${c.slug} — ${e.message}`);
    hong.push(c.slug);
  }
}

writeFileSync(path.join(RA, '_danh-sach.json'),
  JSON.stringify({ goc: GOC, luc: new Date().toISOString(), soClip: xong, hong }, null, 2), 'utf8');

console.log(`\nĐã cất ${xong}/${canCuu.length} clip vào:\n  ${RA}`);
if (hong.length) {
  console.log(`\n⚠ ${hong.length} clip KHÔNG kéo về được: ${hong.join(', ')}`);
  console.log('  ĐỪNG triển khai lại cho tới khi cứu xong những clip này.');
  process.exit(1);
}
console.log('\nCứu xong. Giờ khai thư mục dữ liệu bền rồi triển khai lại được.');
