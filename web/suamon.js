/**
 * THẺ "SỬA MÓN" — chọn một thành phần trên khung hình rồi bảo AI sửa nó.
 *
 * KHÁC THẺ "DỰNG HÌNH": kia dựng mới cả một cảnh, đây chỉ động vào ĐÚNG MỘT món
 * đang chọn. Phạm vi hẹp là chỗ mạnh nhất — AI không phải đoán cả bố cục.
 *
 * BẢNG THAY ĐỔI LÀ PHẦN QUAN TRỌNG NHẤT CỦA MÀN HÌNH NÀY.
 *   Hiện đúng từng trường: cũ → mới. "Đã sửa xong" mà không nói sửa gì thì không
 *   ai dám bấm nhận, và người dùng sẽ tự đi dò xem AI vừa đụng vào cái gì.
 *
 * NÓI RA CẢ NHỮNG THỨ ĐÃ BỎ. AI hay bịa tên trường nghe rất hợp lý mà bộ dựng
 *   không đọc được. Máy chủ lọc bỏ, còn ở đây phải NÓI là đã bỏ những gì — im
 *   lặng bỏ thì người dùng tưởng AI làm rồi mà nhìn không thấy đổi.
 */
import { taoThaAnh } from './thaanh.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};
const gon = (v) => {
  if (v === null || v === undefined) return '(chưa đặt)';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 52 ? `${s.slice(0, 50)}…` : s;
};

/**
 * TRẠNG THÁI CỦA NÚT "SỬA THỬ" VÀ DÒNG CHỈ ĐƯỜNG — hàm THUẦN, không đụng DOM.
 *
 * Tách rời ra để kiểm được thẳng bằng `node`, không cần dựng trình duyệt. Luật
 * ở đây từng nằm lẫn trong hàm vẽ, và cái nhánh quan trọng nhất — "clip chưa
 * lưu" — chỉ chạy đúng một lần trong đời, lúc người dùng gặp lỗi thật.
 *
 * VÌ SAO "CHƯA LƯU" LẠI CHẶN:
 *   Máy chủ đọc clip TỪ ĐĨA rồi mới tìm món. Màn hình thì đang giữ bản trong bộ
 *   nhớ. Món vừa tạo mà chưa lưu: bảng này ghi đúng tên nó, còn máy chủ trả
 *   "Không thấy thành phần đang chọn" — câu ấy vô nghĩa với người đang nhìn
 *   thấy tên món ngay trước mắt. Mà lượt gọi đó vẫn tốn tiền và trừ hạn mức
 *   ngày. Nên chặn TRƯỚC, và nói rõ phải làm gì.
 */
export function trangThaiSua({ coMon, coY, chuaLuu, dangSua }) {
  const hien = Boolean(coMon && coY);
  return {
    hien,
    canh: hien && Boolean(chuaLuu),
    chu: !hien ? ''
      : chuaLuu
        ? 'Bấm Lưu (Ctrl+S) trước đã — AI đọc bản đã lưu trên máy chủ, nên nó '
          + 'chưa thấy những gì bạn vừa sửa.'
        : 'AI sẽ chỉ đổi những núm của riêng món này, không đụng món khác. '
          + 'Xem xong mới bấm nhận.',
    khoa: Boolean(dangSua || !coMon || !coY || chuaLuu),
    nhan: dangSua ? 'AI đang sửa…'
      : !coMon ? 'Chọn một món trước'
        : !coY ? 'Nói xem muốn sửa gì'
          : chuaLuu ? 'Lưu clip trước đã' : 'Sửa thử',
  };
}

