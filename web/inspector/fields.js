/**
 * CÁC LOẠI NÚM — dựng ra ô nhập cho từng kiểu dữ liệu.
 *
 * Luật xuyên suốt: người dùng không bao giờ phải nhìn thấy con số thô của bộ
 * dựng nếu con số đó không có nghĩa với họ. `pad`/`gap` là BẬC 0..7 nên hiện
 * thành thanh 8 nấc có chữ; `ease` là tên hàm toán nên hiện thành cảm giác.
 */
import { TEN_BAC } from './schema.js';

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
      // BẬC 0..7, không phải px. Bộ soát báo lỗi nếu lọt ra ngoài khoảng này.
      dieuKhien = el('div', 'nac');
      TEN_BAC.forEach((ten, i) => {
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
      dieuKhien.append(h, el('span', null, num.nhan));
      nhan.classList.add('an-nhan');
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
    default:
      dieuKhien = el('div', 'num-la', String(giaTri ?? ''));
  }

  boc.appendChild(dieuKhien);
  if (num.goi) boc.appendChild(el('p', 'num-goi', num.goi));
  return boc;
}
