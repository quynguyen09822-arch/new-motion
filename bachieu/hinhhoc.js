/**
 * HÌNH HỌC KHỐI NỔI — mọi phép tính của xưởng 3D, KHÔNG chạm vào trình duyệt.
 *
 * VÌ SAO TÁCH HẲN RA ĐÂY. Thứ hay sai trong 3D không phải là mã dựng DOM, mà là
 * phép tính: góc quay, hướng pháp tuyến, độ sáng từng mặt. Mà sai mấy thứ đó thì
 * triệu chứng hiện ra là "hình nhìn kỳ kỳ" — không có lỗi, không có vệt đỏ, chỉ
 * là nhìn sai sai. Loại lỗi đó mà nằm chung với mã dựng DOM thì phải mở trình
 * duyệt lên soi bằng mắt mới thấy, và mỗi lần soi lại ra một kết luận khác.
 *
 * Để ở đây thì `tools/kiem-ba-chieu.mjs` gọi thẳng bằng Node, đo bằng số.
 *
 * HAI LUẬT ĐÃ ĐO ĐƯỢC (xem `docs/LO-TRINH-3D.md` mục 2) và file này canh:
 *
 *   ① Khối nổi chiếm quá NỬA bề ngang khung thì lúc xuất phim sẽ giật — máy chủ
 *     không có card đồ hoạ, đo được 18,7 hình/giây khi phủ kín, 60 khi chiếm
 *     nửa. `soatBeRong()` báo trước, không để tới lúc xuất mới biết.
 *
 *   ② Góc quay phải là HÀM THUẦN CỦA GIÂY. Bộ dựng clip đã theo luật này
 *     (`render(now)`, `seek(s)` chỉ gọi `render(s)`). Nếu khối tự quay bằng đồng
 *     hồ riêng thì tua không được, xuất chậm không được, và hai lần xuất ra hai
 *     phim khác nhau.
 *
 * HỆ TRỤC. Theo đúng CSS, không đổi cho "dễ nghĩ": +x sang phải, **+y xuống
 * dưới**, +z hướng về phía người xem. Đổi quy ước ở đây là tự tay tạo ra một
 * chỗ phải nhớ đảo dấu mỗi lần đọc mã.
 */

const rad = (d) => (d * Math.PI) / 180;

/** Làm mượt hai đầu — dùng cho cú lật, để nó không dừng đột ngột. */
export const muot = (x) => x * x * (3 - 2 * x);

/* ---------------------------------------------------------------------------
 * SÁU MẶT CỦA MỘT KHỐI HỘP
 * ------------------------------------------------------------------------- */

/**
 * Sinh sáu mặt cho một khối kích thước cho trước.
 *
 * `n` là pháp tuyến lúc khối chưa quay — tức mặt đó đang "nhìn" về hướng nào.
 * `bien` là câu lệnh CSS đặt mặt phẳng ấy vào đúng chỗ trong không gian.
 *
 * Kiểm lại cho chắc, vì rất dễ lộn dấu: CSS `rotateX(90deg)` đưa trục +z thành
 * **-y**, mà -y là HƯỚNG LÊN (vì +y xuống). Nên đó là mặt TRÊN.
 */
export function matCuaHop({ rong = 220, cao = 220, day = 220 } = {}) {
  return [
    { id: 'truoc', ten: 'trước', n: [0, 0, 1],  w: rong, h: cao, bien: `translateZ(${day / 2}px)` },
    { id: 'sau',   ten: 'sau',   n: [0, 0, -1], w: rong, h: cao, bien: `rotateY(180deg) translateZ(${day / 2}px)` },
    { id: 'phai',  ten: 'phải',  n: [1, 0, 0],  w: day,  h: cao, bien: `rotateY(90deg) translateZ(${rong / 2}px)` },
    { id: 'trai',  ten: 'trái',  n: [-1, 0, 0], w: day,  h: cao, bien: `rotateY(-90deg) translateZ(${rong / 2}px)` },
    { id: 'tren',  ten: 'trên',  n: [0, -1, 0], w: rong, h: day, bien: `rotateX(90deg) translateZ(${cao / 2}px)` },
    { id: 'duoi',  ten: 'dưới',  n: [0, 1, 0],  w: rong, h: day, bien: `rotateX(-90deg) translateZ(${cao / 2}px)` },
  ];
}