export function taoSuaMon(boc, { laySlug, layChon, tenMon, bao, nhanVa, chuaLuu }) {
  const muc = el('div', 'muc-dung');
  let ketQua = null;
  let dangSua = false;

  const dangChon = el('p', 'sua-chon');

  /* DÒNG CHỈ ĐƯỜNG, ngay dưới ô gõ. Chỉ hiện KHI ĐÃ GÕ — nói trước lúc người ta
     chưa định làm gì là một dòng chữ thừa. Câu chữ do `trangThaiSua` quyết. */
  const chiDuong = el('p', 'sua-chi-duong an');
  const kq = el('div', 'dung-kq an');

  const oAnh = taoThaAnh({
    chinh: 'Ảnh minh hoạ (không bắt buộc)',
    phu: 'Muốn nó trông giống một mẫu nào đó thì dán ảnh vào đây — PNG, JPG, WebP',
    dangHien: () => !boc.classList.contains('an'),
    khiDoi: () => { ketQua = null; veKetQua(); veNut(); },
    bao,
  });

  const oY = el('textarea', 'o-nhap o-y o-sua-y');
  oY.rows = 3;
  oY.placeholder = 'Muốn sửa gì? Ví dụ: "làm chữ to hơn và cho bay lên từ dưới", '
    + '"đổi nền sang màu nhấn, bo góc tròn hơn", "cho nó hiện ra muộn hơn nửa giây".';
  oY.setAttribute('aria-label', 'Muốn sửa gì');
  oY.oninput = veNut;

  const nut = el('button', 'nut chinh rong nut-sua', 'Chọn một món trước');
  nut.type = 'button';
  nut.disabled = true;

  function veNut() {
    const c = layChon?.();
    const co = Boolean(c?.monId);
    const cauY = oY.value.trim() || oAnh.lay();
    /* Chặn TRƯỚC khi gọi, không để nó chạy rồi hỏng: lượt gọi AI tốn tiền và
       trừ vào hạn mức ngày, mà lượt này thì chắc chắn hỏng. */
    const t = trangThaiSua({
      coMon: co, coY: Boolean(cauY), chuaLuu: Boolean(chuaLuu?.()), dangSua,
    });

    chiDuong.classList.toggle('an', !t.hien);
    chiDuong.classList.toggle('sua-can', t.canh);
    if (t.hien) chiDuong.textContent = t.chu;

    nut.disabled = t.khoa;
    nut.textContent = t.nhan;
  }

  function veChon() {
    const c = layChon?.();
    if (!c?.monId) {
      dangChon.className = 'sua-chon trong';
      dangChon.textContent = 'Chưa chọn món nào. Bấm vào một thành phần trên khung hình '
        + 'hoặc trong danh sách bên trái, rồi quay lại đây.';
      return;
    }
    dangChon.className = 'sua-chon';
    dangChon.textContent = `Đang sửa: ${tenMon?.(c) || c.monId}`;
  }

  function veKetQua() {
    kq.innerHTML = '';
    kq.classList.remove('hong');
    if (!ketQua) { kq.classList.add('an'); return; }
    kq.classList.remove('an');
    const { doi, boQua, vanDe } = ketQua;

    kq.appendChild(el('p', 'dung-tom', `AI đổi ${doi.length} thứ:`));
    const bang = el('div', 'sua-bang');
    for (const d of doi) {
      const h = el('div', 'sua-dong');
      h.append(
        el('span', 'sua-truong', d.truong),
        el('span', 'sua-cu', gon(d.cu)),
        el('span', 'sua-mui', '→'),
        el('span', 'sua-moi', gon(d.moi)),
      );
      bang.appendChild(h);
    }
    kq.appendChild(bang);

    if (boQua?.length) {
      kq.appendChild(el('p', 'dung-loi-dong',
        `Đã bỏ ${boQua.length} thứ AI đề nghị mà bộ dựng không đọc được: ${boQua.slice(0, 4).join(', ')}`));
    }

    if (vanDe?.length) {
      kq.classList.add('hong');
      kq.appendChild(el('p', 'dung-loi', `Còn ${vanDe.length} chỗ chưa hợp lệ — không nhận được:`));
      for (const v of vanDe.slice(0, 5)) kq.appendChild(el('p', 'dung-loi-dong', `· ${v}`));
      return;
    }

    const hang = el('div', 'hang-nut');
    const nhan = el('button', 'nut chinh', 'Nhận bản sửa');
    nhan.type = 'button';
    nhan.onclick = () => {
      nhanVa?.(ketQua.va);
      ketQua = null; veKetQua(); veNut();
      bao('Đã áp bản sửa. Không ưng thì Ctrl+Z.');
    };
    const bo = el('button', 'nut nho rong', 'Bỏ, sửa lại');
    bo.type = 'button';
    bo.onclick = () => { ketQua = null; veKetQua(); };
    hang.append(nhan, bo);
    kq.appendChild(hang);
  }

  nut.onclick = async () => {
    const slug = laySlug?.();
    const c = layChon?.();
    if (!slug || !c?.monId || dangSua) return;
    dangSua = true; veNut();
    kq.classList.remove('an', 'hong');
    kq.innerHTML = '';
    kq.appendChild(el('p', 'dung-tom', 'AI đang xem và sửa…'));
    try {
      const anh = oAnh.lay();
      const r = await fetch('/api/sua-mon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, canhId: c.canhId, monId: c.monId, y: oY.value.trim(),
          ...(anh ? { anh: anh.b64, mime: anh.mime } : {}),
        }),
      });
      const d = await r.json();
      if (!d.doi) {
        kq.classList.add('hong'); kq.innerHTML = '';
        kq.appendChild(el('p', 'dung-loi', d.loi || d.cau || 'AI sửa hỏng.'));
        return;
      }
      ketQua = d; veKetQua();
    } catch (e) {
      kq.classList.add('hong'); kq.innerHTML = '';
      kq.appendChild(el('p', 'dung-loi', `AI sửa hỏng — ${String(e.message || e).slice(0, 80)}`));
    } finally { dangSua = false; veNut(); }
  };

  const trai = el('div', 'ai-cot');
  const phai = el('div', 'ai-cot');
  trai.append(dangChon, oY, chiDuong, oAnh.node, oAnh.oFile, nut);
  phai.append(kq);
  muc.append(trai, phai);
  boc.appendChild(muc);
  veChon(); veNut();
  return { ve: () => { veChon(); oAnh.ve(); veNut(); veKetQua(); } };
}
