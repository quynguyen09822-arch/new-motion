/**
 * CHỤP TRANG BẰNG TRÌNH DUYỆT THẬT — phần máy chủ của ô ② "Có sẵn mã HTML hoặc
 * địa chỉ trang".
 *
 * VÌ SAO KHÔNG ĐO TRONG TRÌNH DUYỆT NGƯỜI DÙNG NỮA (`server/dotrang.js`). Đường
 * ấy nhốt trang lạ trong iframe sandbox origin RỖNG — an toàn, nhưng website thật
 * (`matbao.net`) đọc `localStorage` ngay dòng đầu, nổ, và framework của họ thay
 * cả trang bằng "This page couldn't load". Vá mãi không hết: trang lạ nào cũng
 * có một kiểu nổ riêng. Trình duyệt THẬT, mở trang ở đúng origin của nó, thì
 * không có vấn đề ấy. Đường cũ vẫn giữ làm đường lùi khi máy không có Chromium.
 *
 * KHÔNG CÓ GÓI PHỤ THUỘC. Điều khiển Chromium bằng giao thức DevTools (CDP) qua
 * `WebSocket` có sẵn của Node 22 — không Playwright, không Puppeteer. Repo này
 * cố ý không có `node_modules` (xem CLAUDE.md §2).
 *
 * LUỒNG (theo `AI_Website_Capture_Rebuild_Motion_Tool_Spec.md` §5, §43):
 *   mở trang 1440×900 → chờ `load` + mạng lặng → cuộn hết trang (ảnh lười tải)
 *   → về đầu → đo bố cục (`web/dobocuc.js`) → chia phần (`chiaPhan`) → chụp toàn
 *   trang + chụp riêng từng phần → cất trong RAM, trả mã.
 *
 * AN TOÀN — trình duyệt này chạy TRÊN MÁY CHỦ, nên nó với được mạng nội bộ:
 *   · MỌI yêu cầu (kể cả ảnh, script, chuyển hướng) đi qua `Fetch.requestPaused`
 *     và bị chặn nếu tên miền trỏ về IP nội bộ — cùng hàm `kiemDiaChi` với đường
 *     tải trang cũ. Không chỉ kiểm địa chỉ đầu: một trang công khai nhúng
 *     `<img src="http://169.254.169.254/...">` là cách lách cổ điển.
 *   · WebSocket KHÔNG đi qua `Fetch` → chặn toàn bộ `ws://`/`wss://`. Đo bố cục
 *     không cần chúng.
 *   · Chỉ http(s) và `data:`. `file:` là đọc được mọi file trên máy chủ.
 *   · MỘT lượt chụp một lúc (Chromium ăn 300–500 MB), hạn 60 giây, xong là giết
 *     tiến trình và xoá thư mục hồ sơ tạm.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { doBoCuc } from '../web/dobocuc.js';
import { trangHong } from '../web/dotrang.js';
import { kiemDiaChi } from './dotrang.js';

const RONG = 1440, CAO = 900;
/** Trang dài hơn thế này thì chỉ chụp tới đây — đủ cho mọi phần đáng dựng cảnh. */
const CAO_TOI_DA = 9000;
const HAN_MS = 60_000;
const SONG_MS = 15 * 60_000;
const TOI_DA_HTML = 3 * 1024 * 1024;

/* ───────────────────────── tìm Chromium ───────────────────────── */

/** Đường tới Chromium, hoặc null. Bản chạy thật: `apk add chromium` (Dockerfile). */
export function timChromium() {
  const ung = [process.env.MOTION_CHROMIUM, '/usr/bin/chromium-headless-shell',
    '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
  for (const p of ung) if (existsSync(p)) return p;
  /* Máy làm việc: Chromium của Playwright mà bộ kiểm đang dùng. */
  const kho = path.join(homedir(), '.cache', 'ms-playwright');
  try {
    for (const d of readdirSync(kho).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = path.join(kho, d, sub);
        if (existsSync(p)) return p;
      }
    }
  } catch { /* không có kho Playwright */ }
  return null;
}

/* ───────────────────────── CDP tối giản ───────────────────────── */

