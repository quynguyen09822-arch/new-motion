#!/usr/bin/env node
/**
 * KIỂM BỘ PHỐI MÀU — và chuyện "clip bạc màu mà không phép kiểm nào kêu".
 *
 * VÌ SAO. Anh Quý gửi ảnh một cảnh (29/09): nền xám, thẻ xám hồng, chữ cam trên
 * thẻ ấy — tương phản 1,2:1, tức gần như không đọc được. Không món nào sai,
 * không lỗi nào được báo. Đào ra hai chuyện:
 *
 *   ① Bảng thuộc tính có sáu ô màu rời và đúng MỘT bộ pha sẵn, nên muốn clip
 *      nhìn tử tế thì người dựng phải tự làm việc của người thiết kế.
 *   ② `soat.js` suy nền của một món TỪ HÌNH HỌC TRONG JSON, mà con nằm trong
 *      cụm `place` thì JSON không nói được nó rơi lên khối nào — đúng kiểu cảnh
 *      AI dựng. Nên chữ trên thẻ lọt lưới hoàn toàn.
 *
 * Bài này canh cả hai, cộng điều không được sai: BỘ PHỐI TỰ NÓ PHẢI ĐẠT CHUẨN.
 * Một bộ lọt lưới là mọi clip dùng nó đều bạc, và không ai truy ra gốc.
 *
 *   node tools/kiem-phoi-mau.mjs
 */
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const { BO_PHOI, boTheoId, chuDocDuoc, loiNhacPhoi, nguongCho, soatBoPhoi } =
  await import(path.join(M, 'web', 'phoimau.js'));
const { tuongPhan } = await import(path.join(M, 'web', 'soat.js'));

console.log('\n① Mỗi bộ phối tự nó phải đọc được');
for (const b of BO_PHOI) {
  const v = soatBoPhoi(b.mau);
  dat(`bộ "${b.ten}"`, v.length === 0, v.join(' | ') || `nền ${b.mau.bg}`);
}
dat('có ít nhất 3 bộ để chọn', BO_PHOI.length >= 3, `${BO_PHOI.length} bộ`);
dat('mỗi bộ khai đủ màu thẻ và đường kẻ',
  BO_PHOI.every((b) => b.mau.paper && b.mau.line),
  BO_PHOI.filter((b) => !b.mau.paper).map((b) => b.ten).join(', ') || 'đủ cả');
