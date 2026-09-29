/**
 * NỀN RIÊNG CHO TỪNG CẢNH.
 *
 * Bộ dựng chỉ có MỘT màu nền cho cả clip (`meta.bg`), đặt lên khung một lần. Mà
 * clip kể chuyện hay đổi nền theo đoạn — đen rồi trắng rồi đen. Sửa bộ dựng để
 * nghe `scene.bg` thì phải đụng vào `scene-player.html` của dự án chung, thứ ta
 * mượn chứ không sở hữu.
 *
 * Nên làm đúng như kit "Nền màu trơn" đã làm: một `panel` kín khung (`place:
 * 'day'`) nằm DƯỚI CÙNG cảnh. Bộ dựng đã hiểu nó, xuất video ra y hệt, không phải
 * dạy thêm gì. Mã món cố định `nen-canh` để tìm lại được và để `picker.js` bỏ
 * qua nó khi bấm vào chỗ trống — không thì bấm đâu cũng chọn trúng tấm nền.
 *
 * Hiện gần như tức thì (`fade` 0,01 giây): nền mà mờ dần lên thì nửa giây đầu
 * cảnh lộ màu nền clip, trông như chớp.
 */
export const NEN_CANH_ID = 'nen-canh';

/** Màu nền riêng của cảnh, hoặc `null` nếu cảnh dùng nền chung của clip. */
export function layNenCanh(canh) {
  const m = (canh?.elements || []).find((e) => e.id === NEN_CANH_ID);
  return m?.fill || null;
}

/**
 * Đặt (hoặc bỏ, khi `mau` rỗng) nền riêng của cảnh. Sửa thẳng vào `canh`.
 * @returns `canh`
 */
export function datNenCanh(canh, mau) {
  if (!canh) return canh;
  if (!Array.isArray(canh.elements)) canh.elements = [];
  const i = canh.elements.findIndex((e) => e.id === NEN_CANH_ID);
  if (!mau) {
    if (i >= 0) canh.elements.splice(i, 1);
    return canh;
  }
  if (i >= 0) {
    canh.elements[i].fill = mau;
    /* Ai đó kéo nó lên trên? Đưa về đáy — nền nằm trên món khác là che mất món. */
    if (i > 0) canh.elements.unshift(canh.elements.splice(i, 1)[0]);
    return canh;
  }
  canh.elements.unshift({
    kind: 'panel', id: NEN_CANH_ID, x: 0, y: 0, place: 'day',
    fill: mau, radius: 0, in: { kind: 'fade', ease: 'out', dur: 0.01 },
  });
  return canh;
}
