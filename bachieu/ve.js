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
  beRongChiem, huongDen, DEN_MAC_DINH } from './hinhhoc.js';
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
    return { goc, matDS, chuDS, cauDS: [] };
  }

  const cauDS = [];
  for (const con of bc.khoiCon) {
    /* QUẢ CẦU MƯỢT — vẽ bằng ĐÚNG MỘT thẻ thay vì cả trăm mảnh phẳng.
     *
     * VÌ SAO. Ghép cầu từ mặt phẳng thì mỗi mảnh một màu phẳng, nên nhìn rõ
     * từng múi — linh vật trông như quả cầu disco chứ không như đồ nhựa bóng.
     * Chia mịn hơn cũng không hết: mịn tới đâu vẫn thấy ranh giới, mà lại tốn
     * thẻ gấp bội.
     *
     * Mẹo: quả cầu nhìn từ GÓC NÀO cũng là một hình tròn. Nên vẽ một đĩa tròn
     * rồi tô chuyển sắc theo hướng đèn là ra quả cầu mượt — đúng cách cái xem
     * trước trên bàn đèn vẫn làm, và nó mượt hơn hẳn phiên bản ghép mảnh.
     *
     * Giá phải trả: đĩa luôn phải quay mặt về người xem, nên mỗi khung hình
     * phải khử ngược phép quay của máy quay và của chính món. Bù lại rẻ hơn
     * khoảng một trăm lần.
     */
    if (con.hinh === 'cau' && con.muot) {
      const rx = (con.ban ?? 100) * (con.phong?.[0] ?? 1);
      const ry = (con.ban ?? 100) * (con.phong?.[1] ?? 1);
      const bb = the('bc-cau', {
        width: rx * 2 + 'px', height: ry * 2 + 'px',
        marginLeft: -rx + 'px', marginTop: -ry + 'px',
      });
      const cho2 = the('bc-hop', {
        transform: `translate3d(${con.x}px, ${-con.y}px, ${con.z}px)`,
      });
      cho2.appendChild(bb);
      goc.appendChild(cho2);
      cauDS.push({ el: bb, bb: cho2, mau: con.mauRieng || null, pha: con.pha ?? 1, r: Math.max(rx, ry) });
      continue;
    }
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
      const ba = [con.rong ?? 1e9, con.cao ?? 1e9, con.day ?? 1e9].sort((a, b) => a - b);
      const [nho, giua, lon] = ba;
      /* TẤM MỎNG bo được nhiều hơn khối vuông, và luật cũ không phân biệt.
         Lỗ hụt ở đỉnh khối to bằng bán kính bo — với khối vuông thì nó lộ ngay,
         nhưng với một tấm mỏng (áo choàng dày 8 trên 282) thì lỗ ấy chỉ sâu
         bằng bề dày, nhìn từ trước không thấy. Luật cũ lấy cạnh NHỎ NHẤT làm
         trần nên tấm mỏng gần như không bo được tí nào — áo choàng và giày cứ
         vuông chằn chặn dù núm đã vặn hết cỡ. */
      const mongDet = nho < giua * 0.3;
      const canCu = mongDet ? giua : nho;
      /* `bo` của RIÊNG bộ phận thắng `bo` của cả món. Thiếu dòng này thì món
         ghép nhiều bộ phận (linh vật) không đặt riêng được: giày muốn bo tròn
         mà áo choàng muốn vuông là chịu. Đã quên một lần — gán bo cho giày mà
         nó cứ vuông chằn chặn, vì chỗ này chỉ đọc `khoi.bo`. */
      const mucBo = con.bo ?? khoi.bo ?? 0;
      const boGoc = laHop
        ? (mucBo / 100) * Math.min(0.5 * canCu, (mongDet ? 0.22 : 0.09) * lon)
        : 0;
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
  return { goc, matDS, chuDS, cauDS };
}

/**
 * Vẽ một món theo dáng đang đặt.
 *
 * Trước đây hàm này nhận thêm giây `t` và tự tính góc quay theo thời gian. Bỏ
 * rồi: xưởng này để dựng phối cảnh, không phải làm video. Góc quay giờ là một
 * con số người dùng đặt, đứng yên.
 */
