/**
 * KÉO ĐỔI BỀ RỘNG HAI CỘT.
 *
 * Cột trái và cột phải trước đây khoá cứng 272px và 316px. Với một cảnh có 156
 * thành phần thì tên món bị cắt gần hết ("Chữ · Tìm tên miền của riêng ..."), còn
 * khi soi bảng thuộc tính thì cột phải lại chật. Chỗ rộng hẹp bao nhiêu là việc
 * của người đang làm, không phải của người viết CSS.
 *
 * BỐN ĐIỀU KHÔNG ĐƯỢC BỎ:
 *
 *  1. NHỚ LẤY. Kéo xong mà mở lại clip khác là về như cũ thì thà đừng có. Ghi
 *     `localStorage`, một bộ cho cả ứng dụng chứ không theo từng clip.
 *  2. BÀN PHÍM DÙNG ĐƯỢC. Tay nắm là `separator` có `tabindex`, mũi tên trái
 *     phải xê dịch từng bước. Chuột không phải đường duy nhất.
 *  3. BÁO CHO NGƯỜI KHÁC BIẾT. Khung xem ở giữa co lại theo, mà lớp phủ vẽ
 *     khung chọn thì nằm ở trang cha và tính theo toạ độ màn hình — không vẽ
 *     lại là khung chọn lệch hẳn khỏi món. Clip đời cũ còn phải tính lại hệ số
 *     thu. Nên có `khiDoi`.
 *  4. KHÔNG ĐỂ KÉO MẤT HẲN CỘT. Chặn trên chặn dưới, và chừa cho khung xem ở
 *     giữa ít nhất 420px — kéo tới mức khung hình chỉ còn một sợi chỉ thì người
 *     dùng không có đường quay lại.
 *
 * ẨN HẲN CỘT thì lại là chuyện khác, và có ở đây từ 22/09/2026.
 *
 * Kéo hẹp nhất vẫn còn 190px × 2 = 380px không bao giờ trả lại. Trên màn laptop
 * 1280 thì clip còn chưa tới một nửa màn hình — đo trong
 * `docs/KHONG-GIAN-LAM-VIEC.md`. Lúc xem lại thành quả thì người dùng không cần
 * một núm nào cả, chỉ cần nhìn.
 *
 * Ẩn KHÔNG ĐỤNG tới bề rộng đã kéo: hiện lại là về đúng số cũ. Hai chuyện khác
 * nhau, trộn vào nhau là bật tắt vài lần rồi cột về mặc định mà không hiểu vì sao.
 */

const KHOA = 'mb-video:cot';
const MIN = 190, MAX = 560;     // bề rộng cho phép của mỗi cột
const GIUA_TOI_THIEU = 420;     // chừa cho khung xem ở giữa
const BUOC = 16;                // mỗi lần bấm mũi tên

const MAC_DINH = { trai: 272, phai: 316 };

function doc() {
  try {
    const t = JSON.parse(localStorage.getItem(KHOA) || '{}');
    return {
      trai: Number.isFinite(t.trai) ? t.trai : MAC_DINH.trai,
      phai: Number.isFinite(t.phai) ? t.phai : MAC_DINH.phai,
      /* Bản ghi cũ không có hai khoá này — `=== true` để `undefined` thành
         `false`, chứ không phải để người dùng cũ mở app lên thấy mất cột. */
      anTrai: t.anTrai === true,
      anPhai: t.anPhai === true,
    };
  } catch { return { ...MAC_DINH, anTrai: false, anPhai: false }; }
}

const ghi = (r) => { try { localStorage.setItem(KHOA, JSON.stringify(r)); } catch { /* bỏ qua */ } };

/**
 * @param app   phần tử bọc ngoài cùng (nơi đặt biến CSS)
 * @param than  hàng ba cột — dùng để biết còn bao nhiêu chỗ cho khung giữa
 * @param khiDoi gọi sau mỗi lần bề rộng đổi (đã gộp nhịp)
 */
