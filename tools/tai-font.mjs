/**
 * Tải Be Vietnam Pro + JetBrains Mono từ Google Fonts về làm file tĩnh.
 * CHẠY MỘT LẦN rồi thôi — kết quả cam kết vào repo, không phải bước dựng.
 *
 * Phải giả làm Chrome: Google trả woff2 cho UA mới, trả ttf cho UA cũ.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RA = process.argv[2] || new URL("../clip/public/fonts/", import.meta.url).pathname;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const GIU = new Set(['latin', 'latin-ext', 'vietnamese']);   // bỏ cyrillic/greek: không dùng

const BO = [
  { ten: 'Be Vietnam Pro', ma: 'be-vietnam-pro', nets: [400, 500, 600, 700, 800] },
  { ten: 'JetBrains Mono', ma: 'jetbrains-mono', nets: [400, 500] },
];

mkdirSync(RA, { recursive: true });
const khoi = [];

for (const b of BO) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(b.ten).replace(/%20/g, '+')}:wght@${b.nets.join(';')}&display=block`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  if (!css.includes('woff2')) throw new Error(`${b.ten}: Google không trả woff2`);

  // Mỗi @font-face đứng sau một chú thích tên tập con: /* vietnamese */
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const tapCon = m[1];
    const than = m[2];
    if (!GIU.has(tapCon)) continue;
    const net = Number(than.match(/font-weight:\s*(\d+)/)?.[1]);
    const src = than.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const dai = than.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (!net || !src) continue;

    const ten = `${b.ma}-${net}-${tapCon}.woff2`;
    const bin = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
    if (bin.length < 500) throw new Error(`${ten}: file quá nhỏ, tải hỏng`);
    if (bin.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error(`${ten}: không phải woff2`);
    writeFileSync(path.join(RA, ten), bin);
    khoi.push({ ho: b.ten, net, tapCon, ten, dai, byte: bin.length });
    console.log(`  ${ten.padEnd(38)} ${(bin.length / 1024).toFixed(1).padStart(6)} KB`);
  }
}
writeFileSync(path.join(RA, '_danh-sach.json'), JSON.stringify(khoi, null, 2));
console.log(`\n  → ${khoi.length} file, tổng ${(khoi.reduce((s, x) => s + x.byte, 0) / 1024).toFixed(0)} KB`);
