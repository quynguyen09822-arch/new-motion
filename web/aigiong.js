/**
 * KHUNG AI — giọng đọc.
 *
 * Ba việc, theo đúng thứ tự người ta thật sự làm:
 *   1. lấy lời (gõ tay, hoặc rút từ chính chữ trong clip)
 *   2. chọn giọng — NGHE THỬ trước khi tiêu tiền
 *   3. đọc thành file, rồi tự thành một rãnh tiếng của clip
 *
 * NGHE THỬ MIỄN PHÍ, ĐỌC LỜI TÍNH TIỀN THEO KÝ TỰ. Nên số ký tự hiện ngay cạnh
 * nút, và nút chỉ mở khi đã có cả lời lẫn giọng. Người dùng không rành kỹ thuật
 * mà bấm nhầm vài lần là hết hạn mức tháng, và chẳng ai nói cho họ biết vì sao.
 *
 * MỖI LÚC CHỈ MỘT ĐOẠN MẪU ĐANG CHẠY. Bấm giọng khác là giọng cũ dừng — không
 * thì hai ba giọng chồng lên nhau và không so được giọng nào ra giọng nào.
 */
const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

/** Rút mọi dòng chữ trong clip, theo đúng thứ tự cảnh rồi tới thứ tự món. */
function loiTuClip(doc) {
  const ra = [];
  const di = (ds) => {
    for (const e of ds || []) {
      if (e.kind === 'text' && e.text) {
        // `|` là dấu xuống dòng của tiêu đề, `*…*` là chữ tô màu nhấn — cả hai
        // là cách VIẾT chứ không phải chữ để đọc. Bỏ đi trước khi đưa cho giọng.
        ra.push(String(e.text).replace(/\s*\|\s*/g, ' ').replace(/\*/g, '').trim());
        if (e.sub) ra.push(String(e.sub).replace(/\*/g, '').trim());
      } else if (e.kind === 'nut' && e.label) ra.push(String(e.label).trim());
      if (e.children) di(e.children);
    }
  };
  for (const c of doc?.scenes || []) di(c.elements);
  return ra.filter(Boolean).join('. ').replace(/\.\s*\./g, '.');
}

