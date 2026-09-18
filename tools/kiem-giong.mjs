#!/usr/bin/env node
/**
 * KIỂM GIỌNG ĐỌC AI.
 *
 * ⚠️ PHÉP KIỂM NÀY KHÔNG ĐỌC LỜI THẬT, và đó là cố ý.
 *   ElevenLabs tính tiền theo KÝ TỰ. Một bài kiểm chạy vài chục lần mỗi ngày mà
 *   lần nào cũng đọc một câu là âm thầm ăn hết hạn mức tháng, rồi tới lúc cần
 *   dùng thật thì hết. Nên ở đây chỉ kiểm phần MIỄN PHÍ: danh sách giọng, nghe
 *   thử (nhà cung cấp cho sẵn đoạn mẫu), và các cửa chặn.
 *
 *   Muốn kiểm cả đường đọc thật thì chạy:  DOC_THAT=1 node tools/kiem-giong.mjs
 *   Nó đọc đúng 8 ký tự, và nói rõ là vừa tiêu tiền.
 *
 * Điều quan trọng nhất phải canh: KHOÁ KHÔNG ĐƯỢC LỌT RA TRÌNH DUYỆT. Mục 4 lục
 * cả trang và mọi lời đáp xem có chuỗi nào bắt đầu bằng `sk_` không.
 *
 *   node tools/kiem-giong.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const GOC = process.argv[2] || 'http://127.0.0.1:7803';
const DOC_THAT = process.env.DOC_THAT === '1';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

try {
  /* ---------- 1. danh sách giọng ---------- */
  console.log('\n1. Danh sách giọng');
  const d = await (await fetch(`${GOC}/api/giong`)).json();
  dat('hỏi được danh sách', d.ok === true, d.ok ? `${d.giong.length} giọng` : d.cau);
  if (!d.ok) throw new Error('không có danh sách giọng thì không kiểm tiếp được');

  const viet = d.giong.filter((g) => g.viet);
  dat('có giọng đọc tiếng Việt thật', viet.length > 0, `${viet.length} giọng · ${viet.slice(0, 3).map((g) => g.ten).join(', ')}`);
  /* Giọng Việt phải nằm ĐẦU danh sách. Kho có 28 giọng mà chỉ vài giọng đọc được
     tiếng Việt; bày lẫn thì người dùng chọn giọng Mỹ rồi thắc mắc vì sao nghe
     như người nước ngoài đọc. */
  dat('giọng Việt xếp lên trước', d.giong.slice(0, viet.length).every((g) => g.viet),
    d.giong.slice(0, 3).map((g) => `${g.ten}${g.viet ? '(vi)' : ''}`).join(' · '));
  dat('tên giọng đã cắt gọn, không lẫn câu mô tả',
    d.giong.every((g) => g.ten.length <= 28 && !/[|–]/.test(g.ten)),
    d.giong.map((g) => g.ten).sort((a, b) => b.length - a.length)[0]);
  dat('mỗi giọng có mã dùng được', d.giong.every((g) => /^[A-Za-z0-9_-]{8,64}$/.test(g.id)));

  /* ---------- 2. nghe thử (miễn phí) ---------- */
  console.log('\n2. Nghe thử — miễn phí, không tốn ký tự');
  const id = (viet[0] || d.giong[0]).id;
  const t0 = Date.now();
  const r1 = await fetch(`${GOC}/api/nghe-thu?id=${encodeURIComponent(id)}`);
  const b1 = Buffer.from(await r1.arrayBuffer());
  const lan1 = Date.now() - t0;
  dat('tải được đoạn mẫu', r1.ok && b1.length > 4096, `${r1.status} · ${(b1.length / 1024).toFixed(0)} KB`);
  dat('đúng là file tiếng', String(r1.headers.get('content-type') || '').includes('audio'),
    r1.headers.get('content-type'));

  const t1 = Date.now();
  const r2 = await fetch(`${GOC}/api/nghe-thu?id=${encodeURIComponent(id)}`);
  await r2.arrayBuffer();
  const lan2 = Date.now() - t1;
  // Nhớ lại là bắt buộc: người dùng bấm nghe đi nghe lại để so giọng.
  dat('lần hai lấy từ đĩa, nhanh hơn hẳn', lan2 < Math.max(80, lan1 / 2),
    `lần đầu ${lan1}ms · lần sau ${lan2}ms`);

  /* ---------- 3. cửa chặn ---------- */
  console.log('\n3. Chặn những lời gọi bậy');
  const xau = await (await fetch(`${GOC}/api/nghe-thu?id=${encodeURIComponent('../../etc/passwd')}`)).json();
  dat('mã giọng có dấu chấm chấm thì bị chặn', xau.ok === false, xau.loi);
  const trong = await (await fetch(`${GOC}/api/doc-loi`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loi: '', giongId: id }) })).json();
  dat('không có lời thì không gọi nhà cung cấp', trong.ok === false, trong.loi);
  const dai = await (await fetch(`${GOC}/api/doc-loi`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loi: 'a'.repeat((d.gioiHan || 5000) + 1), giongId: id }) })).json();
  /* Chặn ở MÁY CHỦ chứ không chỉ ở giao diện: giao diện chặn được thì tốt, nhưng
     ai gọi thẳng đường dẫn vẫn đốt được hạn mức. */
  dat('lời dài quá mức thì chặn trước khi tiêu tiền', dai.ok === false, dai.loi?.slice(0, 70));
  const khongGiong = await (await fetch(`${GOC}/api/doc-loi`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loi: 'xin chao' }) })).json();
  dat('chưa chọn giọng thì chặn', khongGiong.ok === false, khongGiong.loi);

  /* ---------- 4. KHOÁ KHÔNG ĐƯỢC LỌT RA TRÌNH DUYỆT ---------- */
  console.log('\n4. Khoá không lọt ra trình duyệt');
  const chuoi = JSON.stringify(d);
  dat('lời đáp danh sách giọng không chứa khoá',
    !/sk_[A-Za-z0-9]{8,}/.test(chuoi) && !/AIza[A-Za-z0-9_-]{10,}/.test(chuoi));

  const trinh = await chromium.launch();
  const trang = await trinh.newPage({ viewport: { width: 1500, height: 980 } });
  const loiJS = [];
  trang.on('pageerror', (e) => loiJS.push(String(e)));
  const thay = [];
  // Soi MỌI lời đáp mạng mà trang nhận được, không chỉ soi HTML.
  trang.on('response', async (res) => {
    try {
      const ct = String(res.headers()['content-type'] || '');
      if (!/json|text|javascript/.test(ct)) return;
      const t = await res.text();
      if (/sk_[A-Za-z0-9]{16,}/.test(t)) thay.push(`sk_ trong ${res.url().slice(0, 60)}`);
    } catch { /* thân đã bị tiêu thụ thì bỏ qua */ }
  });
  await trang.goto(GOC, { waitUntil: 'networkidle' });
  await trang.waitForTimeout(2000);
  await trang.selectOption('#chon-clip', 'wireframe-thu');
  await trang.waitForTimeout(1800);
  /* Khung giọng đọc giờ nằm TRONG bảng AI dưới thanh phát, không còn thẻ riêng
     bên cột phải: mở nút AI rồi sang thẻ con "Giọng đọc". */
  await trang.click('.nut-ai');
  await trang.waitForTimeout(500);
  await trang.click('.ai-the >> nth=1');
  await trang.waitForTimeout(3000);
  const trongTrang = await trang.evaluate(() => document.documentElement.innerHTML);
  dat('không có khoá nào trong trang', !/sk_[A-Za-z0-9]{16,}/.test(trongTrang));
  dat('không có khoá trong bất kỳ lời đáp nào', thay.length === 0, thay.slice(0, 2).join(' | ') || 'sạch');

  /* ---------- 5. khung AI trong giao diện ---------- */
  console.log('\n5. Khung giọng đọc — nằm trong bảng AI dưới thanh phát');
  const b = await trang.evaluate(() => {
    const x = document.querySelector('.thanh-ai');
    return { hien: !x.classList.contains('an'),
      giong: x.querySelectorAll('.ai-hang').length,
      nghe: x.querySelectorAll('.ai-nghe').length,
      ngan: Boolean(x.querySelector('.ai-ngan')),
      nut: x.querySelector('.nut-doc')?.textContent,
      khoa: x.querySelector('.nut-doc')?.disabled };
  });
  dat('bảng mở được và bày đủ giọng', b.hien && b.giong === d.giong.length, `${b.giong} hàng`);
  /* Không còn thẻ "AI" ở cột phải — gộp xuống thanh dưới rồi. Hai cửa cho cùng
     một thứ thì người dùng bao giờ cũng mở nhầm cái kia. */
  dat('cột phải KHÔNG còn thẻ AI riêng',
    await trang.evaluate(() => !document.querySelector('#the-ai') && !document.querySelector('#bang-ai')));
  dat('giọng nào cũng có nút nghe thử', b.nghe === b.giong, `${b.nghe}/${b.giong}`);
  dat('có vạch ngăn giọng Việt với giọng nước ngoài', b.ngan);
  dat('chưa chọn giọng thì nút đọc bị khoá', b.khoa === true, b.nut);

  await trang.click('.thanh-ai .hang-nut button >> nth=0');    // lấy lời từ clip
  await trang.waitForTimeout(700);
  const sauLay = await trang.evaluate(() => ({
    loi: document.querySelector('.o-loi').value.length,
    dem: document.querySelector('.thanh-ai .dem-chu').textContent }));
  dat('lấy được lời từ chữ trong clip', sauLay.loi > 20, `${sauLay.loi} ký tự · "${sauLay.dem}"`);
  dat('đếm ký tự khớp với lời đang có', sauLay.dem.startsWith(String(sauLay.loi)), sauLay.dem);

  await trang.click('.thanh-ai .ai-ten >> nth=0');
  await trang.waitForTimeout(400);
  const sauChon = await trang.evaluate(() => ({
    nut: document.querySelector('.thanh-ai .nut-doc').textContent,
    khoa: document.querySelector('.thanh-ai .nut-doc').disabled,
    chon: document.querySelectorAll('.thanh-ai .ai-hang.chon').length }));
  dat('chọn giọng xong thì nút mở và nói rõ giọng nào',
    sauChon.khoa === false && sauChon.chon === 1 && /giọng/.test(sauChon.nut), sauChon.nut);
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await trinh.close();

  /* ---------- 5b. AI viết lời ---------- */
  console.log('\n5b. AI viết lời từ brief');
  const sai = await (await fetch(`${GOC}/api/viet-loi`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'khong-he-co' }) })).json();
  dat('clip không có thì báo rõ, không gọi AI', sai.ok === false, sai.loi);

  const t2v = Date.now();
  const v = await (await fetch(`${GOC}/api/viet-loi`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'wireframe-thu', brief: 'Giới thiệu dịch vụ hosting, giọng thân thiện.' }) })).json();
  const giay = ((Date.now() - t2v) / 1000).toFixed(1);

  if (!v.ok && /đều không dùng được lúc này/.test(v.loi || '')) {
    /* Nhà cung cấp sập KHÔNG PHẢI lỗi của mình. Tính là hỏng thì bài kiểm đỏ vu
       vơ, mà một bài kiểm đỏ vu vơ thì người ta bắt đầu bỏ qua mọi màu đỏ. */
    console.log(`  — bỏ qua: cả chuỗi model của Google đang bận (${giay}s). ${(v.loi || '').slice(0, 90)}`);
  } else {
    dat('AI viết được lời', v.ok === true, v.ok ? `${giay}s · ${v.model}` : v.loi?.slice(0, 90));
    if (v.ok) {
      dat('viết đúng một dòng cho mỗi cảnh', v.soDong === v.soCanh, `${v.soDong} dòng / ${v.soCanh} cảnh`);
      dat('có ước thời gian đọc để đối chiếu với clip',
        typeof v.giayDoc === 'number' && v.giayDoc > 0 && v.giayClip > 0,
        `đọc ~${v.giayDoc}s trên clip ${v.giayClip}s`);
      /* Lời viết ra phải XẤP XỈ thời lượng clip. Lệch quá 60% nghĩa là lời nhắc
         không truyền được ràng buộc thời lượng — lúc đó tính năng vô dụng vì
         lời nào cũng phải cắt lại bằng tay. */
      dat('lời viết ra xấp xỉ vừa thời lượng clip',
        v.giayDoc > v.giayClip * 0.4 && v.giayDoc < v.giayClip * 1.6,
        `${v.giayDoc}s so với ${v.giayClip}s`);
      dat('không lẫn số thứ tự hay lời dẫn của AI',
        !/^\s*(\d+[.)]|cảnh\s*\d|đây là)/im.test(v.loi), v.loi.split('\n')[0].slice(0, 46));
      /* Ngưỡng rộng, và cố ý: đây là cái chặn TREO, không phải phép đo tốc độ.
         Mỗi lần tụt model tốn thêm tới 12 giây chờ, mà việc model nào bận là
         chuyện của nhà cung cấp. Đặt ngưỡng sát quá thì bài kiểm đỏ vì Google
         bận chứ không phải vì mình hỏng. */
      dat('không bị treo (dưới 50 giây)', Number(giay) < 50, `${giay}s`);
    }
  }

  /* ---------- 6. đọc thật — chỉ khi được bảo ---------- */
  console.log('\n6. Đọc lời thật');
  if (!DOC_THAT) {
    console.log('  — bỏ qua (đọc lời tốn tiền theo ký tự). Chạy DOC_THAT=1 để kiểm cả đường này.');
  } else {
    const k = await (await fetch(`${GOC}/api/doc-loi`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loi: 'Xin chào', giongId: id, ten: 'kiem-giong-tam' }) })).json();
    dat('đọc ra file tiếng', k.ok === true && /\.mp3$/.test(k.src || ''), k.ok ? `${k.src} · ${k.byte} byte` : k.loi);
    console.log(`  (vừa tiêu ${k.kyTu || 0} ký tự hạn mức)`);
  }
} catch (e) {
  console.log(`  ✗ vỡ giữa chừng — ${e.message}`);
  hong++;
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Giọng đọc AI đạt hết.\n');
process.exit(hong ? 1 : 0);
