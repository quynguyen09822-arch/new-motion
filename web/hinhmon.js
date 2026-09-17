/**
 * HÌNH MINH HOẠ CHO KHO THÀNH PHẦN.
 *
 * Bảng chọn có 24 món và 16 bộ. Chỉ có tên với một dòng tả thì phải ĐỌC từng
 * dòng mới biết món nào là món nào — mà người ta mở bảng này ra là đang muốn
 * LƯỚT. Hình giải quyết đúng chỗ đó.
 *
 * VÌ SAO VẼ SƠ ĐỒ, KHÔNG CHỤP ẢNH THẬT:
 *
 *  · Chụp ảnh thật thì phải dựng từng món trong khung xem rồi chụp — 40 lần
 *    dựng mỗi lần mở bảng, giật cả giao diện. Bảng lớp đã phải dựng LƯỜI vì lý
 *    do đó (xem `anhnho.js`), mà đó mới chỉ là ảnh của món ĐÃ CÓ trong cảnh.
 *  · Món trong bảng chọn thì CHƯA TỒN TẠI — không có gì để mà chụp.
 *  · Và sơ đồ nói đúng thứ cần nói: hình DÁNG của món. Một tấm ảnh thật của
 *    "Thẻ" sẽ đầy chữ mẫu, làm người xem chú ý vào chữ chứ không vào dáng.
 *
 * Nét vẽ theo đúng lối wireframe: viền xám, đúng MỘT mảng màu nhấn cho phần
 * "ruột" của món. Nhìn là biết ngay món nào ra hình gì.
 */

/* Khung 56×40. Mọi hình vẽ trong đó, chừa 3px lề. */
const K = (than) => `<svg viewBox="0 0 56 40" class="hinh-mon" aria-hidden="true">${than}</svg>`;
const o = (x, y, w, h, r = 2, lop = 'v') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${lop}"/>`;
const v = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="v"/>`;
const tron = (cx, cy, r, lop = 'v') => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${lop}"/>`;
/* `d` = mảng đặc (màu nhấn) · `v` = nét viền xám */

const HINH = {
  text:     o(6, 12, 44, 5, 2, 'd') + o(6, 22, 30, 5),
  nut:      o(12, 14, 32, 12, 6, 'd'),
  chip:     o(14, 9, 28, 22, 4) + o(19, 15, 18, 5, 2, 'd'),
  hangnhan: o(4, 16, 14, 8, 4, 'd') + o(21, 16, 14, 8, 4) + o(38, 16, 14, 8, 4),
  huyhieu:  tron(28, 20, 11, 'd') + tron(28, 20, 5),
  logo:     o(8, 14, 12, 12, 3, 'd') + o(24, 16, 24, 4) + o(24, 23, 16, 3),

  panel:    o(8, 8, 40, 24, 3, 'd'),
  card:     o(8, 5, 40, 30, 3) + o(12, 10, 22, 4, 2, 'd') + o(12, 18, 32, 3) + o(12, 23, 24, 3) + o(12, 28, 16, 4, 2),
  table:    o(6, 8, 44, 24, 3) + v(6, 15, 50, 15) + v(6, 22, 50, 22) + v(24, 8, 24, 32),
  group:    o(10, 4, 36, 13, 2) + o(10, 21, 36, 13, 2) + o(14, 8, 20, 5, 2, 'd'),
  timeline: v(6, 20, 50, 20) + tron(10, 20, 3, 'd') + tron(23, 20, 3) + tron(36, 20, 3) + tron(49, 20, 3),

  image:    o(6, 8, 44, 24, 3) + `<path d="M10 28l9-9 6 6 7-8 14 11z" class="d"/>` + tron(17, 15, 2.5),
  video:    o(6, 8, 44, 24, 3) + `<path d="M24 14l12 6-12 6z" class="d"/>`,
  phone:    o(19, 3, 18, 34, 4) + o(22, 8, 12, 24, 1, 'd') + o(25, 5, 6, 1.5, 1),
  browser:  o(5, 7, 46, 26, 3) + v(5, 14, 51, 14) + tron(9, 10.5, 1.5) + tron(14, 10.5, 1.5) + o(24, 18, 18, 5, 2, 'd') + o(16, 26, 24, 3),

  form:     o(8, 5, 40, 30, 3) + o(12, 10, 16, 3) + o(12, 15, 32, 5, 2, 'd') + o(12, 23, 14, 3) + o(12, 28, 32, 5, 2),
  calendar: o(7, 6, 42, 28, 3) + v(7, 14, 49, 14) + o(13, 18, 6, 5, 1) + o(23, 18, 6, 5, 1, 'd') + o(33, 18, 6, 5, 1) + o(13, 26, 6, 5, 1) + o(23, 26, 6, 5, 1),
  upload:   `<rect x="7" y="7" width="42" height="26" rx="3" class="v dut"/>` + `<path d="M28 26V14m0 0l-5 5m5-5l5 5" class="d net"/>`,
  chat:     o(6, 6, 44, 28, 3) + o(11, 12, 22, 6, 3, 'd') + o(23, 22, 22, 6, 3),

  nen:      [0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => tron(11 + c * 8.5, 10 + r * 7, 1.6, c + r < 3 ? 'd' : 'v')).join('')).join(''),
  quydao:   `<ellipse cx="28" cy="20" rx="22" ry="11" class="v"/>` + tron(28, 20, 5, 'd') + tron(50, 20, 2.5, 'd'),
  wheel:    tron(28, 20, 15) + v(28, 5, 28, 35) + v(13, 20, 43, 20) + `<path d="M28 20L38.6 9.4A15 15 0 0 1 43 20z" class="d"/>`,
  shield:   `<path d="M28 4l14 5v10c0 9-6 14-14 17-8-3-14-8-14-17V9z" class="v"/>` + `<path d="M22 20l4 4 8-9" class="d net"/>`,
  sweep:    o(6, 8, 44, 24, 3) + `<path d="M16 32L30 8l6 0L22 32z" class="d"/>`,
  pointer:  `<path d="M20 8l16 15-7 1 4 8-3 1.5-4-8-6 4z" class="d"/>`,
};

