/**
 * SOÁT CHẤT LƯỢNG — tầng hai, chạy SAU `validateScene`.
 *
 * `validateScene` (mượn của studio) trả lời câu "kịch bản có hợp lệ không":
 * thiếu trường, sai kiểu, trùng id, `at` vượt cảnh. Nó KHÔNG trả lời câu
 * "kịch bản này có xem được không" — chữ chìm vào nền, chữ bé tí trên điện
 * thoại, món thò ra ngoài mép, màu viết cứng nên đổi màu cả clip không ăn.
 * Đó là những lỗi làm ra một clip TRÔNG NHƯ chạy được mà sai, đúng kiểu hỏng
 * tệ nhất vì không ai phát hiện cho tới lúc xem lại video.
 *
 * File này nằm trong `web/` chứ không phải `server/` vì trình duyệt phải tải
 * được nó. Node 22 import thẳng cũng chạy — nó là JS thuần, không chạm `node:`,
 * không chạm `document`. Máy chủ dùng qua `../web/soat.js`.
 *
 * KỶ LUẬT: chỉ báo khi CHẮC. Mỗi lời báo sai là một lần người dùng học được
 * rằng bảng này nói nhảm, và từ đó họ bỏ qua cả những lời báo đúng. Chỗ nào
 * không suy chắc được (món dùng `place`, màu viết bằng `color-mix`) thì im.
 */

/* ---------- màu ---------- */

/** #abc · #aabbcc → [r,g,b]. Không phải hex thì trả null — KHÔNG đoán. */
export function docMau(s) {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(t);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = /^#([0-9a-f]{6})$/i.exec(t);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return null;
}

