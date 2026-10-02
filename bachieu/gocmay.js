/**
 * TẢ GÓC MÁY BẰNG NGÔN NGỮ LÀM PHIM.
 *
 * VIỆC CỦA FILE NÀY. Xưởng khối nổi là HẬU TRƯỜNG: bày bối cảnh ra, xoay máy
 * tới góc ưng ý, rồi **đưa góc ấy cho AI dựng phim**. Nhưng AI không đọc được
 * `{ngang: -26, doc: 28, ti: 0.62}` — mấy con số ấy chỉ có nghĩa bên trong
 * đúng một chương trình này. Thứ AI đọc được là *"trung cảnh, máy ngang tầm
 * mắt, chếch ba phần tư từ bên trái, ống kính 40mm"*.
 *
 * Nên file này dịch từ con số sang câu. Dịch được vì mọi thứ cần thiết đều đã
 * nằm trong mô hình: cỡ cảnh suy từ chiều cao vật chiếm bao nhiêu phần khung,
 * độ cao máy suy từ góc ngả, hướng suy từ góc xoay, ống kính đã tính bằng mm.
 *
 * THUẦN HOÀN TOÀN — không chạm DOM, không chạm mạng. Nhờ vậy bài kiểm đo được
 * từng ngưỡng bằng số, thay vì mở trình duyệt ra đọc bằng mắt.
 *
 * MỘT ĐIỀU PHẢI NÓI THẲNG: câu tả này là mô tả BỐ CỤC, không phải mô tả nội
 * dung. Nó biết "một khối cao 1,8m đứng giữa khung, máy chếch 26°" chứ không
 * biết đó là người hay cái tủ. Phần nội dung do người dùng gõ thêm.
 */
import { khungMon } from './canh.js';

const kep = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------------------------------------------------------------------------
 * CỠ CẢNH
 *
 * Nghề quay phim gọi tên cỡ cảnh theo PHẦN CƠ THỂ lọt khung (cận mặt, bán
 * thân, toàn thân). Ở đây không biết đâu là mặt đâu là chân, nên quy về thứ
 * đo được: vật chiếm bao nhiêu phần chiều cao khung. Ngưỡng lấy theo đúng chỗ
 * mà hai cỡ cảnh thật sự đổi tên trong nghề.
 * ------------------------------------------------------------------------- */

export const KHO_CO_CANH = [
  { id: 'cuc-can', tu: 1.6, ten: 'Cực cận', en: 'extreme close-up',
    mo: 'vật tràn khung, cắt cả trên lẫn dưới' },
  { id: 'can', tu: 1.05, ten: 'Cận cảnh', en: 'close-up',
    mo: 'vật cao hơn khung, bị cắt đầu hoặc chân' },
  { id: 'trung-can', tu: 0.78, ten: 'Trung cận', en: 'medium close-up',
    mo: 'vật gần kín khung chiều cao' },
  { id: 'trung', tu: 0.45, ten: 'Trung cảnh', en: 'medium shot',
    mo: 'vật chiếm khoảng nửa khung' },
  { id: 'toan', tu: 0.22, ten: 'Toàn cảnh', en: 'wide shot',
    mo: 'thấy trọn vật và chỗ nó đứng' },
  { id: 'vien', tu: 0, ten: 'Viễn cảnh', en: 'extreme wide shot',
    mo: 'vật nhỏ, bối cảnh là chính' },
];

/** Vật cao bằng `ti` lần chiều cao khung thì đó là cỡ cảnh nào. */
export function coCanh(ti) {
  const t = Number.isFinite(ti) ? ti : 0;
  return KHO_CO_CANH.find((c) => t >= c.tu) || KHO_CO_CANH[KHO_CO_CANH.length - 1];
}

/* ---------------------------------------------------------------------------
 * ĐỘ CAO MÁY
 *
 * Trong nghề đây là thứ đổi CẢM GIÁC mạnh nhất mà tốn ít công nhất: nhìn từ
 * dưới lên thì vật thành uy nghi, nhìn từ trên xuống thì thành nhỏ bé. Nên
 * đây là thứ phải nói rõ cho AI, không được bỏ qua.
 * ------------------------------------------------------------------------- */

