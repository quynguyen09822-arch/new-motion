/**
 * KHỞI ĐỘNG VÀ NỐI DÂY.
 *
 * Luồng dữ liệu, một chiều, không có ngoại lệ:
 *
 *   kho (kịch bản)  ──sửa──►  apDung()  ──►  player.nap()  ──►  khung xem
 *        ▲                                                          │
 *        └────────── bảng thuộc tính / kéo thả ◄── lớp bắt ◄────────┘
 *
 * Khung xem là CÁI ĐỂ NHÌN, không bao giờ là nguồn sự thật. Ta chỉ đọc hình học
 * từ nó (khung của món, hệ số phóng), ngoài ra không đọc gì.
 */
import { taoPlayer } from './player.js';
import { taoKho, timCanh, timMon } from './store.js';
import { taoDo } from './picker.js';
import { taoLopPhu } from './overlay.js';
import { taoDanhSach } from './layers.js';
import { taoBang, tenMon } from './inspector/index.js';
import { ganKeo } from './drag.js';
import { MAU_MON, nhanBanCanh, nhanBanMon, themCanh, themMon, xoaCanh, xoaMon } from './them.js';
import { taoBangXuat } from './exportpanel.js';
import { taoKhung } from './khung.js';
import { taoBangVideo } from './videos.js';
import { taoZoom } from './zoom.js';
import { taoAnhNho } from './anhnho.js';
import { taoKeoCot } from './cot.js';

const $ = (id) => document.getElementById(id);
const chonClip = $('chon-clip'), dangClip = $('dang-clip'), dsCanhEl = $('ds-canh');
const bangDoiCu = $('bang-doi-cu'), bocKhung = $('boc-khung'), lopBat = $('lop-bat');
const khungEl = $('khung');
const nutChay = $('nut-chay'), thanhTua = $('thanh-tua'), dongHo = $('dong-ho'), baoEl = $('bao');
const nutLui = $('nut-lui'), nutToi = $('nut-toi'), nutLuu = $('nut-luu'), dauBan = $('dau-ban');

const player = taoPlayer(khungEl);
const kho = taoKho();
const doMon = taoDo(player);
const lopPhu = taoLopPhu($('lop-phu'), player);
const bang = taoBang($('bang-thuoc-tinh'), kho, player);
const anhNho = taoAnhNho(player);
const dsLop = taoDanhSach($('ds-lop'), {
  anhNho,
  onChon: (c) => datChon(c),
  onRe: (c) => lopPhu.veRe(c.canhId, c.monId),
  onThoiRe: () => lopPhu.xoaRe(),
});

let clips = [], clipDangMo = null, chon = null, dangKeoThanh = false;

const bangXuat = taoBangXuat($('bang-xuat'), {
  laySlug: () => kho.slug(),
  bao: (c, h) => bao(c, h),
  layDoc: () => kho.doc(),
  chonMon: (c) => { doiThe('tt'); datChon(c); },
});
const bangKhung = taoKhung({
  bocGiua: $('san-khung'), bocBang: $('bang-khung'), bao: (c, h) => bao(c, h),
});
const bangVideo = taoBangVideo({
  bocGiua: $('san-video'), bocBang: $('bang-video'), bao: (c, h) => bao(c, h),
});

/* ---------- lời nhắc ---------- */
let hen = null;
function bao(cau, hong = false) {
  baoEl.textContent = cau;
  baoEl.classList.toggle('hong', hong);
  baoEl.classList.remove('an');
  clearTimeout(hen);
  hen = setTimeout(() => baoEl.classList.add('an'), hong ? 8000 : 3400);
}
const giay1 = (n) => Number(n).toFixed(1).replace('.', ',');
const trangThai = (t) => { $('app').dataset.trangThai = t; };

