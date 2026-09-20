/**
 * CẢNH MẪU CHO Ô XEM THỬ — một kịch bản tí hon, một món, sinh theo yêu cầu.
 *
 * Ô xem thử trong bảng chỉnh phải diễn bằng CHÍNH bộ dựng thật (luật trong
 * `BANG-CHINH-V2.md`). Bộ dựng nạp kịch bản qua `?scene=…`, và chỗ đó nhận cả
 * đường dẫn tuyệt đối:
 *
 *     const url = /^https?:|^\/​/.test(name) ? name : `scenes/${name}.json`;
 *
 * Nên chỉ cần một đường trả về kịch bản là xong — KHÔNG phải sửa
 * `scene-player.html` của dự án chung.
 *
 * VÌ SAO SINH Ở MÁY CHỦ, KHÔNG SINH Ở TRÌNH DUYỆT
 *
 *  1. Để **mượn** `validateScene` chứ không chép ra bản thứ hai (luật 7 trong
 *     `CLAUDE.md`). Ô xem thử mà diễn một kịch bản sai định dạng thì nó nói dối,
 *     và xem thử nói dối còn tệ hơn không có xem thử.
 *  2. Bộ dựng chỉ `fetch` được ĐƯỜNG DẪN. `blob:` và `data:` không lọt qua phép
 *     thử ở trên — chúng rơi vào nhánh `scenes/blob:….json` rồi 404.
 *  3. Một chỗ duy nhất định nghĩa món mẫu, thay vì rải trong giao diện.
 *
 * Đã cân nhắc và BỎ: ghi sẵn file cảnh mẫu vào `scenes/`. Làm vậy thì chúng hiện
 * lên trong danh sách clip của người dùng như clip thật.
 */
import { KHO_RA, KHO_VAO } from '../web/inspector/schema.js';
import { soatKichBan } from './proj.js';

/* Chữ mẫu CỐ ĐỊNH, giống hệt nhau ở mọi ô — quyết định của Quý, và đúng:
   để chữ là tên gói thì mỗi thẻ một bề ngang khác nhau, mắt hết so được chuyển
   động. Mà cả việc này sinh ra để so chuyển động, không phải so chữ. Nhãn tên
   gói đã nằm ngay cạnh ô rồi, viết lại vào trong là thừa. */
const CHU_MAU = 'Mắt Bão';

/** Khổ ô xem thử. Nhỏ thôi — mười mấy ô mở cùng lúc. */
const KHO = { width: 640, height: 360 };

const NEN = '#eef0f4';
const MUC = '#161f3c';

/**
 * Ba món mẫu.
 *
 * `khung` sinh ra vì **đẩy máy**: `el.push` phóng rất chậm suốt cả cảnh
 * (`DAY = [0, .03, .06, .10, .16]` trong bộ dựng — nhiều nhất 16%). Một thẻ chữ
 * đơn phóng 16% thì mắt gần như không thấy; phải có vài món trong khung, có mép
 * và khoảng cách giữa chúng, thì mới nhận ra máy đang đẩy vào.
 */
const MAU = {
  the: (m) => [
    /* KHÔNG dùng `place: 'giua'`. Nghe tên thì tưởng căn giữa, nhưng nó chỉ đặt
       khối chữ phủ khung trừ lề — chữ vẫn nằm SÁT MÉP TRÊN của khối. Trong một ô
       cao 110px thì trông như chữ bị đẩy lên góc. Đặt `y` tay cho nó thật sự nằm
       giữa: cao 360, cỡ chữ 72 → mép trên ở 144. */
    { kind: 'text', id: 'chu', x: 0, y: 144, w: KHO.width, align: 'center', size: 72,
      text: CHU_MAU, ...m },
  ],

  /* Đứng thay cho một tấm ảnh, nhưng KHÔNG dùng file ảnh nào: ô xem thử phải
     chạy được cả khi dự án clip đang trỏ sang một thư mục khác, nơi có thể
     không có đúng tấm ảnh ấy. `panel` do bộ dựng tự vẽ nên luôn có. */
  anh: (m) => [
    { kind: 'panel', id: 'khoi', x: 120, y: 80, w: 400, h: 200, fill: '#2f6bff', radius: 5, ...m },
  ],

  khung: (m) => [
    { kind: 'nen', id: 'nen', x: 0, y: 0, place: 'day', parts: ['cham', 'net'],
      in: { kind: 'fade', ease: 'out', dur: 0.4 } },
    { kind: 'text', id: 'chu', x: 64, y: 96, w: 360, size: 54, text: CHU_MAU, ...m },
    { kind: 'huyhieu', id: 'hh', x: 470, y: 78, w: 96, h: 96, mark: 'cup', ...m },
    { kind: 'nut', id: 'nut', x: 64, y: 210, label: 'Xem thử', size: 28, ...m },
  ],
};

const so = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

/* Chỉ những núm hiệu ứng bộ dựng THẬT SỰ đọc trên một món, kèm khoảng hợp lệ
   đúng bằng thang của nó. Danh sách trắng, không phải danh sách đen: thả cho
   truyền trường gì cũng được thì một tham số gõ sai sẽ lọt thẳng vào kịch bản. */
const NUM = {
  soft: [0, 5], softIn: [0, 5], shadow: [0, 5], maskSoft: [0, 5],
  push: [0, 4], pushOut: [0, 1],
};

/**
 * Dựng kịch bản cảnh mẫu.
 *
 * @param {object} y          tham số đã tách từ query
 * @returns {{doc:object, vanDe:string[]}}
 */
export async function canhMau(y = {}) {
  const mau = MAU[y.mau] ? y.mau : 'the';

  /* Tra gói theo id trong ĐÚNG kho mà giao diện đang bày, không nhận thẳng
     kind/ease/dur từ ngoài vào. Nhận thẳng thì ô xem thử diễn được cả những
     chuyển động không có trong kho — người dùng thấy rồi đi tìm, không thấy. */
  const goiVao = KHO_VAO.find((g) => g.id === y.vao);
  const goiRa = KHO_RA.find((g) => g.id === y.ra);

  const mon = {};
  if (goiVao) mon.in = { ...goiVao.m };
  if (goiRa) mon.out = { ...goiRa.m };
  for (const [k, [min, max]] of Object.entries(NUM)) {
    const v = so(y[k], min, max);
    if (v != null && v > 0) mon[k] = v;
  }

  /* Đẩy máy chạy suốt cả cảnh, nên cảnh phải đủ dài mới thấy. Cảnh thường thì
     ngắn cho vòng lặp quay nhanh. */
  const dai = so(y.dai, 0.6, 6) || (mon.push ? 2.6 : 1.6);

  const doc = {
    version: 1,
    meta: { name: 'xem-thu', ...KHO, density: 1, bg: NEN, ink: MUC,
      accent: '#2f6bff', accent2: '#6b4bf0', hot: '#f2701f', hot2: '#e42a24' },
    scenes: [{ id: 'c1', duration: dai, stagger: 0, elements: MAU[mau](mon) }],
  };

  /* MƯỢN bộ soát của dự án clip. Cảnh mẫu hỏng thì thà báo lỗi ra còn hơn để ô
     xem thử diễn một thứ không giống clip thật. */
  const vanDe = await soatKichBan(doc);
  return { doc, vanDe };
}
