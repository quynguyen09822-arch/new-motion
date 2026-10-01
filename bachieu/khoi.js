/**
 * KHỐI NỔI LÀ GÌ — mô hình dữ liệu của xưởng 3D.
 *
 * MỘT ĐƯỜNG NỐI DUY NHẤT RA NGOÀI. File này mượn bảng màu của trình sửa clip
 * (`web/phoimau.js`) và KHÔNG mượn gì khác. Lý do không chép bảng màu sang đây
 * cho "tách cho sạch": `CLAUDE.md` đã có vết — hai nơi cùng nói về một thứ thì
 * sớm muộn lệch nhau, và lúc ấy bài kiểm đọc một nơi còn người dùng nhận nơi
 * kia. Một đường nối khai rõ thì an toàn hơn một bản chép lén.
 *
 * Chiều nối là MỘT CHIỀU: `bachieu/` đọc `web/`, `web/` không bao giờ đọc
 * `bachieu/`. `tools/kiem-ba-chieu.mjs` canh đúng điều này bằng máy, không bằng
 * lời hứa — vì lời hứa kiểu đó chỉ sống được tới lần sửa vội thứ hai.
 */
import { BO_PHOI, boTheoId } from '../web/phoimau.js';
import { DEN_MAC_DINH } from './hinhhoc.js';

export { BO_PHOI };

/* ---------------------------------------------------------------------------
 * NĂM LOẠI KHỐI
 *
 * Tất cả đều GHÉP TỪ MẶT PHẲNG, dựng bằng `transform-style: preserve-3d` của
 * chính trình duyệt — không mượn thư viện nào, và xuất phim chạy đúng tốc độ cũ.
 *
 * "Ống trụ" trông tròn nhưng vẫn là mặt phẳng: 24 mặt hẹp ghép quanh một trục
 * thì mắt thấy tròn. Nhờ mẹo đó mà có cột, đồng xu, vòng — những thứ lộ trình
 * từng xếp vào Giai đoạn 2.
 *
 * Thứ VẪN chưa làm được là hình cong tự do (quả địa cầu có lục địa, người, xe).
 * Cố nặn bằng mặt phẳng thì ra thứ nhìn như đồ gấp giấy hỏng.
 * ------------------------------------------------------------------------- */

export const KHO_LOAI = [
  { id: 'hop',         ten: 'Hộp',          mo: 'khối sáu mặt — hộp sản phẩm, gói dịch vụ' },
  { id: 'the-lat',     ten: 'Thẻ lật',      mo: 'mặt trước lật sang mặt sau — trước / sau khi dùng' },
  { id: 'chu-noi',     ten: 'Chữ nổi',      mo: 'chữ có bề dày, như chữ khắc' },
  { id: 'gia-may-chu', ten: 'Giá máy chủ',  mo: 'nhiều tầng xếp chồng, nhìn chéo' },
  { id: 'logo-khoi',   ten: 'Logo khối',    mo: 'dấu hiệu thương hiệu trên cả sáu mặt' },
  { id: 'tru',         ten: 'Ống trụ',      mo: 'khối tròn xoay — cột, đồng xu, vòng tròn' },
  { id: 'bieu-do',     ten: 'Biểu đồ cột',  mo: 'khoe con số tăng trưởng bằng cột có bề dày' },
];

/** Khối mới sinh ra đã phải đẹp sẵn — không bắt người dùng vặn mới xem được. */
export function khoiMoi(loai = 'hop', mauId = 'den-cam') {
  const bo = boTheoId(mauId) || boTheoId('den-cam');
  const chung = {
    id: 'k' + Math.random().toString(36).slice(2, 8),
    loai,
    mauId: bo.id,
    mau: bo.mau.accent,
    den: { ...DEN_MAC_DINH },
    xoayNgang: -28,
    xoayDoc: 14,
    dong: { kieu: 'xoay-vong', chuKy: 8 },
  };
  switch (loai) {
    case 'the-lat':
      return { ...chung, rong: 430, cao: 270, day: 12,
        chu: 'Trước', chuSau: 'Sau', dong: { kieu: 'lat-the', chuKy: 5 }, xoayNgang: 0, xoayDoc: 6 };
    case 'chu-noi':
      return { ...chung, chu: 'MẮT BÃO', coChu: 118, soLop: 20,
        rong: 460, cao: 140, day: 52, dong: { kieu: 'lac-nhe', chuKy: 6 }, xoayNgang: -26, xoayDoc: 12 };
    case 'gia-may-chu':
      return { ...chung, rong: 300, cao: 62, day: 210, tang: 5, khe: 16,
        dong: { kieu: 'lia-quanh', chuKy: 12 }, xoayNgang: -32, xoayDoc: 18 };
    case 'logo-khoi':
      return { ...chung, rong: 280, cao: 280, day: 280, chu: '◆', coChu: 118 };
    case 'tru':
      return { ...chung, ban: 130, cao: 330, soMat: 28,
        dong: { kieu: 'xoay-vong', chuKy: 10 }, xoayNgang: 0, xoayDoc: 16 };
    case 'bieu-do':
      /* Bốn cột tăng dần: đây là hình hay dùng nhất trong clip quảng bá, nên
         bày sẵn đúng dáng ấy thay vì bốn cột bằng nhau. */
      return { ...chung, cot: [38, 56, 74, 100], nhan: ['T1', 'T2', 'T3', 'T4'],
        rongCot: 72, khe: 26, caoMax: 300, day: 72,
        dong: { kieu: 'lac-nhe', chuKy: 7 }, xoayNgang: -24, xoayDoc: 14 };
    default:
      return { ...chung, rong: 330, cao: 330, day: 330, chu: '' };
  }
}

