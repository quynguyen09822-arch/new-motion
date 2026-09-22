/**
 * MANG ẢNH VÀO BẰNG CTRL+V HOẶC KÉO TỪ NGOÀI THẢ VÀO KHUNG HÌNH.
 *
 * TRƯỚC KHI CÓ FILE NÀY, muốn dùng một tấm ảnh mới thì phải: mở terminal, chép
 * file vào máy chủ, đoán đúng đường dẫn tương đối, rồi gõ nó vào ô chữ ở bảng
 * bên phải. Nghĩa là với người dùng của công cụ này thì coi như không có đường.
 *
 * THẢ Ở ĐÂU THÌ ẢNH RA Ở ĐÓ. Thả rồi mà ảnh nhảy vào giữa khung thì người ta
 * phải kéo nó về chỗ vừa thả — đúng việc họ vừa làm xong.
 *
 * CỠ MẶC ĐỊNH LẤY TỪ KÍCH THƯỚC THẬT CỦA ẢNH, thu cho vừa 40% khung.
 *   Đặt một con số cứng thì ảnh chân dung 800×1600 và ảnh bìa 1600×400 ra cùng
 *   một ô vuông, cái nào cũng méo. Đọc `naturalWidth` rồi giữ đúng tỉ lệ thì
 *   thả vào là đã đúng hình, chỉ còn việc kéo cho vừa ý.
 *
 * KHÔNG CƯỚP CTRL+V CỦA NGƯỜI KHÁC.
 *   `thaanh.js` (bảng AI) cũng nghe `paste`, và nó `preventDefault()` khi bảng
 *   ấy đang mở. Đang gõ trong một ô chữ thì Ctrl+V là dán CHỮ, không phải dán
 *   ảnh. Hai cửa đó chặn trước, ở đây chỉ nhận phần còn lại.
 */
import { themMon } from './them.js';
import { timMon } from './store.js';

/** Ảnh thả vào chiếm nhiều nhất bằng này phần khung — còn chỗ để nhìn thấy nó
    nằm trên cái gì, và còn chỗ để kéo. */
const PHAN_KHUNG = 0.4;

/** Đang gõ chữ ở đâu đó thì Ctrl+V là việc của ô chữ ấy. */
function dangGoChu() {
  const a = document.activeElement;
  if (!a) return false;
  return a.isContentEditable
    || ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName);
}

/** Đọc một File thành base64 trần (không có tiền tố `data:`). */
function docB64(file) {
  return new Promise((xong, hong) => {
    const r = new FileReader();
    r.onerror = () => hong(new Error('Không đọc được file ảnh.'));
    r.onload = () => xong(String(r.result).replace(/^data:[^,]*,/, ''));
    r.readAsDataURL(file);
  });
}

/** Cỡ hiển thị cho một tấm ảnh: giữ tỉ lệ, thu cho vừa `PHAN_KHUNG` của khung. */
export function coVua(rongThat, caoThat, meta) {
  const W = meta?.width || 1280;
  const H = meta?.height || 720;
  /* Ảnh chưa đo được (file hỏng, hoặc trình duyệt chưa giải mã xong) thì lấy
     một ô vuông vừa phải — thà một ô vuông còn hơn chia cho 0. */
  if (!rongThat || !caoThat) {
    const c = Math.round(Math.min(W, H) * PHAN_KHUNG);
    return { w: c, h: c };
  }
  const hs = Math.min(W * PHAN_KHUNG / rongThat, H * PHAN_KHUNG / caoThat);
  return { w: Math.max(8, Math.round(rongThat * hs)), h: Math.max(8, Math.round(caoThat * hs)) };
}

