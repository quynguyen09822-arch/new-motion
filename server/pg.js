/**
 * NÓI CHUYỆN VỚI POSTGRES — viết tay, không gói phụ thuộc.
 *
 * VÌ SAO VIẾT TAY. Repo này cố ý không có `node_modules` (CLAUDE.md §2), mà Node
 * lại không có sẵn trình nói chuyện với Postgres. Thêm `pg` là phá đúng cái luật
 * giữ cho công cụ này không bao giờ hỏng kiểu "cài gói thất bại". Giao thức dây
 * của Postgres thì đủ gọn để viết lấy phần mình cần.
 *
 * CHỈ LÀM ĐÚNG PHẦN CẦN, không làm một thư viện:
 *   · bắt tay + đăng nhập SCRAM-SHA-256 (và md5 cho máy chủ cũ)
 *   · truy vấn CÓ THAM SỐ (Parse/Bind/Execute) — không nối chuỗi SQL
 *   · đọc kết quả dạng chữ, trả về mảng đối tượng
 *   · một kết nối một lúc, đóng xong là thôi
 *
 * KHÔNG NỐI CHUỖI VÀO SQL. Mọi giá trị đi qua tham số `$1`, `$2`… Nối chuỗi là
 * mở cửa cho người dùng đặt tên dự án thành một câu lệnh xoá bảng.
 *
 * CẨN THẬN VỚI THỨ TỰ BYTE. Postgres nói big-endian; Node mặc định cũng đọc
 * big-endian với `readInt32BE`, nhưng phải nhớ ghi cho đúng — sai một byte là
 * máy chủ đóng kết nối mà không nói gì.
 */
import { connect as ketNoiTCP } from 'node:net';
import { connect as ketNoiTLS } from 'node:tls';
import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const HAN_MS = 15_000;

