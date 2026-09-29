/**
 * ĐO BỐ CỤC MỘT TRANG — hàm TỰ CHỨA, chạy được ở HAI nơi.
 *
 *   · `tools/doc-html.mjs` (máy làm việc): Playwright gọi `trang.evaluate(doBoCuc)`.
 *   · Trình duyệt của người dùng (bản chạy thật): máy chủ chèn nguyên văn hàm này
 *     vào trang cần đo, rồi trang ấy gửi kết quả ra bằng `postMessage`.
 *
 * VÌ SAO PHẢI CÓ NƠI THỨ HAI. Bản triển khai là `node:22-alpine`, cố ý KHÔNG có
 * Chromium (thêm vào là ảnh phình vài trăm MB). Nên `doc-html.mjs` chưa từng chạy
 * được trên đó — đường "Dựng từ trang" và cả Stitch nổ với
 * `Cannot find module '/app/tools/doc-html.mjs'` (anh Quý chụp màn hình 28/09).
 * Trình duyệt người dùng đang dùng CHÍNH LÀ Chromium, đo ở đó là đúng việc.
 *
 * MỘT BẢN DUY NHẤT. Hai nơi chép hai bản thì sớm muộn trôi khỏi nhau, và AI nhận
 * hai kiểu bản đồ khác nhau tuỳ đang chạy ở đâu — lỗi không ai lần ra.
 *
 * LUẬT CỦA HÀM NÀY: không được tham chiếu BẤT CỨ biến nào bên ngoài nó. Playwright
 * tuần tự hoá hàm bằng `toString()`, và máy chủ chèn nó vào trang cũng bằng
 * `toString()` — biến ngoài sẽ thành `undefined` ở cả hai nơi.
 */
export function doBoCuc() {
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
}
