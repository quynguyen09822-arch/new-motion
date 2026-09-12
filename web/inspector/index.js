/**
 * BẢNG THUỘC TÍNH — chỗ người dùng vặn từng món.
 *
 * Chia mục theo câu hỏi trong đầu người dùng, không theo cấu trúc dữ liệu:
 * "nó viết gì" → "nó bay vào thế nào" → "lúc nào nó hiện" → "nó nằm đâu".
 */
import { DEM_TRONG, HUONG_DAN_CHUNG, HUONG_DAN_MAU, KHE_HO, KHO_CHO, KHO_DA, KHO_RA, KHO_VAO, MAU_MAT_BAO, NHAN_KHE_HO, NUM_HIEU_UNG, NUM_MAU, NUM_RIENG, TEN_LOAI } from './schema.js';
import { taoNum } from './fields.js';
import { huongDanChung } from '../huongdan.js';
import { duongDanMon, timCanh, timMon } from '../store.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

const g1 = (n) => Number(n).toFixed(1).replace('.', ',');

/** Tên gọi một món cho dễ nhận: "Chữ · Tìm tên miền…" */
export function tenMon(e) {
  const loai = TEN_LOAI[e.kind] || e.kind;
  const chu = e.text || e.label || e.title || e.name || e.value || e.url || '';
  const goc = String(chu).replace(/\*|\[\[.*?\]\]|\|/g, ' ').replace(/\s+/g, ' ').trim();
  return goc ? `${loai} · ${goc.slice(0, 26)}${goc.length > 26 ? '…' : ''}` : loai;
}

/** Công thức chuyển động hiện tại khớp ô nào trong kho? */
function khopKho(m, kho) {
  if (!m) return null;
  return kho.find((k) => k.m.kind === (m.kind ?? 'rise') && k.m.ease === m.ease) || null;
}

