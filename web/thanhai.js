/**
 * NÚT AI Ở THANH DƯỚI, và bảng AI bật lên từ đó.
 *
 * VÌ SAO Ở DƯỚI CHỨ KHÔNG PHẢI CỘT PHẢI
 *   Cột phải là chỗ SỬA MỘT MÓN đang chọn — mọi thứ trong đó đều thuộc về một
 *   thành phần cụ thể. Hỏi AI thì không: câu hỏi thường về cả clip, và hỏi trong
 *   lúc đang xem chứ không phải đang chỉnh. Nhét vào cột phải là bắt người dùng
 *   rời khỏi việc đang làm để đi tìm chỗ hỏi.
 *
 * MỌI VIỆC AI Ở ĐÂY HẾT, không rải ra hai chỗ.
 *   Trước đây giọng đọc nằm ở một thẻ riêng bên cột phải. Hai cửa cho cùng một
 *   thứ là người dùng phải nhớ cái nào ở đâu, và bao giờ cũng mở nhầm cái kia.
 *   Giờ gộp làm hai thẻ con ngay trong bảng này: "Hỏi AI" và "Giọng đọc".
 *
 * PHẦN HỎI KHÔNG PHẢI KHUNG CHAT
 *   Không giữ lịch sử hội thoại. Một câu hỏi, một câu trả lời, xong. Giữ lịch sử
 *   thì phải có chỗ cuộn, có chỗ xoá, và người dùng bắt đầu chờ đợi nó nhớ được
 *   mọi thứ — mà nó thì không. Hứa ít, giữ đúng lời.
 *
 * BA CÂU GỢI Ý, và chúng là ba câu hỏi CÓ THẬT người dùng hay hỏi. Ô trống
 * không có gợi ý là ô trống người ta không biết gõ gì vào.
 */
const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

const GOI_Y = [
  'Clip này đang có vấn đề gì không?',
  'Nên thêm gì cho đỡ trống?',
  'Nhịp chuyển động đã ổn chưa?',
];

