/**
 * BẢNG MỐC CHUYỂN ĐỘNG (keyframe).
 *
 * Người dùng chính của công cụ này không rành kỹ thuật, nên mục này KHÔNG bày
 * sẵn: chưa có mốc nào thì chỉ hiện đúng một nút "Tự đặt mốc chuyển động". Bấm
 * vào mới mở ra — và lúc đó nó nói thẳng rằng hiệu ứng vào/ra sẽ nghỉ.
 *
 * MỐC ĐẶT TẠI CHỖ ĐẦU KIM ĐANG ĐỨNG, không phải "giây 0 rồi tự sửa số". Người
 * dùng tua tới chỗ ưng mắt, bấm một cái là có mốc ở đúng đó — đó là cách mọi
 * phần mềm dựng phim làm, và là cách duy nhất không bắt người ta nhẩm số.
 *
 * Mỗi mốc chỉ ghi NHỮNG THỨ ĐƯỢC BẬT. Ghi cả năm thuộc tính vào mọi mốc thì
 * người dùng đặt mốc thứ hai để xoay là món cũng bị ghim luôn vị trí và độ mờ —
 * hết chuyển động, mà chẳng hiểu vì sao.
 */
import { huongDanChung } from '../huongdan.js';
import { HUONG_DAN_CHUNG } from './schema.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};
const g2 = (v) => Number(v).toFixed(2).replace('.', ',');

/** Năm thứ đặt mốc được. Tên theo thứ MẮT THẤY, không theo tên biến. */
export const NUM_MOC = [
  { id: 'x', nhan: 'Dời ngang', don: 'px', min: -4000, max: 4000, buoc: 1, mac: 0 },
  { id: 'y', nhan: 'Dời dọc', don: 'px', min: -4000, max: 4000, buoc: 1, mac: 0 },
  { id: 'scale', nhan: 'Phóng to', don: '×', min: 0, max: 6, buoc: 0.01, mac: 1 },
  { id: 'rotate', nhan: 'Xoay', don: '°', min: -1080, max: 1080, buoc: 1, mac: 0 },
  { id: 'opacity', nhan: 'Rõ mờ', don: '', min: 0, max: 1, buoc: 0.01, mac: 1 },
];

