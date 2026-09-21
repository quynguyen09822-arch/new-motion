/**
 * XUẤT VIDEO — và nói thật về thời gian.
 *
 * HAI CÁCH DỰNG, và phải nói rõ cái nào đang chạy:
 *   · "Nhanh" nhảy thẳng tới từng mốc giây rồi chụp, chia 4 luồng. Đo được nhanh
 *     gấp khoảng 2,8 lần so với quay thật, và cho ra ĐÚNG một file mỗi lần chạy.
 *   · "Trung thực" quay màn hình theo thời gian thật — phim 26 giây mất ít nhất
 *     26 giây. Giữ lại làm đối chứng khi nghi hình ra sai.
 *
 * Thời gian chờ vẫn phải báo trước dù đã nhanh hơn: người dùng chờ mà không biết
 * chờ bao lâu thì tưởng treo.
 */

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};
const g1 = (n) => Number(n).toFixed(1).replace('.', ',');

import { soatChatLuong } from './soat.js';

export function taoBangXuat(boc, { laySlug, bao, layDoc, chonMon }) {
  let viecId = null;
  let nguon = null;

  const chonKho = el('select', 'o-nhap');
  const chonChat = el('select', 'o-nhap');
  for (const [v, n] of [['high', 'Cao — nên dùng'], ['max', 'Tối đa — file rất nặng'],
                        ['medium', 'Vừa'], ['low', 'Nhẹ']]) {
    const o = el('option', null, n); o.value = v; chonChat.appendChild(o);
  }
  chonChat.value = 'high';

  const chonDinh = el('select', 'o-nhap');
  for (const [v, n] of [['mp4', 'MP4 — mặc định, đăng đâu cũng được'],
                        ['webm', 'WebM — nhẹ hơn, để nhúng web'],
                        ['gif', 'GIF — ảnh động gửi chat'],
                        ['png', 'Chuỗi ảnh PNG — đưa sang phần mềm khác']]) {
    const o = el('option', null, n); o.value = v; chonDinh.appendChild(o);
  }

  const chonCach = el('select', 'o-nhap');
  for (const [v, n] of [['nhanh', 'Nhanh — nhảy từng khung, 4 luồng'],
                        ['trung-thuc', 'Trung thực — quay thời gian thật (chậm)']]) {
    const o = el('option', null, n); o.value = v; chonCach.appendChild(o);
  }

  /* Cách cũ chỉ ra được MP4 — máy chủ cũng chặn, nhưng chặn ngay ở đây thì người
     dùng không phải bấm rồi mới biết mình chọn sai. */
  const hopCach = () => {
    const cu = chonCach.value === 'trung-thuc';
    for (const o of chonDinh.options) o.disabled = cu && o.value !== 'mp4';
    if (cu) chonDinh.value = 'mp4';
    chonChat.disabled = !cu;    // chất lượng chỉ có nghĩa với bộ cũ
  };
  chonCach.onchange = hopCach;
  hopCach();

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

  /**
   * ĐƯỜNG THOÁT khi bản chạy này không dựng được video.
   *
   * Bản trong Docker không có ffmpeg lẫn Chromium (ảnh sẽ phình từ ~90 MB lên
   * khoảng 1 GB — xem TRIEN-KHAI.md). Câu báo lỗi vốn đã viết tử tế, nhưng
   * người dùng vẫn đi vào ngõ cụt: họ muốn cái video, còn công cụ chỉ nói "hãy
   * mở dự án trên máy làm việc" mà không đưa cho họ thứ gì để mang đi.
   *
   * Nút này đưa đúng thứ đó: file kịch bản, mở lại bằng Motion ở máy là xuất
   * được ngay.
   */
  function veDuongThoat(slug, cau) {
    ketQua.innerHTML = '';
    const hop = el('div', 'duong-thoat');
    hop.appendChild(el('b', null, 'Bản chạy này chưa dựng được video'));
    hop.appendChild(el('p', null, cau));
    const a = document.createElement('a');
    a.className = 'nut chinh rong';
    a.href = `/api/tai-kich-ban/${encodeURIComponent(slug)}`;
    /* `download` để trình duyệt tải xuống thay vì mở JSON ra xem — máy chủ đã
       gửi kèm `Content-Disposition` rồi, đây là lớp thứ hai cho chắc. */
    a.download = `${slug}.json`;
    a.textContent = 'Tải kịch bản về máy';
    hop.appendChild(a);
    hop.appendChild(el('p', 'thoat-chi', 'Mở Motion ở máy làm việc, thả file này vào '
      + 'thư mục kịch bản rồi bấm Xuất video như thường.'));
    ketQua.appendChild(hop);
  }

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
      body: JSON.stringify({ slug, preset: chonKho.value, chatLuong: chonChat.value,
        dinhDang: chonDinh.value, cach: chonCach.value }),
    });
    const d = await r.json();
    if (!d.ok) {
      nutXuat.disabled = nutKiem.disabled = false;
      /* Bản chạy thiếu ffmpeg/Chromium thì đừng dừng ở câu báo lỗi — mở đường
         thoát. Xem mục M5 trong TIEP-THEO.md. */
      if (d.taiDuoc) return veDuongThoat(slug, d.loi);
      return bao(d.loi, true);
    }
    viecId = d.id;
    nutHuy.style.display = '';
    /* Ước lượng theo ĐÚNG cách đang chạy. Đo được: nhảy khung ~0,64 giây phim
       mỗi giây chờ (4 luồng, máy rảnh); quay thật thì 1 đổi 1, cộng lúc ghép.
       Số này tụt khi máy bận — nên nói "khoảng", đừng nói chắc. */
    const uoc = d.nhanh ? Math.round(d.giay * 0.65 + 12) : Math.round(d.giay * 1.4 + 15);
    trangThai.textContent = `Phim dài ${g1(d.giay)} giây — dựng mất khoảng ${uoc} giây`
      + (d.nhanh ? ' (cách nhanh).' : ' (cách trung thực).');
    if (d.dangCho > 0) bao('Đang dựng một video khác, cái này xếp hàng chờ.');

    theoDoi(d.id, (g) => {
      if (g.trangThai === 'xong' && g.ketQua?.file) {
        const a = el('a', 'nut chinh rong', `Tải về: ${g.ketQua.file}`);
        a.href = `/clip/out/${encodeURIComponent(g.ketQua.file)}`;
        a.download = g.ketQua.file;
        /* Thẻ <video> không mở được GIF, và chuỗi ảnh thì chẳng có file nào để
           mở. Đưa nhầm thẻ là ô xem trước đen thui mà không báo gì. */
        const duoi = (g.ketQua.file.split('.').pop() || '').toLowerCase();
        if (duoi === 'gif') {
          const xem = el('img', 'xem-truoc'); xem.src = a.href; xem.alt = 'Ảnh động vừa dựng';
          ketQua.appendChild(xem);
        } else if (duoi === 'mp4' || duoi === 'webm') {
          const xem = el('video', 'xem-truoc');
          xem.src = a.href; xem.controls = true; xem.playsInline = true;
          ketQua.appendChild(xem);
        }
        ketQua.appendChild(a);
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

  /* ---------- soát chất lượng ---------- *
   * Chạy ngay trong trình duyệt, không qua máy chủ, không xếp hàng — nên hiện
   * được LIÊN TỤC trong lúc sửa. Khác hẳn "Kiểm tra bố cục" bên dưới: cái đó
   * mở Chromium thật để đo, chính xác hơn nhưng mất vài chục giây.
   */
  const bocSoat = el('div', 'soat');
  let moNhe = false;

  function veSoat() {
    const doc = layDoc?.();
    bocSoat.innerHTML = '';
    if (!doc) return { soNang: 0 };
    const kq = soatChatLuong(doc);

    if (!kq.loi.length) {
      bocSoat.appendChild(el('p', 'soat-sach', '✓ Không thấy vấn đề nào.'));
      return kq;
    }

    const hang = (l) => {
      const b = el('button', `soat-hang ${l.nang ? 'nang' : 'nhe'}`);
      b.type = 'button';
      b.append(el('span', 'soat-cham'), el('span', 'soat-cau', l.cau));
      if (l.goiY) b.appendChild(el('span', 'soat-goi', l.goiY));
      // Bấm vào lời báo là nhảy thẳng tới món có vấn đề — đọc xong phải sửa
      // được ngay, không bắt người dùng tự đi tìm "chu-1" nằm ở đâu.
      if (l.canhId) b.onclick = () => chonMon?.({ canhId: l.canhId, monId: l.monId });
      return b;
    };

    for (const l of kq.loi.filter((x) => x.nang)) bocSoat.appendChild(hang(l));

    const nhe = kq.loi.filter((x) => !x.nang);
    if (nhe.length) {
      const nut = el('button', 'soat-them');
      nut.type = 'button';
      const datChu = () => {
        nut.textContent = moNhe
          ? `Ẩn ${nhe.length} chỗ nên xem lại`
          : `Còn ${nhe.length} chỗ nên xem lại — bấm để xem`;
      };
      nut.onclick = () => {
        moNhe = !moNhe;
        veSoat();
      };
      datChu();
      bocSoat.appendChild(nut);
      if (moNhe) for (const l of nhe) bocSoat.appendChild(hang(l));
    }
    return kq;
  }

  const mucSoat = el('section', 'muc');
  mucSoat.append(el('h3', 'muc-ten', 'Soát trước khi xuất'), bocSoat);
  boc.appendChild(mucSoat);

  const muc = el('section', 'muc');
  muc.appendChild(el('h3', 'muc-ten', 'Xuất video'));
  const b1 = el('div', 'num'); b1.append(el('label', 'num-nhan', 'Khổ hình'), chonKho);
  const b2 = el('div', 'num'); b2.append(el('label', 'num-nhan', 'Chất lượng'), chonChat);
  const b3 = el('div', 'num'); b3.append(el('label', 'num-nhan', 'Định dạng'), chonDinh);
  const b4 = el('div', 'num'); b4.append(el('label', 'num-nhan', 'Cách dựng'), chonCach);
  const hang = el('div', 'hang-nut'); hang.append(nutXuat, nutHuy);
  muc.append(b1, b3, b4, b2, hang, thanh, trangThai, ketQua,
    el('hr', 'ke'), nutKiem);
  boc.appendChild(muc);

  return { napKho, veSoat };
}
