/**
 * VẼ THẬT RỒI ĐO — cảnh AI vừa dựng, trước khi đưa cho người dùng xem.
 *
 * VÌ SAO. AI viết JSON mà không thấy hình: nó không biết một câu 24px trong ô
 * rộng 600 xuống mấy dòng, nên không biết cụm dọc của nó cao bao nhiêu. Chạy
 * thật 28/09 trên phần mở đầu matbao.net (khung dọc 720×1280): cụm cao hơn
 * khung, tiêu đề và thẻ cuối bị cắt, chữ phụ tràn hai mép — mọi bộ soát đọc
 * JSON đều bảo sạch. CLAUDE.md §5.1 đã ghi sẵn bài học: "Đừng đoán hình học từ
 * JSON" — muốn biết thì vẽ ra mà đo. Đúng ý §24 của tài liệu đặc tả: dựng → vẽ →
 * so → sửa.
 *
 * CÁCH LÀM. Chromium trên máy chủ mở chính `scene-player.html` của máy chủ này
 * (bằng VÉ XUẤT VIDEO — đường vào đã có sẵn cho bộ xuất, không mở cửa nào mới),
 * nạp cảnh bằng `__clip.load()`, tua tới lúc mọi món đã vào xong, rồi đo khung
 * thật của từng món có chữ so với khung hình (đã tính máy quay).
 *
 * Chỉ báo cái CHẮC: món có chữ bị cắt khỏi khung hình, và hai món có chữ đè
 * lên nhau. Không đo được (không có Chromium, máy bận) thì im — đây là lời
 * khuyên thêm, không phải cửa chặn.
 */
import { taoVeXuat } from './dangnhap.js';
import { moChromium, noiCDP, chanNoiBo, timChromium, traCho, xinCho } from './chuptrang.js';

/** Chạy TRONG trang bộ dựng. Tự chứa — không tham chiếu biến ngoài. */
function doTrongTrang() {
  const st = document.getElementById('stage').getBoundingClientRect();
  const W = st.width, H = st.height;
  const ra = [];
  for (const n of document.querySelectorAll('.el')) {
    if (n.querySelector('.el')) continue;                 // chỉ món lá
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.3) continue;
    const chu = (n.innerText || '').replace(/\s+/g, ' ').trim();
    if (!chu) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    ra.push({ id: n.dataset.el, chu: chu.slice(0, 40),
      x: (r.left - st.left) / W, y: (r.top - st.top) / H, w: r.width / W, h: r.height / H });
  }
  return ra;
}

/**
 * @param goc  gốc máy chủ này, vd `http://127.0.0.1:3000`
 * @returns {Promise<string[]>} câu báo cho AI (rỗng = ổn hoặc không đo được)
 */
export async function doCanh({ goc, meta, canh, email }) {
  const duong = timChromium();
  if (!duong || !canh?.elements?.length) return [];
  if (!await xinCho(30_000)) return [];
  const cr = moChromium(duong);
  let cdp;
  const het = setTimeout(() => { cdp?.dong(); cr.dong(); }, 40_000);
  try {
    cdp = await noiCDP(await cr.ws);
    const { targetId } = await cdp.goi('Target.createTarget', { url: 'about:blank' });
    const { sessionId: s } = await cdp.goi('Target.attachToTarget', { targetId, flatten: true });
    const g = (m, p) => cdp.goi(m, p, s);
    /* Cảnh do AI viết có thể mang `src` ảnh chép từ trang lạ — kể cả địa chỉ nội
       bộ. Chặn như lúc chụp trang; riêng máy chủ này thì cho qua. */
    await chanNoiBo(cdp, s, { choPhep: new URL(goc).origin });
    await g('Page.enable');
    await g('Runtime.enable');
    await g('Emulation.setDeviceMetricsOverride',
      { width: meta.width, height: meta.height, deviceScaleFactor: 1, mobile: false });
    const ve = encodeURIComponent(taoVeXuat(email || ''));
    const napXong = new Promise((xong) => {
      const bo = cdp.nghe((m) => { if (m.sessionId === s && m.method === 'Page.loadEventFired') { bo(); xong(); } });
      setTimeout(xong, 15_000);
    });
    await g('Page.navigate', { url: `${goc}/clip/scene-player.html?ve=${ve}` });
    await napXong;

    const doc = { version: 1, meta, scenes: [{ ...canh, camera: canh.camera }] };
    const chay = async (bt) => {
      const r = await g('Runtime.evaluate', { expression: bt, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'lỗi');
      return r.result.value;
    };
    await chay(`(async () => {
      for (let i = 0; i < 50 && !window.__clip; i++) await new Promise(r => setTimeout(r, 100));
      __clip.pause && __clip.pause();
      __clip.load(${JSON.stringify(doc)});
      await __clip.ready();
      /* Tua tới gần cuối cảnh — lúc mọi món đã vào và máy quay đã tới nơi. */
      const c = __clip.scenes()[0];
      __clip.seek(Math.max(c.giua, c.start + c.duration - 0.5));
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`);
    const mon = await chay(`(${doTrongTrang.toString()})()`);
    return danhGia(mon);
  } catch {
    return [];
  } finally {
    clearTimeout(het);
    cdp?.dong();
    cr.dong();
    traCho();
  }
}

/** Phần tính — tách ra để bài kiểm gọi thẳng không cần trình duyệt. */
export function danhGia(mon) {
  const ra = [];
  const le = 0.005;
  const cat = mon.filter((m) => m.x < -le || m.y < -le || m.x + m.w > 1 + le || m.y + m.h > 1 + le);
  if (cat.length) {
    ra.push(`VẼ THẬT RA THÌ BỊ CẮT KHỎI KHUNG: ${cat.slice(0, 6).map((m) => `${m.id} ("${m.chu}")`).join(', ')}. `
      + 'Cả cụm đang cao/rộng hơn khung (hoặc máy quay phóng quá) — bớt món, rút chữ, giảm cỡ chữ '
      + 'phần phụ, hoặc hạ scale máy quay.');
  }
  const de = [];
  for (let i = 0; i < mon.length; i++) {
    for (let j = i + 1; j < mon.length; j++) {
      const a = mon[i], b = mon[j];
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (w <= 0 || h <= 0) continue;
      const nho = Math.min(a.w * a.h, b.w * b.h);
      if (nho > 0 && (w * h) / nho > 0.25) de.push(`${a.id} và ${b.id}`);
    }
  }
  if (de.length) {
    ra.push(`VẼ THẬT RA THÌ CHỮ ĐÈ LÊN NHAU: ${de.slice(0, 4).join('; ')}. Xếp lại cho chúng không chồng.`);
  }
  return ra;
}
