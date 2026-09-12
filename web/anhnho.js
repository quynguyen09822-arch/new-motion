/**
 * ẢNH NHỎ CỦA TỪNG THÀNH PHẦN — như bảng lớp của Photoshop.
 *
 * Danh sách chỉ có tên thì nhìn không ra món nào là món nào: một cảnh của
 * `thu-ve-lai-s02` có 78 dòng "Khối màu" và 78 dòng "Chữ". Có hình thì nhận ra
 * ngay — nhưng CHỈ KHI ô ảnh dựng đúng, còn dựng sai thì 156 ô trắng như nhau
 * còn tệ hơn không có ảnh, vì nó trông như đã chạy.
 *
 * CÁCH LÀM: nhân bản chính nút DOM của món từ trong iframe ra, thả vào một
 * shadow root ở trang cha, kèm nguyên `<style>` của bộ dựng. Đọc được vì cùng
 * origin. Không đụng gì tới bên trong iframe — chỉ ĐỌC rồi chép ra.
 *
 * ====================================================================
 * QUY TẮC ẢNH NHỎ — áp cho MỌI clip, mọi món, không có ngoại lệ
 * ====================================================================
 * Năm điều dưới đây là hợp đồng của file này. Mỗi điều sinh ra từ một ô ảnh đã
 * hỏng thật, nên đừng gỡ điều nào mà không đọc lý do kèm theo.
 *
 *  1. ĐẶT GIỮA Ô — bằng `style` nội tuyến, không bằng lớp CSS.
 *     Bộ dựng ghi `left/top` NỘI TUYẾN theo toạ độ trong cảnh. Lớp
 *     `.giua{left:50%}` không bao giờ thắng nổi `style="left:72px"`, nên bản sao
 *     nằm ở đúng chỗ của nó trong khung 1280×720 — tức là ngoài hẳn cái ô 34px
 *     rồi bị cắt mất. Đây là lý do THẬT của 156 ô trắng: không phải màu, không
 *     phải cỡ, mà là chỗ đặt. Phải ghi đè bằng nội tuyến.
 *  2. NỀN THEO THỨ TỰ VẼ, không theo `--bg`.
 *     `--bg` không tồn tại trong bộ dựng; đọc nó là rơi về màu nền của chính
 *     trang sửa. Nền đúng là khối màu nằm dưới món — chữ trắng trong thanh điều
 *     hướng đen phải được xem trên nền đen. Dùng chung `banDoNen` với phép soát
 *     chất lượng, để hai nơi không bao giờ nói khác nhau.
 *  3. CHỮ THU THEO CHIỀU CAO, cắt bớt bề ngang.
 *     Chữ rộng 112 cao 12 mà thu vừa cả hai chiều thì còn 3,5px — một vệt xám.
 *     Ô ảnh không cần đọc hết câu (tên đã nằm ngay bên cạnh), nó cần cho thấy
 *     chữ TRÔNG THẾ NÀO: cỡ, đậm nhạt, màu. Vậy thì thu theo chiều cao.
 *  4. SỢI MẢNH PHẢI DÀY ÍT NHẤT 2px.
 *     Đường kẻ 585×4 thu vừa ô còn 0,2px — trình duyệt vẽ ra hư không.
 *  5. KHÔNG BAO GIỜ TRẢ VỀ Ô TRỐNG.
 *     Món trong suốt (nền sinh hoạ tiết, vệt sáng, cụm rỗng) hoặc món trùng màu
 *     với nền thì được viền nét đứt để còn thấy nó nằm đâu, to bao nhiêu.
 */

import { banDoNen } from './soat.js';

const CO = 34;        // cạnh ô ảnh nhỏ trong danh sách, px

/* Món mà cái đáng nhìn là CHIỀU CAO — xem quy tắc 3. */
const LOAI_CHU = new Set(['text', 'nut', 'chip']);

