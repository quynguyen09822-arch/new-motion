#!/usr/bin/env node
/**
 * TRÌNH SỬA CLIP — máy chủ.
 *
 * Một tiến trình duy nhất, vừa phục vụ giao diện của trình sửa, vừa phục vụ file
 * của dự án clip dưới `/clip/*`.
 *
 * VÌ SAO PHẢI TỰ PHỤC VỤ FILE CỦA DỰ ÁN CLIP, thay vì trỏ sang cổng 7800 của
 * `serve.py`: trình duyệt của người dùng KHÔNG nằm trên máy workspace này. Trỏ
 * iframe vào `127.0.0.1:7800` là một link chết đối với họ. Mà cho chạy qua hai
 * hostname Traefik khác nhau thì iframe thành khác origin ⇒ mất `contentDocument`
 * ⇒ mất luôn `window.__clip` ⇒ không còn cách nào bấm chọn hay xem trước tại chỗ.
 * Cùng một origin là điều kiện sống còn của trình sửa, không phải chuyện tiện tay.
 */
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJ, SCENES, kiemTraDuAn, soatKichBan } from './proj.js';
import { duocPhucVu, guiFile } from './static.js';
import { aiDangVao, daDatMatKhau, dangBiKhoa, datCookie, diaChi, dsTaiKhoan, duocVao,
  chuanEmail, duocVaoKhiXuat, duoiEmail, ghiSai, kiemEmail, kiemMatKhau, moVe, SONG_VE_XUAT, taoVe,
  taoVeXuat, xoaCookie, xoaSai, docCookie } from './dangnhap.js';
import { canhMau } from './canhmau.js';
import { danhSachClip, docClip, duongDanXem, locSlug } from './clips.js';
import { chuKho, khoCua, oLuuBenVung, soDuAn } from './kho.js';
import { KHO_HINH, taoDuAn, xoaDuAn } from './duan.js';
import { chupBanGoc, lichSu } from './backup.js';
import { khoiPhuc, luuClip } from './save.js';
import { docNhap, ghiNhap, xoaNhap } from './drafts.js';
import { duongDanTieng, khoTieng, songAm } from './tieng.js';
import { docLoi, dsGiong, GIOI_HAN_KY_TU, khoaEleven, khoaGoogle, mauGiong } from './giong.js';
import { vietLoi } from './vietloi.js';
import { hoiAI } from './hoiai.js';
import { dungCanh } from './dungcanh.js';
import { dungTuHtml } from './tuhtml.js';
import { CSP_DO_TRANG, layTrang, luuTrang } from './dotrang.js';
import { banDoPhan, chupTrang, layChup } from './chuptrang.js';
import { doCanh } from './docanh.js';
import { batDauSinh, coKhoa as coKhoaStitch, soatLoiTa, xemViec } from './stitch.js';
import { daDung, ghiNhat, xin } from './hanmuc.js';
import { thongKe } from './nhatky.js';
import { suaMon } from './suamon.js';
import { chuyenVideo, huyViec, khoHopLe, kiemBoCuc, layViec, soDangCho, xuatDuocKhong, xuatNhanh, xuatVideo } from './jobs.js';
import { THU_MUC, danhSachVideo as nguonVideo, duongDanThat, locTen, tenBanChuyen } from './nguonvideo.js';
import { chanDoan, docKhung, suaKhung } from './khung.js';
import { BO, danhSachVideo } from './videos.js';
import { docJson, json, khop, loi, moSSE } from './router.js';
import { duongAnh, luuAnh } from './anh.js';
import { DUONG_MAC_DINH, layCSDL, layChoLam, luuChoLam, moCSDL } from './csdl.js';
import { docDiaChi, voiCSDL } from './pg.js';
import { batDau as batDauGoogle, coGoogle, nhanVeGoogle, xoaCookieG, TEN_COOKIE_G } from './google.js';
import { chepTuEnv, coNguoi, doiMatKhau, duyetNguoi, vaoBangGoogle, doiVai, dsNguoi, datHoatDong, khopBam, kiemVao,
  laQuanTri, layNguoi, themNguoi, xoaNguoi } from './nguoidung.js';
// Bộ soát nằm trong web/ vì trình duyệt cũng phải tải được nó — xem đầu file đó.
import { soatChatLuong } from '../web/soat.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(GOC, 'web');
const CLIP15 = path.join(GOC, 'clip-15s');

// Skill /port sẽ truyền PORT vào. Số dự phòng chỉ dùng khi chạy tay — tránh
// 7800/7801/7802 (dự án clip, motion-ui-graphic, clipvibe-studio) và 7810
// (Library-Source), là những cổng đã có chủ trong ~/.claude/mb-ports.tsv.
const PORT = Number(process.env.PORT) || 7803;

/**
 * Trang báo cho luồng Google — người dùng đang ở một lượt CHUYỂN TRANG, không
 * phải một lời gọi API, nên trả JSON là họ nhìn thấy một đống dấu ngoặc.
 *
 * Tự chứa, không nạp CSS ngoài: nó phải hiện đúng kể cả khi có chuyện gì đó
 * đang hỏng. Chèn chữ bằng `escape` chứ đừng nối thẳng — câu báo có thể mang
 * chữ từ Google gửi về.
 */
