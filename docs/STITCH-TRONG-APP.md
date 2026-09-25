# Tả bằng lời → Stitch vẽ giao diện → dựng thành cảnh

> Làm ngày 23/09/2026. Khác `docs/STITCH.md` ở chỗ: file kia nói về việc **người
> lập trình** dùng MCP Stitch trong Claude Code; file này nói về tính năng nằm
> **trong chính app**, người dùng cuối bấm được.

---

## 1. Vì sao làm được mà không phá luật zero-dependency

Luật cứng của repo: không gói phụ thuộc, không bước dựng.

Stitch phơi ra một máy chủ MCP ở `https://stitch.googleapis.com/mcp`, và nó là
**HTTP thuần + một khoá API** — không phải tiến trình con, không phải ống stdio,
không cần SDK. MCP qua HTTP chỉ là JSON-RPC đặt trong thân POST. `fetch` có sẵn
trong Node là đủ.

Đo thật: máy chủ tự khai `serverInfo.name = "StatelessServer"` và không đòi
`Mcp-Session-Id` nào — mỗi lời gọi đứng một mình, không phải giữ phiên.

```
POST https://stitch.googleapis.com/mcp
X-Goog-Api-Key: <khoá>
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"generate_screen_from_text",
           "arguments":{"projectId":"…","prompt":"…","deviceType":"DESKTOP"}}}
```

---

## 2. Vì sao đi đường HTML chứ không đi đường ảnh

Đưa AI một **tấm ảnh** chụp màn hình thì nó phải ĐOÁN: đệm bao nhiêu pixel, màu
chính xác là gì, chữ viết gì ở chỗ bị che.

Đưa **HTML** thì mở trong Chromium rồi hỏi `getComputedStyle` là trình duyệt ĐÃ
TÍNH HỘ — ra `padding: 24px`, ra `rgb(0,105,72)`, không đoán một con số nào.

Đo trên một màn Stitch thật: **100 khối, 58 khối chữ, 16 biểu tượng**, toạ độ và
màu chính xác từng cái. Đây chính là lý do `tools/doc-html.mjs` tồn tại.

---

## 3. Đường đi, và ba con số

```
người dùng gõ lời tả
   ↓  POST /api/stitch                      → trả mã việc NGAY (202)
Stitch vẽ màn                                ~71–128 giây   ← lâu nhất
   ↓  tải htmlCode.downloadUrl
mã HTML (24–30 KB)
   ↓  đổ vào ô HTML của thẻ "Dựng hình"
   ↓  POST /api/tu-html  (đường đã có từ trước)
tools/doc-html.mjs đọc bố cục                ~4 giây
   ↓
AI dựng thành cảnh                           ~58 giây
   ↓
ĐỀ XUẤT — người dùng bấm "Nhận vào clip" mới vào
```

**Tổng quãng khoảng hai phút rưỡi.** Đó là lý do đường này **không đồng bộ**:
Traefik và mọi proxy đứng giữa đều cắt một yêu cầu HTTP nằm chờ chừng ấy, và
người dùng nhận một lỗi mạng không nói lên điều gì trong khi lượt gọi tốn tiền
vẫn cứ chạy tiếp ở máy chủ.

### Vì sao tách làm HAI đường chứ không gộp một

Gộp một đường thì người dùng không xem được mã HTML trước khi đồng ý dựng cảnh,
và mỗi lần muốn sửa lời tả là tốn thêm một lượt AI của bước dựng cảnh. Tách ra:
vẽ lại bao nhiêu lần cũng được, ưng rồi mới dựng.

---

## 4. Vì sao KHÔNG dùng chung hàng đợi của `jobs.js`

Hàng đợi ấy cố ý **một slot**, vì `export-video.mjs` để khung hình tạm theo cwd
— hai lệnh song song đẻ ra hai video hỏng, im lặng.

Lượt gọi Stitch chỉ là **chờ mạng**, không có xung đột nào như thế. Nhét chung
là bắt người muốn vẽ giao diện xếp hàng sau một lượt xuất video dài ba phút,
không vì lý do gì. Nên `server/stitch.js` có sổ việc riêng, nhỏ, trong bộ nhớ.

---

## 5. Cấu hình

| Biến | Việc |
|---|---|
| `MOTION_STITCH_KEY` | khoá API Stitch. Không khai thì tính năng **tự ẩn** |

