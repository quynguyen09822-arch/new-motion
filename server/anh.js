/**
 * ẢNH NGƯỜI DÙNG MANG VÀO — dán bằng Ctrl+V hoặc kéo từ ngoài thả vào khung hình.
 *
 * VÌ SAO PHẢI CÓ CHỖ CẤT RIÊNG.
 *   Bảng thuộc tính vốn chỉ nhận một ĐƯỜNG DẪN chữ (`public/ten-file.png`), tức
 *   là ảnh phải nằm sẵn trong dự án clip từ trước. Muốn dùng một tấm ảnh mới thì
 *   phải mở terminal, chép file vào máy chủ, rồi quay lại gõ đúng tên. Với người
 *   dùng của công cụ này thì đó là hết đường.
 *
 * CẤT Ở ĐÂU: `<kho của người đang đăng nhập>/anh/`.
 *   Chủ kho thì rơi vào `PROJ/anh/` — một thư mục MỚI trong dự án clip, không đè
 *   lên bất cứ file nào đang có. Luật cứng số 1 của repo là dự án clip không có
 *   git; ở đây ta chỉ THÊM file chưa từng tồn tại, không bao giờ ghi đè, nên
 *   không có gì để mất.
 *   Người kho riêng thì rơi vào `kho/<mã>/anh/`, tách hẳn — ảnh của người này
 *   không lọt sang kho người kia.
 *
 * TÊN FILE LÀ VÂN TAY NỘI DUNG, không phải tên gốc.
 *   Dán đi dán lại cùng một ảnh chụp màn hình là chuyện xảy ra suốt, và mỗi lần
 *   đẻ thêm một file thì thư mục phình lên bằng số lần Ctrl+V. Băm nội dung ra
 *   rồi lấy làm tên: dán lần thứ hai nhận lại đúng file cũ, không tốn thêm byte
 *   nào. Cũng khỏi phải lo tên gốc có dấu, có khoảng trắng, hay trùng nhau.
 *
 * KHÔNG TIN `mime` CLIENT KHAI.
 *   Trình duyệt khai gì ta nhận nấy thì ai cũng gửi được một file bất kỳ kèm
 *   nhãn `image/png`. Đọc mấy byte đầu ra mà nhận dạng — bốn định dạng ảnh đều
 *   có chữ ký riêng ở đầu file, kiểm mất vài dòng.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Trùng với mức `thaanh.js` nói ra ở giao diện — hai nơi lệch nhau là người
    dùng nhận một câu báo khác hẳn câu vừa được hứa. */
export const TOI_DA = 4 * 1024 * 1024;

/**
 * Nhận dạng ảnh bằng chữ ký ở đầu file.
 * @returns đuôi file ('.png'…) hoặc null nếu không phải ảnh ta nhận.
 */
export function doDinhDang(buf) {
  if (!buf || buf.length < 12) return null;
  const b = buf;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return '.png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return '.jpg';
  if (b.slice(0, 4).toString('latin1') === 'RIFF'
    && b.slice(8, 12).toString('latin1') === 'WEBP') return '.webp';
  if (b.slice(0, 6).toString('latin1') === 'GIF87a'
    || b.slice(0, 6).toString('latin1') === 'GIF89a') return '.gif';
  return null;
}

/** Thư mục ảnh của một kho. Không tự tạo — `luuAnh` tạo lúc cần. */
export function thuMucAnh(kho) {
  return path.join(kho.thuMuc, 'anh');
}

/**
 * Cất một tấm ảnh vào kho của người đang đăng nhập.
 *
 * @param than { b64 } — nội dung ảnh, chuỗi base64 (không có tiền tố `data:`)
 * @returns {{ok:true, src:string, ten:string, moi:boolean}} hoặc {{ok:false, ma, loi}}
 */
export function luuAnh(than, kho) {
  const b64 = String(than?.b64 || '').replace(/^data:[^,]*,/, '');
  if (!b64) return { ok: false, ma: 400, loi: 'Chưa có ảnh nào để lưu.' };

  let buf;
  try { buf = Buffer.from(b64, 'base64'); } catch { buf = null; }
  if (!buf?.length) return { ok: false, ma: 400, loi: 'Không đọc được nội dung ảnh.' };
  if (buf.length > TOI_DA) {
    return { ok: false, ma: 413,
      loi: `Ảnh nặng ${(buf.length / 1048576).toFixed(1)} MB, quá mức 4 MB. Thu nhỏ lại rồi thử lại.` };
  }

  const duoi = doDinhDang(buf);
  if (!duoi) {
    return { ok: false, ma: 415,
      loi: 'Đây không phải ảnh PNG, JPG, WebP hay GIF. Kiểm lại file rồi thử lại.' };
  }

  const ten = createHash('sha256').update(buf).digest('hex').slice(0, 16) + duoi;
  const thuMuc = thuMucAnh(kho);
  const dich = path.join(thuMuc, ten);

  /* Dán lại đúng tấm ảnh cũ thì KHÔNG ghi đè — nội dung giống hệt nhau nên ghi
     lại cũng ra file y như vậy, chỉ tốn một lượt đĩa. Trả về `moi: false` để
     giao diện nói được "ảnh này đã có sẵn". */
  if (existsSync(dich)) return { ok: true, src: `/anh/${ten}`, ten, moi: false };

  try {
    mkdirSync(thuMuc, { recursive: true });
    writeFileSync(dich, buf);
  } catch (e) {
    return { ok: false, ma: 500, loi: `Không ghi được ảnh vào kho: ${e.message}` };
  }
  return { ok: true, src: `/anh/${ten}`, ten, moi: true };
}

/**
 * Đường dẫn thật của một ảnh đã cất, hoặc null nếu tên không hợp lệ.
 *
 * Tên luôn là vân tay ta tự sinh, nên khuôn dưới đây khớp mọi tên hợp lệ và
 * chặn sạch `..`, dấu gạch chéo, tên tuyệt đối — không cần lọc đường dẫn thêm
 * một lớp nữa, và không có kẽ nào để lọt.
 */
export function duongAnh(ten, kho) {
  if (!/^[0-9a-f]{16}\.(png|jpg|webp|gif)$/.test(String(ten || ''))) return null;
  return path.join(thuMucAnh(kho), ten);
}
