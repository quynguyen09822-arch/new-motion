/**
 * ĐỔI KHỔ HÌNH CỦA CLIP — nhân một hệ số, không xếp lại bố cục.
 *
 * ĐÂY LÀ MỘT PHÉP CO GIÃN THUẦN, và nó chỉ ĐÚNG khi TỈ LỆ KHÔNG ĐỔI:
 * 1280×720 → 1920×1080 là nhân 1,5; mọi món giữ nguyên chỗ tương đối, không
 * món nào thò ra, không chữ nào bé đi. Đo trên 11 clip: 0% dải trống, 0 món hỏng.
 *
 * Đổi sang tỉ lệ KHÁC thì phép này sai, và sai to: thu cho vừa 16:9 → 9:16 để
 * lại 68% khung là dải trống, và 301 món chữ tụt xuống dưới 11px. Đó không phải
 * bài toán co giãn mà là bài toán xếp lại bố cục — `tools/soi-doi-kho.mjs` đo
 * sẵn con số, và hàm này TỪ CHỐI làm, chứ không âm thầm bóp méo clip của người
 * dùng rồi để họ tự phát hiện.
 *
 * KHOÁ NÀO ĐƯỢC NHÂN: chỉ những khoá mang đơn vị ĐIỂM ẢNH. Nhân nhầm một khoá
 * mang đơn vị giây là clip chạy sai nhịp; nhân nhầm một khoá mang đơn vị BẬC là
 * khoảng thở phình gấp rưỡi rồi vỡ bố cục. Danh sách dưới đây soi từ dữ liệu
 * thật của 11 clip, không phải đoán.
 */

/** Khoá tính bằng điểm ảnh — nhân theo hệ số. */
const THEO_PX = ['x', 'y', 'w', 'h', 'radius', 'size', 'blur'];
/** Khoá tính bằng điểm ảnh, nằm trong `in` / `out`. */
const THEO_PX_CON = { in: ['dist'], out: ['dist'] };

/*
 * KHÔNG nhân, ghi ra đây cho người sau khỏi phải tự dò:
 *   at · for · in.dur · out.dur · draw · shine · lineStagger  → giây
 *   pad · gap · margin · soft · softIn · shadow · push        → bậc
 *   rotate                                                    → độ
 *   opacity · subScale · density                              → tỉ lệ
 *   rows · dots · days · slices · highlight                   → số đếm
 */

const lam = (v, s) => Math.round(v * s * 100) / 100;

/** Tỉ lệ hai khổ có coi như bằng nhau không? */
export function cungTiLe(w1, h1, w2, h2) {
  if (!w1 || !h1 || !w2 || !h2) return false;
  return Math.abs((w1 / h1) - (w2 / h2)) < 0.005;
}

function nhanMon(el, s) {
  for (const k of THEO_PX) if (typeof el[k] === 'number') el[k] = lam(el[k], s);
  for (const [cha, ds] of Object.entries(THEO_PX_CON)) {
    const o = el[cha];
    if (!o || typeof o !== 'object') continue;
    for (const k of ds) if (typeof o[k] === 'number') o[k] = lam(o[k], s);
  }
  // Khung nhấn (toạ độ trên ảnh mockup) cũng là điểm ảnh.
  if (Array.isArray(el.path)) {
    for (const p of el.path) {
      if (typeof p?.x === 'number') p.x = lam(p.x, s);
      if (typeof p?.y === 'number') p.y = lam(p.y, s);
    }
  }
  for (const con of el.children || []) nhanMon(con, s);
}

/**
 * Đổi khổ hình TẠI CHỖ trên một bản nháp của kịch bản.
 *
 * @returns {{ok: boolean, ly?: string, s?: number, soMon?: number}}
 *   `ok:false` kèm `ly` = lý do nói được thành câu cho người dùng đọc.
 */
export function doiKhoHinh(doc, rong, cao) {
  const m = doc?.meta;
  if (!m) return { ok: false, ly: 'Kịch bản này không có phần khai khổ hình.' };
  const W = m.width, H = m.height;
  if (!(rong > 0 && cao > 0)) return { ok: false, ly: 'Bề rộng và chiều cao phải là số lớn hơn 0.' };
  if (rong === W && cao === H) return { ok: false, ly: 'Clip đang ở đúng khổ này rồi.' };
  if (!cungTiLe(W, H, rong, cao)) {
    return {
      ok: false,
      ly: `Khổ mới ${rong}×${cao} khác TỈ LỆ so với ${W}×${H}. `
        + 'Co giãn thẳng sang tỉ lệ khác thì bố cục vỡ — phải xếp lại, không phải nhân một số. '
        + 'Chỗ này chưa làm.',
      khacTiLe: true,
    };
  }

  const s = rong / W;
  let soMon = 0;
  for (const canh of doc.scenes || []) {
    for (const el of canh.elements || []) { nhanMon(el, s); soMon++; }
  }
  m.width = rong;
  m.height = cao;
  return { ok: true, s, soMon };
}

/** Khổ gợi ý: giữ nguyên tỉ lệ hiện tại, đổi độ lớn. */
export function khoGoiY(rong, cao) {
  if (!rong || !cao) return [];
  const ngang = rong >= cao;
  const canh = [720, 1080, 1440, 2160];        // theo cạnh NGẮN
  return canh.map((c) => {
    const dai = Math.round((c * (ngang ? rong / cao : cao / rong)) / 2) * 2;
    const w = ngang ? dai : c;
    const h = ngang ? c : dai;
    const ten = { 720: '720p', 1080: '1080p · Full HD', 1440: '1440p · 2K', 2160: '2160p · 4K' }[c];
    return { w, h, ten: `${w} × ${h} — ${ten}` };
  });
}
