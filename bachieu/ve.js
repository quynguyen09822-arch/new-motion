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
import { matCuaHop, matCuaTru, matCuaCau, phapTuyen, doSang, mauTheoSang,
  beRongChiem, DEN_MAC_DINH } from './hinhhoc.js';
import { boCuc, caoTong } from './khoi.js';

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
    /* BA PHÉP cho từng bộ phận, và thứ tự quan trọng: dời tới chỗ → xoay →
       bóp. Bóp trước khi xoay thì khối bị méo theo trục đã quay, ra hình kỳ
       quặc không ai đoán được.
       · `xoay` — để áo choàng rủ xuống chứ không chìa ngang như tấm ván, để
         lông mày cau lại.
       · `phong` — bóp quả cầu thành BẦU DỤC. Đây là thứ thiếu nhất: đầu, thân,
         khuôn mặt của linh vật đều là bầu dục, không cái nào tròn đều. Bóp cả
         cụm thì rẻ hơn nhiều so với sinh riêng hình bầu dục, và mắt không phân
         biệt được. */
    const x = con.xoay || null;
    const ph = con.phong || null;
    const hop = the('bc-hop', {
      transform: `translate3d(${con.x}px, ${-con.y}px, ${con.z}px)`
        + (x ? ` rotateY(${x.ngang || 0}deg) rotateX(${x.doc || 0}deg) rotateZ(${x.lan || 0}deg)` : '')
        + (ph ? ` scale3d(${ph[0]}, ${ph[1]}, ${ph[2]})` : ''),
    });
    /* Hộp, ống trụ hay khối cầu — chỉ khác nhau ở BỘ MẶT. Phần dựng thẻ, chiếu
       đèn và nhuộm màu dùng chung hết, nên thêm hình mới chỉ là thêm một hàm
       sinh mặt chứ không phải thêm một nhánh vẽ. Đúng chỗ này là lý do ghép
       được cả một nhân vật mà `ve.js` gần như không phình ra. */
    const sinhMat = con.hinh === 'tru' ? matCuaTru : con.hinh === 'cau' ? matCuaCau : matCuaHop;
    for (const m of sinhMat(con)) {
      /* BO GÓC — và vì sao núm này là PHẦN TRĂM chứ không phải điểm ảnh.
       *
       * Sáu mặt phẳng bo góc thì ở mỗi ĐỈNH khối còn lại một lỗ hụt, to đúng
       * bằng bán kính bo. Đo thật trên khối 330: bo 20 nhìn mềm và đặc, bo 34
       * đã thấy hụt, bo 48 thì thủng hẳn — nhìn xuyên qua được.
       *
       * Để núm tính bằng điểm ảnh là mời người dùng tự vặn vào vùng hỏng, mà
       * lỗi lại hiện ra ở đỉnh khuất nên họ không hiểu vì sao hình kỳ. Nên núm
       * là 0–100 phần trăm của mức an toàn, và mức ấy tính theo chính kích
       * thước khối: khối to bo được nhiều, thẻ mỏng bo ít.
       *
       * Chỉ áp cho mặt khối HỘP. Mặt bên ống trụ và ô khối cầu vốn phải khít
       * mép nhau; bo vào là hở ra cả vòng lỗ, nhìn như vật bị rỗ.
       */
      const laHop = (con.hinh ?? 'hop') === 'hop';
      const nho = Math.min(con.rong ?? 1e9, con.cao ?? 1e9, con.day ?? 1e9);
      const lon = Math.max(con.rong ?? 0, con.cao ?? 0, con.day ?? 0);
      const boGoc = laHop ? ((khoi.bo || 0) / 100) * Math.min(0.5 * nho, 0.08 * lon) : 0;
      const f = the('bc-mat', {
        width: m.w + 'px',
        height: m.h + 'px',
        marginLeft: -m.w / 2 + 'px',
        marginTop: -m.h / 2 + 'px',
        transform: m.bien,
        /* Nắp ống trụ là một hình vuông bo tròn thành đĩa. */
        ...(m.tron ? { borderRadius: '50%' }
          : boGoc ? { borderRadius: Math.min(boGoc, Math.min(m.w, m.h) / 2) + 'px' } : null),
      });
      /* Chữ chỉ đặt lên mặt được chỉ định. Logo khối thì đặt lên cả sáu. */
      const chu = con.dauMoiMat ?? con.chuMat?.[m.id];
      if (chu) {
        const s = the('bc-chu', {
          fontSize: (khoi.coChu ?? Math.round(Math.min(m.w, m.h) * 0.3)) + 'px',
          ...(con.chuODuoi ? { alignSelf: 'end', paddingBottom: '6px' } : null),
          /* Mặc định chữ là màu đen mờ cho hợp nhãn trên thẻ. Dấu hiệu thương
             hiệu thì phải đúng màu của nó, nên cho đặt riêng. */
          ...(con.mauChu ? { color: con.mauChu } : null),
        });
        s.textContent = chu;
        f.appendChild(s);
      }
      hop.appendChild(f);
      /* `mauRieng` để mỗi bộ phận một màu. Không có nó thì cả nhân vật một
         màu, và nó thành một cục đỏ chứ không ra hình người. */
      matDS.push({ el: f, n: m.n, pha: con.pha ?? 1, mau: con.mauRieng || null });
    }
    goc.appendChild(hop);
  }
  return { goc, matDS, chuDS };
}

