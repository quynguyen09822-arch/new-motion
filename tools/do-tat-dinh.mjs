#!/usr/bin/env node
/**
 * ĐO TÍNH TẤT ĐỊNH của bộ dựng clip.
 *
 * Câu hỏi: nhảy thẳng tới giây `t` có ra ĐÚNG khung hình như đi tuần tự tới `t`
 * không? Nếu có thì bộ xuất được phép nhảy từng khung thay vì quay màn hình
 * theo thời gian thật — 3 phút phim thôi tốn 3 phút.
 *
 * Đo bằng cách chụp thật rồi băm ảnh, không tin vào lời hứa trong tài liệu.
 *   node tools/do-tat-dinh.mjs [clip] [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const CLIP = process.argv[2] || 'cta';
const GOC = process.argv[3] || 'http://127.0.0.1:7803';

const trinh = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
await trang.goto(`${GOC}/clip/scene-player.html?scene=${CLIP}&export=1`, { waitUntil: 'load' });
await trang.waitForFunction(() => Boolean(window.__clip), null, { timeout: 30000 });
await trang.evaluate(() => window.__clip.ready());
const DUR = await trang.evaluate(() => window.__clip.duration);
const coStep = await trang.evaluate(() => typeof window.__clip.step === 'function');
console.log(`clip "${CLIP}" · ${DUR.toFixed(2)} giây · có step(): ${coStep ? 'có' : 'KHÔNG'}`);
if (!coStep) { await trinh.close(); process.exit(1); }

const bam = async (t) => {
  await trang.evaluate((s) => window.__clip.step(s), t);
  return createHash('sha1').update(await trang.screenshot({ type: 'png' })).digest('hex').slice(0, 12);
};

// 12 mốc rải đều, tránh đúng biên cảnh
const moc = Array.from({ length: 12 }, (_, i) => +((i + 0.5) * DUR / 12).toFixed(3));

console.log('\n1. Đi xuôi rồi đi ngược — cùng một giây phải ra cùng một hình');
const xuoi = {}; for (const t of moc) xuoi[t] = await bam(t);
const nguoc = {}; for (const t of [...moc].reverse()) nguoc[t] = await bam(t);
const lechThuTu = moc.filter((t) => xuoi[t] !== nguoc[t]);
console.log(`   ${moc.length - lechThuTu.length}/${moc.length} mốc khớp`
  + (lechThuTu.length ? ` · lệch tại giây ${lechThuTu.join(', ')}` : ''));

console.log('\n2. Nạp lại trang từ đầu — vẫn phải ra đúng hình cũ');
await trang.reload({ waitUntil: 'load' });
await trang.waitForFunction(() => Boolean(window.__clip), null, { timeout: 30000 });
await trang.evaluate(() => window.__clip.ready());
const lan2 = {}; for (const t of moc) lan2[t] = await bam(t);
const lechNap = moc.filter((t) => xuoi[t] !== lan2[t]);
console.log(`   ${moc.length - lechNap.length}/${moc.length} mốc khớp`
  + (lechNap.length ? ` · lệch tại giây ${lechNap.join(', ')}` : ''));

console.log('\n3. Tốc độ nhảy khung');
const N = 60, t0 = Date.now();
for (let i = 0; i < N; i++) await bam((i / 30) % DUR);
const ms = (Date.now() - t0) / N;
console.log(`   ${ms.toFixed(1)}ms mỗi khung (nhảy + chụp PNG)`);
console.log(`   → phim ${DUR.toFixed(0)}s ở 30 hình/giây ≈ ${(DUR * 30 * ms / 1000).toFixed(0)}s một luồng`);
console.log(`   → chia 4 luồng ≈ ${(DUR * 30 * ms / 4000).toFixed(0)}s (quay thời gian thật: ${DUR.toFixed(0)}s)`);

await trinh.close();
const hong = lechThuTu.length + lechNap.length;
console.log(hong ? `\n❌ Bộ dựng CHƯA tất định — ${hong} mốc lệch. Không được nhảy khung.\n`
                 : '\n✅ Bộ dựng tất định — nhảy từng khung cho ra hình đúng tuyệt đối.\n');
process.exit(hong ? 1 : 0);