/** Đọc `postgres://user:pass@host:port/db?sslmode=require` ra từng phần. */
export function docDiaChi(chuoi) {
  const u = new URL(String(chuoi || ''));
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error('Địa chỉ CSDL phải bắt đầu bằng postgres://');
  const ssl = /^(require|verify-ca|verify-full|true|1)$/i.test(u.searchParams.get('sslmode') || '');
  return {
    host: u.hostname,
    port: Number(u.port) || 5432,
    nguoi: decodeURIComponent(u.username || 'postgres'),
    matKhau: decodeURIComponent(u.password || ''),
    ten: decodeURIComponent(u.pathname.replace(/^\//, '')) || 'postgres',
    ssl,
    /* `verify-full` mới thật sự kiểm tên máy chủ. Các mức dưới chỉ mã hoá đường
       truyền — ghi ra đây để đừng ai tưởng `require` là đã an toàn trước kẻ
       đứng giữa. */
    kiemTen: /^verify-full$/i.test(u.searchParams.get('sslmode') || ''),
  };
}

/* ─────────────────── gói tin ─────────────────── */

function goiTin(loai, than) {
  const d = Buffer.alloc(loai ? 5 : 4);
  let i = 0;
  if (loai) d.write(loai, i++, 'latin1');
  d.writeInt32BE(than.length + 4, i);
  return Buffer.concat([d, than]);
}

const chuoiC = (s) => Buffer.concat([Buffer.from(String(s), 'utf8'), Buffer.from([0])]);

/** Tách các gói tin trọn vẹn ra khỏi bộ đệm. Gói chưa đủ thì để lại chờ thêm. */
function tach(dem) {
  const ra = [];
  let i = 0;
  while (dem.length - i >= 5) {
    const dai = dem.readInt32BE(i + 1);
    if (dem.length - i < dai + 1) break;
    ra.push({ loai: String.fromCharCode(dem[i]), than: dem.subarray(i + 5, i + 1 + dai) });
    i += dai + 1;
  }
  return { goi: ra, con: dem.subarray(i) };
}

/* ─────────────────── đăng nhập SCRAM-SHA-256 ─────────────────── */

const hmac = (k, d) => createHmac('sha256', k).update(d).digest();
const bam = (d) => createHash('sha256').update(d).digest();
const xor = (a, b) => Buffer.from(a.map((x, i) => x ^ b[i]));

/**
 * Tính bằng chứng SCRAM. Mật khẩu KHÔNG bao giờ đi qua đường dây — chỉ đi một
 * chữ ký tính từ nó, và mỗi lần một khác.
 */
function scram({ matKhau, nonceMinh, loiChao, loiMayChu }) {
  const p = Object.fromEntries(loiMayChu.split(',').map((x) => [x[0], x.slice(2)]));
  const nonce = p.r, muoi = Buffer.from(p.s, 'base64'), vong = Number(p.i);
  if (!nonce.startsWith(nonceMinh)) throw new Error('Máy chủ trả về nonce không khớp.');
  const khoaMuoi = pbkdf2Sync(matKhau, muoi, vong, 32, 'sha256');
  const khoaKhach = hmac(khoaMuoi, 'Client Key');
  const khoaCatGiu = bam(khoaKhach);
  const cuoiKhongChungCu = `c=biws,r=${nonce}`;
  const thongDiep = `${loiChao},${loiMayChu},${cuoiKhongChungCu}`;
  const chuKy = hmac(khoaCatGiu, thongDiep);
  const chungCu = xor(khoaKhach, chuKy).toString('base64');
  const khoaMayChu = hmac(khoaMuoi, 'Server Key');
  return {
    cuoi: `${cuoiKhongChungCu},p=${chungCu}`,
    /* Chữ ký của MÁY CHỦ — kiểm lại để chắc mình đang nói chuyện với máy chủ
       biết mật khẩu, không phải một kẻ đứng giữa chỉ chuyển tiếp gói tin. */
    chuKyMayChu: hmac(khoaMayChu, thongDiep),
  };
}

/* ─────────────────── kết nối ─────────────────── */

/**
 * Mở một kết nối. Trả về `{ hoi, dong }`.
 *
 * `hoi(sql, thamSo)` → `{ dong: [...], soDong }`.
 */
export async function moKetNoi(diaChi, { hanMs = HAN_MS } = {}) {
  const c = typeof diaChi === 'string' ? docDiaChi(diaChi) : diaChi;

  const o = await new Promise((xong, hong) => {
    const hen = setTimeout(() => hong(new Error(`Không nối được tới ${c.host}:${c.port} trong ${hanMs / 1000}s.`)), hanMs);
    const s = ketNoiTCP({ host: c.host, port: c.port }, () => { clearTimeout(hen); xong(s); });
    s.on('error', (e) => { clearTimeout(hen); hong(e); });
  });
  o.setNoDelay(true);

  let oDung = o;
  if (c.ssl) {
    /* Xin nâng cấp TLS: gửi mã 80877103, máy chủ trả 'S' là đồng ý. */
    await new Promise((xong, hong) => {
      const d = Buffer.alloc(8);
      d.writeInt32BE(8, 0); d.writeInt32BE(80877103, 4);
      o.once('data', (tl) => (tl[0] === 0x53 ? xong() : hong(new Error('Máy chủ CSDL không nhận mã hoá TLS.'))));
      o.write(d);
    });
    oDung = await new Promise((xong, hong) => {
      const t = ketNoiTLS({ socket: o, servername: c.host, rejectUnauthorized: c.kiemTen }, () => xong(t));
      t.on('error', hong);
    });
  }

  let dem = Buffer.alloc(0);
  const cho = [];            // hàng người đang đợi gói tin
  const kho = [];            // gói đã về mà chưa ai nhận
  let loiCham = null;
  /* XẾP HÀNG CẢ HAI CHIỀU. Bản đầu chỉ có hàng người-đợi: gói tin về TRƯỚC khi
     mã kịp gọi `nhan()` thì bị vứt thẳng, và cả kết nối treo im tới lúc hết
     giờ. Postgres trả lời nhanh hơn một nhịp `await`, nên lỗi này xảy ra ngay
     ở gói đầu tiên — đã dính lúc thử với Postgres 16 (29/09). */
  const dayGoi = (g) => { const f = cho.shift(); if (f) f.ok(g); else kho.push(g); };
  oDung.on('data', (d) => {
    dem = Buffer.concat([dem, d]);
    const { goi, con } = tach(dem);
    dem = con;
    for (const g of goi) dayGoi(g);
  });
  const chet = (e) => {
    loiCham = e || new Error('Kết nối CSDL đã đóng.');
    while (cho.length) cho.shift().hong(loiCham);
  };
  oDung.on('error', chet);
  oDung.on('close', () => chet(new Error('Máy chủ CSDL đóng kết nối.')));

  const nhan = () => new Promise((ok, hong) => {
    if (kho.length) return ok(kho.shift());
    if (loiCham) return hong(loiCham);
    const hen = setTimeout(() => hong(new Error('CSDL không trả lời kịp.')), hanMs);
    cho.push({ ok: (g) => { clearTimeout(hen); ok(g); }, hong: (e) => { clearTimeout(hen); hong(e); } });
  });
  const gui = (b) => oDung.write(b);

  /* ---- chào hỏi ---- */
  gui(goiTin(null, Buffer.concat([
    Buffer.from([0, 3, 0, 0]),                       // giao thức 3.0
    chuoiC('user'), chuoiC(c.nguoi),
    chuoiC('database'), chuoiC(c.ten),
    chuoiC('client_encoding'), chuoiC('UTF8'),
    Buffer.from([0]),
  ])));

  let nonceMinh = '', loiChao = '', chuKyMayChuMong = null;
  for (;;) {
    const g = await nhan();
    if (g.loai === 'E') throw new Error(`CSDL từ chối: ${doiLoi(g.than)}`);
    if (g.loai !== 'R') continue;
    const ma = g.than.readInt32BE(0);
    if (ma === 0) break;                                    // xong, đã vào
    if (ma === 3) {                                         // mật khẩu trần
      gui(goiTin('p', chuoiC(c.matKhau)));
    } else if (ma === 5) {                                  // md5
      const muoi = g.than.subarray(4, 8);
      const b1 = createHash('md5').update(c.matKhau + c.nguoi).digest('hex');
      const b2 = createHash('md5').update(Buffer.concat([Buffer.from(b1), muoi])).digest('hex');
      gui(goiTin('p', chuoiC(`md5${b2}`)));
    } else if (ma === 10) {                                 // SASL
      const cach = g.than.subarray(4).toString('utf8');
      if (!cach.includes('SCRAM-SHA-256')) throw new Error(`CSDL đòi cách đăng nhập chưa hỗ trợ: ${cach}`);
      nonceMinh = randomBytes(18).toString('base64');
      loiChao = `n=,r=${nonceMinh}`;
      const than = Buffer.concat([chuoiC('SCRAM-SHA-256'),
        (() => { const b = Buffer.alloc(4); b.writeInt32BE(Buffer.byteLength(`n,,${loiChao}`)); return b; })(),
        Buffer.from(`n,,${loiChao}`, 'utf8')]);
      gui(goiTin('p', than));
    } else if (ma === 11) {                                 // SASL tiếp
      const loiMayChu = g.than.subarray(4).toString('utf8');
      const kq = scram({ matKhau: c.matKhau, nonceMinh, loiChao, loiMayChu });
      chuKyMayChuMong = kq.chuKyMayChu;
      gui(goiTin('p', Buffer.from(kq.cuoi, 'utf8')));
    } else if (ma === 12) {                                 // SASL xong
      const v = g.than.subarray(4).toString('utf8').replace(/^v=/, '');
      const thuc = Buffer.from(v, 'base64');
      if (!chuKyMayChuMong || thuc.length !== chuKyMayChuMong.length
        || !timingSafeEqual(thuc, chuKyMayChuMong)) {
        throw new Error('Máy chủ CSDL không chứng minh được nó biết mật khẩu — ngắt kết nối.');
      }
    } else {
      throw new Error(`CSDL đòi cách đăng nhập lạ (mã ${ma}).`);
    }
  }

  /* Chờ tới lúc máy chủ bảo "sẵn sàng". */
  for (;;) {
    const g = await nhan();
    if (g.loai === 'E') throw new Error(`CSDL từ chối: ${doiLoi(g.than)}`);
    if (g.loai === 'Z') break;
  }

  /* MỘT KẾT NỐI CHỈ CHẠY MỘT CÂU MỘT LÚC.
   *
   * Giao thức Postgres không ghép kênh: hai câu gửi chồng nhau thì gói trả về
   * lẫn lộn, và mã gọi nhận đúng số dòng nhưng SAI DỮ LIỆU — kiểu hỏng im lặng
   * tệ nhất. Bài kiểm bắt được ngay: `Promise.all` ba câu ra kết quả lộn xộn.
   *
   * Xếp hàng ở ĐÂY chứ không bắt mã gọi tự nhớ: một hôm nào đó ai đó viết
   * `Promise.all` cho nhanh, và không có gì nhắc họ.
   */
  let hangDoi = Promise.resolve();
  function hoi(sql, thamSo = []) {
    const ketQua = hangDoi.then(() => hoiThat(sql, thamSo));
    /* Câu sau chờ câu trước XONG, kể cả khi câu trước hỏng — nuốt lỗi ở nhánh
       xếp hàng, còn lỗi thật vẫn ném ra cho người gọi qua `ketQua`. */
    hangDoi = ketQua.catch(() => {});
    return ketQua;
  }

  async function hoiThat(sql, thamSo = []) {
    /* Extended query: Parse → Bind → Describe → Execute → Sync. Tham số đi
       RIÊNG, không nối vào câu lệnh. */
    const ten = '';
    const p = Buffer.concat([chuoiC(ten), chuoiC(sql),
      (() => { const b = Buffer.alloc(2); b.writeInt16BE(0); return b; })()]);
    const gt = thamSo.map((v) => (v === null || v === undefined ? null
      : Buffer.from(typeof v === 'string' ? v : String(v), 'utf8')));
    const phan = [chuoiC(''), chuoiC(ten),
      (() => { const b = Buffer.alloc(2); b.writeInt16BE(0); return b; })(),
      (() => { const b = Buffer.alloc(2); b.writeInt16BE(gt.length); return b; })()];
    for (const v of gt) {
      const b = Buffer.alloc(4);
      if (v === null) { b.writeInt32BE(-1); phan.push(b); } else {
        b.writeInt32BE(v.length); phan.push(b, v);
      }
    }
    phan.push((() => { const b = Buffer.alloc(2); b.writeInt16BE(0); return b; })());
    gui(Buffer.concat([
      goiTin('P', p), goiTin('B', Buffer.concat(phan)),
      goiTin('D', Buffer.concat([Buffer.from('P', 'latin1'), chuoiC('')])),
      goiTin('E', Buffer.concat([chuoiC(''), (() => { const b = Buffer.alloc(4); b.writeInt32BE(0); return b; })()])),
      goiTin('S', Buffer.alloc(0)),
    ]));

    let cot = [];
    const dong = [];
    let soDong = 0;
    let loi = null;
    for (;;) {
      const g = await nhan();
      if (g.loai === 'T') {
        cot = [];
        const n = g.than.readInt16BE(0);
        let i = 2;
        for (let k = 0; k < n; k++) {
          const het = g.than.indexOf(0, i);
          cot.push(g.than.subarray(i, het).toString('utf8'));
          i = het + 1 + 18;
        }
      } else if (g.loai === 'D') {
        const n = g.than.readInt16BE(0);
        let i = 2;
        const d = {};
        for (let k = 0; k < n; k++) {
          const dai = g.than.readInt32BE(i); i += 4;
          d[cot[k] ?? k] = dai === -1 ? null : g.than.subarray(i, i + dai).toString('utf8');
          if (dai > 0) i += dai;
        }
        dong.push(d);
      } else if (g.loai === 'C') {
        soDong = Number(g.than.toString('utf8').trim().split(' ').pop()) || dong.length;
      } else if (g.loai === 'E') {
        loi = new Error(`CSDL báo lỗi: ${doiLoi(g.than)}`);
      } else if (g.loai === 'Z') {
        break;
      }
    }
    if (loi) throw loi;
    return { dong, soDong };
  }

  return {
    hoi,
    dong() { try { gui(goiTin('X', Buffer.alloc(0))); oDung.end(); } catch { /* đã đóng */ } },
  };
}

/** Bóc câu báo lỗi của Postgres ra cho người đọc. */
function doiLoi(than) {
  const p = {};
  let i = 0;
  while (i < than.length && than[i] !== 0) {
    const ma = String.fromCharCode(than[i]);
    const het = than.indexOf(0, i + 1);
    p[ma] = than.subarray(i + 1, het).toString('utf8');
    i = het + 1;
  }
  return [p.M, p.D, p.H].filter(Boolean).join(' · ') || 'không rõ';
}

/** Mở, chạy một việc, rồi đóng — dùng cho việc lẻ. */
export async function voiCSDL(diaChi, viec, y = {}) {
  const kn = await moKetNoi(diaChi, y);
  try { return await viec(kn); } finally { kn.dong(); }
}
