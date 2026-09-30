/**
 * BỘ PHỐI MÀU CHO CLIP — chọn một cái là cả clip ăn khớp và đọc được.
 *
 * VÌ SAO CÓ FILE NÀY. Anh Quý gửi ảnh một clip bạc màu (29/09): nền xám, thẻ
 * xám hồng, chữ cam trên thẻ ấy — nhìn như bị phủ một lớp sương. Không có món
 * nào sai, không có lỗi nào được báo: từng màu đều "hợp lệ", chỉ là đặt cạnh
 * nhau thì không đọc được. Bảng thuộc tính có sáu ô màu rời và đúng MỘT bộ pha
 * sẵn (`MAU_MAT_BAO`), nên muốn có một clip nhìn tử tế thì phải tự pha sáu màu
 * — việc của người làm thiết kế, không phải của người dựng clip.
 *
 * PHÉP ĐO THÌ MƯỢN, KHÔNG VIẾT LẠI. `tuongPhan()` của `web/soat.js` đã đúng
 * công thức WCAG 2.1 và đang được bảng soát chất lượng dùng. Viết bản thứ hai ở
 * đây là tạo ra hai nơi nói hai kiểu về cùng một clip — đúng cái bẫy CLAUDE.md
 * dặn tránh với `banDoNen()`.
 *
 * NGƯỠNG. WCAG 2.1: chữ thường cần 4,5:1; chữ TO (từ 24px, hoặc 18,7px in đậm)
 * chỉ cần 3:1. Clip thì gần như toàn chữ to, nên dùng 3:1 cho tiêu đề và 4,5:1
 * cho chữ nhỏ — bắt mọi thứ phải 4,5 là loại luôn những phối màu đẹp và hợp lệ.
 */
import { tuongPhan } from './soat.js';

/** Chữ từ cỡ này trở lên được tính là "chữ to" theo WCAG. */
export const CO_CHU_TO = 24;
export const NGUONG_CHU_TO = 3;
export const NGUONG_CHU_THUONG = 4.5;

/** Ngưỡng cho một cỡ chữ cụ thể. */
export const nguongCho = (coChu, dam = false) =>
  ((coChu >= CO_CHU_TO || (dam && coChu >= 18.7)) ? NGUONG_CHU_TO : NGUONG_CHU_THUONG);

/**
 * CÁC BỘ PHỐI MÀU.
 *
 * Mỗi bộ khai đủ sáu màu của `meta`, cộng `giay` (màu thẻ/khối) và `vien`. Bộ
 * dựng tự suy `giay`/`vien` từ độ sáng của nền khi không khai — nhưng suy ra
 * thì luôn là một lớp trắng mờ trên nền, tức mọi thẻ đều cùng một sắc xám. Khai
 * thẳng thì thẻ có màu riêng và clip hết bạc.
 *
 * `moTa` là câu người dùng đọc để chọn, không phải tên kỹ thuật.
 */
export const BO_PHOI = [
  {
    id: 'mat-bao',
    ten: 'Mắt Bão',
    moTa: 'xanh đêm, nhấn xanh dương — bộ màu thương hiệu',
    mau: { bg: '#0A1F3C', ink: '#E8EDF5', accent: '#00A3FF', accent2: '#4A9EFF',
      hot: '#ED7225', hot2: '#E3272C', paper: '#122C4F', line: '#1E3D6B' },
  },
  {
    id: 'den-cam',
    ten: 'Đen · cam',
    moTa: 'nền đen thuần, chữ trắng, nhấn cam — hợp podcast và clip mạng xã hội',
    mau: { bg: '#000000', ink: '#FFFFFF', accent: '#FF7A2F', accent2: '#FFA366',
      hot: '#FF4D2E', hot2: '#FF7A2F', paper: '#141414', line: '#2A2A2A' },
  },
  {
    id: 'cyber',
    ten: 'Công nghệ',
    moTa: 'tím than, nhấn xanh ngọc — hợp sản phẩm phần mềm',
    mau: { bg: '#0B0F1A', ink: '#E6EDF7', accent: '#2DD4BF', accent2: '#60A5FA',
      hot: '#F472B6', hot2: '#A78BFA', paper: '#141A2A', line: '#243049' },
  },
  {
    id: 'toi-gian',
    ten: 'Tối giản sáng',
    moTa: 'nền trắng ngà, chữ đen, một màu nhấn — hợp bản trình bày',
    mau: { bg: '#F7F6F3', ink: '#14161A', accent: '#1D4ED8', accent2: '#3B82F6',
      hot: '#DC2626', hot2: '#EA580C', paper: '#FFFFFF', line: '#E3E1DC' },
  },
];