/**
 * Vẽ một món theo dáng đang đặt.
 *
 * Trước đây hàm này nhận thêm giây `t` và tự tính góc quay theo thời gian. Bỏ
 * rồi: xưởng này để dựng phối cảnh, không phải làm video. Góc quay giờ là một
 * con số người dùng đặt, đứng yên.
 */
export function veTai(dat, khoi) {
  const ngang = khoi.xoayNgang ?? -28;
  const doc = khoi.xoayDoc ?? 14;
  const den = khoi.den || DEN_MAC_DINH;
  const mau = khoi.mau || '#FF7A2F';

  /* NGHIÊNG (bóp méo): phép trượt — mỗi tầng cao hơn thì lệch sang ngang thêm
     một chút, như xô một chồng sách. Ma trận của CSS xếp theo CỘT, nên hệ số
     trượt nằm ở vị trí thứ 5 chứ không phải thứ 2; đặt nhầm chỗ là khối bị
     trượt theo chiều sâu thay vì chiều ngang.
     Đèn KHÔNG tính lại theo phép trượt này — nghiêng mạnh quá thì bóng đổ hơi
     lệch so với hình. Chấp nhận: tính đúng thì phải quay lại pháp tuyến từng
     mặt, mà mắt gần như không thấy khác ở mức nghiêng thường dùng. */
  const truot = Math.tan(((khoi.nghieng || 0) * Math.PI) / 180);
  dat.goc.style.transform = `rotateX(${doc}deg) rotateY(${ngang}deg)`
    + (truot ? ` matrix3d(1,0,0,0, ${truot.toFixed(4)},1,0,0, 0,0,1,0, 0,0,0,1)` : '');

  for (const m of dat.matDS) {
    const s = doSang(phapTuyen(m.n, ngang, doc), den) * m.pha;
    m.el.style.background = mauTheoSang(m.mau || mau, s);
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

/* ---------------------------------------------------------------------------
 * CẢNH — nhiều món, một máy quay
 * ------------------------------------------------------------------------- */

/**
 * Dựng cả cảnh. Trả về thứ `veCanhTai()` cần.
 *
 * BA TẦNG THẺ, mỗi tầng đúng một việc — gộp lại là không gỡ ra được:
 *
 *   .bc-may   máy quay: xoay quanh cảnh, thu phóng
 *     .bc-cho   chỗ đứng của một món
 *       .bc-goc   món tự xoay quanh tâm nó
 *
 * Thứ tự trong câu lệnh CSS đọc từ TRÁI sang PHẢI là từ NGOÀI vào TRONG, nên
 * `scale(...) rotateX(...) rotateY(...) translate3d(...)` nghĩa là: dời cảnh về
 * tâm trước, rồi mới xoay, rồi mới phóng. Đảo thứ tự là máy quay quanh một
 * điểm nào đó ngoài cảnh, kéo chuột thấy cảnh văng đi chứ không xoay tại chỗ.
 */
export function dungCanh(cha, canh) {
  cha.textContent = '';
  const may = the('bc-may');
  cha.appendChild(may);

  /* SÀN THẬT, nằm trong cảnh nên xoay theo máy quay.
     Bản trước vẽ lưới bằng hình nền phẳng của khung nhìn — nó ĐỨNG IM khi kéo
     chuột, nên thay vì giúp định hướng thì nó phá luôn ảo giác ba chiều: mắt
     thấy vật xoay mà sàn không nhúc nhích. Sàn giả còn tệ hơn không có sàn. */
  const san = the('bc-san');
  san.style.transform = 'rotateX(90deg)';
  may.appendChild(san);

  /* Hai trục có màu nằm trên mặt sàn. Lưới trơn thì đối xứng hoàn toàn, xoay
     máy một lúc là mất phương hướng — không biết mình đang nhìn từ phía nào. */
  for (const lop of ['bc-truc-ngang', 'bc-truc-sau']) {
    const tr = the('bc-truc ' + lop);
    tr.style.transform = 'rotateX(90deg)';
    may.appendChild(tr);
  }

  const monDS = [];
  for (const m of canh.mon) {
    if (m.an) continue;

    /* BÓNG ĐỔ: một vệt tối nằm bẹp trên sàn, ngay dưới chân món. Không tính
       bóng thật — chỉ cần mắt biết món đứng ở đâu. Mẹo cũ, rẻ hơn bóng thật
       cả ngàn lần, mà thiếu nó thì mọi vật đều lơ lửng. */
    const bong = the('bc-bong');
    may.appendChild(bong);

    const cho = the('bc-cho');
    may.appendChild(cho);
    const d = dung(cho, m);
    /* Nhớ id lên THẺ để bấm vào khối trong khung nhìn là chọn đúng món. Dò
       ngược bằng chỉ số mảng thì xoá một món là lệch hết. */
    d.goc.dataset.mon = m.id;
    for (const f of d.matDS) f.el.dataset.mon = m.id;
    monDS.push({ id: m.id, cho, bong, ...d });
  }
  return { may, monDS };
}

/** Vẽ cả cảnh. */
export function veCanhTai(dat, canh) {
  const c = canh.may;
  dat.may.style.transform =
    `scale(${c.ti}) rotateX(${c.doc}deg) rotateY(${c.ngang}deg) `
    + `translate3d(${-c.tamX}px, ${c.tamY}px, 0)`;

  for (const d of dat.monDS) {
    const m = canh.mon.find((x) => x.id === d.id);
    if (!m) continue;
    d.cho.style.transform = `translate3d(${m.vi.x}px, ${-m.vi.y}px, ${m.vi.z}px)`;

    if (d.bong) {
      /* Món càng cao khỏi mặt đất thì bóng càng loe và càng nhạt — đúng như
         ngoài đời. Không làm vậy thì nâng một món lên cao mà bóng vẫn đậm y
         nguyên, và mắt tưởng nó vẫn chạm đất. */
      const w = beRongChiem(m);
      const cach = Math.max(0, m.vi.y - caoTong(m) / 2);
      const loe = 1 + Math.min(1.2, cach / Math.max(80, w));
      const dam = 0.42 / loe;
      const r = (w * 0.62 * loe);
      Object.assign(d.bong.style, {
        width: r * 2 + 'px', height: r * 1.3 + 'px',
        margin: `${-r * 0.65}px 0 0 ${-r}px`,
        transform: `translate3d(${m.vi.x}px, 0px, ${m.vi.z}px) rotateX(90deg)`,
        background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${dam.toFixed(3)}) 0%, `
          + `rgba(0,0,0,${(dam * 0.55).toFixed(3)}) 42%, transparent 72%)`,
      });
    }
    /* Đèn gắn vào THẾ GIỚI, không gắn vào máy quay: độ sáng chỉ phụ thuộc món
       xoay bao nhiêu, không phụ thuộc người xem đứng đâu. Nhờ vậy lia máy sang
       mặt khuất là thấy tối — gắn đèn vào máy thì mặt sáng bám theo mắt người
       xem và vật trông bẹt như dán lên màn hình. */
    veTai(d, { ...m, den: m.den || canh.den });
  }
}
