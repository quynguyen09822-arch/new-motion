# Ô ② — chụp trang bằng trình duyệt thật, chọn phần, dựng thành cảnh

> Làm 28/09/2026, theo `AI_Website_Capture_Rebuild_Motion_Tool_Spec.md` của anh Quý
> (bản MVP ở §43, thêm vòng "vẽ ra — đo — sửa" của §24).

## Luồng

```
dán địa chỉ / HTML  →  [Chụp trang để xem trước]
   máy chủ: Chromium mở trang 1440×900 → chờ load + mạng lặng → cuộn hết trang
            → đo bố cục (web/dobocuc.js) → chia phần (chiaPhan) → chụp cả trang + từng phần
người dùng: XEM ảnh từng phần, kiểm đúng trang chưa → chọn một phần (hoặc "Cả trang")
   →  [Dựng cảnh từ phần này]
   máy chủ: AI nhận ẢNH phần đó + SỐ ĐO của phần đó → cảnh
            → soát JSON (soatvideo.js) + VẼ THẬT rồi đo (docanh.js) → sai thì AI sửa, tối đa 2 lượt
người dùng: xem cây món → [Nhận vào clip]   (Ctrl+Z được)
```

Stitch (ô ③) đi cùng đường nhưng tự chọn "Cả trang" và dựng luôn: một màn thiết
kế là một cảnh.

## File

| File | Việc |
|---|---|
| `server/chuptrang.js` | tìm Chromium, điều khiển bằng CDP qua `WebSocket` của Node (không gói npm), chặn mạng nội bộ, `chiaPhan`, cất lượt chụp 15 phút |
| `server/docanh.js` | vẽ cảnh AI dựng bằng `scene-player.html` thật (vào bằng vé xuất video), đo món bị cắt / chữ đè nhau |
| `server/soatvideo.js` | soát trên JSON: chữ đủ to cho video, món trong vùng máy quay thấy, không hai cụm tự đặt vùng |
| `server/tuhtml.js` | lời nhắc — luật 3 nay là "XẾP LẠI cho video", không còn "nhân toạ độ với 0,5" |
| `web/dunghinh.js` | giao diện: thẻ từng phần, chọn, dựng, quay lại chọn phần khác |
| `server/dotrang.js` + `web/dotrang.js` | đường LÙI khi máy không có Chromium: đo trong trình duyệt người dùng |

## Vì sao đi đường này

- **Đo trong iframe sandbox không cứu được website thật.** `matbao.net` đọc
  `localStorage` ngay dòng đầu, nổ, framework thay cả trang bằng "This page
  couldn't load". Trình duyệt thật mở trang ở đúng origin của nó thì không sao —
  đo được 464 khối, 14 phần.
- **Người dùng phải THẤY máy đã mở ra cái gì** trước khi tốn một lượt AI. Trước
  đây họ chỉ biết trang hỏng khi AI đã dựng xong "cảnh 7 món" từ trang báo lỗi.
- **Chia phần bằng DOM, không bằng AI nhìn ảnh.** Trang đã mở sẵn thì ranh giới
  phần nằm trong cây DOM, chính xác từng pixel, không tốn lượt AI. AI vẫn nhìn
  ảnh — ở bước dựng, là bước cần mắt.
- **Không làm GSAP / HTML xuất ra** (§14, §18 của đặc tả): Motion có bộ dựng
  chuyển động riêng; cảnh là JSON sửa được bằng chuột, không phải một trang HTML.

## Ba lỗi đã gặp khi chạy thật — đừng để quay lại

1. **"Nhân mọi toạ độ với 0,5".** Trang 1440 → khung dọc 720: tiêu đề cỡ 20, chữ
   phụ cỡ 9, tất cả dồn vào 350px đầu. Nay: chọn 5–12 món, tiêu đề ≥ 7% cạnh ngắn,
   chữ ≥ 3,3%, phủ khung, khung dọc thì hàng ngang xếp thành cột.
2. **Máy quay phóng 1,4 vào giữa khung** trong khi tiêu đề nằm sát trên → mất
   tiêu đề. Vùng thấy được: tâm (W/2+x, H/2+y), rộng W/scale, cao H/scale.
3. **Hai cụm `place: giua` + `place: duoi`** — bộ dựng đặt từng cụm theo vùng,
   không biết cụm kia cao bao nhiêu → nút bị thẻ đè nửa. Nay: một cụm dọc duy nhất.

Lỗi 1–3 JSON bắt được. Cái JSON KHÔNG bắt được — cụm cao hơn khung vì chữ xuống
dòng nhiều hơn AI tưởng — thì `docanh.js` vẽ ra mà đo (1 giây một lần).

## An toàn

Chromium chạy TRÊN MÁY CHỦ nên với được mạng nội bộ. Mọi yêu cầu con (ảnh,
script, chuyển hướng) qua `Fetch.requestPaused` và bị chặn nếu tên miền trỏ về IP
nội bộ; WebSocket chặn hết; chỉ http(s) và `data:`. Một Chromium một lúc cho cả
máy chủ (300–500 MB), hạn 60 giây, xong là giết tiến trình và xoá hồ sơ tạm.
Lượt chụp chỉ người tạo xem được. `tools/kiem-chup-trang.mjs` canh cả mấy điều này.

## Giới hạn — nói thật

- Trang chặn trình duyệt tự động (Cloudflare "Just a moment…") → báo thẳng, chỉ
  sang ô ① (chụp màn hình).
- Trang dài hơn 9.000px chỉ chụp tới đó.
- Chất lượng cảnh vẫn tuỳ AI: đã có hai lượt tự sửa theo số đo thật, nhưng không
  bảo đảm đẹp mọi lần. Luôn là đề xuất — người dùng bấm "Nhận" mới vào clip.
- Chưa có vòng so ảnh dựng với ảnh gốc theo điểm ảnh (§24 bản đầy đủ).