export const boTheoId = (id) => BO_PHOI.find((b) => b.id === id) || null;

/**
 * Soát một bộ phối: những cặp màu người xem THẬT SỰ nhìn thấy có đọc được không.
 *
 * Trả về danh sách chỗ hỏng, rỗng là đạt. Dùng cho bài kiểm — một bộ phối lọt
 * lưới là mọi clip dùng nó đều bạc, và không ai truy ra được gốc.
 */
export function soatBoPhoi(mau) {
  const ra = [];
  const xet = (ten, a, b, nguong) => {
    const tp = tuongPhan(a, b);
    if (tp == null) ra.push(`${ten}: đọc không ra màu (${a} / ${b})`);
    else if (tp < nguong) ra.push(`${ten}: ${tp.toFixed(2)}:1, dưới ${nguong}:1`);
  };
  xet('chữ trên nền clip', mau.ink, mau.bg, NGUONG_CHU_THUONG);
  xet('chữ trên thẻ', mau.ink, mau.paper || mau.bg, NGUONG_CHU_THUONG);
  /* Màu nhấn gần như luôn dùng cho chữ TO (tiêu đề, nút) nên xét ngưỡng 3:1. */
  xet('màu nhấn trên nền clip', mau.accent, mau.bg, NGUONG_CHU_TO);
  xet('màu nhấn trên thẻ', mau.accent, mau.paper || mau.bg, NGUONG_CHU_TO);
  xet('màu nóng trên nền clip', mau.hot, mau.bg, NGUONG_CHU_TO);
  return ra;
}

/**
 * Chọn màu chữ đọc được trên một nền cho trước.
 *
 * Thử lần lượt những màu ĐANG CÓ trong bộ phối trước khi rơi về trắng/đen —
 * giữ được tông của clip thay vì chen một màu lạ vào. Trả về màu tương phản tốt
 * nhất trong số đạt ngưỡng; không màu nào đạt thì trả trắng hoặc đen, cái nào
 * hơn.
 */
export function chuDocDuoc(nen, mau = {}, { coChu = 32, dam = false } = {}) {
  const nguong = nguongCho(coChu, dam);
  const ungVien = [mau.ink, mau.accent, mau.accent2, mau.hot, mau.hot2, '#FFFFFF', '#000000']
    .filter((x) => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x));
  let tot = null, tpTot = 0;
  for (const m of ungVien) {
    const tp = tuongPhan(m, nen);
    if (tp == null) continue;
    if (tp >= nguong) return m;              // đạt rồi thì lấy ngay, giữ đúng thứ tự ưu tiên
    if (tp > tpTot) { tot = m; tpTot = tp; }
  }
  return tot || '#FFFFFF';
}

/**
 * Câu mô tả bộ phối để nhét vào lời nhắc AI.
 *
 * Nói RÕ cặp nào đi với cặp nào, vì đó đúng là chỗ AI hay sai: nó lấy `mauChu`
 * của một khối và `fill` của khối khác rồi ghép lại, ra chữ chìm.
 */
export function loiNhacPhoi(mau) {
  return `BỘ MÀU CỦA CLIP — dùng ĐÚNG những màu này, đừng pha màu mới:
  nền clip ${mau.bg} · chữ ${mau.ink} · nhấn ${mau.accent}${mau.accent2 ? ` · nhấn 2 ${mau.accent2}` : ''}${mau.hot ? ` · nóng ${mau.hot}` : ''}${mau.paper ? `
  nền thẻ/khối ${mau.paper} · đường kẻ ${mau.line || mau.paper}` : ''}

CẶP MÀU AN TOÀN (đã đo, đọc được):
  · chữ trên nền clip: ${mau.ink} trên ${mau.bg}
  · chữ trên thẻ: ${mau.ink} trên ${mau.paper || mau.bg}
  · chữ nhấn (chỉ dùng cho chữ TO từ 24px): ${mau.accent}
Đặt \`fill\` cho thẻ thì PHẢI đặt \`ink\` của chữ bên trong theo đúng cặp trên.
Lấy màu chữ của cặp này ghép với nền của cặp kia là chữ chìm — đã xảy ra thật.`;
}

/**
 * BỘ MẶC ĐỊNH cho dự án mới — `server/duan.js` lấy thẳng từ đây.
 *
 * Gõ lại sáu màu ở chỗ khác là sớm muộn hai nơi lệch nhau, và bài kiểm đọc một
 * nơi trong khi người dùng nhận nơi kia.
 */
export const MAU_MAC_DINH = boTheoId('den-cam').mau;