/** `rgb(37, 43, 56)` → `#252b38`. Không đọc ra thì trả null, KHÔNG đoán. */
function hex(mau) {
  if (typeof mau !== 'string') return null;
  if (mau.startsWith('#')) return mau;
  const m = /^rgba?\(([^)]+)\)/.exec(mau);
  if (!m) return null;
  const p = m[1].split(',').map((v) => parseFloat(v));
  if (p.length > 3 && p[3] < 0.35) return null;   // trong suốt thì không tính là màu
  return `#${p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

export function taoAnhNho(player) {
  let css = '';
  let bien = '';        // chuỗi khai lại mọi biến CSS của clip
  let goc = '';         // gốc đường dẫn của iframe
  let meta = {};
  let nenTheoCanh = new Map();   // canhId → Map(monId → {mau, ten})

  /**
   * Nhận kịch bản của clip đang mở. Gọi mỗi lần mở clip VÀ mỗi lần đổi cảnh —
   * quy tắc 2 cần biết thứ tự vẽ, mà thứ tự đó chỉ có trong kịch bản.
   */
  function datKichBan(doc) {
    meta = doc?.meta || {};
    nenTheoCanh = new Map();
    for (const canh of doc?.scenes || []) {
      if (canh?.id != null) nenTheoCanh.set(canh.id, banDoNen(canh, meta));
    }
  }

  /** Đọc lại CSS và bảng màu của clip. Gọi sau mỗi lần mở clip. */
  function napLai() {
    const d = player.tai();
    if (!d) { css = ''; return false; }
    goc = d.baseURI;
    css = [...d.querySelectorAll('style')].map((s) => s.textContent).join('\n');

    // Gom tên mọi biến CSS mà bộ dựng khai, rồi đọc giá trị đang áp trên body.
    const ten = new Set();
    for (const s of d.styleSheets) {
      try {
        for (const r of s.cssRules) {
          if (r.style) for (const k of r.style) if (k.startsWith('--')) ten.add(k);
        }
      } catch { /* bảng kiểu khác origin thì bỏ, ở đây không có */ }
    }
    const cs = d.defaultView.getComputedStyle(d.body);
    for (const k of d.body.style) if (k.startsWith('--')) ten.add(k);
    bien = [...ten].map((k) => `${k}:${cs.getPropertyValue(k)}`).join(';');
    return Boolean(css);
  }

  /** Đổi mọi đường dẫn tương đối trong bản sao sang tuyệt đối theo gốc iframe. */
  function suaDuongDan(node) {
    for (const n of [node, ...node.querySelectorAll('*')]) {
      for (const thuoc of ['src', 'href']) {
        const v = n.getAttribute?.(thuoc);
        if (v && !/^(https?:|data:|blob:|#)/.test(v)) {
          try { n.setAttribute(thuoc, new URL(v, goc).href); } catch { /* bỏ qua */ }
        }
      }
      // `mask-image`/`background-image` đặt thẳng vào style cũng chứa đường dẫn.
      const st = n.style;
      if (!st) continue;
      for (const k of ['maskImage', 'webkitMaskImage', 'backgroundImage']) {
        const v = st[k];
        if (!v || !v.includes('url(')) continue;
        st[k] = v.replace(/url\(["']?([^"')]+)["']?\)/g, (cu, u) => {
          if (/^(https?:|data:|blob:)/.test(u)) return cu;
          try { return `url("${new URL(u, goc).href}")`; } catch { return cu; }
        });
      }
    }
  }

  /**
   * QUY TẮC 1 — kéo bản sao về giữa ô.
   *
   * Mọi thứ ở đây đều phải ghi nội tuyến: bản sao đã mang sẵn `style` nội tuyến
   * của bộ dựng, mà lớp CSS thì không thắng được nội tuyến.
   */
  function datGiuaO(ban) {
    const st = ban.style;
    st.position = 'absolute';
    st.left = '50%'; st.top = '50%';
    st.right = 'auto'; st.bottom = 'auto';
    st.margin = '0';
    st.transformOrigin = '50% 50%';
    // Gỡ trạng thái của đúng khoảnh khắc hiện tại: món chưa bay vào thì `opacity`
    // bằng 0 và `visibility` là `hidden` — chép ra được một ô trống trơn.
    st.opacity = '1';
    st.visibility = 'visible';
    st.animation = 'none';
    st.transform = 'none';
    if (st.display === 'none') st.display = '';
  }

  /**
   * QUY TẮC 6 — chữ neo theo chiều đọc, không neo giữa.
   *
   * Món chữ là một Ô RỘNG chứ không phải một dòng vừa khít: "Trang chủ" nằm
   * trong ô rộng 112px, căn trái, nên chữ chỉ chiếm nửa đầu. Neo giữa ô là ống
   * kính rơi đúng vào nửa sau — trống trơn. Ô ảnh trông y như lỗi, mà dữ liệu
   * thì đúng. Vậy thì neo vào MÉP CHỮ BẮT ĐẦU, theo đúng căn lề của nó.
   */
  function neoChu(ban, loaiChu, ti) {
    const le = loaiChu ? getComputedStyle(ban).textAlign : 'center';
    if (le === 'right' || le === 'end') {
      ban.style.left = 'auto'; ban.style.right = '2px';
      ban.style.transformOrigin = '100% 50%';
      ban.style.transform = `translate(0,-50%) scale(${ti})`;
    } else if (loaiChu && (le === 'left' || le === 'start')) {
      ban.style.left = '2px';
      ban.style.transformOrigin = '0% 50%';
      ban.style.transform = `translate(0,-50%) scale(${ti})`;
    } else {
      ban.style.transform = `translate(-50%,-50%) scale(${ti})`;
    }
  }

  /**
   * QUY TẮC 3 + 4 — hệ số thu, tuỳ loại món và tuỳ ô to hay nhỏ.
   *
   * Trần phóng của chữ phải NHỎ HƠN ở ô 34px: phóng hết chiều cao thì lọt vào ô
   * đúng hai chữ cái, trông như vệt loang. Ô xem lớn 168px thì cho phóng thoải
   * mái — ở đó người dùng đang muốn ĐỌC.
   */
  function heSoThu(loaiChu, w, h, kho, canh) {
    let ti = Math.min(kho / w, kho / h);              // thu vừa cả hai chiều
    if (loaiChu) {
      const tran = canh >= 96 ? 3 : 1.8;
      ti = Math.max(ti, Math.min(kho / h, tran));     // chữ: theo chiều cao
    }
    const mong = Math.min(w, h);
    if (mong > 0) ti = Math.max(ti, Math.min(2 / mong, 3)); // sợi mảnh: dày ≥ 2px
    return Math.min(ti, 4);
  }

  /**
   * QUY TẮC 5 — món này có vẽ ra được cái gì không?
   * Không thì trả `false` để người gọi viền nét đứt cho thấy chỗ của nó.
   *
   * KHÔNG so tương phản với nền ở đây. Một khối trắng nằm trên nền trắng vẫn là
   * một khối trắng — đó ĐÚNG là thứ người dùng sẽ thấy lúc trình chiếu, và ô
   * ảnh có sẵn viền riêng nên vẫn phân biệt được. Viền nét đứt chỉ dành cho món
   * THẬT SỰ không vẽ gì: nền sinh hoạ tiết, vệt sáng, cụm rỗng. Thêm nét đứt
   * cho cả món trùng màu là gạch chéo hơn nửa danh sách, thành ra nhiễu.
   */
  function coHinh(ban) {
    if (ban.textContent?.trim()) return true;
    if (ban.querySelector('img, svg, canvas, video, picture')) return true;
    const cs = getComputedStyle(ban);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (cs.borderTopWidth !== '0px' && hex(cs.borderTopColor)) return true;
    return Boolean(hex(cs.backgroundColor));
  }

  /**
   * Vẽ ảnh nhỏ của một món vào một ô.
   * @param canhId cảnh chứa nó · @param monId id của món
   * @param o      phần tử ô (đã có sẵn trong danh sách)
   * @param canh   cạnh ô, px
   */
  function ve(canhId, monId, o, canh = CO) {
    if (!css && !napLai()) return false;
    const gocNode = player.node(canhId, monId);
    if (!gocNode) return false;
    /*
     * Ô phải ĐANG HIỆN mới đo được. Vẽ vào một ô còn `display:none` thì mọi phép
     * đo ra 0, hệ số thu bị chặn ở mức tối đa và món phóng to gấp bốn thay vì
     * thu nhỏ vừa ô — nhìn ra một mảng trắng vô nghĩa. Đã mắc với ô xem lớn.
     */
    if (!o.offsetWidth || !o.offsetHeight) return false;

    // QUY TẮC 2 — nền thật sự nằm dưới món này.
    const nen = nenTheoCanh.get(canhId)?.get(monId)?.mau || meta.bg || null;

    o.textContent = '';
    const sh = o.shadowRoot || o.attachShadow({ mode: 'open' });
    sh.innerHTML = '';

    const st = document.createElement('style');
    st.textContent = `${css}
      :host{display:block;overflow:hidden}
      .khung{position:absolute;inset:0;${nen ? `background:${nen};` : ''}${bien}}
      .vien{position:absolute;inset:1px;border:1px dashed rgba(140,164,196,.75);border-radius:3px}`;

    const khung = document.createElement('div');
    khung.className = 'khung';

    const ban = gocNode.cloneNode(true);
    suaDuongDan(ban);
    datGiuaO(ban);

    khung.appendChild(ban);
    sh.append(st, khung);

    /*
     * QUY TẮC 7 — ĐO BẢN GỐC, không đo bản sao.
     *
     * `offsetWidth` của bản gốc là số đo THẬT trong hệ toạ độ cảnh: nó bỏ qua
     * mọi `transform`, nên hai tầng phóng của sân khấu và máy quay không lọt
     * vào (đo `getBoundingClientRect` thì lọt, và món bị thu nhỏ hai lần).
     *
     * Bản sao thì đo không nổi, vì hai lẽ:
     *  · CỤM (`group`) ra 0×0 — con của nó nằm tuyệt đối, cụm không tự có khung.
     *    Chia cho 0 là hệ số bị chặn ở trần 4, cụm phóng to gấp bốn tràn ra ngoài.
     *  · ẢNH chưa tải xong thì ra đúng kích thước chỗ giữ, không phải kích thước
     *    ảnh. Đo lúc đó là hai logo trong `cta` phóng gấp đôi. Lỗi này chỉ hiện
     *    khi bộ nhớ đệm trống, nên rất dễ tưởng là đã chạy.
     */
    const w = gocNode.offsetWidth || ban.offsetWidth || 1;
    const h = gocNode.offsetHeight || ban.offsetHeight || 1;
    // Bản sao co về 0 thì đặt lại khung cho nó, không thì con nằm tràn hết ra.
    if (!ban.offsetWidth || !ban.offsetHeight) {
      ban.style.width = `${w}px`;
      ban.style.height = `${h}px`;
    }
    const loaiChu = LOAI_CHU.has(o.dataset.loai) || ban.classList.contains('k-text')
      || ban.classList.contains('k-nut') || ban.classList.contains('k-chip');
    const ti = heSoThu(loaiChu, w, h, canh - 4, canh);
    neoChu(ban, loaiChu, ti);

    if (!coHinh(ban)) {
      const v = document.createElement('div');
      v.className = 'vien';
      khung.appendChild(v);
    }
    return true;
  }

  return { ve, napLai, datKichBan, CO };
}
