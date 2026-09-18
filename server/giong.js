/**
 * GIỌNG ĐỌC AI — danh sách giọng, nghe thử, và đọc lời thành file.
 *
 * KHOÁ KHÔNG BAO GIỜ RỜI KHỎI MÁY CHỦ.
 *   Trình duyệt chỉ gọi app của mình; app gọi ElevenLabs. Kể cả việc nghe thử
 *   cũng đi vòng qua đây chứ không đưa `preview_url` thẳng cho trình duyệt —
 *   không phải vì đường dẫn đó bí mật, mà vì làm vậy thì sau này đổi nhà cung
 *   cấp chỉ phải sửa một chỗ, và nhật ký của mình biết ai nghe cái gì.
 *
 * KHOÁ ĐỌC TỪ `.env` CỦA DỰ ÁN CLIP, không phải từ biến môi trường của tiến
 * trình. Lý do: người dùng sửa khoá bằng cách mở file đó ra sửa, rồi mong nó ăn
 * ngay — chứ không đi khởi động lại máy chủ. Nên đọc lại file mỗi lần, và nhớ
 * theo lần-sửa-file để khỏi đọc đĩa liên tục.
 *
 * NGHE THỬ MIỄN PHÍ, ĐỌC LỜI THÌ TÍNH TIỀN.
 *   ElevenLabs tính tiền theo KÝ TỰ. Mỗi giọng có sẵn một đoạn mẫu (`preview_url`)
 *   không tốn gì, nên nghe thử bao nhiêu lần cũng được. Còn đọc lời thật thì phải
 *   nói rõ số ký tự TRƯỚC khi bấm, không để người dùng vô tình đốt hết hạn mức.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PROJ } from './proj.js';

const THU_MUC_GIONG = path.join(PROJ, 'public', 'voice');
const NHO_MAU = path.join(PROJ, 'public', '.mau-giong');   // đoạn nghe thử tải về

let nhoEnv = { moc: 0, gt: {} };

/** Đọc `.env` của dự án clip. Trả về object — KHÔNG bao giờ ghi ra nhật ký. */
function docEnv() {
  const f = path.join(PROJ, '.env');
  if (!existsSync(f)) return {};
  const st = statSync(f);
  if (nhoEnv.moc === st.mtimeMs) return nhoEnv.gt;
  const gt = {};
  for (const dong of readFileSync(f, 'utf8').split('\n')) {
    const d = dong.trim();
    if (!d || d.startsWith('#') || !d.includes('=')) continue;
    const i = d.indexOf('=');
    let v = d.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    gt[d.slice(0, i).trim()] = v;
  }
  nhoEnv = { moc: st.mtimeMs, gt };
  return gt;
}

/**
 * Khoá ElevenLabs.
 *
 * Kiểm DẠNG chứ không chỉ kiểm khác rỗng: khoá thật bắt đầu bằng `sk_`. Người
 * dùng rất hay dán nhầm MÃ SỐ của khoá (một chuỗi cũng dài, cũng trông giống)
 * thay vì chính khoá, và lúc đó mọi lời gọi trả 401 với câu báo chung chung.
 */
export function khoaEleven() {
  const k = (docEnv().ELEVENLABS_API_KEY || '').trim();
  if (!k) return { ok: false, cau: 'Chưa khai ELEVENLABS_API_KEY trong .env của dự án clip.' };
  if (!k.startsWith('sk_')) {
    return { ok: false, cau: 'ELEVENLABS_API_KEY sai dạng — khoá thật bắt đầu bằng "sk_". '
      + 'Có thể bạn đã dán nhầm mã số của khoá thay vì chính khoá.' };
  }
  return { ok: true, k };
}

/** Khoá Google AI Studio. Tên biến trong `.env` đang viết sai chính tả — nhận cả hai. */
export function khoaGoogle() {
  const e = docEnv();
  const k = (e.gooogle_Ai_studio_API_key || e.GOOGLE_AI_STUDIO_API_KEY || e.GEMINI_API_KEY || '').trim();
  return k ? { ok: true, k } : { ok: false, cau: 'Chưa khai khoá Google AI Studio trong .env của dự án clip.' };
}

/* ---------- danh sách giọng ---------- */

/** Dấu ngăn giữa TÊN giọng và câu mô tả — mỗi nhà cung cấp dùng một kiểu. */
const NGAN_TEN = /\s*[|–—]\s*|\s+-\s+/;

let nhoGiong = null;

/**
 * Xếp giọng Việt lên đầu.
 *
 * Kho có 28 giọng mà chỉ 2 giọng đọc tiếng Việt thật. Bày theo thứ tự nhà cung
 * cấp trả về thì hai giọng đó nằm lẫn ở giữa, và người dùng sẽ chọn một giọng
 * Mỹ rồi thắc mắc vì sao đọc tiếng Việt nghe như người nước ngoài.
 */
function xepGiong(ds) {
  const diem = (v) => (v.nhan?.language === 'vi' ? 0 : /multilingual/i.test(v.mo || '') ? 1 : 2);
  return ds.sort((a, b) => diem(a) - diem(b) || a.ten.localeCompare(b.ten));
}