dat('mỗi bộ có câu mô tả cho người dùng đọc',
  BO_PHOI.every((b) => b.moTa && b.moTa.length > 10 && !/[A-Z]{3,}|#[0-9a-f]{6}/.test(b.moTa)));

console.log('\n② Ngưỡng theo cỡ chữ, đúng WCAG 2.1');
dat('chữ nhỏ cần 4,5:1', nguongCho(16) === 4.5);
dat('chữ to từ 24px chỉ cần 3:1', nguongCho(24) === 3 && nguongCho(48) === 3);
dat('chữ đậm từ 18,7px cũng tính là chữ to', nguongCho(19, true) === 3);
dat('chữ đậm nhưng nhỏ thì vẫn 4,5:1', nguongCho(14, true) === 4.5);

console.log('\n③ Chọn màu chữ đọc được trên một nền bất kỳ');
{
  const mau = boTheoId('den-cam').mau;
  /* Đúng thẻ xám hồng trong ảnh anh Quý gửi. */
  const tren = chuDocDuoc('#b9a2a2', mau, { coChu: 34 });
  dat('trên thẻ xám hồng → chọn được màu đạt chuẩn',
    tuongPhan(tren, '#b9a2a2') >= 3, `${tren} = ${tuongPhan(tren, '#b9a2a2').toFixed(1)}:1`);
  dat('trên nền đen → giữ đúng màu chữ của bộ (không chen màu lạ)',
    chuDocDuoc('#000000', mau, { coChu: 34 }) === mau.ink);
  /* Chữ NHỎ đòi ngưỡng cao hơn, nên có khi phải bỏ màu nhấn mà lấy màu khác. */
  const nho = chuDocDuoc('#141414', mau, { coChu: 14 });
  dat('chữ nhỏ trên thẻ tối vẫn đạt 4,5:1', tuongPhan(nho, '#141414') >= 4.5,
    `${nho} = ${tuongPhan(nho, '#141414').toFixed(1)}:1`);
}

console.log('\n④ Lời nhắc AI nói rõ CẶP màu, không chỉ liệt kê');
{
  const n = loiNhacPhoi(boTheoId('den-cam').mau);
  dat('có nhắc nền thẻ', /nền thẻ/.test(n));
  dat('nói rõ cặp chữ-trên-thẻ', /chữ trên thẻ: #\w+ trên #\w+/.test(n));
  dat('dặn đặt fill thì phải đặt ink', /fill.*ink|ink.*fill/s.test(n));
  dat('cảnh báo ghép chéo cặp là chữ chìm', /chìm/.test(n));
}

console.log('\n⑤ Vá tương phản giữ được tông của bộ màu');
{
  const { vaTuongPhan } = await import(path.join(M, 'server', 'dungcanh.js'));
  const meta = { ...boTheoId('den-cam').mau, width: 720, height: 1280 };
  const canh = { id: 'c', duration: 5, elements: [
    { kind: 'panel', id: 'the', x: 0, y: 0, w: 600, h: 200, fill: '#141414' },
    { kind: 'text', id: 'chu', x: 20, y: 20, w: 400, h: 60, size: 34, ink: '#1a1a1a', text: 'Chữ chìm' },
  ] };
  const so = vaTuongPhan(canh, meta);
  const sau = canh.elements[1].ink;
  dat('phát hiện và vá chữ chìm', so === 1, `vá ${so} chỗ`);
  dat('vá xong thì đọc được', tuongPhan(sau, '#141414') >= 3, `${sau} = ${tuongPhan(sau, '#141414').toFixed(1)}:1`);
  dat('và màu vá nằm TRONG bộ màu, không phải màu lạ',
    [meta.ink, meta.accent, meta.accent2, meta.hot, meta.hot2].includes(sau), sau);
}

console.log('\n⑥ Vẽ thật rồi đo — bắt được ca mà JSON không bắt được');
{
  const { danhGia } = await import(path.join(M, 'server', 'docanh.js'));
  /* Đúng cảnh trong ảnh: chữ cam trên thẻ xám hồng. Toạ độ ở đây là tỉ lệ của
     khung, lấy từ bản vẽ THẬT chứ không phải từ JSON. */
  const bao = danhGia([
    { id: 'chu', chu: 'Bình luận nổi bật', x: 0.1, y: 0.1, w: 0.5, h: 0.08,
      mauChu: 'rgb(201, 138, 106)', nen: 'rgb(185, 162, 162)', coChu: 34, dam: true },
  ]).join(' ');
  dat('bắt được chữ không đọc được', /KHÔNG ĐỌC ĐƯỢC/.test(bao), bao.slice(0, 80));
  dat('nói rõ tỉ lệ đo được và ngưỡng cần', /1\.2:1.*cần 3:1/.test(bao));

  const sach = danhGia([
    { id: 'a', chu: 'Đọc tốt', x: 0.1, y: 0.1, w: 0.4, h: 0.08,
      mauChu: 'rgb(255,255,255)', nen: 'rgb(0,0,0)', coChu: 34, dam: true },
    { id: 'b', chu: 'Cũng tốt', x: 0.1, y: 0.5, w: 0.4, h: 0.08,
      mauChu: 'rgb(255,122,47)', nen: 'rgb(0,0,0)', coChu: 40, dam: true },
  ]);
  dat('cảnh đọc được thì KHÔNG báo gì', sach.length === 0, sach.join(' '));
  /* Không có màu thì im, đừng đoán — đúng luật "chỉ báo khi CHẮC" của soat.js. */
  dat('thiếu thông tin màu thì im, không đoán bừa',
    danhGia([{ id: 'x', chu: 'a', x: 0.1, y: 0.1, w: 0.2, h: 0.05 }]).length === 0);
}

console.log('\n⑦ Dự án mới ra đời đã đúng bộ màu');
{
  /* Đọc bộ THẬT mà dự án mới sẽ nhận, không gõ lại trong bài kiểm — gõ lại thì
     bài kiểm chỉ chứng minh chính nó đúng. */
  const { MAU_MAC_DINH } = await import(path.join(M, 'web', 'phoimau.js'));
  const src = (await import('node:fs')).readFileSync(path.join(M, 'server', 'duan.js'), 'utf8');
  dat('`duan.js` lấy thẳng bộ mặc định, không gõ lại sáu màu',
    /MAU_MAC_DINH/.test(src) && !/bg: '#[0-9a-f]{6}'/i.test(src));
  dat('nền mặc định là đen thuần', MAU_MAC_DINH.bg === '#000000', MAU_MAC_DINH.bg);
  dat('khai cả màu thẻ (không để bộ dựng tự suy ra xám)',
    Boolean(MAU_MAC_DINH.paper && MAU_MAC_DINH.line), `${MAU_MAC_DINH.paper} / ${MAU_MAC_DINH.line}`);
  dat('bộ mặc định đạt chuẩn đọc được',
    soatBoPhoi(MAU_MAC_DINH).length === 0, soatBoPhoi(MAU_MAC_DINH).join(' | '));
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Phối màu đạt hết.\n');
process.exit(hong ? 1 : 0);