export function veMocChuyenDong({ e, datMon, daiCanh, gioHienTai, KHO_DA, veLai }) {
  const m = el('section', 'muc muc-moc');
  /* Giải thích nằm trong BONG BÓNG, không phải dòng chữ xám dưới nút. Luật của
     bảng này: dòng xám chỉ để in GIÁ TRỊ ĐANG DÙNG, còn mọi lời giảng đi vào nút
     hỏi — `kiem-huong-dan.mjs` đếm và chặn nếu lách luật. */
  const tieuDe = el('h3', 'muc-ten', 'Mốc chuyển động');
  m.appendChild(tieuDe);
  huongDanChung().gan(tieuDe, HUONG_DAN_CHUNG.mocChuyenDong);
  const keys = Array.isArray(e.keys) ? e.keys : null;

  /* `apDung()` của app CỐ Ý không vẽ lại bảng thuộc tính — gõ từng phím mà dựng
     lại cả bảng thì giật. Các núm khác không cần vì chúng tự giữ giá trị. Bảng
     mốc thì khác: thêm/bỏ mốc hay bật/tắt một thuộc tính là đổi CẤU TRÚC, nên
     phải tự xin vẽ lại. Đổi mỗi con số thì không cần — vẽ lại là mất chỗ con trỏ. */
  const ghi = (ds, veLaiCan = true) => {
    datMon('sửa mốc chuyển động', 'keys', ds && ds.length ? ds : undefined);
    if (veLaiCan) veLai?.();
  };
  /* Luôn xếp lại theo thời gian sau mỗi lần sửa. Bộ dựng tự tìm hai mốc gần nhất
     nên thứ tự lộn xộn vẫn chạy đúng, nhưng danh sách nhảy lung tung thì người
     dùng không theo dõi nổi mình vừa sửa cái nào. */
  const xep = (ds) => ds.slice().sort((a, b) => (a.t || 0) - (b.t || 0));

  if (!keys) {
    const b = el('button', 'nut nho rong', 'Tự đặt mốc chuyển động');
    b.type = 'button';
    b.onclick = () => {
      const t0 = Math.max(0, Math.min(daiCanh(), gioHienTai()));
      // Hai mốc, không phải một: một mốc thì chẳng có gì để nội suy, món đứng im
      // và người dùng tưởng tính năng hỏng.
      ghi(xep([
        { t: 0, opacity: 0, y: 40 },
        { t: Math.max(0.4, t0 || 0.8), opacity: 1, y: 0, ease: 'ra-cham' },
      ]));
    };
    m.appendChild(b);
    return m;
  }

  /* ---- dải thời gian, có vạch mốc ---- */
  const dai = Math.max(0.01, daiCanh());
  const dai2 = el('div', 'moc-dai');
  for (const [i, k] of keys.entries()) {
    const v = el('span', 'moc-vach');
    v.style.left = `${Math.max(0, Math.min(1, (k.t || 0) / dai)) * 100}%`;
    v.title = `Mốc ${i + 1} · giây ${g2(k.t || 0)}`;
    dai2.appendChild(v);
  }
  const kim = el('span', 'moc-kim');
  kim.style.left = `${Math.max(0, Math.min(1, gioHienTai() / dai)) * 100}%`;
  dai2.appendChild(kim);
  m.appendChild(dai2);

  /* ---- từng mốc ---- */
  for (const [i, k] of keys.entries()) {
    const the = el('div', 'moc');
    const dinh = el('div', 'moc-dinh');
    dinh.appendChild(el('span', 'moc-so', `Mốc ${i + 1}`));

    const oT = el('input', 'o-nhap ti');
    oT.type = 'number'; oT.min = 0; oT.max = 600; oT.step = 0.05;
    oT.value = k.t || 0;
    oT.setAttribute('aria-label', `Giây của mốc ${i + 1}`);
    oT.onchange = () => {
      const ds = keys.slice(); ds[i] = { ...k, t: Math.max(0, Number(oT.value) || 0) };
      ghi(xep(ds));
    };
    dinh.append(el('span', 'moc-nhan-ti', 'giây'), oT);

    if (i > 0) {
      const oE = el('select', 'o-nhap ti');
      for (const d of KHO_DA) { const o = el('option', null, d.nhan.split(' —')[0]); o.value = d.v; oE.appendChild(o); }
      oE.value = k.ease || 'mem';
      oE.title = 'Đà khi đi TỚI mốc này';
      oE.setAttribute('aria-label', `Đà đi tới mốc ${i + 1}`);
      oE.onchange = () => { const ds = keys.slice(); ds[i] = { ...k, ease: oE.value }; ghi(xep(ds), false); };
      dinh.appendChild(oE);
    }

    const bo = el('button', 'nut-ti', '');
    bo.type = 'button'; bo.title = 'Bỏ mốc này';
    bo.setAttribute('aria-label', `Bỏ mốc ${i + 1}`);
    bo.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    bo.onclick = () => ghi(xep(keys.filter((_, j) => j !== i)));
    dinh.appendChild(bo);
    the.appendChild(dinh);

    const luoi = el('div', 'moc-num');
    for (const n of NUM_MOC) {
      const co = k[n.id] != null;
      const o = el('label', `moc-o${co ? ' bat' : ''}`);
      const tick = el('input');
      tick.type = 'checkbox'; tick.checked = co;
      tick.setAttribute('aria-label', `${n.nhan} ở mốc ${i + 1}`);
      tick.onchange = () => {
        const ds = keys.slice(); const k2 = { ...k };
        if (tick.checked) k2[n.id] = n.mac; else delete k2[n.id];
        ds[i] = k2; ghi(xep(ds));
      };
      const so = el('input', 'o-nhap ti');
      so.type = 'number'; so.min = n.min; so.max = n.max; so.step = n.buoc;
      so.value = co ? k[n.id] : n.mac;
      so.disabled = !co;
      so.setAttribute('aria-label', `${n.nhan} ở mốc ${i + 1}`);
      so.onchange = () => {
        const ds = keys.slice();
        ds[i] = { ...k, [n.id]: Math.max(n.min, Math.min(n.max, Number(so.value) || 0)) };
        ghi(xep(ds), false);        // chỉ đổi con số — giữ nguyên chỗ con trỏ
      };
      o.append(tick, el('span', 'moc-nhan-ti', n.nhan + (n.don ? ` (${n.don})` : '')), so);
      luoi.appendChild(o);
    }
    the.appendChild(luoi);
    m.appendChild(the);
  }

  /* ---- thêm / bỏ hết ---- */
  const hang = el('div', 'hang-nut');
  const gio = Math.max(0, Math.min(dai, gioHienTai()));
  const daCo = keys.some((k) => Math.abs((k.t || 0) - gio) < 0.02);
  const them = el('button', 'nut nho', 'Thêm mốc tại chỗ kim đứng');
  them.type = 'button';
  /* Khoá nút khi chỗ đó đã có mốc, và NÓI RÕ vì sao. Để nút bấm được rồi im lặng
     không làm gì là kiểu hỏng khó chịu nhất: người dùng bấm mấy lần, tưởng app
     treo, rồi bỏ luôn tính năng. */
  them.disabled = daCo;
  them.title = daCo
    ? `Giây ${g2(gio)} đã có mốc rồi — tua thanh dưới tới chỗ khác rồi bấm.`
    : `Đặt một mốc mới ở giây ${g2(gio)}`;
  them.onclick = () => {
    const t0 = gio;
    // Mốc mới chép giá trị ĐANG HIỆN tại chỗ đó, không phải giá trị mặc định:
    // thêm mốc mà món nhảy về chỗ khác thì không ai dùng được.
    const moi = { t: t0, ease: 'mem' };
    for (const n of NUM_MOC) {
      if (keys.some((k) => k[n.id] != null)) moi[n.id] = docTai(keys, n.id, t0, n.mac);
    }
    ghi(xep([...keys, moi]));
  };
  const het = el('button', 'nut nho rong', 'Bỏ hết mốc');
  het.type = 'button';
  het.onclick = () => ghi(null);
  hang.append(them, het);
  m.appendChild(hang);
  // Đây là TRẠNG THÁI ĐANG DÙNG, không phải lời giảng — nên được phép ở lại
  // dưới dạng dòng xám, và nói đúng một câu.
  m.appendChild(el('p', 'num-goi', 'Đang dùng mốc — hiệu ứng vào/ra của món không chạy.'));
  return m;
}

/** Giá trị đang hiện của một thuộc tính tại giây `cuc` — cùng phép nội suy với bộ dựng. */
function docTai(keys, ten, cuc, mac) {
  let truoc = null, sau = null;
  for (const k of keys) {
    if (k == null || k[ten] == null) continue;
    if (k.t <= cuc) { if (!truoc || k.t >= truoc.t) truoc = k; }
    else if (!sau || k.t < sau.t) sau = k;
  }
  if (!truoc && !sau) return mac;
  if (!truoc) return sau[ten];
  if (!sau) return truoc[ten];
  const p = (cuc - truoc.t) / Math.max(1e-6, sau.t - truoc.t);
  return Number((truoc[ten] + (sau[ten] - truoc[ten]) * p).toFixed(3));
}
