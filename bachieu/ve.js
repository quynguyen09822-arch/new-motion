/**
 * DỰNG KHỐI NỔI RA MÀN HÌNH.
 *
 * Chỉ file này biết tới DOM. Mọi phép tính nằm ở `hinhhoc.js`, mọi hình dạng
 * nằm ở `khoi.js` — nên muốn biết "vì sao mặt này tối thế" thì đọc `hinhhoc.js`,
 * không phải đọc file này.
 *
 * CHIA LÀM HAI VIỆC, cố ý:
 *
 *   `dung()`  — tạo thẻ. Chạy khi ĐỔI HÌNH DẠNG (đổi loại khối, đổi kích thước).
 *   `veTai()` — vẽ tại giây t. Chạy mỗi khung hình, chỉ sửa màu và góc.
 *
 * Gộp hai việc này làm một là mỗi khung hình lại xoá sạch rồi tạo lại sáu thẻ.
 * Chạy thì vẫn chạy, nhưng tới lúc có năm khối trên sân là bắt đầu giật, mà
 * triệu chứng lại giống hệt "máy chủ yếu" — đi sai hướng cả buổi.
 */
import { matCuaHop, matCuaTru, phapTuyen, doSang, mauTheoSang, gocTai, DEN_MAC_DINH } from './hinhhoc.js';
import { boCuc } from './khoi.js';

const the = (lop, kieu) => {
  const n = document.createElement('div');
  n.className = lop;
  if (kieu) Object.assign(n.style, kieu);
  return n;
};

/**
 * Dựng thẻ cho một khối. Trả về thứ `veTai()` cần để vẽ nhanh.
 *
 * @returns {{goc:HTMLElement, matDS:Array, chuDS:Array}}
 */
export function dung(cha, khoi) {
  cha.textContent = '';
  const bc = boCuc(khoi);
  const goc = the('bc-goc');
  cha.appendChild(goc);

  const matDS = [];
  const chuDS = [];

  if (bc.kieu === 'chu') {
    /* CHỮ NỔI. Không có hình khối thật — chỉ là nhiều bản chữ xếp lùi dần theo
       chiều sâu. Mắt người ghép chúng lại thành một khối đặc. Mẹo cũ của nghề
       làm hiệu ứng chữ, và nó rẻ hơn dựng hình thật vài trăm lần. */
    const buoc = (khoi.day ?? 28) / Math.max(1, bc.lop - 1);
    for (let i = bc.lop - 1; i >= 0; i--) {
      const l = the('bc-lop', {
        /* Căn giữa bằng TRANSFORM, không bằng `margin-left:-50%`. Thẻ cha
           `.bc-goc` chỉ chứa con tuyệt đối nên bề ngang của nó bằng 0, mà phần
           trăm thì tính theo bề ngang ấy → -50% hoá ra bằng 0, và cả dòng chữ
           trôi sang phải. Đã sập đúng kiểu này, chỉ thấy khi mở trình duyệt. */
        transform: `translate(-50%, -50%) translateZ(${-i * buoc}px)`,
        fontSize: (khoi.coChu ?? 76) + 'px',
      });
      l.textContent = khoi.chu || '';
      goc.appendChild(l);
      /* Lớp ngoài cùng (i=0) là mặt người xem nhìn thẳng vào → pháp tuyến +z.
         Các lớp sau đóng vai thành bên, nên cho tối dần. */
      chuDS.push({ el: l, mat: i === 0, sau: i / Math.max(1, bc.lop - 1) });
    }
    return { goc, matDS, chuDS };
  }

  for (const con of bc.khoiCon) {
    const hop = the('bc-hop', {
      transform: `translate3d(${con.x}px, ${-con.y}px, ${con.z}px)`,
    });
    /* Hộp hay ống trụ — chỉ khác nhau ở bộ mặt. Phần dựng thẻ, chiếu đèn và
       nhuộm màu dùng chung hết, nên thêm hình mới sau này chỉ là thêm một hàm
       sinh mặt chứ không phải thêm một nhánh vẽ. */
    for (const m of (con.hinh === 'tru' ? matCuaTru(con) : matCuaHop(con))) {
      const f = the('bc-mat', {
        width: m.w + 'px',
        height: m.h + 'px',
        marginLeft: -m.w / 2 + 'px',
        marginTop: -m.h / 2 + 'px',
        transform: m.bien,
        /* Nắp ống trụ là một hình vuông bo tròn thành đĩa. */
        ...(m.tron ? { borderRadius: '50%' } : null),
      });
      /* Chữ chỉ đặt lên mặt được chỉ định. Logo khối thì đặt lên cả sáu. */
      const chu = con.dauMoiMat ?? con.chuMat?.[m.id];
      if (chu) {
        const s = the('bc-chu', {
          fontSize: (khoi.coChu ?? Math.round(Math.min(m.w, m.h) * 0.3)) + 'px',
          ...(con.chuODuoi ? { alignSelf: 'end', paddingBottom: '6px' } : null),
        });
        s.textContent = chu;
        f.appendChild(s);
      }
      hop.appendChild(f);
      matDS.push({ el: f, n: m.n, pha: con.pha ?? 1 });
    }
    goc.appendChild(hop);
  }
  return { goc, matDS, chuDS };
}

/**
 * Vẽ khối tại giây `t`.
 *
 * HÀM THUẦN THEO `t` — không đọc đồng hồ, không giữ biến đếm. Gọi với cùng một
 * `t` hai lần phải ra đúng một hình. Đây là điều kiện để tua được, và để chế độ
 * xuất "vẽ kỹ" ở Giai đoạn 5 chạy được.
 */
export function veTai(dat, khoi, t = 0) {
  const { ngang, doc } = gocTai(khoi, t);
  const den = khoi.den || DEN_MAC_DINH;
  const mau = khoi.mau || '#FF7A2F';

  dat.goc.style.transform = `rotateX(${doc}deg) rotateY(${ngang}deg)`;

  for (const m of dat.matDS) {
    const s = doSang(phapTuyen(m.n, ngang, doc), den) * m.pha;
    m.el.style.background = mauTheoSang(mau, s);
  }

  for (const c of dat.chuDS) {
    /* Mặt trước ăn đèn như một mặt phẳng hướng +z; các lớp sau là thành bên nên
       tối dần theo độ sâu. Tính riêng thay vì dùng chung công thức mặt hộp, vì
       chúng không phải mặt thật — ép vào chung công thức sẽ ra chữ nhấp nháy
       mỗi khi khối quay qua góc 90°. */
    const s = c.mat
      ? doSang(phapTuyen([0, 0, 1], ngang, doc), den)
      : (den.nen ?? DEN_MAC_DINH.nen) * (1 - c.sau * 0.45);
    c.el.style.color = mauTheoSang(mau, s);
  }
}
