/**
 * TRANG CHÀO — giới thiệu công cụ, và kho dự án của người đang đăng nhập.
 *
 * Trang này KHÔNG biết gì về kịch bản. Nó chỉ hỏi máy chủ hai câu — "kho của
 * tôi ra sao" và "trong kho có gì" — rồi bày ra. Mọi việc đụng tới nội dung
 * clip đều nằm ở trình sửa. Giữ ranh giới đó thì trang chào không bao giờ là
 * chỗ thứ hai có thể làm hỏng một kịch bản.
 *
 * MỌI ĐƯỜNG ĐI ĐỀU LÀ ĐƯỜNG DẪN THẬT. Thẻ dự án là `<a href="/sua?clip=…">`
 * chứ không phải `<div onclick>`: mở tab mới được, rê chuột thấy đường dẫn,
 * gửi link cho đồng nghiệp được. Ba thứ đó mất sạch nếu dựng bằng ô bấm giả.
 */
import { ganTen } from '/tenfile.js';
import { goiJSON } from '/goi.js';

const $ = (id) => document.getElementById(id);

const luoi = $('luoi');
const luoiCu = $('luoi-cu');
const oTao = $('o-tao');
const oTen = $('ten');
const oMau = $('mau');
const loiTao = $('loi-tao');

let duAn = [];          // dự án đời mới trong kho của tôi
let khoHinh = [];       // khổ dựng sẵn, máy chủ khai

/* ---------- lời nhắc ---------- */
let hen;
function bao(cau, xau = false) {
  const b = $('bao');
  b.textContent = cau;
  b.classList.toggle('xau', xau);
  b.classList.remove('an');
  clearTimeout(hen);
  hen = setTimeout(() => b.classList.add('an'), xau ? 6000 : 3200);
}

/* ---------- chữ ---------- */
const giay1 = (g) => String(Math.round((g ?? 0) * 10) / 10).replace('.', ',');

/**
 * "3 phút trước", "hôm qua", "12/09".
 *
 * Mốc tuyệt đối từ 7 ngày trở đi: "11 ngày trước" bắt người đọc tự trừ ra ngày
 * nào, mà đó đúng là thứ họ muốn biết khi tìm lại một dự án cũ.
 */