export function ganNhapAnh({ bocKhung, player, kho, veLai, datChon, bao }) {
  /** Gửi ảnh lên máy chủ, trả về `{ src }` hoặc ném lỗi có câu tiếng Việt. */
  async function taiLen(file) {
    if (!file.type.startsWith('image/')) {
      throw new Error(`"${file.name || 'file này'}" không phải ảnh.`);
    }
    const r = await fetch('/api/anh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b64: await docB64(file) }),
    });
    const kq = await r.json().catch(() => ({}));
    if (!kq.ok) throw new Error(kq.loi || 'Máy chủ không nhận được ảnh.');
    return kq;
  }

  /** Đo bề rộng/cao thật của một ảnh đã nằm trên máy chủ. */
  function doAnh(src) {
    return new Promise((xong) => {
      const i = new Image();
      i.onload = () => xong({ w: i.naturalWidth, h: i.naturalHeight });
      i.onerror = () => xong({ w: 0, h: 0 });
      i.src = src;
    });
  }

  /**
   * Thả ảnh vào cảnh đang xem.
   * @param diem toạ độ chuột trên trang cha, hoặc null để đặt vào giữa khung
   */
  async function datVaoCanh(kq, diem) {
    const doc = kho.doc();
    const canhId = player.canhHienTai()?.id;
    if (!doc || !canhId) return bao('Chưa mở cảnh nào để thả ảnh vào.', true);

    const that = await doAnh(kq.src);
    const co = coVua(that.w, that.h, doc.meta);

    /* TOẠ ĐỘ SÂN KHẤU, và phải qua đúng hai bước, không được bỏ bước nào.
     *
     *   ① `quyDoi()` đưa điểm chuột từ hệ của TRANG CHA sang hệ của IFRAME.
     *      Bỏ bước này là trừ hai con số khác gốc nhau: đo thật thì iframe nằm ở
     *      x=502 trên trang cha, còn `#cam` báo `left = -3` vì nó tính từ mép
     *      iframe. Ảnh văng ra 135% bề ngang, tức hẳn ra ngoài khung.
     *
     *   ② Chia cho hệ số THẬT của sân khấu, lấy từ chính `#cam`:
     *      `cam.width / meta.width`. Không dùng `hesoPhong()` ở đây vì nó đã
     *      nhân thêm phóng của trang cha, mà `quyDoi()` thì vừa chia phóng ấy
     *      ra rồi — nhân hai lần là lệch theo mức phóng. Lấy từ `cam` còn tính
     *      luôn cả cú đẩy máy quay đang diễn ra tại giây này.
     */
    let x = Math.round((doc.meta.width - co.w) / 2);
    let y = Math.round((doc.meta.height - co.h) / 2);
    if (diem) {
      const cam = player.tai()?.querySelector('#cam')?.getBoundingClientRect();
      const q = player.quyDoi(diem.x, diem.y);
      const hs = cam?.width && doc.meta.width ? cam.width / doc.meta.width : 0;
      if (cam && hs > 0) {
        x = Math.round((q.x - cam.left) / hs - co.w / 2);
        y = Math.round((q.y - cam.top) / hs - co.h / 2);
      }
    }

    let monId = null;
    kho.sua('thả ảnh vào cảnh', (d) => {
      monId = themMon(d, canhId, 'image');
      const t = monId && timMon(d, canhId, monId);
      if (!t) return;
      /* `themMon` đặt `place: 'giua'` cho món ngoài cùng. Ở đây ta biết chính
         xác chỗ người ta vừa thả, nên bỏ vùng đặt sẵn đi — giữ lại thì ảnh nhảy
         vào giữa khung ngay trước mắt họ. */
      delete t.el.place;
      Object.assign(t.el, { src: kq.src, x, y, w: co.w, h: co.h, fit: 'contain' });
    });

    if (monId) {
      datChon?.({ canhId, monId });
      bao(kq.moi
        ? `Đã thêm ảnh ${that.w}×${that.h} vào cảnh.`
        : 'Ảnh này đã có sẵn trong kho — dùng lại đúng file cũ, không tốn thêm chỗ.');
    }
    veLai?.();
  }

  /** Một hoặc nhiều file: nhận file ẢNH đầu tiên, nói ra nếu bỏ qua cái nào. */
  async function nhan(files, diem) {
    const ds = [...(files || [])];
    const anh = ds.find((f) => f.type.startsWith('image/'));
    if (!anh) {
      return ds.length ? bao('Chỉ thả được ảnh vào đây (PNG, JPG, WebP, GIF).', true) : undefined;
    }
    try {
      bao('Đang mang ảnh vào…');
      await datVaoCanh(await taiLen(anh), diem);
    } catch (e) {
      bao(e.message, true);
    }
  }

  /* ---------- kéo từ ngoài thả vào ---------- */
  /* Nghe trên `bocKhung` chứ không trên `lopBat`: lớp bắt bị ẩn đi ở clip đời
     cũ, mà khung thì vẫn đó. Nghe cả hai là cùng một cú thả vào hai lần. */
  let dem = 0;   // đếm vào/ra: thẻ con cũng bắn `dragleave`, không đếm thì viền nhấp nháy
  const laFile = (ev) => [...(ev.dataTransfer?.types || [])].includes('Files');

  bocKhung.addEventListener('dragenter', (ev) => {
    if (!laFile(ev)) return;
    ev.preventDefault();
    dem += 1;
    bocKhung.classList.add('dang-tha-anh');
  });
  bocKhung.addEventListener('dragover', (ev) => {
    if (!laFile(ev)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
  });
  bocKhung.addEventListener('dragleave', () => {
    dem = Math.max(0, dem - 1);
    if (!dem) bocKhung.classList.remove('dang-tha-anh');
  });
  bocKhung.addEventListener('drop', (ev) => {
    if (!laFile(ev)) return;
    ev.preventDefault();
    dem = 0;
    bocKhung.classList.remove('dang-tha-anh');
    nhan(ev.dataTransfer.files, { x: ev.clientX, y: ev.clientY });
  });

  /* Thả ra NGOÀI khung thì trình duyệt mặc định MỞ file ấy thay cả trang, và
     người dùng mất hết những gì chưa lưu. Chặn ở mức tài liệu. */
  for (const ten of ['dragover', 'drop']) {
    document.addEventListener(ten, (ev) => {
      if (laFile(ev) && !bocKhung.contains(ev.target)) ev.preventDefault();
    });
  }

  /* ---------- dán ---------- */
  document.addEventListener('paste', (ev) => {
    if (ev.defaultPrevented) return;   // bảng AI đã nhận rồi
    if (dangGoChu()) return;           // đang gõ thì Ctrl+V là dán chữ
    const anh = [...(ev.clipboardData?.items || [])]
      .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (!anh.length) return;
    ev.preventDefault();
    nhan(anh, null);
  });

  return { nhan };
}
