/**
 * CHỈNH KHUNG NHẤN — kéo cho khớp ngay trên chính ảnh mockup.
 *
 * Bốn con số trong `box` là PIXEL TRÊN ẢNH MOCKUP 941×1672 — và sáu file mockup
 * đúng bằng kích thước đó. Nên ở đây không có chuỗi biến đổi toạ độ nào cả: chia
 * cho tỉ lệ hiển thị là ra số cần ghi. Khác hẳn trình sửa cảnh, nơi phải lần qua
 * hai tầng phóng của sân khấu và máy quay.
 *
 * Đó cũng là lý do mấy khung này hay lệch: người ta đo tay trên ảnh rồi gõ số
 * vào mảng. Cho kéo thẳng trên ảnh thì hết đo tay.
 */

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

const TAY = ['tt', 'tg', 'tp', 'gt', 'gp', 'dt', 'dg', 'dp']; // trên/giữa/dưới × trái/giữa/phải

export function taoKhung({ bocGiua, bocBang, bao }) {
  let dulieu = null;      // { slug, rong, cao, lop[] }
  let dangChon = -1;
  let box = null;         // [x0,y0,x1,y1] đang sửa, theo pixel mockup
  let goc = null;         // bản lúc mở, để biết có đổi gì chưa

  const anh = el('img', 'khung-anh');
  const hop = el('div', 'khung-hop');
  const san = el('div', 'khung-san');
  san.append(anh, hop);
  for (const t of TAY) {
    const h = el('div', 'khung-tay');
    h.dataset.tay = t;
    hop.appendChild(h);
  }
  const trong = el('p', 'khung-trong', 'Chọn một khung ở cột bên phải để chỉnh.');
  bocGiua.append(san, trong);

  const dsBoc = el('div', 'khung-ds');
  const oSo = el('div', 'khung-so');
  const khoaBao = el('p', 'nhac');
  khoaBao.style.display = 'none';
  const nutLuu = el('button', 'nut chinh rong', 'Lưu khung này');
  const nutVe = el('button', 'nut nho rong', 'Trả lại số cũ');
  nutLuu.type = nutVe.type = 'button';
  nutLuu.disabled = nutVe.disabled = true;

  /* ---------- vẽ ---------- */
  function tyLe() {
    return anh.clientWidth / (dulieu?.rong || 941);
  }

  function veHop() {
    if (!box) { hop.style.display = 'none'; return; }
    const t = tyLe();
    hop.style.display = 'block';
    hop.style.left = `${box[0] * t}px`;
    hop.style.top = `${box[1] * t}px`;
    hop.style.width = `${(box[2] - box[0]) * t}px`;
    hop.style.height = `${(box[3] - box[1]) * t}px`;
    veSo();
    const l = dulieu?.lop[dangChon];
    const doi = goc && String(box) !== String(goc);
    nutLuu.disabled = !doi || !l?.suaDuoc;
    nutVe.disabled = !doi;
    khoaBao.textContent = l && !l.suaDuoc ? l.viSao : '';
    khoaBao.style.display = l && !l.suaDuoc ? 'block' : 'none';
    // Khoá thì cũng khoá luôn cả kéo, kẻo kéo xong mới biết không lưu được.
    hop.style.cursor = l?.suaDuoc ? 'move' : 'not-allowed';
  }

  function veSo() {
    const ten = ['Trái', 'Trên', 'Phải', 'Dưới'];
    [...oSo.querySelectorAll('input')].forEach((o, i) => { o.value = box[i]; });
    oSo.dataset.co = ten.length;
  }

  function dungOSo() {
    oSo.innerHTML = '';
    ['Trái', 'Trên', 'Phải', 'Dưới'].forEach((n, i) => {
      const b = el('div', 'num');
      const o = el('input', 'o-nhap o-so');
      o.type = 'number';
      o.oninput = () => {
        if (!box) return;
        box[i] = Number(o.value) || 0;
        veHop();
      };
      b.append(el('label', 'num-nhan', n), o);
      oSo.appendChild(b);
    });
  }

  function veDanhSach() {
    dsBoc.innerHTML = '';
    let canhCu = null;
    dulieu.lop.forEach((l, i) => {
      if (l.canh !== canhCu) {
        canhCu = l.canh;
        dsBoc.appendChild(el('div', 'khung-canh', `Cảnh ${l.canh + 1}`));
      }
      const h = el('button', 'khung-hang');
      h.type = 'button';
      const thoi = l.tu != null ? `${String(l.tu).replace('.', ',')}–${String(l.den).replace('.', ',')}s` : 'suốt cảnh';
      h.innerHTML = '';
      const cham = el('span', 'khung-cham');
      cham.dataset.loai = l.loai;
      h.append(cham, el('span', 'khung-ten', l.ten), el('span', 'khung-thoi', thoi));
      if (!l.anh) h.append(el('span', 'khung-thoi', '· không có ảnh'));
      else if (!l.suaDuoc) h.append(el('span', 'khung-thoi', '· chỉ xem'));
      h.disabled = !l.anh;
      h.onclick = () => chonLop(i);
      if (i === dangChon) h.classList.add('dang');
      dsBoc.appendChild(h);
    });
  }

  function chonLop(i) {
    dangChon = i;
    const l = dulieu.lop[i];
    box = [...l.box];
    goc = [...l.box];
    anh.src = `/clip/${l.anh}`;
    hop.dataset.loai = l.loai;
    trong.style.display = 'none';
    san.style.display = 'block';
    veDanhSach();
    // Ảnh có thể chưa tải xong, mà tỉ lệ phụ thuộc bề rộng thật của nó.
    if (anh.complete) veHop(); else anh.onload = veHop;
  }

  /* ---------- kéo ---------- */
  let phien = null;
  san.addEventListener('pointerdown', (ev) => {
    if (!box || !dulieu?.lop[dangChon]?.suaDuoc) return;
    const tay = ev.target.dataset?.tay || null;
    if (!tay && ev.target !== hop) return;
    phien = { tay, x: ev.clientX, y: ev.clientY, dau: [...box], t: tyLe() };
    san.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });

  san.addEventListener('pointermove', (ev) => {
    if (!phien) return;
    const dx = (ev.clientX - phien.x) / phien.t;
    const dy = (ev.clientY - phien.y) / phien.t;
    const [ax, ay, bx, by] = phien.dau;
    const r = Math.round;
    if (!phien.tay) {
      box = [r(ax + dx), r(ay + dy), r(bx + dx), r(by + dy)];
    } else {
      let [x0, y0, x1, y1] = [ax, ay, bx, by];
      if (phien.tay[0] === 't') y0 = ay + dy;
      if (phien.tay[0] === 'd') y1 = by + dy;
      if (phien.tay[1] === 't') x0 = ax + dx;
      if (phien.tay[1] === 'p') x1 = bx + dx;
      // Không cho lật ngược: giữ tối thiểu 4px kẻo khung biến mất khỏi tầm tay.
      box = [r(Math.min(x0, x1 - 4)), r(Math.min(y0, y1 - 4)),
             r(Math.max(x1, x0 + 4)), r(Math.max(y1, y0 + 4))];
    }
    veHop();
  });

  const tha = (ev) => {
    if (!phien) return;
    phien = null;
    try { san.releasePointerCapture(ev.pointerId); } catch { /* đã nhả rồi */ }
  };
  san.addEventListener('pointerup', tha);
  san.addEventListener('pointercancel', tha);
  window.addEventListener('resize', () => veHop());

  /* ---------- lưu ---------- */
  nutLuu.onclick = async () => {
    const l = dulieu.lop[dangChon];
    nutLuu.disabled = true;
    const r = await fetch(`/api/khung/${dulieu.slug}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kho: l.kho, chiSo: l.chiSo, box }),
    });
    const kq = await r.json();
    if (!kq.ok) { nutLuu.disabled = false; return bao((kq.vanDe || [kq.loi]).join(' · '), true); }
    l.box = [...kq.box];
    goc = [...kq.box];
    veHop();
    bao('Đã lưu khung. Bản cũ của cả file được cất lại phòng khi cần quay về.');
  };

  nutVe.onclick = () => { box = [...goc]; veHop(); };

  /* ---------- dựng cột phải ---------- */
  const muc = el('section', 'muc');
  muc.appendChild(el('h3', 'muc-ten', 'Khung nhấn'));
  muc.appendChild(el('p', 'nhac',
    'Bốn số là pixel trên ảnh mockup 941×1672. Kéo thẳng trên ảnh cho khớp, khỏi phải đo tay.'));
  const capSo = el('div', 'cap');
  capSo.appendChild(oSo);
  muc.append(oSo, khoaBao, nutLuu, nutVe);
  bocBang.append(muc, el('h3', 'muc-ten khung-dau', 'Các khung trong clip'), dsBoc);
  dungOSo();

  return {
    async mo(slug) {
      const d = await (await fetch(`/api/khung/${slug}`)).json();
      if (!d.ok) { bao(d.loi, true); return false; }
      dulieu = d;
      dangChon = -1;
      box = goc = null;
      hop.style.display = 'none';
      san.style.display = 'none';
      trong.style.display = '';
      veDanhSach();
      return true;
    },
    co: (slug) => Boolean(dulieu && dulieu.slug === slug),
  };
}
