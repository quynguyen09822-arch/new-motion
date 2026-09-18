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
import { danhSachClip, docClip, duongDanXem, locSlug } from './clips.js';
import { chupBanGoc, lichSu } from './backup.js';
import { khoiPhuc, luuClip } from './save.js';
import { docNhap, ghiNhap, xoaNhap } from './drafts.js';
import { duongDanTieng, khoTieng, songAm } from './tieng.js';
import { docLoi, dsGiong, GIOI_HAN_KY_TU, khoaEleven, khoaGoogle, mauGiong } from './giong.js';
import { vietLoi } from './vietloi.js';
import { hoiAI } from './hoiai.js';
import { dungCanh } from './dungcanh.js';
import { suaMon } from './suamon.js';
import { chuyenVideo, huyViec, khoHopLe, kiemBoCuc, layViec, soDangCho, xuatDuocKhong, xuatNhanh, xuatVideo } from './jobs.js';
import { THU_MUC, danhSachVideo as nguonVideo, duongDanThat, locTen, tenBanChuyen } from './nguonvideo.js';
import { chanDoan, docKhung, suaKhung } from './khung.js';
import { BO, danhSachVideo } from './videos.js';
import { docJson, json, khop, loi, moSSE } from './router.js';
// Bộ soát nằm trong web/ vì trình duyệt cũng phải tải được nó — xem đầu file đó.
import { soatChatLuong } from '../web/soat.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(GOC, 'web');
const CLIP15 = path.join(GOC, 'clip-15s');

// Skill /port sẽ truyền PORT vào. Số dự phòng chỉ dùng khi chạy tay — tránh
// 7800/7801/7802 (dự án clip, motion-ui-graphic, clipvibe-studio) và 7810
// (Library-Source), là những cổng đã có chủ trong ~/.claude/mb-ports.tsv.
const PORT = Number(process.env.PORT) || 7803;

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

  try {
    /* ---------- file của dự án clip, qua danh sách trắng ---------- */
    if (p.startsWith('/clip/')) {
      const rel = decodeURIComponent(p.slice('/clip/'.length));
      if (!duocPhucVu(rel)) return loi(res, 403, 'Không được phép đọc file này.');
      // no-store: sửa kịch bản xong bấm F5 phải thấy bản mới, không thấy bản đệm.
      if (guiFile(req, res, path.join(PROJ, rel), { cache: 'no-store' })) return;
      return loi(res, 404, 'Không thấy file trong dự án clip.');
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

    if (p === '/api/clips' && req.method === 'GET') {
      const ds = await danhSachClip();
      return json(res, 200, { ok: true, clips: ds.map((c) => ({ ...c, xem: duongDanXem(c) })) });
    }

    let m;
    if ((m = khop('/api/clip/:slug', p)) && req.method === 'GET') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const doc = docClip(slug);
      if (!doc) return loi(res, 404, `Không thấy clip "${slug}".`);
      // Nháp mới hơn file thật thì gửi kèm để giao diện HỎI, không tự áp.
      const nhap = docNhap(slug);
      const keo = nhap && nhap.luc > doc.suaLuc ? nhap : null;
      return json(res, 200, { ok: true, ...doc, nhap: keo });
    }

    /* Lưu — đi qua soát → cất bản cũ → ghi nguyên khối. Xem server/save.js. */
    if ((m = khop('/api/clip/:slug', p)) && req.method === 'POST') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      if (!docClip(slug)) return loi(res, 404, `Không thấy clip "${slug}".`);
      const than = await docJson(req);
      const kq = await luuClip(slug, than?.doc);
      if (!kq.ok) return json(res, 422, { ok: false, vanDe: kq.vanDe });
      xoaNhap(slug); // lưu xong thì nháp hết nhiệm vụ
      return json(res, 200, { ...kq, suaLuc: docClip(slug).suaLuc });
    }

    if ((m = khop('/api/draft/:slug', p)) && req.method === 'PUT') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const than = await docJson(req);
      if (!than?.doc) return loi(res, 400, 'Thiếu kịch bản.');
      ghiNhap(slug, than.doc);
      return json(res, 200, { ok: true });
    }

    if ((m = khop('/api/draft/:slug', p)) && req.method === 'DELETE') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      xoaNhap(slug);
      return json(res, 200, { ok: true });
    }

    if ((m = khop('/api/history/:slug', p)) && req.method === 'GET') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      return json(res, 200, { ok: true, ban: lichSu(slug) });
    }

    if ((m = khop('/api/restore/:slug', p)) && req.method === 'POST') {
      const slug = locSlug(m.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const than = await docJson(req);
      const kq = await khoiPhuc(slug, String(than?.dau || ''));
      if (!kq.ok) return json(res, 422, kq);
      return json(res, 200, { ...kq, ...docClip(slug) });
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
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug);
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

    if (p === '/api/dung-canh' && req.method === 'POST') {
      const than = await docJson(req);
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug);
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
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);
      const d = await hoiAI({ doc: c.doc, hoi: than?.hoi });
      if (!d.ok) return loi(res, 400, d.cau);
      return json(res, 200, d);
    }

    if (p === '/api/viet-loi' && req.method === 'POST') {
      const than = await docJson(req);
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);
      const d = await vietLoi({ doc: c.doc, brief: than?.brief });
      if (!d.ok) return loi(res, 400, d.cau);
      return json(res, 200, d);
    }

    if (p === '/api/doc-loi' && req.method === 'POST') {
      const than = await docJson(req);
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

    /* ---------- việc nặng: xuất video, kiểm bố cục ---------- */
    if (p === '/api/export' && req.method === 'POST') {
      const than = await docJson(req);
      const slug = locSlug(than?.slug);
      if (!slug) return loi(res, 400, 'Tên clip không hợp lệ.');
      const c = docClip(slug);
      if (!c) return loi(res, 404, `Không thấy clip "${slug}".`);

      const duoc = xuatDuocKhong();
      if (!duoc.ok) return loi(res, 501, duoc.cau);

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
      const khungXem = `http://127.0.0.1:${PORT}/clip/scene-player.html?scene=${slug}`;

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
      const v = kiemBoCuc({
        slug,
        khungXem: `http://127.0.0.1:${PORT}/clip/scene-player.html?scene=${slug}`,
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
      const c = slug && docClip(slug);
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

    /* ---------- giao diện trình sửa ---------- */
    const rel = p === '/' ? 'index.html' : decodeURIComponent(p.slice(1));
    // Chặn mọi đoạn bắt đầu bằng dấu chấm. Không phải vì có gì để lộ ở đây —
    // thư mục web/ toàn file tĩnh — mà vì `path.extname('.env')` trả về chuỗi
    // rỗng, nên một request kiểu `.env` sẽ trông như "route không có đuôi" và
    // rơi vào nhánh trả trang chủ bên dưới. Chặn sớm cho khỏi phải suy luận.
    if (rel.includes('..') || rel.split('/').some((d) => d.startsWith('.'))) {
      return loi(res, 403, 'Đường dẫn không hợp lệ.');
    }
    if (guiFile(req, res, path.join(WEB, rel))) return;
    // Đường dẫn không có đuôi file thì coi như route của giao diện → trả trang chủ.
    if (!path.extname(rel) && guiFile(req, res, path.join(WEB, 'index.html'))) return;
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
});
