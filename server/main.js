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
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJ, SCENES, kiemTraDuAn, soatKichBan } from './proj.js';
import { duocPhucVu, guiFile } from './static.js';
import { danhSachClip, docClip, duongDanXem, locSlug } from './clips.js';
import { chupBanGoc, lichSu } from './backup.js';
import { khoiPhuc, luuClip } from './save.js';
import { docNhap, ghiNhap, xoaNhap } from './drafts.js';
import { huyViec, khoHopLe, kiemBoCuc, layViec, soDangCho, xuatVideo } from './jobs.js';
import { chanDoan, docKhung, suaKhung } from './khung.js';
import { BO, danhSachVideo } from './videos.js';
import { docJson, json, khop, loi, moSSE } from './router.js';

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

    /* ---------- video đã xuất ---------- */
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
      const v = xuatVideo({
        slug,
        khungXem: `http://127.0.0.1:${PORT}/clip/scene-player.html?scene=${slug}`,
        preset: than.preset,
        chatLuong: than.chatLuong,
        giay,
        tenRa: `${slug}-${than.preset}-${dau}.mp4`,
      });
      return json(res, 200, { ok: true, id: v.id, giay, dangCho: soDangCho() });
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

    if (p === '/api/validate' && req.method === 'POST') {
      const than = await docJson(req);
      const vanDe = await soatKichBan(than?.doc);
      return json(res, 200, { ok: vanDe.length === 0, vanDe });
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