export async function dsGiong({ moi = false } = {}) {
  if (nhoGiong && !moi) return nhoGiong;
  const kq = khoaEleven();
  if (!kq.ok) return { ok: false, cau: kq.cau, giong: [] };
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': kq.k } });
  if (!r.ok) {
    // Đừng đoán hộ lý do. 401 có thể là khoá sai, hết hạn, hoặc hết hạn mức —
    // câu báo của nhà cung cấp nói đúng hơn bất kỳ phỏng đoán nào của mình.
    return { ok: false, cau: `ElevenLabs trả ${r.status}. ${(await r.text()).slice(0, 160)}`, giong: [] };
  }
  const d = await r.json();
  const giong = xepGiong((d.voices || []).map((v) => ({
    id: v.voice_id,
    /* Tên của nhà cung cấp hay kèm cả câu mô tả, mà mỗi người ngăn một kiểu:
       "Roger - Laid-Back…", "Quang Toan – Deep…", "Ngoc Nhien | Sweet & Warm…".
       Cắt ở CẢ BA dấu ngăn — chỉ cắt dấu gạch thì mấy giọng dùng dấu sổ đứng
       vẫn hiện nguyên câu dài và tràn khỏi hàng. */
    ten: String(v.name || '').split(NGAN_TEN)[0].trim() || v.name,
    mo: String(v.name || '').split(NGAN_TEN).slice(1).join(' · ').trim() || v.description || '',
    nhan: v.labels || {},
    viet: (v.labels || {}).language === 'vi',
  })));
  nhoGiong = { ok: true, giong };
  return nhoGiong;
}

/* ---------- nghe thử ---------- */

/**
 * Tải đoạn mẫu của một giọng về đĩa rồi phục vụ lại.
 *
 * Tải về chứ không chuyển tiếp thẳng: người dùng bấm nghe đi nghe lại để so
 * giọng, mà mỗi lần lại đi một vòng ra Internet thì chậm và phí. Đoạn mẫu không
 * bao giờ đổi nên nhớ mãi được.
 */
export async function mauGiong(id) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(id || ''))) return { ok: false, cau: 'Mã giọng không hợp lệ.' };
  mkdirSync(NHO_MAU, { recursive: true });
  const f = path.join(NHO_MAU, `${id}.mp3`);
  if (existsSync(f) && statSync(f).size > 1024) return { ok: true, f };

  const ds = await dsGiong();
  if (!ds.ok) return { ok: false, cau: ds.cau };
  const kq = khoaEleven();
  if (!kq.ok) return { ok: false, cau: kq.cau };
  const r0 = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': kq.k } });
  if (!r0.ok) return { ok: false, cau: `ElevenLabs trả ${r0.status}.` };
  const v = ((await r0.json()).voices || []).find((x) => x.voice_id === id);
  if (!v?.preview_url) return { ok: false, cau: 'Giọng này không có đoạn nghe thử.' };
  const r = await fetch(v.preview_url);
  if (!r.ok) return { ok: false, cau: `Tải đoạn mẫu hỏng (${r.status}).` };
  writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  return { ok: true, f };
}

/* ---------- đọc lời ---------- */

/** Tên file an toàn, không dấu, không khoảng trắng. */
function tenAnToan(g) {
  return String(g || 'loi').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).toLowerCase() || 'loi';
}

export const GIOI_HAN_KY_TU = 5000;

/**
 * Đọc một đoạn lời thành file mp3 trong `public/voice/`.
 *
 * `eleven_turbo_v2_5` + `language_code: 'vi'` là cặp đã đo là hợp nhất cho tiếng
 * Việt. Có một tật đã biết và KHÔNG chữa được bằng tham số: giọng đọc lẫn dấu
 * hỏi với dấu huyền ("bảng" nghe thành "bằng"). Chỗ nào nghĩa đổi theo dấu thì
 * phải nghe lại rồi viết chệch chính tả cho nó đọc đúng.
 */
export async function docLoi({ loi, giongId, model = 'eleven_turbo_v2_5', ten, toDo = 1 }) {
  const chu = String(loi || '').trim();
  if (!chu) return { ok: false, cau: 'Chưa có lời để đọc.' };
  if (chu.length > GIOI_HAN_KY_TU) {
    return { ok: false, cau: `Lời dài ${chu.length} ký tự, quá mức ${GIOI_HAN_KY_TU} cho một lần đọc. `
      + 'Cắt thành nhiều đoạn ngắn rồi đọc từng đoạn.' };
  }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(giongId || ''))) return { ok: false, cau: 'Chưa chọn giọng.' };
  const kq = khoaEleven();
  if (!kq.ok) return { ok: false, cau: kq.cau };

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${giongId}`, {
    method: 'POST',
    headers: { 'xi-api-key': kq.k, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: chu,
      model_id: model,
      language_code: 'vi',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: Math.max(0.7, Math.min(1.2, toDo)) },
    }),
  });
  if (!r.ok) return { ok: false, cau: `ElevenLabs trả ${r.status}. ${(await r.text()).slice(0, 200)}` };

  mkdirSync(THU_MUC_GIONG, { recursive: true });
  const goc = tenAnToan(ten || chu.slice(0, 40));
  let f = path.join(THU_MUC_GIONG, `${goc}.mp3`);
  let i = 2;
  // Không bao giờ ghi đè: lời đọc cũ có thể đang được một clip dùng.
  while (existsSync(f)) f = path.join(THU_MUC_GIONG, `${goc}-${i++}.mp3`);
  writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  return { ok: true, src: path.relative(PROJ, f), byte: statSync(f).size, kyTu: chu.length };
}
