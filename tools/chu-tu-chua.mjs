#!/usr/bin/env node
/**
 * ÁP BỘ CHỮ TỰ CHỨA CHO MỘT DỰ ÁN CLIP.
 *
 *   node tools/chu-tu-chua.mjs [đường/dẫn/dự-án-clip]
 *
 * Mặc định chạy cho dự án clip mà máy chủ ĐANG dùng (`proj.js` quyết), không
 * phải bản `clip/` kèm trong repo — hai chỗ đó khác nhau và đó chính là cái bẫy:
 * sửa bản kèm thì máy chủ vẫn phục vụ bản cũ, chữ vẫn sai, mà mã trông như đã sửa.
 *
 * CHẠY LẠI ĐƯỢC NHIỀU LẦN. Dự án clip KHÔNG có git — chạy hai lần mà hỏng thì
 * không có gì lùi về. Nên mọi phép sửa ở đây đều kiểm "đã sửa rồi thì thôi".
 *
 * Việc nó làm:
 *   1. Chép `public/fonts/` sang (nếu thiếu, hoặc file lệch)
 *   2. `scene-player.html`: thêm thẻ nạp + ghim "Be Vietnam Pro" lên đầu
 *   3. Clip đời cũ: bỏ thẻ Google Fonts, nạp bộ cục bộ, gom họ chữ không có file
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NGUON_FONT = path.join(GOC, 'clip', 'public', 'fonts');
const DICH = path.resolve(process.argv[2] || (await import(path.join(GOC, 'server', 'proj.js'))).PROJ);

const NAP_CLIP = '<link rel="stylesheet" href="public/fonts/chu.css">';
const CHU_NAP = `<!-- Bộ chữ tự chứa, không tải qua mạng. Đường tương đối để chạy được ở cả
     /clip/<tên>.html (qua trình sửa) lẫn /<tên>.html (phục vụ thẳng gốc dự án). -->
${NAP_CLIP}`;

/* Họ chữ khai trong CSS mà KHÔNG có file đi kèm → luôn rơi về phông hệ thống.
   Gom hết về Be Vietnam Pro. JetBrains Mono giữ lại vì đã có file. */
const GOM = [
  [/'Space Grotesk'\s*,\s*sans-serif/g, "'Be Vietnam Pro',system-ui,sans-serif"],
  [/"Space Grotesk"\s*,\s*"Be Vietnam Pro"\s*,\s*sans-serif/g, '"Be Vietnam Pro",system-ui,sans-serif'],
  [/'Space Grotesk'\s*,\s*'Be Vietnam Pro'\s*,\s*sans-serif/g, "'Be Vietnam Pro',system-ui,sans-serif"],
  [/Poppins\s*,\s*"Be Vietnam Pro"\s*,\s*sans-serif/g, '"Be Vietnam Pro",system-ui,sans-serif'],
  [/'Inter'\s*,\s*sans-serif/g, "'Be Vietnam Pro',system-ui,sans-serif"],
];

if (!existsSync(NGUON_FONT)) { console.error(`Không thấy ${NGUON_FONT}`); process.exit(1); }
if (!existsSync(DICH)) { console.error(`Không thấy dự án clip ${DICH}`); process.exit(1); }
console.log(`Dự án clip: ${DICH}\n`);

/* ── 1. Bộ font ── */
const raFont = path.join(DICH, 'public', 'fonts');
mkdirSync(raFont, { recursive: true });
let chep = 0;
for (const f of readdirSync(NGUON_FONT)) {
  const a = path.join(NGUON_FONT, f), b = path.join(raFont, f);
  if (existsSync(b) && statSync(b).size === statSync(a).size) continue;
  copyFileSync(a, b); chep++;
}
console.log(`  bộ chữ: ${chep ? `chép ${chep} file` : 'đã đủ, không chép lại'} → public/fonts/`);

/* ── 2. Bộ dựng cảnh ── */
const sp = path.join(DICH, 'scene-player.html');
if (existsSync(sp)) {
  let s = readFileSync(sp, 'utf8');
  const truoc = s;
  if (!s.includes('public/fonts/chu.css')) {
    s = s.replace('<title>ClipVibe · Bộ dựng cảnh</title>\n',
      `<title>ClipVibe · Bộ dựng cảnh</title>\n${CHU_NAP}\n`);
  }
  s = s.replace('font-family:Roboto,"Noto Sans","Liberation Sans",Arial,sans-serif;',
    'font-family:"Be Vietnam Pro",system-ui,sans-serif;');
  if (s !== truoc) { writeFileSync(sp, s, 'utf8'); console.log('  scene-player.html: đã sửa'); }
  else console.log('  scene-player.html: đã đúng từ trước');
} else console.log('  scene-player.html: KHÔNG CÓ ở dự án này');

/* ── 3. Clip đời cũ ── */
let doi = 0, boThe = 0, gom = 0;
for (const f of readdirSync(DICH).filter((x) => x.endsWith('.html') && x !== 'scene-player.html')) {
  const p = path.join(DICH, f);
  let s = readFileSync(p, 'utf8');
  const truoc = s;
  const the = (s.match(/<link[^>]*(?:fonts\.googleapis|fonts\.gstatic)[^>]*>/g) || []).length;
  if (the) {
    s = s.replace(/[ \t]*<link[^>]*rel=["']preconnect["'][^>]*(?:fonts\.googleapis|fonts\.gstatic)[^>]*>\n?/g, '');
    s = s.replace(/[ \t]*<link[^>]*(?:fonts\.googleapis|fonts\.gstatic)[^>]*>\n?/,
      s.includes('public/fonts/chu.css') ? '' : `${CHU_NAP}\n`);
    s = s.replace(/[ \t]*<link[^>]*(?:fonts\.googleapis|fonts\.gstatic)[^>]*>\n?/g, '');
    boThe += the;
  }
  let n = 0;
  for (const [re, moi] of GOM) { const [x, k] = [s.replace(re, moi), (s.match(re) || []).length]; s = x; n += k; }
  gom += n;
  if (s !== truoc) { writeFileSync(p, s, 'utf8'); doi++; console.log(`  ${f}: bỏ ${the} thẻ mạng${n ? `, gom ${n} họ chữ` : ''}`); }
}
console.log(`\n  → ${doi} clip đời cũ đã sửa, bỏ ${boThe} thẻ tải mạng, gom ${gom} khai họ chữ`);

const con = readdirSync(DICH).filter((x) => x.endsWith('.html'))
  .filter((x) => /fonts\.googleapis|fonts\.gstatic/.test(readFileSync(path.join(DICH, x), 'utf8')));
console.log(con.length ? `  ⚠️  còn ${con.length} file trỏ mạng: ${con.join(', ')}` : '  ✓ không file nào còn trỏ Google Fonts');
