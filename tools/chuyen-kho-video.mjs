#!/usr/bin/env node
/**
 * CHUYỂN MÃ KHO VIDEO — biến file trình duyệt không đọc được thành đọc được.
 *
 * Những file này KHÔNG hỏng. Chúng chỉ mang mã hoá mà Chromium không giải được:
 * `mpeg4` (MPEG-4 phần 2), `mjpeg`, `prores`, `qtrle`, `png`. Đã thử thật trong
 * Chromium — xem `memory/video-codec-trinh-duyet.md`. Chuyển mã là dùng được ngay.
 *
 * HAI ĐÍCH ĐẾN KHÁC NHAU, và chọn sai là mất của:
 *   · Có NỀN TRONG SUỐT (`pix_fmt` chứa chữ `a`: `bgra`, `rgba`) → WebM VP9
 *     `yuva420p`. Đẩy sang MP4/H.264 là **mất nền trong suốt vĩnh viễn** — H.264
 *     không có kênh alpha. Đây là loại tài sản khó kiếm nhất khi dựng overlay.
 *   · Không có nền trong suốt → MP4 H.264, nhẹ và đâu cũng phát được.
 *
 * KHÔNG XOÁ BẢN GỐC TRƯỚC KHI KIỂM. Chuyển xong phải đối chiếu: đúng mã đích,
 * còn nguyên kênh alpha (nếu gốc có), và thời lượng lệch dưới 0,3 giây. Chỉ khi
 * cả ba đạt mới bỏ bản gốc. Hỏng giữa chừng thì gốc vẫn còn nguyên.
 *
 * Dùng:
 *   node tools/chuyen-kho-video.mjs               → chỉ xem
 *   node tools/chuyen-kho-video.mjs --ghi         → chuyển thật
 *   node tools/chuyen-kho-video.mjs --ghi --chi alpha   → chỉ nhóm nền trong suốt
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, unlinkSync, existsSync, appendFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const GHI = argv.includes('--ghi');
const CHI = arg('chi', 'tat-ca');           // tat-ca | alpha | thuong
const KHO = path.resolve(arg('kho', '/home/coder/workspace/projects/Library-Source/public/video'));
const CAN = new Set(['mpeg4', 'mjpeg', 'prores', 'qtrle', 'png']);

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
/**
 * Soi một file. `co_trong` là chỗ DỄ SAI NHẤT của cả công cụ này.
 *
 * WebM cất kênh trong suốt ở một luồng PHỤ, nên `pix_fmt` của luồng hình vẫn
 * báo `yuv420p` dù nền trong suốt còn nguyên. Kiểm bằng `pix_fmt` là kết luận
 * "mất nền" cho mọi bản chuyển đạt — và công cụ sẽ vứt hết bản mới rồi báo
 * trượt 100%. Dấu hiệu thật nằm ở thẻ `alpha_mode=1`.
 *
 * Đã đối chứng trong Chromium: bản WebM cho đúng 100% điểm ảnh trong suốt như
 * bản gốc, còn bản H.264 cho 0%.
 */
const soi = (f) => {
  try {
    const r = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,pix_fmt', '-show_entries', 'stream_tags=alpha_mode',
      '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f],
      { encoding: 'utf8' }).trim().split('\n');
    const px = r[1] || '';
    const tag = r.find((x) => x === '1');
    return { ma: r[0], px, dai: Number(r[r.length - 1]) || 0,
      coTrong: /rgba|bgra|argb|abgr|yuva/.test(px) || tag === '1' };
  } catch { return null; }
};

const ds = readdirSync(KHO).map((f) => path.join(KHO, f)).filter((f) => statSync(f).isFile());
console.log(`Kho: ${KHO}\n${ds.length} file\n\nĐang soi…`);

const viec = [];
for (const f of ds) {
  const t = soi(f);
  if (!t || !CAN.has(t.ma)) continue;
  const alpha = t.coTrong;
  if (CHI === 'alpha' && !alpha) continue;
  if (CHI === 'thuong' && alpha) continue;
  viec.push({ f, ...t, alpha, co: statSync(f).size });
}
const nhomA = viec.filter((v) => v.alpha), nhomT = viec.filter((v) => !v.alpha);
console.log(`  nền trong suốt → WebM VP9 : ${nhomA.length} file · ${mb(nhomA.reduce((t, v) => t + v.co, 0))}`);
console.log(`  thường         → MP4 H.264: ${nhomT.length} file · ${mb(nhomT.reduce((t, v) => t + v.co, 0))}`);

if (!GHI) {
  console.log('\nĐây mới là XEM THỬ — chưa đụng vào file nào.');
  for (const v of viec.slice(0, 10)) {
    console.log(`   ${v.ma.padEnd(7)} ${v.px.padEnd(12)} ${v.alpha ? '→ webm' : '→ mp4 '}  ${path.basename(v.f)}`);
  }
  console.log(`   … và ${Math.max(0, viec.length - 10)} file nữa\n\nMuốn chuyển thật thì thêm  --ghi`);
  process.exit(0);
}

