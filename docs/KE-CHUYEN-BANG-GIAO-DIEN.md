# Kể chuyện bằng giao diện — cách dựng clip có chuyển động như video tham khảo

> Soạn 25/09/2026, từ video anh Quý gửi:
> `clip/public/video/snaptik.vn_7659400326537022738.mp4` — 22,9 giây · 1024×576 · 24 hình/giây.
>
> Mọi con số dưới đây **đo từ chính bộ dựng**, không phỏng đoán. Chỗ nào bộ dựng
> KHÔNG làm được thì ghi thẳng ở mục 5 chứ không hứa.

---

## 1. Video ấy làm gì

Trích 16 khung đều nhau rồi xem, rút ra sáu điều:

| Điều | Cụ thể trong video |
|---|---|
| **Kể bằng giao diện, không bằng lời** | bong bóng tin nhắn, app Grab, bản đồ, thông báo đẩy |
| **Máy quay BAY, không cắt** | mỗi khung là một cận cảnh; chuyển đoạn bằng zoom + dời, không cắt cứng |
| **Zoom rất sát** | có khung chỉ thấy một bong bóng chiếm 2/3 màn |
| **Nhoè khi bay nhanh** | khung "Grab", "Choose Grab" nhoè rõ — dấu hiệu tốc độ |
| **Nghiêng nhẹ** | phần tử bay vào hơi lệch trục, không thẳng đơ |
| **Mỗi khung một ý** | rất ít chữ, chữ to, nền đen ↔ trắng đổi theo đoạn |

Điều **quan trọng nhất** là cái thứ hai: cảm giác "điện ảnh" của video này không đến
từ hiệu ứng lạ, mà từ chỗ **máy quay không bao giờ đứng yên và không bao giờ cắt
cứng**.

---

## 2. Bộ dựng làm được điều đó — đã đo

`scene-player.html` có máy quay thật. Mỗi cảnh khai:

```jsonc
{ "id": "c2", "duration": 2.0,
  "camera": { "x": 60, "y": 210, "scale": 1.6 },
  "cameraMove": 0.8,          // giây bay từ camera cảnh TRƯỚC sang cảnh này
  "cameraEase": "inOut" }
```

**Bộ dựng tự nội suy từ camera của cảnh TRƯỚC.** Đây là chìa khoá, và cũng là chỗ
dễ hiểu sai nhất: bạn không khai "bay từ đâu đến đâu", bạn chỉ khai **máy quay
đứng ở đâu trong cảnh này**, còn đường bay do chênh lệch với cảnh trước sinh ra.

Đo thật trên một clip mẫu 4 cảnh (đọc `transform` của `#cam` tại từng giây):

```
0,6s → scale(1)      translate(0, 0)
2,4s → scale(1,0375) translate(-3,75,  -13,12)   ← đang bay
3,0s → scale(1,6)    translate(-60,   -210)      ← tới nơi
4,4s → scale(1,628)  translate(-58,13, -227,73)  ← đang bay tiếp
5,0s → scale(1,9)    translate(-40,   -400)
6,6s → scale(1,6015) translate(-25,95, -301,67)  ← kéo ra
7,4s → scale(1,05)   translate(0,     -120)
```

Mượt, đúng `cameraEase`, đúng `cameraMove` giây.

**Cảnh ĐẦU TIÊN không bay** — không có cảnh trước để nội suy. Muốn mở đầu bằng
một cú zoom thì phải có một cảnh đệm rất ngắn trước nó.

---

## 3. Khuôn dựng — dán vào ô "Dặn thêm" của thẻ Dựng hình

> Dựng theo lối **kể chuyện bằng giao diện**:
>
> - Mỗi cảnh **một ý duy nhất**, 1,8–2,4 giây. Thà nhiều cảnh ngắn hơn ít cảnh dài.
> - **Máy quay phải đổi ở mọi cảnh.** Khai `camera` khác cảnh trước —
>   `scale` đi 1 → 1,5 → 1,9 khi muốn dồn sự chú ý, rồi kéo về 1,0–1,1 để kết
>   đoạn cho người xem thở.
> - `cameraMove` 0,7–0,9 giây, `cameraEase: "inOut"`.
> - Phần tử vào bằng `in: { kind: "up", ease: "out", dur: 0.3–0.4 }`, và **lệch
>   nhau bằng `at`** chứ đừng vào cùng lúc: 0 → 0,25 → 0,5.
> - `rotate` 1–3 độ cho vài món, đừng cho tất cả.
> - Chữ **to và ít**. Một cảnh không quá hai câu.
>
> Giữ đúng khổ clip đang mở. Không dùng màu ngoài bộ màu của clip.