function luc(ms) {
  if (!ms) return '';
  const p = Math.round((Date.now() - ms) / 60000);
  if (p < 1) return 'vừa xong';
  if (p < 60) return `${p} phút trước`;
  const g = Math.round(p / 60);
  if (g < 24) return `${g} giờ trước`;
  const n = Math.round(g / 24);
  if (n === 1) return 'hôm qua';
  if (n < 7) return `${n} ngày trước`;
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ---------- thanh trên: ai đang đăng nhập ---------- */
async function veTaiKhoan() {
  let d;
  try { d = await (await fetch('/api/toi-la-ai')).json(); } catch { return; }
  const boc = $('o-tai-khoan');

  if (!d.coMatKhau) {
    /* Chưa đặt mật khẩu thì KHÔNG có kho riêng — mọi người dùng chung kho gốc.
       Nói thẳng ở đây, vì trang này vừa hứa "kho riêng của bạn". */
    const c = document.createElement('span');
    c.className = 'chip-canh-bao';
    c.textContent = 'Chưa đặt mật khẩu';
    c.title = 'Ai có đường dẫn cũng vào sửa được, và chưa chia kho theo tài khoản. '
      + 'Chạy `npm run dat-mat-khau` trên máy chủ để đặt.';
    boc.appendChild(c);
    return;
  }

  /* Mục "Người dùng" chỉ hiện với người quản trị. Giấu bằng lớp `an` chứ không
     dựng có điều kiện: đường API vẫn tự kiểm quyền, giấu ở đây chỉ là cho gọn
     mắt người không cần tới nó. */
  if (d.laQuanTri) {
    $('nguoi').classList.remove('an');
    napNguoi().catch((e) => bao(e.message, true));
  }

  if (d.email) {
    const e = document.createElement('span');
    e.className = 'chip-ai';
    e.textContent = d.email.split('@')[0];
    e.title = `Đang đăng nhập: ${d.email}`;
    boc.appendChild(e);
  }

  const n = document.createElement('button');
  n.className = 'nut';
  n.type = 'button';
  n.textContent = 'Thoát';
  n.title = d.email ? `Đăng xuất ${d.email}` : 'Đăng xuất';
  n.onclick = async () => {
    await fetch('/api/dang-xuat', { method: 'POST' });
    location.href = '/dang-nhap';
  };
  boc.appendChild(n);
}

/* ---------- kho dự án ---------- */

/**
 * Màu lấy từ `meta` của chính clip, mà `meta` thì do người dùng gõ vào.
 *
 * `style.setProperty` đã tự bỏ giá trị sai khuôn, nhưng vẫn lọc ở đây: chỉ nhận
 * mã màu dạng `#abc`/`#aabbcc` và tên màu chữ cái trần. Lọc bằng DANH SÁCH
 * TRẮNG chứ không đi tìm chuỗi nguy hiểm — danh sách đen thì bao giờ cũng thiếu
 * một dạng mà người viết chưa nghĩ ra.
 */
const locMau = (m) =>
  (typeof m === 'string' && /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(m.trim()) ? m.trim() : null);

/** Ảnh đại diện: hai màu của chính clip, cộng một khung đúng hướng ngang/dọc. */
function veAnh(c) {
  const anh = document.createElement('div');
  anh.className = 'the-anh';
  const nen = locMau(c.nen);
  const nhan = locMau(c.nhan);
  if (nen) anh.style.setProperty('--nen-clip', nen);
  if (nhan) anh.style.setProperty('--nhan-clip', nhan);

  const hinh = document.createElement('div');
  hinh.className = 'the-hinh';
  /* Tỉ lệ THẬT của clip, không phải 16:9 cho tất cả. Clip dọc mà bày khung ngang
     thì lưới nói dối đúng cái điều người ta nhìn vào để quyết định. */
  if (c.rong > 0 && c.cao > 0) hinh.style.setProperty('--ti-le', `${c.rong} / ${c.cao}`);
  for (const t of ['i', 'i', 'u']) hinh.appendChild(document.createElement(t));
  anh.appendChild(hinh);
  return anh;
}

function veThe(c) {
  const a = document.createElement('a');
  a.className = 'the' + (c.hong ? ' hong' : '');
  a.href = `/sua?clip=${encodeURIComponent(c.slug)}`;
  a.appendChild(veAnh(c));

  const chu = document.createElement('div');
  chu.className = 'the-chu';
  a.appendChild(chu);

  const ten = document.createElement('div');
  ten.className = 'the-ten';
  ten.textContent = c.ten || c.slug;
  chu.appendChild(ten);

  const so = document.createElement('div');
  so.className = 'the-so';
  so.textContent = c.hong ? c.hong
    : c.doi === 2 ? `${c.soCanh} cảnh · ${giay1(c.giay)} giây`
      : 'clip đời cũ — chỉ xem';
  chu.appendChild(so);

  const chan = document.createElement('div');
  chan.className = 'the-chan';
  if (c.doi === 2 && c.rong) {
    const k = document.createElement('span');
    k.className = 'hieu-kho';
    k.textContent = c.dung ? `Dọc ${c.rong}×${c.cao}` : `Ngang ${c.rong}×${c.cao}`;
    chan.appendChild(k);
  }
  const t = document.createElement('span');
  t.className = 'the-luc';
  t.textContent = luc(c.suaLuc);
  chan.appendChild(t);
  chu.appendChild(chan);


  /* NÚT XOÁ — chỉ cho dự án đời 2 trong kho của mình. Clip đời cũ là file dùng
     chung ở gốc dự án clip, không thuộc kho ai cả; bày nút xoá lên đó là mời
     người ta xoá đồ của người khác. */
  if (c.doi === 2) a.appendChild(veNutXoa(c));
  return a;
}

/**
 * Nút xoá trên một thẻ dự án.
 *
 * Cả tấm thẻ là một thẻ `<a>`, nên nút bên trong PHẢI chặn cả `click` lẫn hành
 * vi mặc định — không chặn thì bấm xoá xong trình duyệt vẫn nhảy sang trình sửa
 * của chính dự án vừa xoá, và người dùng nhận một màn hình lỗi.
 */
function veNutXoa(c) {
  const n = document.createElement('button');
  n.className = 'nut-xoa';
  n.type = 'button';
  n.title = `Xoá dự án "${c.ten || c.slug}"`;
  n.setAttribute('aria-label', n.title);
  n.textContent = '\u2715';
  n.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ten = c.ten || c.slug;
    /* HỎI TRƯỚC. Xoá không lùi được bằng một phím, nên đừng làm ngay chỉ vì
       người ta bấm trúng. Câu hỏi nói rõ CÓ bản lùi, để người thật sự muốn xoá
       thì dám bấm. */
    if (!confirm(`Xoá dự án "${ten}"?\n\nBản cũ vẫn được cất trong kho sao lưu, `
      + 'nhưng ở màn hình này thì nó biến mất.')) return;
    n.disabled = true;
    try {
      const r = await fetch(`/api/du-an/${encodeURIComponent(c.slug)}`, { method: 'DELETE' });
      const kq = await r.json();
      if (!kq.ok) { bao(kq.loi || 'Không xoá được.', true); n.disabled = false; return; }
      bao(`Đã xoá "${ten}". Bản cũ còn trong kho sao lưu.`);
      await napKho();
    } catch (err) {
      bao(err.message || 'Không xoá được.', true);
      n.disabled = false;
    }
  };
  return n;
}