function trangBaoGoogle(cau) {
  const an = String(cau).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Đăng nhập — Motion</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;
font-family:system-ui,sans-serif;padding:24px}.h{max-width:420px;text-align:center;background:#121212;
border:1px solid #262626;border-radius:14px;padding:28px}p{color:#b3b3b3;line-height:1.6;margin:0 0 18px}
a{display:inline-block;padding:10px 18px;border-radius:999px;background:#31d975;color:#06140c;
text-decoration:none;font-weight:600}</style></head><body><div class="h">
<p>${an}</p><a href="/dang-nhap">Quay lại trang đăng nhập</a></div></body></html>`;
}

kiemTraDuAn();

const banGoc = chupBanGoc();
if (banGoc.moi) {
  console.log(`📸 Đã chụp bản gốc ${banGoc.soFile} kịch bản → ${path.relative(GOC, banGoc.thuMuc)}`);
} else {
  console.log(`📸 Bản gốc hôm nay đã có (${banGoc.soFile} kịch bản).`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  /* ---------- ĐẦU ĐỀ BẢO MẬT ----------
   * Đặt cho MỌI lời đáp, kể cả trang đăng nhập và file tĩnh.
   *
   * `frame-ancestors 'self'` thay cho X-Frame-Options: công cụ này DÙNG iframe
   * cùng origin để hiện khung xem clip, nên cấm hết là tự bịt mắt mình; chỉ cấm
   * trang NGOÀI nhúng vào — đó mới là cái bẫy lừa-bấm thật.
   *
   * CSP cho phép `'unsafe-inline'` vì bộ dựng clip và trang đăng nhập đều có
   * script/style viết thẳng trong HTML. Siết chặt hơn thì phải băm từng khối,
   * mà băm sai một chỗ là cả trang trắng — đổi lấy rủi ro lớn hơn cái tránh được. */
  const httpsThat = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'", "img-src 'self' data: blob:", "media-src 'self' data: blob:",
    "script-src 'self' 'unsafe-inline'",
    /* KHÔNG còn nguồn phông ngoài. Trước đây phải mở fonts.googleapis.com và
       fonts.gstatic.com vì 12 clip đời cũ nạp Be Vietnam Pro từ đó; nay cả bộ
       chữ nằm trong `clip/public/fonts/` nên `'self'` là đủ.
       Siết lại KHÔNG phải cho đẹp: chừng nào CSP còn mở hai tên miền đó, một
       thẻ <link> lọt lại vào clip nào đó vẫn chạy ngon trên máy có mạng và chỉ
       gãy đúng lúc máy chủ mất mạng — kiểu lỗi không ai bắt được. Đóng lại thì
       nó gãy NGAY ở bài kiểm. */
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self'", "frame-src 'self'",
    "frame-ancestors 'self'", "base-uri 'self'", "form-action 'self'",
  ].join('; '));
  // HSTS chỉ khi ĐANG thật sự chạy https — bật lúc chạy thử ở máy là tự khoá
  // trình duyệt của mình khỏi http://127.0.0.1 suốt một năm.
  if (httpsThat) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  try {
    /* ---------- CỬA ĐĂNG NHẬP ----------
     * Đặt TRƯỚC mọi thứ khác, kể cả trước `/clip/*`: bộ dựng clip nằm trong
     * iframe cùng origin nên cookie vẫn đi theo, nhưng người lạ thì không được
     * đọc file dự án qua đường đó.
     *
     * Chưa đặt mật khẩu thì `duocVao` luôn trả true — không khoá chính chủ ra
     * khỏi công cụ của họ. Đặt bằng `npm run dat-mat-khau`. */
    if (p === '/api/dang-nhap' && req.method === 'POST') {
      const ip = diaChi(req);
      const than = await docJson(req);
      /* Khoá đếm gồm CẢ tài khoản: dò một tài khoản từ nhiều máy vẫn bị chặn.
         Đọc thân yêu cầu TRƯỚC khi kiểm khoá vì cần biết đang gõ tài khoản nào. */
      /* Ghép đuôi NGAY TỪ ĐẦU: khoá đếm gõ sai, tra CSDL và kiểm danh sách đều
         phải nói về cùng một người, dù họ gõ `demo12345` hay gõ đủ email. */
      const emGo = chuanEmail(than?.email);
      const tk = `tk:${emGo}`;
      const con = dangBiKhoa(ip, tk);
      if (con) return loi(res, 429, `Gõ sai nhiều lần quá. Thử lại sau ${con} phút.`);
      if (!daDatMatKhau()) return loi(res, 400, 'Máy chủ chưa đặt mật khẩu nào.');

      /* Email sai khuôn thì báo NGAY và KHÔNG tính vào số lần gõ sai mật khẩu.
         Gõ nhầm địa chỉ là chuyện thường, không phải dấu hiệu ai đó đang dò. */
      /* BẢNG `nguoi_dung` QUYẾT ĐỊNH, nếu có ai trong đó. Mỗi người một mật
         khẩu riêng — xem đầu `server/nguoidung.js`. Bảng trống (bài kiểm, máy
         chạy thử, hoặc CSDL hỏng) thì rơi xuống đường cũ bên dưới. */
      const db = layCSDL();
      const theoBang = db ? kiemVao(db, emGo, than?.mk) : null;
      if (theoBang) {
        if (!theoBang.ok) {
          const con3 = ghiSai(ip, tk);
          return loi(res, 401, con3 > 0 && con3 <= 3 && /chưa đúng/.test(theoBang.cau)
            ? `${theoBang.cau} Còn ${con3} lần trước khi bị khoá 15 phút.` : theoBang.cau);
        }
        xoaSai(ip, tk);
        res.setHeader('Set-Cookie', datCookie(req, taoVe(theoBang.email)));
        return json(res, 200, { ok: true, email: theoBang.email, vai: theoBang.vai });
      }

      const em = kiemEmail(emGo);
      if (!em.ok) return loi(res, 400, em.cau);

      if (!kiemMatKhau(than?.mk)) {
        const con2 = ghiSai(ip, tk);
        return loi(res, 401, con2 > 0 && con2 <= 3
          ? `Mật khẩu không đúng. Còn ${con2} lần trước khi bị khoá 15 phút.`
          : 'Mật khẩu không đúng.');
      }
      xoaSai(ip, tk);
      res.setHeader('Set-Cookie', datCookie(req, taoVe(em.email)));
      return json(res, 200, { ok: true, email: em.email });
    }

    /* ---------- ĐĂNG NHẬP BẰNG GOOGLE ----------
     * Hai chặng: sang Google xin phép, rồi Google gọi ngược về đây kèm `code`.
     * Bốn cửa kiểm (state · nonce · chữ ký · email đã xác minh) nằm trong
     * `server/google.js`. Người mới vào hàng CHỜ DUYỆT, xem `nguoidung.js`.
     */
    if (p === '/dang-nhap/google' && req.method === 'GET') {
      if (!coGoogle()) return loi(res, 503, 'Máy chủ chưa khai khoá Google.');
      const b = batDauGoogle(req, { quayVe: url.searchParams.get('ve') || '/' });
      res.setHeader('Set-Cookie', b.cookie);
      res.writeHead(302, { Location: b.diaChi });
      return res.end();
    }
    if (p === '/dang-nhap/google/tra-ve' && req.method === 'GET') {
      if (!coGoogle()) return loi(res, 503, 'Máy chủ chưa khai khoá Google.');
      /* Cookie tạm XOÁ NGAY dù thành hay bại: một `state` chỉ dùng đúng một lần,
         để lại là dùng lại được. */
      const vePhu = [xoaCookieG()];
      const veTrang = (cau, ma = 400) => {
        res.setHeader('Set-Cookie', vePhu);
        res.writeHead(ma, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(trangBaoGoogle(cau));
      };
      /* Người dùng bấm "Huỷ" bên Google — không phải lỗi, đừng doạ họ. */
      if (url.searchParams.get('error')) {
        return veTrang('Bạn đã huỷ đăng nhập bằng Google.', 200);
      }
      const kq = await nhanVeGoogle(req, {
        code: url.searchParams.get('code'), state: url.searchParams.get('state'),
        cookie: docCookie(req, TEN_COOKIE_G),
      });
      if (!kq.ok) return veTrang(kq.cau);

      const db = layCSDL();
      if (!db) return veTrang('Máy chủ chưa dùng được phần tài khoản (CSDL không mở được).', 503);
      const vao = vaoBangGoogle(db, kq);
      if (!vao.ok) return veTrang(vao.cau, vao.choDuyet ? 200 : 403);
      vePhu.push(datCookie(req, taoVe(vao.email)));
      res.setHeader('Set-Cookie', vePhu);
      res.writeHead(302, { Location: kq.ve.startsWith('/') ? kq.ve : '/' });
      return res.end();
    }

    /* ---------- NGƯỜI DÙNG ----------
     * Chủ kho tự thêm khách hàng ngay trong app, thay vì sửa biến môi trường
     * trên Vibe Host rồi triển khai lại. Xem `server/nguoidung.js`.
     *
     * CHỈ NGƯỜI QUẢN TRỊ. Kiểm ở TỪNG đường, không kiểm một chỗ rồi tin: thêm
     * một đường mới mà quên kiểm là cả bảng tài khoản phơi ra.
     */
    if (p.startsWith('/api/nguoi-dung')) {
      const db = layCSDL();
      if (!db) return loi(res, 503, 'Chưa dùng được phần tài khoản (CSDL không mở được).');
      const toi = aiDangVao(req);
      /* Bảng còn trống thì chưa có ai là quản trị — lúc ấy app đang chạy kiểu
         cũ, và phần này chưa mở. Nói thẳng chứ đừng để bấm vào rồi im lặng. */
      if (!coNguoi(db)) return loi(res, 409, 'Máy chủ chưa đặt mật khẩu nên chưa có danh sách tài khoản.');
      if (!laQuanTri(db, toi)) return loi(res, 403, 'Chỉ người quản trị mới xem được danh sách tài khoản.');

      if (p === '/api/nguoi-dung' && req.method === 'GET') {
        return json(res, 200, { ok: true, toi, nguoi: dsNguoi(db) });
      }
      if (p === '/api/nguoi-dung' && req.method === 'POST') {
        const than = await docJson(req);
        const kq = themNguoi(db, { email: than?.email, ten: than?.ten, vai: than?.vai,
          /* Người quản trị gõ sẵn mật khẩu thì dùng đúng cái đó; bỏ trống thì
             `themNguoi` sinh hộ. Cách nào cũng chỉ hiện đúng một lần. */
          matKhau: String(than?.matKhau || '') });
        if (!kq.ok) return loi(res, 400, kq.cau);
        /* Mật khẩu trả về ĐÚNG MỘT LẦN, ngay lúc tạo. Không cất lại đâu cả nên
           không đường nào đọc lại được — quên thì đặt lại cái mới. */
        return json(res, 200, kq);
      }
      /* Biến RIÊNG, không dùng `m` chung của cả hàm: `m` khai bằng `let` ở dưới
         khối này nên đụng vào đây là "Cannot access before initialization" — lỗi
         500 cho mọi lượt sửa tài khoản. */
      const mNg = khop('/api/nguoi-dung/:email', p);
      if (mNg && req.method === 'DELETE') {
        const kq = xoaNguoi(db, mNg.email);
        return kq.ok ? json(res, 200, kq) : loi(res, 400, kq.cau);
      }
      if (mNg && req.method === 'PATCH') {
        const than = await docJson(req);
        if (than?.duyet) {
          const kq = duyetNguoi(db, mNg.email);
          return kq.ok ? json(res, 200, kq) : loi(res, 400, kq.cau);
        }
        if (than?.matKhau !== undefined) {
          const kq = doiMatKhau(db, mNg.email, String(than.matKhau || ''));
          return kq.ok ? json(res, 200, kq) : loi(res, 400, kq.cau);
        }
        if (than?.dangHoatDong !== undefined) {
          const kq = datHoatDong(db, mNg.email, Boolean(than.dangHoatDong));
          return kq.ok ? json(res, 200, kq) : loi(res, 400, kq.cau);
        }
        if (than?.vai !== undefined) {
          const kq = doiVai(db, mNg.email, String(than.vai));
          return kq.ok ? json(res, 200, kq) : loi(res, 400, kq.cau);
        }
        return loi(res, 400, 'Không rõ muốn đổi gì.');
      }
      return loi(res, 404, `Không có đường dẫn ${p}.`);
    }

    /* ĐỔI MẬT KHẨU CỦA CHÍNH MÌNH — ai cũng làm được, và phải gõ đúng mật khẩu
       cũ. Đây là đường để thoát khỏi mật khẩu chung. */
    if (p === '/api/doi-mat-khau-cua-toi' && req.method === 'POST') {
      const db = layCSDL();
      const toi = aiDangVao(req);
      if (!db || !coNguoi(db)) return loi(res, 409, 'Máy chủ này chưa dùng tài khoản riêng.');
      if (!toi) return loi(res, 401, 'Chưa đăng nhập.');
      const than = await docJson(req);
      const n = layNguoi(db, toi);
      if (!n || !khopBam(than?.cu, n.mat_khau_bam)) return loi(res, 401, 'Mật khẩu hiện tại không đúng.');
      const kq = doiMatKhau(db, toi, String(than?.moi || ''));
      return kq.ok ? json(res, 200, { ok: true }) : loi(res, 400, kq.cau);
    }

    if (p === '/api/dang-xuat' && req.method === 'POST') {
      res.setHeader('Set-Cookie', xoaCookie(req));
      return json(res, 200, { ok: true });
    }

    /* ---------- VÉ XUẤT VIDEO đi kèm đường dẫn ----------
     * Bộ xuất mở khung xem bằng Chromium không có cookie. Máy chủ tự ký một vé
     * sống một giờ rồi nhét vào `?ve=` của đường dẫn đưa cho nó.
     *
     * Nhận xong thì ĐẶT LUÔN VÀO COOKIE: trang khung xem kéo theo hàng chục
     * đường con (phông, ảnh, video nguồn) mà mấy đường ấy không mang theo tham
     * số nào cả. Không đặt cookie thì trang mở được mà rỗng ruột.
     *
     * Cookie đặt theo đúng tuổi của vé, không phải 14 ngày. */
    const veURL = url.searchParams.get('ve');
    const thanVeURL = veURL ? moVe(veURL) : null;
    if (thanVeURL?.xuat && duocVaoKhiXuat(p)) {
      res.setHeader('Set-Cookie', datCookie(req, veURL, SONG_VE_XUAT));
    }

    if (!duocVao(req, p, veURL)) {
      // Lời gọi API thì trả 401 để giao diện tự xử; trang thì đưa thẳng tới chỗ
      // đăng nhập, kèm đường đang định tới để vào xong quay lại đúng chỗ đó.
      if (p.startsWith('/api/')) return loi(res, 401, 'Cần đăng nhập.');
      const tiep = encodeURIComponent(p + url.search);
      res.writeHead(302, { Location: `/dang-nhap?tiep=${tiep}` });
      return res.end();
    }

    if (p === '/dang-nhap') {
      // Đã đăng nhập rồi mà mở lại trang này thì đưa về thẳng trình sửa.
      if (duocVao(req, '/')) { res.writeHead(302, { Location: '/' }); return res.end(); }
      if (guiFile(req, res, path.join(WEB, 'dang-nhap.html'))) return;
      return loi(res, 404, 'Không thấy trang đăng nhập.');
    }

    if (p === '/api/toi-la-ai' && req.method === 'GET') {
      return json(res, 200, {
        ok: true, coMatKhau: daDatMatKhau(), daVao: duocVao(req, '/'),
        email: aiDangVao(req), duoi: duoiEmail(),
        /* Chỉ nói CÓ giới hạn hay không, KHÔNG trả danh sách tài khoản ra trang
           đăng nhập — đó là danh sách người, không phải thứ để người lạ đọc. */
        coDanhSach: dsTaiKhoan().length > 0,
        /* Máy chủ có khai khoá Stitch không. Giao diện phải biết TRƯỚC: bày nút
           "Vẽ giao diện từ lời tả" trên một máy chủ không có khoá là để người
           dùng gõ xong một đoạn tả rồi mới nhận lời từ chối. */
        coStitch: coKhoaStitch(),
        /* Có bày nút "Đăng nhập bằng Google" không — hỏi trước, y như Stitch. */
        coGoogle: coGoogle(),
        /* Có phải người quản trị không — để trang chào biết có bày mục "Người
           dùng" hay không. Hỏi CSDL chứ đừng suy từ email: chủ kho theo env và
           quản trị theo bảng là hai chuyện, và chúng lệch nhau được. */
        laQuanTri: (() => {
          const db = layCSDL();
          return Boolean(db && coNguoi(db) && laQuanTri(db, aiDangVao(req)));
        })(),
        hanMuc: daDung(aiDangVao(req)),
      });
    }

    /* ---------- KHO CỦA NGƯỜI ĐANG ĐĂNG NHẬP ----------
     * Tính MỘT LẦN cho mỗi lời gọi rồi truyền xuống, không để mỗi module tự đi
     * hỏi lại: hai chỗ hỏi vào hai thời điểm khác nhau là hai kho khác nhau, và
     * kiểu lệch đó hiện ra thành "lưu xong mở lại không thấy đâu".
     *
     * Đặt SAU cửa đăng nhập vì trước cửa thì chưa biết là ai. */
    /* Vé trong URL cũng phải nói được nó là của ai: bộ dựng đọc kịch bản trong
       ĐÚNG kho của người bấm nút xuất. Bỏ qua thì vé mở ra kho gốc và xuất nhầm
       clip của người khác — im lặng, vì kho gốc lúc nào cũng có clip để mở. */
    const kho = khoCua(aiDangVao(req) || thanVeURL?.em || null);
    let m;   // khai ở đây vì mấy route `khop()` đầu tiên nằm ngay bên dưới

    /* ---------- file của dự án clip, qua danh sách trắng ---------- */
    if (p.startsWith('/clip/')) {
      const rel = decodeURIComponent(p.slice('/clip/'.length));
      if (!duocPhucVu(rel)) return loi(res, 403, 'Không được phép đọc file này.');
      // no-store: sửa kịch bản xong bấm F5 phải thấy bản mới, không thấy bản đệm.
      if (guiFile(req, res, path.join(PROJ, rel), { cache: 'no-store' })) return;
      return loi(res, 404, 'Không thấy file trong dự án clip.');
    }

    /* ---------- ẢNH NGƯỜI DÙNG MANG VÀO ----------
     * Đường TUYỆT ĐỐI (`/anh/…`), không phải đường tương đối như `public/x.png`
     * của dự án clip: bộ dựng dùng `src` Y NGUYÊN, mà nó chạy trong iframe mở từ
     * `/clip/scene-player.html`, nên đường tương đối sẽ đi tìm trong dự án chung
     * — đúng chỗ ảnh KHÔNG nằm. Đường tuyệt đối thì về thẳng máy chủ này, và nó
     * biết hỏi đúng kho của người đang đăng nhập.
     *
     * Bộ xuất video cũng đi qua đây được: vé xuất đặt cookie ngay ở đầu vòng
     * xử lý, nên mọi đường con của trang khung xem đều mang vé. */
    if ((m = khop('/anh/:ten', p)) && req.method === 'GET') {
      const duong = duongAnh(m.ten, kho);
      if (!duong) return loi(res, 400, 'Tên ảnh không hợp lệ.');
      /* Tên file là vân tay nội dung — nội dung đổi thì tên đổi. Nên bản đệm
         không bao giờ cũ, và đệm được lâu. */
      if (guiFile(req, res, duong, { cache: 'public, max-age=31536000, immutable' })) return;
      return loi(res, 404, 'Không thấy ảnh này trong kho của bạn.');
    }

    if (p === '/api/anh' && req.method === 'POST') {
      const kq = luuAnh(await docJson(req), kho);
      if (!kq.ok) return json(res, kq.ma || 400, kq);
      return json(res, 201, kq);
    }

    /* ---------- clip 15 giây đã giao trước đây, giữ link cũ sống ---------- */
    if (p === '/15s' || p === '/15s/') {
      res.writeHead(302, { Location: '/15s/index.html' });
      return res.end();
    }
    if (p.startsWith('/15s/')) {
      const rel = decodeURIComponent(p.slice('/15s/'.length));
      if (rel.includes('..') || rel.startsWith('/')) return loi(res, 403, 'Đường dẫn không hợp lệ.');
      if (guiFile(req, res, path.join(CLIP15, rel))) return;
      return loi(res, 404, 'Không thấy file.');
    }

    /* ---------- API ---------- */
    /*
     * Nhịp tim cho bộ triển khai. Phải RẺ và KHÔNG chạm đĩa nặng: Vibe Host gọi
     * nó liên tục, mà `danhSachClip()` thì đọc cả thư mục scenes rồi soát từng
     * file. Chỉ trả lời "tôi còn sống", không hứa gì hơn.
     */
    if (p === '/health' || p === '/api/health') {
      return json(res, 200, { ok: true, up: Math.round(process.uptime()) });
    }

    /* Thống kê lượt dùng. Để SAU cửa đăng nhập: nó cho biết ai đang sửa clip
       nào, là chuyện nội bộ chứ không phải số liệu công khai. */
    if (p === '/api/thong-ke' && req.method === 'GET') {
      return json(res, 200, thongKe());
    }

    /* CẢNH MẪU cho ô xem thử trong bảng chỉnh. Bộ dựng tự gọi đường này qua
       `?scene=/api/canh-mau?…` — xem `server/canhmau.js` để biết vì sao sinh ở
       đây chứ không sinh ở trình duyệt.
       Trả `no-store`: người dùng kéo thanh trượt là mỗi nấc một cảnh khác, để
       trình duyệt nhớ bản cũ thì ô xem thử đứng im mà núm thì đã đổi. */
    if (p === '/api/canh-mau' && req.method === 'GET') {
      const y = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      const { doc, vanDe } = await canhMau(y);
      if (vanDe.length) return loi(res, 500, `Cảnh mẫu hỏng: ${vanDe.join('; ')}`);
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, doc);
    }

    if (p === '/api/clips' && req.method === 'GET') {
      const ds = await danhSachClip(kho);
      return json(res, 200, {
        ok: true, kho: { ma: kho.ma, laGoc: kho.laGoc, email: kho.email },
        clips: ds.map((c) => ({ ...c, xem: duongDanXem(c, kho) })),
      });
    }

    /* ---------- KHO DỰ ÁN ---------- */
    /* Trang chào hỏi đường này để biết bày gì: tên người, kho nào, có dự án chưa. */
    if (p === '/api/kho' && req.method === 'GET') {
      const oLuu = oLuuBenVung();
      return json(res, 200, { ok: true, email: kho.email || null, ma: kho.ma,
        laGoc: kho.laGoc, soDuAn: soDuAn(kho), khoHinh: KHO_HINH,
        coMatKhau: daDatMatKhau(),
        /* Chỉ gửi ra khi THẬT SỰ có chuyện. Gửi kèm cả lúc bình thường thì giao
           diện phải tự đoán nên hiện hay không, và chỗ đoán ấy sẽ đoán sai. */
        canhBaoOLuu: oLuu.hopLe ? null : oLuu.lyDo });
    }

    /* XOÁ dự án. Đặt TRƯỚC nhánh POST cho gọn nhóm.
       Chỉ xoá trong kho của người ĐANG ĐĂNG NHẬP — `kho` lấy từ vé chứ không
       lấy từ tham số, nên không ai xoá được đồ của người khác. */
    if ((m = khop('/api/du-an/:slug', p)) && req.method === 'DELETE') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên dự án không hợp lệ.');
      const kq = xoaDuAn(slug, kho);
      if (!kq.ok) return json(res, kq.ma || 400, kq);
      return json(res, 200, kq);
    }

    if (p === '/api/du-an' && req.method === 'POST') {
      const than = await docJson(req);
      const kq = await taoDuAn(than, kho, aiDangVao(req));
      if (!kq.ok) return json(res, kq.ma || 400, kq);
      return json(res, 201, kq);
    }

    /* KỊCH BẢN THÔ cho bộ dựng, dùng cho kho RIÊNG.
     *
     * Bộ dựng nạp `?scene=…` và nhận cả đường dẫn tuyệt đối, nên kịch bản nằm
     * ngoài dự án clip vẫn tới được nó mà KHÔNG phải sửa `scene-player.html`
     * của dự án chung — file đó có người thay hằng ngày, sửa vào là mất lặng lẽ.
     *
     * Kho gốc vẫn đi đường cũ (`?scene=<tên>`), nhưng đường này phục vụ cả kho
     * gốc: một đường cho mọi kho thì không có nhánh nào ít người đi mà mục lâu
     * ngày không ai biết. */
    if ((m = khop('/api/kich-ban/:slug', p)) && req.method === 'GET') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên dự án không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy dự án "${slug}".`);
      // no-store: sửa xong bấm F5 phải thấy bản mới, không thấy bản đệm.
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, c.doc);
    }

    if ((m = khop('/api/clip/:slug', p)) && req.method === 'GET') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const doc = docClip(slug, kho);
      if (!doc) return loi(res, 404, `Không thấy clip "${slug}".`);
      // Nháp mới hơn file thật thì gửi kèm để giao diện HỎI, không tự áp.
      const nhap = docNhap(slug, kho);
      const keo = nhap && nhap.luc > doc.suaLuc ? nhap : null;
      return json(res, 200, { ok: true, ...doc, nhap: keo });
    }

    /* Lưu — đi qua soát → cất bản cũ → ghi nguyên khối. Xem server/save.js. */
    if ((m = khop('/api/clip/:slug', p)) && req.method === 'POST') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      if (!docClip(slug, kho)) return loi(res, 404, `Không thấy clip "${slug}".`);
      const than = await docJson(req);
      const kq = await luuClip(slug, than?.doc, aiDangVao(req), kho);
      if (!kq.ok) return json(res, 422, { ok: false, vanDe: kq.vanDe });
      xoaNhap(slug, kho); // lưu xong thì nháp hết nhiệm vụ
      return json(res, 200, { ...kq, suaLuc: docClip(slug, kho).suaLuc });
    }

    /* ---------- ĐANG LÀM DỞ Ở ĐÂU ----------
     * Mở app lên là về đúng dự án đang làm, đúng cảnh, đúng giây. Lưu theo tài
     * khoản nên đổi máy vẫn theo được. */
    if (p === '/api/cho-lam-viec' && req.method === 'GET') {
      return json(res, 200, { ok: true, cho: layChoLam(layCSDL(), aiDangVao(req) || '') });
    }
    if (p === '/api/cho-lam-viec' && (req.method === 'PUT' || req.method === 'POST')) {
      const than = await docJson(req);
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      luuChoLam(layCSDL(), aiDangVao(req) || '', { slug, canh: than?.canh, giay: than?.giay });
      return json(res, 200, { ok: true });
    }

    /* `POST` cũng nhận, không chỉ `PUT`: lúc đóng tab trình duyệt chỉ gửi được
       bằng `navigator.sendBeacon`, mà beacon thì LUÔN là POST. Thiếu nhánh này
       thì đúng những sửa đổi cuối cùng — thứ dễ mất nhất — không được lưu. */
    if ((m = khop('/api/draft/:slug', p)) && (req.method === 'PUT' || req.method === 'POST')) {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const than = await docJson(req);
      if (!than?.doc) return loi(res, 400, 'Thiếu kịch bản.');
      ghiNhap(slug, than.doc, kho);
      return json(res, 200, { ok: true });
    }

    if ((m = khop('/api/draft/:slug', p)) && req.method === 'DELETE') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      xoaNhap(slug, kho);
      return json(res, 200, { ok: true });
    }

    if ((m = khop('/api/history/:slug', p)) && req.method === 'GET') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      return json(res, 200, { ok: true, ban: lichSu(slug, kho) });
    }

    if ((m = khop('/api/restore/:slug', p)) && req.method === 'POST') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const than = await docJson(req);
      const kq = await khoiPhuc(slug, String(than?.dau || ''), aiDangVao(req), kho);
      if (!kq.ok) return json(res, 422, kq);
      return json(res, 200, { ...kq, ...docClip(slug, kho) });
    }

    /* ---------- nguồn video để đặt vào clip ---------- */
    if (p === '/api/nguon-video' && req.method === 'GET') {
      return json(res, 200, { ok: true, thuMuc: THU_MUC, video: await nguonVideo() });
    }

    /* Chuyển một file sang H.264. Đi qua hàng đợi việc nặng chung với xuất video
       — hai thứ đều ăn CPU, chạy song song thì cả hai cùng chậm. */
    if (p === '/api/chuyen-video' && req.method === 'POST') {
      const than = await docJson(req);
      const ten = locTen(than?.ten);
      if (!ten) return loi(res, 400, 'Tên file không hợp lệ.');
      const vao = duongDanThat(ten);
      if (!existsSync(vao)) return loi(res, 404, `Không thấy file "${ten}".`);
      const raTen = tenBanChuyen(ten);
      const ds = await nguonVideo();
      const nguon = ds.find((v) => v.ten === ten);
      if (nguon?.chayDuoc) {
        return loi(res, 400, `"${ten}" đã là định dạng trình duyệt xem được rồi.`);
      }
      const v = chuyenVideo({ ten, vao, ra: duongDanThat(raTen), giay: nguon?.giay });
      return json(res, 200, { ok: true, id: v.id, ra: `${THU_MUC}/${raTen}`, dangCho: soDangCho() });
    }

    /* ---------- video đã xuất ---------- */
    /* ---------- giọng đọc AI ---------- */
    if (p === '/api/giong' && req.method === 'GET') {
      const d = await dsGiong({ moi: url.searchParams.get('moi') === '1' });
      /* Trả 200 kèm `ok:false` chứ không trả 500: đây không phải app hỏng, mà là
         chưa khai khoá — giao diện cần hiện lời hướng dẫn, không phải màn lỗi đỏ. */
      return json(res, 200, { ...d, gioiHan: GIOI_HAN_KY_TU,
        coGoogle: khoaGoogle().ok, coEleven: khoaEleven().ok });
    }

    if (p === '/api/nghe-thu' && req.method === 'GET') {
      const d = await mauGiong(url.searchParams.get('id') || '');
      if (!d.ok) return loi(res, 400, d.cau);
      return guiFile(req, res, d.f);
    }

    if (p === '/api/sua-mon' && req.method === 'POST') {
      const than = await docJson(req);
      {
        const ai = aiDangVao(req);
        const q = xin('goiAI', ai);
        if (!q.ok) return loi(res, 429, q.cau);
        ghiNhat('goiAI', ai, 1, 'sửa món');
      }
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);
      const anh = than?.anh ? String(than.anh) : null;
      if (anh && anh.length > 5.4 * 1024 * 1024) {
        return loi(res, 400, 'Ảnh nặng quá 4 MB. Thu nhỏ lại rồi thử lại.');
      }
      const d = await suaMon({
        doc: c.doc, canhId: than?.canhId, monId: than?.monId,
        y: than?.y, anh, mime: than?.mime,
      });
      if (!d.va) return loi(res, 400, d.cau || 'AI sửa hỏng.');
      return json(res, 200, d);
    }

    /* DỰNG CẢNH TỪ HTML — đường Stitch → Motion.
       Khác `/api/dung-canh` ở chỗ nguồn vào là TRANG, không phải ảnh: ta đọc
       trang bằng trình duyệt nên có số đo thật, AI khỏi phải đoán từ pixel. */
    /* ---------- SINH GIAO DIỆN BẰNG STITCH ----------
     * Tả bằng lời → Stitch dựng một màn → ta lấy MÃ HTML của nó → đường
     * `/api/tu-html` sẵn có biến nó thành cảnh.
     *
     * Vì sao tách làm hai đường chứ không gộp một: cả quãng mất khoảng hai phút
     * rưỡi (sinh màn ~71 giây, dựng cảnh ~58 giây). Gộp một đường là bắt yêu
     * cầu HTTP nằm chờ chừng ấy, mà Traefik cùng mọi proxy đứng giữa đều cắt
     * trước khi xong — người dùng nhận một lỗi mạng không nói lên điều gì, và
     * lượt gọi tốn tiền thì vẫn cứ chạy tiếp ở máy chủ.
     *
     * Tách ra còn được một cái nữa: người dùng XEM ĐƯỢC mã HTML trước khi đồng
     * ý dựng thành cảnh, và sửa lời tả rồi sinh lại mà chưa tốn lượt AI nào của
     * bước dựng cảnh. */
    if (p === '/api/stitch' && req.method === 'POST') {
      if (!coKhoaStitch()) {
        return loi(res, 503, 'Máy chủ chưa khai khoá Stitch, nên chưa dựng giao diện từ lời tả được.');
      }
      const than = await docJson(req);
      /* SOÁT LỜI TẢ TRƯỚC KHI TRỪ HẠN MỨC. Trừ trước rồi mới biết lời tả không
         dùng được là bắt người dùng trả tiền cho cú gõ thiếu của chính họ. */
      const soat = soatLoiTa(than?.y);
      if (!soat.ok) return loi(res, 400, soat.cau);

      const ai = aiDangVao(req);
      /* Tính vào CÙNG hạn mức `goiAI`. Một lượt Stitch cũng là một lượt gọi mô
         hình tốn tiền — để nó ngoài sổ là mở một đường lách qua trần chi tiêu. */
      const q = xin('goiAI', ai);
      if (!q.ok) return loi(res, 429, q.cau);
      ghiNhat('goiAI', ai, 1, 'sinh giao diện Stitch');

      const kq = batDauSinh({
        y: than?.y,
        /* Clip dọc thì xin màn điện thoại. Xin màn desktop rồi nhét vào khung
           9:16 là bố cục ngang phải bóp lại, và mọi tỉ lệ sai hết. */
        kieuMay: than?.kieuMay === 'MOBILE' ? 'MOBILE' : 'DESKTOP',
        maDuAn: String(than?.maDuAn || ''),
      });
      if (!kq.ok) return json(res, 400, kq);
      return json(res, 202, kq);
    }

    if ((m = khop('/api/stitch/:id', p)) && req.method === 'GET') {
      const keHtml = url.searchParams.get('html') === '1';
      const kq = xemViec(m.id, { keHtml });
      if (!kq.ok) return json(res, kq.ma || 400, kq);
      return json(res, 200, kq);
    }

    /* ---------- ĐO TRANG TRONG TRÌNH DUYỆT NGƯỜI DÙNG ----------
     * Bản triển khai không có Chromium, nên máy chủ không tự đo được. Thay vào đó:
     * cất trang lại (tải hộ nếu là địa chỉ), trình duyệt mở nó trong iframe ẩn,
     * đo bằng `web/dobocuc.js`, rồi gửi bản đồ về `/api/tu-html`.
     * Xem `server/dotrang.js` về CSP riêng và vì sao không dùng `srcdoc`. */
    if (p === '/api/do-trang' && req.method === 'POST') {
      const than = await docJson(req);
      const kq = await luuTrang({ html: than?.html, url: than?.url, chu: aiDangVao(req) });
      if (!kq.ok) return loi(res, 400, kq.cau);
      return json(res, 200, kq);
    }
    if ((m = khop('/do-trang/:id', p)) && req.method === 'GET') {
      const html = layTrang(m.id, aiDangVao(req));
      if (!html) return loi(res, 404, 'Trang đo đã hết hạn — thử lại.');
      /* GHI ĐÈ CSP chung của app. Xem ghi chú đầu `server/dotrang.js`. */
      res.setHeader('Content-Security-Policy', CSP_DO_TRANG);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }

    /* CHỤP TRANG BẰNG TRÌNH DUYỆT THẬT TRÊN MÁY CHỦ — ô ② của thẻ Dựng hình.
     * Người dùng XEM ảnh chụp để kiểm đúng trang mình muốn, chọn một phần, rồi
     * mới gọi AI. Xem `server/chuptrang.js`. Máy không có Chromium thì trả
     * `khongCo` để trình duyệt lùi về đường đo cũ (`/api/do-trang`). */
    if (p === '/api/chup-trang' && req.method === 'POST') {
      const than = await docJson(req);
      const url = String(than?.url || '').trim();
      const html = String(than?.html || '');
      if (url && !/^https?:\/\//i.test(url)) {
        return loi(res, 400, 'Địa chỉ phải bắt đầu bằng http:// hoặc https://');
      }
      const kq = await chupTrang({ url: url || null, html: url ? null : html, chu: aiDangVao(req) });
      if (!kq.ok) return json(res, kq.khongCo ? 200 : 400, kq);
      return json(res, 200, kq);
    }
    if ((m = khop('/api/chup-trang/:id/anh', p) || khop('/api/chup-trang/:id/phan/:pid', p))
      && req.method === 'GET') {
      const v = layChup(m.id, aiDangVao(req));
      const anh = !v ? null : m.pid ? v.phan.find((x) => x.id === m.pid)?.anh : v.anh;
      if (!anh) return loi(res, 404, 'Ảnh chụp đã hết hạn — chụp lại trang.');
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=900' });
      return res.end(anh);
    }

    if (p === '/api/tu-html' && req.method === 'POST') {
      const than = await docJson(req);
      {
        const ai = aiDangVao(req);
        const q = xin('goiAI', ai);
        if (!q.ok) return loi(res, 429, q.cau);
        ghiNhat('goiAI', ai, 1, 'dựng từ HTML');
      }
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);

      /* Đã chụp trên máy chủ và người dùng đã chọn một phần: lấy bản đồ + ảnh
         của đúng phần ấy. Ảnh đi kèm cho AI NHÌN — số đo vẫn lấy từ bản đồ. */
      if (than?.chupId) {
        const v = layChup(than.chupId, aiDangVao(req));
        if (!v) return loi(res, 404, 'Ảnh chụp trang đã hết hạn — bấm chụp lại.');
        const bp = banDoPhan(v, String(than.phanId || ''));
        if (!bp) return loi(res, 400, 'Chưa chọn phần nào của trang.');
        const email = aiDangVao(req);
        const d = await dungTuHtml({ doc: c.doc, y: than?.y, banDo: bp.banDo, anh: bp.anh,
          doThat: (canh) => doCanh({ goc: `http://127.0.0.1:${PORT}`, meta: c.doc.meta, canh, email }) });
        if (d.cau && !d.canh) return loi(res, 400, d.cau);
        return json(res, 200, d);
      }
      const html = String(than?.html || '');
      const url = String(than?.url || '').trim();
      if (!html && !url && !than?.banDo) return loi(res, 400, 'Chưa dán HTML hay địa chỉ trang.');
      /* Chỉ nhận http(s). Cho `file:` là mở cửa đọc mọi file trên máy chủ qua
         một đường API ai đăng nhập cũng gọi được. */
      if (url && !/^https?:\/\//i.test(url)) {
        return loi(res, 400, 'Địa chỉ phải bắt đầu bằng http:// hoặc https://');
      }
      const d = await dungTuHtml({ doc: c.doc, html, url, y: than?.y, banDo: than?.banDo });
      if (d.cau && !d.canh) return loi(res, 400, d.cau);
      return json(res, 200, d);
    }

    if (p === '/api/dung-canh' && req.method === 'POST') {
      const than = await docJson(req);
      {
        const ai = aiDangVao(req);
        const q = xin('goiAI', ai);
        if (!q.ok) return loi(res, 429, q.cau);
        ghiNhat('goiAI', ai, 1, 'dựng hình');
      }
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);
      /* Ảnh gửi lên dạng base64, dài hơn ảnh gốc khoảng 1,34 lần. Thân yêu cầu
         bị chặn ở 8 MB (`GIOI_HAN_BODY` trong router.js), nên ảnh gốc chỉ được
         tới ~4 MB. Chặn ở đây với ĐÚNG con số đó — nói "6 MB" rồi để router
         chặn ở 8 MB là người dùng nhận một lỗi khác hẳn lời mình vừa hứa. */
      const anh = String(than?.anh || '');
      if (!anh) return loi(res, 400, 'Chưa chọn ảnh.');
      if (anh.length > 5.4 * 1024 * 1024) {
        return loi(res, 400, 'Ảnh nặng quá 4 MB. Thu nhỏ lại rồi thử lại.');
      }
      const mime = String(than?.mime || 'image/png');
      if (!/^image\/(png|jpeg|webp|gif)$/.test(mime)) {
        return loi(res, 400, `Không đọc được định dạng ảnh "${mime}". Dùng PNG, JPG hoặc WebP.`);
      }
      const d = await dungCanh({ doc: c.doc, anh, mime, y: than?.y });
      if (d.cau && !d.canh) return loi(res, 400, d.cau);
      return json(res, 200, d);
    }

    if (p === '/api/hoi-ai' && req.method === 'POST') {
      const than = await docJson(req);
      {
        const ai = aiDangVao(req);
        const q = xin('goiAI', ai);
        if (!q.ok) return loi(res, 429, q.cau);
        ghiNhat('goiAI', ai, 1, 'hỏi AI');
      }
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);
      const d = await hoiAI({ doc: c.doc, hoi: than?.hoi });
      if (!d.ok) return loi(res, 400, d.cau);
      return json(res, 200, d);
    }

    if (p === '/api/viet-loi' && req.method === 'POST') {
      const than = await docJson(req);
      {
        const ai = aiDangVao(req);
        const q = xin('goiAI', ai);
        if (!q.ok) return loi(res, 429, q.cau);
        ghiNhat('goiAI', ai, 1, 'viết lời');
      }
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);
      const d = await vietLoi({ doc: c.doc, brief: than?.brief });
      if (!d.ok) return loi(res, 400, d.cau);
      return json(res, 200, d);
    }

    if (p === '/api/doc-loi' && req.method === 'POST') {
      const than = await docJson(req);
      /* Tính theo SỐ KÝ TỰ vì ElevenLabs tính tiền theo ký tự — đếm "số lượt"
         thì một lượt 5000 ký tự bằng 500 lượt ngắn mà vẫn qua cửa như nhau. */
      const ai = aiDangVao(req);
      const canKyTu = String(than?.loi || '').trim().length;
      const q = xin('kyTu', ai, canKyTu);
      if (!q.ok) return loi(res, 429, q.cau);
      ghiNhat('kyTu', ai, canKyTu, `giọng ${than?.giongId || '?'}`);
      const d = await docLoi({
        loi: than?.loi, giongId: than?.giongId, model: than?.model,
        ten: than?.ten, toDo: Number(than?.toDo) || 1,
      });
      if (!d.ok) return loi(res, 400, d.cau);
      return json(res, 200, d);
    }

    /* ---------- rãnh tiếng ---------- */
    if (p === '/api/tieng' && req.method === 'GET') {
      return json(res, 200, { ok: true, kho: khoTieng() });
    }

    if (p === '/api/song-am' && req.method === 'GET') {
      const f = duongDanTieng(url.searchParams.get('src') || '');
      // Nói rõ vì sao từ chối. "400" trống không thì người dùng tưởng app hỏng.
      if (!f) return loi(res, 400, 'Đường dẫn tiếng không hợp lệ hoặc file không có.');
      const o = Math.max(40, Math.min(2000, Number(url.searchParams.get('o')) || 400));
      return json(res, 200, { ok: true, ...(await songAm(f, o)) });
    }

    if (p === '/api/videos' && req.method === 'GET') {
      return json(res, 200, { ok: true, bo: BO, videos: await danhSachVideo() });
    }

    /* ---------- khung nhấn trên clip đời cũ ---------- */
    if ((m = khop('/api/khung/:slug', p)) && req.method === 'GET') {
      const d = docKhung(m.slug);
      if (!d) {
        // Nói rõ THIẾU CÁI GÌ, đừng bắt người dùng đi hỏi mới biết.
        return json(res, 404, { ok: false, loi: 'Clip này chưa chỉnh khung được.',
          thieu: chanDoan(m.slug), quyUoc: 'docs/QUY-UOC-CLIP.md' });
      }
      return json(res, 200, { ok: true, ...d });
    }

    if ((m = khop('/api/khung/:slug', p)) && req.method === 'POST') {
      const than = await docJson(req);
      // KHÔNG ép về 'LOP'/'XOA': từ khi clip có bản ngang và bản dọc, tên mảng
      // là LOP_N / LOP_D / XOA_N / XOA_D. Ép về tên trơ là ghi nhầm mảng —
      // hoặc như vừa rồi, không tìm thấy mảng nào cả. suaKhung tự soát tên.
      const kq = suaKhung(m.slug, String(than?.kho || ''), Number(than?.chiSo), than?.box);
      return json(res, kq.ok ? 200 : 422, kq);
    }

    /* TẢI KỊCH BẢN VỀ MÁY — đường thoát khi bản chạy này không dựng được video.
       Tải đúng file JSON của dự án, mở lại bằng Motion ở máy là xuất được ngay. */
    if ((m = khop('/api/tai-kich-ban/:slug', p)) && req.method === 'GET') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên dự án không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy dự án "${slug}".`);
      /* `locSlug` đã chặn mọi thứ ngoài chữ thường, số và gạch ngang, nên tên
         file nhét thẳng vào đầu đề được — không có dấu nháy nào để mà thoát ra. */
      const than = JSON.stringify(c.doc, null, 2);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.json"`,
        'Content-Length': Buffer.byteLength(than),
        'Cache-Control': 'no-store',
      });
      return res.end(than);
    }

    /* ---------- việc nặng: xuất video, kiểm bố cục ---------- */
    if (p === '/api/export' && req.method === 'POST') {
      const than = await docJson(req);
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug, kho);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);

      const duoc = xuatDuocKhong();
      if (!duoc.ok) {
        /* KHÔNG chỉ báo lỗi rồi thôi. Người dùng muốn CÁI VIDEO; "hãy mở dự án
           trên máy làm việc" là một bức tường chứ không phải một lối đi. Trả kèm
           dấu hiệu để giao diện mở đường thoát: tải kịch bản về rồi xuất ở máy. */
        return json(res, 501, { ok: false, loi: duoc.cau, taiDuoc: true, slug, thieu: duoc.thieu });
      }
      {
        const ai = aiDangVao(req);
        const q = xin('xuat', ai);
        if (!q.ok) return loi(res, 429, q.cau);
        ghiNhat('xuat', ai, 1, slug);
      }

      const rong = c.doc?.meta?.width, cao = c.doc?.meta?.height;
      const hopLe = khoHopLe(rong, cao).map((k) => k.v);
      if (!hopLe.includes(than.preset)) {
        // Chọn khổ ngang cho clip dọc thì bộ xuất vẫn chạy và ra video cắt cụt
        // mà KHÔNG báo lỗi. Chặn ở đây.
        return loi(res, 400,
          `Khổ "${than.preset}" không hợp với clip ${rong}×${cao}. Chọn một trong: ${hopLe.join(', ')}.`);
      }

      const giay = (c.doc.scenes || []).reduce((t, s2) => t + (s2.duration || 0), 0);
      const dau = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      /* Vé cấp cho ĐÚNG người đang bấm nút, không phải một vé chung. */
      const veX = encodeURIComponent(taoVeXuat(aiDangVao(req) || ''));
      const duong = duongDanXem({ doi: 2, slug }, kho);
      const khungXem = `http://127.0.0.1:${PORT}${duong}${duong.includes('?') ? '&' : '?'}ve=${veX}`;

      /* HAI CÁCH DỰNG, và chúng KHÔNG thay thế nhau được hoàn toàn:
         · "nhanh" nhảy thẳng tới từng mốc giây — nhanh hơn và cho ra đúng một
           file mỗi lần chạy. Cần bộ dựng là hàm thuần của `t`, mà clip đời 2 thì
           đúng vậy (đo bằng tools/do-tat-dinh.mjs).
         · "trung thực" quay màn hình theo thời gian thật — chậm, nhưng đúng cả
           với trang nào còn hiệu ứng tự chạy theo đồng hồ trình duyệt.
         Mặc định để "nhanh"; ai thấy hình lạ thì đổi sang cách cũ mà đối chiếu. */
      const DINH_DANG = ['mp4', 'webm', 'gif', 'png'];
      const dinhDang = DINH_DANG.includes(than.dinhDang) ? than.dinhDang : 'mp4';
      const nhanh = than.cach !== 'trung-thuc';
      if (!nhanh && dinhDang !== 'mp4') {
        return loi(res, 400, 'Cách dựng "trung thực" chỉ ra được MP4. Chọn cách "nhanh" cho các định dạng khác.');
      }
      const duoi = dinhDang === 'png' ? 'zip' : dinhDang;
      const tenRa = `${slug}-${than.preset}-${dau}.${duoi}`;
      const v = nhanh
        ? xuatNhanh({ slug, khungXem, preset: than.preset, dinhDang, giay, tenRa })
        : xuatVideo({ slug, khungXem, preset: than.preset, chatLuong: than.chatLuong, giay,
                      tenRa: `${slug}-${than.preset}-${dau}.mp4` });
      return json(res, 200, { ok: true, id: v.id, giay, nhanh, dinhDang, dangCho: soDangCho() });
    }

    if (p === '/api/check-layout' && req.method === 'POST') {
      const than = await docJson(req);
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const veX2 = encodeURIComponent(taoVeXuat(aiDangVao(req) || ''));
      const duong2 = duongDanXem({ doi: 2, slug }, kho);
      const v = kiemBoCuc({
        slug,
        khungXem: `http://127.0.0.1:${PORT}${duong2}${duong2.includes('?') ? '&' : '?'}ve=${veX2}`,
      });
      return json(res, 200, { ok: true, id: v.id, dangCho: soDangCho() });
    }

    if ((m = khop('/api/job/:id/stream', p)) && req.method === 'GET') {
      const v = layViec(m.id);
      if (!v) return loi(res, 404, 'Việc này không còn nữa.');
      const { gui, dong } = moSSE(req, res);
      gui({ kieu: 'doi', id: v.id, trangThai: v.trangThai, chang: v.chang,
        phanTram: Math.round(v.phanTram), ketQua: v.ketQua, loi: v.loi });
      const bo = (g) => { gui(g); if (g.kieu === 'xong') { v.nghe.delete(bo); dong(); } };
      v.nghe.add(bo);
      req.on('close', () => v.nghe.delete(bo));
      return;
    }

    if ((m = khop('/api/job/:id', p)) && req.method === 'GET') {
      const v = layViec(m.id);
      if (!v) return loi(res, 404, 'Việc này không còn nữa.');
      return json(res, 200, { ok: true, id: v.id, trangThai: v.trangThai, chang: v.chang,
        phanTram: Math.round(v.phanTram), ketQua: v.ketQua, loi: v.loi,
        nhatKy: v.nhatKy.slice(-40) });
    }

    if ((m = khop('/api/job/:id/cancel', p)) && req.method === 'POST') {
      return json(res, 200, { ok: huyViec(m.id) });
    }

    if ((m = khop('/api/khoxuat/:slug', p)) && req.method === 'GET') {
      const slug = locSlug(m.slug);
      const c = slug && docClip(slug, kho);
      if (!c) return loi(res, 404, 'Không thấy clip.');
      return json(res, 200, { ok: true, kho: khoHopLe(c.doc?.meta?.width, c.doc?.meta?.height) });
    }

    /* Soát HAI TẦNG. `vanDe` là tầng hợp lệ (validateScene) — có cái này thì
       không lưu được. `chatLuong` là tầng xem được (soat.js) — chỉ để báo, KHÔNG
       chặn lưu: một clip tương phản thấp vẫn là clip hợp lệ, và người dùng có
       quyền cố tình làm vậy. Chặn lưu vì lời khuyên là cách nhanh nhất biến một
       công cụ thành thứ người ta tìm cách đi vòng. */
    if (p === '/api/validate' && req.method === 'POST') {
      const than = await docJson(req);
      const vanDe = await soatKichBan(than?.doc);
      const cl = soatChatLuong(than?.doc);
      return json(res, 200, {
        ok: vanDe.length === 0, vanDe,
        chatLuong: { soNang: cl.soNang, soNhe: cl.soNhe, loi: cl.loi },
      });
    }

    if (p.startsWith('/api/')) return loi(res, 404, `Không có đường dẫn ${p}.`);

    /* ---------- TRANG CHÀO và TRÌNH SỬA ----------
     * Từ 20/09/2026 `/` là TRANG CHÀO, không còn là trình sửa.
     *
     * Vì sao đổi: vào app là rơi thẳng vào clip đầu tiên trong thư mục — một
     * clip người dùng không chọn, và từ khi kho chia theo tài khoản thì còn có
     * thể là kho trống, tức một màn hình lỗi ngay ở nước đi đầu tiên. Trang chào
     * nói rõ công cụ này làm gì rồi để người ta tự chọn: tạo dự án mới, hay mở
     * kho dự án của mình.
     *
     * Trình sửa dời sang `/sua`, mở đúng dự án bằng `?clip=<tên>`. 21 bài kiểm
     * đã đổi theo — chúng mở `/` để lấy trình sửa. */
    if (p === '/' || p === '/kho' || p === '/kho/') {
      if (guiFile(req, res, path.join(WEB, 'chao.html'))) return;
      return loi(res, 404, 'Không thấy trang chào.');
    }
    if (p === '/sua' || p === '/sua/') {
      if (guiFile(req, res, path.join(WEB, 'index.html'))) return;
      return loi(res, 404, 'Không thấy trình sửa.');
    }

    const rel = decodeURIComponent(p.slice(1));
    // Chặn mọi đoạn bắt đầu bằng dấu chấm. Không phải vì có gì để lộ ở đây —
    // thư mục web/ toàn file tĩnh — mà vì `path.extname('.env')` trả về chuỗi
    // rỗng, nên một request kiểu `.env` sẽ trông như "route không có đuôi" và
    // rơi vào nhánh trả trang chủ bên dưới. Chặn sớm cho khỏi phải suy luận.
    if (rel.includes('..') || rel.split('/').some((d) => d.startsWith('.'))) {
      return loi(res, 403, 'Đường dẫn không hợp lệ.');
    }
    if (guiFile(req, res, path.join(WEB, rel))) return;
    // Đường dẫn không có đuôi file thì coi như route của giao diện → trả TRANG
    // CHÀO, không trả trình sửa. Trả trình sửa thì một đường gõ sai cũng mở ra
    // một clip nào đó, và người dùng tưởng mình đang ở đúng chỗ.
    if (!path.extname(rel) && guiFile(req, res, path.join(WEB, 'chao.html'))) return;
    return loi(res, 404, 'Không thấy trang.');
  } catch (e) {
    console.error('Lỗi khi xử lý', p, e);
    return loi(res, 500, e?.message || 'Lỗi không rõ ở máy chủ.');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Trình sửa clip đang chạy: http://127.0.0.1:${PORT}`);
  console.log(`   Dự án clip: ${PROJ}`);
  console.log(`   Kịch bản:   ${SCENES}`);

  /* ---------- DỰNG CƠ SỞ DỮ LIỆU ----------
   * Bước 1 của đường di trú bốn bước (xem `docs/CSDL.md`): dựng lược đồ, chạy
   * các bước di trú, rồi ĐÓNG LẠI. App chưa đọc chưa ghi gì vào đây cả.
   *
   * Vì sao vẫn mở lúc khởi động dù chưa ai dùng: đây là cách duy nhất biết lược
   * đồ có chạy được trên MÁY CHỦ THẬT hay không, trước khi có thứ gì phụ thuộc
   * vào nó. Một bước di trú hỏng thì hỏng ở đây, lúc log còn được đọc — chứ
   * không phải ba tuần nữa, giữa một lượt lưu clip.
   *
   * KHÔNG ĐƯỢC LÀM CHẾT APP. Cơ sở dữ liệu lúc này là thứ đi kèm, không phải
   * thứ trình sửa cần để chạy. Ổ đĩa đầy hay quyền sai mà kéo cả app xuống thì
   * ta vừa đổi một tính năng chưa ai dùng lấy toàn bộ công cụ. */
  try {
    const db = layCSDL();
    if (!db) throw new Error('không mở được');
    const bang = db.prepare(
      "SELECT COUNT(*) c FROM sqlite_master WHERE type='table'").get().c;
    const buoc = db.prepare('SELECT COUNT(*) c FROM di_tru').get().c;
    console.log(`   CSDL:       ${DUONG_MAC_DINH} — ${bang} bảng, ${buoc} bước di trú`);
    /* Chép danh sách tài khoản cũ (env) vào bảng — một lần, xem
       `server/nguoidung.js`. Không ai bị đá ra, không ai được thêm quyền. */
    const chep = chepTuEnv(db, { chuKho: chuKho() });
    if (chep) console.log(`   Tài khoản:  chép ${chep} tài khoản từ danh sách cũ vào CSDL`);
    if (coNguoi(db)) {
      const n = dsNguoi(db);
      console.log(`   Tài khoản:  ${n.length} người (${n.filter((x) => x.vai === 'quan_tri').length} quản trị)`
        + `${n.some((x) => x.matKhauChung) ? ` — ${n.filter((x) => x.matKhauChung).length} người còn dùng mật khẩu chung` : ''}`);
    }
  } catch (e) {
    console.error(`   CSDL:       KHÔNG dựng được — ${e.message}`);
    console.error('               (trình sửa vẫn chạy bình thường; xem docs/CSDL.md)');
  }
  /* ---------- CSDL NGOÀI (Postgres) — CHỈ KHI ĐƯỢC BẢO ----------
   *
   * Trình sửa chạy bằng SQLite. Postgres ở đây mới chỉ là chỗ để soi thử.
   *
   * PHẢI BẬT BẰNG `MOTION_DUNG_PG=1`, KHÔNG tự chạy khi thấy `DATABASE_URL`.
   * Nền tảng triển khai TỰ TIÊM biến ấy vào mỗi khi có ai gắn một CSDL vào dự
   * án — tức sự có mặt của nó nói lên ý của nền tảng, không phải ý của app.
   * Tự ý nối rồi trượt thì để lại một dòng lỗi mỗi lần khởi động, và bảng điều
   * khiển gắn cờ "phụ thuộc không với tới được" cho một dịch vụ mà app KHÔNG
   * dùng. Đã xảy ra thật 29–30/09.
   *
   * KHÔNG ĐƯỢC LÀM CHẾT APP. Chạy nền, hỏng thì chỉ in một dòng.
   */
  (async () => {
    if (!/^(1|true|có|co)$/i.test((process.env.MOTION_DUNG_PG || '').trim())) return;
    const dc = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
    if (!dc) {
      console.error('   CSDL ngoài: đã bật MOTION_DUNG_PG nhưng không thấy DATABASE_URL.');
      return;
    }
    let ten = '?';
    try { ten = `${docDiaChi(dc).host}/${docDiaChi(dc).ten}`; } catch { /* địa chỉ méo, báo ở dưới */ }
    try {
      const t = Date.now();
      const kq = await voiCSDL(dc, async (db) => ({
        ban: (await db.hoi('select version() as v')).dong[0]?.v || '?',
        bang: (await db.hoi(
          "select count(*)::int as n from information_schema.tables where table_schema = 'public'")).dong[0]?.n,
      }));
      console.log(`   CSDL ngoài: ${ten} — NỐI ĐƯỢC (${Date.now() - t}ms) · ${kq.bang} bảng`);
      console.log(`               ${String(kq.ban).split(',')[0]}`);
    } catch (e) {
      console.error(`   CSDL ngoài: ${ten} — KHÔNG nối được: ${e.message}`);
      console.error('               (trình sửa vẫn chạy bình thường bằng SQLite)');
    }
  })();

  {
    const c = chuKho();
    console.log(c
      ? `   Kho riêng:  bật — chủ kho là ${c}, người khác có kho riêng trong kho/`
      : '   Kho riêng:  tắt — chưa khai MOTION_TAI_KHOAN nên mọi người dùng chung kho gốc');
    /* Hét to ngay lúc khởi động, không nép vào một dòng info: đây là ca mất dữ
       liệu không lấy lại được, và người triển khai chỉ nhìn log đúng lúc này. */
    const oLuu = oLuuBenVung();
    if (!oLuu.hopLe) {
      console.error(`\n⚠️  NGUY: ${oLuu.lyDo}.`);
      console.error('   Dự án của mọi tài khoản KHÔNG phải chủ kho sẽ mất hẳn khi dựng lại');
      console.error('   container — kho riêng không có bản sao nào khác. Gắn volume vào');
      console.error('   /app/kho rồi chạy lại. Xem docs/KHO-RIENG.md.\n');
    }
  }
});