/**
 * Sinh mặt cho một ỐNG TRỤ — hình tròn dựng bằng toàn mặt phẳng.
 *
 * VÌ SAO LÀM ĐƯỢC. Lộ trình ghi "Giai đoạn 1 không có hình cong". Đúng với hình
 * cong THẬT, nhưng tròn xoay thì khác: ghép đủ nhiều mặt phẳng hẹp quanh một
 * trục là mắt thấy tròn. 24 mặt thì mỗi mặt lệch nhau 15°, đứng cách màn hình
 * một bước chân là không phân biệt được với hình tròn thật.
 *
 * Nhờ vậy có cột, đồng xu, vòng, ống — mà vẫn không mượn thư viện nào.
 *
 * Bề rộng mỗi mặt là DÂY CUNG chứ không phải cung tròn: 2·r·sin(π/N). Lấy chu vi
 * chia N thì mỗi mặt rộng dôi ra, các mặt chồng mép lên nhau và viền thành hình
 * răng cưa — nhìn thì tưởng lỗi khử răng cưa của trình duyệt.
 */
export function matCuaTru({ ban = 110, cao = 240, soMat = 24 } = {}) {
  const N = Math.max(3, Math.min(64, Math.round(soMat)));
  const w = 2 * ban * Math.sin(Math.PI / N);
  const mat = [];
  for (let i = 0; i < N; i++) {
    const g = (i * 360) / N;
    const a = rad(g);
    mat.push({
      id: 'canh' + i,
      /* Pháp tuyến chĩa thẳng ra ngoài tại góc ấy — cùng hệ với `matCuaHop`. */
      n: [Math.sin(a), 0, Math.cos(a)],
      /* Cộng thêm một chút bề rộng cho mép liền nhau. Thiếu thì giữa hai mặt
         hiện ra khe sáng một pixel, chạy vòng quanh khối như sợi chỉ. */
      w: w + 1,
      h: cao,
      bien: `rotateY(${g}deg) translateZ(${ban}px)`,
    });
  }
  /* Hai nắp. `tron` để `ve.js` bo tròn chúng thành đĩa. */
  mat.push({ id: 'nap-tren', ten: 'nắp trên', n: [0, -1, 0], w: ban * 2, h: ban * 2,
    bien: `rotateX(90deg) translateZ(${cao / 2}px)`, tron: true });
  mat.push({ id: 'nap-duoi', ten: 'nắp dưới', n: [0, 1, 0], w: ban * 2, h: ban * 2,
    bien: `rotateX(-90deg) translateZ(${cao / 2}px)`, tron: true });
  return mat;
}

/**
 * Sinh mặt cho một KHỐI CẦU — vẫn là mặt phẳng, chỉ nhiều hơn.
 *
 * Cùng mẹo với ống trụ, nhưng chia theo HAI chiều: `vong` mặt quanh trục đứng,
 * `tang` vành chồng từ đỉnh xuống đáy. Mỗi ô là một mảnh phẳng tiếp tuyến với
 * mặt cầu tại tâm ô ấy.
 *
 * ĐÁNH ĐỔI PHẢI BIẾT. Một quả cầu 10×6 tốn 60 thẻ DOM; ghép một nhân vật là
 * ngót nghét 500. Khác hẳn ống trụ (28 thẻ). Nên hàm này nhận số thấp mặc định
 * và chỗ gọi phải tự cân: thứ to thì chia mịn, thứ nhỏ như con mắt thì 6×4 là
 * đủ, chia mịn chỉ tốn thẻ chứ mắt không thấy.
 *
 * Vành sát hai cực hẹp dần nên vẫn hở một chút ở đỉnh và đáy. Chấp nhận được
 * vì các bộ phận luôn cắm vào nhau che mất cực — và bịt cực tử tế thì phải
 * dựng ô tam giác, tức thêm một nhánh vẽ chỉ để lo hai cái chấm.
 */