export function taoKeoCot(app, than, khiDoi = () => {}) {
  const rong = doc();

  /* Chặn: không cột nào được ra ngoài MIN..MAX, và khung giữa phải còn chỗ. */
  function chan(ben, v) {
    const kia = ben === 'trai' ? rong.phai : rong.trai;
    const conLai = than.clientWidth - kia - 16;   // 16 = hai khe 8px
    return Math.round(Math.max(MIN, Math.min(v, MAX, conLai - GIUA_TOI_THIEU)));
  }

  let henBao = null;
  function ap(bao = true) {
    app.style.setProperty('--cot-trai', `${rong.trai}px`);
    app.style.setProperty('--cot-phai', `${rong.phai}px`);
    /* Thuộc tính trên phần tử bọc ngoài, không phải class trên từng cột: CSS lo
       cả việc giấu tay nắm kéo đi cùng, mà JS thì chỉ phải nhớ đúng một chỗ. */
    app.dataset.anTrai = rong.anTrai ? '1' : '';
    app.dataset.anPhai = rong.anPhai ? '1' : '';
    if (!bao) return;
    // Gộp nhịp: kéo chuột bắn ra hàng trăm sự kiện, mà vẽ lại lớp phủ thì phải
    // đọc kích thước trong iframe — làm mỗi sự kiện là giật cả giao diện.
    cancelAnimationFrame(henBao);
    henBao = requestAnimationFrame(() => khiDoi());
  }
  ap(false);

  function dat(ben, v) {
    rong[ben] = chan(ben, v);
    ghi(rong);
    ap();
  }

  for (const tay of app.querySelectorAll('.keo-cot')) {
    const ben = tay.dataset.cot;
    if (!ben) continue;
    tay.setAttribute('role', 'separator');
    tay.setAttribute('aria-orientation', 'vertical');
    tay.tabIndex = 0;
    const nhan = ben === 'trai' ? 'Kéo đổi bề rộng cột trái' : 'Kéo đổi bề rộng cột phải';
    tay.setAttribute('aria-label', `${nhan} (mũi tên trái phải, bấm đúp để về mặc định)`);

    tay.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      tay.setPointerCapture(e.pointerId);
      tay.classList.add('dang-keo');
      document.body.style.cursor = 'col-resize';
      const x0 = e.clientX;
      const goc = rong[ben];
      // Cột phải nằm bên phải tay nắm nên kéo sang phải là HẸP lại — dấu ngược.
      const chieu = ben === 'trai' ? 1 : -1;
      const di = (ev) => dat(ben, goc + (ev.clientX - x0) * chieu);
      const thoi = () => {
        tay.classList.remove('dang-keo');
        document.body.style.cursor = '';
        tay.removeEventListener('pointermove', di);
        tay.removeEventListener('pointerup', thoi);
        tay.removeEventListener('pointercancel', thoi);
      };
      tay.addEventListener('pointermove', di);
      tay.addEventListener('pointerup', thoi);
      tay.addEventListener('pointercancel', thoi);
    };

    tay.onkeydown = (e) => {
      const chieu = ben === 'trai' ? 1 : -1;
      if (e.key === 'ArrowLeft') { e.preventDefault(); dat(ben, rong[ben] - BUOC * chieu); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dat(ben, rong[ben] + BUOC * chieu); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); dat(ben, MAC_DINH[ben]); }
    };

    tay.ondblclick = () => dat(ben, MAC_DINH[ben]);
  }

  // Thu nhỏ cửa sổ có thể làm hai cột chiếm hết chỗ — ép lại cho đúng chặn.
  addEventListener('resize', () => { dat('trai', rong.trai); dat('phai', rong.phai); });

  function datAn(ben, an) {
    rong[ben === 'trai' ? 'anTrai' : 'anPhai'] = Boolean(an);
    ghi(rong);
    ap();
  }

  return {
    rong: () => ({ ...rong }),
    datLai() { rong.trai = MAC_DINH.trai; rong.phai = MAC_DINH.phai; ghi(rong); ap(); },

    dangAn: (ben) => (ben === 'trai' ? rong.anTrai : rong.anPhai),
    datAn,
    doiAn: (ben) => datAn(ben, !(ben === 'trai' ? rong.anTrai : rong.anPhai)),

    /**
     * Một phím về màn hình trống, và cũng chính phím đó trả lại.
     *
     * Còn cột nào đang hiện thì giấu HẾT; giấu hết rồi thì hiện lại HẾT. Không
     * bật tắt từng cột luân phiên: người dùng bấm phím này khi muốn "dọn sạch
     * để nhìn", một nhát ăn ngay, không phải bấm hai ba lần mới sạch.
     */
    doiTrong() {
      const dangTrong = rong.anTrai && rong.anPhai;
      rong.anTrai = !dangTrong;
      rong.anPhai = !dangTrong;
      ghi(rong);
      ap();
      return !dangTrong;
    },
  };
}
