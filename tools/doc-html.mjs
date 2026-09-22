#!/usr/bin/env node
/**
 * ĐỌC MỘT TRANG HTML THÀNH BẢN ĐỒ BỐ CỤC.
 *
 * Dùng cho đường Stitch → Motion: Stitch sinh ra màn hình dạng HTML, ta đọc nó
 * thành danh sách khối có TOẠ ĐỘ, MÀU, CỠ CHỮ, ĐỆM chính xác, rồi mới đưa AI
 * ghép sang thành phần của app.
 *
 * VÌ SAO KHÔNG ĐỌC HTML BẰNG CÁCH PHÂN TÍCH CHỮ
 *
 *   Stitch xuất ra Tailwind: `class="px-6 py-4 bg-slate-900/80 rounded-xl"`.
 *   Muốn biết cái khối đó đệm bao nhiêu pixel, màu gì, thì phải dựng lại cả bộ
 *   luật Tailwind — kể cả `/80` là độ mờ, kể cả biến CSS, kể cả thứ tự đè nhau.
 *   Sai một luật là sai cả bản đồ, và sai lặng lẽ.
 *
 *   Mở trong Chromium rồi hỏi `getComputedStyle` thì **trình duyệt đã tính hộ**:
 *   ra `padding: 24px`, `background: rgb(15, 23, 42)`. Không đoán, không dựng
 *   lại luật của ai. Đây cũng là cách `check-layout.mjs` của dự án clip đang đo.
 *
 * VÌ SAO KHÔNG ĐƯA THẲNG HTML CHO AI
 *
 *   43 KB HTML cho một màn. Nhét cả vào lời nhắc là tốn token, chậm, và model
 *   vẫn phải tự suy ra pixel từ tên class — đúng việc nó làm dở. Đưa bản đồ đã
 *   đo rồi thì AI chỉ còn làm phần nó giỏi: nhìn một khối và nói "cái này là
 *   `card`", "cái này là `nut`".
 *
 *   node tools/doc-html.mjs <đường-dẫn-hoặc-URL> [--rong 1280] [--cao 720]
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const args = process.argv.slice(2);
const nguon = args.find((a) => !a.startsWith('--'));
const lay = (ten, mac) => {
  const i = args.indexOf(`--${ten}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : mac;
};
const RONG = lay('rong', 1280);
const CAO = lay('cao', 720);

if (!nguon) {
  console.error('Cần một đường dẫn file HTML hoặc URL.\n  node tools/doc-html.mjs <file|url>');
  process.exit(1);
}

/* Đọc ở khổ NÀO thì ra toạ độ theo khổ ấy. Đọc trang desktop 2560px rồi đem
   toạ độ đó đặt vào clip 1280px là mọi thứ lệch gấp đôi — nên đặt bề rộng cửa
   sổ đúng bằng bề rộng clip ngay từ đầu, để trang tự dàn lại theo khổ thật. */
const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: RONG, height: CAO } });

const diaChi = /^https?:/.test(nguon)
  ? nguon
  : (existsSync(nguon) ? pathToFileURL(path.resolve(nguon)).href : nguon);

await trang.goto(diaChi, { waitUntil: 'networkidle', timeout: 60000 });
/* Chờ phông: Stitch nạp Be Vietnam Pro từ Google Fonts, và cỡ chữ đo trước khi
   phông về là cỡ của phông dự phòng — lệch hẳn. */
await trang.evaluate(() => document.fonts.ready);
await trang.waitForTimeout(400);

