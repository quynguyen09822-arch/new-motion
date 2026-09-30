#!/usr/bin/env node
/**
 * KIỂM CỬA GỌI MÁY CHỦ — không bao giờ để tiếng máy ra màn hình.
 *
 * VÌ SAO. Anh Quý gặp câu này trên giao diện (30/09):
 *
 *     Unexpected token '<', "<html> <h"... is not valid JSON
 *
 * Câu ấy vô nghĩa với người dùng: không nói hỏng gì, không nói làm gì tiếp. Nó
 * sinh ra khi mã gọi `r.json()` mà thứ nhận về là một TRANG HTML.
 *
 * Đo trên bản chạy thật: MỌI đường `/api/` của app đều trả JSON, kể cả đường
 * không tồn tại (404 JSON) và khi chưa đăng nhập (401 JSON). Nên HTML ấy đến từ
 * CỔNG PROXY đứng trước app — nó cắt yêu cầu chạy quá lâu và tự trả trang 504,
 * hoặc trả 502 lúc app đang khởi động lại. Việc AI ở đây chạy 30–180 giây nên
 * ca ấy là ca dễ gặp.
 *
 * Bài này canh: gặp trang HTML thì phải ra CÂU TIẾNG VIỆT nói đúng việc, và
 * KHÔNG được để lọt chữ kỹ thuật nào.
 *
 *   node tools/kiem-goi.mjs
 */
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const { bocTraLoi } = await import(path.join(M, 'web', 'goi.js'));

const bat = (y) => { try { return { d: bocTraLoi(y) }; } catch (e) { return { loi: e.message, e }; } };

/* Đúng thân mà cổng proxy trả về — dòng đầu chính là chuỗi anh Quý nhìn thấy. */
const TRANG_504 = '<html>\n<head><title>504 Gateway Time-out</title></head>\n<body>…</body>\n</html>';
const TRANG_502 = '<html>\n<head><title>502 Bad Gateway</title></head>\n<body>…</body>\n</html>';

console.log('\n① Trang HTML của cổng proxy → câu tiếng Việt');
{
  const a = bat({ ma: 504, kieu: 'text/html', than: TRANG_504 });
  dat('504 thì báo là việc chạy quá lâu', /quá lâu|cắt giữa chừng/i.test(a.loi || ''), a.loi);
  dat('và chỉ cách đi tiếp', /thử lại|phần nhỏ hơn/i.test(a.loi || ''));
  const b = bat({ ma: 502, kieu: 'text/html', than: TRANG_502 });
  dat('502 thì báo là máy chủ đang khởi động lại', /khởi động lại/i.test(b.loi || ''), b.loi);

  /* Điều quan trọng nhất: KHÔNG lọt tiếng máy. */
  for (const [ten, kq] of [['504', a], ['502', b]]) {
    dat(`câu báo ${ten} không lọt chữ kỹ thuật`,
      !/Unexpected token|JSON|<html|undefined|null|SyntaxError/i.test(kq.loi || ''), kq.loi);
  }
}

console.log('\n② Hết phiên đăng nhập');
{
  const a = bat({ ma: 401, kieu: 'text/html', than: '<html> <head><title>401</title></head></html>' });
  dat('401 kèm trang HTML → bảo tải lại trang để đăng nhập',
    /đăng nhập/i.test(a.loi || '') && /tải lại/i.test(a.loi || ''), a.loi);
  /* App trả JSON kèm câu của nó thì phải TÔN TRỌNG câu ấy, đừng đè bằng câu chung. */
  const b = bat({ ma: 401, kieu: 'application/json', than: '{"ok":false,"loi":"Cần đăng nhập."}' });
  dat('401 kèm JSON thì dùng đúng câu của máy chủ', b.loi === 'Cần đăng nhập.', b.loi);
}

console.log('\n③ Chuyện thường ngày vẫn chạy đúng');
{
  const a = bat({ ma: 200, kieu: 'application/json', than: '{"ok":true,"canh":{"id":"c1"}}' });
  dat('200 JSON → trả dữ liệu', a.d?.canh?.id === 'c1');
  const b = bat({ ma: 200, kieu: 'application/json', than: '{"ok":false,"loi":"Clip này không có."}' });
  dat('ok:false → ném đúng câu của máy chủ', b.loi === 'Clip này không có.');
  const c = bat({ ma: 400, kieu: 'application/json', than: '{"ok":false,"cau":"Chưa chọn ảnh."}' });
  dat('dùng được cả trường `cau`', c.loi === 'Chưa chọn ảnh.');
  const d = bat({ ma: 200, kieu: 'application/json', than: '{ hỏng' });
  dat('JSON vỡ → câu tử tế, không phải SyntaxError',
    /dữ liệu hỏng/i.test(d.loi || '') && !/SyntaxError|token/i.test(d.loi || ''), d.loi);
  /* Máy chủ quên khai `content-type` nhưng thân vẫn là JSON — đừng bắt lỗi oan. */
  const e = bat({ ma: 200, kieu: '', than: '{"ok":true,"n":5}' });
  dat('thân là JSON mà thiếu content-type thì vẫn đọc được', e.d?.n === 5, e.loi);
  const f = bat({ ma: 429, kieu: 'application/json', than: '{"ok":false,"loi":"Hết lượt hôm nay."}' });
  dat('hết lượt → đúng câu của máy chủ', f.loi === 'Hết lượt hôm nay.');
}

console.log('\n④ Mọi câu báo đều đọc được, không có tiếng máy');
{
  const ds = [504, 502, 503, 401, 403, 413, 429, 500].map((ma) =>
    bat({ ma, kieu: 'text/html', than: '<html> <head></head></html>' }).loi || '');
  dat('câu nào cũng có nội dung', ds.every((c) => c.length > 15), `ngắn nhất ${Math.min(...ds.map((c) => c.length))} ký tự`);
  dat('không câu nào lọt chữ kỹ thuật',
    ds.every((c) => !/JSON|token|HTML|fetch|undefined|Error/i.test(c)),
    ds.find((c) => /JSON|token|HTML|fetch|undefined|Error/i.test(c)) || 'sạch');
  dat('câu nào cũng là tiếng Việt có dấu', ds.every((c) => /[àáạảãâêôơưđ]/i.test(c)));
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Cửa gọi máy chủ đạt hết.\n');
process.exit(hong ? 1 : 0);