export function matCuaCau({ ban = 100, vong = 12, tang = 8 } = {}) {
  const N = Math.max(4, Math.min(32, Math.round(vong)));
  const M = Math.max(2, Math.min(20, Math.round(tang)));
  const mat = [];
  const caoVanh = 2 * ban * Math.sin(Math.PI / (2 * M)) + 1;
  for (let j = 0; j < M; j++) {
    /* Tâm vành, tính theo độ cao so với xích đạo: +90 là đỉnh, -90 là đáy. */
    const e = 90 - (180 * (j + 0.5)) / M;
    const banVanh = ban * Math.cos(rad(e));
    const rongO = 2 * banVanh * Math.sin(Math.PI / N) + 1;
    for (let i = 0; i < N; i++) {
      const g = (i * 360) / N;
      const a = rad(g), b = rad(e);
      mat.push({
        id: `o-${j}-${i}`,
        /* Khớp đúng thứ tự CSS bên dưới: rotateY rồi rotateX rồi đẩy ra. */
        n: [Math.cos(b) * Math.sin(a), -Math.sin(b), Math.cos(b) * Math.cos(a)],
        w: rongO, h: caoVanh,
        bien: `rotateY(${g}deg) rotateX(${e}deg) translateZ(${ban}px)`,
      });
    }
  }
  return mat;
}

/**
 * Pháp tuyến SAU KHI khối đã quay.
 *
 * Phải khớp đúng thứ tự mà `ve.js` ghi ra CSS: `rotateX(doc) rotateY(ngang)`.
 * Tính ngược thứ tự thì đèn chiếu sai mặt — và đó là lỗi nhìn-thì-thấy-kỳ chứ
 * không báo gì cả.
 */
export function phapTuyen(n, ngang, doc) {
  const a = rad(ngang), b = rad(doc);
  const ca = Math.cos(a), sa = Math.sin(a);
  const cb = Math.cos(b), sb = Math.sin(b);
  /* quay quanh trục đứng trước */
  const x1 = n[0] * ca + n[2] * sa;
  const y1 = n[1];
  const z1 = -n[0] * sa + n[2] * ca;
  /* rồi ngả trước/sau */
  return [x1, y1 * cb - z1 * sb, y1 * sb + z1 * cb];
}

/* ---------------------------------------------------------------------------
 * ĐÈN
 * ------------------------------------------------------------------------- */

/** Mặc định: đèn chếch trái, hơi cao — kiểu chụp sản phẩm, không phải đèn pha. */
export const DEN_MAC_DINH = { ngang: -35, cao: 45, nen: 0.42 };

/**
 * Vector chỉ TỪ bề mặt HƯỚNG TỚI đèn.
 *
 * `cao` dương nghĩa là đèn ở trên, nên thành phần y phải ÂM (vì +y xuống dưới).
 */
export function huongDen({ ngang = DEN_MAC_DINH.ngang, cao = DEN_MAC_DINH.cao } = {}) {
  const a = rad(ngang), e = rad(cao);
  return [Math.sin(a) * Math.cos(e), -Math.sin(e), Math.cos(a) * Math.cos(e)];
}

/**
 * Độ sáng của một mặt, từ 0 đến 1.
 *
 * `nen` là ánh sáng nền — phần sáng mà mặt quay lưng vào đèn vẫn nhận được. Để
 * 0 thì mặt khuất thành đen kịt, và khối trông như bị thủng một lỗ. Người ta
 * tưởng đó là "chân thực"; thật ra ngoài đời luôn có ánh phản từ xung quanh.
 */
export function doSang(nDaQuay, den = DEN_MAC_DINH) {
  const L = huongDen(den);
  const dai = Math.hypot(nDaQuay[0], nDaQuay[1], nDaQuay[2]) || 1;
  const cham = (nDaQuay[0] * L[0] + nDaQuay[1] * L[1] + nDaQuay[2] * L[2]) / dai;
  const nen = den.nen ?? DEN_MAC_DINH.nen;
  return nen + (1 - nen) * Math.max(0, cham);
}

