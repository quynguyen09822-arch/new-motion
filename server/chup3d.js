/**
 * CHỤP ẢNH THAM CHIẾU TỪ XƯỞNG KHỐI NỔI.
 *
 * VIỆC NÀY ĐỂ LÀM GÌ. Xưởng 3D là hậu trường: bày bối cảnh, chốt góc máy, rồi
 * đưa cho AI dựng phim. Mà phần lớn công cụ dựng phim bằng AI nhận ĐẦU VÀO LÀ
 * MỘT TẤM ẢNH (ảnh → video), chứ không nhận toạ độ. Nên thứ phải xuất ra là
 * một tấm ảnh đúng khung hình, cộng câu tả góc máy đi kèm.
 *
 * VÌ SAO CHỤP Ở MÁY CHỦ CHỨ KHÔNG Ở TRÌNH DUYỆT. Cảnh dựng bằng CSS ba chiều.
 * Không có cách nào vẽ lại nó vào `<canvas>` để tải xuống: `html2canvas` và
 * mọi thư viện cùng loại đều KHÔNG dựng được `transform-style: preserve-3d` —
 * chúng vẽ ra một đống hình phẳng chồng nhau. Còn `Page.captureScreenshot` của
 * Chromium thì chụp đúng thứ mắt thấy, vì nó chụp sau khi trình duyệt đã dựng
 * xong. Máy chủ đã sẵn bộ Chromium cho `chuptrang.js`, dùng lại luôn.
 *
 * MỘT CHROMIUM MỘT LÚC cho cả máy chủ — mượn cùng cái khoá của `chuptrang.js`.
 * Hai bản chạy song song trên máy chủ dùng chung này là ăn hết RAM.
 */
import { randomBytes } from 'node:crypto';
import { timChromium, moChromium, noiCDP, xinCho, traCho } from './chuptrang.js';

const HAN_MS = 45_000;
/** Bề ngang ảnh xuất ra. 1280 vừa đủ cho mọi công cụ dựng phim bằng AI hiện
    nay, mà không tạo ra file nặng vài chục MB. */
export const RONG_XUAT = 1280;
const TOI_DA_MON = 60;

/** Soát cảnh gửi lên. Trình duyệt gửi gì cũng phải coi là không đáng tin. */
export function soatCanhChup(canh) {
  if (!canh || typeof canh !== 'object') return 'Chưa có cảnh nào để chụp.';
  if (!Array.isArray(canh.mon)) return 'Cảnh gửi lên không đúng dạng.';
  if (!canh.mon.length) return 'Cảnh đang trống — thêm ít nhất một món rồi hãy xuất.';
  if (canh.mon.length > TOI_DA_MON) return `Cảnh có ${canh.mon.length} món, quá ${TOI_DA_MON}.`;
  return null;
}

/**
 * Mở xưởng trong Chromium không đầu, nạp cảnh, chụp đúng phần trong khung hình.
 *
 * @param {{canh:object, goc:string, rong?:number}} p `goc` là địa chỉ máy chủ
 *   này (ví dụ `http://127.0.0.1:7803`) — chụp trang của chính mình nên không
 *   cần chặn mạng nội bộ như `chuptrang.js`.
 * @returns {Promise<{ok:true,anh:Buffer,rong:number,cao:number,ta:object}
 *   |{ok:false,cau:string,khongCo?:boolean}>}
 */
export async function chupKhung3D({ canh, goc, rong = RONG_XUAT }) {
  const loi = soatCanhChup(canh);
  if (loi) return { ok: false, cau: loi };
  const duong = timChromium();
  if (!duong) return { ok: false, khongCo: true, cau: 'Máy chủ không có trình duyệt để chụp ảnh.' };
  if (!await xinCho(20_000)) {
    return { ok: false, cau: 'Máy đang chụp một thứ khác — thử lại sau vài giây.' };
  }

  const cr = moChromium(duong);
  let cdp;
  const hetHan = setTimeout(() => { cdp?.dong(); cr.dong(); }, HAN_MS);
  try {
    cdp = await noiCDP(await cr.ws);
    const { targetId } = await cdp.goi('Target.createTarget', { url: 'about:blank' });
    const { sessionId: s } = await cdp.goi('Target.attachToTarget', { targetId, flatten: true });
    const g = (m, p) => cdp.goi(m, p, s);

    const loiJS = [];
    cdp.nghe((m) => {
      if (m.sessionId === s && m.method === 'Runtime.exceptionThrown') {
        loiJS.push(String(m.params.exceptionDetails?.exception?.description
          || m.params.exceptionDetails?.text || 'lỗi').slice(0, 200));
      }
    });
    await g('Runtime.enable');
    await g('Page.enable');
    /* Khung nhìn rộng rãi: khung hình chiếm 92% bề ngang, nên 1600 cho ra khung
       ~1472px — chụp xong thu về 1280 là vừa, không phải phóng to lên cho vỡ. */
    await g('Emulation.setDeviceMetricsOverride',
      { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

    const napXong = new Promise((xong) => {
      const bo = cdp.nghe((m) => {
        if (m.sessionId === s && m.method === 'Page.loadEventFired') { bo(); xong(); }
      });
      setTimeout(xong, 20_000);
    });
    const nav = await g('Page.navigate', { url: `${goc}/ba-chieu/` });
    if (nav.errorText) return { ok: false, cau: `Không mở được xưởng để chụp (${nav.errorText}).` };
    await napXong;

    const chay = async (bt) => {
      const r = await g('Runtime.evaluate', { expression: bt, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || 'lỗi trong trang');
      }
      return r.result.value;
    };

    /* Chờ xưởng dựng xong. Nạp phông chữ và mô-đun mất một nhịp; chụp sớm thì
       ra trang trắng mà không có lỗi nào cả. */
    await chay(`new Promise((ok, hong) => {
      const het = Date.now() + 15000;
      (function cho() {
        if (window.__bachieu) return ok(true);
        if (Date.now() > het) return hong(new Error('xưởng không khởi động'));
        setTimeout(cho, 80);
      })();
    })`);

    const kq = await chay(`(() => {
      document.body.classList.add('dang-chup');
      const k = window.__bachieu.napCanh(${JSON.stringify(canh)});
      const ta = window.__bachieu.taGocMay();
      const r = document.getElementById('san').getBoundingClientRect();
      return { khung: k, san: { x: r.left, y: r.top },
        ta: { cauV: ta.cauV, cauA: ta.cauA, lotTron: ta.lotTron, trongKhung: ta.trongKhung } };
    })()`);
    if (loiJS.length) return { ok: false, cau: `Xưởng báo lỗi khi nạp cảnh: ${loiJS[0]}` };

    /* Hai nhịp vẽ cho trình duyệt dựng xong hình ba chiều trước khi bấm máy. */
    await chay(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 180))))`);

    const k = kq.khung;
    const ti = Math.min(2, Math.max(0.25, rong / k.rong));
    const anh = Buffer.from((await g('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false, fromSurface: true,
      clip: { x: kq.san.x + k.tr, y: kq.san.y + k.tren, width: k.rong, height: k.cao, scale: ti },
    })).data, 'base64');

    return { ok: true, anh, ta: kq.ta,
      rong: Math.round(k.rong * ti), cao: Math.round(k.cao * ti),
      ten: `boi-canh-${randomBytes(4).toString('hex')}.png` };
  } catch (e) {
    return { ok: false, cau: `Không chụp được ảnh tham chiếu: ${String(e.message || e).slice(0, 200)}` };
  } finally {
    clearTimeout(hetHan);
    cdp?.dong();
    cr.dong();
    traCho();
  }
}
