/**
 * THẺ "DỰNG HÌNH" — nạp một tấm ảnh, AI dựng lại thành cảnh.
 *
 * LUÔN LÀ ĐỀ XUẤT, KHÔNG BAO GIỜ TỰ GHI VÀO CLIP.
 *   Dựng xong hiện ra cái nó định thêm, người dùng bấm "Nhận vào clip" mới vào —
 *   và vào rồi vẫn Ctrl+Z được. Bỏ bước này thì lần AI làm sai đầu tiên sẽ khiến
 *   người ta tắt hẳn tính năng và không bao giờ bật lại.
 *
 * NÓI RÕ NÓ ĐỊNH THÊM GÌ, dưới dạng cây món — không phải một dòng "đã dựng xong".
 *   Người dùng phải quyết định nhận hay bỏ, mà muốn quyết thì phải thấy.
 */
import { taoThaAnh } from './thaanh.js';
import { doTrang } from './dotrang.js';
import { goiJSON } from './goi.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

export function taoDungHinh(boc, { laySlug, bao, nhanCanh, layKieuMay, layMeta }) {
  const muc = el('div', 'muc-dung');
  let ketQua = null;       // { canh, vanDe, model, daSua }
  let dangDung = false;

  const kq = el('div', 'dung-kq an');

  const oAnh = taoThaAnh({
    chinh: 'Kéo ảnh vào đây, bấm để chọn, hoặc dán bằng Ctrl+V',
    phu: 'Ảnh chụp màn hình, bản thiết kế, hay ảnh tham khảo đều được — PNG, JPG, WebP, dưới 4 MB',
    dangHien: () => !boc.classList.contains('an'),
    khiDoi: () => { ketQua = null; veKetQua(); veNut(); },
    bao,
  });

  /* DÁN HTML hoặc ĐỊA CHỈ TRANG — đường Stitch → Motion.
     Đặt CHUNG bảng với ô ảnh chứ không mở thẻ riêng: với người dùng thì đây vẫn
     là một việc — "lấy cái màn hình kia dựng thành cảnh". Khác nhau chỉ là đưa
     vào bằng ảnh hay bằng trang, và đưa bằng trang thì ra chính xác hơn hẳn vì
     không phải đoán lại màu với số đo từ pixel. */
  const oHtml = el('textarea', 'o-nhap o-dung-html');
  oHtml.rows = 3;
  oHtml.placeholder = 'Dán mã HTML vào đây, hoặc một địa chỉ https://…';
  oHtml.setAttribute('aria-label', 'Dán HTML hoặc địa chỉ trang');
  oHtml.oninput = () => { ketQua = null; chup = null; phanChon = null; veKetQua(); veNut(); };

  /* ---------- TẢ BẰNG LỜI → STITCH VẼ GIAO DIỆN ----------
   * Đây là đường thứ BA vào cùng một việc, và là đường duy nhất không đòi người
   * dùng phải có sẵn thứ gì. Hai đường kia bắt họ đi kiếm một tấm ảnh hoặc mở
   * Stitch ở tab khác rồi chép mã về; đường này gõ một câu là xong.
   *
   * Kết quả đổ thẳng vào ô HTML bên trên chứ không đi đường riêng: từ đó trở đi
   * nó là đúng một luồng đã chạy tốt từ trước, và người dùng XEM ĐƯỢC mã trước
   * khi đồng ý dựng thành cảnh.
   */
  const oTa = el('textarea', 'o-nhap o-dung-ta');
  oTa.rows = 2;
  oTa.placeholder = 'Ví dụ: "màn bảng giá ba gói hosting, nền trắng, nhấn xanh lá, mỗi gói một thẻ có giá và danh sách tính năng"';
  oTa.setAttribute('aria-label', 'Tả giao diện muốn có');

  const nutTa = el('button', 'nut rong nut-ta', 'Vẽ giao diện rồi dựng thành cảnh');
  nutTa.type = 'button';
  nutTa.disabled = true;
  const chuTa = el('p', 'num-goi ta-chang an');
  oTa.oninput = () => veNutTa();

  function veNutTa() {
    const co = oTa.value.trim().length >= 10;
    nutTa.disabled = dangVe || !co;
    nutTa.textContent = dangVe ? 'Đang vẽ…' : co ? 'Vẽ giao diện rồi dựng thành cảnh' : 'Tả kỹ hơn một chút';
  }

  let dangVe = false;
  let henHoi = null;

  async function veGiaoDien() {
    dangVe = true; veNutTa();
    chuTa.classList.remove('an', 'ta-hong');
    chuTa.textContent = 'Đang gửi lời tả…';
    try {
      const d = await goiJSON('/api/stitch', { cach: 'POST',
        than: { y: oTa.value.trim(), kieuMay: layKieuMay?.() || 'DESKTOP' } });
      await hoiToiXong(d.id);
    } catch (e) {
      chuTa.classList.add('ta-hong');
      chuTa.textContent = e.message;
    } finally {
      dangVe = false; veNutTa();
    }
  }

  /* Hỏi lại mỗi 4 giây. Cả quãng mất khoảng một phút rưỡi, nên hỏi dày hơn chỉ
     tốn lượt gọi mà không sớm hơn được giây nào. */
  function hoiToiXong(id) {
    return new Promise((xong, hong) => {
      clearInterval(henHoi);
      const bat = Date.now();
      henHoi = setInterval(async () => {
        let d;
        try { d = await (await fetch(`/api/stitch/${id}`)).json(); }
        catch { return; }   // mạng chớp một nhịp thì hỏi lại, đừng bỏ cuộc
        const giay = Math.round((Date.now() - bat) / 1000);
        chuTa.textContent = `${d.chang || 'Đang làm'}… (${giay} giây)`;
        if (d.trangThai === 'loi') {
          clearInterval(henHoi); return hong(new Error(d.loi || 'Không vẽ được.'));
        }
        if (d.trangThai !== 'xong') return;
        clearInterval(henHoi);
        const full = await (await fetch(`/api/stitch/${id}?html=1`)).json();
        if (!full.html) return hong(new Error('Vẽ xong nhưng không lấy được mã.'));
        /* Đổ vào ô HTML rồi để luồng cũ lo phần còn lại. */
        oHtml.value = full.html;
        ketQua = null; veKetQua(); veNut();
        chuTa.textContent = `Stitch vẽ xong: "${full.tieuDe || 'giao diện mới'}" `
          + `(${Math.round(full.soByte / 1024)} KB). Đang dựng thành cảnh…`;
        /* ĐI TIẾP LUÔN, không bắt bấm nút thứ hai. Mã đã nằm trong ô HTML nên
           người dùng vẫn xem lại được, và vẫn phải bấm "Nhận vào clip" ở cuối —
           chỗ chặn thật sự nằm ở đó, không phải ở một nút trung gian. */
        xong();
        chayDung({ tuDong: true }).then(() => {
          chuTa.textContent = `Từ lời tả: "${full.tieuDe || 'giao diện mới'}". `
            + 'Xem cây món bên phải rồi bấm "Nhận vào clip".';
        });
      }, 4000);
    });
  }
  nutTa.onclick = veGiaoDien;

  /* GIẤU HẲN KHI MÁY CHỦ CHƯA CÓ KHOÁ.
     Bày một ô mời người ta tả giao diện rồi mới báo "máy chủ chưa khai khoá" là
     bắt họ gõ xong một đoạn văn để nhận lời từ chối. Hỏi trước, một lần. */
  let hoiKhoa = false;
  async function soatCoKhoa() {
    if (hoiKhoa) return;
    hoiKhoa = true;
    try {
      const d = await (await fetch('/api/toi-la-ai')).json();
      if (!d.coStitch) for (const n of [oTa, nutTa, chuTa]) n.classList.add('an');
    } catch { /* hỏi không được thì cứ bày ra, bấm vào sẽ nhận câu báo tử tế */ }
  }
  soatCoKhoa();

  const oY = el('textarea', 'o-nhap o-y o-dung-y');
  oY.rows = 2;
  oY.placeholder = 'Dặn thêm nếu cần: "chỉ lấy phần tiêu đề", "đổi sang tông tối", "bỏ nút bấm"…';
  oY.setAttribute('aria-label', 'Dặn thêm cho AI');

  const nut = el('button', 'nut chinh rong nut-dung', 'Chọn ảnh trước đã');
  nut.type = 'button';
  nut.disabled = true;

  /** Nguồn đang dùng: HTML/địa chỉ nếu có, không thì tới ảnh. */
  function nguon() {
    const t = oHtml.value.trim();
    if (t) return /^https?:\/\//i.test(t) ? { loai: 'url', url: t } : { loai: 'html', html: t };
    const a = oAnh.lay();
    return a ? { loai: 'anh', anh: a } : null;
  }

  function veNut() {
    const n = nguon();
    nut.disabled = dangDung || !n;
    nut.textContent = dangDung ? (n?.loai === 'anh' ? 'AI đang dựng…' : 'Đang làm…')
      : !n ? 'Chọn ảnh hoặc dán HTML'
        : n.loai === 'anh' ? 'Dựng từ ảnh' : 'Chụp trang để xem trước';
  }

  /* ---------- ô ②: CHỤP TRANG → XEM → CHỌN PHẦN → DỰNG ----------
   * Máy chủ mở trang bằng trình duyệt thật (`server/chuptrang.js`), chụp cả
   * trang và từng phần. Người dùng NHÌN THẤY máy đã mở ra cái gì trước khi tốn
   * một lượt AI — trước đây họ chỉ biết trang hỏng khi AI đã dựng ra "cảnh 7
   * món" từ trang báo lỗi. */
  let chup = null;         // { id, tieuDe, phan[], cao, catDuoi }
  let phanChon = null;

  function veChup() {
    kq.innerHTML = '';
    kq.classList.remove('an', 'hong');
    kq.append(el('p', 'dung-tom', `Đã mở trang${chup.tieuDe ? ` "${chup.tieuDe}"` : ''} — `
      + `${chup.phan.length} phần. Xem có đúng trang anh muốn không, rồi chọn một phần:`));
    const ds = el('div', 'chup-ds');
    const the = (id, loai, ten, anh) => {
      const b = el('button', 'chup-phan');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(phanChon === id));
      const hinh = el('img');
      hinh.src = anh; hinh.alt = ''; hinh.loading = 'lazy';
      const chu = el('span', 'chup-chu');
      chu.append(el('b', null, loai), el('span', null, ten || ''));
      b.append(hinh, chu);
      b.onclick = () => { phanChon = id; veChup(); };
      return b;
    };
    ds.append(the('ca', 'Cả trang', 'dựng cả trang thành một cảnh', `/api/chup-trang/${chup.id}/anh`));
    for (const p of chup.phan) ds.append(the(p.id, p.loai, p.ten, `/api/chup-trang/${chup.id}/phan/${p.id}`));
    kq.append(ds);
    const xem = el('a', 'chup-xem', 'Mở ảnh chụp cả trang ↗');
    xem.href = `/api/chup-trang/${chup.id}/anh`; xem.target = '_blank'; xem.rel = 'noopener';
    kq.append(xem);
    if (chup.catDuoi) kq.append(el('p', 'num-goi', 'Trang rất dài — chỉ chụp tới 9.000px đầu.'));
    const hang = el('div', 'hang-nut');
    const dung = el('button', 'nut chinh', phanChon ? 'Dựng cảnh từ phần này' : 'Chọn một phần ở trên');
    dung.type = 'button';
    dung.disabled = !phanChon || dangDung;
    dung.onclick = () => dungPhan();
    hang.append(dung);
    kq.append(hang);
  }

  async function dungPhan() {
    const slug = laySlug?.();
    if (!slug) return bao('Mở một clip trước đã.', true);
    if (!chup || !phanChon || dangDung) return;
    dangDung = true; veNut();
    const quay = el('button', 'nut nho rong', '← Chọn phần khác');
    quay.type = 'button';
    quay.onclick = () => { ketQua = null; veChup(); };
    kq.innerHTML = '';
    kq.classList.remove('hong');
    kq.append(el('p', 'dung-tom', 'AI đang nhìn ảnh chụp và số đo của phần này để dựng cảnh — thường mất nửa phút đến một phút…'));
    try {
      let d;
      try {
        d = await goiJSON('/api/tu-html', { cach: 'POST',
          than: { slug, chupId: chup.id, phanId: phanChon, y: oY.value.trim() } });
      } catch (e) { d = { loi: e.message }; }
      if (!d.canh) {
        kq.classList.add('hong'); kq.innerHTML = '';
        kq.append(el('p', 'dung-loi', d.loi || d.cau || 'AI dựng hỏng.'), quay);
        return;
      }
      ketQua = d; veKetQua();
      kq.append(quay);
    } catch (e) {
      kq.classList.add('hong'); kq.innerHTML = '';
      kq.append(el('p', 'dung-loi', String(e.message || e).slice(0, 400)), quay);
    } finally { dangDung = false; veNut(); }
  }

  /** @returns true nếu đã chụp được (hoặc đã báo lỗi), false nếu máy chủ không có trình duyệt. */
  async function chupTruoc(n, tuDong) {
    kq.innerHTML = '';
    kq.classList.remove('an', 'hong');
    kq.append(el('p', 'dung-tom', 'Máy đang mở trang bằng trình duyệt thật, chờ trang chạy xong rồi chụp — thường mất 15–40 giây…'));
    let d;
    try { d = await goiJSON('/api/chup-trang', { cach: 'POST',
      than: n.loai === 'url' ? { url: n.url } : { html: n.html } }); }
    catch (e) { d = { ok: false, cau: e.message }; }
    if (d.khongCo) return false;
    if (!d.ok) {
      kq.classList.add('hong'); kq.innerHTML = '';
      kq.append(el('p', 'dung-loi', d.cau || d.loi || 'Không chụp được trang.'));
      return true;
    }
    chup = d;
    phanChon = tuDong ? 'ca' : null;
    veChup();
    return true;
  }

  /* ---- cây món, để người dùng thấy AI định thêm gì ---- */
  function veCay(ds, sau = 0) {
    const ra = [];
    for (const e of ds || []) {
      const d = el('div', 'dung-mon');
      d.style.paddingLeft = `${sau * 14}px`;
      const nhan = String(e.text || e.label || e.name || e.title || e.url || '')
        .replace(/\*/g, '').replace(/\s*\|\s*/g, ' ');
      d.append(el('span', 'dung-kind', e.kind || '?'));
      if (nhan) d.append(el('span', 'dung-nhan', nhan.slice(0, 48)));
      ra.push(d, ...veCay(e.children, sau + 1));
    }
    return ra;
  }

  function veKetQua() {
    kq.innerHTML = '';
    kq.classList.remove('hong');
    if (!ketQua) { kq.classList.add('an'); return; }
    kq.classList.remove('an');
    const { canh, vanDe, daSua } = ketQua;
    const dem = (ds) => (ds || []).reduce((t, e) => t + 1 + dem(e.children), 0);

    kq.append(el('p', 'dung-tom',
      `AI dựng ${dem(canh.elements)} món, cảnh dài ${String(canh.duration ?? 0).replace('.', ',')} giây.`
      + (daSua ? ' (phải sửa lại một lượt cho hợp lệ)' : '')));

    const cay = el('div', 'dung-cay');
    cay.append(...veCay(canh.elements));
    kq.appendChild(cay);

    if (vanDe?.length) {
      kq.classList.add('hong');
      kq.appendChild(el('p', 'dung-loi', `Còn ${vanDe.length} chỗ chưa hợp lệ — không nhận vào clip được:`));
      for (const v of vanDe.slice(0, 6)) kq.appendChild(el('p', 'dung-loi-dong', `· ${v}`));
      return;
    }

    const hang = el('div', 'hang-nut');
    const nhan = el('button', 'nut chinh', 'Nhận vào clip');
    nhan.type = 'button';
    nhan.onclick = () => {
      nhanCanh?.(canh);
      ketQua = null; veKetQua();
      bao('Đã thêm cảnh AI dựng vào cuối clip. Không ưng thì Ctrl+Z.');
    };
    const bo = el('button', 'nut nho rong', 'Bỏ, dựng lại');
    bo.type = 'button';
    bo.onclick = () => { ketQua = null; veKetQua(); };
    hang.append(nhan, bo);
    kq.appendChild(hang);
  }

  /* Tách khỏi `nut.onclick` để luồng Stitch gọi lại được. Anh Quý muốn gõ một
     lời tả rồi RA CẢNH, không phải bấm hai nút rồi tự nối hai bước bằng tay. */
  async function chayDung({ tuDong = false } = {}) {
    const slug = laySlug?.();
    const n = nguon();
    if (!n || dangDung) return;
    if (!slug) return bao('Mở một clip trước đã.', true);
    if (n.loai !== 'anh') {
      dangDung = true; veNut();
      let xong = false;
      try { xong = await chupTruoc(n, tuDong); }
      catch (e) {
        kq.classList.add('hong'); kq.innerHTML = '';
        kq.append(el('p', 'dung-loi', String(e.message || e).slice(0, 400)));
        xong = true;
      } finally { dangDung = false; veNut(); }
      if (xong) {
        /* Stitch: một màn thiết kế là một cảnh — đi thẳng, không bắt chọn. */
        if (tuDong && chup) await dungPhan();
        return;
      }
      /* Máy chủ không có trình duyệt → lùi về đo trong trình duyệt này. */
    }
    dangDung = true; veNut();
    kq.classList.remove('an', 'hong');
    kq.innerHTML = '';
    /* Nói THẬT về thời gian chờ. Đường HTML phải mở trang trong trình duyệt rồi
       mới gọi AI, đo thật là 2–3 phút. Hứa "15–30 giây" rồi bắt chờ ba phút là
       người dùng tưởng hỏng và bấm lại, thành hai lượt tốn tiền. */
    kq.appendChild(el('p', 'dung-tom', n.loai === 'anh'
      ? 'AI đang đọc ảnh và dựng lại — thường mất 15–30 giây…'
      : 'Đang mở trang để đo bố cục rồi mới dựng — thường mất 2–3 phút…'));
    try {
      const duong = n.loai === 'anh' ? '/api/dung-canh' : '/api/tu-html';
      let than;
      if (n.loai === 'anh') {
        than = { slug, anh: n.anh.b64, mime: n.anh.mime, y: oY.value.trim() };
      } else {
        /* ĐO TRANG NGAY TRONG TRÌNH DUYỆT NÀY rồi mới gửi bản đồ lên. Bản triển
           khai không có Chromium nên máy chủ không tự đo được — gửi thẳng HTML
           lên là nhận lại "Cannot find module '/app/tools/doc-html.mjs'". */
        const m = layMeta?.() || { width: 1280, height: 720 };
        const tomTat = kq.querySelector('.dung-tom');
        if (tomTat) tomTat.textContent = 'Đang mở trang ngay trong trình duyệt này để đo bố cục…';
        const banDo = await doTrang({ html: n.html, url: n.url, rong: m.width, cao: m.height });
        if (tomTat) tomTat.textContent = `Đã đo ${banDo.khoi.length} khối. AI đang dựng thành cảnh — thường mất nửa phút…`;
        than = { slug, banDo, y: oY.value.trim() };
      }
      /* Qua `goiJSON`: đường này chạy 30–180 giây, và cổng proxy đứng trước
         app trả về TRANG HTML khi nó cắt giữa chừng. `r.json()` gặp trang ấy
         thì văng "Unexpected token '<'" ra thẳng màn hình — xem `web/goi.js`. */
      let d;
      try { d = await goiJSON(duong, { cach: 'POST', than }); }
      catch (e) { d = { loi: e.message }; }
      if (!d.canh) {
        kq.classList.add('hong'); kq.innerHTML = '';
        kq.appendChild(el('p', 'dung-loi', d.loi || d.cau || 'AI dựng hỏng.'));
        return;
      }
      ketQua = d; veKetQua();
    } catch (e) {
      kq.classList.add('hong'); kq.innerHTML = '';
      /* KHÔNG gắn "AI dựng hỏng —" và KHÔNG cắt ở 80 ký tự.
         Lỗi ở đây giờ có thể đến từ bước ĐO TRANG, không phải từ AI — gắn nhãn
         "AI hỏng" là nói sai chỗ hỏng. Và câu báo của bước đo dặn người dùng
         phải làm gì tiếp ("chụp màn hình rồi dùng ô ①…") — cắt ở 80 ký tự là cắt
         đúng trước phần ấy, đo thật trên matbao.net: người dùng chỉ đọc được
         "…nên chỉ đo được trang bá". */
      kq.appendChild(el('p', 'dung-loi', String(e.message || e).slice(0, 400)));
    } finally { dangDung = false; veNut(); }
  }
  nut.onclick = () => chayDung();

  /* HAI CỘT: nạp ảnh bên trái, kết quả bên phải. Xếp dọc hết thì ô ảnh đẩy nút
     "Nhận vào clip" ra ngoài tầm nhìn — mà đó là nút người dùng PHẢI bấm. */
  const trai = el('div', 'ai-cot');
  const phai = el('div', 'ai-cot');
  /* BA ĐƯỜNG VÀO CÙNG MỘT VIỆC, và phải NÓI RA là ba đường.
     Trước đây ba ô nhập nằm chồng nhau không nhãn, nên người dùng nhìn vào chỉ
     thấy một đống ô — anh Quý đã tưởng tính năng Stitch chưa được làm trong khi
     nó đang hiện ngay trên màn hình. Một dòng nhãn cho mỗi đường là đủ. */
  const nhan = (chu) => {
    const n = el('p', 'dung-nhan', chu);
    return n;
  };
  trai.append(
    nhan('① Có sẵn ảnh chụp màn hình?'), oAnh.node, oAnh.oFile,
    nhan('② Có sẵn mã HTML hoặc địa chỉ trang?'), oHtml,
    nhan('③ Chưa có gì — tả bằng lời, Stitch vẽ hộ'), oTa, nutTa, chuTa,
    oY, nut,
  );
  phai.append(kq);
  muc.append(trai, phai);
  boc.appendChild(muc);
  veNut(); veNutTa();
  return { ve: () => { oAnh.ve(); veNut(); veNutTa(); veKetQua(); } };
}
