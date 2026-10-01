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
  { id: 'nhan-vat',    ten: 'Nhân vật',     mo: 'linh vật Mắt Bão, ghép từ cầu và trụ' },
];

/**
 * MÀU CỦA LINH VẬT — trích thẳng từ ảnh gốc bằng thống kê màu trội, không chọn
 * bằng mắt. Chọn bằng mắt là mỗi lần mở lại ra một tông khác.
 */
export const MAU_LINH_VAT = {
  doTuoi: '#D81212',   // mũ trùm, bụng dưới
  doSam:  '#A30B2A',   // thân áo
  doChan: '#B00A20',   // chân
  xanhDen:'#121224',   // áo choàng, găng, giày
  da:     '#EAC6B4',   // mặt
  trangMat:'#F2F2F2',
  trongMat:'#12123A',
  longMay:'#15151C',
  vang:   '#E0A22E',   // khoá thắt lưng
  thatLung:'#2A1A1F',
};

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
    case 'nhan-vat':
      /* Ánh nền CAO (0,72) chứ không dùng mức mặc định 0,42. Linh vật là đồ
         nhựa bóng chụp trong hộp sáng, không phải tượng đá ngoài trời — để ánh
         nền thấp thì mặt và áo tối sầm, và nó thành một cục đất sét đỏ. */
      return { ...chung, co: 1.35,
        den: { ngang: -30, cao: 34, nen: 0.72 },
        dong: { kieu: 'lac-nhe', chuKy: 7 }, xoayNgang: -14, xoayDoc: 6 };
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

    case 'nhan-vat': {
      /* LINH VẬT GHÉP TỪ KHỐI CƠ BẢN.
       *
       * Nói thẳng điều này ra: đây KHÔNG phải bản sao của hình gốc. Hình gốc là
       * mặt cong hữu cơ, thứ mà ghép mặt phẳng không nặn lại được. Đây là bản
       * 3D kiểu ĐỒ CHƠI — giữ đúng tỉ lệ, dáng và màu, nên nhận ra ngay là ai,
       * nhưng mềm mại thì không bằng.
       *
       * Tỉ lệ chibi: đầu chiếm gần một nửa chiều cao. Đo từ ảnh gốc chứ không
       * ước lượng — sai tỉ lệ đầu/thân là mất ngay cái "dễ thương".
       *
       * Số mặt chia theo ĐỘ TO TRÊN MÀN HÌNH, không chia đều: mũ trùm 12×7 vì
       * nó to nhất, con mắt 7×4 vì chia mịn hơn cũng không ai thấy, chỉ tốn thẻ.
       */
      const M = MAU_LINH_VAT;
      const k = khoi.co ?? 1;
      const C = (x, y, z, ban, mau, vong, tang, pha) =>
        ({ id: `c${x}-${y}-${ban}`, hinh: 'cau', x: x * k, y: y * k, z: z * k,
          ban: ban * k, vong, tang, mauRieng: mau, ...(pha ? { pha } : null) });
      const T = (id, x, y, z, ban, cao, mau, vong) =>
        ({ id, hinh: 'tru', x: x * k, y: y * k, z: z * k,
          ban: ban * k, cao: cao * k, soMat: vong, mauRieng: mau });
      const H = (id, x, y, z, rong, cao, day, mau, chu, mauChu) =>
        ({ id, hinh: 'hop', x: x * k, y: y * k, z: z * k,
          rong: rong * k, cao: cao * k, day: day * k, mauRieng: mau,
          ...(chu ? { chuMat: { truoc: chu }, mauChu: mauChu || null } : null) });

      return { kieu: 'hop', khoiCon: [
        /* --- áo choàng: dựng TRƯỚC để nó nằm sau lưng trong thứ tự vẽ --- */
        H('choang-trai', -140, -96, -98, 156, 282, 14, M.xanhDen),
        H('choang-phai', 140, -96, -98, 156, 282, 14, M.xanhDen),

        /* --- chân và giày --- */
        T('chan-trai', -52, -208, 0, 30, 104, M.doChan, 10),
        T('chan-phai', 52, -208, 0, 30, 104, M.doChan, 10),
        H('giay-trai', -56, -276, 14, 88, 58, 118, M.xanhDen),
        H('giay-phai', 56, -276, 14, 88, 58, 118, M.xanhDen),

        /* --- thân --- */
        C(0, -118, 0, 108, M.doTuoi, 14, 8),          // bụng dưới, đỏ tươi
        C(0, -36, 0, 130, M.doSam, 16, 9),            // ngực, đỏ sẫm
        T('that-lung', 0, -74, 0, 124, 26, M.thatLung, 20),
        H('khoa', 0, -74, 118, 52, 38, 14, M.vang),
        /* Dấu xoáy trên ngực: đặt bằng CHỮ trên một tấm mỏng, không vẽ hình —
           vẽ xoáy bằng mặt phẳng thì tốn cả trăm thẻ cho một chi tiết bé. */
        H('dau-nguc', 0, -14, 132, 78, 78, 4, M.doSam, '◉', '#FFFFFF'),

        /* --- tay --- */
        C(-152, -20, 10, 46, M.xanhDen, 10, 6),
        C(152, -20, 10, 46, M.xanhDen, 10, 6),

        /* --- đầu --- */
        C(0, 150, 0, 150, M.doTuoi, 18, 10),           // mũ trùm
        C(-146, 146, -6, 46, M.doTuoi, 10, 6),         // chụp tai trái
        C(146, 146, -6, 46, M.doTuoi, 10, 6),          // chụp tai phải
        C(0, 124, 62, 104, M.da, 16, 10),              // mặt, đẩy ra trước
        C(-40, 150, 142, 33, M.trangMat, 10, 6),
        C(40, 150, 142, 33, M.trangMat, 10, 6),
        C(-43, 146, 167, 15, M.trongMat, 8, 5),
        C(43, 146, 167, 15, M.trongMat, 8, 5),
        H('may-trai', -44, 182, 130, 62, 14, 9, M.longMay),
        H('may-phai', 44, 182, 130, 62, 14, 9, M.longMay),

        /* --- chóp mũ --- */
        T('can-chop', 0, 322, 0, 5, 42, M.doTuoi, 8),
        C(0, 352, 0, 16, M.doTuoi, 8, 5),
      ] };
    }

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
  if (khoi.loai === 'nhan-vat') return 700 * (khoi.co ?? 1);
  if (khoi.loai === 'bieu-do') return khoi.caoMax ?? 300;
  if (khoi.loai === 'gia-may-chu') {
    const tang = Math.max(1, Math.min(12, khoi.tang ?? 5));
    return tang * (khoi.cao ?? 46) + (tang - 1) * (khoi.khe ?? 12);
  }
  return khoi.cao ?? 220;
}