/* ---------------------------------------------------------------------------
 * BÀN ĐÈN — cầm cái đèn kéo tới chỗ mình muốn
 *
 * Hai thanh kéo "đèn đứng bên nào" và "đèn cao hay thấp" đúng về mặt số nhưng
 * sai về mặt người: không ai nghĩ về ánh sáng bằng hai con số góc. Người ta
 * nghĩ "để cái đèn ở trên bên trái". Nên đổi thành một mặt tròn, kéo cái đèn
 * tới đâu thì nó chiếu từ đó.
 *
 * Mặt tròn là nửa quả cầu phía trước vật, nhìn thẳng từ chỗ người xem đứng:
 *   · giữa  → đèn chiếu thẳng từ phía người xem (bẹt, ít bóng)
 *   · trên  → đèn trần
 *   · trái  → đèn chếch trái
 *   · vành  → đèn gần như chiếu ngang, bóng đổ dài nhất
 *
 * Phép đổi để ở đây chứ không để trong mã giao diện, vì nó là phép toán — sai
 * thì cái đèn nhảy lung tung lúc kéo, mà nhìn thì chỉ thấy "nó kỳ kỳ".
 * ------------------------------------------------------------------------- */

/** Vị trí trên bàn (x, y trong [-1, 1]; y dương là XUỐNG, đúng quy ước màn hình) → góc đèn. */
export function gocTuBanDen(x, y) {
  /* Kéo ra ngoài vành thì bám lấy vành, đừng nhảy về giữa hay đứng im — cả hai
     kiểu ấy đều làm người kéo tưởng chuột bị kẹt. */
  const r = Math.hypot(x, y);
  if (r > 1) { x /= r; y /= r; }
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return {
    ngang: (Math.atan2(x, z) * 180) / Math.PI,
    cao: (Math.asin(Math.max(-1, Math.min(1, -y))) * 180) / Math.PI,
  };
}

/** Chiều ngược lại: mở bảng ra thì cái đèn phải nằm đúng chỗ nó đang chiếu. */
export function banDenTuGoc(ngang, cao) {
  const L = huongDen({ ngang, cao });
  return { x: L[0], y: L[1] };
}

/** Tả chỗ đèn bằng lời, để người kéo biết mình đang đặt nó ở đâu. */
export function taDen({ ngang = 0, cao = 0 } = {}) {
  const ben = Math.abs(ngang) < 12 ? 'chính diện'
    : `chếch ${ngang < 0 ? 'trái' : 'phải'}${Math.abs(ngang) > 60 ? ' hẳn' : ''}`;
  const tren = cao > 55 ? 'trên cao' : cao > 18 ? 'hơi cao'
    : cao < -40 ? 'hắt từ dưới lên' : cao < -12 ? 'hơi thấp' : 'ngang tầm';
  return `${ben}, ${tren}`;
}

/* ---------------------------------------------------------------------------
 * MÀU
 * ------------------------------------------------------------------------- */