/* ---------- áp kịch bản lên khung xem ---------- */
let henVe = null;
function apDung() {
  // Gộp nhiều lần sửa liên tiếp vào một nhịp vẽ: `nap()` là dựng lại cả cảnh,
  // gọi theo từng phím gõ thì giật.
  cancelAnimationFrame(henVe);
  henVe = requestAnimationFrame(() => {
    const doc = kho.doc();
    if (doc) player.nap(doc);   // nap() tự tua lại chỗ cũ — xem player.js
    veLopPhu();
  });
}

/* ---------- vẽ khung chọn ---------- */
function veLopPhu() {
  if (!chon?.monId) { lopPhu.xoa(); lopBat.classList.remove('keo-duoc'); return; }
  const t = timMon(kho.doc(), chon.canhId, chon.monId);
  if (!t) { lopPhu.xoa(); return; }
  const kieu = t.cha ? 'con' : t.el.place ? 'dat' : 'tu';
  lopPhu.veChon(chon.canhId, chon.monId, tenMon(t.el), kieu);
  lopBat.classList.toggle('keo-duoc', kieu === 'tu');
}

/* ---------- chọn ---------- */
function datChon(c) {
  chon = c;
  bang.dat(c);
  dsLop.dat(c);
  const doc = kho.doc();
  if (doc && c?.canhId) dsLop.ve(doc, c.canhId);
  veLopPhu();
  danhDauCanh();

  // Chọn một món chưa hiện ra thì tự tua tới lúc nó hiện — không thì người dùng
  // chọn xong nhìn khung hình trống, tưởng hỏng.
  if (!c?.monId) return;
  const t = timMon(doc, c.canhId, c.monId);
  const canh = player.dsCanh().find((x) => x.id === c.canhId);
  if (!t || !canh) return;
  const at = (t.el.at ?? 0) + (timCanh(doc, c.canhId)?.stagger ?? 0) * 0;
  const hienLuc = canh.start + at + (t.el.in?.dur ?? 0.55) + 0.05;
  const nay = player.giay();
  if (nay < canh.start || nay >= canh.start + canh.duration || nay < hienLuc - 0.02) {
    player.tua(Math.min(hienLuc, canh.start + canh.duration - 0.05));
    bao(`Đã nhảy tới giây ${giay1(player.giay())} để bạn nhìn thấy nó.`);
  }
}

/* ---------- lớp bắt sự kiện ---------- */
lopBat.addEventListener('click', (ev) => {
  if (keo.dangKeo()) return;           // vừa kéo xong thì đừng đổi lựa chọn
  const { x, y } = player.quyDoi(ev.clientX, ev.clientY);
  const c = ev.altKey ? doMon.doNgoaiCung(x, y) : doMon.do(x, y, chon);
  datChon(c || { canhId: player.canhHienTai()?.id });
});

lopBat.addEventListener('mousemove', (ev) => {
  if (keo.dangKeo()) return;
  const { x, y } = player.quyDoi(ev.clientX, ev.clientY);
  const c = doMon.do(x, y, null);
  if (c) lopPhu.veRe(c.canhId, c.monId); else lopPhu.xoaRe();
});
lopBat.addEventListener('mouseleave', () => lopPhu.xoaRe());

/* ---------- phóng to / thu nhỏ khung làm việc ---------- */
const zoom = taoZoom({ boc: bocKhung, san: $('san-clip'), player, bao });
player.datPhongCha(() => zoom.heSo());   // để quyDoi/hesoPhong tính đúng khi đang phóng

const chiPhong = $('chi-phong'), soPhong = $('so-phong');
zoom.khiDoi((z) => {
  soPhong.textContent = `${Math.round(z * 100)}%`;
  chiPhong.classList.toggle('an', Math.abs(z - 1) < 0.001);
  // Lớp phủ vẽ theo khung của món trong iframe; phóng xong phải vẽ lại cho khớp.
  veLopPhu();
});
$('phong-lai').onclick = () => zoom.datLai();

const keo = ganKeo({
  lopBat, player, kho,
  layChon: () => chon,
  sauKhiKeo: () => bang.ve(),
  bao,
});

bang.khiChonKhac(datChon);

