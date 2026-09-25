/**
 * SINH GIAO DIỆN BẰNG STITCH — tả bằng lời, nhận về HTML, rồi dựng thành cảnh.
 *
 * VÌ SAO LÀM ĐƯỢC MÀ KHÔNG PHÁ LUẬT ZERO-DEPENDENCY.
 *
 *   Stitch phơi ra một máy chủ MCP ở `https://stitch.googleapis.com/mcp`, và nó
 *   là **HTTP thuần + một khoá API** — không phải tiến trình con, không phải
 *   ống stdio, không cần SDK nào. MCP qua HTTP chỉ là JSON-RPC đặt trong thân
 *   POST. `fetch` có sẵn trong Node là đủ.
 *
 *   Đo thật (23/09/2026): máy chủ tự khai `serverInfo.name = "StatelessServer"`,
 *   và quả thật không đòi `Mcp-Session-Id` nào — mỗi lời gọi đứng một mình. Nên
 *   ở đây không phải giữ phiên, không phải bắt tay lại sau mỗi lần mất kết nối.
 *
 * VÌ SAO ĐI ĐƯỜNG HTML CHỨ KHÔNG ĐI ĐƯỜNG ẢNH.
 *
 *   Đưa AI một tấm ảnh chụp màn hình thì nó phải ĐOÁN: đệm bao nhiêu pixel, màu
 *   chính xác là gì, chữ viết gì ở chỗ bị che. Đưa HTML thì mở trong Chromium
 *   rồi hỏi `getComputedStyle` là trình duyệt ĐÃ TÍNH HỘ — ra `padding: 24px`,
 *   ra `rgb(0,105,72)`, không đoán một con số nào. Đo trên màn Stitch thật:
 *   100 khối, 58 khối chữ, toạ độ và màu chính xác từng cái.
 *
 * BA CON SỐ ĐỂ THIẾT KẾ GIAO DIỆN QUANH NÓ (đo 23/09/2026):
 *   · tạo dự án Stitch      ~2 giây
 *   · sinh một màn          ~71 giây   ← lâu nhất, và không rút ngắn được
 *   · đọc HTML ra bản đồ    ~4 giây
 *   · AI dựng thành cảnh    ~58 giây
 *   Tổng quãng 2 phút rưỡi. Quá lâu để bắt một yêu cầu HTTP nằm chờ — Traefik
 *   và mọi proxy đứng giữa đều cắt trước khi xong. Nên phải chạy nền rồi hỏi
 *   lại, và đó là lý do file này có sổ việc riêng ở cuối.
 */
import { layCauHinh } from './dangnhap.js';

const GOC_MCP = 'https://stitch.googleapis.com/mcp';

/** Sinh một màn mất ~71 giây. Hạn rộng gấp bốn để còn chỗ cho lúc Stitch bận. */
const HAN_SINH = 300_000;
const HAN_THUONG = 45_000;

/**
 * Khoá API. CHỈ đọc từ cấu hình của ứng dụng.
 *
 * KHÔNG đọc `.mcp.json` — file đó là cấu hình của Claude Code trên máy lập
 * trình viên, không phải của ứng dụng này. Đọc ké nó thì trên máy chủ thật
 * không có file ấy và tính năng chết lặng, mà lỗi lại chỉ ra ở chỗ chẳng liên
 * quan gì.
 */
export function layKhoa() {
  return layCauHinh('MOTION_STITCH_KEY').trim();
}

export function coKhoa() {
  return Boolean(layKhoa());
}

/**
 * Một lời gọi MCP. Trả `{ ok, kq }` hoặc `{ ok:false, cau }` — câu tiếng Việt,
 * không ném lỗi: chỗ gọi là một đường HTTP, mà ném ra đó thì người dùng nhận
 * một vệt stack trace.
 */
async function goiMCP(ten, thamSo, hanGiay = HAN_THUONG) {
  const khoa = layKhoa();
  if (!khoa) return { ok: false, cau: 'Chưa khai khoá Stitch (MOTION_STITCH_KEY).' };

  let r;
  try {
    r = await fetch(GOC_MCP, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': khoa,
        'Content-Type': 'application/json',
        /* Máy chủ được phép trả về dòng sự kiện thay vì JSON một cục. Không khai
           nhận cả hai thì nó có quyền từ chối ngay ở cửa. */
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
        params: { name: ten, arguments: thamSo },
      }),
      signal: AbortSignal.timeout(hanGiay),
    });
  } catch (e) {
    return { ok: false, cau: /timeout|abort/i.test(e.message)
      ? `Stitch không trả lời trong ${Math.round(hanGiay / 1000)} giây.`
      : `Không gọi được Stitch: ${e.message}` };
  }

  if (!r.ok) return { ok: false, cau: `Stitch trả về mã ${r.status}.` };

  let d;
  try { d = await r.json(); } catch { return { ok: false, cau: 'Stitch trả về thứ không phải JSON.' }; }

  if (d.error) return { ok: false, cau: `Stitch báo lỗi: ${d.error.message || 'không rõ'}` };
  const kq = d.result || {};
  /* `isError` nằm TRONG `result`, không phải ở `error` của JSON-RPC — lời gọi đi
     tới nơi và trả về đúng khuôn, chỉ là việc bên trong hỏng. Không đọc cờ này
     thì ta tưởng thành công rồi đi tìm HTML trong một kết quả rỗng. */
  if (kq.isError) {
    return { ok: false, cau: `Stitch: ${kq.content?.[0]?.text || 'việc không xong'}` };
  }
  return { ok: true, kq };
}

