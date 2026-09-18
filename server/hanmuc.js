/**
 * HẠN MỨC NGÀY cho những việc TỐN TIỀN, và nhật ký ai gọi bao nhiêu.
 *
 * VÌ SAO CẦN: đăng nhập rồi thì gọi `doc-loi` bao nhiêu lần cũng được, mỗi lần
 * trừ ký tự ElevenLabs. Một mật khẩu bị lộ, hoặc một vòng lặp viết sai trong
 * lúc thử, là đốt sạch hạn mức tháng trong vài phút — mà không ai biết cho tới
 * khi cần dùng thật thì hết.
 *
 * ĐẾM TRONG BỘ NHỚ, MẤT KHI KHỞI ĐỘNG LẠI. Nói thẳng ra vì đó là giới hạn thật:
 * ai khởi động lại máy chủ là bộ đếm về 0. Muốn chắc hơn thì phải ghi xuống đĩa,
 * nhưng như vậy cần chỗ ghi bền — mà bản chạy trong container thì chưa có.
 * Đây vẫn hơn hẳn không có gì: nó chặn được vòng lặp hỏng và cả người dùng
 * nghịch quá tay, là hai ca hay xảy ra nhất.
 *
 * ĐẾM THEO NGÀY THEO GIỜ VIỆT NAM, không theo UTC — "hôm nay" của người dùng
 * phải là hôm nay của họ, không phải hôm qua lúc 7 giờ sáng.
 */
const MUI_GIO_VN = 7 * 3600_000;
const so = new Map();          // 'ngày|loại|ai' → số đã dùng
let ngayDangDem = '';

const homNay = () => new Date(Date.now() + MUI_GIO_VN).toISOString().slice(0, 10);

function donNgayCu() {
  const n = homNay();
  if (n !== ngayDangDem) { so.clear(); ngayDangDem = n; }
}

/** Mặc định rộng rãi — đủ dùng cả ngày, nhưng chặn được vòng lặp hỏng. */
export const HAN = {
  kyTu: Number(process.env.MOTION_HAN_KY_TU_NGAY) || 20000,   // ký tự ElevenLabs
  goiAI: Number(process.env.MOTION_HAN_GOI_AI_NGAY) || 300,   // lượt gọi Gemini
  xuat: Number(process.env.MOTION_HAN_XUAT_NGAY) || 50,       // lượt xuất video
};

/**
 * Xin dùng `can` đơn vị của `loai`. Trả `{ ok }` hoặc `{ ok:false, cau }`.
 * KHÔNG trừ trước rồi hoàn lại: gọi hỏng thì coi như đã dùng — thà chặt hơn
 * mức cần một chút, còn hơn để một lỗi lặp vô hạn lách qua vì lần nào cũng hỏng.
 */
export function xin(loai, ai, can = 1) {
  donNgayCu();
  const tran = HAN[loai];
  if (!tran) return { ok: true };
  const k = `${homNay()}|${loai}|${ai || 'khong-ro'}`;
  const da = so.get(k) || 0;
  if (da + can > tran) {
    const ten = { kyTu: 'ký tự đọc lời', goiAI: 'lượt gọi AI', xuat: 'lượt xuất video' }[loai] || loai;
    return { ok: false, cau: `Hết hạn mức ${ten} hôm nay (${da}/${tran}). Thử lại ngày mai.` };
  }
  so.set(k, da + can);
  return { ok: true, da: da + can, tran };
}

/** Nhật ký một dòng cho mỗi việc tốn tiền — để sau này còn truy được ai làm gì. */
export function ghiNhat(loai, ai, can, them = '') {
  donNgayCu();
  const k = `${homNay()}|${loai}|${ai || 'khong-ro'}`;
  console.log(`[tiền] ${homNay()} ${loai} ${ai || 'khong-ro'} +${can} `
    + `(đã dùng ${so.get(k) || 0}/${HAN[loai] || '∞'})${them ? ' · ' + them : ''}`);
}

/** Đã dùng bao nhiêu hôm nay — để giao diện hiện cho người dùng thấy. */
export function daDung(ai) {
  donNgayCu();
  const ra = {};
  for (const loai of Object.keys(HAN)) {
    ra[loai] = { da: so.get(`${homNay()}|${loai}|${ai || 'khong-ro'}`) || 0, tran: HAN[loai] };
  }
  return ra;
}
