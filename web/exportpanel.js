/**
 * XUẤT VIDEO — và nói thật về thời gian.
 *
 * Bộ xuất hứng hình bằng cách QUAY MÀN HÌNH theo thời gian thật, nên dựng một
 * phim 26 giây mất ít nhất 26 giây. Đó không phải chỗ chậm cần giấu, mà là điều
 * phải báo trước — người dùng chờ mà không biết chờ bao lâu thì tưởng treo.
 */

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};
const g1 = (n) => Number(n).toFixed(1).replace('.', ',');

export function taoBangXuat(boc, { laySlug, bao }) {
  let viecId = null;
  let nguon = null;

  const chonKho = el('select', 'o-nhap');
  const chonChat = el('select', 'o-nhap');
  for (const [v, n] of [['high', 'Cao — nên dùng'], ['max', 'Tối đa — file rất nặng'],
                        ['medium', 'Vừa'], ['low', 'Nhẹ']]) {
    const o = el('option', null, n); o.value = v; chonChat.appendChild(o);
  }
  chonChat.value = 'high';

  const nutXuat = el('button', 'nut chinh rong', 'Xuất video');
  const nutHuy = el('button', 'nut nho', 'Dừng');
  const nutKiem = el('button', 'nut nho rong', 'Kiểm tra bố cục');
  nutXuat.type = nutHuy.type = nutKiem.type = 'button';
  nutHuy.style.display = 'none';

  const thanh = el('div', 'tien-do');
  const vach = el('div', 'tien-do-vach');
  thanh.appendChild(vach);
  thanh.style.display = 'none';
  const trangThai = el('p', 'num-goi');
  const ketQua = el('div', 'ket-qua');

  function veKho(kho) {
    chonKho.innerHTML = '';
    for (const k of kho) {
      const o = el('option', null, k.nhan); o.value = k.v; chonKho.appendChild(o);
    }
  }

  async function napKho() {
    const slug = laySlug();
    if (!slug) return;
    try {
      const d = await (await fetch(`/api/khoxuat/${slug}`)).json();
      if (d.ok) veKho(d.kho);
    } catch { /* mở lại clip là thử lại */ }
  }

  function theoDoi(id, xong) {
    nguon?.close();
    nguon = new EventSource(`/api/job/${id}/stream`);
    nguon.onmessage = (ev) => {
      const g = JSON.parse(ev.data);
      thanh.style.display = 'block';
      vach.style.width = `${g.phanTram || 0}%`;
      trangThai.textContent = g.dong && g.trangThai === 'chay'
        ? g.dong.slice(0, 90)
        : (g.moTaChang || '');
      if (g.trangThai === 'xong' || g.trangThai === 'loi' || g.trangThai === 'huy') {
        nguon.close(); nguon = null; viecId = null;
        nutXuat.disabled = false; nutKiem.disabled = false;
        nutHuy.style.display = 'none';
        xong(g);
      }
    };
    nguon.onerror = () => { nguon?.close(); nguon = null; };
  }

  nutXuat.onclick = async () => {
    const slug = laySlug();
    if (!slug) return;
    ketQua.innerHTML = '';
    nutXuat.disabled = nutKiem.disabled = true;
    const r = await fetch('/api/export', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, preset: chonKho.value, chatLuong: chonChat.value }),
    });
    const d = await r.json();
    if (!d.ok) {
      nutXuat.disabled = nutKiem.disabled = false;
      return bao(d.loi, true);
    }
    viecId = d.id;
    nutHuy.style.display = '';
    // Nói trước thời gian: bộ xuất chạy đúng bằng thời lượng phim, cộng lúc ghép.
    const uoc = Math.round(d.giay * 1.4 + 15);
    trangThai.textContent = `Phim dài ${g1(d.giay)} giây — dựng mất khoảng ${uoc} giây.`;
    if (d.dangCho > 0) bao('Đang dựng một video khác, cái này xếp hàng chờ.');

    theoDoi(d.id, (g) => {
      if (g.trangThai === 'xong' && g.ketQua?.file) {
        const a = el('a', 'nut chinh rong', `Tải về: ${g.ketQua.file}`);
        a.href = `/clip/out/${encodeURIComponent(g.ketQua.file)}`;
        a.download = g.ketQua.file;
        const xem = el('video', 'xem-truoc');
        xem.src = a.href; xem.controls = true; xem.playsInline = true;
        ketQua.append(xem, a);
        trangThai.textContent = 'Xong.';
        bao('Đã dựng xong video.');
      } else if (g.trangThai === 'loi') {
        trangThai.textContent = '';
        bao(`Dựng video hỏng — ${g.loi}`, true);
      } else {
        trangThai.textContent = 'Đã dừng.';
      }
    });
  };

  nutHuy.onclick = () => viecId && fetch(`/api/job/${viecId}/cancel`, { method: 'POST' });

  nutKiem.onclick = async () => {
    const slug = laySlug();
    if (!slug) return;
    ketQua.innerHTML = '';
    nutKiem.disabled = nutXuat.disabled = true;
    const d = await (await fetch('/api/check-layout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })).json();
    if (!d.ok) { nutKiem.disabled = nutXuat.disabled = false; return bao(d.loi, true); }
    trangThai.textContent = 'Đang đo bố cục…';
    theoDoi(d.id, async () => {
      const v = await (await fetch(`/api/job/${d.id}`)).json();
      const dong = (v.nhatKy || []).filter((s) => !/^\s*$/.test(s));
      const hop = el('pre', 'nhat-ky', dong.slice(-24).join('\n') || 'Không có gì để báo.');
      ketQua.appendChild(hop);
      trangThai.textContent = v.trangThai === 'xong'
        ? 'Bố cục không có vấn đề.'
        : 'Có chỗ cần xem lại — xem bên dưới.';
    });
  };

  const muc = el('section', 'muc');
  muc.appendChild(el('h3', 'muc-ten', 'Xuất video'));
  const b1 = el('div', 'num'); b1.append(el('label', 'num-nhan', 'Khổ hình'), chonKho);
  const b2 = el('div', 'num'); b2.append(el('label', 'num-nhan', 'Chất lượng'), chonChat);
  const hang = el('div', 'hang-nut'); hang.append(nutXuat, nutHuy);
  muc.append(b1, b2, hang, thanh, trangThai, ketQua,
    el('hr', 'ke'), nutKiem);
  boc.appendChild(muc);

  return { napKho };
}