/** Hình của một loại phần tử. Loại lạ thì trả ô trống có dấu hỏi. */
export function hinhMon(kind) {
  return K(HINH[kind] || (o(10, 8, 36, 24, 3) + `<text x="28" y="25" class="ch">?</text>`));
}

/**
 * Hình của một BỘ dựng sẵn — vẽ đúng BỐ CỤC của bộ, không vẽ từng món:
 * một vạch câu dẫn ở trên, món khoe ở dưới. Người xem cần biết bộ ấy bày ra
 * hình gì, chứ không cần biết nó gồm mấy phần tử.
 */
const HINH_KIT = {
  'mo-dau':    o(14, 6, 28, 5, 2, 'd') + o(16, 17, 10, 10, 3) + o(30, 19, 12, 3) + o(30, 24, 8, 3),
  'ket-cta':   o(10, 7, 36, 5, 2, 'd') + o(16, 20, 24, 11, 5, 'd'),
  'khoe-web':  o(12, 4, 32, 4, 2, 'd') + o(8, 12, 40, 22, 3) + v(8, 18, 48, 18) + o(22, 22, 14, 4, 2),
  'khoe-dt':   o(12, 4, 32, 4, 2, 'd') + o(22, 10, 14, 26, 3) + o(24, 14, 10, 18, 1, 'd'),
  'khoe-form': o(12, 4, 32, 4, 2, 'd') + o(10, 11, 36, 23, 3) + o(14, 16, 12, 3) + o(14, 21, 28, 4, 2, 'd') + o(14, 28, 20, 3),
  'khoe-ai':   o(12, 4, 32, 4, 2, 'd') + o(8, 11, 40, 23, 3) + o(12, 16, 18, 5, 3, 'd') + o(24, 25, 18, 5, 3),
  'ba-so':     o(12, 5, 32, 4, 2, 'd') + o(5, 15, 14, 18, 3) + o(21, 15, 14, 18, 3, 'd') + o(37, 15, 14, 18, 3),
  'bang-so':   o(12, 4, 32, 4, 2, 'd') + o(6, 11, 44, 23, 3) + v(6, 18, 50, 18) + v(6, 26, 50, 26) + v(26, 11, 26, 34),
  'bao-mat':   o(12, 3, 32, 4, 2, 'd') + `<path d="M28 10l11 4v7c0 7-5 11-11 13-6-2-11-6-11-13v-7z" class="v"/>` + `<path d="M23 22l4 4 7-8" class="d net"/>`,
  'nen-day-du': HINH.nen,
  'nen-toi-gian': [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => tron(15 + c * 9, 12 + r * 8, 1.5)).join('')).join(''),
  'nen-song':  o(4, 6, 48, 28, 3) + `<path d="M4 26q12-8 24 0t24 0v8H4z" class="d"/>`,
  'nen-luoi':  [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => tron(13 + c * 8, 11 + r * 8, 1.5, 'd')).join('')).join('') + v(40, 6, 52, 18) + v(44, 6, 52, 14),
  'nen-tang-truong': `<path d="M6 30l12-8 10 6 14-16" class="d net"/>` + o(40, 8, 10, 4, 2) + o(8, 32, 40, 2, 1),
  'nen-mau':   o(4, 6, 48, 28, 3, 'd'),
  'nen-phim':  o(4, 6, 48, 28, 3) + `<path d="M22 14l14 6-14 6z" class="d"/>`,
};

export function hinhKit(id) {
  return K(HINH_KIT[id] || (o(8, 8, 40, 24, 3) + o(14, 14, 24, 5, 2, 'd')));
}