/* ---------------------------------------------------------------------------
 * BỐ CỤC — khối người dùng chọn gồm những hộp con nào
 *
 * Tách khỏi phần dựng DOM vì đây là thứ kiểm được bằng số: đếm hộp, đo chiều
 * cao tổng, xem tầng có chồng lên nhau không.
 * ------------------------------------------------------------------------- */

/**
 * @returns {{kieu:'hop'|'chu', khoiCon?:Array, lop?:number}}
 *   `kieu:'hop'` → danh sách hộp con, mỗi hộp tự dựng sáu mặt.
 *   `kieu:'chu'` → chữ xếp chồng nhiều lớp để thành bề dày.
 */
export function boCuc(khoi = {}) {
  const { rong = 220, cao = 220, day = 220 } = khoi;

  switch (khoi.loai) {
    case 'the-lat':
      return { kieu: 'hop', khoiCon: [
        { id: 'the', x: 0, y: 0, z: 0, rong, cao, day: Math.min(day, 16),
          chuMat: { truoc: khoi.chu || '', sau: khoi.chuSau || '' } },
      ] };

    case 'gia-may-chu': {
      /* Xếp từ dưới lên, rồi dời cả cụm lên nửa chiều cao tổng để tâm khối nằm
         đúng giữa sân. Không dời thì khối tụt xuống dưới, mà người dùng lại đi
         chỉnh vị trí của SÂN — sai chỗ, và lần sau đổi số tầng là lệch lại. */
      const tang = Math.max(1, Math.min(12, khoi.tang ?? 5));
      const khe = khoi.khe ?? 12;
      const tongCao = tang * cao + (tang - 1) * khe;
      return { kieu: 'hop', khoiCon: Array.from({ length: tang }, (_, i) => ({
        id: 'tang' + i,
        x: 0,
        y: tongCao / 2 - cao / 2 - i * (cao + khe),
        z: 0, rong, cao, day,
        /* Tầng trên sáng hơn chút cho ra chiều sâu — giá máy chủ ngoài đời
           cũng vậy, đèn trần hắt xuống. */
        pha: 1 - (i / Math.max(1, tang)) * 0.18,
      })) };
    }

    case 'chu-noi':
      return { kieu: 'chu', lop: Math.max(2, Math.min(40, khoi.soLop ?? 14)) };

    case 'logo-khoi':
      return { kieu: 'hop', khoiCon: [
        { id: 'khoi', x: 0, y: 0, z: 0, rong, cao, day, dauMoiMat: khoi.chu || '◆' },
      ] };

    case 'tru':
      return { kieu: 'hop', khoiCon: [
        { id: 'tru', hinh: 'tru', x: 0, y: 0, z: 0,
          ban: khoi.ban ?? 110, cao: khoi.cao ?? 240, soMat: khoi.soMat ?? 24 },
      ] };

    case 'bieu-do': {
      const gt = (khoi.cot?.length ? khoi.cot : [38, 56, 74, 100]).slice(0, 12);
      const w = khoi.rongCot ?? 60, khe = khoi.khe ?? 24;
      const caoMax = khoi.caoMax ?? 300, sau = khoi.day ?? 60;
      const dinh = Math.max(1, ...gt.map((v) => Math.abs(v)));
      const tongRong = gt.length * w + (gt.length - 1) * khe;
      return { kieu: 'hop', khoiCon: gt.map((v, i) => {
        const h = Math.max(6, (Math.abs(v) / dinh) * caoMax);
        return {
          id: 'cot' + i, hinh: 'hop',
          /* Cột mọc TỪ MỘT ĐÁY CHUNG lên, không phải cùng tâm. Căn theo tâm thì
             cột thấp lơ lửng giữa không trung và biểu đồ hết nghĩa. */
          x: -tongRong / 2 + w / 2 + i * (w + khe),
          y: -caoMax / 2 + h / 2,
          z: 0, rong: w, cao: h, day: sau,
          chuMat: { truoc: khoi.nhan?.[i] || '' },
          /* Nhãn phải nằm ở CHÂN cột. Căn giữa thì mỗi nhãn một độ cao khác
             nhau theo cột nó đứng, nhìn so le và không đọc thành một hàng —
             mà biểu đồ thì cái người ta đọc chính là hàng nhãn ấy. */
          chuODuoi: true,
          pha: 0.78 + 0.22 * (h / caoMax),
        };
      }) };
    }

    default:
      return { kieu: 'hop', khoiCon: [
        { id: 'hop', x: 0, y: 0, z: 0, rong, cao, day,
          chuMat: { truoc: khoi.chu || '' } },
      ] };
  }
}

/** Chiều cao thật của cả khối — để sân biết phải chừa bao nhiêu chỗ. */
export function caoTong(khoi = {}) {
  if (khoi.loai === 'bieu-do') return khoi.caoMax ?? 300;
  if (khoi.loai === 'gia-may-chu') {
    const tang = Math.max(1, Math.min(12, khoi.tang ?? 5));
    return tang * (khoi.cao ?? 46) + (tang - 1) * (khoi.khe ?? 12);
  }
  return khoi.cao ?? 220;
}