/** Tạo một dự án trên Stitch để chứa các màn sinh ra. */
export async function taoDuAn(ten = 'Motion') {
  const r = await goiMCP('create_project', { title: ten.slice(0, 80) });
  if (!r.ok) return r;
  const day = r.kq.structuredContent?.name || '';
  /* `create_project` trả tên ĐẦY ĐỦ ("projects/123…"), nhưng
     `generate_screen_from_text` lại đòi mã TRẦN. Đưa nguyên tên đầy đủ vào là
     nhận "Requested entity was not found" — một câu không hề gợi ý rằng lỗi nằm
     ở khuôn tham số. Đã mất một lượt gọi để biết điều này. */
  const ma = day.split('/').pop() || '';
  if (!ma) return { ok: false, cau: 'Stitch không trả về mã dự án.' };
  return { ok: true, ma, ten: day };
}

/** Lấy màn đầu tiên trong kết quả sinh, hoặc null. */
function bocMan(kq) {
  const sc = kq?.structuredContent || {};
  const phan = (sc.outputComponents || []).find((c) => c.design);
  return phan?.design?.screens?.[0] || null;
}

/**
 * Lời tả có đủ dùng không. Hàm THUẦN, gọi được ĐỒNG BỘ.
 *
 * Phải tách ra: phép kiểm này từng nằm trong `sinhMan`, tức là trong phần chạy
 * NỀN — nên đường HTTP trả về `ok: true` cho một lời tả hai chữ, hạn mức bị trừ
 * mất một lượt, và người dùng chỉ biết mình gõ thiếu sau khi hỏi lại. Kiểm
 * trước khi trừ tiền, không phải sau.
 */
export function soatLoiTa(y) {
  const loi = String(y || '').trim();
  if (loi.length < 10) {
    return { ok: false, cau: 'Tả kỹ hơn một chút — dưới mười chữ thì Stitch không đủ căn cứ.' };
  }
  if (loi.length > 4000) {
    return { ok: false, cau: 'Lời tả dài quá 4000 chữ. Rút gọn lại phần chính.' };
  }
  return { ok: true, loi };
}

/**
 * Tả bằng lời → một màn giao diện.
 *
 * @param y        lời tả, tiếng Việt
 * @param maDuAn   dự án Stitch để chứa màn; không có thì tự tạo một dự án mới
 * @param kieuMay  'DESKTOP' cho clip ngang, 'MOBILE' cho clip dọc
 * @param bao      gọi lại để báo chặng ra ngoài, vì lượt này rất lâu
 */
export async function sinhMan({ y, maDuAn = '', kieuMay = 'DESKTOP', bao = null }) {
  const soat = soatLoiTa(y);
  if (!soat.ok) return soat;
  const loi = soat.loi;

  let ma = maDuAn;
  if (!ma) {
    const d = await taoDuAn('Motion — màn dựng clip');
    if (!d.ok) return d;
    ma = d.ma;
  }

  /* Báo chặng TRƯỚC lượt gọi lâu nhất. Không báo thì màn hình đứng nguyên một
     dòng suốt hơn một phút rưỡi, và người dùng tưởng nó treo. */
  bao?.('Stitch đang vẽ giao diện — việc này mất khoảng một phút rưỡi');
  const r = await goiMCP('generate_screen_from_text',
    { projectId: ma, prompt: loi, deviceType: kieuMay }, HAN_SINH);
  if (!r.ok) return r;

  const man = bocMan(r.kq);
  if (!man) return { ok: false, cau: 'Stitch không dựng được màn nào từ lời tả này.' };

  const duongHtml = man.htmlCode?.downloadUrl;
  if (!duongHtml) return { ok: false, cau: 'Stitch dựng xong nhưng không kèm mã HTML.' };

  return {
    ok: true,
    maDuAn: ma,
    maMan: man.id || '',
    tieuDe: man.title || '',
    duongHtml,
    anhXem: man.screenshot?.downloadUrl || '',
    /* Stitch tự chọn phông và màu; trả ra để giao diện nói cho người dùng biết
       nó vừa chọn gì, thay vì để họ tự dò trong cảnh dựng xong. */
    phong: man.theme?.bodyFontFamily || '',
    mauNhan: man.theme?.customColor || '',
  };
}

