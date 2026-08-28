/**
 * BỘ ĐỊNH TUYẾN NHỎ — không dùng Express, chỉ `node:http` trần.
 *
 * Cả trình sửa không có một gói phụ thuộc nào. Lý do rất thực tế: pnpm ở đây có
 * `minimumReleaseAge` từng chặn build vì gói mới quá, và một công cụ mà người
 * không rành kỹ thuật phải dựa vào thì không nên có kiểu hỏng "cài gói thất bại".
 */

const GIOI_HAN_BODY = 8 * 1024 * 1024; // 8 MB — một kịch bản to nhất cũng chỉ vài trăm KB

export function json(res, ma, dulieu) {
  const than = JSON.stringify(dulieu);
  res.writeHead(ma, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(than),
    'Cache-Control': 'no-store',
  });
  res.end(than);
}

export function loi(res, ma, cau) {
  json(res, ma, { ok: false, loi: cau });
}

/** Đọc thân request và phân tích JSON. Ném lỗi có câu tiếng Việt nếu hỏng. */
export function docJson(req) {
  return new Promise((resolve, reject) => {
    const manh = [];
    let co = 0;
    req.on('data', (m) => {
      co += m.length;
      if (co > GIOI_HAN_BODY) {
        reject(new Error('Dữ liệu gửi lên quá lớn.'));
        req.destroy();
        return;
      }
      manh.push(m);
    });
    req.on('error', reject);
    req.on('end', () => {
      const s = Buffer.concat(manh).toString('utf8');
      if (!s.trim()) return resolve({});
      try {
        resolve(JSON.parse(s));
      } catch {
        reject(new Error('Dữ liệu gửi lên không phải JSON hợp lệ.'));
      }
    });
  });
}

/**
 * Khớp đường dẫn kiểu `/api/clip/:slug`. Trả về object tham số, hoặc null.
 */
export function khop(mau, duongDan) {
  const a = mau.split('/');
  const b = duongDan.split('/');
  if (a.length !== b.length) return null;
  const tham = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) {
      if (!b[i]) return null;
      tham[a[i].slice(1)] = decodeURIComponent(b[i]);
    } else if (a[i] !== b[i]) {
      return null;
    }
  }
  return tham;
}

/** Mở một dòng sự kiện SSE. Trả về hàm `gui(dulieu)` và hàm `dong()`. */
export function moSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Traefik/nginx không được gom đệm, nếu không tiến độ đứng hình
  });
  res.write(': mo\n\n');
  const nhip = setInterval(() => res.write(': nhip\n\n'), 20_000);
  const dong = () => {
    clearInterval(nhip);
    try {
      res.end();
    } catch {
      /* đóng rồi thì thôi */
    }
  };
  req.on('close', () => clearInterval(nhip));
  return {
    gui: (dulieu) => res.write(`data: ${JSON.stringify(dulieu)}\n\n`),
    dong,
  };
}
