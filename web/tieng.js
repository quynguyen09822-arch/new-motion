/**
 * BẢNG RÃNH TIẾNG — lời đọc, nhạc nền, tiếng động.
 *
 * Mỗi rãnh vẽ SÓNG ÂM thật, đặt đúng chỗ của nó trên chiều dài clip. Không vẽ
 * sóng thì người dùng phải đoán "tiếng vụt này bắt đầu ở giây mấy" bằng cách
 * nghe đi nghe lại — mà đó chính là việc máy làm hộ được.
 *
 * SÓNG CHUẨN HOÁ THEO TỪNG RÃNH, và có nói rõ độ to thật bên cạnh.
 *   Vẽ thô thì tiếng vụt trong kho (đỉnh chỉ 4%) ra một vạch phẳng, nhìn y như
 *   file hỏng. Chuẩn hoá thì mọi rãnh cao bằng nhau, mất thông tin rãnh nào to
 *   hơn. Nên: chuẩn hoá để nhìn được HÌNH DẠNG, in con số để biết ĐỘ TO.
 */

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};
const g2 = (v) => Number(v).toFixed(2).replace('.', ',');

const LOAI = [
  { v: 'tieng', nhan: 'Lời đọc' },
  { v: 'nhac', nhan: 'Nhạc nền' },
  { v: 'hieu-ung', nhan: 'Tiếng động' },
];

/* Nhớ sóng đã tải để khỏi hỏi lại máy chủ mỗi lần vẽ lại bảng — bảng vẽ lại sau
   MỌI thao tác sửa, mà đo sóng một bản nhạc 3 phút tốn gần một giây. */
const nhoSong = new Map();
async function laySong(src) {
  if (nhoSong.has(src)) return nhoSong.get(src);
  const chờ = (async () => {
    try {
      const r = await fetch(`/api/song-am?src=${encodeURIComponent(src)}&o=300`);
      const d = await r.json();
      return d.ok ? d : null;
    } catch { return null; }
  })();
  nhoSong.set(src, chờ);
  return chờ;
}

/** Vẽ sóng bằng SVG — không cần canvas, và phóng to không bị vỡ. */
function veSong(d, rong = 300) {
  if (!d || !d.dinh || !d.dinh.length) return '';
  const n = Math.max(d.to || 0, 1e-6);
  const b = d.dinh.length;
  let duong = '';
  for (let i = 0; i < b; i++) {
    const x = (i / (b - 1 || 1)) * rong;
    const h = Math.max(0.6, (d.dinh[i] / n) * 15);
    duong += `M${x.toFixed(2)} ${(16 - h).toFixed(2)}V${(16 + h).toFixed(2)}`;
  }
  return `<svg class="song" viewBox="0 0 ${rong} 32" preserveAspectRatio="none" aria-hidden="true"><path d="${duong}"/></svg>`;
}

