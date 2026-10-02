#!/usr/bin/env node
/**
 * KIỂM KHUNG HÌNH, ỐNG KÍNH VÀ CÂU TẢ GÓC MÁY.
 *
 * VÌ SAO CÓ BÀI NÀY. Xưởng khối nổi là HẬU TRƯỜNG để chốt góc máy rồi đưa cho
 * AI dựng phim. Thứ đưa đi là một CÂU CHỮ — mà câu chữ sai thì không có gì
 * kêu cả: AI vẫn dựng ra phim, chỉ là phim sai góc. Người dùng sẽ tưởng AI
 * dở, chứ không nghĩ là cái máy đo nói dối.
 *
 * Nên mọi ngưỡng ở đây đo bằng số, chạy bằng Node trần, vài trăm mili giây.
 *
 *   node tools/kiem-goc-may.mjs
 */
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
const gan = (a, b, sai = 1e-9) => Math.abs(a - b) <= sai;

const C = await import(path.join(M, 'bachieu', 'canh.js'));
const K = await import(path.join(M, 'bachieu', 'khoi.js'));
const G = await import(path.join(M, 'bachieu', 'gocmay.js'));
const X = await import(path.join(M, 'server', 'chup3d.js'));

console.log('① Khung hình — tỉ lệ đúng, nằm giữa, không tràn');
{
  for (const t of C.KHO_TI) {
    const k = C.khungTrong(1200, 700, t.id);
    const tiThat = k.rong / k.cao, tiKhai = t.w / t.h;
    dat(`${t.ten} đúng tỉ lệ`, gan(tiThat, tiKhai, 1e-6), tiThat.toFixed(4));
    dat(`${t.ten} lọt trong ô và nằm giữa`,
      k.rong <= 1200 && k.cao <= 700 && gan(k.tr * 2 + k.rong, 1200, 1e-6)
      && gan(k.tren * 2 + k.cao, 700, 1e-6));
  }
  /* Ô bẹp dí hay cao vống đều không được trả về số âm — khung âm thì lớp phủ
     lộn ngược và cả màn hình đen sì. */
  for (const [w, h] of [[10, 900], [900, 10], [1, 1], [0, 0]]) {
    const k = C.khungTrong(w, h, '16-9');
    dat(`ô ${w}×${h} vẫn ra khung dương`, k.rong > 0 && k.cao > 0,
      `${k.rong.toFixed(0)}×${k.cao.toFixed(0)}`);
  }
  dat('tỉ lệ lạ thì rơi về khung đầu tiên, không nổ',
    C.khungTrong(1200, 700, 'khong-co-that').ti.id === C.KHO_TI[0].id);
  /* Tên ngắn in lên nút. Cắt từ tên dài bằng mẹo thì "Điện ảnh 2.39:1" ra cái
     nút ghi "ảnh 2.39:1" — đã mắc đúng lỗi ấy. */
  dat('tỉ lệ nào cũng có tên ngắn, và tên ngắn đúng là con số',
    C.KHO_TI.every((t) => /^[\d.]+:[\d.]+$/.test(t.ngan || '')),
    C.KHO_TI.map((t) => t.ngan).join(' '));
}

console.log('\n② Ống kính tính bằng mm, không theo cỡ cửa sổ');
{
  for (const ong of [14, 24, 35, 50, 85, 180]) {
    dat(`${ong}mm đi một vòng về đúng chỗ cũ`,
      gan(C.ongTuXa(C.xaTuOng(ong, 1104), 1104), ong, 1e-6));
  }
  /* ĐÂY LÀ LÝ DO ĐỔI SANG mm: cùng một ống kính, khung to hay nhỏ thì GÓC
     NHÌN phải y nhau. Trước đây giữ `xa` cố định nên kéo rộng cửa sổ là góc
     nhìn đổi mà con số trên bảng đứng im. */
  const gocNhin = (ong, rong) => 2 * Math.atan(rong / (2 * C.xaTuOng(ong, rong)));
  dat('cùng ống kính, khung to nhỏ vẫn một góc nhìn',
    gan(gocNhin(35, 600), gocNhin(35, 1800), 1e-9),
    (gocNhin(35, 600) * 180 / Math.PI).toFixed(2) + '°');
  dat('ống kính càng dài thì góc nhìn càng hẹp',
    gocNhin(85, 1200) < gocNhin(35, 1200) && gocNhin(35, 1200) < gocNhin(18, 1200));
  /* Số rác không được làm phép chia nổ. */
  for (const bay of [0, -5, NaN, undefined]) {
    dat(`ống kính "${bay}" vẫn ra số dùng được`, C.xaTuOng(bay, 1200) >= 60);
  }

  const may = { ong: 50 };
  C.dongBoOng(may, 1200);
  dat('đồng bộ ống kính thì ghi lại `xa`', gan(may.xa, C.xaTuOng(50, 1200)));
  const cu = { xa: 2200 };
  C.dongBoOng(cu, 1104);
  dat('cảnh đời cũ chỉ có `xa` thì suy ngược ra mm', cu.ong > 0,
    cu.ong + 'mm');
}