async function napKho() {
  const [k, ds] = await Promise.all([
    (await fetch('/api/kho')).json(),
    (await fetch('/api/clips')).json(),
  ]);
  if (!ds.ok) throw new Error(ds.loi || 'Không mở được kho dự án.');

  khoHinh = k.khoHinh || [];
  duAn = ds.clips.filter((c) => c.doi === 2);
  const doiCu = ds.clips.filter((c) => c.doi === 1);

  $('dang-nap').classList.add('an');
  $('dem-kho').textContent = duAn.length || '';
  /* Cảnh báo mất dữ liệu đặt ngay trên lưới dự án, không nhét xuống chân trang:
     nó nói về chính mấy cái thẻ người dùng đang nhìn. */
  if (k.canhBaoOLuu) veCanhBao(k.canhBaoOLuu);

  $('ai-kho').textContent = k.laGoc
    ? 'kho gốc — chứa toàn bộ clip sẵn có của dự án'
    : `kho riêng của ${k.email || 'bạn'} — không ai khác nhìn thấy`;

  luoi.innerHTML = '';
  for (const c of duAn) luoi.appendChild(veThe(c));
  $('kho-trong').classList.toggle('an', duAn.length > 0);

  luoiCu.innerHTML = '';
  for (const c of doiCu) luoiCu.appendChild(veThe(c));
  $('boc-doi-cu').classList.toggle('an', doiCu.length === 0);
}

/** Dải cảnh báo đỏ: kho riêng chưa nằm trên ổ lưu bền. */
function veCanhBao(lyDo) {
  const o = document.createElement('div');
  o.className = 'canh-bao';
  o.setAttribute('role', 'alert');
  const b = document.createElement('b');
  b.textContent = 'Dự án trong kho này CHƯA được lưu bền.';
  const p = document.createElement('p');
  /* Nói thẳng hậu quả, không nói tên lỗi. "Chưa gắn volume" là câu của người
     dựng máy chủ; "mất hết khi dựng lại" mới là câu của người đang làm việc. */
  p.textContent = `${lyDo}. Dựng lại ứng dụng một lần là mất hết dự án ở đây, `
    + 'và không có bản sao nào khác. Báo người dựng máy chủ gắn ổ lưu vào /app/kho.';
  o.append(b, p);
  $('kho').insertBefore(o, $('luoi'));
}