export function veTai(dat, khoi, may = { ngang: 0, doc: 0 }) {
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

  /* --- QUẢ CẦU MƯỢT --- */
  if (dat.cauDS?.length) {
    /* Chỗ sáng nhất trên đĩa là hướng đèn CHIẾU LÊN MÀN HÌNH. Đèn gắn vào thế
       giới, nên phải quay nó theo máy quay — đúng thứ tự máy quay dùng. Bỏ
       bước này thì lia máy một vòng mà vệt sáng đứng im một chỗ, quả cầu trông
       như dán hình chứ không như vật thể. */
    const L = phapTuyen(huongDen(den), may.ngang, may.doc);
    /* Và đĩa phải luôn quay mặt về người xem: khử ngược phép quay của máy quay
       lẫn của chính món, theo THỨ TỰ NGƯỢC LẠI. Sai thứ tự thì đĩa lệch dần
       mỗi khi xoay, và quả cầu hoá hình bầu dục méo. */
    const khu = `rotateY(${-ngang}deg) rotateX(${-doc}deg) `
      + `rotateY(${-may.ngang}deg) rotateX(${-may.doc}deg)`;
    for (const c of dat.cauDS) {
      const m = c.mau || mau;
      const nen = (den.nen ?? DEN_MAC_DINH.nen) * c.pha;
      /* HAI LỚP chồng nhau, và cần cả hai thì quả cầu mới ra khối:
         · lớp trên — đốm sáng nhỏ, gắt, lệch về phía đèn: đó là ánh phản trên
           mặt nhựa bóng. Thiếu nó thì nhìn như giấy màu.
         · lớp dưới — chuyển sắc rộng từ sáng sang tối: đó là khối tròn.
         Một lớp thôi thì hoặc bẹt như hình dán, hoặc bóng mà không có khối. */
      const hx = 50 + L[0] * 34, hy = 50 + L[1] * 34;
      c.el.style.background =
        `radial-gradient(circle ${Math.round(c.r * 0.72)}px at ${hx.toFixed(1)}% ${hy.toFixed(1)}%, `
        + `rgba(255,255,255,${(0.42 * c.pha).toFixed(2)}) 0%, rgba(255,255,255,0) 72%), `
        + `radial-gradient(circle ${Math.round(c.r * 2.3)}px at `
        + `${(50 + L[0] * 46).toFixed(1)}% ${(50 + L[1] * 46).toFixed(1)}%, `
        + `${mauTheoSang(m, 1)} 0%, ${mauTheoSang(m, 0.82)} 28%, `
        + `${mauTheoSang(m, Math.max(nen, 0.3))} 62%, ${mauTheoSang(m, Math.max(nen * 0.72, 0.16))} 100%)`;
      const t = c.bb.style.transform;
      const d = t.indexOf(') ') >= 0 ? t.slice(0, t.indexOf(') ') + 1) : t.split('rotate')[0];
      c.bb.style.transform = `${d} ${khu}`;
    }
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
  return { khung: cha, may, monDS };
}

/** Vẽ cả cảnh. */
export function veCanhTai(dat, canh) {
  const c = canh.may;
  /* ĐỘ MỞ ỐNG KÍNH đặt từ MÔ HÌNH, mỗi lượt vẽ. Trước đây nó chỉ được gán lúc
     người dùng kéo thanh trượt, nên mở một cảnh đã lưu có `xa` khác là hình
     dựng theo một tiêu cự mà con số trên bảng nói một đằng. Lỗi câm: không
     sai lệch gì thấy được, chỉ là phối cảnh hơi khác thôi — và phép chiếu
     ngược (`chieuDiem`) tính theo `xa` sẽ trỏ khung chọn ra chỗ khác. */
  dat.khung.style.perspective = Math.max(400, c.xa) + 'px';
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
    veTai(d, { ...m, den: m.den || canh.den }, canh.may);
  }
}
