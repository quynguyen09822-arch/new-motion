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
 * Chỉ nhận hình GHÉP TỪ MẶT PHẲNG. Trình duyệt dựng được hình như vậy bằng
 * `transform-style: preserve-3d`, tức không mượn thư viện nào, và xuất phim
 * chạy đúng tốc độ cũ. Hình cong (quả địa cầu, ấm trà) phải chờ Giai đoạn 2 —
 * cố nặn hình cong bằng mặt phẳng thì ra thứ nhìn như đồ gấp giấy hỏng.
 * ------------------------------------------------------------------------- */

export const KHO_LOAI = [
  { id: 'hop',         ten: 'Hộp',          mo: 'khối sáu mặt — hộp sản phẩm, gói dịch vụ' },
  { id: 'the-lat',     ten: 'Thẻ lật',      mo: 'mặt trước lật sang mặt sau — trước / sau khi dùng' },
  { id: 'chu-noi',     ten: 'Chữ nổi',      mo: 'chữ có bề dày, như chữ khắc' },
  { id: 'gia-may-chu', ten: 'Giá máy chủ',  mo: 'nhiều tầng xếp chồng, nhìn chéo' },
  { id: 'logo-khoi',   ten: 'Logo khối',    mo: 'dấu hiệu thương hiệu trên cả sáu mặt' },
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

    default:
      return { kieu: 'hop', khoiCon: [
        { id: 'hop', x: 0, y: 0, z: 0, rong, cao, day,
          chuMat: { truoc: khoi.chu || '' } },
      ] };
  }
}

/** Chiều cao thật của cả khối — để sân biết phải chừa bao nhiêu chỗ. */
export function caoTong(khoi = {}) {
  if (khoi.loai === 'gia-may-chu') {
    const tang = Math.max(1, Math.min(12, khoi.tang ?? 5));
    return tang * (khoi.cao ?? 46) + (tang - 1) * (khoi.khe ?? 12);
  }
  return khoi.cao ?? 220;
}