/* ---------- ô tạo dự án ---------- */
function dungPhieu() {
  const h = $('kho-hinh');
  h.innerHTML = '';
  khoHinh.forEach((k, i) => {
    const l = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio'; r.name = 'kho'; r.value = k.v; r.checked = i === 0;
    /* Tên đọc lên phải là câu người đọc được, không phải `doc`/`ngang`. Chữ đã
       nằm trong `<label>` bọc ngoài, nhưng trình đọc màn hình thì tuỳ nơi lấy
       `value` làm tên — khai thẳng cho khỏi phải tin vào chuyện đó. */
    r.setAttribute('aria-label', k.nhan);
    l.appendChild(r);
    l.appendChild(document.createTextNode(k.nhan));
    h.appendChild(l);
  });

  oMau.innerHTML = '';
  const trang = document.createElement('option');
  trang.value = ''; trang.textContent = 'Trang trắng — một thẻ chữ ở giữa khung';
  oMau.appendChild(trang);
  for (const c of duAn) {
    if (c.hong) continue;   // không cho chép từ một dự án đang hỏng
    const o = document.createElement('option');
    o.value = c.slug;
    o.textContent = `Chép từ "${c.ten || c.slug}"`;
    oMau.appendChild(o);
  }
}

/* Chép từ dự án có sẵn thì khổ hình đi theo bản gốc — bày núm chọn khổ lúc đó
   là bày một núm chết, bấm vào thì không có gì đổi. */
function dongBoNum() {
  const chepMau = Boolean(oMau.value);
  $('kho-hinh').closest('.khokhung').classList.toggle('an', chepMau);
  $('xem-slug').textContent = ganTen(oTen.value) || '(sẽ tự đặt)';
}

function loi(cau, goiY = '') {
  loiTao.textContent = cau;
  loiTao.classList.remove('an');
  if (goiY) {
    /* Không tự đổi tên hộ. Hiện đúng tên còn trống và để người dùng bấm: họ có
       thể muốn một tên khác hẳn, và im lặng đổi tên là cách nhanh nhất làm
       người ta mất dấu dự án của chính mình. */
    const n = document.createElement('button');
    n.className = 'nut'; n.type = 'button';
    n.textContent = `Dùng "${goiY}"`;
    n.onclick = () => { taoThat(goiY); };
    loiTao.appendChild(n);
  }
}

async function taoThat(slugEp = '') {
  const ten = oTen.value.trim();
  if (!ten) { oTen.focus(); return loi('Chưa đặt tên cho dự án.'); }

  loiTao.classList.add('an');
  loiTao.textContent = '';
  $('lam').disabled = true;
  try {
    const than = {
      ten,
      slug: slugEp || ganTen(ten),
      kho: $('kho-hinh').querySelector('input:checked')?.value,
      mau: oMau.value || undefined,
    };
    const r = await fetch('/api/du-an', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(than),
    });
    const d = await r.json();
    if (!d.ok) return loi(d.loi || 'Không tạo được dự án.', d.goiY || '');
    /* Tạo xong đi thẳng vào trình sửa. Quay về danh sách rồi bắt bấm thêm một
       lần nữa là thêm một bước cho việc mà người ta vừa nói rõ là muốn làm. */
    location.href = `/sua?clip=${encodeURIComponent(d.slug)}`;
  } catch (e) {
    loi(`Không gọi được máy chủ — ${String(e.message || e).slice(0, 70)}`);
  } finally {
    $('lam').disabled = false;
  }
}

function moPhieu() {
  dungPhieu();
  oTen.value = '';
  loiTao.classList.add('an');
  loiTao.textContent = '';
  dongBoNum();
  oTao.showModal();
  oTen.focus();
}

/* ---------- nối dây ---------- */
/* Bốn chỗ mở cùng một ô: nút trên thanh, nút trong phần mở đầu, nút cạnh tiêu
   đề kho, và nút trong ô trống. Nối bằng vòng lặp chứ không viết bốn dòng —
   thêm chỗ thứ năm mà quên một dòng thì có một nút chết, im lặng. */
