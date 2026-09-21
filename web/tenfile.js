/**
 * ĐỔI TÊN NGƯỜI GÕ THÀNH TÊN FILE — một luật, hai nơi chạy.
 *
 * File nằm trong `web/` vì trình duyệt phải tải được nó; Node import thẳng cũng
 * chạy vì nó không chạm `node:` lẫn `document`. Đúng cách `web/soat.js` đang
 * làm, và vì cùng một lý do:
 *
 *   Trang tạo dự án hiện ra "Tên file: giao-dien-moi" NGAY LÚC GÕ, còn máy chủ
 *   mới là chỗ quyết định tên thật. Hai nơi tính theo hai bản luật thì sớm muộn
 *   cũng lệch, và lệch ở đây nghĩa là người dùng thấy một tên rồi nhận một tên
 *   khác — không sai đến mức hỏng, nên không ai báo, nhưng công cụ đã nói dối.
 */

/**
 * Bỏ dấu bằng `normalize('NFD')` rồi cắt dấu thanh — KHÔNG tra bảng tay: bảng
 * tay bao giờ cũng sót một chữ, và chữ sót thì biến mất khỏi tên file chứ không
 * báo gì. Riêng `đ` phải xử riêng vì nó không phải `d` cộng dấu.
 *
 * Khuôn phải khớp `locSlug` trong `server/clips.js`: `^[a-z0-9][a-z0-9-]{0,48}$`.
 */
export function ganTen(ten) {
  const s = String(ten || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');
  /* Tên toàn dấu, toàn chữ Nhật, hay toàn biểu tượng thì rút gọn ra chuỗi rỗng.
     Đặt tên thay chứ đừng báo lỗi — người ta vừa gõ một cái tên hợp lệ với họ. */
  return /^[a-z0-9]/.test(s) ? s : '';
}
