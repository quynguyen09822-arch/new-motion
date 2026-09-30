# Motion — trình sửa clip trực quan

> Dựng clip quảng bá bằng chuột, không phải bằng cách gõ JSON.
> **Chạy thử:** [motion.n1.tinhgon.xyz](https://motion.n1.tinhgon.xyz) · tài khoản `demo12345` / `Demo@12345`

| | |
|---|---|
| **Vấn đề** | Clip quảng bá của Mắt Bão dựng bằng kịch bản JSON. Sửa một chữ, dời một khối, đổi một màu — đều phải mở file JSON gõ tay. Người viết nội dung không làm được; mỗi lần đổi một dòng lại phải nhờ người kỹ thuật. |
| **Lời giải** | Mở clip → bấm vào thành phần trên khung hình → vặn núm ở cột phải → lưu → xuất video. Thêm bốn lối để AI dựng hộ: từ ảnh chụp màn hình, từ một trang web, từ lời tả, hoặc sửa từng món bằng câu lệnh. |
| **Quy mô** | 138 commit trong 33 ngày · 17.288 dòng JS · **47 bài kiểm tự động** · 30 tài liệu · **0 gói phụ thuộc** |

---

## Chạy thử trong 30 giây

```bash
git clone https://github.com/quynguyen09822-arch/motion.git
cd motion
npm run dev            # mở http://127.0.0.1:7803
```

Không có `npm install`, không có bước build, không có `node_modules`. Cần đúng
**Node 22** trở lên.

Hoặc bằng Docker:

```bash
docker build -t motion . && docker run -p 3000:3000 motion
```

Chưa đặt mật khẩu thì app chạy mở, không hỏi đăng nhập — tiện lúc thử. Muốn bật
đăng nhập: `npm run dat-mat-khau`, rồi khai `MOTION_TAI_KHOAN` (xem `.env.example`).

---

## Làm được gì

**Sửa bằng chuột.** Bấm vào chữ, khối, nút trên khung hình là bảng thuộc tính
bên phải hiện đúng núm của món đó. Kéo để dời, kéo tám tay nắm để co giãn, kéo
trong cây lớp để đổi thứ tự vẽ. Hoàn tác từng bước, gộp cả một lượt kéo thành
một bước.

**AI dựng cảnh — bốn lối vào:**

| Lối | Đưa vào | Hợp khi |
|---|---|---|
| ① Ảnh | ảnh chụp màn hình, bản thiết kế | có sẵn hình mẫu |
| ② Trang web | địa chỉ hoặc mã HTML | muốn dựng lại một màn hình thật |
| ③ Lời tả | một câu tiếng Việt | chưa có gì trong tay |
| ④ Sửa món | "cho chữ này to hơn, đổi sang tông tối" | đã có cảnh, muốn chỉnh |

Lối ② mở trang bằng **Chromium thật trên máy chủ**, chụp cả trang, chia thành
từng phần rồi để người dùng **xem và chọn** phần nào muốn dựng — trước khi tốn
một lượt gọi AI.

**Xuất video** MP4/WebM/GIF/PNG, nhiều khổ (16:9 · 9:16 · 1:1), có tiếng đọc AI.

**Mỗi tài khoản một kho riêng.** Khách hàng vào dùng được, không thấy dự án của
nhau. Đăng nhập bằng mật khẩu riêng hoặc bằng Google (người mới chờ duyệt).

---

## Thứ đáng xem nhất trong repo này

Không phải danh sách tính năng, mà là **cách phòng cho nó khỏi hỏng lặng lẽ**.

### 47 bài kiểm, gần như bài nào cũng sinh ra từ một lỗi thật

```bash
npm run kiem              # chạy cả bộ, tự dựng máy chủ riêng ở cổng 7804
npm run kiem -- mau       # chỉ bài có chữ "mau" trong tên
```

Vài ví dụ, mỗi bài là một lần đã trả giá:

- **`kiem-lichsu.mjs`** — làm 20 việc rồi hoàn tác 20 lần thì kịch bản phải về
  đúng **từng byte**. Bài này không được phép đỏ: đỏ nghĩa là có đường sửa lọt
  ra ngoài sổ, và người dùng mất việc mà không hiểu vì sao.
- **`kiem-anh-nho.mjs`** — đo **chỗ đặt** của ô ảnh nhỏ, vì lỗi cũ (156 ô trắng
  như nhau) qua được mọi phép kiểm "có nội dung".
- **`kiem-pg.mjs`** — chạy với một **Postgres thật** dựng bằng Docker, không giả
  lập. Nó bắt được hai lỗi trong trình nói chuyện CSDL viết tay, trong đó một
  lỗi làm hai câu hỏi chồng nhau trả về **đúng số dòng nhưng sai dữ liệu**.
- **`kiem-google.mjs`** — dựng một **"Google giả"** (tự sinh khoá RSA, tự ký
  thẻ) để thử những ca Google thật không dựng lại được: thẻ hết hạn, thẻ ký bằng
  khoá khác, thẻ cấp cho ứng dụng khác. Nó bắt được lỗ dùng lại `state`.
- **`kiem-ve-xuat.mjs`** — canh chỗ DUY NHẤT mà một đường dẫn tự nó mở được cửa
  đăng nhập. Nới ra một ly là biến chiếc chìa thành cửa sau.

### Ba tầng soát trước khi một cảnh đến tay người dùng

1. **`validateScene`** — kịch bản có hợp lệ không. Sai thì **không lưu được**.
2. **`soat.js`** — clip có xem được không (chữ chìm nền, bay vào chưa xong đã
   hết cảnh). Chỉ **báo**, không bao giờ chặn lưu.
3. **`docanh.js`** — **vẽ cảnh ra bằng trình duyệt thật rồi đo**: món có bị cắt
   khỏi khung không, chữ có đè nhau không, tương phản thật là bao nhiêu. Bắt
   được thứ hai tầng trên không thấy, vì con nằm trong cụm thì **không đoán được
   hình học từ JSON**.

### Không có gói phụ thuộc nào — và đó là quyết định, không phải lười

`package.json` trống phần `dependencies`. Một công cụ mà người không rành kỹ
thuật phải dựa vào thì không được có kiểu hỏng "cài gói thất bại". Hệ quả: khi
cần nói chuyện với Postgres, với Google OAuth, hay điều khiển Chromium — đều
viết tay phần cần dùng (`server/pg.js`, `server/google.js`, `server/chuptrang.js`).

### Câu chữ viết cho người không rành kỹ thuật

Không có "opacity", "stagger", "ease" trên giao diện. Có `tools/kiem-huong-dan.mjs`
canh khuôn viết, không phải tự nhớ.

---

## Trong repo này có gì

Repo chứa **hai phần mềm**, và đó là chủ ý — người mới nhìn vào hay tưởng nhầm
là hai dự án lẫn lộn:

| Thư mục | Là gì | Nặng |
|---|---|---|
| `server/` + `web/` | **Motion** — trình sửa clip. Đây là dự án chính. | 1,3 MB |
| `clip/` | **Bộ dựng** — `scene-player.html` biến kịch bản JSON thành hình, kèm clip mẫu và công cụ xuất video | 41 MB |
| `tools/` | 48 bài kiểm tự động + công cụ sinh kịch bản | |
| `docs/` | tài liệu kỹ thuật · `docs/ghi-chu/` là sổ tay làm việc, không cần đọc | |

Vì sao `clip/` nằm trong đây: nó vốn là dự án riêng ở máy, nhưng máy chủ trên
mạng không có nó — thiếu là app chết ngay lúc khởi động. Nên nó được gói kèm
vào ảnh Docker.

## Kiến trúc

```
Trình duyệt                          Máy chủ (node:http trần)
┌──────────────────────┐            ┌────────────────────────────┐
│ kho (store.js)       │  ──API──►  │ proj.js   cửa duy nhất sang│
│  └ mọi sửa đổi đi    │            │           dự án clip       │
│    qua kho.sua()     │            │ kho.js    kho của ai ở đâu │
│         │            │            │ save.js   sao lưu → ghi tạm│
│         ▼            │            │           → đổi tên        │
│ player.js → iframe   │            │ csdl.js   SQLite (node:    │
│ (bộ dựng scene-      │            │           sqlite, sẵn có)  │
│  player.html)        │            │ chuptrang.js  Chromium/CDP │
└──────────────────────┘            └────────────────────────────┘
```

Luồng dữ liệu **một chiều**: iframe là cái để nhìn, không bao giờ là nguồn sự
thật. Mọi thay đổi đi qua đúng một cổng (`kho.sua`) — đó là thứ khiến hoàn tác
luôn đúng.

Chi tiết: [`docs/ARCH.md`](docs/ARCH.md) · [`CLAUDE.md`](CLAUDE.md) (luật cứng
của repo, đọc trước khi sửa) · 30 tài liệu khác trong [`docs/`](docs/).

---

## Bản đã triển khai

| | |
|---|---|
| Địa chỉ | [motion.n1.tinhgon.xyz](https://motion.n1.tinhgon.xyz) |
| Tài khoản thử | `demo12345` · mật khẩu `Demo@12345` |
| Hạ tầng | Vibe Host (Mắt Bão), Docker, triển khai thẳng từ nhánh `main` |

Tài khoản thử có **kho riêng, trống**, không thấy và không sửa được dự án của
người khác.

---

## Giới hạn — nói thẳng

- **Website chạy JavaScript nặng** (kiểu `matbao.net`) có thể chặn trình duyệt
  tự động. Lúc đó app **báo thật** và chỉ sang lối ① (chụp màn hình), chứ không
  dựng bừa ra một cảnh sai.
- **Giọng đọc tiếng Việt lẫn dấu hỏi với dấu huyền** ("bảng" thành "bằng") —
  giới hạn của dịch vụ đọc, không phải của app.
- **Xuất video quay theo thời gian thật**: phim 26 giây mất ít nhất 26 giây.
- **AI cần khoá riêng** (Google AI Studio, ElevenLabs, Stitch). Không khai khoá
  thì các nút ấy **ẩn đi**, không bày ra rồi báo lỗi.

## Giấy phép

Dự án nội bộ Mắt Bão.