Khoá đọc qua `layCauHinh` (biến môi trường → `.env`). **Không bao giờ đọc
`.mcp.json`** — file đó là cấu hình của Claude Code trên máy lập trình viên,
không phải của ứng dụng. Đọc ké nó thì trên máy chủ thật không có file ấy và
tính năng chết lặng, mà lỗi lại chỉ ra ở chỗ chẳng liên quan gì.

`/api/toi-la-ai` trả thêm `coStitch` để giao diện biết TRƯỚC mà ẩn ô đi — bày ô
mời người ta tả giao diện rồi mới báo "chưa khai khoá" là bắt họ gõ xong một
đoạn văn để nhận lời từ chối.

---

## 6. Ba cái bẫy đã trả giá

### 6.1 `projectId` phải là mã TRẦN

`create_project` trả tên đầy đủ (`projects/12887117529402333834`), nhưng
`generate_screen_from_text` lại đòi mã trần (`12887117529402333834`). Đưa nguyên
tên đầy đủ vào thì nhận:

```
Requested entity was not found.
```

Một câu không hề gợi ý rằng lỗi nằm ở khuôn tham số. Mất một lượt gọi để biết.

### 6.2 Soát lời tả phải xảy ra TRƯỚC khi trừ hạn mức

Bản đầu đặt phép kiểm độ dài trong `sinhMan`, tức là trong phần **chạy nền**.
Hậu quả: đường HTTP trả `ok: true` cho một lời tả hai chữ, hạn mức bị trừ mất
một lượt, và người dùng chỉ biết mình gõ thiếu sau khi hỏi lại.

Nay `soatLoiTa()` là hàm thuần, gọi đồng bộ, và đường `/api/stitch` gọi nó
**trước** `ghiNhat('goiAI', …)`.

### 6.3 `isError` nằm TRONG `result`, không ở `error`

Lời gọi MCP đi tới nơi và trả về đúng khuôn JSON-RPC, chỉ là việc bên trong
hỏng. Không đọc cờ ấy thì ta tưởng thành công rồi đi tìm HTML trong một kết quả
rỗng, và câu báo cho người dùng sẽ nói sai chỗ.

---

## 7. Kiểm

```bash
node tools/kiem-stitch.mjs                  # cửa chặn, không gọi Stitch
STITCH_THAT=1 node tools/kiem-stitch.mjs    # gọi thật, ~2 phút, tốn hạn mức
```

Phần lớn bài chạy **không cần Stitch**, và đó là chủ ý: một lượt thật mất khoảng
90 giây và tốn hạn mức. Bài kiểm nào cũng gọi thật thì `npm run kiem` dài thêm
một phút rưỡi mỗi lần, và đỏ mỗi khi Google bận — mà một bài kiểm đỏ vu vơ thì
người ta bắt đầu bỏ qua mọi màu đỏ.

Lượt thật kiểm tới tận chốt cuối: **mã Stitch phải dựng được thành cảnh HỢP LỆ**.
Vẽ ra một trang đẹp mà `/api/tu-html` không nuốt nổi thì tính năng này vô dụng.

---

## 8. Điều chưa làm

- **Chưa dùng lại dự án Stitch.** Mỗi lượt vẽ tạo một dự án mới bên Stitch, nên
  tài khoản sẽ đầy dần. `sinhMan` đã nhận `maDuAn` để dùng lại, chỉ là chưa có
  chỗ nhớ mã ấy giữa các lượt. Bảng `thanh_phan` trong `docs/CSDL.md` là chỗ
  hợp lý để cất.
- **Chưa dùng `edit_screens`.** Stitch sửa được màn đã vẽ bằng lời ("đổi sang
  tông tối"), rẻ và nhanh hơn vẽ lại từ đầu. Đường ấy cần nhớ `maMan`, cùng chỗ
  nhớ với mục trên.
- **Chưa gỡ phông tải qua mạng.** HTML Stitch xuất ra nạp Tailwind và Google
  Fonts từ CDN. `doc-html.mjs` mở bằng `networkidle` và chờ `document.fonts.ready`
  nên số đo vẫn đúng — nhưng **máy chủ phải có đường ra Internet**, và nếu font
  không về thì mọi phép đo cỡ chữ lệch. Chưa có phép kiểm nào canh ca đó.
