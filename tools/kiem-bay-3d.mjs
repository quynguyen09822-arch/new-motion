#!/usr/bin/env node
/**
 * KIỂM "AI BÀY SẴN BỐI CẢNH TỪ ẢNH" (`server/bay3d.js`).
 *
 * VÌ SAO KIỂM ĐƯỢC MÀ KHÔNG CẦN MẠNG. Phần chạm mạng gói gọn trong đúng một
 * hàm; mọi thứ còn lại — soạn lời nhắc, bóc JSON, chuẩn hoá, soát — đều thuần.
 * Nên bài này nạp thẳng những thứ AI THẬT SỰ HAY TRẢ VỀ (kể cả thứ hỏng) rồi
 * đo bằng số. Gọi Gemini thật thì mỗi lần một kết quả, không canh được gì.
 *
 * ĐIỀU QUAN TRỌNG NHẤT bài này canh: thứ AI trả về, XƯỞNG PHẢI MỞ ĐƯỢC. Một
 * cảnh "hợp lệ" mà `boCuc()` nổ khi dựng thì người dùng chờ gần một phút rồi
 * nhận một trang trắng.
 *
 *   node tools/kiem-bay-3d.mjs
 */
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const B = await import(path.join(M, 'server', 'bay3d.js'));
const K = await import(path.join(M, 'bachieu', 'khoi.js'));
const C = await import(path.join(M, 'bachieu', 'canh.js'));

/* Đúng dạng một câu trả lời tử tế của AI. */
const TOT = {
  may: { ngang: -32, doc: 30 },
  den: { ngang: -40, cao: 45, nen: 0.5 },
  mon: [
    { loai: 'hop', ten: 'Bàn', vi: { x: 0, y: 40, z: 0 }, rong: 600, cao: 80, day: 300, mau: '#8A5A3B', bo: 20 },
    { loai: 'tru', ten: 'Cột', vi: { x: 900, y: 150, z: 0 }, ban: 90, cao: 300, mau: '#C8C8C8' },
    { loai: 'bieu-do', ten: 'Biểu đồ', vi: { x: -950, y: 150, z: 0 }, cot: [30, 60, 90], caoMax: 300, mau: '#FF7A2F' },
  ],
};