export function noiCDP(wsUrl) {
  return new Promise((xong, hong) => {
    const ws = new WebSocket(wsUrl);
    let so = 0;
    const cho = new Map();
    const nghe = new Set();
    ws.onopen = () => xong({
      goi(method, params = {}, sessionId) {
        const id = ++so;
        ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        return new Promise((ok, loi) => cho.set(id, { ok, loi, method }));
      },
      nghe(f) { nghe.add(f); return () => nghe.delete(f); },
      dong() { try { ws.close(); } catch { /* đã đóng */ } },
    });
    ws.onerror = () => hong(new Error('Không nối được vào trình duyệt.'));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && cho.has(m.id)) {
        const c = cho.get(m.id); cho.delete(m.id);
        if (m.error) c.loi(new Error(`${c.method}: ${m.error.message}`)); else c.ok(m.result);
      } else if (m.method) for (const f of nghe) f(m);
    };
    ws.onclose = () => { for (const c of cho.values()) c.loi(new Error('Trình duyệt đã đóng.')); cho.clear(); };
  });
}

export function moChromium(duong) {
  const hoSo = mkdtempSync(path.join(tmpdir(), 'motion-chup-'));
  /* `chromium-headless-shell` TỰ NÓ đã là bản chạy ngầm và KHÔNG nhận cờ
     `--headless` — đưa vào là nó thoát ngay. Bản đầy đủ thì phải có cờ ấy. */
  const shell = /headless-shell/.test(duong);
  const p = spawn(duong, [
    ...(shell ? [] : ['--headless=new']), '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--disable-extensions', '--disable-background-networking', '--lang=vi-VN',
    `--user-data-dir=${hoSo}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const dong = () => {
    try { p.kill('SIGKILL'); } catch { /* đã chết */ }
    try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* kệ */ }
  };
  const ws = new Promise((xong, hong) => {
    let err = '';
    const hen = setTimeout(() => hong(new Error('Trình duyệt không khởi động kịp.')), 15_000);
    p.stderr.on('data', (d) => {
      err += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(err);
      if (m) { clearTimeout(hen); xong(m[1]); }
    });
    p.on('error', (e) => { clearTimeout(hen); hong(e); });
    p.on('exit', (c) => { clearTimeout(hen); hong(new Error(`Trình duyệt thoát (${c}): ${err.slice(-200)}`)); });
  });
  return { ws, dong };
}

/**
 * CHẶN MẠNG NỘI BỘ ở TỪNG yêu cầu của một phiên — xem đầu file. Kết quả tra tên
 * miền cất lại: một trang có 80 ảnh cùng một CDN thì tra một lần thôi.
 * @param choPhep origin được phép dù là nội bộ (vd máy chủ này, khi đo cảnh).
 */
export async function chanNoiBo(cdp, s, { choPhep = null } = {}) {
  const daTra = new Map();
  let biChan = 0;
  cdp.nghe(async (m) => {
    if (m.method !== 'Fetch.requestPaused' || m.sessionId !== s) return;
    const { requestId, request } = m.params;
    let ok = false;
    try {
      const u = new URL(request.url);
      if (u.protocol === 'data:' || u.protocol === 'blob:') ok = true;
      else if (choPhep && u.origin === choPhep) ok = true;
      else if (/^https?:$/.test(u.protocol)) {
        if (!daTra.has(u.hostname)) daTra.set(u.hostname, kiemDiaChi(`${u.protocol}//${u.host}/`));
        ok = !(await daTra.get(u.hostname));
      }
    } catch { ok = false; }
    if (!ok) biChan++;
    cdp.goi(ok ? 'Fetch.continueRequest' : 'Fetch.failRequest',
      ok ? { requestId } : { requestId, errorReason: 'BlockedByClient' }, s).catch(() => {});
  });
  await cdp.goi('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, s);
  await cdp.goi('Network.setBlockedURLs', { urls: ['ws://*', 'wss://*'] }, s).catch(() => {});
  return { dem: () => biChan };
}

/* ───────────────────────── chia phần trang ─────────────────────────
 *
 * Hàm TỰ CHỨA, chạy TRONG trang (cùng luật với `doBoCuc`: không biến ngoài).
 *
 * Cách chia bằng DOM chứ không nhờ AI nhìn ảnh: tài liệu đặc tả muốn "AI Vision
 * → section detection", nhưng trang đã mở sẵn trong trình duyệt thì ranh giới
 * phần nằm ngay trong cây DOM, chính xác tới từng pixel và không tốn lượt AI.
 * AI vẫn NHÌN ẢNH — ở bước dựng cảnh, là bước cần mắt thật sự.
 *
 * Thuật: đi xuống từ `body` qua các lớp bọc (một con chiếm gần hết chiều cao),
 * tới tầng có nhiều con rộng gần hết bề ngang xếp chồng dọc — đó là các phần.
 * Phần nào quá cao (hơn 1,6 màn hình) mà bên trong lại chia được thì chia tiếp
 * một tầng: nhiều trang bọc cả nội dung trong một `<main>` duy nhất.
 */