console.log('\n③ Vừa khung thì PHẢI vừa — đo lại bằng phép chiếu');
{
  /* Bản cũ đo bằng hộp bao trong KHÔNG GIAN CẢNH nên bỏ qua phép xoay máy,
     phép chia phối cảnh và chiều sâu. Bấm "Vừa khung" xong vật vẫn tràn ra
     ngoài — khung dọc 9:16 đo được cảnh chiếm 1.565px trên khung rộng 428px.
     Quét 30 ca để chuyện ấy không quay lại. */
  let xau = 0, tong = 0;
  for (const tiId of ['16-9', '9-16', '1-1', '4-5', '2-39']) {
    for (const ngang of [-26, 45, 137]) for (const doc of [10, 60]) {
      tong++;
      const c = C.canhMoi(); c.mon.length = 0;
      C.themMon(c, 'nhan-vat'); C.themMon(c, 'gia-may-chu'); C.themMon(c, 'hop');
      Object.assign(c.may, { khung: tiId, ngang, doc });
      const k = C.khungTrong(1472, 828, tiId);
      C.dongBoOng(c.may, k.rong);
      Object.assign(c.may, C.thuPhongVua(c, K.boCuc, k.rong, k.cao));
      for (const m of c.mon) {
        const b = C.khungMon(m, K.boCuc, c.may);
        if (b.tr < -k.rong / 2 || b.pha > k.rong / 2
          || b.tren < -k.cao / 2 || b.duoi > k.cao / 2) { xau++; break; }
      }
    }
  }
  dat('vừa khung ở mọi tỉ lệ và mọi góc máy', xau === 0, `${tong - xau}/${tong} ca vừa`);

  /* Và không được thu quá tay: vừa khung mà vật bé như hạt gạo thì cũng vô dụng. */
  const c = C.canhMoi(); c.mon.length = 0; C.themMon(c, 'nhan-vat');
  const k = C.khungTrong(1472, 828, '16-9');
  C.dongBoOng(c.may, k.rong);
  Object.assign(c.may, C.thuPhongVua(c, K.boCuc, k.rong, k.cao));
  const cao = C.khungMon(c.mon[0], K.boCuc, c.may).cao / k.cao;
  dat('vừa khung thì vật chiếm phần lớn chiều cao', cao > 0.6,
    `chiếm ${(cao * 100).toFixed(0)}% chiều cao khung`);

  dat('cảnh trống thì không nổ', C.thuPhongVua({ mon: [], may: C.MAY_MAC_DINH },
    K.boCuc, 900, 600).ti > 0);
}

console.log('\n④ Cỡ cảnh — gọi đúng tên nghề');
{
  dat('vật tràn khung là cực cận', G.coCanh(2).id === 'cuc-can');
  dat('vật cao hơn khung là cận cảnh', G.coCanh(1.2).id === 'can');
  dat('vật chiếm nửa khung là trung cảnh', G.coCanh(0.5).id === 'trung');
  dat('vật nhỏ xíu là viễn cảnh', G.coCanh(0.05).id === 'vien');
  /* Thang phải LIỀN MẠCH: hở một quãng là có tỉ lệ nào đó không rơi vào cỡ
     nào, và hàm trả về `undefined` — câu tả gãy giữa chừng. */
  let lien = true;
  for (let t = 0; t <= 2.5; t += 0.01) if (!G.coCanh(t)) lien = false;
  dat('không có khoảng trống nào trong thang', lien);
  dat('thang xếp từ to xuống nhỏ',
    G.KHO_CO_CANH.every((c, i, a) => i === 0 || a[i - 1].tu > c.tu));
}

console.log('\n⑤ Độ cao và hướng máy');
{
  dat('ngả 70° là nhìn từ trên xuống', G.caoMay(70).id === 'tren-xuong');
  dat('ngả 0° là ngang tầm mắt', G.caoMay(0).id === 'tam-mat');
  dat('ngả -70° là nhìn từ dưới lên', G.caoMay(-70).id === 'duoi-len');

  dat('xoay 0° là chính diện', G.huongMay(0).id === 'chinh-dien');
  dat('xoay 45° là chếch ba phần tư', G.huongMay(45).id === 'ba-phan-tu');
  dat('xoay 90° là cạnh bên', G.huongMay(90).id === 'canh-ben');
  dat('xoay 180° là sau lưng', G.huongMay(180).id === 'sau-lung');
  /* Góc quay vòng: 370° với 10° là cùng một hướng. Không gom thì xoay máy đủ
     một vòng là câu tả nhảy sang "sau lưng" trong khi hình y hệt. */
  dat('xoay 370° vẫn là chính diện', G.huongMay(370).id === 'chinh-dien');
  dat('xoay -350° cũng vậy', G.huongMay(-350).id === 'chinh-dien');
  dat('chính diện thì KHÔNG nói bên nào', G.huongMay(5).ben === null);
  dat('sau lưng thì cũng không', G.huongMay(178).ben === null);
  /* Hai bên phải ĐỐI XỨNG. Lẫn chiều thì AI dựng ra phim soi gương, mà không
     có gì báo lỗi cả. */
  dat('lệch dương và lệch âm là hai bên khác nhau',
    G.huongMay(45).ben === 'phai' && G.huongMay(-45).ben === 'trai');
}