const banDo = await trang.evaluate(() => {
  const soPx = (s) => Math.round(parseFloat(s) || 0);
  const rong = (m) => {
    /* `rgba(0,0,0,0)` là TRONG SUỐT, không phải màu đen. Trả null để chỗ gọi
       biết "khối này không có nền", chứ đổi thành #000 là bản đồ mọc ra hàng
       trăm khối đen không có thật. */
    const m4 = m.match(/rgba?\(([^)]+)\)/);
    if (!m4) return null;
    const [r, g, b, a = '1'] = m4[1].split(',').map((x) => x.trim());
    if (Number(a) < 0.05) return null;
    const h = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
  };

  const ra = [];
  const goc = document.body.getBoundingClientRect();

  const di = (el, sau = 0) => {
    for (const con of el.children) {
      const r = con.getBoundingClientRect();
      const s = getComputedStyle(con);

      // Bỏ thứ không nhìn thấy: ẩn, trong suốt, hoặc bé tí.
      const thay = s.display !== 'none' && s.visibility !== 'hidden'
        && Number(s.opacity) > 0.05 && r.width >= 4 && r.height >= 4;
      if (!thay) { continue; }

      /* Chữ CỦA RIÊNG khối này, không tính chữ của con. Không lọc thì mỗi thẻ
         bọc ngoài đều mang nguyên văn cả trang, và bản đồ thành vô dụng. */
      const chuRieng = [...con.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(' ').trim();

      /* BIỂU TƯỢNG KHÔNG PHẢI CHỮ. Material Symbols dùng chính nội dung chữ làm
         mã icon — thẻ ghi "expand_more" thì màn hình hiện ra mũi tên, không
         hiện chữ đó. Đo trên màn Stitch thật: 137 trong 166 khối "có chữ" là
         loại này. Để nguyên là AI dựng ra một khối chữ ghi "expand_more", tức
         bịa ra thứ không có trên màn hình. */
      const phong = s.fontFamily || '';
      const laBieuTuong = /material\s*(symbols|icons)/i.test(phong);

      const nen = rong(s.backgroundColor);
      const vien = soPx(s.borderTopWidth) > 0 ? rong(s.borderTopColor) : null;
      const coAnh = s.backgroundImage && s.backgroundImage !== 'none';
      const laAnh = con.tagName === 'IMG' || con.tagName === 'SVG' || coAnh;

      /* Giữ lại khối CÓ ĐÓNG GÓP THỊ GIÁC. Thẻ bọc trong suốt không chữ không
         viền chỉ là giàn giáo của Tailwind — giữ lại thì bản đồ phình gấp năm
         mà không thêm thông tin nào. */
      /* GIỮ LẠI KHỐI CÓ ĐÓNG GÓP THỊ GIÁC, và giữ ở mức một CẢNH CLIP cần —
         không phải mức một trang web. Màn Stitch đầy đủ có 248 khối; một cảnh
         Motion chỉ tầm 10–20 món. Nên bỏ:
           · khối bé hơn 24px mà không mang chữ thật (giàn giáo, gạch phân cách)
           · thẻ bọc trong suốt không chữ không viền
         Biểu tượng thì giữ nhưng ghi riêng, đừng lẫn vào chữ. */
      const chuThat = laBieuTuong ? '' : chuRieng;
      const duBe = r.width >= 24 && r.height >= 24;
      const dangGiu = chuThat || (nen && duBe) || (vien && duBe)
        || (laAnh && duBe) || (laBieuTuong && r.width >= 16);

      if (dangGiu) {
        ra.push({
          the: con.tagName.toLowerCase(),
          sau,
          x: Math.round(r.left - goc.left),
          y: Math.round(r.top - goc.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
          chu: chuThat.slice(0, 160) || undefined,
          bieuTuong: laBieuTuong ? chuRieng.slice(0, 40) : undefined,
          nen: nen || undefined,
          mauChu: (chuThat || laBieuTuong) ? rong(s.color) || undefined : undefined,
          coChu: chuThat ? soPx(s.fontSize) : undefined,
          damChu: chuThat ? Number(s.fontWeight) || undefined : undefined,
          canChu: chuThat && s.textAlign !== 'start' ? s.textAlign : undefined,
          dem: soPx(s.paddingTop) || undefined,
          demNgang: soPx(s.paddingLeft) || undefined,
          boTron: soPx(s.borderTopLeftRadius) || undefined,
          vien: vien || undefined,
          anh: con.tagName === 'IMG' ? (con.getAttribute('src') || '').slice(0, 120) : undefined,
          laAnh: laAnh || undefined,
        });
      }
      di(con, sau + 1);
    }
  };
  di(document.body);

  const nenTrang = rong(getComputedStyle(document.body).backgroundColor)
    || rong(getComputedStyle(document.documentElement).backgroundColor);

  return {
    tieuDe: document.title || '',
    khung: { rong: Math.round(goc.width), cao: Math.round(document.body.scrollHeight) },
    nenTrang: nenTrang || undefined,
    khoi: ra,
  };
});

await trinh.close();

/* Dọn trường rỗng cho gọn — bản đồ này sẽ đi vào lời nhắc, mỗi `undefined` in
   ra là token trả tiền mà không mang tin gì. */
const sach = JSON.parse(JSON.stringify(banDo));
console.log(JSON.stringify(sach, null, 1));