const doc3 = (m) => {
  const s = String(m || '').trim().replace('#', '');
  const h = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const ve2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * Nhuộm một màu theo độ sáng.
 *
 * Nhân thẳng từng kênh RGB sẽ ra màu xỉn và ngả xám, vì mắt người không nhìn
 * sáng theo tuyến tính. Nâng lên luỹ thừa 1/1.6 giữ được độ tươi của màu khi
 * tối đi — đúng thứ làm khối nhìn "có chất" thay vì "bị phủ bụi". Đây cũng
 * chính là bệnh bạc màu của clip hôm 29/09, chỉ khác chỗ phát bệnh.
 */
export function mauTheoSang(mau, s) {
  const c = doc3(mau);
  if (!c) return mau;
  const k = Math.pow(Math.max(0, Math.min(1, s)), 1 / 1.6);
  return '#' + c.map((v) => ve2(v * k)).join('');
}

/* ---------------------------------------------------------------------------
 * CHUYỂN ĐỘNG — hàm thuần của giây (Luật ②)
 * ------------------------------------------------------------------------- */

/** Kho chuyển động. `ten` là thứ người dùng đọc, không phải tên công thức. */
export const KHO_DONG = [
  { id: 'dung-im',   ten: 'Đứng im',           goi: 'để khoe một góc đẹp đã chọn sẵn' },
  { id: 'xoay-vong', ten: 'Xoay một vòng',     goi: 'khoe hết các mặt — hợp logo, hộp sản phẩm' },
  { id: 'lac-nhe',   ten: 'Lắc nhẹ qua lại',   goi: 'có sức sống mà không hút mắt khỏi chữ' },
  { id: 'lia-quanh', ten: 'Lia quanh vật',     goi: 'như máy quay đi vòng — hợp giá máy chủ' },
  { id: 'lat-the',   ten: 'Lật mặt rồi lật lại', goi: 'trước / sau khi dùng dịch vụ' },
];

/**
 * Góc quay tại giây `t`. HÀM THUẦN: cùng `t` luôn ra cùng kết quả.
 *
 * Không đọc `Date.now()`, không giữ biến đếm, không `requestAnimationFrame`.
 * Đây là điều kiện để tua được và để chế độ xuất "vẽ kỹ" ở Giai đoạn 5 chạy được.
 */
export function gocTai(khoi = {}, t = 0) {
  const ngang0 = khoi.xoayNgang ?? -28;
  const doc0 = khoi.xoayDoc ?? 14;
  const d = khoi.dong || {};
  const chuKy = Math.max(0.2, d.chuKy || 6);
  /* `t` âm vẫn phải ra đúng — thanh tua kéo ngược về trước mốc 0 là chuyện thường. */
  const p = ((((t % chuKy) + chuKy) % chuKy)) / chuKy;

  switch (d.kieu) {
    case 'xoay-vong':
      return { ngang: ngang0 + 360 * p, doc: doc0 };
    case 'lac-nhe':
      return { ngang: ngang0 + (d.bienDo ?? 22) * Math.sin(2 * Math.PI * p), doc: doc0 };
    case 'lia-quanh':
      return { ngang: ngang0 + 360 * p, doc: doc0 + 8 * Math.sin(2 * Math.PI * p) };
    case 'lat-the': {
      /* Đi 0 → 180 rồi quay về 0, êm cả hai đầu. */
      const nua = p < 0.5 ? p * 2 : 2 - p * 2;
      return { ngang: ngang0 + 180 * muot(nua), doc: doc0 };
    }
    default:
      return { ngang: ngang0, doc: doc0 };
  }
}

/* ---------------------------------------------------------------------------
 * LUẬT ① — bề ngang chiếm bao nhiêu khung
 * ------------------------------------------------------------------------- */

/** Đo được: phủ kín khung dọc → 18,7 hình/giây; chiếm nửa → 60. */
export const NGUONG_CHIEM = 0.5;

/**
 * Chỗ rộng nhất khối quét qua khi quay.
 *
 * KHÔNG phải bề ngang của khối. Khối hộp xoay tới 45° thì chỗ rộng nhất là
 * đường chéo đáy — bỏ qua chuyện này là lúc xuất phim mới phát hiện hình bị cắt
 * mất hai bên.
 *
 * Nhưng ỐNG TRỤ thì tròn xoay: quay kiểu gì nó cũng chỉ rộng đúng bằng đường
 * kính. Lấy đường chéo cho nó là tính dôi ra 41%, và lời nhắc "quá nửa khung"
 * sẽ kêu oan — mà phép kiểm hay kêu oan thì người ta học cách bỏ qua, rồi bỏ
 * qua luôn lần nó kêu đúng.
 */
export function beRongChiem(khoi = {}) {
  /* Linh vật rộng nhất ở hai chụp tai: ±146 cộng bán kính 46, nhân hệ số to nhỏ. */
  if (khoi.loai === 'nhan-vat') return 384 * (khoi.co ?? 1);
  if (khoi.loai === 'tru') return 2 * (khoi.ban ?? 110);
  if (khoi.loai === 'bieu-do') {
    const n = Math.max(1, Math.min(12, khoi.cot?.length ?? 4));
    const rongNgang = n * (khoi.rongCot ?? 60) + (n - 1) * (khoi.khe ?? 24);
    return Math.hypot(rongNgang, khoi.day ?? 60);
  }
  return Math.hypot(khoi.rong ?? 220, khoi.day ?? 220);
}

/** Trả danh sách lời nhắc; rỗng là ổn. Chỉ NHẮC, không bao giờ chặn. */
export function soatBeRong(khoi = {}, khungRong = 1080) {
  const ti = beRongChiem(khoi) / khungRong;
  if (ti <= NGUONG_CHIEM) return [];
  return [`Khối đang chiếm ${Math.round(ti * 100)}% bề ngang khung. `
    + `Trên ${Math.round(NGUONG_CHIEM * 100)}% thì lúc xuất phim sẽ giật `
    + `(máy chủ dựng phim không có chip đồ hoạ riêng). `
    + `Thu nhỏ lại, hoặc chấp nhận xuất kiểu vẽ kỹ — chậm hơn khoảng 5 phút.`];
}
