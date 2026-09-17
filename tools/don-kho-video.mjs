#!/usr/bin/env node
/**
 * DỌN KHO VIDEO của Library-Source.
 *
 * ⚠️ `Library-Source` vốn là kho CHỈ ĐỌC — 17 GB của quynd, mọi thứ khác chỉ
 * được móc nối vào chứ không sửa. Công cụ này là ngoại lệ DUY NHẤT và chỉ chạy
 * khi người dùng gõ `--ghi`. Không có `--ghi` thì nó chỉ đọc và in ra.
 *
 * CHỈ XOÁ HAI THỨ, và cả hai đều không mất gì:
 *   1. File hỏng — không có `moov atom` ở bất cứ đâu trong file, tức là tải dở
 *      dang. Không phần mềm nào mở được, kể cả VLC.
 *   2. Bản trùng — cùng mã băm MD5 với một file khác. Giữ lại bản có TÊN NGẮN
 *      NHẤT, bỏ các bản còn lại.
 *
 * TUYỆT ĐỐI KHÔNG XOÁ file trình duyệt không đọc được (`mpeg4`, `qtrle`,
 * `png`, `mjpeg`, `prores`). Chúng KHÔNG hỏng — chỉ là sai mã hoá, và chuyển
 * sang H.264 hay WebM là dùng được ngay. Riêng `qtrle` và `png` còn mang NỀN
 * TRONG SUỐT, là thứ quý nhất trong kho. Xoá chúng là mất thật.
 *
 * Xoá xong phải quét lại sổ mục lục, nếu không thư viện đầy mục chết:
 *   cd Library-Source && node tools/scan.mjs
 * Mô tả do AI sinh nằm riêng ở `data/descriptions.json` nên quét lại không mất.
 *
 * Dùng:
 *   node tools/don-kho-video.mjs                 → chỉ xem, không đụng gì
 *   node tools/don-kho-video.mjs --ghi           → xoá thật, có ghi biên bản
 *   node tools/don-kho-video.mjs --kho <đường dẫn>
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const GHI = argv.includes('--ghi');
const KHO = path.resolve(arg('kho', '/home/coder/workspace/projects/Library-Source/public/video'));

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const ds = readdirSync(KHO).map((f) => path.join(KHO, f)).filter((f) => statSync(f).isFile());
console.log(`Kho: ${KHO}\n${ds.length} file · ${mb(ds.reduce((t, f) => t + statSync(f).size, 0))}\n`);

/* ---------- 1. file hỏng ---------- */
/* Nhận diện bằng ffprobe chứ không bằng đuôi file: đuôi `.mov` vẫn lành, mà
   `.mp4` vẫn hỏng được. Thông báo thật của ffprobe mới là bằng chứng. */
console.log('Đang soi từng file…');
const hong = [];
for (const f of ds) {
  try { execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch { hong.push(f); }
}
console.log(`  hỏng, không mở được: ${hong.length} file · ${mb(hong.reduce((t, f) => t + statSync(f).size, 0))}`);

/* ---------- 2. bản trùng ---------- */
const theoBam = new Map();
for (const f of ds) {
  const m = createHash('md5').update(readFileSync(f)).digest('hex');
  (theoBam.get(m) || theoBam.set(m, []).get(m)).push(f);
}
const thua = [];
for (const v of theoBam.values()) {
  if (v.length < 2) continue;
  // Giữ tên NGẮN nhất: "Wait.mp4" là tên gốc, "Full Meme - Wait.mp4" là bản chép.
  const giu = v.slice().sort((a, b) => path.basename(a).length - path.basename(b).length
    || a.localeCompare(b))[0];
  thua.push(...v.filter((x) => x !== giu));
}
console.log(`  bản trùng thừa     : ${thua.length} file · ${mb(thua.reduce((t, f) => t + statSync(f).size, 0))}`);

const xoa = [...new Set([...hong, ...thua])];
const tongXoa = xoa.reduce((t, f) => t + statSync(f).size, 0);
console.log(`\n→ gộp lại: ${xoa.length} file · ${mb(tongXoa)}`);

if (!GHI) {
  console.log('\nĐây mới là XEM THỬ — chưa đụng vào file nào.');
  console.log('20 file đầu sẽ bị xoá:');
  for (const f of xoa.slice(0, 20)) console.log(`   ${hong.includes(f) ? 'hỏng ' : 'trùng'}  ${path.basename(f)}`);
  console.log(`   … và ${Math.max(0, xoa.length - 20)} file nữa`);
  console.log('\nMuốn xoá thật thì thêm  --ghi');
  process.exit(0);
}

/* ---------- xoá, có biên bản ---------- */
/* Biên bản ghi TRƯỚC khi xoá. Ghi sau thì lỡ nửa chừng gặp lỗi là không còn
   biết đã mất những gì. */
const bb = path.join(path.dirname(KHO), `..`, `bien-ban-don-video-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.tsv`);
writeFileSync(bb, ['ly_do\tkich_thuoc\tduong_dan',
  ...xoa.map((f) => `${hong.includes(f) ? 'hong' : 'trung'}\t${statSync(f).size}\t${f}`)].join('\n'), 'utf8');
console.log(`\nBiên bản: ${path.resolve(bb)}`);
let n = 0;
for (const f of xoa) { try { unlinkSync(f); n++; } catch (e) { console.log(`  không xoá được ${path.basename(f)}: ${e.message}`); } }
console.log(`✅ Đã xoá ${n}/${xoa.length} file · lấy lại ${mb(tongXoa)}`);
console.log('\n⚠️ Nhớ quét lại sổ mục lục, nếu không thư viện đầy mục chết:');
console.log('   cd /home/coder/workspace/projects/Library-Source && node tools/scan.mjs');
