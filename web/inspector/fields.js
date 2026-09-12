/**
 * CÁC LOẠI NÚM — dựng ra ô nhập cho từng kiểu dữ liệu.
 *
 * Luật xuyên suốt: người dùng không bao giờ phải nhìn thấy con số thô của bộ
 * dựng nếu con số đó không có nghĩa với họ. `pad`/`gap` là BẬC 0..7 nên hiện
 * thành thanh 8 nấc có chữ; `ease` là tên hàm toán nên hiện thành cảm giác.
 */
import { HUONG_DAN_CHUNG, TEN_BAC } from './schema.js';
import { huongDanChung } from '../huongdan.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

/**
 * Dựng một núm.
 * @param num   khai báo trong schema.js
 * @param giaTri giá trị hiện tại (có thể undefined)
 * @param doi   (giaTri) => void — gọi mỗi lần đổi
 * @param cuChi { mo(), dong() } — để gộp cả lượt rê thanh trượt thành 1 bước hoàn tác
 */
export function taoNum(num, giaTri, doi, cuChi) {
  const boc = el('div', 'num');
  const nhan = el('label', 'num-nhan', num.nhan);
  // Nút hỏi dựng TỰ ĐỘNG từ schema — thêm hướng dẫn cho một núm là khai thêm
  // `huongDan` trong `schema.js`, không phải sửa file này (§6.1 ARCHITECTURE.md).
  /*
   * Núm chung (`at`, `dur`, `pad`…) do bảng thuộc tính tự thêm cho MỌI loại phần
   * tử, nên không khai được trong `NUM_RIENG`. Tra theo `id` ở đây thay vì đi sửa
   * mười bốn chỗ gọi — thêm một núm chung mới vẫn chỉ là viết thêm ở schema.
   */
  const hd = num.huongDan ?? HUONG_DAN_CHUNG[num.id];
  // Kiểu bật/tắt tự gắn lấy ở dưới, vào cái nhãn nhìn thấy được.
  if (hd && num.kieu !== 'bat') huongDanChung().gan(nhan, hd);
  boc.appendChild(nhan);

  const dat = (v) => doi(v);
  let dieuKhien;

  switch (num.kieu) {
    case 'vanban': {
      dieuKhien = el('textarea', 'o-nhap o-van');
      dieuKhien.rows = 3;
      dieuKhien.value = giaTri ?? '';
      dieuKhien.oninput = () => dat(dieuKhien.value);
      break;
    }
    case 'chu': {
      dieuKhien = el('input', 'o-nhap');
      dieuKhien.type = 'text';
      dieuKhien.value = giaTri ?? '';
      dieuKhien.oninput = () => dat(dieuKhien.value);
      break;
    }
    case 'danhsach': {
      // Mỗi dòng một mục — dễ hiểu hơn mọi thứ giao diện "thêm/xoá hàng".
      dieuKhien = el('textarea', 'o-nhap o-van');
      dieuKhien.rows = 3;
      dieuKhien.value = Array.isArray(giaTri) ? giaTri.join('\n') : '';
      dieuKhien.placeholder = 'mỗi dòng một mục';
      dieuKhien.oninput = () =>
        dat(dieuKhien.value.split('\n').map((s) => s.trim()).filter(Boolean));
      break;
    }
    case 'so': {
      dieuKhien = el('div', 'num-so');
      const truot = el('input', 'truot');
      truot.type = 'range';
      truot.min = num.min ?? 0;
      truot.max = num.max ?? 100;
      truot.step = num.buoc ?? 1;
      truot.value = giaTri ?? num.min ?? 0;
      const o = el('input', 'o-nhap o-so');
      o.type = 'number';
      o.min = truot.min; o.max = truot.max; o.step = truot.step;
      o.value = truot.value;

      truot.onpointerdown = () => cuChi?.mo();
      truot.onpointerup = () => cuChi?.dong();
      truot.oninput = () => { o.value = truot.value; dat(Number(truot.value)); };
      o.oninput = () => { truot.value = o.value; dat(Number(o.value)); };
      dieuKhien.append(truot, o);
      break;
    }
    case 'bac': {
      // BẬC, không phải px. Mặc định là thang 0..7 của khoảng cách; núm nào có
      // thang riêng (nhoè, bóng đổ, đẩy máy) thì khai `bac` trong schema.
      dieuKhien = el('div', 'nac');
      (num.bac || TEN_BAC).forEach((ten, i) => {
        const b = el('button', 'nac-o', ten);
        b.type = 'button';
        b.setAttribute('aria-pressed', String((giaTri ?? 0) === i));
        b.onclick = () => dat(i);
        dieuKhien.appendChild(b);
      });
      break;
    }
    case 'mau': {
      dieuKhien = el('div', 'num-mau');
      const m = el('input', 'o-mau');
      m.type = 'color';
      m.value = /^#[0-9a-f]{6}$/i.test(giaTri || '') ? giaTri : '#000000';
      const o = el('input', 'o-nhap o-ma');
      o.type = 'text';
      o.value = giaTri ?? '';
      o.placeholder = '#000000';
      m.onpointerdown = () => cuChi?.mo();
      m.onchange = () => { o.value = m.value; dat(m.value); cuChi?.dong(); };
      m.oninput = () => { o.value = m.value; dat(m.value); };
      o.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(o.value)) m.value = o.value; dat(o.value); };
      dieuKhien.append(m, o);
      break;
    }
    case 'chon': {
      // Ít lựa chọn thì bày ra hết cho bấm; nhiều thì mới thu vào danh sách xổ.
      if ((num.chon || []).length <= 3) {
        dieuKhien = el('div', 'doan');
        for (const c of num.chon) {
          const b = el('button', 'doan-o', c.nhan);
          b.type = 'button';
          b.setAttribute('aria-pressed', String(giaTri === c.v));
          b.onclick = () => dat(c.v);
          dieuKhien.appendChild(b);
        }
      } else {
        dieuKhien = el('select', 'o-nhap');
        for (const c of num.chon) {
          const o = el('option', null, c.nhan);
          o.value = c.v;
          dieuKhien.appendChild(o);
        }
        dieuKhien.value = giaTri ?? num.chon[0].v;
        dieuKhien.onchange = () => dat(dieuKhien.value);
      }
      break;
    }
    case 'nhieu': {
      dieuKhien = el('div', 'nhieu');
      const dang = Array.isArray(giaTri) ? giaTri : (num.chon || []).map((c) => c.v);
      for (const c of num.chon) {
        const l = el('label', 'nhieu-o');
        const h = el('input');
        h.type = 'checkbox';
        h.checked = dang.includes(c.v);
        h.onchange = () => {
          const cu = new Set(dang);
          h.checked ? cu.add(c.v) : cu.delete(c.v);
          dat(num.chon.map((x) => x.v).filter((v) => cu.has(v)));
        };
        l.append(h, el('span', null, c.nhan));
        dieuKhien.appendChild(l);
      }
      break;
    }
    case 'bat': {
      // Ô đánh dấu thì CHÍNH TÊN NÚM là nhãn, không phải chữ "Bật" chung chung —
      // người dùng cần đọc được "Hạ sóng xuống" chứ không phải đoán "bật cái gì".
      dieuKhien = el('label', 'cong-tac');
      const h = el('input');
      h.type = 'checkbox';
      h.checked = Boolean(giaTri);
      h.onchange = () => dat(h.checked);
      const chuBat = el('span', null, num.nhan);
      dieuKhien.append(h, chuBat);
      nhan.classList.add('an-nhan');
      /*
       * Nhãn trên bị ẩn (chữ đã nằm cạnh ô đánh dấu rồi), nên nút hỏi gắn ở đó
       * cũng ẩn theo — chuột không thấy mà bàn phím cũng không tới được. Dời
       * sang cái nhãn đang nhìn thấy.
       */
      if (hd) huongDanChung().gan(chuBat, hd);
      break;
    }
    case 'anh': {
      dieuKhien = el('div', 'num-anh');
      const o = el('input', 'o-nhap');
      o.type = 'text';
      o.value = giaTri ?? '';
      o.placeholder = 'public/ten-file.png';
      const xem = el('div', 'anh-xem');
      const veXem = (v) => {
        xem.innerHTML = '';
        if (!v) return;
        const i = el('img');
        i.src = `/clip/${v}`;
        i.alt = '';
        i.onerror = () => { xem.textContent = 'không thấy file'; };
        xem.appendChild(i);
      };
      veXem(o.value);
      o.oninput = () => { veXem(o.value); dat(o.value); };
      dieuKhien.append(o, xem);
      break;
    }
    /*
     * CHỌN VIDEO — khác hẳn chọn ảnh, vì một file video TRÔNG THÌ ỔN mà vẫn có
     * thể không phát được: `BG.mp4` của dự án là HEVC, Chromium không giải mã.
     * Thả nó vào clip thì ra một ô đen, không lỗi, không báo gì. Nên ở đây phải
     * nói thẳng file nào dùng được, và mời chuyển đổi ngay tại chỗ.
     */
    /*
     * KHE MEDIA — một chỗ nhận CẢ ảnh LẪN phim: màn hình điện thoại, cửa sổ
     * trình duyệt. Đoán theo đuôi file, không bắt người dùng khai thêm một núm
     * "đây là ảnh hay phim" — thêm một núm là thêm một chỗ khai sai.
     *
     * Có phim thì hỏi luôn máy chủ xem trình duyệt mở được không. Đây không phải
     * cẩn thận thừa: `intro.mp4`, `outro.mp4` và `BG.mp4` của chính dự án đều là
     * HEVC — Chromium không giải được, đặt vào clip ra đúng một ô ĐEN mà không
     * báo lỗi gì. Xem `docs/VIDEO-TRONG-CLIP.md`.
     */
    case 'hinh': {
      dieuKhien = el('div', 'num-anh');
      const o = el('input', 'o-nhap');
      o.type = 'text';
      o.value = giaTri ?? '';
      o.placeholder = 'public/ten-file.png · public/video/ten-file.mp4';
      const xem = el('div', 'anh-xem');
      const tinh = el('p', 'num-goi');
      const LA_PHIM = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
      let kho = null;

      const veTinh = (v) => {
        if (!LA_PHIM.test(v) || !kho) { tinh.textContent = ''; return; }
        const f = kho.find((x) => x.duongDan === v);
        if (!f) { tinh.textContent = 'File này không nằm trong thư mục video của dự án.'; return; }
        tinh.textContent = f.chayDuoc
          ? `${String(f.codec).toUpperCase()} · ${f.rong}×${f.cao}`
            + (f.giay ? ` · ${f.giay.toFixed(1)} giây` : '')
          : `Định dạng ${String(f.codec).toUpperCase()} — trình duyệt không mở được, `
            + 'đặt vào clip sẽ ra một ô đen. Mở mục Video để chuyển định dạng.';
      };

      const veXem = (v) => {
        xem.innerHTML = '';
        if (!v) { tinh.textContent = ''; return; }
        if (LA_PHIM.test(v)) {
          const p2 = el('video');
          p2.src = `/clip/${v}`;
          p2.muted = true; p2.loop = true; p2.playsInline = true;
          p2.style.maxWidth = '100%';
          p2.style.maxHeight = '110px';
          p2.onloadeddata = () => p2.play().catch(() => {});
          p2.onerror = () => { xem.textContent = 'không mở được file'; };
          xem.appendChild(p2);
          if (kho === null) {
            kho = [];
            fetch('/api/nguon-video').then((r) => r.json())
              .then((d) => { kho = d.ok ? d.video : []; veTinh(o.value); })
              .catch(() => {});
          }
        } else {
          const i = el('img');
          i.src = `/clip/${v}`;
          i.alt = '';
          i.onerror = () => { xem.textContent = 'không thấy file'; };
          xem.appendChild(i);
        }
        veTinh(v);
      };
      veXem(o.value);
      o.oninput = () => { veXem(o.value); dat(o.value); };
      dieuKhien.append(o, xem, tinh);
      break;
    }
    case 'video': {
      dieuKhien = el('div', 'num-video');
      const chon = el('select', 'o-nhap');
      const tinh = el('p', 'num-goi');
      const nutChuyen = el('button', 'nut nho rong', 'Chuyển sang định dạng xem được');
      nutChuyen.type = 'button';
      nutChuyen.style.display = 'none';
      const xem = el('video', 'video-xem-truoc');
      xem.muted = true; xem.loop = true; xem.playsInline = true; xem.controls = false;
      xem.style.display = 'none';

      let kho = [];

      const veTinh = () => {
        const v = kho.find((x) => x.duongDan === chon.value);
        nutChuyen.style.display = 'none';
        xem.style.display = 'none';
        if (!chon.value) { tinh.textContent = 'Chưa chọn file nào.'; return; }
        if (!v) { tinh.textContent = 'File này không nằm trong thư mục video của dự án.'; return; }
        if (v.chayDuoc) {
          tinh.textContent = `${v.codec.toUpperCase()} · ${v.rong}×${v.cao}`
            + (v.giay ? ` · ${v.giay.toFixed(1)} giây` : '');
          xem.src = `/clip/${v.duongDan}`;
          xem.style.display = 'block';
          xem.play().catch(() => {});
          return;
        }
        tinh.innerHTML = '';
        tinh.append(`Định dạng ${String(v.codec).toUpperCase()} — trình duyệt không mở được, `
          + 'đặt vào clip sẽ ra một ô đen.');
        nutChuyen.style.display = '';
        nutChuyen.disabled = false;
        nutChuyen.textContent = v.banChuyen
          ? 'Dùng bản đã chuyển sẵn' : 'Chuyển sang định dạng xem được';
        nutChuyen.onclick = v.banChuyen
          ? () => { chon.value = v.banChuyen; dat(v.banChuyen); napKho(v.banChuyen); }
          : () => chuyen(v);
      };

      const veChon = (dangChon) => {
        chon.innerHTML = '';
        const trong = el('option', null, '— chưa chọn —');
        trong.value = '';
        chon.appendChild(trong);
        for (const v of kho) {
          const o = el('option', null, v.chayDuoc ? v.ten : `${v.ten}  (không mở được)`);
          o.value = v.duongDan;
          chon.appendChild(o);
        }
        // Giá trị đang lưu mà không còn trong thư mục thì vẫn phải hiện ra, không
        // thì mở clip cũ lên là núm tự nhảy về rỗng và người dùng mất dữ liệu.
        if (dangChon && !kho.some((v) => v.duongDan === dangChon)) {
          const o = el('option', null, `${dangChon} (không thấy file)`);
          o.value = dangChon;
          chon.appendChild(o);
        }
        chon.value = dangChon || '';
      };

      async function napKho(dangChon) {
        try {
          const d = await (await fetch('/api/nguon-video')).json();
          kho = d.ok ? d.video : [];
        } catch { kho = []; }
        veChon(dangChon ?? chon.value ?? giaTri ?? '');
        veTinh();
      }

      async function chuyen(v) {
        nutChuyen.disabled = true;
        nutChuyen.textContent = 'Đang chuyển…';
        tinh.textContent = 'Việc này chạy một lần cho mỗi file, xong là dùng mãi.';
        try {
          const d = await (await fetch('/api/chuyen-video', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ten: v.ten }),
          })).json();
          if (!d.ok) throw new Error(d.loi || 'Không chuyển được.');
          const nguon = new EventSource(`/api/job/${d.id}/stream`);
          nguon.onmessage = async (ev) => {
            const g = JSON.parse(ev.data);
            if (g.trangThai === 'chay') {
              nutChuyen.textContent = `Đang chuyển… ${g.phanTram || 0}%`;
            } else if (g.trangThai === 'xong') {
              nguon.close();
              chon.value = d.ra;
              dat(d.ra);            // trỏ clip sang bản vừa chuyển
              await napKho(d.ra);
            } else if (g.trangThai === 'loi' || g.trangThai === 'huy') {
              nguon.close();
              nutChuyen.disabled = false;
              nutChuyen.textContent = 'Chuyển lại';
              tinh.textContent = `Chuyển hỏng — ${g.loi || 'đã dừng'}`;
            }
          };
        } catch (e) {
          nutChuyen.disabled = false;
          nutChuyen.textContent = 'Chuyển lại';
          tinh.textContent = e.message;
        }
      }

      chon.onchange = () => { dat(chon.value); veTinh(); };
      dieuKhien.append(chon, tinh, nutChuyen, xem);
      napKho(giaTri ?? '');
      break;
    }
    default:
      dieuKhien = el('div', 'num-la', String(giaTri ?? ''));
  }

  boc.appendChild(dieuKhien);
  /*
   * Núm đã có hướng dẫn đầy đủ thì KHÔNG in dòng gợi ý ra nữa — nó đã nằm trong
   * bong bóng. Đây chính là chỗ bảng thuộc tính gọn lại: trước đây gần trăm núm
   * mỗi núm kèm một dòng chữ xám, cuộn mãi không hết.
   * Vẫn giữ `goi` cho những chỗ nó là GIÁ TRỊ ĐANG DÙNG ("0,6 giây") — thứ phải
   * nhìn thấy ngay chứ không phải đi hỏi.
   */
  if (num.goi && (num.goiSong || !hd)) boc.appendChild(el('p', 'num-goi', num.goi));
  return boc;
}