/* ---------- kho báo có thay đổi ---------- */
/* Soát chất lượng chạy lại sau mỗi lần sửa, nhưng HOÃN một nhịp: gõ từng chữ
   vào ô tiêu đề mà soát lại cả kịch bản theo từng phím thì phí, và con số trên
   thẻ nhấp nháy liên tục nhìn rất loạn. */
let henSoat = null;
function soatLai() {
  clearTimeout(henSoat);
  dsLop.veLaiAnh();
  henSoat = setTimeout(() => {
    const kq = bangXuat.veSoat();
    const n = kq?.soNang || 0;
    $('the-xuat').textContent = n ? `Xuất video · ${n}` : 'Xuất video';
    $('the-xuat').classList.toggle('co-loi', n > 0);
  }, 400);
}

kho.khiDoi((viec) => {
  if (viec === 'sua') apDung();
  soatLai();
  nutLui.disabled = !kho.nhanLui();
  nutToi.disabled = !kho.nhanToi();
  nutLui.title = kho.nhanLui() ? `Hoàn tác: ${kho.nhanLui()}` : 'Không có gì để hoàn tác';
  nutToi.title = kho.nhanToi() ? `Làm lại: ${kho.nhanToi()}` : 'Không có gì để làm lại';
  dauBan.classList.toggle('an', !kho.ban());

  /* Viên khổ hình trên thanh trên đọc từ danh sách clip lúc mở, nên sau khi đổi
     khổ nó nói sai. Lấy lại từ kịch bản đang sửa — đó mới là sự thật. */
  const m = kho.doc()?.meta;
  if (m?.width && m?.height && clipDangMo?.doi === 2) {
    dangClip.textContent = `${m.width}×${m.height}`;
    bocKhung.style.setProperty('--ti-le', `${m.width} / ${m.height}`);
  }
});

/* ---------- thêm · xoá · nhân bản ---------- */
const menuThem = $('menu-them');

$('mon-them').onclick = (ev) => {
  if (!kho.doc()) return;
  menuThem.innerHTML = '';
  // Đang chọn một cụm thì món mới rơi VÀO trong cụm — gần như luôn là ý người
  // dùng khi họ vừa bấm vào cụm rồi bấm dấu cộng.
  const t = chon?.monId ? timMon(kho.doc(), chon.canhId, chon.monId) : null;
  const trongCum = t?.el.kind === 'group' ? t.el.id : null;
  if (trongCum) {
    const h = document.createElement('div');
    h.className = 'num-goi';
    h.style.padding = '4px 12px';
    h.textContent = 'Thêm vào trong cụm đang chọn';
    menuThem.appendChild(h);
  }
  for (const m of MAU_MON) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.ten;
    b.onclick = () => {
      menuThem.classList.add('an');
      let idMoi = null;
      kho.sua(`thêm ${m.ten.toLowerCase()}`, (doc) => {
        idMoi = themMon(doc, chon.canhId, m.kind, trongCum);
      });
      if (idMoi) datChon({ canhId: chon.canhId, monId: idMoi });
      bao(`Đã thêm ${m.ten.toLowerCase()}.`);
    };
    menuThem.appendChild(b);
  }
  const r = ev.currentTarget.getBoundingClientRect();
  menuThem.style.left = `${r.left}px`;
  menuThem.style.top = `${r.bottom + 4}px`;
  menuThem.classList.remove('an');
};
document.addEventListener('click', (ev) => {
  // Phải dùng closest(): nút chứa một <svg>, bấm vào là `ev.target` thành cái
  // svg chứ không phải cái nút, so bằng dấu === sẽ đóng menu ngay khi vừa mở.
  if (!menuThem.contains(ev.target) && !ev.target.closest?.('#mon-them')) {
    menuThem.classList.add('an');
  }
});