/** Tải mã HTML của một màn đã sinh. */
export async function taiHtml(duongHtml) {
  try {
    const r = await fetch(duongHtml, { signal: AbortSignal.timeout(HAN_THUONG) });
    if (!r.ok) return { ok: false, cau: `Không tải được mã HTML (mã ${r.status}).` };
    const html = await r.text();
    if (!/<html|<body|<div/i.test(html)) {
      return { ok: false, cau: 'File tải về không phải HTML.' };
    }
    return { ok: true, html };
  } catch (e) {
    return { ok: false, cau: `Không tải được mã HTML: ${e.message}` };
  }
}

/* ─────────────────────────── SỔ VIỆC ───────────────────────────
 *
 * Cả quãng mất khoảng hai phút rưỡi, nên KHÔNG bắt yêu cầu HTTP nằm chờ: proxy
 * đứng giữa cắt trước khi xong, và người dùng nhận một lỗi mạng chẳng nói gì.
 * Bắt đầu rồi trả mã ngay; trình duyệt hỏi lại.
 *
 * KHÔNG dùng chung hàng đợi của `jobs.js`. Hàng đợi ấy cố ý MỘT SLOT vì
 * `export-video.mjs` để khung hình tạm theo cwd — hai lượt song song đẻ ra hai
 * video hỏng. Lượt gọi Stitch chỉ là chờ mạng, không có xung đột nào như thế;
 * nhét chung là bắt người muốn sinh giao diện xếp hàng sau một lượt xuất video
 * dài ba phút, không vì lý do gì.
 */
const soViec = new Map();
let demViec = 0;

/** Việc cũ quá thì dọn — sổ này nằm trong bộ nhớ, không để nó phình mãi. */
const SONG_MS = 30 * 60_000;
function donViecCu() {
  const nay = Date.now();
  for (const [id, v] of soViec) if (nay - v.xongLuc > SONG_MS && v.xongLuc) soViec.delete(id);
}

/**
 * Bắt đầu một lượt sinh giao diện. Trả `{ id }` ngay, chạy tiếp ở nền.
 *
 * Chặng báo ra bằng tiếng người, vì người dùng sẽ nhìn nó suốt hai phút: "Đang
 * vẽ giao diện" nói được điều gì đó, "generate_screen_from_text" thì không.
 */
export function batDauSinh({ y, kieuMay = 'DESKTOP', maDuAn = '' }) {
  /* Soát TRƯỚC khi mở việc. Đây là chỗ đường HTTP còn trả lời được ngay, và là
     chỗ duy nhất từ chối được mà chưa tốn lượt nào. */
  const soat = soatLoiTa(y);
  if (!soat.ok) return { ok: false, cau: soat.cau };

  donViecCu();
  const id = `st${++demViec}`;
  const v = {
    id, trangThai: 'chay', chang: 'Đang gửi lời tả cho Stitch',
    batDau: Date.now(), xongLuc: 0, kq: null, loi: null,
  };
  soViec.set(id, v);

  (async () => {
    const m = await sinhMan({ y, maDuAn, kieuMay, bao: (c) => { v.chang = c; } });
    if (!m.ok) {
      Object.assign(v, { trangThai: 'loi', loi: m.cau, xongLuc: Date.now() });
      return;
    }
    v.chang = 'Đang tải mã giao diện về';
    const h = await taiHtml(m.duongHtml);
    if (!h.ok) {
      Object.assign(v, { trangThai: 'loi', loi: h.cau, xongLuc: Date.now() });
      return;
    }
    Object.assign(v, {
      trangThai: 'xong', chang: 'Xong', xongLuc: Date.now(),
      kq: { html: h.html, tieuDe: m.tieuDe, anhXem: m.anhXem,
            phong: m.phong, mauNhan: m.mauNhan, maDuAn: m.maDuAn, maMan: m.maMan },
    });
  })().catch((e) => {
    Object.assign(v, { trangThai: 'loi', loi: `Hỏng giữa chừng: ${e.message}`, xongLuc: Date.now() });
  });

  return { ok: true, id };
}

/**
 * Hỏi một lượt đang tới đâu.
 *
 * `keHtml = false` thì KHÔNG gửi kèm mã HTML — nó cỡ 24 KB, mà trình duyệt hỏi
 * vài giây một lần suốt hai phút. Chỉ lần cuối mới cần đến nó.
 */
export function xemViec(id, { keHtml = false } = {}) {
  const v = soViec.get(id);
  if (!v) return { ok: false, ma: 404, loi: 'Không thấy lượt dựng này (có thể đã quá cũ).' };
  const ra = {
    ok: true, id: v.id, trangThai: v.trangThai, chang: v.chang,
    giay: Math.round((( v.xongLuc || Date.now()) - v.batDau) / 1000),
    loi: v.loi,
  };
  if (v.kq) {
    const { html, ...conLai } = v.kq;
    Object.assign(ra, conLai, { soByte: Buffer.byteLength(html) });
    if (keHtml) ra.html = html;
  }
  return ra;
}