console.log('\n⑥ Ống kính và đèn gọi thành tên');
{
  dat('18mm là góc rất rộng', G.tenOng(18).id === 'rat-rong');
  dat('40mm là tiêu chuẩn', G.tenOng(40).id === 'tieu-chuan');
  dat('135mm là tele', G.tenOng(135).id === 'tele');
  let lien = true;
  for (let f = 8; f <= 400; f += 1) if (!G.tenOng(f)) lien = false;
  dat('mọi tiêu cự đều có tên', lien);

  dat('đèn chiếu thẳng mặt gọi là phía trước', G.phiaDen({ ngang: 0, cao: 20 }).ngang.ten === 'phía trước');
  dat('đèn sau lưng gọi đúng', G.phiaDen({ ngang: 175, cao: 20 }).ngang.ten === 'phía sau');
  dat('nền tối thì báo tương phản gắt', /gắt/.test(G.phiaDen({ nen: 0.12 }).gat.ten));
  dat('nền sáng thì báo bóng nhạt', /nhạt/.test(G.phiaDen({ nen: 0.8 }).gat.ten));
}

console.log('\n⑦ Câu tả — thứ thật sự đem đưa cho AI');
{
  const c = C.canhMoi(); c.mon.length = 0; C.themMon(c, 'nhan-vat');
  const k = C.khungTrong(1472, 828, '16-9');
  C.dongBoOng(c.may, k.rong);
  Object.assign(c.may, C.thuPhongVua(c, K.boCuc, k.rong, k.cao));
  const t = G.taGocMay(c, K.boCuc, k);

  dat('câu tiếng Việt có dấu', /[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừử]/i.test(t.cauV));
  dat('câu tiếng Việt nói đủ bốn thứ: cỡ cảnh, ống kính, khung, đèn',
    /cảnh|cận/i.test(t.cauV) && /mm/.test(t.cauV) && /khung/.test(t.cauV) && /đèn/.test(t.cauV),
    t.cauV);
  /* Câu tiếng Anh là thứ dán thẳng vào công cụ dựng phim — không được lọt chữ
     Việt vào, và phải dùng đúng từ nghề. */
  dat('câu tiếng Anh sạch dấu tiếng Việt',
    !/[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừửĐ]/i.test(t.cauA), t.cauA);
  dat('câu tiếng Anh dùng từ nghề',
    /shot|close-up/.test(t.cauA) && /angle|eye level/.test(t.cauA)
    && /lens/.test(t.cauA) && /aspect ratio/.test(t.cauA));

  dat('vừa khung xong thì chủ thể lọt trọn', t.lotTron);
  /* Đẩy vật ra khỏi khung thì PHẢI báo. Không báo thì người dùng xuất ra một
     tấm ảnh trống mà vẫn tưởng đã chốt xong góc máy. */
  c.mon[0].vi.x += 9000;
  const t2 = G.taGocMay(c, K.boCuc, k);
  dat('vật ra ngoài khung thì biết', !t2.trongKhung && !t2.lotTron);

  /* Chủ thể: món đang chọn thắng, không chọn thì lấy món to nhất trên màn. */
  const c2 = C.canhMoi(); c2.mon.length = 0;
  C.themMon(c2, 'hop'); C.themMon(c2, 'nhan-vat');
  const nv = c2.mon.find((m) => m.loai === 'nhan-vat');
  dat('không chọn gì thì lấy món to nhất làm chủ thể',
    G.chuThe(c2, K.boCuc).id === nv.id);
  dat('đang chọn món nào thì món ấy là chủ thể',
    G.chuThe(c2, K.boCuc, c2.mon[0].id).id === c2.mon[0].id);
  dat('cảnh trống thì không có chủ thể, và không nổ',
    G.chuThe({ mon: [], may: C.MAY_MAC_DINH }, K.boCuc) === null);
}

console.log('\n⑧ Soát cảnh gửi lên máy chủ để chụp');
{
  dat('không có cảnh thì chặn', !!X.soatCanhChup(null));
  dat('cảnh trống thì chặn và nói rõ phải làm gì',
    /thêm ít nhất một món/i.test(X.soatCanhChup({ mon: [] }) || ''));
  dat('cảnh quá nhiều món thì chặn',
    !!X.soatCanhChup({ mon: Array.from({ length: 300 }, () => ({})) }));
  dat('cảnh bình thường thì cho qua', X.soatCanhChup({ mon: [{ loai: 'hop' }] }) === null);
  dat('câu chặn nào cũng là tiếng Việt có dấu',
    [X.soatCanhChup(null), X.soatCanhChup({ mon: [] }), X.soatCanhChup({})]
      .every((v) => /[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừử]/i.test(v)));
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Khung hình và góc máy đạt hết.\n');
process.exit(hong ? 1 : 0);