for (const id of ['nut-tao-tren', 'nut-tao', 'nut-tao-2', 'tao-dau']) {
  const n = $(id);
  if (n) n.onclick = moPhieu;
}
$('thoi').onclick = () => oTao.close();
oTen.oninput = dongBoNum;
oMau.onchange = dongBoNum;
$('phieu').onsubmit = (ev) => { ev.preventDefault(); taoThat(); };

/* ---------- NGƯỜI DÙNG (chỉ người quản trị) ----------
 *
 * Trước đây muốn cho một khách hàng vào dùng thì phải sửa biến môi trường trên
 * Vibe Host rồi triển khai lại — nghĩa là chỉ người viết code làm được, nên
 * thực tế không ai được thêm. Nay chủ kho tự làm ở đây.
 *
 * MẬT KHẨU HIỆN ĐÚNG MỘT LẦN. Máy chủ chỉ cất bản băm; không có đường nào đọc
 * lại. Nói rõ điều đó ngay trên ô, chứ không để người ta đóng ô rồi mới biết.
 */
const oNguoi = $('o-nguoi');
const oMatKhau = $('o-mat-khau');

function khoeMatKhau(email, mk) {
  $('mk-khoe').textContent = `Trang: ${location.origin}\nEmail: ${email}\nMật khẩu: ${mk}`;
  oMatKhau.showModal();
}
$('mk-chep').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('mk-khoe').textContent);
    bao('Đã chép. Dán cho họ là xong.');
  } catch { bao('Trình duyệt không cho chép tự động — bôi đen rồi Ctrl+C.', true); }
};

/* Cửa chung `web/goi.js`: nó dịch cả trang lỗi của cổng proxy sang tiếng người,
   thay vì để "Unexpected token '<'" văng ra màn hình. */
const goi = (duong, cach, than) => goiJSON(duong, { cach, than });