export function taoThanhAI({ nutBoc, laySlug, bao, dungKhungGiong, dungKhungHinh, dungKhungSua }) {
  let mo = false, dangHoi = false, the = 'hoi';

  const nut = el('button', 'nut-ai');
  nut.type = 'button';
  nut.title = 'Hỏi AI về clip này';
  nut.setAttribute('aria-label', 'Hỏi AI về clip này');
  nut.setAttribute('aria-expanded', 'false');
  nut.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">'
    + '<path d="M8 1.6l1.5 3.9 3.9 1.5-3.9 1.5L8 12.4 6.5 8.5 2.6 7l3.9-1.5z"/>'
    + '<path d="M12.6 10.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/></svg>'
    + '<span class="nut-ai-chu">AI</span>';

  const thanh = el('div', 'thanh-ai an');
  thanh.setAttribute('role', 'dialog');
  thanh.setAttribute('aria-label', 'Trợ lý AI');

  /* ---- hai thẻ con ---- */
  const hangThe = el('div', 'ai-the-hang');
  hangThe.setAttribute('role', 'tablist');
  const bocHoi = el('div', 'ai-noi');
  const bocGiong = el('div', 'ai-noi an');
  const bocHinh = el('div', 'ai-noi an');
  const bocSua = el('div', 'ai-noi an');
  const theHoi = el('button', 'ai-the', 'Hỏi AI');
  const theGiong = el('button', 'ai-the', 'Giọng đọc');
  const theHinh = el('button', 'ai-the', 'Dựng hình');
  const theSua = el('button', 'ai-the', 'Sửa món');
  for (const b of [theHoi, theGiong, theHinh, theSua]) { b.type = 'button'; b.setAttribute('role', 'tab'); }

  const hangGoi = el('div', 'ai-goi-y');
  const o = el('input', 'o-nhap o-hoi');
  o.type = 'text';
  o.placeholder = 'Hỏi gì về clip này…';
  o.setAttribute('aria-label', 'Câu hỏi cho AI');

  const gui = el('button', 'nut chinh nut-gui', 'Hỏi');
  gui.type = 'button';
  const dong = el('button', 'nut-ti nut-dong-ai');
  dong.type = 'button';
  dong.title = 'Đóng (Esc)';
  dong.setAttribute('aria-label', 'Đóng thanh AI');
  dong.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  const tra = el('div', 'ai-tra an');

  const hang = el('div', 'ai-hang-hoi');
  hang.append(o, gui);
  bocHoi.append(hangGoi, hang, tra);

  /* Khung giọng đọc dựng SẴN ngay lúc này nhưng chỉ NẠP danh sách giọng khi
     người dùng mở thẻ đó — danh sách giọng phải gọi ra Internet, mà phần lớn
     phiên làm việc không đụng tới giọng đọc. */
  const khungGiong = dungKhungGiong?.(bocGiong);
  const khungHinh = dungKhungHinh?.(bocHinh);
  const khungSua = dungKhungSua?.(bocSua);

  function datThe(t) {
    the = t;
    for (const [b, x, n] of [[theHoi, bocHoi, 'hoi'], [theGiong, bocGiong, 'giong'],
      [theHinh, bocHinh, 'hinh'], [theSua, bocSua, 'sua']]) {
      b.classList.toggle('chon', t === n);
      b.setAttribute('aria-selected', String(t === n));
      x.classList.toggle('an', t !== n);
    }
    // Chỉ thẻ "Hỏi AI" là hẹp — ba thẻ còn lại đều cần chỗ cho danh sách, ô thả
    // ảnh và bảng thay đổi.
    thanh.classList.toggle('rong', t !== 'hoi');
    if (t === 'giong') khungGiong?.nap();
    else if (t === 'hinh') khungHinh?.ve();
    else if (t === 'sua') khungSua?.ve();
    else o.focus();
  }
  theHoi.onclick = () => datThe('hoi');
  theGiong.onclick = () => datThe('giong');
  theHinh.onclick = () => datThe('hinh');
  theSua.onclick = () => datThe('sua');
  hangThe.append(theHoi, theGiong, theHinh, theSua, dong);
  thanh.append(hangThe, bocHoi, bocGiong, bocHinh, bocSua);

  function veGoiY() {
    hangGoi.innerHTML = '';
    for (const g of GOI_Y) {
      const b = el('button', 'ai-chip', g);
      b.type = 'button';
      b.onclick = () => { o.value = g; hoi(); };
      hangGoi.appendChild(b);
    }
    const b2 = el('button', 'ai-chip nhan', 'Viết lời đọc…');
    b2.type = 'button';
    // Việc này có thẻ riêng ngay bên cạnh, với brief, chọn giọng và nghe thử —
    // đưa sang đó thay vì trả lời nửa vời bằng một đoạn chữ.
    b2.onclick = () => datThe('giong');
    hangGoi.appendChild(b2);
  }

  async function hoi() {
    const cau = o.value.trim();
    const slug = laySlug?.();
    if (!cau || dangHoi) return;
    if (!slug) return bao('Mở một clip trước đã.', true);
    dangHoi = true;
    gui.disabled = true; gui.textContent = 'Đang nghĩ…';
    tra.classList.remove('an', 'hong');
    tra.textContent = 'Đang đọc lại clip…';
    try {
      const r = await fetch('/api/hoi-ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hoi: cau }),
      });
      const d = await r.json();
      if (!d.ok) { tra.classList.add('hong'); tra.textContent = d.loi || 'Hỏi AI hỏng.'; return; }
      tra.textContent = d.tra;
    } catch (e) {
      tra.classList.add('hong');
      tra.textContent = `Hỏi AI hỏng — ${String(e.message || e).slice(0, 80)}`;
    } finally { dangHoi = false; gui.disabled = false; gui.textContent = 'Hỏi'; }
  }

  gui.onclick = hoi;
  o.onkeydown = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); hoi(); }
    if (ev.key === 'Escape') { ev.preventDefault(); datMo(false); }
  };
  dong.onclick = () => datMo(false);

  function datMo(v) {
    mo = v;
    thanh.classList.toggle('an', !v);
    nut.classList.toggle('dang-mo', v);
    nut.setAttribute('aria-expanded', String(v));
    if (v) { veGoiY(); datThe(the); }
    else { tra.classList.add('an'); tra.textContent = ''; }
  }

  nut.onclick = () => datMo(!mo);
  /* Esc đóng thanh dù con trỏ đang ở đâu. Bắt ở cấp tài liệu vì người dùng hay
     bấm Esc trong lúc mắt nhìn khung hình, không phải trong lúc con trỏ ở ô gõ. */
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && mo) { ev.preventDefault(); datMo(false); }
  });

  nutBoc.appendChild(nut);
  document.body.appendChild(thanh);
  return {
    mo: () => datMo(true),
    dong: () => datMo(false),
    moGiong: () => { datMo(true); datThe('giong'); },
    moHinh: () => { datMo(true); datThe('hinh'); },
    moSua: () => { datMo(true); datThe('sua'); },
    /* Trang cha gọi khi người dùng chọn món khác — thẻ "Sửa món" phải hiện đúng
       món đang chọn, không thì nó nói tên món cũ và người ta sửa nhầm. */
    doiChon: () => { if (the === 'sua') khungSua?.ve(); },
  };
}
