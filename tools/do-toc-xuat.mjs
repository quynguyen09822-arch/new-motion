#!/usr/bin/env node
/**
 * ĐO TỐC ĐỘ HỨNG KHUNG — ba cách, trên cùng một clip, cùng một lúc.
 *
 * Vì sao phải có file này chứ không đo một lần rồi ghi số vào tài liệu: lần đo
 * đầu rơi vào lúc máy tải 23 trên 12 lõi, ra 80–210ms mỗi khung và suýt nữa thì
 * kết luận sai rằng nhảy từng khung không đáng làm. Tốc độ hứng khung phụ thuộc
 * tải máy tới vài lần, nên số phải đo LẠI mỗi khi cần quyết, kèm tải máy lúc đo.
 *
 *   node tools/do-toc-xuat.mjs [clip] [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { loadavg, cpus } from 'node:os';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const CLIP = process.argv[2] || 'thu-ve-lai-s02';
const GOC = process.argv[3] || 'http://127.0.0.1:7803';
const N = Number(process.env.N || 60);  // 60 khung là đủ ổn định khi máy rảnh

console.log(`máy: ${cpus().length} lõi · tải ${loadavg()[0].toFixed(2)} · clip "${CLIP}" · ${N} khung mỗi phép đo\n`);

const br = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const pg = await br.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
await pg.goto(`${GOC}/clip/scene-player.html?scene=${CLIP}&export=1`, { waitUntil: 'load' });
await pg.waitForFunction(() => Boolean(window.__clip), null, { timeout: 30000 });
await pg.evaluate(() => window.__clip.ready());
const DUR = await pg.evaluate(() => window.__clip.duration);
const cdp = await pg.context().newCDPSession(pg);

const do_ = async (nhan, f) => {
  await f(0);                                     // một nhịp làm nóng, không tính
  const t0 = Date.now();
  for (let i = 0; i < N; i++) await f(i);
  const ms = (Date.now() - t0) / N;
  console.log(`  ${nhan.padEnd(32)} ${ms.toFixed(1).padStart(6)}ms/khung`);
  return ms;
};

const nhay = (i) => pg.evaluate((s) => window.__clip.step(s), 1 + (i % (DUR * 25)) / 30);

const chiNhay = await do_('chỉ nhảy khung, không chụp', nhay);
const chup = await do_('nhảy + CDP chụp jpeg 90', async (i) => {
  await nhay(i); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
});

await br.close();

const KHUNG = Math.round(DUR * 30);
console.log(`clip ${DUR.toFixed(1)}s = ${KHUNG} khung @30 hình/giây · quay thời gian thật tốn ${DUR.toFixed(0)}s`);
for (const [ten, ms] of [['CDP chụp', chup]]) {
  const mot = KHUNG * ms / 1000;
  const bon = mot / 4;
  console.log(`  ${ten.padEnd(18)} 1 luồng ${mot.toFixed(0).padStart(4)}s · 4 luồng ${bon.toFixed(0).padStart(4)}s`
    + `  → ${bon < DUR ? `nhanh gấp ${(DUR / bon).toFixed(1)} lần` : 'CHẬM HƠN quay thật'}`);
}
console.log(`\n  phần nhảy khung chỉ chiếm ${(chiNhay / chup * 100).toFixed(0)}% — nút thắt là khâu CHỤP.`);