export const KHO_CAO_MAY = [
  { id: 'tren-xuong', tu: 55, ten: 'Từ trên cao nhìn xuống', en: 'high angle, looking down',
    mo: 'vật trông nhỏ lại, yếu thế' },
  { id: 'chech-tren', tu: 18, ten: 'Chếch từ trên', en: 'slightly high angle',
    mo: 'góc nhìn thường gặp, thấy cả mặt sàn' },
  { id: 'tam-mat', tu: -18, ten: 'Ngang tầm mắt', en: 'eye level',
    mo: 'trung tính, như đứng đối diện' },
  { id: 'chech-duoi', tu: -55, ten: 'Chếch từ dưới', en: 'slightly low angle',
    mo: 'vật cao lên một chút' },
  { id: 'duoi-len', tu: -90, ten: 'Từ dưới nhìn lên', en: 'low angle, looking up',
    mo: 'vật trông đồ sộ, áp đảo' },
];

export const caoMay = (doc) =>
  KHO_CAO_MAY.find((c) => (Number.isFinite(doc) ? doc : 0) >= c.tu) || KHO_CAO_MAY[KHO_CAO_MAY.length - 1];

/* ---------------------------------------------------------------------------
 * HƯỚNG MÁY
 *
 * BÊN NÀO LÀ BÊN NÀO — suy ra chứ không đoán. Xoay cảnh `rotateY(ngang)` tương
 * đương xoay MÁY đi `-ngang`. Nên `ngang` dương nghĩa là máy dời sang phía x
 * ÂM. Nhân vật nhìn về phía z dương (mặt nó đặt ở z = +88), mà người quay mặt
 * về z dương thì tay phải của họ nằm ở x âm. Vậy `ngang` dương ⇒ máy đứng phía
 * tay phải nhân vật.
 *
 * Chép nhầm chiều này thì câu tả vẫn trôi chảy, AI vẫn dựng ra phim — chỉ là
 * phim soi gương. Không có gì báo lỗi, nên mới phải ghi lại cách suy ở đây.
 * ------------------------------------------------------------------------- */

export const KHO_HUONG = [
  { id: 'chinh-dien', toi: 20, ten: 'Chính diện', en: 'front view' },
  { id: 'ba-phan-tu', toi: 65, ten: 'Chếch ba phần tư', en: 'three-quarter view' },
  { id: 'canh-ben', toi: 115, ten: 'Cạnh bên', en: 'profile view' },
  { id: 'chech-sau', toi: 160, ten: 'Chếch sau lưng', en: 'rear three-quarter view' },
  { id: 'sau-lung', toi: 181, ten: 'Sau lưng', en: 'back view' },
];

