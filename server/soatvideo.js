/**
 * SOÁT "XEM ĐƯỢC TRONG VIDEO" — cho cảnh AI dựng từ một trang web.
 *
 * Sinh ra từ lần chạy thật 28/09 trên phần mở đầu của matbao.net, dựng vào khung
 * dọc 720×1280. AI làm đúng lời nhắc cũ — "nhân mọi toạ độ với 0,5" — và ra:
 * tiêu đề cỡ 20, chữ phụ cỡ 9, mọi thứ dồn vào 350px đầu khung. Rồi máy quay
 * phóng 1,4 vào GIỮA khung, cắt mất đúng dòng tiêu đề. `validateScene` bảo sạch,
 * soát tương phản bảo sạch — cảnh vẫn không xem được.
 *
 * Ba phép dưới đây đưa những lỗi ấy về cho AI sửa một lượt. KHÔNG chặn nhận cảnh
 * (cùng tinh thần `soat.js`: lời khuyên không bao giờ chặn), và CHỈ BÁO KHI CHẮC:
 * món dùng `place` thì bỏ qua — chỗ của nó do bộ dựng tính, đoán từ JSON là sai.
 *
 * Máy quay (đã đọc `#cam` trong `scene-player.html`: `transform-origin` giữa khung,
 * `scale(s) translate(-x,-y)`): vùng thấy được có TÂM ở (W/2 + x, H/2 + y), rộng
 * W/s, cao H/s.
 */

/** Cỡ chữ nhỏ nhất đọc được trong video, theo cạnh ngắn của khung. 720 → 24. */
export const chuNhoNhat = (meta) => Math.round(Math.min(meta.width, meta.height) * 0.033);
/** Tiêu đề phải to ít nhất chừng này. 720 → 50. */
export const tieuDeNhoNhat = (meta) => Math.round(Math.min(meta.width, meta.height) * 0.07);

function duyet(ds, f) {
  for (const e of ds || []) { f(e); duyet(e.children, f); }
}

const laNen = (e, meta) => e.kind === 'panel' && (e.place === 'day'
  || ((e.w ?? 0) >= meta.width * 0.95 && (e.h ?? 0) >= meta.height * 0.95));

/**
 * @returns {string[]} câu báo cho AI (rỗng = ổn)
 */
export function soatVideo(canh, meta) {
  const ra = [];
  if (!canh?.elements?.length || !meta?.width) return ra;
  const W = meta.width, H = meta.height;

  /* ① CHỮ ĐỦ TO. */
  const min = chuNhoNhat(meta);
  let lonNhat = 0;
  const nho = [];
  duyet(canh.elements, (e) => {
    if (e.kind !== 'text' || typeof e.size !== 'number') return;
    lonNhat = Math.max(lonNhat, e.size);
    if (e.size < min) nho.push(`${e.id} (${e.size})`);
  });
  if (nho.length) {
    ra.push(`Chữ quá nhỏ để đọc trong video: ${nho.slice(0, 6).join(', ')}. `
      + `Khung ${W}×${H} cần chữ ít nhất ${min}px — đừng thu nhỏ theo trang web, hãy bớt chữ và phóng to.`);
  }
  if (lonNhat && lonNhat < tieuDeNhoNhat(meta)) {
    ra.push(`Chữ lớn nhất chỉ cỡ ${lonNhat} — tiêu đề trong video phải từ ${tieuDeNhoNhat(meta)}px trở lên.`);
  }

  /* Món đặt bằng toạ độ (không `place`), ở tầng ngoài cùng, trừ tấm nền. */
  const toaDo = canh.elements.filter((e) => !e.place && !laNen(e, meta)
    && typeof e.x === 'number' && typeof e.y === 'number');
  const coPlace = canh.elements.some((e) => e.place && !laNen(e, meta));

  /* ② NẰM TRONG VÙNG MÁY QUAY THẤY. */
  const cam = canh.camera || {};
  const s = typeof cam.scale === 'number' && cam.scale > 0 ? cam.scale : 1;
  if (s > 1.02) {
    const cx = W / 2 + (cam.x || 0), cy = H / 2 + (cam.y || 0);
    const trai = cx - W / s / 2, phai = cx + W / s / 2, tren = cy - H / s / 2, duoi = cy + H / s / 2;
    const le = 8;
    const ngoai = toaDo.filter((e) => e.x < trai - le || e.y < tren - le || e.x > phai + le || e.y > duoi + le
      || (typeof e.w === 'number' && e.x + e.w > phai + le));
    if (ngoai.length) {
      ra.push(`Máy quay (scale ${s}, x ${cam.x || 0}, y ${cam.y || 0}) chỉ thấy vùng x ${Math.round(trai)}–${Math.round(phai)}, `
        + `y ${Math.round(tren)}–${Math.round(duoi)}; các món ${ngoai.slice(0, 6).map((e) => e.id).join(', ')} nằm ngoài vùng đó nên bị cắt mất. `
        + 'Hoặc dời máy quay ngắm vào nội dung, hoặc hạ scale, hoặc dời món vào trong.');
    }
  }

  /* ④ HAI CỤM NGOÀI CÙNG CÙNG DÙNG `place` — bộ dựng đặt từng cụm theo vùng
     của nó, KHÔNG biết cụm kia cao bao nhiêu. Cụm "giua" cao hơn nửa khung là
     đè xuống cụm "duoi". Đo thật 28/09: nút "Tìm tên miền" bị thẻ che nửa. */
  const cumPlace = canh.elements.filter((e) => e.place && !laNen(e, meta));
  if (cumPlace.length >= 2) {
    ra.push(`Có ${cumPlace.length} món ngoài cùng tự đặt vùng riêng (${cumPlace.map((e) => `${e.id}:${e.place}`).join(', ')}) — `
      + 'chúng sẽ chồng lên nhau. Gộp tất cả vào MỘT group dọc place "giua".');
  }

  /* ③ NỘI DUNG PHỦ KHUNG, không dồn một góc. Chỉ xét khi không món nào dùng
     `place` (có `place` là không biết chắc nó nằm đâu). */
  if (!coPlace && toaDo.length >= 2) {
    const day = Math.max(...toaDo.map((e) => e.y + (typeof e.h === 'number' ? e.h : 0)));
    const dinh = Math.min(...toaDo.map((e) => e.y));
    if (day - dinh < H * 0.45) {
      ra.push(`Nội dung chỉ chiếm dải y ${Math.round(dinh)}–${Math.round(day)} trong khung cao ${H} — `
        + 'dàn lại cho phủ khung (xếp dọc nếu khung dọc), đừng để trống hơn nửa khung.');
    }
  }
  return ra;
}
