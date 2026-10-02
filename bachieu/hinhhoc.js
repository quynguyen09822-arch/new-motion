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
 * KHÔNG CÓ CHUYỂN ĐỘNG Ở ĐÂY. Bản trước có kho chuyển động và luật "góc quay
 * là hàm thuần của giây" — sinh ra từ giả định xưởng làm một món để nhét vào
 * clip. Anh Quý nói rõ: chỗ này để DỰNG PHỐI CẢNH và NHÂN VẬT, không phải ngồi
 * làm video. Nên cả bộ ấy đã gỡ, không giấu đi: mã không ai gọi tới còn tệ hơn
 * mã không có.
 *
 * Món vẫn xoay được — nhưng đó là ĐẶT DÁNG, một con số đứng yên, không phải
 * chuyển động theo thời gian.
 *
 * HỆ TRỤC. Theo đúng CSS, không đổi cho "dễ nghĩ": +x sang phải, **+y xuống
 * dưới**, +z hướng về phía người xem. Đổi quy ước ở đây là tự tay tạo ra một
 * chỗ phải nhớ đảo dấu mỗi lần đọc mã.
 */

const rad = (d) => (d * Math.PI) / 180;

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
export function matCuaCau({ ban = 100, vong = 12, tang = 8, khoet = 0 } = {}) {
  const N = Math.max(4, Math.min(32, Math.round(vong)));
  const M = Math.max(2, Math.min(20, Math.round(tang)));
  const mat = [];
  const caoVanh = 2 * ban * Math.sin(Math.PI / (2 * M)) + 1;
  /* KHOÉT MỘT LỖ ở mặt trước — bỏ những ô hướng về phía người xem.
     Đây là thứ biến quả cầu thành cái MŨ TRÙM: không khoét thì cầu kín, khuôn
     mặt đặt bên trong bị che sạch, và muốn thấy mặt thì phải đẩy nó thò ra —
     lúc ấy nhân vật thành quả bóng chứ không ra người đội mũ. */
  const cosKhoet = khoet > 0 ? Math.cos(rad(Math.min(88, khoet))) : 2;
  for (let j = 0; j < M; j++) {
    /* Tâm vành, tính theo độ cao so với xích đạo: +90 là đỉnh, -90 là đáy. */
    const e = 90 - (180 * (j + 0.5)) / M;
    const banVanh = ban * Math.cos(rad(e));
    const rongO = 2 * banVanh * Math.sin(Math.PI / N) + 1;
    for (let i = 0; i < N; i++) {
      const g = (i * 360) / N;
      const a = rad(g), b = rad(e);
      const n = [Math.cos(b) * Math.sin(a), -Math.sin(b), Math.cos(b) * Math.cos(a)];
      if (n[2] > cosKhoet) continue;        // ô này nằm trong lỗ khoét
      mat.push({
        id: `o-${j}-${i}`,
        /* Khớp đúng thứ tự CSS bên dưới: rotateY rồi rotateX rồi đẩy ra. */
        n,
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
 * BỀ NGANG MỘT MÓN
 *
 * Trước đây đây là "Luật ①": khối không được chiếm quá nửa bề ngang KHUNG PHIM.
 * Luật ấy đã bỏ cùng với khung phim — xưởng nay dựng cảnh tự do, không gò vào
 * khổ clip nào. Nhưng LÝ DO sinh ra nó thì vẫn còn, nên nó được thay bằng phép
 * đếm mảnh trong `canh.js` (`soatCanh`): đo đúng thứ thật sự tốn máy.
 *
 * Phép đo bề ngang thì GIỮ LẠI, vì `canh.js` cần nó để xếp món mới vào chỗ
 * trống thay vì chồng lên món cũ.
 * ------------------------------------------------------------------------- */

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

/* ---------------------------------------------------------------------------
 * KÉO VẬT TRÊN MẶT SÀN
 *
 * Chuột đi trên MÀN HÌNH hai chiều, còn vật nằm trong không gian ba chiều. Phải
 * đổi từ cái này sang cái kia, và đổi theo đúng góc máy quay đang đứng — nếu
 * không thì xoay máy sang bên rồi kéo sang phải, vật lại chạy về phía sau.
 *
 * Quy ước: kéo trên MẶT SÀN (y giữ nguyên). Đó là kiểu dời hay dùng nhất khi
 * bày cảnh; muốn nâng hạ thì giữ phím Shift, hoặc gõ thẳng con số.
 *
 * Phép tính đi ngược đường mà máy quay dựng ra hình:
 *   quay quanh trục đứng `a` → ngả `b` → phóng `ti`
 * nên muốn biết chuột đi 1 pixel thì vật phải đi bao nhiêu, cứ giải ngược lại.
 * ------------------------------------------------------------------------- */

/** Nhìn gần như ngang tầm thì chiều sâu bẹp lại, kéo một pixel vật văng rất xa. */
export const SIN_TOI_THIEU = 0.18;

/**
 * Chuột đi (dx, dy) pixel → vật đi bao nhiêu trên mặt sàn.
 * @returns {{x:number, z:number}}
 */
export function keoTrenSan(dx, dy, { ngang = 0, doc = 28, ti = 1 } = {}) {
  const a = rad(ngang);
  const t = Math.max(0.02, Math.abs(ti));
  /* Chặn mẫu số: ngả máy về 0 là mặt sàn nhìn đúng ngang tầm, chiều sâu bẹp
     thành số 0 và phép chia nổ ra vô cực — vật văng ra ngoài vũ trụ chỉ vì
     nhích chuột một pixel. */
  const sb = Math.sin(rad(doc));
  const sbAn = Math.sign(sb || 1) * Math.max(SIN_TOI_THIEU, Math.abs(sb));
  const u = dx / t;            // theo chiều ngang màn hình
  const w = -dy / (t * sbAn);  // theo chiều sâu của sàn
  return {
    x: u * Math.cos(a) - w * Math.sin(a),
    z: u * Math.sin(a) + w * Math.cos(a),
  };
}

/** Chuột đi dọc (dy) pixel → vật nâng hạ bao nhiêu. */
export function keoTheoCao(dy, { doc = 28, ti = 1 } = {}) {
  const t = Math.max(0.02, Math.abs(ti));
  const cb = Math.cos(rad(doc));
  /* Ngả máy tới 90° là nhìn thẳng từ nóc xuống, lúc ấy chiều cao bẹp mất —
     cùng kiểu bẫy chia-cho-0 như trên, chặn theo cách tương tự. */
  return -dy / (t * Math.max(SIN_TOI_THIEU, Math.abs(cb)));
}

/* ---------------------------------------------------------------------------
 * CHIẾU NGƯỢC: điểm trong cảnh nằm ở đâu trên màn hình
 *
 * VÌ SAO CẦN. Bấm chọn một món đang dựa vào thẻ nào nằm dưới con trỏ. Cách ấy
 * chính xác tuyệt đối khi trúng, nhưng con linh vật là 60 mảnh RỜI — bấm vào
 * khe giữa hai mảnh là trúng nền, và cả xưởng tưởng người dùng muốn xoay máy.
 * Càng thu nhỏ thì khe càng nhiều so với mảnh, nên càng khó bấm trúng.
 *
 * Có toạ độ màn hình của món thì bắt được cả vùng nó CHIẾM CHỖ, không chỉ chỗ
 * có thẻ. Đây cũng là thứ để vẽ khung chọn và núm nắm.
 *
 * PHẢI KHỚP TỪNG CHỮ với chuỗi lệnh trong `ve.js`:
 *
 *   scale(ti) rotateX(doc) rotateY(ngang) translate3d(-tamX, tamY, 0)
 *
 * đọc từ PHẢI sang TRÁI là thứ tự thực sự áp lên điểm. Rồi khung nhìn mới chia
 * phối cảnh với `perspective: xa`. Lệch một bước ở đây thì khung chọn vẽ ra
 * một nơi mà món nằm một nẻo — mà chẳng có gì báo lỗi cả.
 *
 * TRỤC Y: trong cảnh y HƯỚNG LÊN (đứng trên sàn là y dương), còn CSS thì y
 * hướng XUỐNG. Chỗ đổi dấu nằm gọn trong hàm này, đúng như `ve.js` làm.
 * ------------------------------------------------------------------------- */

/**
 * Chiếu một điểm trong cảnh ra pixel, tính từ TÂM khung nhìn.
 *
 * @returns {{u:number, v:number, k:number, sau:number}} u sang phải, v xuống
 *   dưới, `k` là hệ số phối cảnh (>1 là gần máy hơn mặt phẳng gốc), `sau` là
 *   độ sâu sau khi xoay — số càng lớn càng GẦN máy quay.
 */
export function chieuDiem([x, y, z], may = {}) {
  const { ngang = 0, doc = 0, xa = 2200, ti = 1, tamX = 0, tamY = 0 } = may;
  /* Dời cảnh về tâm trước — và đổi y sang chiều của CSS. */
  const px = x - tamX;
  const py = -y + tamY;
  const pz = z;

  const a = rad(ngang), b = rad(doc);
  const ca = Math.cos(a), sa = Math.sin(a);
  const cb = Math.cos(b), sb = Math.sin(b);

  /* rotateY rồi rotateX, đúng thứ tự của `ve.js`. */
  const x1 = px * ca + pz * sa;
  const z1 = -px * sa + pz * ca;
  const y2 = py * cb - z1 * sb;
  const z2 = py * sb + z1 * cb;

  /* `scale()` của CSS là scale2d — chỉ co giãn x và y, KHÔNG đụng z. Nhân cả
     z vào đây là phối cảnh đổi theo mức thu phóng, và lăn chuột sẽ thấy hình
     vừa nhỏ lại vừa méo. */
  const X = x1 * ti, Y = y2 * ti, Z = z2;

  /* Điểm lùi ra sau mặt phẳng tiêu cự thì phép chia đổi dấu và hình lộn ngược.
     Chặn mẫu số cho nó bẹp ở mép thay vì văng sang phía đối diện. */
  const d = Math.max(1, xa);
  const k = d / Math.max(d * 0.08, d - Z);
  return { u: X * k, v: Y * k, k, sau: Z };
}

/**
 * Chiếu cả một khối hộp trong cảnh ra khung chữ nhật trên màn.
 *
 * Chiếu đủ TÁM đỉnh rồi lấy mép ngoài cùng. Chiếu mỗi tâm rồi nhân bề ngang
 * lên là sai: xoay 45° thì hình chiếu của khối hộp RỘNG RA gấp rưỡi, và khung
 * bắt sẽ hụt mất hai góc.
 *
 * @returns {{tr:number, pha:number, tren:number, duoi:number, u:number,
 *   v:number, rong:number, cao:number, sau:number}}
 */
export function khungHop(tam, kichThuoc, may = {}) {
  const [cx, cy, cz] = tam;
  const [w, h, d] = kichThuoc;
  let tr = Infinity, pha = -Infinity, tren = Infinity, duoi = -Infinity;
  let sau = -Infinity;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const p = chieuDiem([cx + (sx * w) / 2, cy + (sy * h) / 2, cz + (sz * d) / 2], may);
    if (p.u < tr) tr = p.u;
    if (p.u > pha) pha = p.u;
    if (p.v < tren) tren = p.v;
    if (p.v > duoi) duoi = p.v;
    if (p.sau > sau) sau = p.sau;
  }
  const giua = chieuDiem(tam, may);
  return { tr, pha, tren, duoi, u: giua.u, v: giua.v,
    rong: pha - tr, cao: duoi - tren, sau };
}
