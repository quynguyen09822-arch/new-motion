/**
 * AI BÀY SẴN BỐI CẢNH 3D TỪ MỘT ẢNH MẪU.
 *
 * GỌI ĐÚNG TÊN ĐỂ KHỎI KỲ VỌNG SAI. Nó KHÔNG dựng lại cái ảnh. Gemini không
 * sinh được hình ba chiều; nó chỉ **chọn trong kho khối có sẵn rồi xếp đặt**.
 * Đưa ảnh một văn phòng vào thì nhận lại mấy khối hộp đứng đúng chỗ cái bàn
 * cái ghế — một BẢN PHÁC, không phải bản sao.
 *
 * Nhưng bản phác ấy đúng là phần tốn thời gian nhất khi bày tay: góc máy quay,
 * hướng đèn, bảng màu, và vật nào đứng đâu. Phác xong người dùng kéo chỉnh.
 *
 * MƯỢN NGUYÊN KHUÔN MẪU CỦA `dungcanh.js`, vì nó đã chạy thật:
 *   ① AI chỉ được ghép từ thành phần CÓ SẴN, không tự chế loại mới.
 *   ② Sinh xong bắt buộc qua bộ soát.
 *   ③ Sai thì trả NGUYÊN danh sách lỗi về cho nó tự sửa, đúng một lượt.
 *
 * ĐƯỜNG NỐI RA NGOÀI. File này đọc `bachieu/khoi.js` và `bachieu/canh.js` để
 * biết "một cảnh hợp lệ là gì". KHÔNG chép định nghĩa ấy sang đây: hai nơi
 * cùng nói về một thứ thì sớm muộn lệch nhau, rồi AI sinh ra thứ qua được cửa
 * này mà xưởng không mở nổi. Chiều nối là MỘT CHIỀU, `bachieu/` không biết gì
 * về `server/`.
 *
 * Mọi hàm ở đây THUẦN, trừ `bayTuAnh` — nhờ vậy `tools/kiem-bay-3d.mjs` đo
 * được bằng số mà không cần mạng và không cần khoá AI.
 */
import { goiGemini, HAN_GIAY_ANH } from './gemini.js';
import { KHO_LOAI, boCuc, caoTong, BO_PHOI } from '../bachieu/khoi.js';
import { MAY_MAC_DINH, soMatMon, NGUONG_MAT_NANG } from '../bachieu/canh.js';
import { DEN_MAC_DINH, beRongChiem } from '../bachieu/hinhhoc.js';

const ID_LOAI = KHO_LOAI.map((l) => l.id);
export const TOI_DA_MON = 24;

/* ---------------------------------------------------------------------------
 * LỜI NHẮC
 * ------------------------------------------------------------------------- */

/**
 * Soạn lời nhắc. Thuần, nên bài kiểm đọc được và canh được những điều BẮT BUỘC
 * phải có trong đó — thiếu một điều là AI sinh ra thứ xưởng không mở nổi.
 */
