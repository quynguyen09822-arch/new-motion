/**
 * HỎI AI VỀ CLIP ĐANG MỞ.
 *
 * Thanh prompt ở dưới cùng gọi vào đây. Khác `vietloi.js` ở chỗ: kia làm đúng
 * một việc (viết lời đọc), đây trả lời câu hỏi bất kỳ về clip.
 *
 * NGUYÊN TẮC: TRẢ LỜI DỰA TRÊN CLIP THẬT, KHÔNG PHÁN BỪA.
 *   Lời nhắc đưa vào toàn bộ bản tóm tắt clip — từng cảnh dài bao lâu, có món
 *   gì, chữ gì, rãnh tiếng nào, món nào có mốc chuyển động. Và nói rõ với model:
 *   không biết thì nói không biết, đừng bịa ra tính năng app không có.
 *
 *   Không làm vậy thì model sẽ hướng dẫn người dùng bấm những nút không tồn tại
 *   — kiểu hỏng tệ nhất, vì nghe rất thuyết phục.
 *
 * TRẢ LỜI NGẮN. Đây là một thanh nằm ngang dưới đáy màn hình, không phải khung
 * chat. Ba câu là hết chỗ. Bắt model viết dài rồi cắt ngang là thô.
 */
import { goiGemini } from './gemini.js';
import { tomTatClip, TIENG_MOI_GIAY } from './vietloi.js';

/** Những việc app THẬT SỰ làm được — để model khỏi hướng dẫn bấm nút không có. */
const LAM_DUOC = `- thêm/xoá/nhân bản cảnh và thành phần (24 loại: chữ, nút, thẻ, ảnh, phim,
  điện thoại, trình duyệt, biểu đồ, huy hiệu, bảng, chat…)
- 16 bộ dựng sẵn, bấm một cái ra nguyên một cụm đã bày
- chuyển động vào/ra với 12 kiểu đà, kể cả đường cong Bézier bốn số
- mốc chuyển động tự đặt (dời ngang, dời dọc, phóng to, xoay, rõ mờ)
- hiệu ứng: làm nhoè, nét dần, bóng đổ, đẩy máy chậm, hoà vào nền, mặt nạ
- chữ chạy từng ký tự (7 kiểu, có cả gõ như máy đánh chữ)
- rãnh tiếng: lời đọc, nhạc nền, tiếng động, có sóng âm và mờ vào/mờ ra
- giọng đọc AI (7 giọng Việt), nghe thử miễn phí
- đổi khổ hình, xuất video MP4/WebM/GIF/chuỗi ảnh PNG`;

const KHONG_LAM_DUOC = `- KHÔNG có timeline nhiều lớp kéo thả (đang làm dở)
- KHÔNG có 3D, hạt (particle), motion blur, luma matte
- KHÔNG tự tách nền vật thể, KHÔNG bám tracking
- KHÔNG tự đổi bố cục khi đổi khổ hình cho clip dựng bằng toạ độ cứng`;

function loiNhac(tom, doc, hoi) {
  const canh = tom.canh.map((c, i) =>
    `  Cảnh ${i + 1} (${c.id}) — ${c.giay.toFixed(1)}s — ${c.chu.length ? c.chu.join(' / ') : 'không có chữ'}`);

  /* Đếm những thứ KHÔNG nằm trong `tomTatClip`: loại món, mốc chuyển động, rãnh
     tiếng. Thiếu chúng thì model không trả lời được "clip này có gì" cho ra hồn. */
  const loai = {};
  let soMoc = 0;
  const di = (ds) => {
    for (const e of ds || []) {
      loai[e.kind] = (loai[e.kind] || 0) + 1;
      if (Array.isArray(e.keys) && e.keys.length) soMoc++;
      if (e.children) di(e.children);
    }
  };
  for (const c of doc?.scenes || []) di(c.elements);

  const ranh = (doc?.audio?.tracks || []).map((t) =>
    `  ${t.kind || 'nhac'} — ${(t.src || '').split('/').pop()} — từ giây ${t.at || 0}, to ${t.gain ?? 1}`);

  return `Bạn là trợ lý trong một app dựng clip. Người dùng KHÔNG rành kỹ thuật.

CLIP ĐANG MỞ
  Tên: ${tom.ten || '(chưa đặt)'}
  Khổ: ${doc?.meta?.width || '?'}×${doc?.meta?.height || '?'}
  Tổng: ${tom.giay.toFixed(1)} giây, ${tom.canh.length} cảnh
${canh.join('\n')}
  Thành phần: ${Object.entries(loai).map(([k, n]) => `${k}×${n}`).join(', ') || 'chưa có'}
  Món có mốc chuyển động: ${soMoc}
  Rãnh tiếng: ${ranh.length ? `\n${ranh.join('\n')}` : 'chưa có'}
  Tham chiếu: một bài lời đọc vừa khít clip này sẽ dài khoảng
  ${Math.floor(tom.giay * TIENG_MOI_GIAY)} tiếng. Đây là con số để đối chiếu khi
  được hỏi, KHÔNG phải một vấn đề của clip.

APP LÀM ĐƯỢC
${LAM_DUOC}

APP KHÔNG LÀM ĐƯỢC
${KHONG_LAM_DUOC}

CÂU HỎI
${String(hoi || '').trim()}

CÁCH TRẢ LỜI
- Tiếng Việt, xưng "bạn". Tối đa 3 câu ngắn, hoặc tối đa 4 gạch đầu dòng.
- Bám vào SỐ LIỆU của clip ở trên. Nói được con số thì nói con số.
- Không biết thì nói không biết. TUYỆT ĐỐI không bịa ra nút hay tính năng
  không nằm trong danh sách "app làm được".
- Không mở đầu bằng "Chào bạn", không kết bằng "Hy vọng giúp ích".
- Không markdown, không dấu sao, không emoji.`;
}

export async function hoiAI({ doc, hoi }) {
  const cau = String(hoi || '').trim();
  if (!cau) return { ok: false, cau: 'Chưa có câu hỏi nào.' };
  if (cau.length > 1200) return { ok: false, cau: 'Câu hỏi dài quá, viết ngắn lại giúp mình.' };
  const tom = tomTatClip(doc);
  if (!tom.canh.length) return { ok: false, cau: 'Mở một clip trước đã.' };

  /* Nhiệt thấp vì đây là việc trả lời theo số liệu, không phải việc sáng tác.
     `nghi: false` vì câu trả lời chỉ ba câu — để model nghĩ thì nó tiêu hết hạn
     mức token vào phần nghĩ rồi không còn chỗ để trả lời. */
  const g = await goiGemini(loiNhac(tom, doc, cau), { nong: 0.35, toiDa: 800, nghi: false });
  if (!g.ok) return { ok: false, cau: g.cau };
  return { ok: true, tra: g.chu, model: g.model, tutModel: g.vetXe };
}