export function taoKhungAI(boc, { layDoc, laySlug, bao, themRanh }) {
  const muc = el('div', 'muc-ai');
  let giong = [], daChon = null, gioiHan = 5000, dangDoc = false, dangViet = false;
  let tiengMau = null, canhDai = null;

  const oBrief = el('textarea', 'o-nhap o-brief');
  oBrief.rows = 3;
  oBrief.placeholder = 'Clip này nói về gì, nói với ai, giọng điệu thế nào? '
    + 'Ví dụ: "Giới thiệu dịch vụ hosting cho chủ shop online, giọng thân thiện, nhấn vào giá rẻ và hỗ trợ 24/7."';
  oBrief.setAttribute('aria-label', 'Brief cho AI');

  const oLoi = el('textarea', 'o-nhap o-loi');
  oLoi.rows = 5;
  oLoi.placeholder = 'Gõ lời cần đọc, hoặc bấm "Lấy lời từ clip" bên dưới.';
  oLoi.setAttribute('aria-label', 'Lời cần đọc');

  const demChu = el('p', 'num-goi dem-chu');
  const nutDoc = el('button', 'nut chinh rong nut-doc', 'Đọc thành file tiếng');
  nutDoc.type = 'button';

  function demLai() {
    const n = oLoi.value.trim().length;
    const qua = n > gioiHan;
    demChu.textContent = n
      ? `${n} ký tự${qua ? ` — quá mức ${gioiHan} cho một lần đọc, hãy cắt ngắn bớt` : ''}`
        + (canhDai && !qua ? ` · ${canhDai}` : '')
      : 'Chưa có lời nào.';
    demChu.classList.toggle('canh-bao', qua || Boolean(canhDai));
    nutDoc.disabled = dangDoc || !n || qua || !daChon;
    nutDoc.textContent = dangDoc ? 'Đang đọc…'
      : daChon ? `Đọc bằng giọng ${daChon.ten}` : 'Chọn một giọng trước';
  }
  oLoi.oninput = () => { canhDai = null; demLai(); };

  /* ---- nghe thử: mỗi lúc chỉ một đoạn ---- */
  function nghe(g, nut) {
    if (tiengMau) { tiengMau.el.pause(); tiengMau.nut.classList.remove('dang-nghe'); }
    if (tiengMau?.id === g.id) { tiengMau = null; return; }
    const a = new Audio(`/api/nghe-thu?id=${encodeURIComponent(g.id)}`);
    tiengMau = { id: g.id, el: a, nut };
    nut.classList.add('dang-nghe');
    a.onended = () => { nut.classList.remove('dang-nghe'); tiengMau = null; };
    a.onerror = () => {
      nut.classList.remove('dang-nghe'); tiengMau = null;
      bao('Không nghe thử được giọng này.', true);
    };
    a.play().catch(() => bao('Trình duyệt chặn phát tiếng — bấm vào trang một cái rồi thử lại.', true));
  }

  function veGiong() {
    const boc2 = el('div', 'ai-giong');
    if (!giong.length) return boc2;
    let daNgan = false;
    for (const g of giong) {
      if (!g.viet && !daNgan) {
        daNgan = true;
        boc2.appendChild(el('p', 'ai-ngan', 'Giọng nước ngoài — đọc tiếng Việt sẽ nghe ra ngay'));
      }
      const hang = el('div', `ai-hang${daChon?.id === g.id ? ' chon' : ''}`);
      const bChon = el('button', 'ai-ten');
      bChon.type = 'button';
      bChon.onclick = () => { daChon = g; ve(); };
      bChon.append(el('span', 'ai-ten-chinh', g.ten));
      const mo = [g.nhan?.gender === 'female' ? 'nữ' : g.nhan?.gender === 'male' ? 'nam' : '',
        g.nhan?.accent === 'northern' ? 'giọng Bắc' : g.nhan?.accent === 'southern' ? 'giọng Nam' : g.nhan?.accent || '',
        g.nhan?.age === 'young' ? 'trẻ' : g.nhan?.age === 'middle_aged' ? 'trung niên' : ''].filter(Boolean).join(' · ');
      bChon.append(el('span', 'ai-ten-phu', mo || g.mo.slice(0, 40)));
      const bNghe = el('button', 'ai-nghe');
      bNghe.type = 'button';
      bNghe.title = `Nghe thử giọng ${g.ten} — miễn phí`;
      bNghe.setAttribute('aria-label', `Nghe thử giọng ${g.ten}`);
      bNghe.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2l8 4.8-8 4.8z"/></svg>';
      bNghe.onclick = () => nghe(g, bNghe);
      hang.append(bChon, bNghe);
      boc2.appendChild(hang);
    }
    return boc2;
  }

  async function aiViet() {
    const slug = laySlug?.();
    if (!slug || dangViet) return;
    dangViet = true; nutViet.disabled = true; nutViet.textContent = 'AI đang viết…';
    try {
      const r = await fetch('/api/viet-loi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, brief: oBrief.value.trim() }),
      });
      const d = await r.json();
      if (!d.ok) { bao(d.loi || 'AI viết lời hỏng.', true); return; }
      oLoi.value = d.loi;
      /* So thời gian ĐỌC với thời lượng CLIP, và nói ra ngay. Không nói thì
         người dùng bấm đọc, tiêu ký tự, rồi mới phát hiện lời tràn quá phim. */
      canhDai = d.giayDoc > d.giayClip + 0.5
        ? `Lời này đọc mất khoảng ${String(d.giayDoc).replace('.', ',')} giây, `
          + `mà clip chỉ dài ${String(d.giayClip).replace('.', ',')} giây — cắt bớt trước khi đọc.`
        : null;
      demLai();
      bao(d.tutModel
        ? `AI đã viết ${d.soDong} dòng cho ${d.soCanh} cảnh. (${d.tutModel})`
        : `AI đã viết ${d.soDong} dòng cho ${d.soCanh} cảnh — đọc lại và sửa cho thuận miệng.`);
    } catch (e) {
      bao(`AI viết lời hỏng — ${String(e.message || e).slice(0, 80)}`, true);
    } finally { dangViet = false; nutViet.disabled = false; nutViet.textContent = 'AI viết lời'; }
  }

  const nutViet = el('button', 'nut chinh rong nut-viet', 'AI viết lời');
  nutViet.type = 'button';
  nutViet.onclick = aiViet;

  function ve() {
    muc.innerHTML = '';

    /* HAI CỘT: bên trái là phần gõ (brief + lời), bên phải là danh sách giọng.
       Xếp dọc hết thì danh sách 28 giọng bị đẩy xuống dưới đáy bảng và chỉ còn
       thấy hai dòng — mà chọn giọng mới là việc chính ở đây. */
    const trai = el('div', 'ai-cot');
    const phai = el('div', 'ai-cot ai-cot-giong');

    trai.appendChild(el('h3', 'muc-ten', 'Nói cho AI biết clip này về gì'));
    trai.append(oBrief, nutViet);
    trai.appendChild(el('p', 'num-goi',
      'AI đọc sẵn số cảnh, thời lượng từng cảnh và chữ đang hiện trên hình, rồi viết lời vừa với phim.'));

    const h1 = el('h3', 'muc-ten', 'Lời cần đọc');
    trai.append(h1, oLoi);
    const hangLay = el('div', 'hang-nut');
    const lay = el('button', 'nut nho rong', 'Lấy lời từ clip');
    lay.type = 'button';
    lay.title = 'Gom mọi dòng chữ trong clip theo đúng thứ tự cảnh';
    lay.onclick = () => {
      const t = loiTuClip(layDoc?.());
      if (!t) return bao('Clip này không có dòng chữ nào để lấy.', true);
      oLoi.value = t; demLai();
      bao('Đã lấy lời từ clip — đọc lại và sửa cho thuận miệng trước khi đọc.');
    };
    const xoa = el('button', 'nut nho rong', 'Xoá lời');
    xoa.type = 'button';
    xoa.onclick = () => { oLoi.value = ''; demLai(); };
    hangLay.append(lay, xoa);
    trai.append(hangLay, demChu);

    phai.appendChild(el('h3', 'muc-ten', 'Chọn giọng'));
    phai.appendChild(veGiong());
    phai.appendChild(nutDoc);

    muc.append(trai, phai);
    demLai();
  }

  nutDoc.onclick = async () => {
    if (!daChon || dangDoc) return;
    dangDoc = true; demLai();
    try {
      const r = await fetch('/api/doc-loi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loi: oLoi.value.trim(), giongId: daChon.id,
          ten: `${daChon.ten}-${oLoi.value.trim().slice(0, 24)}` }),
      });
      const d = await r.json();
      if (!d.ok) { bao(d.loi || 'Đọc lời hỏng.', true); return; }
      // Đọc xong là THÀNH RÃNH luôn, không bắt người dùng sang bảng khác tự tìm
      // file vừa tạo trong danh sách mấy chục file.
      themRanh?.({ src: d.src, kind: 'tieng', at: 0, gain: 1 });
      bao(`Đã đọc xong ${d.kyTu} ký tự và thêm vào clip thành một rãnh lời đọc.`);
    } catch (e) {
      bao(`Đọc lời hỏng — ${String(e.message || e).slice(0, 80)}`, true);
    } finally { dangDoc = false; demLai(); }
  };

  async function nap() {
    try {
      const d = await (await fetch('/api/giong')).json();
      gioiHan = d.gioiHan || 5000;
      if (!d.ok) {
        muc.innerHTML = '';
        muc.appendChild(el('h3', 'muc-ten', 'Giọng đọc AI'));
        const p = el('p', 'num-goi canh-bao', d.cau || 'Chưa dùng được giọng đọc AI.');
        muc.appendChild(p);
        return;
      }
      giong = d.giong || [];
      ve();
    } catch {
      muc.innerHTML = '';
      muc.appendChild(el('p', 'num-goi canh-bao', 'Không hỏi được danh sách giọng.'));
    }
  }

  boc.appendChild(muc);
  return { nap, ve };
}