export function taoBang(boc, kho, player) {
  const cuChi = { mo: () => kho.moCuChi(), dong: () => kho.dongCuChi() };
  let chon = null;      // { canhId, monId } | { canhId } | null
  let goiChonKhac = () => {};

  /* Đổi một trường của món đang chọn. */
  const datMon = (nhan, truong, v) =>
    kho.sua(nhan, (doc) => {
      const t = timMon(doc, chon.canhId, chon.monId);
      if (!t) return;
      if (v === '' || v == null) delete t.el[truong];
      else t.el[truong] = v;
    });

  const datCanh = (nhan, truong, v) =>
    kho.sua(nhan, (doc) => {
      const c = timCanh(doc, chon.canhId);
      if (c) c[truong] = v;
    });

  const datMeta = (nhan, truong, v) =>
    kho.sua(nhan, (doc) => { doc.meta[truong] = v; });

  function muc(ten) {
    const m = el('section', 'muc');
    m.appendChild(el('h3', 'muc-ten', ten));
    return m;
  }

  /*
   * NÚM NÂNG CAO — mặc định giấu đi.
   *
   * Người dùng chính của công cụ này không rành kỹ thuật. Bày cả chín núm ra
   * một lúc thì họ không biết núm nào là núm cần vặn, và thường là vặn nhầm cái
   * hiếm dùng rồi không biết đường lùi. Núm hay dùng (chọn kiểu bay, nhanh/chậm)
   * ở ngoài; núm hiếm (kiểu đà, đi xa gần, nghiêng) nằm sau một cái gạt.
   *
   * Dùng `<details>` gốc chứ không tự dựng: bàn phím, trình đọc màn hình và
   * trạng thái đóng/mở là có sẵn, không phải viết lại và viết lại thì thường sai.
   */
  const dangMo = new Set();   // nhớ mục nào đang mở, vì `ve()` dựng lại cả bảng

  function nangCao(khoa) {
    const d = document.createElement('details');
    d.className = 'nang-cao';
    d.open = dangMo.has(khoa);
    const s2 = document.createElement('summary');
    s2.textContent = 'Nâng cao';
    d.appendChild(s2);
    d.addEventListener('toggle', () => {
      if (d.open) dangMo.add(khoa); else dangMo.delete(khoa);
    });
    return d;
  }

  /* ---------- thanh chỉ đường ---------- */
  function veChiDuong(doc) {
    const duong = duongDanMon(doc, chon.canhId, chon.monId);
    const canh = timCanh(doc, chon.canhId);
    const i = (doc.scenes || []).indexOf(canh);
    const b = el('nav', 'chi-duong');

    const oCanh = el('button', 'chi-o', `Cảnh ${i + 1}`);
    oCanh.type = 'button';
    oCanh.onclick = () => goiChonKhac({ canhId: chon.canhId });
    b.appendChild(oCanh);

    duong.forEach((e, k) => {
      b.appendChild(el('span', 'chi-mui', '›'));
      const o = el('button', 'chi-o', k === duong.length - 1 ? tenMon(e) : (TEN_LOAI[e.kind] || e.kind));
      o.type = 'button';
      if (k === duong.length - 1) o.classList.add('dang');
      o.onclick = () => goiChonKhac({ canhId: chon.canhId, monId: e.id });
      b.appendChild(o);
    });
    return b;
  }

  /* ---------- mục chuyển động ---------- */
  function veChuyenDong(e) {
    const m = muc('Chuyển động');

    const veHuong = (huong, kho2, nhanMuc) => {
      const cur = e[huong];
      const trung = khopKho(cur, kho2);

      const oChon = el('select', 'o-nhap');
      const trong = el('option', null, huong === 'in' ? '— chưa đặt —' : '— theo mặc định —');
      trong.value = '';
      oChon.appendChild(trong);
      for (const k of kho2) {
        const o = el('option', null, k.ten);
        o.value = k.id;
        oChon.appendChild(o);
      }
      if (!trung && cur) {
        const o = el('option', null, 'Tự chỉnh');
        o.value = '__tu';
        oChon.appendChild(o);
      }
      oChon.value = trung ? trung.id : cur ? '__tu' : '';

      // Rê chuột vào danh sách xổ không bắt được từng dòng, nên diễn thử khi ĐỔI.
      oChon.onchange = () => {
        const k = kho2.find((x) => x.id === oChon.value);
        datMon(`đổi kiểu ${nhanMuc.toLowerCase()}`, huong, k ? { ...k.m } : undefined);
        dienThu(e);
      };

      const boc2 = el('div', 'num');
      const nhanO = el('label', 'num-nhan', nhanMuc);
      // Hai ô này dựng tay chứ không qua `taoNum`, nên phải tự gắn nút hỏi.
      huongDanChung().gan(nhanO, HUONG_DAN_CHUNG[huong]);
      boc2.append(nhanO, oChon);
      if (trung) boc2.appendChild(el('p', 'num-goi', trung.goi));
      m.appendChild(boc2);

      if (!cur) return;
      // Núm hay dùng nhất — ở ngoài.
      m.appendChild(taoNum(
        { id: 'dur', nhan: 'Nhanh / chậm', kieu: 'so', min: 0.05, max: 2, buoc: 0.05,
          goi: `${g1(cur.dur ?? (huong === 'in' ? 0.55 : 0.4))} giây`, goiSong: true },
        cur.dur ?? (huong === 'in' ? 0.55 : 0.4),
        (v) => datMon('đổi tốc độ chuyển động', huong, { ...cur, dur: v }), cuChi));

      const sau = nangCao(`chuyendong-${huong}`);
      sau.appendChild(taoNum(
        { id: 'ease', nhan: 'Kiểu đà', kieu: 'chon', chon: KHO_DA },
        cur.ease ?? (huong === 'in' ? 'out' : 'inOut'),
        (v) => { datMon('đổi kiểu đà', huong, { ...cur, ease: v }); dienThu(e); }, cuChi));
      if (['rise', 'fall', 'left', 'right'].includes(cur.kind)) {
        sau.appendChild(taoNum(
          { id: 'dist', nhan: 'Đi xa / gần', kieu: 'so', min: 0, max: 300,
            goi: 'bỏ trống thì bộ dựng tự chọn theo cỡ khung' },
          cur.dist ?? '',
          (v) => datMon('đổi quãng dịch', huong, { ...cur, dist: v }), cuChi));
      }
      m.appendChild(sau);
    };

    veHuong('in', KHO_VAO, 'Bay vào');
    veHuong('out', KHO_RA, 'Bay ra');
    return m;
  }

  /** Diễn thử: nhảy về trước lúc món hiện rồi cho chạy tới, để thấy nó bay vào. */
  function dienThu(e) {
    const canh = player.dsCanh().find((c) => c.id === chon.canhId);
    if (!canh) return;
    const at = e.at ?? 0;
    player.tua(Math.max(0, canh.start + at - 0.15));
    player.chay();
    setTimeout(() => player.dung(), ((e.in?.dur ?? 0.55) + 0.45) * 1000);
  }

  /* ---------- mục chỗ đặt ---------- */
  function veChoDat(doc, t) {
    const { el: e, cha } = t;
    const m = muc('Chỗ đặt');

    if (cha) {
      // Con nằm trong cụm thì flex giữ chỗ — đặt toạ độ vào là hỏng cả cụm.
      const bao = el('p', 'nhac');
      bao.textContent = 'Món này nằm trong một cụm — cụm tự xếp chỗ cho nó. Kéo lên/xuống trên khung hình để đổi thứ tự.';
      m.appendChild(bao);
      const nut = el('button', 'nut nho', 'Sửa cụm chứa nó →');
      nut.type = 'button';
      nut.onclick = () => goiChonKhac({ canhId: chon.canhId, monId: cha.id });
      m.appendChild(nut);
      return m;
    }

    const dangDat = Boolean(e.place);
    const hang = el('div', 'doan');
    const bDat = el('button', 'doan-o', 'Đặt sẵn');
    const bTu = el('button', 'doan-o', 'Tự đặt');
    bDat.type = bTu.type = 'button';
    bDat.setAttribute('aria-pressed', String(dangDat));
    bTu.setAttribute('aria-pressed', String(!dangDat));

    bDat.onclick = () => {
      if (dangDat) return;
      kho.sua('chuyển về chỗ đặt sẵn', (d) => {
        const x = timMon(d, chon.canhId, chon.monId);
        if (!x) return;
        x.el.place = 'giua';
        delete x.el.w; delete x.el.h;   // vùng đặt sẵn tự lo bề rộng
      });
      ve();
    };
    bTu.onclick = () => {
      if (!dangDat) return;
      // Đọc kích thước THẬT trên màn hình rồi ghi thành số cứng, để món không
      // nhảy chỗ ngay lúc thoát khỏi vùng đặt sẵn.
      const node = player.node(chon.canhId, chon.monId);
      const hs = player.hesoPhong() || 1;
      const r = node?.getBoundingClientRect();
      const cam = player.tai()?.querySelector('#cam')?.getBoundingClientRect();
      kho.sua('chuyển sang tự đặt chỗ', (d) => {
        const x = timMon(d, chon.canhId, chon.monId);
        if (!x) return;
        if (r && cam) {
          x.el.x = Math.round((r.left - cam.left) / hs);
          x.el.y = Math.round((r.top - cam.top) / hs);
          x.el.w = Math.round(r.width / hs);
          x.el.h = Math.round(r.height / hs);
        }
        delete x.el.place;
      });
      ve();
    };
    hang.append(bDat, bTu);
    const bocCho = el('div', 'num');
    const nhanCho = el('label', 'num-nhan', 'Cách đặt');
    huongDanChung().gan(nhanCho, HUONG_DAN_CHUNG.cachDat);
    bocCho.append(nhanCho, hang);
    m.appendChild(bocCho);

    if (dangDat) {
      m.appendChild(taoNum({ id: 'place', nhan: 'Vùng', kieu: 'chon', chon: KHO_CHO },
        e.place, (v) => datMon('đổi vùng đặt', 'place', v), cuChi));
      m.appendChild(taoNum({ id: 'margin', nhan: 'Lề quanh mép', kieu: 'bac' },
        e.margin ?? 7, (v) => datMon('đổi lề', 'margin', v), cuChi));
      m.appendChild(el('p', 'num-goi', 'Vùng đặt sẵn tự co theo khung — đổi khổ dọc/ngang là nó tự dàn lại.'));
    } else {
      const oXY = el('div', 'cap');
      for (const [k, n] of [['x', 'Ngang'], ['y', 'Dọc']]) {
        const o = el('input', 'o-nhap o-so');
        o.type = 'number';
        o.value = e[k] ?? 0;
        o.oninput = () => datMon('đổi vị trí', k, Number(o.value));
        const b = el('div', 'num');
        b.append(el('label', 'num-nhan', n), o);
        oXY.appendChild(b);
      }
      m.appendChild(oXY);
      const oWH = el('div', 'cap');
      for (const [k, n] of [['w', 'Rộng'], ['h', 'Cao']]) {
        const o = el('input', 'o-nhap o-so');
        o.type = 'number';
        o.value = e[k] ?? '';
        o.placeholder = 'tự';
        o.oninput = () => datMon('đổi kích thước', k, o.value === '' ? '' : Number(o.value));
        const b = el('div', 'num');
        b.append(el('label', 'num-nhan', n), o);
        oWH.appendChild(b);
      }
      m.appendChild(oWH);
      m.appendChild(el('p', 'num-goi', 'Đang giữ chỗ và kích thước cố định — không tự co theo khung nữa.'));
    }
    return m;
  }

  /* ---------- vẽ toàn bảng ---------- */
  function ve() {
    boc.innerHTML = '';
    const doc = kho.doc();
    if (!doc) return;

    /* --- không chọn gì: bảng của cả clip --- */
    if (!chon) {
      boc.appendChild(el('div', 'chi-duong', 'Cả clip'));
      const m = muc('Màu của clip');
      for (const c of NUM_MAU) {
        // Tra bảng RIÊNG của màu clip: khoá `ink` ở đây là "màu chữ chung cả
        // clip", trùng tên với núm "màu chữ riêng" của từng phần tử.
        m.appendChild(taoNum({ ...c, kieu: 'mau', huongDan: HUONG_DAN_MAU[c.id] }, doc.meta[c.id],
          (v) => datMeta(`đổi ${c.nhan.toLowerCase()}`, c.id, v), cuChi));
      }
      const nut = el('button', 'nut nho', 'Áp bộ màu Mắt Bão');
      nut.type = 'button';
      nut.onclick = () => {
        kho.sua('áp bộ màu Mắt Bão', (d) => Object.assign(d.meta, MAU_MAT_BAO));
        ve();
      };
      m.appendChild(nut);
      boc.appendChild(m);

      const m2 = muc('Khổ hình');
      m2.appendChild(el('p', 'nhac', `${doc.meta.width} × ${doc.meta.height} — ${doc.meta.height > doc.meta.width ? 'dọc' : 'ngang'}`));
      m2.appendChild(taoNum({ id: 'density', nhan: 'Độ thoáng cả clip', kieu: 'so',
        min: 0.6, max: 1.6, buoc: 0.05,
        goi: 'một núm làm mọi khoảng cách trong clip giãn ra hoặc chặt lại' },
        doc.meta.density, (v) => datMeta('đổi độ thoáng', 'density', v), cuChi));
      boc.appendChild(m2);
      return;
    }

    /* --- chọn cảnh --- */
    if (!chon.monId) {
      const canh = timCanh(doc, chon.canhId);
      if (!canh) return;
      const i = doc.scenes.indexOf(canh);
      boc.appendChild(el('div', 'chi-duong', `Cảnh ${i + 1} — ${canh.id}`));
      const m = muc('Cảnh này');
      m.appendChild(taoNum({ id: 'duration', nhan: 'Dài bao lâu', kieu: 'so',
        min: 0.5, max: 30, buoc: 0.1, goi: `${g1(canh.duration)} giây`, goiSong: true },
        canh.duration, (v) => datCanh('đổi độ dài cảnh', 'duration', v), cuChi));
      m.appendChild(taoNum({ id: 'stagger', nhan: 'So le giữa các món', kieu: 'so',
        min: 0, max: 0.6, buoc: 0.01,
        goi: 'món sau vào chậm hơn món trước chừng này giây — thứ làm chuyển động bớt máy' },
        canh.stagger ?? 0, (v) => datCanh('đổi độ so le', 'stagger', v), cuChi));
      boc.appendChild(m);
      return;
    }

    /* --- chọn món --- */
    const t = timMon(doc, chon.canhId, chon.monId);
    if (!t) { chon = null; return ve(); }
    const e = t.el;

    boc.appendChild(veChiDuong(doc));

    const rieng = NUM_RIENG[e.kind] || [];
    if (rieng.length) {
      const m = muc('Nội dung');
      for (const num of rieng) {
        m.appendChild(taoNum(num, e[num.id],
          (v) => datMon(`sửa ${num.nhan.toLowerCase()}`, num.id, v), cuChi));
      }
      boc.appendChild(m);
    }

    boc.appendChild(veChuyenDong(e));

    const mT = muc('Thời gian');
    mT.appendChild(taoNum({ id: 'at', nhan: 'Chờ rồi mới hiện', kieu: 'so',
      min: 0, max: 20, buoc: 0.05 },
      e.at ?? 0, (v) => datMon('đổi lúc hiện', 'at', v), cuChi));
    mT.appendChild(taoNum({ id: 'for', nhan: 'Hiện trong bao lâu', kieu: 'so',
      min: 0, max: 30, buoc: 0.1 },
      e.for ?? '', (v) => datMon('đổi thời gian sống', 'for', v), cuChi));
    boc.appendChild(mT);

    boc.appendChild(veChoDat(doc, t));

    /*
     * Chỉ bày núm nào bộ dựng THẬT SỰ nghe — xem `DEM_TRONG`/`KHE_HO` trong
     * `schema.js`. Bày núm chết còn tệ hơn không bày: bấm vào thì số trong kịch
     * bản đổi mà khung hình đứng im, và người dùng mất lòng tin vào cả những núm
     * thật. Và bày bậc mặc định THẬT, không bày 0 rồi để tấm thẻ co lại khi
     * người dùng bấm đúng cái bậc họ tưởng là "giữ nguyên".
     */
    const mK = muc('Khoảng cách');
    if (KHE_HO[e.kind] != null) {
      mK.appendChild(taoNum(
        { id: 'gap', nhan: NHAN_KHE_HO[e.kind] || 'Khe hở bên trong', kieu: 'bac' },
        e.gap ?? KHE_HO[e.kind], (v) => datMon('đổi khe hở bên trong', 'gap', v), cuChi));
    }
    if (DEM_TRONG[e.kind] != null) {
      mK.appendChild(taoNum({ id: 'pad', nhan: 'Đệm trong', kieu: 'bac' },
        e.pad ?? DEM_TRONG[e.kind], (v) => datMon('đổi đệm trong', 'pad', v), cuChi));
    }
    mK.appendChild(taoNum({ id: 'opacity', nhan: 'Độ mờ', kieu: 'so', min: 0, max: 1, buoc: 0.05 },
      e.opacity ?? 1, (v) => datMon('đổi độ mờ', 'opacity', v), cuChi));
    const sauK = nangCao('khoangcach');
    sauK.appendChild(taoNum({ id: 'rotate', nhan: 'Nghiêng', kieu: 'so', min: -180, max: 180,
    },
      e.rotate ?? 0, (v) => datMon('đổi độ nghiêng', 'rotate', v), cuChi));
    mK.appendChild(sauK);
    boc.appendChild(mK);

    /*
     * HIỆU ỨNG HÌNH — nhoè, bóng đổ, đẩy máy chậm.
     *
     * Áp cho MỌI loại: `filter` của trình duyệt không kén loại, và phép nhân vào
     * `scale` cũng vậy. Nên ở đây KHÔNG có bảng "loại nào nghe" như `pad`/`gap`
     * — chỗ nào cũng nghe. `tools/kiem-hieu-ung.mjs` đo lại điều đó trên cả 24
     * loại, để hôm nào bộ dựng đổi ý thì biết ngay.
     */
    const mH = muc('Hiệu ứng hình');
    for (const num of NUM_HIEU_UNG) {
      mH.appendChild(taoNum(num, e[num.id] ?? (num.kieu === 'bat' ? false : 0),
        (v) => datMon(`đổi ${num.nhan.toLowerCase()}`, num.id, v), cuChi));
    }
    boc.appendChild(mH);
  }

  return {
    ve,
    dat(c) { chon = c; ve(); },
    chon: () => chon,
    khiChonKhac(f) { goiChonKhac = f; },
  };
}
