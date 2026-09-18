/**
 * GỌI GEMINI — một cửa duy nhất cho mọi việc dùng Google AI Studio.
 *
 * CHUỖI MODEL XẾP THEO SỐ ĐO, KHÔNG THEO SỐ HIỆU PHIÊN BẢN.
 *
 * Đo ngày 17/09/2026 trong workspace này, cùng một lời nhắc:
 *   gemini-3.8-flash        503 — và mất 63,8 GIÂY mới chịu báo 503
 *   gemini-3.5-flash        503 — sau 31,8 giây
 *   gemini-2.5-flash        404 — API có liệt kê, gọi vào thì không có
 *   gemini-3.6-flash        200 — 4,9 giây
 *   gemini-3-flash-preview  200 — 1,56 giây
 *   gemini-3.1-flash-lite   200 — 2,08 giây
 *
 * Ba điều rút ra:
 *   1. Model MỚI NHẤT không phải model nên đặt đầu bảng. Nó hay quá tải, và tệ
 *      hơn là mất cả phút mới chịu nói mình quá tải.
 *   2. Danh sách model do API trả về CÓ NÓI DỐI. `gemini-2.5-flash` nằm trong
 *      danh sách kèm `generateContent`, gọi vào thì 404. Nên 404 cũng phải tụt
 *      sang model kế, không được coi là lỗi chết.
 *   3. Phải có HẠN GIỜ từng lượt. Không có thì một cái 503 chậm khoá cả chuỗi,
 *      và người dùng ngồi nhìn "đang nghĩ…" gần một phút.
 *
 * Với những việc ngôn ngữ ngắn ở đây, chênh lệch chất lượng giữa các model flash
 * là không đáng kể, còn chênh lệch 1,5 giây với 64 giây thì rất đáng kể.
 */
import { khoaGoogle } from './giong.js';

export const CHUOI_MODEL = [
  'gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-3.8-flash',
];

/* 12 giây: model chạy được trả lời trong 1,5–5 giây, nên 12 đã là gấp đôi khoảng
   rộng rãi. Để 20 thì mỗi lần tụt model tốn thêm 20 giây chờ vô ích. */
export const HAN_GIAY = 12;

/**
 * Gọi Gemini, tự tụt model khi model đầu bảng bận.
 *
 * `loiNhac` nhận CHUỖI (chỉ chữ) hoặc MẢNG PHẦN (chữ + ảnh):
 *   goiGemini('câu hỏi')
 *   goiGemini([{ text: '…' }, { inline_data: { mime_type: 'image/png', data: b64 } }])
 * @param nghi  cho model "nghĩ" trước khi trả lời hay không.
 *
 * TẮT PHẦN NGHĨ CHO NHỮNG CÂU TRẢ LỜI NGẮN. Đo được: hỏi một câu ngắn với hạn
 * 700 token thì model tiêu 671 token để NGHĨ, chỉ còn 25 token cho câu trả lời
 * — và phần lọt ra lại chính là dòng suy nghĩ nội bộ của nó ("**Output
 * Generation:** (Matches V…"), trông y như app hỏng. Tắt phần nghĩ: 0 token
 * nghĩ, 92 token trả lời, nhanh hơn và rẻ hơn.
 *
 * Việc sáng tác (viết lời đọc) thì để nghĩ — ở đó chất lượng đáng giá hơn.
 *
 * @returns { ok, chu, model, vetXe } hoặc { ok:false, cau }
 */
export async function goiGemini(loiNhac, { nong = 0.8, toiDa = 2048, nghi = true } = {}) {
  const kq = khoaGoogle();
  if (!kq.ok) return { ok: false, cau: kq.cau };

  const than = JSON.stringify({
    contents: [{ role: 'user', parts: Array.isArray(loiNhac) ? loiNhac : [{ text: loiNhac }] }],
    generationConfig: {
      temperature: nong,
      maxOutputTokens: toiDa,
      ...(nghi ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
    },
  });

  const vetXe = [];
  for (const m of CHUOI_MODEL) {
    const bo = new AbortController();
    const hen = setTimeout(() => bo.abort(), HAN_GIAY * 1000);
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(kq.k)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: than, signal: bo.signal });
      if (r.ok) {
        const d = await r.json();
        const ung = d.candidates?.[0];
        const chu = (ung?.content?.parts || []).map((p) => p.text || '').join('').trim();
        /* Chạm trần token thì thứ lọt ra KHÔNG phải câu trả lời — nó là dòng
           suy nghĩ nội bộ của model, cắt ngang giữa chừng. Trả nguyên cho người
           dùng là bày ra một đoạn chữ vô nghĩa mà trông như app hỏng. Coi như
           lượt này trượt, tụt sang model kế. */
        if (ung?.finishReason === 'MAX_TOKENS') { vetXe.push(`${m}:chạm trần token`); continue; }
        if (!chu) { vetXe.push(`${m}:trống`); continue; }
        return { ok: true, chu, model: m, vetXe: vetXe.length ? `${vetXe.join(' · ')} → dùng ${m}` : null };
      }
      await r.text();
      /* 503 quá tải · 429 hết lượt · 404 model không gọi được bằng khoá này —
         cả ba đều đáng tụt sang model kế. Mã khác (400 lời gọi sai, 403 khoá
         hỏng) thì tụt cũng vô ích: dừng luôn và nói thật. */
      if (![503, 429, 404].includes(r.status)) {
        return { ok: false, cau: `Google AI trả ${r.status} với ${m}.` };
      }
      vetXe.push(`${m}:${r.status}`);
    } catch (e) {
      vetXe.push(`${m}:${e.name === 'AbortError' ? `quá ${HAN_GIAY}s` : 'vỡ'}`);
    } finally { clearTimeout(hen); }
  }
  return { ok: false, cau: `Cả ${CHUOI_MODEL.length} model của Google AI đều không dùng được lúc này `
    + `(${vetXe.join(' · ')}). Thử lại sau vài phút.` };
}