export function chiaPhan() {
  const W = document.documentElement.clientWidth || innerWidth;
  const VH = innerHeight;
  const sy = scrollY;
  const hop = (n) => {
    const r = n.getBoundingClientRect();
    return { x: r.left, y: r.top + sy, w: r.width, h: r.height };
  };
  const thay = (n) => {
    const s = getComputedStyle(n);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
  };
  const conRong = (n) => [...n.children].filter((c) => {
    if (!thay(c)) return false;
    const b = hop(c);
    return b.w >= W * 0.6 && b.h >= 40;
  });

  let goc = document.body;
  for (let i = 0; i < 12; i++) {
    const ds = conRong(goc);
    if (ds.length === 1) { goc = ds[0]; continue; }
    break;
  }
  let phan = conRong(goc);
  if (phan.length < 2) phan = [goc];

  const tach = [];
  for (const p of phan) {
    const b = hop(p);
    const con = conRong(p);
    if (b.h > VH * 1.6 && con.length >= 2) tach.push(...con); else tach.push(p);
  }

  const chuCua = (n) => (n.innerText || '').replace(/\s+/g, ' ').trim();
  const tieuDe = (n) => {
    const h = n.querySelector('h1, h2, h3, [role="heading"]');
    return h ? chuCua(h).slice(0, 48) : '';
  };
  let ra = tach.map((n) => ({ n, ...hop(n) }))
    .filter((p) => p.h >= 24)
    .sort((a, b) => a.y - b.y);

  /* Phần bé tí (dải thông báo, gạch phân cách) gộp vào phần ngay sau nó —
     trừ thanh điều hướng, vốn thấp mà vẫn là một phần đáng kể. */
  const gop = [];
  for (const p of ra) {
    const laNav = /^(HEADER|NAV)$/.test(p.n.tagName) || p.n.querySelector(':scope > nav');
    const truoc = gop[gop.length - 1];
    if (truoc && truoc.h < 80 && !truoc.laNav) {
      truoc.h = p.y + p.h - truoc.y; truoc.n2 = p.n; continue;
    }
    gop.push({ ...p, laNav: Boolean(laNav) });
  }
  /* Phần nằm LỌT TRONG phần khác (tách một tầng ở trên đôi khi lấy cả cha lẫn
     con) → bỏ phần nhỏ. Đo thật trên matbao.net: "Đánh giá 4.9…" nằm trọn
     trong phần mở đầu và hiện thành hai ô chồng nhau. */
  ra = gop.filter((p) => !gop.some((q) => q !== p && q.h > p.h
    && p.y >= q.y - 4 && p.y + p.h <= q.y + q.h + 4)).slice(0, 24);

  let daCoMoDau = false;
  return ra.map((p, i) => {
    const n = p.n2 || p.n;
    const chu = chuCua(p.n) + ' ' + (p.n2 ? chuCua(p.n2) : '');
    let loai;
    if (p.laNav || (i === 0 && p.h < 140)) loai = 'Thanh điều hướng';
    else if (p.n.tagName === 'FOOTER' || n.tagName === 'FOOTER' || (i === ra.length - 1 && i > 1)) loai = 'Chân trang';
    /* Phần mở đầu là phần LỚN đầu tiên. Dải quảng cáo mỏng trên đầu trang
       (matbao.net có dải 180px) không phải nó. */
    else if (!daCoMoDau && p.h < 300) loai = 'Dải quảng cáo';
    else if (!daCoMoDau) { loai = 'Phần mở đầu'; daCoMoDau = true; }
    else if (/(\d[\d.,]*\s*(đ|₫|vnđ|vnd)|\$\s*\d|\/\s*(tháng|năm|month|year)|bảng giá|pricing)/i.test(chu)) loai = 'Bảng giá';
    else if (p.n.querySelector('form, input, textarea')) loai = 'Biểu mẫu';
    else loai = 'Nội dung';
    return {
      id: `p${i + 1}`, loai, ten: tieuDe(p.n) || tieuDe(n) || chu.trim().slice(0, 48),
      x: 0, y: Math.max(0, Math.round(p.y)), w: W, h: Math.round(p.h),
    };
  });
}

/* ───────────────────────── cất kết quả ───────────────────────── */

const so = new Map();   // id → { chu, het, anh, banDo, phan[] }
let dangChup = false;

/** Một Chromium một lúc cho CẢ máy chủ (chụp trang lẫn đo cảnh) — xem đầu file.
    Chờ tối đa `choMs` cho lượt trước xong; hết hạn thì trả false. */
