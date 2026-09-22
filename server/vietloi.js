/**
 * AI VIẾT LỜI ĐỌC cho một clip đã dựng xong.
 *
 * Đây KHÔNG phải "viết quảng cáo theo brief". Clip đã có sẵn: bao nhiêu cảnh,
 * mỗi cảnh dài mấy giây, trên hình đang hiện chữ gì. Việc của AI là viết lời
 * KHỚP với cái đã có — nói đúng lúc hình đang nói, và dừng đúng lúc hình dừng.
 *
 * VÌ SAO PHẢI ĐƯA THỜI LƯỢNG TỪNG CẢNH VÀO LỜI NHẮC
 *   Không đưa thì AI viết một đoạn hay ho dài 40 giây cho một clip 24 giây.
 *   Người dùng đọc thấy hay, bấm đọc, rồi mới phát hiện lời tràn quá phim — lúc
 *   đó đã tiêu ký tự rồi. Nên đưa số giây và nói thẳng nhịp nói tiếng Việt.
 *
 * NHỊP NÓI: tiếng Việt đọc thong thả khoảng 2,2 tiếng/giây, đọc nhanh 2,8.
 *   Lấy 2,3 làm chuẩn cho lời quảng cáo — đọc nhanh hơn thì nghe như đuổi.
 */
import { goiGemini } from './gemini.js';


export const TIENG_MOI_GIAY = 2.3;

/** Rút nội dung thật của clip: cảnh nào dài bao lâu, trên hình có chữ gì. */
export function tomTatClip(doc) {
  const canh = [];
  for (const c of doc?.scenes || []) {
    const chu = [];
    const di = (ds) => {
      for (const e of ds || []) {
        if (e.kind === 'text' && e.text) {
          chu.push(String(e.text).replace(/\s*\|\s*/g, ' ').replace(/\*/g, '').trim());
          if (e.sub) chu.push(String(e.sub).replace(/\*/g, '').trim());
        } else if (e.kind === 'nut' && e.label) chu.push(`[nút] ${String(e.label).trim()}`);
        else if (e.kind === 'browser' && e.url) chu.push(`[trình duyệt] ${e.url}`);
        if (e.children) di(e.children);
      }
    };
    di(c.elements);
    canh.push({ id: c.id, giay: c.duration || 0, chu: chu.filter(Boolean) });
  }
  return { ten: doc?.meta?.name || '', canh, giay: canh.reduce((t, c) => t + c.giay, 0) };
}

function loiNhac(tom, brief) {
  const dong = tom.canh.map((c, i) =>
    `  Cảnh ${i + 1} — ${c.giay.toFixed(1)} giây — trên hình: ${c.chu.length ? c.chu.join(' / ') : '(không có chữ)'}`);
  const tong = tom.giay;
  const tieng = Math.floor(tong * TIENG_MOI_GIAY);
  return `Bạn viết lời đọc (voice-over) tiếng Việt cho một clip quảng cáo ĐÃ DỰNG XONG.

CLIP ĐANG CÓ
  Tên: ${tom.ten || '(chưa đặt)'}
  Tổng: ${tong.toFixed(1)} giây, ${tom.canh.length} cảnh
${dong.join('\n')}

Ý MUỐN CỦA NGƯỜI DỰNG
${String(brief || '(không ghi gì thêm — cứ bám theo chữ trên hình)').trim()}

LUẬT VIẾT
1. Lời phải VỪA thời lượng. Cả bài tối đa khoảng ${tieng} tiếng (tiếng Việt đọc
   khoảng ${TIENG_MOI_GIAY} tiếng mỗi giây). Thà ngắn hơn chứ đừng dài hơn.
2. Mỗi cảnh một dòng, theo đúng thứ tự. Dòng nào cũng phải đọc lọt trong số giây
   của cảnh đó. Cảnh ngắn dưới 2 giây thì viết vài tiếng thôi, hoặc để trống.
3. ĐỪNG đọc lại y nguyên chữ đang hiện trên hình. Chữ trên hình để MẮT đọc, lời
   để TAI nghe — nói lại y hệt là thừa. Hãy nói phần mà hình không nói được.
4. Văn nói, câu ngắn, không sáo rỗng. Không dùng "đột phá", "giải pháp toàn diện",
   "tối ưu hoá trải nghiệm". Xưng hô trung tính.
5. Không emoji, không dấu ngoặc chú thích, không ghi tên cảnh. Chỉ lời để đọc.
6. Trả về ĐÚNG ${tom.canh.length} dòng, mỗi dòng một cảnh, không đánh số, không
   thêm lời dẫn nào trước hay sau.`;
}

