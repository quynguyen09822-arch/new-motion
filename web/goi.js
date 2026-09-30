/**
 * GỌI MÁY CHỦ — một cửa duy nhất, và không bao giờ văng tiếng máy ra màn hình.
 *
 * VÌ SAO. Anh Quý gặp câu này trên giao diện (30/09):
 *
 *     Unexpected token '<', "<html> <h"... is not valid JSON
 *
 * Nó xảy ra khi mã gọi `r.json()` mà thứ nhận về lại là một TRANG HTML. Với
 * người dùng thì câu ấy vô nghĩa hoàn toàn — không nói chuyện gì đang hỏng,
 * không nói phải làm gì. Đây đúng là thứ `CLAUDE.md` §8 cấm: không để lọt từ
 * kỹ thuật ra câu chữ người dùng đọc.
 *
 * HTML ở đâu ra, khi mọi đường `/api/` của app này đều trả JSON (đã đo trên bản
 * chạy thật, kể cả đường không tồn tại)? Từ CỔNG PROXY đứng trước app:
 *
 *   · yêu cầu chạy lâu quá mức cổng cho phép → nó tự trả trang 504
 *   · app đang khởi động lại giữa lúc bấm → trang 502
 *   · mạng của người dùng đi qua một cổng chặn → trang của cổng ấy
 *
 * Mấy việc AI ở đây chạy 30–180 giây, nên ca thứ nhất là ca dễ gặp nhất.
 *
 * LUẬT: đọc THÂN về dạng chữ trước, rồi mới thử bóc. Gọi `r.json()` thẳng là
 * giao quyền viết câu báo lỗi cho trình duyệt.
 */

/** Câu báo theo mã trả về — nói ĐANG HỎNG GÌ và LÀM GÌ TIẾP. */
function cauTheoMa(ma) {
  if (ma === 502 || ma === 503) {
    return 'Máy chủ đang khởi động lại. Chờ khoảng một phút rồi bấm lại.';
  }
  if (ma === 504 || ma === 524) {
    return 'Việc này chạy lâu quá mức cho phép nên bị cắt giữa chừng. '
      + 'Thử lại với phần nhỏ hơn, hoặc chờ một lát rồi bấm lại.';
  }
  if (ma === 401 || ma === 403) {
    return 'Phiên đăng nhập đã hết. Tải lại trang để đăng nhập lại.';
  }
  if (ma === 413) return 'Thứ bạn gửi lên nặng quá mức cho phép.';
  if (ma === 429) return 'Bấm hơi nhanh, hoặc đã hết lượt hôm nay. Chờ một lát rồi thử lại.';
  return `Máy chủ trả về trang lỗi (mã ${ma}) thay vì dữ liệu.`;
}

/**
 * Bóc câu trả lời. Tách riêng khỏi phần mạng để BÀI KIỂM gọi thẳng được —
 * không cần dựng máy chủ, không cần trình duyệt.
 *
 * @returns dữ liệu đã bóc
 * @throws  Error với câu tiếng Việt đời thường
 */
export function bocTraLoi({ ma, kieu, than }) {
  const chu = String(than ?? '');
  const laJSON = /application\/json/i.test(kieu || '') || /^\s*[{[]/.test(chu);

  if (!laJSON) {
    /* Trang HTML: gần như luôn là của cổng proxy, không phải của app. Đừng in
       lại nguyên đoạn HTML — người dùng không đọc được, mà nó còn dài. */
    const cau = cauTheoMa(ma);
    const e = new Error(cau);
    e.maHTTP = ma;
    e.laTrangLoi = true;
    throw e;
  }

  let d;
  try { d = JSON.parse(chu); } catch {
    throw new Error('Máy chủ trả về dữ liệu hỏng. Tải lại trang rồi thử lại.');
  }
  /* Máy chủ này luôn nói rõ bằng `ok` + `loi`; tôn trọng câu nó viết, vì câu ấy
     biết rõ việc hơn bất cứ câu chung chung nào ở đây. */
  if (d && d.ok === false) {
    const e = new Error(d.loi || d.cau || cauTheoMa(ma));
    e.maHTTP = ma;
    throw e;
  }
  if (ma >= 400) {
    const e = new Error((d && (d.loi || d.cau)) || cauTheoMa(ma));
    e.maHTTP = ma;
    throw e;
  }
  return d;
}

/**
 * Gọi một đường API và trả về dữ liệu đã bóc.
 *
 * @param {object} [y]
 * @param {string} [y.cach]  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
 * @param {object} [y.than]  thân gửi lên, tự đóng thành JSON
 * @throws Error với câu tiếng Việt
 */
export async function goiJSON(duong, { cach = 'GET', than, ...them } = {}) {
  let r;
  try {
    r = await fetch(duong, {
      method: cach,
      ...(than !== undefined
        ? { headers: { 'Content-Type': 'application/json', ...(them.headers || {}) },
          body: JSON.stringify(than) }
        : {}),
      ...them,
    });
  } catch (e) {
    /* Mạng đứt, hoặc trang đang đóng. `fetch` ném ra "Failed to fetch" — cũng
       là tiếng máy, cũng phải dịch. */
    throw new Error(`Không gọi được máy chủ (${e.message}). Kiểm lại mạng rồi thử lại.`);
  }
  return bocTraLoi({
    ma: r.status,
    kieu: r.headers.get('content-type') || '',
    than: await r.text(),
  });
}