$('mon-nhan').onclick = () => {
  if (!chon?.monId) return bao('Chọn một thành phần trước đã.');
  let idMoi = null;
  kho.sua('nhân bản thành phần', (doc) => { idMoi = nhanBanMon(doc, chon.canhId, chon.monId); });
  if (idMoi) datChon({ canhId: chon.canhId, monId: idMoi });
};

$('mon-xoa').onclick = () => {
  if (!chon?.monId) return bao('Chọn một thành phần trước đã.');
  const t = timMon(kho.doc(), chon.canhId, chon.monId);
  const ten = t ? tenMon(t.el) : 'thành phần';
  kho.sua(`xoá ${ten}`, (doc) => xoaMon(doc, chon.canhId, chon.monId));
  datChon({ canhId: chon.canhId });
  bao(`Đã xoá ${ten}. Ctrl+Z để lấy lại.`);
};

$('canh-them').onclick = () => {
  if (!kho.doc()) return;
  let idMoi = null;
  kho.sua('thêm cảnh', (doc) => { idMoi = themCanh(doc, chon?.canhId); });
  veLaiCanh();
  if (idMoi) datChon({ canhId: idMoi });
};

$('canh-nhan').onclick = () => {
  if (!chon?.canhId) return;
  let idMoi = null;
  kho.sua('nhân bản cảnh', (doc) => { idMoi = nhanBanCanh(doc, chon.canhId); });
  veLaiCanh();
  if (idMoi) datChon({ canhId: idMoi });
};

$('canh-xoa').onclick = () => {
  if (!chon?.canhId) return;
  if ((kho.doc()?.scenes || []).length <= 1) {
    return bao('Clip phải còn ít nhất một cảnh.', true);
  }
  kho.sua('xoá cảnh', (doc) => xoaCanh(doc, chon.canhId));
  veLaiCanh();
  datChon({ canhId: kho.doc().scenes[0]?.id });
  bao('Đã xoá cảnh. Ctrl+Z để lấy lại.');
};

/* Thêm/xoá cảnh làm đổi cả danh sách cảnh — phải chờ bộ dựng nạp xong kịch bản
   mới rồi mới đọc lại `dsCanh()`, nếu không vẫn thấy danh sách cũ. */
function veLaiCanh() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    veDanhSachCanh(player.dsCanh());
    danhDauCanh();
  }));
}

/* ---------- thẻ cột phải ---------- */
function doiThe(ten) {
  for (const [t, the, bang] of [['tt', 'the-tt', 'bang-thuoc-tinh'],
                                ['xuat', 'the-xuat', 'bang-xuat'],
                                ['khung', 'the-khung', 'bang-khung'],
                                ['video', 'the-video', 'bang-video']]) {
    $(the).setAttribute('aria-selected', String(t === ten));
    $(bang).classList.toggle('an', t !== ten);
  }
  // Chỉnh khung diễn ra trên ảnh mockup tĩnh, không dính gì tới khung xem clip —
  // nên đổi hẳn vùng giữa, không chồng hai thứ lên nhau.
  $('san-khung').classList.toggle('an', ten !== 'khung');
  $('san-video').classList.toggle('an', ten !== 'video');
  $('san-clip').classList.toggle('an', ten === 'khung' || ten === 'video');
}
$('the-tt').onclick = () => doiThe('tt');
$('the-xuat').onclick = () => doiThe('xuat');
$('the-khung').onclick = () => doiThe('khung');
$('the-video').onclick = () => { doiThe('video'); if (!bangVideo.coGi()) bangVideo.nap(); };

/* ---------- danh sách clip ---------- */
async function napDanhSach() {
  const d = await (await fetch('/api/clips')).json();
  if (!d.ok) throw new Error(d.loi || 'Không lấy được danh sách clip.');
  clips = d.clips;
  chonClip.innerHTML = '';
  const moi = document.createElement('optgroup'); moi.label = 'Sửa được';
  const cu = document.createElement('optgroup'); cu.label = 'Clip đời cũ — chỉ xem';
  for (const c of clips) {
    const o = document.createElement('option');
    o.value = c.slug;
    o.textContent = c.hong ? `${c.ten} ⚠ hỏng`
      : c.doi === 2 ? `${c.ten} · ${c.soCanh} cảnh · ${giay1(c.giay)}s` : c.ten;
    o.disabled = Boolean(c.hong);
    (c.doi === 2 ? moi : cu).appendChild(o);
  }
  if (moi.children.length) chonClip.appendChild(moi);
  if (cu.children.length) chonClip.appendChild(cu);
}