/** Gom góc về khoảng -180…180, để `|góc|` nói đúng độ lệch khỏi chính diện. */
export function gomGoc(g) {
  const a = Number.isFinite(g) ? g : 0;
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

export function huongMay(ngang) {
  const a = gomGoc(ngang);
  const k = KHO_HUONG.find((h) => Math.abs(a) < h.toi) || KHO_HUONG[KHO_HUONG.length - 1];
  /* Chính diện và sau lưng thì không có bên nào cả — nói "chính diện từ bên
     trái" là câu vô nghĩa, và AI sẽ cố dựng ra cái vô nghĩa ấy. */
  const coBen = k.id !== 'chinh-dien' && k.id !== 'sau-lung';
  const ben = !coBen ? null : a > 0 ? 'phai' : 'trai';
  return { ...k, goc: a, ben,
    tenDay: k.ten + (ben ? ` từ bên ${ben === 'phai' ? 'phải' : 'trái'}` : ''),
    enDay: k.en + (ben ? ` from the ${ben === 'phai' ? 'right' : 'left'}` : '') };
}

/* ---------------------------------------------------------------------------
 * ỐNG KÍNH
 * ------------------------------------------------------------------------- */

export const KHO_ONG = [
  { id: 'rat-rong', toi: 24, ten: 'Góc rất rộng', en: 'ultra wide-angle',
    mo: 'méo mạnh ở rìa, chiều sâu bị kéo dài ra' },
  { id: 'rong', toi: 35, ten: 'Góc rộng', en: 'wide-angle',
    mo: 'ôm được nhiều bối cảnh' },
  { id: 'tieu-chuan', toi: 60, ten: 'Tiêu chuẩn', en: 'standard',
    mo: 'gần với mắt người nhất' },
  { id: 'tele-nhe', toi: 100, ten: 'Tele nhẹ', en: 'short telephoto',
    mo: 'nén chiều sâu, đẹp cho chân dung' },
  { id: 'tele', toi: 1e9, ten: 'Tele', en: 'telephoto',
    mo: 'nén mạnh, hậu cảnh như dán sát sau lưng' },
];

export const tenOng = (ong) =>
  KHO_ONG.find((o) => (Number.isFinite(ong) ? ong : 40) < o.toi) || KHO_ONG[KHO_ONG.length - 1];

/* ---------------------------------------------------------------------------
 * ĐÈN
 * ------------------------------------------------------------------------- */

export function phiaDen(den = {}) {
  const a = gomGoc(den.ngang ?? -30);
  const cao = den.cao ?? 38;
  const ngang = Math.abs(a) < 22 ? { ten: 'phía trước', en: 'front' }
    : Math.abs(a) > 150 ? { ten: 'phía sau', en: 'back' }
      : a > 0 ? { ten: 'bên phải', en: 'right side' } : { ten: 'bên trái', en: 'left side' };
  const doc = cao > 55 ? { ten: 'từ trên đỉnh', en: 'from overhead' }
    : cao > 15 ? { ten: 'chếch trên', en: 'from above' }
      : cao > -15 ? { ten: 'ngang tầm', en: 'at eye level' }
        : { ten: 'hắt từ dưới', en: 'from below' };
  const nen = den.nen ?? 0.46;
  const gat = nen < 0.3 ? { ten: 'tương phản gắt', en: 'high contrast, deep shadows' }
    : nen > 0.65 ? { ten: 'sáng đều, bóng nhạt', en: 'soft even light' }
      : { ten: 'tương phản vừa', en: 'moderate contrast' };
  return { ngang, doc, gat,
    ten: `đèn ${ngang.ten} ${doc.ten}, ${gat.ten}`,
    en: `key light from the ${ngang.en} ${doc.en}, ${gat.en}` };
}

/* ---------------------------------------------------------------------------
 * GỘP LẠI
 * ------------------------------------------------------------------------- */

/** Món nào là CHỦ THỂ của khung: món đang chọn, không thì món cao nhất trên màn. */
export function chuThe(canh, boCuc, chonId = null) {
  const hien = canh.mon.filter((m) => !m.an);
  if (!hien.length) return null;
  const chon = hien.find((m) => m.id === chonId);
  if (chon) return chon;
  let to = hien[0], caoNhat = -Infinity;
  for (const m of hien) {
    const c = khungMon(m, boCuc, canh.may).cao;
    if (c > caoNhat) { caoNhat = c; to = m; }
  }
  return to;
}

/**
 * Tả cả góc máy. `khung` là khung hình thật, lấy từ `khungTrong()`.
 *
 * @returns {{co, cao, huong, ong, den, chu, tiCao, cauV:string, cauA:string}}
 */
export function taGocMay(canh, boCuc, khung, chonId = null) {
  const may = canh.may || {};
  const chu = chuThe(canh, boCuc, chonId);
  const k = chu ? khungMon(chu, boCuc, may) : null;
  const tiCao = k && khung.cao > 0 ? k.cao / khung.cao : 0;

  const co = coCanh(tiCao);
  const cao = caoMay(may.doc);
  const huong = huongMay(may.ngang);
  const ong = Math.round(may.ong ?? 40);
  const oTen = tenOng(ong);
  const den = phiaDen(canh.den);

  /* Vật có nằm trong khung không — hỏi trước khi tả, vì tả một khung trống thì
     AI dựng ra một khung trống. */
  const nua = { x: khung.rong / 2, y: khung.cao / 2 };
  const trongKhung = !k ? false
    : k.pha > -nua.x && k.tr < nua.x && k.duoi > -nua.y && k.tren < nua.y;
  const lotTron = !k ? false
    : k.tr >= -nua.x && k.pha <= nua.x && k.tren >= -nua.y && k.duoi <= nua.y;

  const cauV = [
    `${co.ten}, ${cao.ten.toLowerCase()}, ${huong.tenDay.toLowerCase()}`,
    `ống kính ${ong}mm (${oTen.ten.toLowerCase()})`,
    `khung ${khung.ti.ngan}`,
    den.ten,
  ].join(' · ');

  const cauA = [
    `${co.en}, ${cao.en}, ${huong.enDay}`,
    `${ong}mm ${oTen.en} lens`,
    `${khung.ti.w}:${khung.ti.h} aspect ratio`,
    den.en,
  ].join(', ');

  return { co, cao, huong, ong, oTen, den, chu, tiCao, trongKhung, lotTron, cauV, cauA };
}