export function loiNhacBay3D({ dan = '', vanDeCu = [], canhCu = null } = {}) {
  const bang = KHO_LOAI.map((l) => `  · "${l.id}" — ${l.ten}: ${l.mo}`).join('\n');
  const mau = BO_PHOI.map((b) => `${b.mau.accent}`).join(' ');
  return `Bạn nhìn ảnh này rồi BÀY LẠI BỐI CẢNH của nó bằng các khối ba chiều có sẵn.

KHÔNG phải vẽ lại ảnh. Hãy phác: vật nào đứng đâu, to cỡ nào, màu gì, máy quay
đứng góc nào, đèn chiếu từ đâu. Người dùng sẽ kéo chỉnh sau.

CHỈ ĐƯỢC DÙNG NHỮNG LOẠI NÀY, không tự chế loại mới:
${bang}

HỆ TRỤC: x sang phải, y LÊN TRÊN, z hướng về phía người xem. Mặt y = 0 là MẶT
ĐẤT. Mọi vật phải ĐỨNG TRÊN ĐẤT, nghĩa là y bằng đúng một nửa chiều cao của nó.

Trả về ĐÚNG một khối JSON, không giải thích gì thêm:
{
  "may": { "ngang": -26, "doc": 28 },
  "den": { "ngang": -30, "cao": 40, "nen": 0.5 },
  "mon": [
    { "loai": "hop", "ten": "Bàn làm việc",
      "vi": { "x": 0, "y": 40, "z": 0 },
      "rong": 600, "cao": 80, "day": 300,
      "mau": "#8A5A3B", "xoayNgang": 0, "bo": 20 }
  ]
}

LUẬT:
  · "may.ngang" từ -180 đến 180, "may.doc" từ -85 đến 85 (28 là góc nhìn thường).
  · "den.cao" dương là đèn ở trên. "den.nen" từ 0,1 đến 0,9 — mặt khuất sáng cỡ nào.
  · "mau" viết dạng #rrggbb. Lấy màu THẬT trong ảnh. Gợi ý tông có sẵn: ${mau}
  · Kích thước tính bằng điểm ảnh, vật thường từ 100 đến 800.
  · Nhiều nhất ${TOI_DA_MON} món. Ít mà đúng hơn nhiều mà lộn xộn.
  · Mỗi món đặt "ten" bằng TIẾNG VIỆT theo thứ nó đại diện ("Bàn", "Màn hình").
  · Vật KHÔNG được chồng lên nhau trừ khi trong ảnh chúng thật sự chồng.
${dan ? `\nNGƯỜI DÙNG DẶN THÊM: ${dan}\n` : ''}${
    vanDeCu.length
      ? `\nBẢN TRƯỚC CỦA BẠN CÓ MẤY CHỖ HỎNG, SỬA LẠI:\n${vanDeCu.map((v) => `  · ${v}`).join('\n')}\n`
        + `Bản trước:\n${JSON.stringify(canhCu)}\n`
      : ''}`;
}

/* ---------------------------------------------------------------------------
 * BÓC JSON
 * ------------------------------------------------------------------------- */

