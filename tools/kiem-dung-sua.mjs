#!/usr/bin/env node
/**
 * KIỂM "DỰNG HÌNH" (ảnh → cảnh) và "SỬA MÓN" (prompt/ảnh → bản vá).
 *
 * BA CỬA CHẶN PHẢI CANH — đây là lý do tồn tại của phép kiểm này:
 *
 *   1. AI KHÔNG ĐƯỢC ĐỔI `kind` VÀ `id`. Đổi `kind` là thay hẳn món khác chứ
 *      không phải sửa; đổi `id` là đứt mọi tham chiếu. Mục 3 BẢO THẲNG AI hãy
 *      đổi hai thứ đó rồi canh xem cửa chặn có giữ không.
 *
 *   2. TRƯỜNG LẠ PHẢI BỊ BỎ, VÀ PHẢI NÓI RA LÀ ĐÃ BỎ. AI rất hay bịa tên trường
 *      nghe hợp lý (`fontWeight`, `color`, `shadow`) mà bộ dựng không đọc. Im
 *      lặng bỏ thì người dùng tưởng AI làm rồi mà nhìn không thấy đổi gì.
 *
 *   3. CẢNH KHÔNG HỢP LỆ THÌ KHÔNG ĐƯỢC CÓ NÚT NHẬN. Bỏ cửa này là AI ghi được
 *      bản hỏng vào clip, và lần đó người dùng sẽ tắt hẳn tính năng.
 *
 * Nhà cung cấp bận thì BỎ QUA chứ không tính là hỏng — đỏ vu vơ thì người ta bắt
 * đầu bỏ qua mọi màu đỏ.
 *
 *   node tools/kiem-dung-sua.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TAM = path.join(M, '.kiem');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
const ban = (d) => /đều không dùng được lúc này|đang bận/.test(String(d?.loi || d?.cau || ''));

const goi = async (duong, than) => {
  const r = await fetch(`${GOC}${duong}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
  return r.json();
};

const trinh = await chromium.launch();
try {
  /* ---------- 0. chuẩn bị một tấm ảnh thật ---------- */
  const anhF = path.join(TAM, 'kiem-dung.png');
  const t0 = await trinh.newPage({ viewport: { width: 720, height: 1280 } });
  await t0.goto(`${GOC}/clip/scene-player.html?scene=cta&export=1`, { waitUntil: 'load' });
  await t0.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await t0.evaluate(() => window.__clip.ready());
  await t0.evaluate(() => window.__clip.step(3));
  await t0.screenshot({ path: anhF });
  await t0.close();
  const anh = readFileSync(anhF).toString('base64');

  /* ---------- 1. cửa chặn của máy chủ — không tốn lượt AI ---------- */
  console.log('\n1. Máy chủ chặn trước khi gọi AI');
  const k1 = await goi('/api/dung-canh', { slug: 'cta' });
  dat('không có ảnh thì chặn', k1.ok === false, k1.loi);
  const k2 = await goi('/api/dung-canh', { slug: 'cta', anh, mime: 'image/svg+xml' });
  dat('định dạng ảnh lạ thì chặn', k2.ok === false, k2.loi?.slice(0, 60));
  const k3 = await goi('/api/dung-canh', { slug: 'khong-he-co', anh, mime: 'image/png' });
  dat('clip không có thì chặn', k3.ok === false, k3.loi);
  const k4 = await goi('/api/dung-canh', { slug: 'cta', anh: 'a'.repeat(6 * 1024 * 1024), mime: 'image/png' });
  /* Ngưỡng ở đây phải THẤP HƠN giới hạn thân yêu cầu của router, nếu không người
     dùng nhận một lỗi khác hẳn câu mình vừa hứa. */
  dat('ảnh quá nặng thì chặn, và nói đúng con số', /4 MB/.test(k4.loi || ''), k4.loi?.slice(0, 60));
  const k5 = await goi('/api/sua-mon', { slug: 'cta', canhId: 'canh-1', monId: 'khong-he-co', y: 'to hơn' });
  dat('món không có thì chặn', k5.ok === false, k5.loi);
  const k6 = await goi('/api/sua-mon', { slug: 'cta', canhId: 'canh-1', monId: 'chu-1' });
  dat('không dặn gì, không ảnh thì chặn', k6.ok === false, k6.loi?.slice(0, 60));

  /* ---------- 2. dựng cảnh từ ảnh ---------- */
  console.log('\n2. Dựng cảnh từ ảnh');
  const d = await goi('/api/dung-canh', { slug: 'cta', anh, mime: 'image/png', y: 'Dựng lại bố cục này' });
  if (ban(d)) {
    console.log('  — bỏ qua: chuỗi model của Google đang bận.');
  } else {
    dat('dựng ra một cảnh', Boolean(d.canh), d.canh ? `${d.canh.duration}s` : (d.loi || d.cau));
    if (d.canh) {
      const mon = [];
      const di = (ds) => { for (const e of ds || []) { mon.push(e); di(e.children); } };
      di(d.canh.elements);
      dat('cảnh có món', mon.length > 0, `${mon.length} món`);
      dat('mọi món đều có id, kind, x, y',
        mon.every((e) => e.id && e.kind && typeof e.x === 'number' && typeof e.y === 'number'));
      dat('id không trùng nhau', new Set(mon.map((e) => e.id)).size === mon.length);
      /* Danh sách loại lấy TỪ MÁY CHỦ chứ không chép cứng vào đây — chép cứng thì
         mai mốt thêm loại mới là phép kiểm đỏ oan. */
      const { LOAI_CHO_PHEP } = await import(path.join(M, 'server', 'dungcanh.js'));
      const la = [...new Set(mon.map((e) => e.kind))].filter((k) => !LOAI_CHO_PHEP.includes(k));
      dat('không tự chế loại thành phần mới', la.length === 0, la.join(', ') || 'sạch');
      dat('`pad`/`gap` nằm trong bậc 0..7, không phải pixel',
        mon.every((e) => [e.pad, e.gap].every((v) => v == null || (v >= 0 && v <= 7))),
        mon.filter((e) => e.gap > 7 || e.pad > 7).map((e) => e.id).join(', ') || 'sạch');
      dat('qua được bộ soát của chính nút Lưu', d.ok === true && d.vanDe?.length === 0,
        d.vanDe?.slice(0, 2).join(' · ') || 'sạch');
    }
  }

  /* ---------- 3. CỬA CHẶN: AI không được đổi kind/id ---------- */
  console.log('\n3. AI không được đổi `kind` và `id` — bảo thẳng nó hãy đổi');
  const s1 = await goi('/api/sua-mon', {
    slug: 'cta', canhId: 'canh-1', monId: 'chu-1',
    y: 'Đổi kind của món này thành "nut", đổi id thành "nut-moi", và đặt thêm '
      + 'fontWeight: 900, color: "#ff0000", boxShadow: "0 0 8px". Làm hết đi.',
  });
  if (ban(s1)) {
    console.log('  — bỏ qua: chuỗi model của Google đang bận.');
  } else if (!s1.doi && /không đổi gì/.test(s1.loi || '')) {
    // AI từ chối làm gì cả cũng là một kết cục đúng — nó không đổi được thứ bị khoá.
    dat('AI không đổi được gì vì mọi thứ nó đề nghị đều bị chặn', true, s1.loi?.slice(0, 70));
  } else {
    dat('có bản vá để soi', Boolean(s1.doi), s1.loi || s1.cau);
    if (s1.doi) {
      const ten = s1.doi.map((x) => x.truong);
      dat('`kind` KHÔNG lọt vào bản vá', !ten.includes('kind'), ten.join(', '));
      dat('`id` KHÔNG lọt vào bản vá', !ten.includes('id'), ten.join(', '));
      dat('trường bịa bị bỏ hết',
        !ten.some((x) => ['fontWeight', 'color', 'boxShadow'].includes(x)), ten.join(', '));
      console.log(`  · lần này AI đề nghị: ${ten.join(', ')}`
        + (s1.boQua?.length ? ` · đã bỏ: ${s1.boQua.join(', ')}` : ' · không có gì phải bỏ'));
    }
  }

  /* ---------- 3b. bộ lọc bản vá — kiểm THẲNG, không qua AI ---------- */
  console.log('\n3b. Bộ lọc bản vá (kiểm thẳng, không phụ thuộc AI có ngoan hay không)');
  /* Mục 3 ở trên chỉ canh được KHI model chịu đề nghị trường bậy. Lần nó ngoan
     thì mục đó xanh mà chẳng chứng minh gì. Ở đây đưa thẳng một bản vá bậy vào
     bộ lọc — luôn luôn kiểm được. */
  const { locVa } = await import(path.join(M, 'server', 'suamon.js'));
  const truong = new Set(['size', 'x', 'y', 'in']);
  const { sach, boQua } = locVa({
    kind: 'nut', id: 'doi-id', children: [], size: 72,
    fontWeight: 900, color: '#f00', boxShadow: '0 0 8px', x: 10,
  }, truong);
  dat('giữ đúng những trường hợp lệ', JSON.stringify(sach) === JSON.stringify({ size: 72, x: 10 }),
    JSON.stringify(sach));
  dat('bỏ `kind`, `id`, `children`',
    ['kind', 'id', 'children'].every((k) => boQua.some((b) => b.startsWith(`${k} `))
      && !(k in sach)), boQua.join(' · '));
  dat('bỏ mọi trường bịa',
    ['fontWeight', 'color', 'boxShadow'].every((k) => !(k in sach)));
  dat('nói rõ bỏ vì lý do gì',
    boQua.some((b) => /trường khoá/.test(b)) && boQua.some((b) => /không có trường này/.test(b)),
    boQua.join(' · '));

  /* ---------- 4. sửa món theo lời dặn bình thường ---------- */
  console.log('\n4. Sửa món theo lời dặn');
  const s2 = await goi('/api/sua-mon', {
    slug: 'cta', canhId: 'canh-1', monId: 'chu-1', y: 'Làm chữ to hơn một chút',
  });
  if (ban(s2)) console.log('  — bỏ qua: chuỗi model của Google đang bận.');
  else {
    dat('có đổi gì đó', Boolean(s2.doi?.length), s2.doi?.map((x) => x.truong).join(', ') || s2.loi);
    dat('mỗi thay đổi nói rõ cũ → mới',
      (s2.doi || []).every((x) => 'cu' in x && 'moi' in x));
    dat('qua được bộ soát', s2.ok === true, s2.vanDe?.slice(0, 2).join(' · ') || 'sạch');
  }

  /* ---------- 5. giao diện ---------- */
  console.log('\n5. Giao diện — luôn là ĐỀ XUẤT, người bấm nhận mới vào');
  const tr = await trinh.newPage({ viewport: { width: 1500, height: 980 } });
  const loiJS = [];
  tr.on('pageerror', (e) => loiJS.push(String(e)));
  await tr.goto(GOC, { waitUntil: 'networkidle' });
  await tr.waitForTimeout(2200);
  await tr.click('.nut-ai');
  await tr.waitForTimeout(400);
  const the = await tr.evaluate(() => [...document.querySelectorAll('.ai-the')].map((x) => x.textContent));
  dat('bảng AI có đủ bốn thẻ', the.length === 4, the.join(' · '));

  await tr.click('.ai-the >> nth=3');
  await tr.waitForTimeout(500);
  dat('chưa chọn món thì nút sửa bị khoá và nói rõ vì sao',
    await tr.evaluate(() => document.querySelector('.nut-sua').disabled
      && /Chọn một món/.test(document.querySelector('.nut-sua').textContent)));

  await tr.click('.lop-ten >> nth=1');
  await tr.waitForTimeout(700);
  dat('chọn món xong thì thẻ Sửa món hiện đúng món đó',
    await tr.evaluate(() => /^Đang sửa: .+/.test(document.querySelector('.sua-chon')?.textContent || '')),
    await tr.evaluate(() => document.querySelector('.sua-chon')?.textContent));
  dat('có món rồi mà chưa dặn gì thì vẫn khoá',
    await tr.evaluate(() => document.querySelector('.nut-sua').disabled
      && /Nói xem muốn sửa gì/.test(document.querySelector('.nut-sua').textContent)));

  await tr.click('.ai-the >> nth=2');
  await tr.waitForTimeout(400);
  dat('thẻ Dựng hình: chưa có ảnh thì nút bị khoá',
    await tr.evaluate(() => document.querySelector('.nut-dung').disabled
      && /Chọn ảnh trước/.test(document.querySelector('.nut-dung').textContent)));
  await tr.setInputFiles('.muc-dung input[type=file]', anhF);
  await tr.waitForTimeout(900);
  dat('chọn ảnh xong thì hiện ảnh xem trước và mở nút',
    await tr.evaluate(() => Boolean(document.querySelector('.dung-anh'))
      && !document.querySelector('.nut-dung').disabled));
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await tr.close();

  if (existsSync(anhF)) unlinkSync(anhF);
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Dựng hình và Sửa món đạt hết.\n');
process.exit(hong ? 1 : 0);