function veNguoi(ds, toi) {
  const boc = $('bang-nguoi');
  boc.innerHTML = '';
  for (const n of ds) {
    const hang = document.createElement('div');
    hang.className = 'hang-nguoi' + (n.dangHoatDong && !n.choDuyet ? '' : ' khoa')
      + (n.choDuyet ? ' cho-duyet' : '');

    const trai = document.createElement('div');
    trai.className = 'nguoi-ten';
    const b = document.createElement('b');
    b.textContent = n.email;
    trai.appendChild(b);
    const phu = document.createElement('span');
    phu.className = 'phu';
    phu.textContent = [n.ten, n.coGoogle ? 'vào bằng Google' : null,
      n.vai === 'quan_tri' ? 'quản trị' : null,
      n.dangHoatDong ? null : 'đang khoá',
      n.vaoLanCuoi ? `vào lần cuối ${luc(Date.parse(n.vaoLanCuoi))}` : 'chưa vào lần nào',
    ].filter(Boolean).join(' · ');
    trai.appendChild(phu);
    /* Ai còn dùng mật khẩu chung cũ thì nói ra — đó là những tài khoản chép sang
       từ danh sách cũ, và mật khẩu ấy thì nhiều người biết. */
    if (n.matKhauChung) {
      const c = document.createElement('span');
      c.className = 'chip-canh-bao';
      c.textContent = 'còn dùng mật khẩu chung';
      c.title = 'Tài khoản này vẫn dùng đúng mật khẩu chung cũ mà nhiều người biết. Bấm "Đặt lại mật khẩu" để cho riêng.';
      trai.appendChild(c);
    }
    hang.appendChild(trai);

    const nut = document.createElement('div');
    nut.className = 'nguoi-nut';
    const them = (chu, lam, lop = 'nut nho') => {
      const x = document.createElement('button');
      x.type = 'button'; x.className = lop; x.textContent = chu;
      x.onclick = async () => {
        x.disabled = true;
        try { await lam(); await napNguoi(); }
        catch (e) { bao(e.message, true); x.disabled = false; }
      };
      nut.appendChild(x);
    };
    /* CHỜ DUYỆT lên trước mọi nút khác: đây là việc người quản trị phải quyết,
       và để lẫn giữa mấy nút kia thì họ không thấy có ai đang chờ. */
    if (n.choDuyet) {
      const c = document.createElement('span');
      c.className = 'chip-canh-bao';
      c.textContent = 'đang chờ duyệt';
      trai.appendChild(c);
      them('Duyệt cho vào', () => goi(`/api/nguoi-dung/${encodeURIComponent(n.email)}`, 'PATCH', { duyet: true }),
        'nut nho chinh');
      them('Từ chối', async () => {
        if (!confirm(`Từ chối ${n.email}?`)) throw new Error('Đã thôi.');
        await goi(`/api/nguoi-dung/${encodeURIComponent(n.email)}`, 'DELETE');
      }, 'nut nho xau');
      hang.appendChild(nut);
      boc.appendChild(hang);
      continue;
    }
    them('Đặt lại mật khẩu', async () => {
      /* Hỏi trước: bỏ trống thì máy sinh hộ, gõ vào thì dùng đúng cái đó. Không
         hỏi thì người quản trị không đặt được mật khẩu họ đã hứa với khách. */
      const go = prompt(`Mật khẩu mới cho ${n.email}\n\nBỏ trống = máy tự đặt hộ một mật khẩu khó đoán.`, '');
      if (go === null) throw new Error('Đã thôi.');
      const d = await goi(`/api/nguoi-dung/${encodeURIComponent(n.email)}`, 'PATCH', { matKhau: go.trim() });
      khoeMatKhau(d.email, d.matKhau);
    });
    them(n.dangHoatDong ? 'Khoá' : 'Mở khoá', () => goi(
      `/api/nguoi-dung/${encodeURIComponent(n.email)}`, 'PATCH', { dangHoatDong: !n.dangHoatDong }));
    if (n.email !== toi) {
      them('Xoá', async () => {
        if (!confirm(`Xoá ${n.email} khỏi danh sách?\n\nKho dự án của họ KHÔNG bị xoá — thêm lại đúng email này là thấy lại.`)) {
          throw new Error('Đã thôi.');
        }
        await goi(`/api/nguoi-dung/${encodeURIComponent(n.email)}`, 'DELETE');
      }, 'nut nho xau');
    }
    hang.appendChild(nut);
    boc.appendChild(hang);
  }
}

async function napNguoi() {
  const d = await goi('/api/nguoi-dung', 'GET');
  veNguoi(d.nguoi, d.toi);
}

$('nut-them-nguoi').onclick = () => {
  $('nguoi-email').value = ''; $('nguoi-ten').value = ''; $('nguoi-mk').value = '';
  $('nguoi-loi').classList.add('an');
  oNguoi.showModal();
  $('nguoi-email').focus();
};
$('phieu-nguoi').onsubmit = async (ev) => {
  /* Nút "Thôi" cũng là submit (để `<dialog>` tự đóng) — phân biệt bằng value,
     không thì bấm Thôi lại đi tạo tài khoản. */
  if (ev.submitter?.value !== 'tao') return;
  ev.preventDefault();
  const nut = $('nguoi-xong');
  nut.disabled = true;
  try {
    const d = await goi('/api/nguoi-dung', 'POST', {
      email: $('nguoi-email').value.trim(), ten: $('nguoi-ten').value.trim(),
      /* Bỏ trống thì để máy chủ tự sinh — nó sinh chuỗi khó đoán mà vẫn đọc
         được qua điện thoại. Người tự gõ thì gõ mật khẩu họ nhớ được. */
      matKhau: $('nguoi-mk').value, vai: $('nguoi-vai').value });
    oNguoi.close();
    await napNguoi();
    khoeMatKhau(d.email, d.matKhau);
  } catch (e) {
    const l = $('nguoi-loi');
    l.textContent = e.message; l.classList.remove('an');
  } finally { nut.disabled = false; }
};

/* ---------- chạy ---------- */
veTaiKhoan();
try {
  await napKho();
} catch (e) {
  $('dang-nap').textContent = e.message;
  bao(e.message, true);
}