console.log('\n① Lời nhắc — thiếu một điều là AI sinh ra thứ xưởng không mở nổi');
{
  const n = B.loiNhacBay3D({ dan: 'lấy phần bàn làm việc' });
  for (const [ten, re] of [
    ['liệt kê đủ 8 loại khối', /"hop"[\s\S]*"nhan-vat"/],
    ['nói rõ hệ trục', /x sang phải[\s\S]*y LÊN TRÊN/],
    ['dặn vật phải đứng trên đất', /ĐỨNG TRÊN ĐẤT/],
    ['đưa khuôn JSON mẫu', /"mon": \[/],
    ['khai trần số món', new RegExp(`Nhiều nhất ${B.TOI_DA_MON}`)],
    ['nói rõ dạng màu', /#rrggbb/],
    ['chuyển nguyên lời người dùng dặn', /bàn làm việc/],
  ]) dat(ten, re.test(n));
  /* Nói rõ KHÔNG phải vẽ lại ảnh — đây là chỗ kỳ vọng hay sai nhất. */
  dat('nói thẳng là BÀY LẠI chứ không vẽ lại ảnh', /KHÔNG phải vẽ lại ảnh/.test(n));

  const sua = B.loiNhacBay3D({ vanDeCu: ['Hai vật chồng lên nhau.'], canhCu: TOT });
  dat('lượt sửa có kèm danh sách lỗi', /chồng lên nhau/.test(sua));
  dat('lượt sửa có kèm bản trước để nó sửa, không dựng lại từ đầu', /"loai":"hop"|"loai": "hop"/.test(sua));
}

console.log('\n② Bóc JSON khỏi thứ AI thật sự trả về');
{
  dat('bọc trong ```json', B.bocJSON('```json\n{"a":1}\n```')?.a === 1);
  dat('kèm lời dẫn và lời chào', B.bocJSON('Đây nhé:\n{"a":2}\nChúc vui')?.a === 2);
  dat('bọc ``` không ghi json', B.bocJSON('```\n{"a":3}\n```')?.a === 3);
  dat('JSON vỡ → null, không nổ', B.bocJSON('{ mon: [') === null);
  dat('chuỗi rỗng → null', B.bocJSON('') === null);
  dat('không có dấu ngoặc nào → null', B.bocJSON('xin lỗi tôi không làm được') === null);
  dat('undefined → null, không nổ', B.bocJSON(undefined) === null);
}

console.log('\n③ Chuẩn hoá — sửa chuyện vặt tại chỗ, đừng bắt AI chạy lại cả phút');
{
  const c = B.chuanHoa(TOT);
  dat('giữ đủ món hợp lệ', c.mon.length === 3);
  dat('món nào cũng có tên tiếng Việt', c.mon.every((m) => m.ten && m.ten.length > 1));
  dat('món nào cũng có mã riêng, không trùng',
    new Set(c.mon.map((m) => m.id)).size === 3);

  /* Bỏ loại không có thật, giữ phần còn lại — đừng vứt cả cảnh vì một món sai. */
  const lan = B.chuanHoa({ mon: [{ loai: 'con-rong' }, { loai: 'hop' }, { loai: 'xe-tang' }] });
  dat('loại không có thật thì bỏ, giữ phần còn lại', lan.mon.length === 1 && lan.mon[0].loai === 'hop');

  /* Kẹp số về khoảng dùng được. AI hay khai góc 999 hoặc ánh nền 1,4. */
  const lech = B.chuanHoa({ mon: [{ loai: 'hop' }],
    may: { ngang: 999, doc: -400 }, den: { ngang: -40, cao: 200, nen: 1.8 } });
  dat('góc máy quay bị kẹp về khoảng cho phép',
    Math.abs(lech.may.ngang) <= 180 && Math.abs(lech.may.doc) <= 85,
    `${lech.may.ngang}° / ${lech.may.doc}°`);
  dat('ánh nền bị kẹp về khoảng cho phép', lech.den.nen > 0 && lech.den.nen < 1, String(lech.den.nen));

  /* ĐỨNG TRÊN ĐẤT. AI hay quên, và quên thì vật chìm nửa người xuống sàn. */
  const chim = B.chuanHoa({ mon: [{ loai: 'hop', rong: 300, cao: 400, day: 300, vi: { x: 0, y: 0, z: 0 } }] });
  dat('vật khai y = 0 thì được nâng lên đứng trên đất',
    Math.abs(chim.mon[0].vi.y - 200) < 1, `y = ${chim.mon[0].vi.y}`);
  /* Nhưng vật AI CỐ Ý treo cao thì phải giữ nguyên. */
  const treo = B.chuanHoa({ mon: [{ loai: 'hop', rong: 200, cao: 200, day: 200, vi: { x: 0, y: 800, z: 0 } }] });
  dat('vật cố ý treo cao thì giữ nguyên, không kéo xuống đất', treo.mon[0].vi.y === 800);

  dat('màu sai dạng thì thay bằng màu dùng được',
    /^#[0-9a-f]{6}$/i.test(B.chuanHoa({ mon: [{ loai: 'hop', mau: 'đỏ tươi' }] }).mon[0].mau));
  dat('quá nhiều món thì cắt về trần',
    B.chuanHoa({ mon: Array(60).fill({ loai: 'hop' }) }).mon.length === B.TOI_DA_MON);
  dat('thiếu hết mọi thứ cũng không nổ', (() => {
    for (const x of [null, undefined, {}, { mon: 'không phải mảng' }, { mon: [null, 5, 'x'] }]) {
      const r = B.chuanHoa(x);
      if (!r || !Array.isArray(r.mon) || !r.may || !r.den) return false;
    }
    return true;
  })());
}

console.log('\n④ XƯỞNG PHẢI MỞ ĐƯỢC thứ AI trả về');
{
  /* Đây là phép kiểm quan trọng nhất cả bài. Một cảnh "hợp lệ" mà `boCuc()` nổ
     thì người dùng chờ gần một phút rồi nhận một trang trắng. */
  const moiLoai = B.chuanHoa({ mon: K.KHO_LOAI.map((l) => ({ loai: l.id, ten: l.ten })) });
  dat('chuẩn hoá ra đủ cả 8 loại', moiLoai.mon.length === K.KHO_LOAI.length);
  let no = null;
  for (const m of moiLoai.mon) {
    try {
      const bc = K.boCuc(m);
      if (bc.kieu === 'chu' ? !(bc.lop > 0) : !(bc.khoiCon?.length > 0)) no = `${m.loai}: bố cục rỗng`;
      if (!Number.isFinite(C.soMatMon(m, K.boCuc))) no = `${m.loai}: đếm mảnh ra NaN`;
    } catch (e) { no = `${m.loai}: ${e.message}`; }
  }
  dat('dựng được hình cho MỌI loại AI có thể trả về', no === null, no || 'cả 8 loại đều dựng được');

  /* Món AI khai thiếu trường riêng của loại ấy — phải vẫn dựng được. */
  let no2 = null;
  for (const l of K.KHO_LOAI) {
    const m = B.chuanHoa({ mon: [{ loai: l.id }] }).mon[0];
    try { K.boCuc(m); } catch (e) { no2 = `${l.id}: ${e.message}`; }
  }
  dat('khai trống trơn, chỉ có "loai", vẫn dựng được', no2 === null, no2 || 'đủ cả');

  /* Và cảnh ấy phải nhét vừa mô hình cảnh thật của xưởng. */
  const c = B.chuanHoa(TOT);
  dat('hộp bao của cảnh tính được', Number.isFinite(C.hopBao(c).rong) && C.hopBao(c).rong > 0);
  dat('thu phóng vừa khung tính được', C.thuPhongVua(c, 900, 600).ti > 0);
}

console.log('\n⑤ Soát — chỉ bắt lỗi KHÔNG sửa tại chỗ được, và nói rõ phải làm gì');
{
  dat('cảnh tốt thì im', B.soatCanhAI(B.chuanHoa(TOT), TOT).length === 0);

  const rong = B.soatCanhAI(B.chuanHoa({ mon: [] }), { mon: [] });
  dat('cảnh rỗng thì báo', rong.length === 1);

  /* Ca này hay gặp: AI chế ra loại khối không có. Câu báo phải LIỆT KÊ loại
     hợp lệ, không thì lượt sửa cũng chế tiếp. */
  const tho = { mon: [{ loai: 'con-meo' }, { loai: 'cai-ghe' }] };
  const lan = B.soatCanhAI(B.chuanHoa(tho), tho);
  dat('chế loại khối không có thì báo', lan.length >= 1);
  dat('và LIỆT KÊ những loại được phép', /nhan-vat/.test(lan.join(' ')), lan[0]?.slice(0, 70));

  /* Kiểu hỏng hay gặp nhất: AI lo tả nội dung mà quên bày, thả hết về x = 0. */
  const chong = { mon: Array.from({ length: 4 }, (_, i) =>
    ({ loai: 'hop', ten: 'Khối ' + i, rong: 400, cao: 400, day: 400, vi: { x: 0, y: 200, z: 0 } })) };
  const bao = B.soatCanhAI(B.chuanHoa(chong), chong);
  dat('vật chồng đống lên nhau thì báo', bao.some((v) => /chồng lên nhau/.test(v)));
  dat('và bảo rõ phải dời ra bao nhiêu', /ít nhất bằng nửa tổng bề ngang/.test(bao.join(' ')));

  /* Sai đơn vị: AI khai theo mét hoặc theo phần trăm. */
  const be = { mon: [{ loai: 'hop', rong: 2, cao: 1, day: 1, vi: { x: 0, y: 0.5, z: 0 } }] };
  dat('khai quá bé thì báo và nhắc đơn vị',
    B.soatCanhAI(B.chuanHoa(be), be).some((v) => /ĐIỂM ẢNH/.test(v)));
  const to = { mon: [{ loai: 'hop', rong: 90000, cao: 100, day: 100, vi: { x: 0, y: 50, z: 0 } }] };
  dat('khai quá khổ thì báo', B.soatCanhAI(B.chuanHoa(to), to).some((v) => /quá khổ/.test(v)));

  /* CẢNH QUÁ NẶNG. Số món TÍNH RA từ ngưỡng, không gõ cứng.
     Bản đầu gõ cứng 10 nhân vật — hồi đó mỗi con là 2.085 mảnh nên thừa sức
     vượt ngưỡng. Rồi quả cầu chuyển sang vẽ mượt bằng một thẻ, mỗi con còn 60
     mảnh, 10 con chỉ ra 600 — dưới ngưỡng, và mục này đỏ. Cái đỏ ấy ĐÚNG: con
     số trong bài kiểm đã mục mà không ai hay. Tính ra thì nó không mục lại. */
  const motCon = C.soMatMon(K.khoiMoi('nhan-vat'), K.boCuc);
  const soCon = Math.floor(C.NGUONG_MAT_NANG / motCon) + 1;
  /* Vượt được ngưỡng mà vẫn nằm trong trần số món thì lời nhắc mới có đường
     bật ra. Quá trần nghĩa là nó KHÔNG BAO GIỜ kêu — một lời nhắc không bao
     giờ kêu thì thà bỏ hẳn còn hơn để đó ru mình. */
  dat('lời nhắc "cảnh nặng" còn với tới được', soCon <= B.TOI_DA_MON,
    `cần ${soCon} món (${motCon} mảnh/con), trần là ${B.TOI_DA_MON}`);
  const nang = { mon: Array.from({ length: soCon }, (_, i) =>
    ({ loai: 'nhan-vat', ten: 'Người ' + i, co: 1.2, vi: { x: i * 900, y: 0, z: 0 } })) };
  const bn = B.soatCanhAI(B.chuanHoa(nang), nang);
  dat('cảnh quá nặng thì báo', bn.some((v) => /nặng quá/.test(v)), bn.find((v) => /nặng/.test(v))?.slice(0, 68));
  dat('và chỉ cách làm nhẹ', /hạ "soMat"|Bớt món/.test(bn.join(' ')));

  /* MỌI câu báo phải nói AI PHẢI LÀM GÌ, không chỉ nói nó sai. */
  const moiCau = [...rong, ...lan, ...bao, ...bn];
  dat('câu báo nào cũng chỉ việc phải làm',
    moiCau.every((v) => /Chỉ được dùng|Dời|Bớt|hạ |Phải trả về|từ 100 đến 800/.test(v)),
    moiCau.find((v) => !/Chỉ được dùng|Dời|Bớt|hạ |Phải trả về|từ 100 đến 800/.test(v)) || 'đủ cả');
  dat('câu báo nào cũng là tiếng Việt có dấu',
    moiCau.every((v) => /[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừử]/i.test(v)));
}

console.log('\n⑥ Chưa có ảnh thì báo ngay, đừng gọi AI cho tốn');
{
  const r = await B.bayTuAnh({});
  dat('không có ảnh → báo luôn, không gọi mạng', r.ok === false && /Chưa chọn ảnh/.test(r.cau));
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ AI bày bối cảnh đạt hết.\n');
process.exit(hong ? 1 : 0);