/**
 * DỌN LỜI DẪN CỦA AI RA KHỎI LỜI ĐỌC.
 *
 * Lời nhắc đã dặn "không thêm lời dẫn nào trước hay sau", và phần lớn lượt thì
 * model nghe. Nhưng "phần lớn" không đủ: lời này đi thẳng vào máy đọc, nên một
 * lượt lọt là video có tiếng người đọc to rõ câu "Đây là lời đọc cho clip:" —
 * và nó còn tính tiền theo ký tự cho câu rác ấy.
 *
 * DỌN CÓ NGUYÊN TẮC, KHÔNG DỌN BỪA:
 *
 *   · Chỉ bỏ ở ĐẦU và CUỐI. Một câu mở bài thật của lời đọc có thể bắt đầu bằng
 *     "Đây là..." — bỏ mọi dòng khớp khuôn là ăn mất lời thật nằm giữa bài.
 *   · Dòng "Cảnh 1: …" thì CẮT TIỀN TỐ chứ không bỏ cả dòng: phần sau dấu hai
 *     chấm chính là lời đọc, bỏ đi là mất hẳn một cảnh.
 *   · Không bao giờ dọn xuống dưới `soCanh` dòng. Dọn quá tay thì clip thiếu
 *     lời ở cuối, mà lỗi ấy chỉ lộ ra lúc đã xuất video xong.
 */
const KHUON_DAN = new RegExp(
  '^\\s*(\\*\\*)?\\s*('
  + 'đây là|dưới đây (là|sẽ)|sau đây (là|sẽ)|lời đọc|voice-?over|kịch bản|bản lời'
  + '|chúc bạn|hy vọng|hi vọng|lưu ý|ghi chú|tôi (đã|xin)|mình (đã|xin)'
  + ')\\b', 'i',
);

/** Cắt tiền tố "Cảnh 3 —", "Cảnh 3:", "[Cảnh 3]" ở đầu dòng. */
const bocCanh = (d) => d
  .replace(/^\s*[[(]?\s*cảnh\s*\d+\s*[\])]?\s*[:—–-]?\s*/i, '')
  .replace(/^\s*\*\*\s*|\s*\*\*\s*$/g, '')
  .trim();

export function donLoi(chu, soCanh) {
  let dong = String(chu || '').split('\n')
    .map((x) => bocCanh(x.replace(/^\s*(\d+[.)]|[-•])\s*/, '')))
    .filter(Boolean);

  /* Gặm từ hai đầu vào, và dừng ngay khi chạm `soCanh` — còn đúng số dòng cần
     thì mọi thứ còn lại đều là lời thật, dù nó bắt đầu bằng chữ gì. */
  while (dong.length > soCanh && KHUON_DAN.test(dong[0])) dong.shift();
  while (dong.length > soCanh && KHUON_DAN.test(dong[dong.length - 1])) dong.pop();

  /* Dòng chỉ có dấu hai chấm ở cuối và không có nội dung gì sau nó là tiêu đề
     bỏ quên, vd "Lời đọc:". Cũng chỉ gỡ khi còn thừa dòng. */
  while (dong.length > soCanh && /:\s*$/.test(dong[0])) dong.shift();

  return dong;
}

export async function vietLoi({ doc, brief }) {
  const tom = tomTatClip(doc);
  if (!tom.canh.length) return { ok: false, cau: 'Clip này chưa có cảnh nào.' };

  const g = await goiGemini(loiNhac(tom, brief), { nong: 0.8, toiDa: 2048 });
  if (!g.ok) return { ok: false, cau: g.cau };
  const chu = g.chu;

  const dong = donLoi(chu, tom.canh.length);
  /* Đếm tiếng trên lời ĐÃ DỌN, không trên lời thô: ước thời gian đọc mà tính cả
     câu dẫn vừa bỏ đi thì nó dài hơn thực tế, và giao diện cảnh báo "lời quá
     dài" cho một bài vừa khít. */
  const soTieng = dong.join(' ').split(/\s+/).filter(Boolean).length;
  return {
    ok: true,
    loi: dong.join('\n'),
    soDong: dong.length,
    soCanh: tom.canh.length,
    soTieng,
    giayClip: tom.giay,
    // Ước thời gian đọc để giao diện cảnh báo TRƯỚC khi người dùng bấm đọc.
    giayDoc: Number((soTieng / TIENG_MOI_GIAY).toFixed(1)),
    model: g.model,
    // Nói ra khi phải tụt model — để biết model đầu bảng hỏng chốc lát hay dài ngày.
    tutModel: g.vetXe,
  };
}