export function taoBangTieng(boc, { layDoc, sua, bao, layGiay }) {
  let kho = [];
  const muc = el('div', 'muc-tieng');

  async function napKho() {
    try {
      const d = await (await fetch('/api/tieng')).json();
      if (d.ok) kho = d.kho;
    } catch { /* mở lại là thử lại */ }
  }

  function ranhCua(doc) {
    return (doc && doc.audio && Array.isArray(doc.audio.tracks)) ? doc.audio.tracks : [];
  }

  /** Sửa một rãnh. Luôn đi qua `sua()` để còn hoàn tác được. */
  function doi(i, khoa, gt) {
    sua((d) => {
      d.audio = d.audio || { tracks: [] };
      d.audio.tracks = (d.audio.tracks || []).slice();
      d.audio.tracks[i] = { ...d.audio.tracks[i], [khoa]: gt };
    });
  }

  function them(src) {
    const t = kho.find((x) => x.src === src);
    if (!t) return;
    sua((d) => {
      d.audio = d.audio || { tracks: [] };
      d.audio.tracks = [...(d.audio.tracks || []), {
        id: `ranh-${(d.audio.tracks || []).length + 1}`,
        src, kind: /voice|tieng|vo/i.test(t.nhom) ? 'tieng' : /sfx/i.test(t.nhom) ? 'hieu-ung' : 'nhac',
        at: 0, gain: 1, fadeIn: 0, fadeOut: 0,
      }];
    });
    bao(`Đã thêm rãnh "${t.ten}".`);
  }

  function xoa(i) {
    sua((d) => {
      d.audio = d.audio || { tracks: [] };
      d.audio.tracks = (d.audio.tracks || []).filter((_, j) => j !== i);
    });
  }

  function num(nhan, gt, min, max, buoc, khi) {
    const b = el('label', 'num-ti');
    b.append(el('span', 'num-nhan-ti', nhan));
    const o = el('input', 'o-nhap ti');
    o.type = 'number'; o.min = min; o.max = max; o.step = buoc;
    o.value = gt;
    o.onchange = () => khi(Math.max(min, Math.min(max, Number(o.value) || 0)));
    b.appendChild(o);
    return b;
  }

  function ve() {
    const doc = layDoc?.();
    muc.innerHTML = '';
    if (!doc) { muc.appendChild(el('p', 'num-goi', 'Mở một clip trước đã.')); return; }
    const ds = ranhCua(doc);
    const dai = layGiay?.() || 0;

    /* ---- thêm rãnh ---- */
    const hang = el('div', 'num');
    hang.append(el('label', 'num-nhan', 'Thêm rãnh tiếng'));
    const chon = el('select', 'o-nhap');
    const dau = el('option', null, kho.length ? '— chọn file tiếng —' : 'Không có file tiếng nào');
    dau.value = ''; chon.appendChild(dau);
    let nhomCu = null, boc2 = null;
    for (const t of kho) {
      if (t.nhom !== nhomCu) { nhomCu = t.nhom; boc2 = document.createElement('optgroup'); boc2.label = t.nhom; chon.appendChild(boc2); }
      const o = el('option', null, t.ten); o.value = t.src; boc2.appendChild(o);
    }
    chon.onchange = () => { if (chon.value) { them(chon.value); chon.value = ''; } };
    hang.appendChild(chon);
    muc.appendChild(hang);

    if (!ds.length) {
      muc.appendChild(el('p', 'num-goi', 'Clip này chưa có tiếng. Chọn một file ở trên để thêm.'));
      return;
    }

    /* ---- từng rãnh ---- */
    for (const [i, t] of ds.entries()) {
      const the = el('div', `ranh ranh-${t.kind || 'nhac'}`);
      const dinh = el('div', 'ranh-dinh');
      const ten = el('span', 'ranh-ten', (t.src || '').split('/').pop() || '(chưa chọn)');
      ten.title = t.src || '';
      const bo = el('button', 'nut-ti', '');
      bo.type = 'button'; bo.title = 'Bỏ rãnh này'; bo.setAttribute('aria-label', `Bỏ rãnh ${t.id || i + 1}`);
      bo.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
      bo.onclick = () => xoa(i);
      const kieu = el('select', 'o-nhap ti');
      for (const k of LOAI) { const o = el('option', null, k.nhan); o.value = k.v; kieu.appendChild(o); }
      kieu.value = t.kind || 'nhac';
      kieu.onchange = () => doi(i, 'kind', kieu.value);
      dinh.append(ten, kieu, bo);

      /* Dải sóng, đặt đúng chỗ trên chiều dài clip. */
      const dai2 = el('div', 'ranh-dai');
      const trong = el('div', 'ranh-song');
      dai2.appendChild(trong);
      const ghi = el('span', 'ranh-ghi', '…');
      dai2.appendChild(ghi);

      laySong(t.src).then((d) => {
        if (!d) { ghi.textContent = 'không đọc được file này'; return; }
        const daiRanh = t.for != null ? t.for : Math.max(0, d.giay - (t.from || 0));
        const batDau = t.at || 0;
        if (dai > 0) {
          trong.style.left = `${Math.max(0, batDau / dai) * 100}%`;
          trong.style.width = `${Math.min(1, daiRanh / dai) * 100}%`;
        }
        trong.innerHTML = veSong(d);
        const qua = dai > 0 && batDau + daiRanh > dai + 0.05;
        ghi.textContent = `${g2(daiRanh)}s · to nhất ${Math.round((d.to || 0) * 100)}%`
          + (qua ? ` · ⚠ dài quá clip ${g2(batDau + daiRanh - dai)}s` : '');
        ghi.classList.toggle('canh-bao', qua);
      });

      const num2 = el('div', 'ranh-num');
      num2.append(
        num('Bắt đầu ở giây', t.at || 0, 0, 3600, 0.05, (v) => doi(i, 'at', v)),
        num('Độ to', t.gain != null ? t.gain : 1, 0, 2, 0.05, (v) => doi(i, 'gain', v)),
        num('Mờ vào', t.fadeIn || 0, 0, 10, 0.1, (v) => doi(i, 'fadeIn', v)),
        num('Mờ ra', t.fadeOut || 0, 0, 10, 0.1, (v) => doi(i, 'fadeOut', v)),
        num('Bỏ đầu file', t.from || 0, 0, 3600, 0.05, (v) => doi(i, 'from', v)),
      );
      the.append(dinh, dai2, num2);
      muc.appendChild(the);
    }

    /* Cộng độ to các rãnh cùng loại — nhắc trước chuyện tiếng chồng nhau vỡ. */
    const congTieng = ds.filter((t) => (t.kind || 'nhac') !== 'hieu-ung')
      .reduce((s, t) => s + (t.gain != null ? t.gain : 1), 0);
    if (congTieng > 1.3) {
      muc.appendChild(el('p', 'num-goi canh-bao',
        `Lời đọc và nhạc cộng lại đang ${Math.round(congTieng * 100)}% — dễ vỡ tiếng. `
        + 'Hạ độ to nhạc nền xuống khoảng 0,3 là lời đọc nghe rõ hẳn.'));
    }
  }

  boc.appendChild(muc);
  napKho().then(ve);
  return { ve, napKho };
}