export async function xinCho(choMs = 0) {
  const bd = Date.now();
  while (dangChup) {
    if (Date.now() - bd >= choMs) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
  dangChup = true;
  return true;
}
export function traCho() { dangChup = false; }

function donCu() {
  const nay = Date.now();
  for (const [id, v] of so) if (v.het < nay) so.delete(id);
  /* Không để RAM phình vô hạn: giữ 12 lượt gần nhất. */
  while (so.size > 12) so.delete(so.keys().next().value);
}

/** Lượt chụp đã cất, hoặc null. Người khác email không lấy được. */
export function layChup(id, chu) {
  donCu();
  const v = so.get(String(id || ''));
  if (!v || (v.chu && v.chu !== (chu || ''))) return null;
  return v;
}

/**
 * Bản đồ + ảnh của MỘT phần, sẵn cho `dungTuHtml`: khối lọc theo phần, toạ độ
 * dời về gốc của phần, khung = đúng khổ phần ấy.
 */
export function banDoPhan(v, phanId) {
  /* "Cả trang" — cho màn Stitch: một màn hình thiết kế là MỘT cảnh, chia ra
     phần là cắt vụn đúng thứ người dùng vừa nhờ Stitch vẽ. */
  if (phanId === 'ca') {
    return { banDo: v.banDo, anh: v.anh.toString('base64'), phan: { id: 'ca', loai: 'Cả trang' } };
  }
  const p = v.phan.find((x) => x.id === phanId);
  if (!p) return null;
  const khoi = v.banDo.khoi
    .filter((k) => { const cy = k.y + k.h / 2; return cy >= p.y && cy < p.y + p.h; })
    .map((k) => ({ ...k, y: k.y - p.y }));
  return {
    banDo: { ...v.banDo, khung: { rong: v.banDo.khung.rong, cao: p.h }, khoi,
      tieuDe: `${v.banDo.tieuDe || ''} — ${p.loai}${p.ten ? `: ${p.ten}` : ''}`.trim() },
    anh: p.anh.toString('base64'),
    phan: p,
  };
}

/* ───────────────────────── chụp ───────────────────────── */

/**
 * @returns {Promise<{ok:true,id,tieuDe,rong,cao,phan[],soKhoi,catDuoi}|{ok:false,cau,khongCo?}>}
 */
export async function chupTrang({ url, html, chu }) {
  const duong = timChromium();
  if (!duong) return { ok: false, khongCo: true, cau: 'Máy chủ không có trình duyệt để chụp trang.' };
  if (!url && !String(html || '').trim()) return { ok: false, cau: 'Chưa có HTML hay địa chỉ trang.' };
  if (html && Buffer.byteLength(html) > TOI_DA_HTML) return { ok: false, cau: 'HTML nặng quá 3 MB.' };
  if (url) {
    const loi = await kiemDiaChi(url);
    if (loi) return { ok: false, cau: loi };
  }
  if (!await xinCho(20_000)) return { ok: false, cau: 'Máy đang chụp một trang khác — thử lại sau vài giây.' };

  const cr = moChromium(duong);
  let cdp;
  const hetHan = setTimeout(() => { cdp?.dong(); cr.dong(); }, HAN_MS);
  try {
    cdp = await noiCDP(await cr.ws);
    const { targetId } = await cdp.goi('Target.createTarget', { url: 'about:blank' });
    const { sessionId: s } = await cdp.goi('Target.attachToTarget', { targetId, flatten: true });
    const g = (m, p) => cdp.goi(m, p, s);

    const chan = await chanNoiBo(cdp, s);

    /* Đếm yêu cầu đang bay, để biết khi nào mạng LẶNG (tương đương `networkidle`). */
    const bay = new Set();
    let lanCuoi = Date.now();
    const loiJS = [];
    cdp.nghe((m) => {
      if (m.sessionId !== s) return;
      if (m.method === 'Network.requestWillBeSent') { bay.add(m.params.requestId); lanCuoi = Date.now(); }
      else if (m.method === 'Network.loadingFinished' || m.method === 'Network.loadingFailed') {
        bay.delete(m.params.requestId); lanCuoi = Date.now();
      } else if (m.method === 'Runtime.exceptionThrown') {
        loiJS.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'lỗi').slice(0, 160));
      }
    });
    await g('Network.enable');
    await g('Network.setBlockedURLs', { urls: ['ws://*', 'wss://*'] });
    /* Chromium không đầu tự xưng "HeadlessChrome" — nhiều trang chặn thẳng cái tên
       đó. Xưng như một Chrome thường. */
    const { userAgent } = await cdp.goi('Browser.getVersion');
    await g('Network.setUserAgentOverride', { userAgent: userAgent.replace(/HeadlessChrome/g, 'Chrome'),
      acceptLanguage: 'vi-VN,vi;q=0.9,en;q=0.8' });
    await g('Runtime.enable');
    await g('Page.enable');
    await g('Emulation.setDeviceMetricsOverride', { width: RONG, height: CAO, deviceScaleFactor: 1, mobile: false });

    const napXong = new Promise((xong) => {
      const bo = cdp.nghe((m) => { if (m.sessionId === s && m.method === 'Page.loadEventFired') { bo(); xong(); } });
      setTimeout(xong, 30_000);
    });
    const dich = url || `data:text/html;charset=utf-8;base64,${Buffer.from(String(html)).toString('base64')}`;
    const nav = await g('Page.navigate', { url: dich });
    if (nav.errorText) {
      return { ok: false, cau: chan.dem() ? 'Trang này trỏ vào mạng nội bộ — không mở được.'
        : `Không mở được trang (${nav.errorText}). Kiểm lại địa chỉ, hoặc chụp màn hình rồi dùng ô ①.` };
    }
    await napXong;

    const choLang = async (toiDa) => {
      const bd = Date.now();
      while (Date.now() - bd < toiDa) {
        if (bay.size <= 1 && Date.now() - lanCuoi > 700) return;
        await new Promise((r) => setTimeout(r, 150));
      }
    };
    await choLang(8000);

    const chay = async (bieuThuc) => {
      const r = await g('Runtime.evaluate', { expression: bieuThuc, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'lỗi trong trang');
      return r.result.value;
    };

    /* Cuộn hết trang cho ảnh lười tải hiện ra, rồi về đầu. */
    await chay(`(async () => {
      const cao = Math.min(document.documentElement.scrollHeight, ${CAO_TOI_DA});
      for (let y = 0; y < cao; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      scrollTo(0, 0);
    })()`);
    await choLang(4000);
    await new Promise((r) => setTimeout(r, 600));

    const banDo = await chay(`(${doBoCuc.toString()})()`);
    const phan = await chay(`(${chiaPhan.toString()})()`);
    const caoTrang = await chay('document.documentElement.scrollHeight');
    const cao = Math.min(Math.max(caoTrang, CAO), CAO_TOI_DA);

    /* Bị chặn bot / trang lỗi: nói thật, chỉ đường khác. */
    const chuTrang = (banDo.khoi || []).map((k) => k.chu || '').join(' ');
    if (/just a moment|verify you are human|checking your browser|access denied|attention required/i.test(chuTrang)
      && (banDo.khoi || []).length < 15) {
      return { ok: false, cau: 'Trang này chặn trình duyệt tự động (lớp chống bot). '
        + 'Chụp màn hình trang ấy rồi dùng ô ① — AI dựng từ ảnh được.' };
    }
    const hong = trangHong(banDo, loiJS);
    if (hong) return { ok: false, cau: hong.replace('bị hỏng khi mở để đo', 'bị hỏng ngay cả trong trình duyệt thật') };

    const chup = async (clip) => Buffer.from((await g('Page.captureScreenshot', {
      format: 'jpeg', quality: 78, captureBeyondViewport: true, fromSurface: true,
      clip: { ...clip, scale: 1 },
    })).data, 'base64');

    const anh = await chup({ x: 0, y: 0, width: RONG, height: cao });
    const phanRa = [];
    for (const p of phan) {
      if (p.y >= cao) break;
      const h = Math.min(p.h, cao - p.y);
      phanRa.push({ ...p, h, anh: await chup({ x: 0, y: p.y, width: RONG, height: h }) });
    }
    if (!phanRa.length) return { ok: false, cau: 'Trang mở được nhưng không thấy phần nào để dựng.' };

    donCu();
    const id = randomBytes(12).toString('hex');
    so.set(id, { chu: chu || '', het: Date.now() + SONG_MS, anh, banDo, phan: phanRa });
    return {
      ok: true, id, tieuDe: banDo.tieuDe || '', rong: RONG, cao, catDuoi: caoTrang > CAO_TOI_DA,
      soKhoi: banDo.khoi.length, biChan: chan.dem(),
      phan: phanRa.map(({ anh: _a, ...p }) => p),
    };
  } catch (e) {
    return { ok: false, cau: `Không chụp được trang: ${String(e.message || e).slice(0, 200)}` };
  } finally {
    clearTimeout(hetHan);
    cdp?.dong();
    cr.dong();
    dangChup = false;
  }
}