/* LUÔN ghi ra file TẠM trước, không bao giờ ghi thẳng vào tên đích.
 *
 * Phần lớn kho là `.mp4` mang mã `mpeg4`, nên tên đích cũng là `.mp4` — TRÙNG
 * ĐÚNG tên file gốc. Ghi thẳng là bảo ffmpeg vừa đọc vừa ghi đè lên chính file
 * nó đang đọc: file nát, mà không có thông báo nào. */
const tenTam = (f, duoi) => `${f}.dang-chuyen.${duoi}`;

/* Tên đích cuối, tính SAU khi đã bỏ bản gốc. Nếu trong kho đã có sẵn một file
   khác trùng tên thì thêm hậu tố chứ không đè lên nó. */
const tenDich = (f, duoi) => {
  let d = f.replace(/\.[^.]+$/, `.${duoi}`);
  if (!existsSync(d)) return d;
  let i = 2;
  while (existsSync(d = f.replace(/\.[^.]+$/, `-${i}.${duoi}`))) i++;
  return d;
};

const bb = path.join(KHO, '..', '..', `bien-ban-chuyen-video-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.tsv`);
writeFileSync(bb, 'ket_qua\tma_goc\tco_goc\tco_moi\tgoc\tmoi\n', 'utf8');
console.log(`\nBiên bản: ${path.resolve(bb)}\n`);

let ok = 0, truot = 0, truocB = 0, sauB = 0;
for (const [i, v] of viec.entries()) {
  const duoi = v.alpha ? 'webm' : 'mp4';
  const ra = tenTam(v.f, duoi);
  const args = v.alpha
    /* `-vf format=yuva420p` chứ không phải `-pix_fmt`: để ffmpeg tự chọn thì
       khâu đổi định dạng nằm TRƯỚC bộ mã hoá sẽ vứt kênh trong suốt đi, im lặng.
       `-auto-alt-ref 0` là bắt buộc — khung tham chiếu phụ của libvpx không
       mang được kênh trong suốt. */
    ? ['-i', v.f, '-vf', 'format=yuva420p', '-c:v', 'libvpx-vp9', '-crf', '30',
       '-b:v', '0', '-auto-alt-ref', '0', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '96k', ra]
    : ['-i', v.f, '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p',
       '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', ra];
  let lyDo = '';
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 300000 });
    const t = soi(ra);
    if (!t) lyDo = 'bản mới không đọc được';
    else if (v.alpha && !t.coTrong) lyDo = `mất nền trong suốt (${t.px}, không có thẻ alpha_mode)`;
    else if (!v.alpha && t.ma !== 'h264') lyDo = `ra sai mã (${t.ma})`;
    else if (v.dai > 0 && Math.abs(t.dai - v.dai) > 0.3) lyDo = `lệch thời lượng ${(t.dai - v.dai).toFixed(2)}s`;
  } catch (e) { lyDo = `ffmpeg lỗi: ${String(e.message).slice(0, 80)}`; }

  if (lyDo) {
    // Bản mới không đạt → bỏ bản mới, GIỮ NGUYÊN bản gốc.
    try { if (existsSync(ra)) unlinkSync(ra); } catch { /* kệ */ }
    appendFileSync(bb, `truot\t${v.ma}\t${v.co}\t0\t${v.f}\t${lyDo}\n`, 'utf8');
    truot++;
  } else {
    const co2 = statSync(ra).size;
    unlinkSync(v.f);                       // bỏ gốc TRƯỚC, để tên đích trống ra
    const dich = tenDich(v.f, duoi);
    renameSync(ra, dich);
    appendFileSync(bb, `xong\t${v.ma}\t${v.co}\t${co2}\t${v.f}\t${dich}\n`, 'utf8');
    ok++; truocB += v.co; sauB += co2;
  }
  if ((i + 1) % 50 === 0 || i === viec.length - 1) {
    process.stdout.write(`\r  ${i + 1}/${viec.length} · xong ${ok} · trượt ${truot}   `);
  }
}
console.log(`\n\n✅ Chuyển được ${ok}/${viec.length} file`);
console.log(`   ${mb(truocB)} → ${mb(sauB)} (${sauB < truocB ? 'nhẹ đi ' : 'nặng thêm '}${mb(Math.abs(truocB - sauB))})`);
if (truot) console.log(`   ⚠️ ${truot} file không chuyển được — BẢN GỐC VẪN CÒN NGUYÊN, xem biên bản.`);
console.log('\n⚠️ Nhớ quét lại sổ mục lục:');
console.log('   cd /home/coder/workspace/projects/Library-Source && node tools/scan.mjs');
