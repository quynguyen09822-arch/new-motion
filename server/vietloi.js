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

export async function vietLoi({ doc, brief }) {
  const tom = tomTatClip(doc);
  if (!tom.canh.length) return { ok: false, cau: 'Clip này chưa có cảnh nào.' };

  const g = await goiGemini(loiNhac(tom, brief), { nong: 0.8, toiDa: 2048 });
  if (!g.ok) return { ok: false, cau: g.cau };
  const chu = g.chu;

  const dong = chu.split('\n').map((x) => x.replace(/^\s*(\d+[.)]|[-•])\s*/, '').trim()).filter(Boolean);
  const soTieng = chu.split(/\s+/).filter(Boolean).length;
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
