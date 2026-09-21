/**
 * DANH SÁCH THÀNH PHẦN — cây dựng TỪ KỊCH BẢN, không phải từ DOM.
 *
 * Đây là đường DUY NHẤT để chọn nền (`nen`) và vệt sáng (`sweep`): bộ dựng đặt
 * hai loại đó `pointer-events:none` nên bấm trên khung hình không bao giờ trúng.
 * Cũng là đường thoát khi một món bị món khác che kín.
 */
import { TEN_LOAI } from './inspector/schema.js';
import { tenMon } from './inspector/index.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

export function taoDanhSach(boc, { onChon, onRe, onThoiRe, onDoiCho, anhNho }) {
  let chon = null;
  let canhDang = null;
  let docDang = null;      // giữ lại để lọc xong vẽ lại được
  let locChu = '';         // chữ đang lọc, đã hạ chữ thường
  let onDem = () => {};    // báo số hàng còn lại cho thanh tìm

  /*
   * Vẽ ảnh nhỏ LƯỜI: chỉ vẽ ô nào thật sự cuộn tới. Một cảnh của
   * `thu-trien-khai-html` có hơn 150 món; nhân bản hết một lượt là khựng cả
   * giao diện mỗi lần đổi lựa chọn, mà người dùng chỉ nhìn thấy chừng mười ô.
   */
  const doiNgo = new IntersectionObserver((muc) => {
    for (const m of muc) {
      if (!m.isIntersecting) continue;
      const o = m.target;
      doiNgo.unobserve(o);
      if (o.dataset.veRoi) continue;
      o.dataset.veRoi = '1';
      anhNho?.ve(canhDang, o.dataset.mon, o);
    }
  }, { root: boc, rootMargin: '80px' });

  /* Ô xem lớn khi rê chuột — như Photoshop bấm giữ vào ảnh nhỏ thì phóng ra. */
  const oLon = document.createElement('div');
  oLon.className = 'lop-xem-lon an';
  document.body.appendChild(oLon);
  let henLon = null;

  function hienLon(hang, monId) {
    clearTimeout(henLon);
    // Chờ một nhịp ngắn: lướt chuột qua cả danh sách mà ô nào cũng bật ra thì
    // rối mắt, và nhân bản liên tục cũng phí.
    henLon = setTimeout(() => {
      // Đặt chỗ và HIỆN RA TRƯỚC, vẽ sau: `anhNho.ve` phải đo được ô mới tính
      // đúng hệ số thu, mà ô đang `display:none` thì mọi phép đo ra 0.
      const r = hang.getBoundingClientRect();
      const cao = 168;
      oLon.style.left = `${r.right + 10}px`;
      oLon.style.top = `${Math.min(Math.max(8, r.top - cao / 2 + r.height / 2), innerHeight - cao - 8)}px`;
      oLon.classList.remove('an');
      if (!anhNho?.ve(canhDang, monId, oLon, 168)) oLon.classList.add('an');
    }, 220);
  }
  function anLon() {
    clearTimeout(henLon);
    oLon.classList.add('an');
  }

  /* Bỏ dấu tiếng Việt để gõ "chu" cũng ra "Chữ". Người dùng gõ không dấu là
     chuyện thường, mà danh sách thì toàn chữ có dấu. */
  const phang = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  /* Một món được giữ lại nếu CHÍNH NÓ khớp, hoặc có con khớp — không thì lọc
     trong một cụm là mất luôn cả cụm lẫn thứ đang tìm nằm bên trong. */
  function khop(e) {
    if (!locChu) return true;
    if (phang(tenMon(e)).includes(locChu) || phang(e.id || '').includes(locChu)) return true;
    return (e.children || []).some(khop);
  }

  function ve(doc, canhId) {
    boc.innerHTML = '';
    canhDang = canhId;
    docDang = doc;
    doiNgo.disconnect();
    anLon();
    // Quy tắc ảnh nhỏ cần biết thứ tự vẽ của cảnh để dò nền dưới mỗi món. Đặt ở
    // đây là mọi clip đều đi qua, không clip nào lọt: đây là đường DUY NHẤT vẽ
    // lại danh sách, cả lúc mở clip lẫn lúc đổi cảnh.
    anhNho?.datKichBan(doc);
    const canh = (doc?.scenes || []).find((s) => s.id === canhId);
    if (!canh) return;

    let dem = 0;
    const dao = (els, sau, duong = []) => {
      for (const e of els || []) {
        if (!khop(e)) continue;
        dem++;
        const hang = el('div', 'lop-hang');
        hang.style.paddingLeft = `${10 + sau * 14}px`;
        hang.dataset.mon = e.id;
        /* Đường tổ tiên, để lúc kéo biết ngay đích có nằm TRONG món đang kéo
           không — thả cụm vào con cháu của chính nó là cây tự ăn lấy mình.
           Ghi sẵn vào DOM chứ không dò lại cây mỗi nhịp `dragover`: nhịp đó chạy
           vài chục lần một giây. */
        hang.dataset.duong = duong.join('/');
        if (e.kind === 'group') hang.dataset.cum = '1';
        hang.draggable = true;
        if (chon?.monId === e.id) hang.classList.add('dang');

        // Ô ảnh nhỏ thay cho chấm màu. Giữ `data-loai` để còn có màu viền khi
        // món không dựng được hình (nền, vệt sáng… vốn trong suốt).
        const o = el('div', 'lop-anh');
        o.dataset.loai = e.kind;
        o.dataset.mon = e.id;
        doiNgo.observe(o);
        hang.append(o, el('span', 'lop-ten', tenMon(e)));

        // Nền và vệt sáng bấm trên khung hình không trúng — đánh dấu để người
        // dùng biết vì sao chỉ chọn được từ đây.
        if (e.kind === 'nen' || e.kind === 'sweep') {
          hang.append(el('span', 'lop-dau', 'chỉ chọn ở đây'));
        }

        hang.onclick = () => onChon({ canhId, monId: e.id });
        hang.onmouseenter = () => { onRe({ canhId, monId: e.id }); hienLon(hang, e.id); };
        hang.onmouseleave = () => { onThoiRe(); anLon(); };
        boc.appendChild(hang);

        if (e.kind === 'group') dao(e.children, sau + 1, [...duong, e.id]);
      }
    };
    dao(canh.elements, 0);
    onDem(dem, locChu);
  }

  /* ---------- KÉO ĐỔI CHỖ ----------
   *
   * Dùng kéo-thả sẵn có của trình duyệt (`draggable`) chứ không tự bắt chuột:
   * được luôn con trỏ đúng kiểu, được tự cuộn khi kéo tới mép danh sách, và
   * phím Esc huỷ kéo — ba thứ viết tay đều tốn cả trăm dòng và vẫn thiếu.
   *
   * Nối bằng một tay nghe đặt trên cả khung, không đặt lên từng hàng: danh sách
   * vẽ lại sau mỗi thao tác, mà gắn lên từng hàng thì mỗi lần vẽ lại là một lượt
   * gắn mới — vài trăm tay nghe cho một cảnh 156 món.
   */
  let keoId = null;

  function xoaChiDan() {
    for (const h of boc.querySelectorAll('.lop-hang')) {
      h.classList.remove('tha-tren', 'tha-duoi', 'tha-vao');
    }
    boc.classList.remove('tha-cuoi');
  }

  /** Thả vào đâu, tính theo chỗ con trỏ đang đứng trong chiều cao của hàng. */
  function doDich(hang, ev) {
    const r = hang.getBoundingClientRect();
    const ty = (ev.clientY - r.top) / (r.height || 1);
    /* Vùng giữa của một CỤM nghĩa là "thả vào trong". Món thường không có vùng
       giữa — chia đôi trên/dưới, vì nửa vùng chết ở giữa một hàng cao 26px là
       người dùng kéo mãi không thấy vạch hiện ra. */
    if (hang.dataset.cum === '1') {
      if (ty < 0.26) return 'truoc';
      if (ty > 0.74) return 'sau';
      return 'vao';
    }
    return ty < 0.5 ? 'truoc' : 'sau';
  }

  boc.addEventListener('dragstart', (ev) => {
    const hang = ev.target.closest?.('.lop-hang');
    if (!hang) return;
    keoId = hang.dataset.mon;
    hang.classList.add('dang-keo');
    anLon();                       // đang kéo thì đừng bật ô xem lớn ra che đường
    onThoiRe?.();
    ev.dataTransfer.effectAllowed = 'move';
    /* Firefox không khởi động được cú kéo nếu chưa đặt dữ liệu nào. */
    try { ev.dataTransfer.setData('text/plain', keoId); } catch { /* trình duyệt chặn thì kệ */ }
  });

  boc.addEventListener('dragover', (ev) => {
    if (!keoId) return;
    const hang = ev.target.closest?.('.lop-hang');
    xoaChiDan();

    if (!hang) {
      /* Chỗ trống dưới danh sách = đem ra ngoài cùng, đặt cuối. Đây là đường
         DUY NHẤT để lôi một món ra khỏi cụm mà không phải xoá đi làm lại. */
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      boc.classList.add('tha-cuoi');
      return;
    }

    const duong = (hang.dataset.duong || '').split('/').filter(Boolean);
    if (hang.dataset.mon === keoId || duong.includes(keoId)) return;  // không cho thả

    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    const kieu = doDich(hang, ev);
    hang.classList.add(kieu === 'vao' ? 'tha-vao' : kieu === 'truoc' ? 'tha-tren' : 'tha-duoi');
  });

  boc.addEventListener('drop', (ev) => {
    if (!keoId) return;
    ev.preventDefault();
    const hang = ev.target.closest?.('.lop-hang');
    const monId = keoId;
    xoaChiDan();

    if (!hang) {
      onDoiCho?.({ canhId: canhDang, monId, dichId: null, kieu: 'cuoi' });
      return;
    }
    const duong = (hang.dataset.duong || '').split('/').filter(Boolean);
    if (hang.dataset.mon === monId || duong.includes(monId)) return;
    onDoiCho?.({ canhId: canhDang, monId, dichId: hang.dataset.mon, kieu: doDich(hang, ev) });
  });

  /* `dragend` chạy CẢ khi thả hụt và khi bấm Esc giữa chừng — dọn ở đây thì
     không còn đường nào để lại vạch chỉ dẫn dính trên màn hình. */
  boc.addEventListener('dragend', () => {
    keoId = null;
    xoaChiDan();
    for (const h of boc.querySelectorAll('.dang-keo')) h.classList.remove('dang-keo');
  });

  return {
    ve,
    dat(c) { chon = c; },
    /** Lọc danh sách theo tên. Chuỗi rỗng = bỏ lọc. */
    loc(chu, baoDem) {
      if (baoDem) onDem = baoDem;
      locChu = phang(chu || '').trim();
      if (docDang && canhDang) ve(docDang, canhDang);
    },
    /** Kịch bản vừa đổi → vẽ lại những ô đang nhìn thấy. */
    veLaiAnh() {
      for (const o of boc.querySelectorAll('.lop-anh')) {
        delete o.dataset.veRoi;
        doiNgo.observe(o);
      }
    },
  };
}