/** AI hay bọc JSON trong ```json … ``` hoặc kèm lời dẫn. Bóc ra cho bằng được. */
export function bocJSON(chu) {
  const s = String(chu ?? '');
  const trong = s.replace(/```(?:json)?/gi, '');
  const d = trong.indexOf('{');
  const c = trong.lastIndexOf('}');
  if (d < 0 || c <= d) return null;
  try { return JSON.parse(trong.slice(d, c + 1)); } catch { return null; }
}

/* ---------------------------------------------------------------------------
 * CHUẨN HOÁ — sửa cái sửa được, đừng bắt AI chạy lại vì mấy chuyện vặt
 * ------------------------------------------------------------------------- */

const so = (v, mac) => (Number.isFinite(Number(v)) ? Number(v) : mac);
const kep = (v, a, b) => Math.max(a, Math.min(b, v));
const laMau = (m) => typeof m === 'string' && /^#[0-9a-f]{6}$/i.test(m);

/**
 * Lấp chỗ thiếu và kẹp số về khoảng dùng được.
 *
 * Gọi AI mất 30–90 giây. Bắt nó chạy lại chỉ vì quên khai `xoayDoc` hay vì
 * `den.nen` ghi 1,4 là phí một phút của người dùng — mấy thứ ấy sửa tại chỗ
 * được. Chỉ để dành vòng sửa cho lỗi THẬT: sai loại khối, cảnh rỗng, vật chồng
 * đống lên nhau.
 */
export function chuanHoa(tho) {
  const mon = (Array.isArray(tho?.mon) ? tho.mon : [])
    .filter((m) => m && ID_LOAI.includes(m.loai))
    .slice(0, TOI_DA_MON)
    .map((m, i) => {
      const r = {
        id: 'ai' + i + Math.random().toString(36).slice(2, 6),
        loai: m.loai,
        ten: (typeof m.ten === 'string' && m.ten.trim()) ? m.ten.trim().slice(0, 40) : null,
        mau: laMau(m.mau) ? m.mau : BO_PHOI[1].mau.accent,
        mauId: 'den-cam',
        den: null,
        xoayNgang: kep(so(m.xoayNgang, 0), -180, 180),
        xoayDoc: kep(so(m.xoayDoc, 0), -85, 85),
        nghieng: kep(so(m.nghieng, 0), -45, 45),
        bo: kep(so(m.bo, 0), 0, 100),
        vi: { x: so(m.vi?.x, 0), y: so(m.vi?.y, 0), z: so(m.vi?.z, 0) },
      };
      /* Chép sang những trường riêng của từng loại, CHỈ lấy số hợp lệ. */
      for (const k of ['rong', 'cao', 'day', 'ban', 'soMat', 'tang', 'khe',
        'coChu', 'soLop', 'rongCot', 'caoMax', 'co']) {
        if (m[k] != null && Number.isFinite(Number(m[k]))) r[k] = Number(m[k]);
      }
      for (const k of ['chu', 'chuSau']) if (typeof m[k] === 'string') r[k] = m[k].slice(0, 60);
      if (Array.isArray(m.cot)) r.cot = m.cot.map(Number).filter(Number.isFinite).slice(0, 12);
      if (Array.isArray(m.nhan)) r.nhan = m.nhan.map((x) => String(x).slice(0, 12)).slice(0, 12);
      if (!r.ten) r.ten = KHO_LOAI.find((l) => l.id === m.loai)?.ten || 'Món';
      /* NÂNG VẬT ĐANG CHÌM LÊN MẶT ĐẤT — nhưng CHỈ vật đang chìm.
         AI hay khai y = 0 cho mọi món, và thế là vật chìm nửa người xuống sàn,
         nhìn như đồ chơi rơi vào vũng bùn. Sửa tại chỗ, đừng tốn một lượt hỏi.
         Nhưng vật nằm CAO HƠN mặt đất thì để yên: đó có thể là thứ AI cố ý
         treo lên (đèn trần, biển hiệu, vật đang bay). Kéo tuột nó xuống là tự
         tay phá bố cục mà nó cố ý dựng — bài kiểm đã bắt đúng lỗi này. */
      const nua = caoTong(r) / 2;
      if (r.vi.y < nua - Math.max(8, nua * 0.15)) r.vi.y = Math.round(nua);
      return r;
    });

  return {
    mon,
    may: {
      ...MAY_MAC_DINH,
      ngang: kep(so(tho?.may?.ngang, MAY_MAC_DINH.ngang), -180, 180),
      doc: kep(so(tho?.may?.doc, MAY_MAC_DINH.doc), -85, 85),
    },
    den: {
      ngang: kep(so(tho?.den?.ngang, DEN_MAC_DINH.ngang), -180, 180),
      cao: kep(so(tho?.den?.cao, DEN_MAC_DINH.cao), -85, 85),
      nen: kep(so(tho?.den?.nen, DEN_MAC_DINH.nen), 0.08, 0.92),
    },
  };
}

/* ---------------------------------------------------------------------------
 * SOÁT — chỉ những lỗi KHÔNG sửa tại chỗ được
 * ------------------------------------------------------------------------- */

/**
 * Trả danh sách chỗ hỏng để ném lại cho AI sửa. Rỗng là nhận được.
 *
 * Mỗi câu phải nói AI PHẢI LÀM GÌ, không chỉ nói nó sai — "sai định dạng" thì
 * lượt sửa cũng sai y như lượt đầu.
 */
export function soatCanhAI(canh, tho) {
  const ra = [];
  if (!canh?.mon?.length) {
    const co = Array.isArray(tho?.mon) ? tho.mon.length : 0;
    ra.push(co
      ? `Cả ${co} món đều khai "loai" không có thật. Chỉ được dùng: ${ID_LOAI.join(', ')}.`
      : 'Không có món nào. Phải trả về ít nhất một món trong "mon".');
    return ra;
  }
  const bo = (Array.isArray(tho?.mon) ? tho.mon : []).filter((m) => m && !ID_LOAI.includes(m.loai));
  if (bo.length) {
    ra.push(`${bo.length} món khai "loai" không có thật (${[...new Set(bo.map((m) => String(m.loai)))].slice(0, 4).join(', ')}). `
      + `Chỉ được dùng: ${ID_LOAI.join(', ')}.`);
  }

  /* VẬT CHỒNG ĐỐNG LÊN NHAU. Đây là kiểu hỏng hay gặp nhất: AI trả mọi món ở
     x = 0 vì nó lo tả nội dung mà quên bày. Không sửa tại chỗ được — tự dời ra
     là phá luôn bố cục mà nó cố ý đặt. */
  const dong = [];
  for (let i = 0; i < canh.mon.length; i++) {
    for (let j = i + 1; j < canh.mon.length; j++) {
      const a = canh.mon[i], b = canh.mon[j];
      const can = (beRongChiem(a) + beRongChiem(b)) / 2;
      const xa = Math.hypot(a.vi.x - b.vi.x, a.vi.z - b.vi.z);
      if (xa < can * 0.35) dong.push(`${a.ten} và ${b.ten}`);
    }
  }
  if (dong.length) {
    ra.push(`${dong.length} cặp vật chồng lên nhau (${dong.slice(0, 3).join('; ')}). `
      + 'Dời chúng ra, khoảng cách giữa hai vật ít nhất bằng nửa tổng bề ngang của chúng.');
  }

  /* CẢNH QUÁ NẶNG. Ngưỡng lấy từ `canh.js`, không gõ lại con số ở đây. */
  const mat = canh.mon.reduce((s, m) => s + soMatMon(m, boCuc), 0);
  if (mat > NGUONG_MAT_NANG) {
    ra.push(`Cảnh nặng quá (${mat} mảnh, trần là ${NGUONG_MAT_NANG}). `
      + 'Bớt món, hoặc hạ "soMat" của ống trụ và bỏ bớt món "nhan-vat".');
  }

  /* CẢ CẢNH BÉ TÍ hoặc TO QUÁ KHỔ — AI hay nhầm đơn vị, khai theo mét hoặc
     theo phần trăm. Sửa tại chỗ thì phải đoán, mà đoán sai là hỏng tỉ lệ. */
  const rong = Math.max(...canh.mon.map((m) => beRongChiem(m)));
  if (rong < 40) ra.push(`Vật to nhất chỉ ${Math.round(rong)} điểm ảnh — quá bé. Kích thước tính bằng ĐIỂM ẢNH, vật thường từ 100 đến 800.`);
  if (rong > 6000) ra.push(`Vật to nhất tới ${Math.round(rong)} điểm ảnh — quá khổ. Vật thường từ 100 đến 800.`);
  return ra;
}

/* ---------------------------------------------------------------------------
 * GỌI AI — phần duy nhất chạm mạng
 * ------------------------------------------------------------------------- */

/**
 * @param {{anh:string, mime:string, dan?:string}} y  `anh` là base64, không kèm tiền tố data:
 * @returns {{ok:true, canh, model, daSua, vanDe}} hoặc {{ok:false, cau}}
 */
export async function bayTuAnh({ anh, mime = 'image/png', dan = '' } = {}) {
  if (!anh) return { ok: false, cau: 'Chưa chọn ảnh.' };

  const goi = async (vanDeCu = [], canhCu = null) => {
    const g = await goiGemini(
      [{ text: loiNhacBay3D({ dan, vanDeCu, canhCu }) },
        { inline_data: { mime_type: mime, data: anh } }],
      /* Hạn rộng vì lượt này GỬI KÈM ẢNH: model phải nhìn, đo, rồi sinh vài
         nghìn token JSON. Hạn 12 giây mặc định là mọi model đều quá hạn, và
         người dùng chỉ thấy "AI dở" chứ không biết nó chưa kịp trả lời. */
      { nong: 0.4, toiDa: 8000, nghi: true, hanGiay: HAN_GIAY_ANH },
    );
    if (!g.ok) return { loi: g.cau };
    const tho = bocJSON(g.chu);
    if (!tho) return { loi: 'AI trả về thứ không phải JSON.', model: g.model };
    return { tho, canh: chuanHoa(tho), model: g.model };
  };

  let r = await goi();
  if (r.loi) return { ok: false, cau: r.loi };

  let vanDe = soatCanhAI(r.canh, r.tho);
  let daSua = false;
  if (vanDe.length) {
    /* Cho đúng MỘT lượt sửa. Sai hai lần thì lượt ba cũng không khá hơn, mà
       người dùng đã chờ gần ba phút. */
    const r2 = await goi(vanDe, r.tho);
    if (!r2.loi && r2.canh) {
      const v2 = soatCanhAI(r2.canh, r2.tho);
      if (v2.length < vanDe.length) { r = r2; vanDe = v2; daSua = true; }
    }
  }

  if (!r.canh.mon.length) {
    return { ok: false,
      cau: 'AI không bày được món nào từ ảnh này. Thử ảnh rõ hơn, hoặc dặn thêm '
        + 'cho nó biết cần lấy phần nào.' };
  }
  return { ok: true, canh: r.canh, model: r.model, daSua, vanDe };
}