---

## 4. Ba nhịp máy quay đáng thuộc

| Nhịp | Dùng khi | Cách khai |
|---|---|---|
| **Dồn vào** | có một chi tiết cần người xem đọc | `scale` tăng 0,3–0,5 mỗi cảnh, `y` dịch tới chỗ chi tiết ấy |
| **Lướt ngang** | so sánh hai thứ cạnh nhau | giữ `scale`, chỉ đổi `x` |
| **Thở ra** | kết một đoạn, trước khi sang ý mới | `scale` về 1,0–1,1, `cameraMove` 0,9 |

Ba cú **dồn vào** liên tiếp rồi một cú **thở ra** — đó đúng là nhịp của video
tham khảo, và cũng là lý do xem không mệt.

---

## 5. Giới hạn — đã đo, đừng hứa với người dùng

- **`nut` KHÔNG nhận màu riêng.** Nó luôn vẽ bằng gradient màu nhấn của clip
  (`.k-nut` trong bộ dựng), nên khai `fill` vào là vô ích. Muốn bong bóng chat
  hai màu (xám của người này, xanh của người kia) thì dùng **`card` hoặc
  `panel`** — hai loại đó đọc `fill`.
- **Chữ dài làm bong bóng tràn khỏi khung.** `nut` nở theo độ dài `label` và
  không tự xuống dòng. Câu dài thì dùng `text` có `w`, hoặc cắt câu ngắn lại.
- **Không đổi được `meta.bg` giữa chừng** — màu nền là của cả clip. Muốn đoạn
  đen đoạn trắng như video tham khảo thì đặt một `panel` phủ kín khung ở dưới
  cùng của cảnh, rồi đổi `fill` của nó theo đoạn.
- **Không có nhoè chuyển động thật.** Video tham khảo nhoè vì quay ở 24 hình/giây
  với vật thể bay nhanh; bộ dựng chụp từng khung đứng yên nên không có vệt.
  `soft`/`softIn` là nhoè TĨNH (làm mềm mép), không thay thế được — dùng nó để
  đẩy chiều sâu thì hợp, để giả tốc độ thì không.
- **Máy quay chỉ có `x`, `y`, `scale`.** Không xoay được máy, không đổi được
  tiêu cự.

---

## 6. Muốn đi xa hơn

Hai việc sẽ nâng hẳn chất lượng, nhưng chưa làm:

1. **Đưa khuôn ở mục 3 vào thẳng lời nhắc của AI** (`server/dungcanh.js` và
   `server/tuhtml.js`).

   Ở đây tôi đã đoán sai một lần, ghi lại để người sau khỏi đoán lại: tôi tưởng
   AI "không bao giờ khai `camera`". Đếm thật trên chín clip thì ngược lại —
   `vibe-host` có 4 vị trí máy khác nhau trên 8 cảnh, `thuong-hieu` 4 trên 7,
   `thu-trien-khai-doc` 4 trên 7. Camera bay **đã có sẵn** trong kho clip.

   Nhưng lời nhắc của AI **không nhắc một chữ nào về máy quay** (`grep camera
   server/dungcanh.js` ra rỗng). Nghĩa là camera trong mấy clip trên đến từ
   người viết tay hoặc từ clip mẫu, còn cảnh AI tự dựng thì nó khai tuỳ hứng.
   Việc cần làm vì thế không phải "dạy AI dùng camera" mà là **dạy nó dùng cho
   có nhịp** — dồn, dồn, thở — thay vì đặt một con số bất kỳ.

   Hai clip đứng im hoàn toàn: `wireframe-thu` (sinh bằng Python, 6 cảnh cùng
   một vị trí máy) và `thu-ve-lai-s02` (một cảnh, không có gì để bay).
2. **Một bộ dựng sẵn "kể chuyện"** trong `web/them.js` (`KIT`): bấm một cái ra
   sẵn ba cảnh có camera dồn-dồn-thở, người dùng chỉ việc thay chữ.