/* ---------- mở clip ---------- */
async function moClip(slug) {
  const c = clips.find((x) => x.slug === slug);
  if (!c) return;
  clipDangMo = c;
  trangThai('dang-mo');
  chon = null;
  bangDoiCu.classList.toggle('an', c.doi !== 1);
  bocKhung.style.setProperty('--ti-le', c.doi === 2 && c.rong ? `${c.rong} / ${c.cao}` : '16 / 9');
  dangClip.textContent = c.doi === 2 ? `${c.rong}×${c.cao}` : 'đời cũ';
  datDangPhat(c.ten || c.slug, c.doi === 2 ? `${c.soCanh} cảnh · ${giay1(c.giay)}s` : 'clip đời cũ');
  dsCanhEl.innerHTML = '';
  $('ds-lop').innerHTML = '';
  $('bang-thuoc-tinh').innerHTML = '';
  lopPhu.xoa();

  zoom.datLai();          // clip mới thì về 100%, đừng giữ mức phóng của clip cũ
  try {
    await player.mo(c.xem, c.doi);
  } catch (e) { bao(e.message, true); trangThai('hong'); return; }
  // Lăn chuột NGAY TRÊN khung hình chỉ tới được nếu nghe từ bên trong iframe —
  // sự kiện chuột không vượt qua ranh giới iframe. Gắn lại sau mỗi lần mở.
  zoom.noiVaoKhung();
  anhNho.napLai();      // mỗi clip một bảng màu và một bộ CSS riêng

  if (c.doi !== 2) {
    /*
     * CLIP ĐỜI CŨ = CHỈ XEM, nhưng XEM CHO RA XEM.
     *
     * Trước đây chỗ này ép mở thẻ "Khung nhấn", mà thẻ đó thay luôn sân khấu ở
     * giữa — nên chọn một clip đời cũ là rơi vào một ô đen ghi "clip này chưa
     * chỉnh khung được", còn chính cái clip thì không thấy đâu. Người dùng muốn
     * liếc qua một clip cũ thì phải đi mở file nguồn, nhanh hơn ở đây.
     *
     * Nay: đứng nguyên ở khung xem, và nếu trang phơi `__clip` (cả 12 clip đời
     * cũ đều phơi) thì MỞ HẲN nút Chạy với thanh tua. Thẻ Khung nhấn vẫn hiện
     * ra để bấm, chỉ không tự nhảy vào nữa.
     */
    lopBat.style.display = 'none';
    dsCanhEl.innerHTML = '<li class="khong-the">Clip đời cũ không tách được ra từng cảnh.</li>';
    const laiDuoc = player.san();
    $('bang-thuoc-tinh').innerHTML = laiDuoc
      ? '<div class="trong">Clip đời cũ — <b>chỉ xem</b>. Chạy và tua được, nhưng '
        + 'không sửa trực tiếp được: vị trí mọi thứ do code tính lúc chạy.</div>'
      : '<div class="trong">Clip đời cũ chưa sửa trực tiếp được, và trang này cũng '
        + 'không cho tua — nó tự chạy lấy.</div>';
    khoaDieuKhien(!laiDuoc);
    // `khoaDieuKhien` vừa ghi đè đồng hồ thành "0,0 / 0,0 giây". Clip đời cũ
    // đứng yên nên không có nhịp nào chạy tới để sửa lại — phải gọi thẳng.
    if (laiDuoc) capNhat();
    vuaKhoTho();
    // Khung nhấn thì SỬA ĐƯỢC: toạ độ của chúng là số viết thẳng trong mảng,
    // tính theo pixel ảnh mockup — không phải do code tính lúc chạy. Nên vẫn
    // bày thẻ ra, chỉ không cướp chỗ của khung xem nữa.
    await bangKhung.mo(slug).catch(() => ({ ok: false, thieu: [] }));
    $('the-khung').classList.remove('an');
    doiThe('tt');
    bao(laiDuoc
      ? `Đã mở "${c.ten}" — chỉ xem, nhưng chạy và tua được.`
      : `Đã mở "${c.ten}" — chỉ xem, trang này tự chạy lấy.`);
    trangThai('san-sang');
    return;
  }
  $('the-khung').classList.add('an');

  lopBat.style.display = '';
  khoaDieuKhien(false);
  thoiKhoTho();

  const kq = await (await fetch(`/api/clip/${slug}`)).json();
  if (!kq.ok) { bao(kq.loi, true); trangThai('hong'); return; }

  // Nháp mới hơn file thật thì HỎI, tuyệt đối không tự áp.
  let doc = kq.doc;
  if (kq.nhap) {
    const luc = new Date(kq.nhap.luc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (confirm(`Có bản đang sửa dở lúc ${luc} chưa lưu.\n\nOK = mở tiếp bản đó\nHuỷ = bỏ, dùng bản đã lưu`)) {
      doc = kq.nhap.doc;
    } else {
      fetch(`/api/draft/${slug}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  kho.nap(slug, doc);
  const ds = player.dsCanh();
  veDanhSachCanh(ds);
  player.tua(ds.length ? ds[0].giua : 0);
  datChon({ canhId: ds[0]?.id });
  bang.dat(null);
  capNhat();
  bangXuat.napKho();
  soatLai();
  doiThe('tt');
  bao(`Đã mở "${c.ten}". Bấm vào một thành phần trên khung hình để sửa.`);
  trangThai('san-sang');
}

/* NHÃN NÚT CHẠY/DỪNG.
 *
 * Nút là hình tam giác/hai vạch vẽ bằng SVG, nhưng chữ "Chạy"/"Dừng" vẫn phải
 * có thật trong cây DOM: trình đọc màn hình cần nó, và `kiem-chay-dung.mjs`
 * cũng đọc đúng chữ đó để biết nút có kẹt nhãn không. Ghi vào SPAN con chứ
 * không ghi vào chính cái nút — ghi vào nút là xoá mất cả hai hình SVG.
 */
function datNhanChay(dangChay) {
  nutChay.dataset.chay = dangChay ? '1' : '0';
  const nhan = nutChay.querySelector('.chay-nhan');
  if (nhan) nhan.textContent = dangChay ? 'Dừng' : 'Chạy';
  nutChay.setAttribute('aria-label', dangChay ? 'Dừng' : 'Chạy');
}

/* ---------- khổ gốc của clip đời cũ ---------- */
/*
 * Clip đời cũ chạy `export=1` nên trang KHÔNG tự co nữa: sân khấu ra đúng cỡ
 * gốc rồi tràn khỏi iframe. Trang cha lo phần thu: đặt iframe đúng cỡ gốc rồi
 * `scale` cả cái iframe cho vừa khung. Thu bằng `transform` nên chữ vẫn nét,
 * và không phải đụng một dòng nào bên trong iframe.
 */
function vuaKhoTho() {
  const kho = player.khoTho();
  if (!kho) { thoiKhoTho(); return; }
  bocKhung.style.setProperty('--ti-le', `${kho.w} / ${kho.h}`);
  const k = Math.min(bocKhung.clientWidth / kho.w, bocKhung.clientHeight / kho.h) || 1;
  khungEl.style.width = `${kho.w}px`;
  khungEl.style.height = `${kho.h}px`;
  khungEl.style.transformOrigin = 'top left';
  khungEl.style.transform = `scale(${k})`;
}

/* Trả iframe về nếp thường. Clip đời mới tự co lấy, đụng vào là hỏng phép đo. */
function thoiKhoTho() {
  khungEl.style.width = '';
  khungEl.style.height = '';
  khungEl.style.transform = '';
  khungEl.style.transformOrigin = '';
}

addEventListener('resize', () => { if (clipDangMo && clipDangMo.doi !== 2) vuaKhoTho(); });

/* ---------- kéo đổi bề rộng hai cột ---------- */
taoKeoCot($('app'), document.querySelector('.than'), () => {
  if (clipDangMo && clipDangMo.doi !== 2) vuaKhoTho();
});

/*
 * KHUNG XEM ĐỔI CỠ → VẼ LẠI LỚP PHỦ.
 *
 * Lớp phủ vẽ khung chọn nằm ở TRANG CHA và dùng thẳng toạ độ đọc được trong
 * iframe. Khung xem hẹp đi thì bộ dựng bên trong tự thu lại cho vừa, toạ độ ấy
 * đổi hết — không vẽ lại là khung xanh đứng nguyên chỗ cũ, lệch khỏi món.
 *
 * Vì sao phải là `ResizeObserver` chứ không gọi thẳng lúc kéo: bộ dựng trong
 * iframe chỉ thu lại khi CHÍNH NÓ nhận sự kiện đổi cỡ, và việc đó xảy ra SAU
 * nhịp hình của trang cha. Gọi ngay lúc kéo là đo phải cỡ cũ — đã mắc, lệch
 * 4,3×1,7px, đủ để nhìn thấy mà không đủ để ngờ. Chờ hai nhịp hình cho bên
 * trong lắng xuống rồi mới đo.
 */
new ResizeObserver(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (chon?.monId) veLopPhu();
  }));
}).observe(bocKhung);

function khoaDieuKhien(khoa) {
  nutChay.disabled = khoa; thanhTua.disabled = khoa;
  nutLuu.disabled = khoa; nutLui.disabled = khoa; nutToi.disabled = khoa;
  dongHo.textContent = khoa ? 'trang tự chạy' : '0,0 / 0,0 giây';
  if (khoa) datNhanChay(false);
}

/* Thanh phát dưới cùng: đang đứng ở cảnh nào. Lấy từ dữ liệu thật, không bịa. */
function datDangPhat(ten, phu) {
  const a = document.getElementById('ten-canh'), b = document.getElementById('phu-canh');
  if (a) a.textContent = ten || 'Chưa mở clip';
  if (b) b.textContent = phu || '';
}

function veDanhSachCanh(ds) {
  dsCanhEl.innerHTML = '';
  ds.forEach((c, i) => {
    const li = document.createElement('li');
    li.dataset.canh = c.id;
    li.innerHTML = `<span>Cảnh ${i + 1}</span><span class="giay-canh">${giay1(c.duration)}s</span>`;
    li.onclick = () => { player.tua(c.giua); datChon({ canhId: c.id }); };
    dsCanhEl.appendChild(li);
  });
}

function danhDauCanh() {
  const canh = chon?.canhId || player.canhHienTai()?.id;
  let so = 0;
  for (const li of dsCanhEl.children) {
    if (!li.dataset) continue;
    so++;
    const dang = li.dataset.canh === canh;
    li.setAttribute('aria-current', String(dang));
    if (dang && clipDangMo) {
      datDangPhat(`Cảnh ${so} · ${clipDangMo.ten || clipDangMo.slug}`,
        `${clipDangMo.soCanh} cảnh · ${giay1(clipDangMo.giay)}s`);
    }
  }
}

/* ---------- đồng bộ thanh tua ---------- */
function capNhat() {
  if (!player.san()) return;
  const t = player.giay(), dai = player.thoiLuong();
  if (!dangKeoThanh) thanhTua.value = String(dai ? Math.round((t / dai) * 1000) : 0);
  dongHo.textContent = `${giay1(t)} / ${giay1(dai)} giây`;
  datNhanChay(player.dangChay());
  veLopPhu();
}
player.khiDoi(capNhat);

/* ---------- lưu ---------- */
async function luu() {
  const kq = await kho.luu();
  if (kq.ok) {
    bao(kq.banCu ? 'Đã lưu. Bản cũ vẫn được cất lại phòng khi cần quay về.' : 'Đã lưu.');
  } else {
    bao(`Chưa lưu được — ${(kq.vanDe || [kq.loi]).join(' · ')}`, true);
  }
}

/* ---------- điều khiển ---------- */
/* ---------- lọc danh sách thành phần ---------- */
/* Một cảnh có tới 156 thành phần, cuộn tay là hết ngày. Lọc ngay khi gõ, hoãn
   một nhịp ngắn để gõ nhanh không phải dựng lại danh sách theo từng phím. */
{
  const oTim = $('tim-lop'), oDem = $('tim-dem');
  const baoDem = (n, chu) => { oDem.textContent = chu ? `${n}` : ''; };
  let hen = null;
  oTim.oninput = () => {
    clearTimeout(hen);
    hen = setTimeout(() => dsLop.loc(oTim.value, baoDem), 120);
  };
  oTim.onkeydown = (e) => { if (e.key === 'Escape') { oTim.value = ''; dsLop.loc('', baoDem); } };
}

nutChay.onclick = () => (player.dangChay() ? player.dung() : player.chay());
nutLuu.onclick = luu;
nutLui.onclick = () => { const n = kho.hoanTac(); if (n) { bang.ve(); bao(`Đã hoàn tác: ${n}`); } };
nutToi.onclick = () => { const n = kho.lamLai(); if (n) { bang.ve(); bao(`Đã làm lại: ${n}`); } };

thanhTua.oninput = () => { dangKeoThanh = true; player.tua((Number(thanhTua.value) / 1000) * player.thoiLuong()); };
thanhTua.onchange = () => { dangKeoThanh = false; };
chonClip.onchange = () => moClip(chonClip.value);

document.addEventListener('keydown', (e) => {
  const trongO = e.target.matches('input, select, textarea');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); return luu(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    return e.shiftKey ? nutToi.click() : nutLui.click();
  }
  /* Ctrl+0 về 100%, Ctrl +/- phóng từng nấc — giống mọi phần mềm khác, để không
     phải học lại. Dùng `e.code` cho phím trừ/cộng vì `e.key` đổi theo bố cục
     bàn phím, còn số 0 thì bắt cả hàng phím số lẫn bàn phím số. */
  if (e.ctrlKey || e.metaKey) {
    if (e.code === 'Digit0' || e.code === 'Numpad0') { e.preventDefault(); return zoom.datLai(); }
    if (e.code === 'Equal' || e.code === 'NumpadAdd') { e.preventDefault(); return zoom.motNac(true); }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') { e.preventDefault(); return zoom.motNac(false); }
  }
  if (trongO) return;
  if (e.code === 'Space') { e.preventDefault(); nutChay.click(); }
  if (e.key === 'ArrowLeft') player.tua(player.giay() - (e.shiftKey ? 1 : 0.1));
  if (e.key === 'ArrowRight') player.tua(player.giay() + (e.shiftKey ? 1 : 0.1));
  if (e.key === 'Escape') datChon({ canhId: chon?.canhId });
  if ((e.key === 'Delete' || e.key === 'Backspace') && chon?.monId) {
    e.preventDefault(); $('mon-xoa').click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && chon?.monId) {
    e.preventDefault(); $('mon-nhan').click();
  }
});

window.addEventListener('beforeunload', (e) => {
  if (kho.ban()) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- chạy ---------- */
try {
  await napDanhSach();
  const dau = clips.find((c) => c.doi === 2 && !c.hong);
  if (dau) { chonClip.value = dau.slug; await moClip(dau.slug); }
  else bao('Không thấy clip nào sửa được trong thư mục scenes/.', true);
} catch (e) { bao(e.message, true); }