const kenh = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** Độ sáng tương đối theo WCAG. */
function doSang(rgb) {
  const [r, g, b] = rgb.map(kenh);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tỉ lệ tương phản WCAG giữa hai màu hex. null nếu một bên đọc không ra. */
export function tuongPhan(mauA, mauB) {
  const a = docMau(mauA), b = docMau(mauB);
  if (!a || !b) return null;
  const la = doSang(a), lb = doSang(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ---------- tiện ---------- */

const so = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const mot = (n) => Math.round(n * 10) / 10;

/** Duyệt phẳng mọi món trong một cảnh, kèm cụm cha. */
function duyet(els, cha = null, ra = []) {
  for (const el of els || []) {
    if (!el || typeof el !== 'object') continue;
    ra.push({ el, cha });
    if (el.kind === 'group') duyet(el.children, el, ra);
  }
  return ra;
}

/**
 * Khung của một món, chỉ khi CHẮC: có x/y/w/h thật và không dùng `place`.
 *
 * CHỈ dùng để dò xem một món chữ nằm trên khối màu nào. KHÔNG dùng để phán xem
 * món có lọt trong khung hình không: với `image` và `video`, w/h khai trong dữ
 * liệu KHÔNG phải kích thước lúc vẽ — bộ dựng còn co giãn theo tỉ lệ file ảnh,
 * theo `fit`, và theo `measureFit()`. Đã mắc: phép kiểm "thò ra ngoài mép" tính
 * từ số khai báo oan 9 lần trên `thu-trien-khai-doc` (ảnh nền khai h=1280 nhưng
 * vẽ ra 1920) trong khi chưa bắt được lỗi thật nào.
 */
function khungChac(el) {
  if (el.place) return null;              // vùng đặt sẵn — bộ dựng tự tính, không đoán
  const x = so(el.x), y = so(el.y), w = so(el.w), h = so(el.h);
  if (x == null || y == null || w == null || h == null) return null;
  if (w <= 0 || h <= 0) return null;
  return { x, y, x2: x + w, y2: y + h };
}

/* Thời lượng mặc định của bộ dựng khi kịch bản không khai. */
const VAO_MAC_DINH = 0.55, RA_MAC_DINH = 0.4;

/** Khoảng thời gian một món hiện trên màn hình, tính từ đầu cảnh. */
function khoangSong(el, dai) {
  const at = so(el.at) ?? 0;
  const song = so(el.for);
  return [at, song != null ? at + song : (dai || Infinity)];
}

/** Hai món có cùng lúc nằm trên màn hình không? */
function cungLuc(a, b, dai) {
  const [a1, a2] = khoangSong(a, dai);
  const [b1, b2] = khoangSong(b, dai);
  return a1 < b2 - 1e-6 && b1 < a2 - 1e-6;
}

/**
 * Soát một kịch bản.
 * @returns {{ok: boolean, loi: Array, soNang: number, soNhe: number}}
 *   mỗi lỗi: { ma, muc, canhId, monId, cau, goiY, nang }
 *   `nang: true` = hỏng thật · `false` = nên xem lại
 */
export function soatChatLuong(doc) {
  const loi = [];
  const bao = (o) => loi.push(o);

  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.scenes)) {
    return { ok: true, loi: [], soNang: 0, soNhe: 0 }; // validateScene lo phần này
  }

  const meta = doc.meta || {};
  const cao = so(meta.height) || 0;
  const rong = so(meta.width) || 0;
  doc.scenes.forEach((canh, iCanh) => {
    if (!canh || typeof canh !== 'object' || !Array.isArray(canh.elements)) return;
    const dai = so(canh.duration) || 0;
    const canhTen = `Cảnh ${iCanh + 1}`;
    const dsMon = duyet(canh.elements);

    /*
     * KHỐI NỀN CỦA MỘT MÓN CHỮ = khối màu vẽ NGAY TRƯỚC nó và bao lấy nó.
     *
     * Thứ tự trong mảng là thứ tự vẽ, nên khối đứng SAU chữ là khối nằm ĐÈ LÊN
     * chữ — đó là vật che, không phải nền. Lẫn hai thứ này là báo sai hàng loạt:
     * cảnh 4 của `thu-trien-khai-html` bật một cửa sổ trình duyệt nền đen đè lên
     * tấm thẻ trắng, và nếu tính nó là nền thì bốn dòng chữ đen trên thẻ trắng
     * đều bị kêu là chìm vào nền.
     *
     * Đã mắc đủ hai chiều: lấy khối ĐẦU TIÊN khớp thì khối nền phủ kín khung
     * luôn thắng (150 lời báo sai/clip); lấy khối SAU CÙNG thì vật che thắng.
     */
    const khoiTruoc = [];   // khối màu đã vẽ, theo thứ tự

    for (const { el, cha } of dsMon) {
      const monTen = el.id || el.kind || '?';
      const o = (ma, muc, cau, goiY, nang = true) =>
        bao({ ma, muc, canhId: canh.id, monId: el.id, canhSo: iCanh + 1, cau, goiY, nang });

      /* ---------- nhịp ---------- */
      const at = so(el.at) ?? 0;
      const durVao = so(el.in?.dur) ?? (el.in?.kind === 'none' ? 0 : VAO_MAC_DINH);
      if (dai > 0 && at + durVao > dai + 1e-6) {
        o('VAO_TRAN_CANH', 'Nhịp',
          `${canhTen} · "${monTen}" bay vào chưa xong thì cảnh đã hết `
          + `(vào lúc ${mot(at)}s + ${mot(durVao)}s > ${mot(dai)}s).`,
          'Cho nó vào sớm hơn, rút ngắn chuyển động, hoặc kéo dài cảnh.');
      }

      const song = so(el.for);
      if (song != null) {
        const durRa = so(el.out?.dur) ?? (el.out?.kind === 'none' ? 0 : RA_MAC_DINH);
        if (song < durVao + durRa) {
          o('SONG_QUA_NGAN', 'Nhịp',
            `${canhTen} · "${monTen}" chỉ ở lại ${mot(song)}s, `
            + `chưa kịp hiện xong (${mot(durVao)}s vào + ${mot(durRa)}s ra) đã phải biến.`,
            'Cho nó ở lại lâu hơn, hoặc bỏ bớt một trong hai chuyển động.');
        }
        if (dai > 0 && at + song > dai + 1e-6) {
          o('RA_SAU_CANH', 'Nhịp',
            `${canhTen} · "${monTen}" hẹn biến ở giây ${mot(at + song)} `
            + `nhưng cảnh chỉ dài ${mot(dai)}s — nó sẽ bị cắt ngang.`,
            'Rút thời gian ở lại xuống, hoặc bỏ hẳn cho nó ở tới hết cảnh.', false);
        }
      }

      /* ---------- tương phản chữ / nền ---------- */
      if (['text', 'nut', 'chip', 'card', 'table'].includes(el.kind)) {
        // Màu chữ: của chính nó → của cụm cha → của cả clip.
        const chu = el.ink || cha?.ink || meta.ink;
        // Nền: khối màu nằm dưới nó (nếu đo chắc được) → nền cả clip.
        const khung = khungChac(el);
        let nen = meta.bg, tenNen = 'nền clip';
        if (khung) {
          for (const k of khoiTruoc) {
            if (khung.x >= k.khung.x && khung.y >= k.khung.y
                && khung.x2 <= k.khung.x2 && khung.y2 <= k.khung.y2
                && cungLuc(el, k.el, dai)) {
              nen = k.el.fill; tenNen = `khối "${k.el.id}"`;
            }
          }
        }
        /*
         * HAI MỨC, không phải một. Đo theo đúng WCAG (4,5:1) nhưng chỉ mức dưới
         * mới là chuyện phải sửa ngay.
         *
         * Vì sao không kêu to ở cả 4,5: mấy clip này VẼ LẠI giao diện sản phẩm
         * thật, nên chúng thừa hưởng luôn cách phối màu của sản phẩm — chữ phụ
         * xám trên nền trắng 4,4:1, nút trắng trên cam thương hiệu 2,9:1. Kêu to
         * cả những ca đó là 167 dòng trên 11 clip, và người dùng sẽ học được
         * rằng bảng này nói nhảm rồi bỏ qua luôn cả ca thật.
         *
         * Ca thật là chữ CHÌM HẲN vào nền — đúng kiểu hỏng lặng lẽ mà
         * `docs/MAU-CHU-RIENG.md` cảnh báo: mất đoạn `ink` trong scene-player là
         * chữ trở về một màu và chìm đi, không báo lỗi gì cả.
         */
        const tp = tuongPhan(chu, nen);
        if (tp != null && tp < 2.5) {
          o('CHU_CHIM_NEN', 'Màu',
            `${canhTen} · chữ "${monTen}" màu ${chu} nằm trên ${tenNen} màu ${nen} — `
            + `tương phản ${tp.toFixed(1)}:1, gần như không nhìn ra chữ.`,
            'Đặt màu chữ riêng cho món này (núm "Màu chữ riêng"), hoặc đổi màu khối nền.');
        } else if (tp != null && tp < 4.5) {
          o('TUONG_PHAN_THAP', 'Màu',
            `${canhTen} · chữ "${monTen}" trên ${tenNen}: tương phản ${tp.toFixed(1)}:1, `
            + 'dưới chuẩn đọc được 4,5:1.',
            'Đọc được nhưng hơi nhạt. Nếu đây là màu của sản phẩm thật thì bỏ qua.',
            false);
        }
      }

      /* Ghi khối màu vào sổ SAU khi đã xét xong món này — để một khối không bao
         giờ được tính là nền của chính nó, và của những món vẽ trước nó. */
      if (el.kind === 'panel' && typeof el.fill === 'string' && docMau(el.fill)) {
        const k = khungChac(el);
        if (k) khoiTruoc.push({ el, khung: k });
      }

      /* ---------- video chưa chọn file ---------- */
      /* Một món video không có `src` ra đúng một ô ĐEN, không lỗi, không báo gì.
         Bảng thuộc tính đã cảnh báo lúc chọn file sai định dạng, nhưng món vừa
         thêm vào thì mặc định còn rỗng — rất dễ quên rồi xuất video mới thấy. */
      if (el.kind === 'video' && !String(el.src || '').trim()) {
        o('VIDEO_TRONG', 'Video',
          `${canhTen} · "${monTen}" chưa chọn file video — chỗ này sẽ là một ô đen.`,
          'Mở bảng thuộc tính, mục Nội dung → "File video" rồi chọn một file.');
      }

    }
  });

  const soNang = loi.filter((l) => l.nang).length;
  return { ok: soNang === 0, loi, soNang, soNhe: loi.length - soNang };
}
