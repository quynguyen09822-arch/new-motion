#!/usr/bin/env node
/**
 * KIỂM NÚT AI Ở THANH DƯỚI và thanh hỏi bật lên từ đó.
 *
 * MỤC 4 LÀ MỤC ĐÁNG GIÁ NHẤT: canh câu trả lời KHÔNG bị cắt ngang.
 *   Model Gemini 3.x tiêu token để "nghĩ" trước khi trả lời, và phần nghĩ đó ăn
 *   chung hạn mức với phần trả lời. Đo được: hỏi một câu ngắn với hạn 700 token
 *   thì model tiêu 671 token để nghĩ, còn 25 token cho câu trả lời — và thứ lọt
 *   ra lại chính là dòng suy nghĩ nội bộ ("**Output Generation:** (Matches V…"),
 *   trông y như app hỏng mà không có lỗi nào.
 *
 *   Đây là kiểu hỏng KHÔNG có ngoại lệ nào bắn ra, không có mã lỗi nào, và chỉ
 *   lộ ra khi có người ngồi đọc câu trả lời. Nên phải có phép kiểm canh.
 *
 *   node tools/kiem-thanh-ai.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1500, height: 980 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(GOC, { waitUntil: 'networkidle' });
  await trang.waitForTimeout(2200);

  /* ---------- 1. nút nằm đúng chỗ ---------- */
  console.log('\n1. Nút AI nằm ở thanh dưới, không phải cột phải');
  const vt = await trang.evaluate(() => {
    const n = document.querySelector('.nut-ai');
    if (!n) return null;
    const rn = n.getBoundingClientRect();
    const rf = document.querySelector('.thanh-duoi').getBoundingClientRect();
    const rc = document.querySelector('.cot-phai')?.getBoundingClientRect();
    return {
      chu: n.textContent.trim(),
      trongThanhDuoi: rn.top >= rf.top - 2 && rn.bottom <= rf.bottom + 2,
      /* Kiểm bằng QUAN HỆ DOM, không bằng toạ độ. Nút nằm ở góc phải thanh
         dưới nên nó trùng cột ngang với cột phải — so toạ độ sẽ kết luận nhầm
         là nó nằm trong cột phải. */
      trongCotPhai: rc ? document.querySelector('.cot-phai').contains(n) : false,
      trongFooter: document.querySelector('.thanh-duoi').contains(n),
      moRong: n.getAttribute('aria-expanded'),
      nhan: n.getAttribute('aria-label'),
    };
  });
  dat('có nút AI', Boolean(vt), vt?.chu);
  dat('nút nằm trong thanh dưới', vt?.trongThanhDuoi === true && vt?.trongFooter === true);
  dat('nút KHÔNG nằm trong cột phải', vt?.trongCotPhai === false);
  dat('nút khai được cho trình đọc màn hình', Boolean(vt?.nhan) && vt?.moRong === 'false', vt?.nhan);

  /* ---------- 2. bật tắt ---------- */
  console.log('\n2. Bật tắt thanh hỏi');
  dat('lúc đầu thanh hỏi đang ẩn',
    await trang.evaluate(() => document.querySelector('.thanh-ai').classList.contains('an')));
  await trang.click('.nut-ai');
  await trang.waitForTimeout(500);
  const sauMo = await trang.evaluate(() => {
    const t = document.querySelector('.thanh-ai');
    const rt = t.getBoundingClientRect();
    const rf = document.querySelector('.thanh-duoi').getBoundingClientRect();
    return {
      hien: !t.classList.contains('an'),
      deLen: rt.bottom > rf.top,
      chip: [...t.querySelectorAll('.ai-chip')].map((x) => x.textContent),
      oDangGo: document.activeElement?.classList.contains('o-hoi'),
      moRong: document.querySelector('.nut-ai').getAttribute('aria-expanded'),
    };
  });
  dat('bấm nút thì thanh hiện ra', sauMo.hien);
  /* Không được đè lên thanh dưới: nút Chạy và thanh tua phải còn bấm được trong
     lúc thanh hỏi đang mở — người ta hay vừa tua vừa hỏi. */
  dat('không đè lên thanh dưới', sauMo.deLen === false);
  dat('con trỏ nhảy thẳng vào ô gõ', sauMo.oDangGo === true);
  dat('nút khai là đang mở', sauMo.moRong === 'true');
  dat('có gợi ý sẵn, không bỏ ô trống trơn', sauMo.chip.length >= 3,
    `${sauMo.chip.length} gợi ý: ${sauMo.chip.slice(0, 2).join(' · ')}`);

  await trang.keyboard.press('Escape');
  await trang.waitForTimeout(400);
  dat('Escape đóng thanh',
    await trang.evaluate(() => document.querySelector('.thanh-ai').classList.contains('an')));

  /* ---------- 3. hỏi thật ---------- */
  console.log('\n3. Hỏi thật về clip đang mở');
  await trang.click('.nut-ai');
  await trang.waitForTimeout(400);
  /* Câu hỏi phải ĐỦ KHÓ để model cần nghĩ nhiều. Hỏi "clip dài mấy giây" thì
     model trả lời trong một câu, không chạm trần token, và mục 4 bên dưới không
     kiểm được gì — phép phá thử chứng minh đúng điều đó: gỡ hẳn cửa chặn mà bài
     kiểm vẫn xanh. Câu hỏi cần phân tích mới lôi được lỗi ra. */
  await trang.fill('.o-hoi',
    'Clip này có vấn đề gì không, và nên sửa những gì trước khi xuất video?');
  await trang.click('.nut-gui');
  await trang.waitForTimeout(1000);
  dat('đang hỏi thì nút đổi nhãn, không để người dùng bấm lại',
    await trang.evaluate(() => document.querySelector('.nut-gui').disabled === true
      && /nghĩ/i.test(document.querySelector('.nut-gui').textContent)));

  await trang.waitForFunction(
    () => !document.querySelector('.nut-gui').disabled, null, { timeout: 60000 }).catch(() => {});
  const kq = await trang.evaluate(() => {
    const t = document.querySelector('.ai-tra');
    return { hien: !t.classList.contains('an'), hong: t.classList.contains('hong'), chu: t.textContent.trim() };
  });

  if (kq.hong && /đều không dùng được lúc này/.test(kq.chu)) {
    /* Nhà cung cấp sập không phải lỗi của mình — tính là hỏng thì bài kiểm đỏ
       vu vơ, mà đỏ vu vơ thì người ta bắt đầu bỏ qua mọi màu đỏ. */
    console.log(`  — bỏ qua: cả chuỗi model của Google đang bận. ${kq.chu.slice(0, 80)}`);
  } else {
    dat('có câu trả lời', kq.hien && !kq.hong && kq.chu.length > 10, kq.chu.slice(0, 70));

    /* ---------- 4. câu trả lời KHÔNG bị cắt ngang ---------- */
    console.log('\n4. Câu trả lời không bị cắt ngang vì chạm trần token');
    /* Dấu hiệu của dòng suy nghĩ nội bộ lọt ra: tiêu đề kiểu "**Output
       Generation:**", "Matches V", hoặc đánh số mục bằng tiếng Anh. */
    dat('không lẫn dòng suy nghĩ nội bộ của model',
      !/\*\*[A-Z][a-z]+ [A-Z][a-z]+:?\*\*|Output Generation|Matches V/.test(kq.chu),
      kq.chu.slice(0, 60));
    // Câu trả lời trọn vẹn thì kết bằng dấu chấm/chấm than/hỏi, hoặc hết một gạch đầu dòng.
    const cuoi = kq.chu.trim().slice(-1);
    dat('kết thúc trọn câu, không cụt giữa chừng', /[.!?)…"”']/.test(cuoi),
      `…${kq.chu.trim().slice(-42)}`);
    dat('bám vào số liệu thật của clip', /\d/.test(kq.chu), kq.chu.slice(0, 60));
    dat('không dùng markdown (thanh ngang không dựng được markdown)',
      !/^\s*#{1,4}\s|\*\*/m.test(kq.chu));
  }

  /* ---------- 5. gợi ý "viết lời đọc" đưa sang khung riêng ---------- */
  console.log('\n5. Gợi ý "viết lời đọc" đưa sang thẻ con Giọng đọc');
  await trang.evaluate(() => {
    const b = [...document.querySelectorAll('.ai-chip')].find((x) => /Viết lời đọc/.test(x.textContent));
    b?.click();
  });
  await trang.waitForTimeout(1200);
  const sauChuyen = await trang.evaluate(() => {
    const the = [...document.querySelectorAll('.ai-the')];
    return {
      conMo: !document.querySelector('.thanh-ai').classList.contains('an'),
      theGiongChon: the[1]?.getAttribute('aria-selected'),
      coBrief: Boolean(document.querySelector('.thanh-ai .o-brief')),
      coGiong: document.querySelectorAll('.thanh-ai .ai-hang').length,
      khongConTheCu: !document.querySelector('#the-ai') && !document.querySelector('#bang-ai'),
    };
  });
  // Bảng KHÔNG đóng — chỉ chuyển thẻ con. Đóng rồi mở lại là thừa một nhịp.
  dat('bảng vẫn mở, chỉ đổi thẻ con', sauChuyen.conMo && sauChuyen.theGiongChon === 'true');
  dat('thẻ Giọng đọc có đủ brief và danh sách giọng',
    sauChuyen.coBrief && sauChuyen.coGiong > 0, `${sauChuyen.coGiong} giọng`);
  dat('cột phải không còn thẻ AI riêng', sauChuyen.khongConTheCu);

  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Thanh AI đạt hết.\n');
process.exit(hong ? 1 : 0);
