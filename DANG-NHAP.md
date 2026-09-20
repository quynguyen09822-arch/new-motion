# Đăng nhập và logo

Đăng nhập gồm **email công ty** + **một mật khẩu chung**.

## Ai được vào: khai thẳng danh sách

```
MOTION_TAI_KHOAN=motion11011
MOTION_DUOI_EMAIL=@matbao.com
```

Tên không có phần đuôi thì tự ghép `MOTION_DUOI_EMAIL` vào —
`motion11011` hiểu thành `motion11011@matbao.com`. Nhiều người thì ngăn bằng dấu phẩy.

### Vì sao đổi sang danh sách

Bản đầu **chỉ kiểm đuôi email**, nghĩa là gõ `abc@matbao.com` — một địa chỉ không
có thật — cũng vào được. quynd chỉ ra đúng chỗ đó khi dùng thật, và đó là một lỗi
thật chứ không phải hạn chế đã biết.

Cái sai không nằm ở chỗ "chưa làm kỹ", mà ở chỗ **lớp email tạo cảm giác an toàn
giả**: nhìn vào thấy có lọc email, người ta sẽ đặt mật khẩu dễ hơn mức cần.

`tools/kiem-dang-nhap.mjs` nay có một mục canh riêng cho ca này — gõ đúng đuôi
nhưng không có trong danh sách thì vẫn phải bị chặn. Đã thử phá (gỡ danh sách,
quay về luật đuôi) → mục đó đỏ ngay.

> Vẫn nhớ: email **không được kiểm chứng bằng thư xác nhận**. Nó thu hẹp cửa vào
> và cho biết ai đang sửa, nhưng **cửa thật vẫn là mật khẩu**.
>
> Và một mật khẩu chung thì không thu hồi được quyền của riêng một người — ai
> nghỉ việc thì phải đổi mật khẩu cho tất cả. Muốn thế cần mỗi người một mật khẩu
> riêng, là một việc khác.

Email sai khuôn hoặc sai đuôi thì báo **ngay** và **không tính** vào số lần gõ sai
mật khẩu — gõ nhầm địa chỉ là chuyện thường, không phải dấu hiệu ai đó đang dò.

## Đặt mật khẩu

```bash
npm run dat-mat-khau
```

Gõ mật khẩu hai lần (không hiện trên màn hình), nó cất **dạng băm** vào `.env`
của repo này. Khởi động lại là app bắt đầu hỏi mật khẩu.

Muốn bỏ: xoá dòng `MOTION_MAT_KHAU_HASH` trong `.env`.

> **`.env` đã được `.gitignore`.** Băm mật khẩu và khoá ký phiên tuyệt đối không
> được lên GitHub. Trước khi làm tính năng này, `.env` **chưa** bị bỏ qua — đã thêm.

## Không bao giờ khoá chính chủ ra ngoài

**Chưa đặt mật khẩu thì app chạy y như trước**, chỉ hiện một chip cảnh báo *"Chưa
đặt mật khẩu"* trên thanh trên.

Bắt đăng nhập ngay khi chưa ai kịp đặt mật khẩu là khoá chính chủ ra khỏi công cụ
của họ, và cách duy nhất để vào lại là sửa file trên máy chủ — thứ mà người dùng
của công cụ này không làm được.

## Cách làm, và vì sao

| | |
|---|---|
| **Băm** | `scrypt` + muối ngẫu nhiên. Cùng một mật khẩu, hai lần băm ra hai chuỗi khác nhau — không có muối thì một bảng tra sẵn là đủ để phá. |
| **So sánh** | `timingSafeEqual`, và **kiểm độ dài trước** — hàm đó ném lỗi nếu hai bên khác độ dài, tức là một mật khẩu dài bất thường làm sập máy chủ thay vì bị từ chối. |
| **Vé phiên** | chuỗi tự chứng thực `payload.chữ-ký`, ký bằng HMAC. Không lưu trong bộ nhớ → **khởi động lại máy chủ không đá ai ra**, mà công cụ này khởi động lại rất thường xuyên. |
| **Cookie** | `HttpOnly` (script lạ không đọc được vé) · `SameSite=Lax` · `Secure` **chỉ khi thật sự chạy https**. |
| **Đếm gõ sai** | sai 8 lần trong 15 phút là khoá theo địa chỉ máy. Đang khoá thì **gõ đúng cũng không vào được** — nếu không, bộ đếm chỉ là đồ trang trí. |
| **Khoá ký** | sinh một lần rồi cất vào `.env`. Sinh mới mỗi lần khởi động là mọi người bị đá ra sau mỗi lần khởi động lại. |

`Secure` bật bừa là một cái bẫy thật: trình duyệt sẽ không gửi cookie ở
`http://127.0.0.1`, và đăng nhập thành **vòng lặp không bao giờ vào được**.

## Đường nào mở khi chưa đăng nhập

Danh sách **trắng**, không phải đen:

```
/dang-nhap  /api/dang-nhap  /api/dang-xuat  /health  /api/health
/dang-nhap.css  /logo/motion-mark.png  /logo/motion-full.png  /logo/favicon.png
```

Mọi thứ khác — kể cả `/clip/*` (file của dự án clip) — đều qua cửa.

**Lời gọi API trả `401`, trang trả `302`.** Giao diện gọi `fetch` mà nhận về trang
HTML đăng nhập thì nó vỡ ở `JSON.parse`, và người dùng thấy một lỗi vô nghĩa.

Trang bị chặn thì `302` kèm `?tiep=…` để vào xong quay lại đúng chỗ đang định tới.

## Logo

File gốc anh gửi: `public/image.png` (1254×1254, **nền trắng**, 1,25 MB). Đặt thẳng
lên giao diện tối sẽ ra một ô trắng, nên đã xử lý:

| File | Dùng ở đâu |
|---|---|
| `web/logo/motion-mark.png` | dấu M, nền trong suốt, 242×128 — thanh trên + trang đăng nhập |
| `web/logo/motion-mark-64.png` | bản nhỏ |
| `web/logo/motion-full.png` | trọn bộ có chữ — **chỉ dùng trên nền sáng** |
| `web/logo/favicon.png` | biểu tượng tab |

Tách nền trắng bằng `colorkey=0xFFFFFF:0.18:0.06`. Đã thử ba mức (0.10 / 0.18 /
0.26) và **soi trên nền tối** để bắt viền trắng còn sót; mức giữa sạch nhất.

**Chữ "Motion" trên giao diện là CHỮ THẬT, không phải ảnh.** Hai lý do: chữ trong
file logo gốc là xanh navy đậm, đặt lên nền tối gần như mất hút; và chữ nhúng
trong ảnh thì mờ khi phóng to. Ảnh chỉ lo phần dấu M.

Ảnh cao 128px thu xuống 15px nên nét vẫn sắc trên màn hình 2× — **đừng thay bằng
bản nhỏ hơn**, bài kiểm có mục canh điều đó.

## Chạy kiểm

```bash
npm run kiem                # cả 28 bài
npm run kiem -- dang-nhap   # chỉ bài đăng nhập
```

### Vì sao phải có bộ chạy riêng

Từ khi có đăng nhập, máy chủ thật đòi mật khẩu — mà 25 bài kiểm gọi thẳng vào
đường dẫn, không có vé. Ba cách xử, chỉ một cách đúng:

| | |
|---|---|
| ✗ Mở cửa hậu trong mã ("bỏ qua đăng nhập nếu gọi từ localhost") | cửa hậu nào rồi cũng có ngày bị bật nhầm trên bản chạy thật |
| ✗ Bắt 25 bài tự đăng nhập | sửa 25 file, và mỗi bài mới lại phải nhớ làm |
| ✓ **Dựng máy chủ riêng cho bài kiểm**, tắt mật khẩu bằng biến môi trường | mã nguồn không có ngoại lệ nào, máy chủ thật không bị đụng |

`npm run kiem` dựng máy chủ ở **cổng 7804**, không phải 7803 — dùng chung cổng thì
bài kiểm hoặc chiếm cổng của người dùng, hoặc âm thầm chạy vào máy chủ của họ và
sửa clip thật.

Địa chỉ truyền qua biến `MOTION_GOC`, **không qua tham số**: `kiem-canh.mjs` nhận
*tên clip* ở tham số thứ nhất, nhét địa chỉ vào đó là nó đi tìm một clip tên
`http://127.0.0.1:7804`.

### Riêng bài đăng nhập

```bash
node tools/kiem-dang-nhap.mjs
```

38 mục. Nó **dựng máy chủ riêng trên cổng khác** và truyền mật khẩu bằng biến môi
trường — không đụng `.env` thật. Mục 8 canh đúng điều đó: chạy xong `.env` phải
không có dấu vết nào của bài kiểm.

> Một bài kiểm mà sửa cấu hình thật thì chạy xong người dùng bị khoá ra ngoài.

---

# Rà soát bảo mật (18/09/2026)

Dò thật trên bản đang chạy, không đoán từ mã nguồn. Ba lỗ tìm được, đã vá cả ba.

## Lỗ 1 · Bộ đếm gõ sai bỏ qua được — nguy hiểm nhất

`diaChi()` lấy **phần đầu** của `x-forwarded-for` — thứ **người gọi tự khai được**.
Đo thật: gõ sai 12 lần kèm 12 địa chỉ giả thì **7 lần lọt**; không khai gì thì bị
khoá đủ 12/12.

Người dò mật khẩu chỉ cần đổi con số đó mỗi lần là bộ đếm không bao giờ tới ngưỡng —
tức là lớp chống dò **bị vô hiệu hoá hoàn toàn**, trong khi nó đang bảo vệ một mật
khẩu 8 ký tự.

**Vá:** lấy **phần cuối** (do proxy gần mình nhất ghi, người ngoài không chèn được),
số tầng proxy khai bằng `MOTION_SO_PROXY`. Và đếm theo **cả tài khoản**, không chỉ
theo máy — dò một tài khoản từ nhiều máy vẫn bị chặn, mà người ngồi cạnh gõ sai cũng
không khoá được người khác quá lâu.

## Lỗ 2 · Không có đầu đề bảo mật nào

Thiếu cả 5. Đã thêm: CSP · `X-Content-Type-Options` · `Referrer-Policy` ·
`Permissions-Policy` · HSTS.

Hai điều đáng nói:

- **HSTS chỉ bật khi thật sự chạy https.** Bật lúc chạy thử ở máy là tự khoá trình
  duyệt của mình khỏi `http://127.0.0.1` suốt một năm.
- **CSP từng phải cho phông Google, nay thì không.** Bản CSP đầu chặn
  `fonts.googleapis.com` và **5 bài kiểm đỏ ngay** — hồi đó 12 clip đời cũ nạp Be
  Vietnam Pro từ đó. Từ 19/09 cả bộ chữ nằm trong `clip/public/fonts/` nên CSP đã
  **đóng hẳn** nguồn phông ngoài, và bài kiểm đổi sang khẳng định chiều ngược lại.
  Xem `docs/CHU-TU-CHUA.md`.
- Dùng `frame-ancestors 'self'` chứ không phải `X-Frame-Options: DENY`: công cụ này
  **dùng iframe cùng origin** để hiện khung xem clip, cấm hết là tự bịt mắt mình.

## Lỗ 3 · Đăng nhập rồi thì đốt tiền không giới hạn

Ai vào được có thể gọi `doc-loi` liên tục, mỗi lần trừ ký tự ElevenLabs. Một mật khẩu
bị lộ — hoặc một vòng lặp viết sai lúc thử — là đốt sạch hạn mức tháng trong vài phút.

**Vá:** `server/hanmuc.js`, hạn mức theo ngày cho 6 đường tốn tiền, kèm nhật ký.

| Loại | Trần mặc định | Biến |
|---|---|---|
| ký tự đọc lời | 20.000/ngày | `MOTION_HAN_KY_TU_NGAY` |
| lượt gọi AI | 300/ngày | `MOTION_HAN_GOI_AI_NGAY` |
| lượt xuất video | 50/ngày | `MOTION_HAN_XUAT_NGAY` |

Đếm **theo ký tự** cho đọc lời, không theo lượt — một lượt 5.000 ký tự bằng 500 lượt
ngắn mà đếm lượt thì qua cửa như nhau.

Đếm theo ngày **giờ Việt Nam**, không theo UTC: "hôm nay" của người dùng phải là hôm
nay của họ.

> **Giới hạn thật, nói thẳng:** bộ đếm nằm trong bộ nhớ, **mất khi khởi động lại**.
> Muốn chắc hơn phải ghi xuống đĩa, mà bản chạy trong container chưa có chỗ ghi bền.
> Vẫn hơn hẳn không có gì — nó chặn được vòng lặp hỏng và người dùng nghịch quá tay,
> là hai ca hay xảy ra nhất.

## Những gì đã ổn sẵn

Cả 6 đường tốn tiền đều **401 khi chưa đăng nhập**. Trèo ra ngoài thư mục: thử 6 kiểu,
chặn hết. Cookie có `HttpOnly` · `SameSite` · `Secure` (đúng khi sau proxy https).

## Còn lại, chưa vá

- **Một mật khẩu chung** — không thu hồi được quyền của riêng một người.
- **Clip mất khi dựng lại** — vibehost không có công cụ gắn ổ lưu trong MCP
  (`databases: []`, không có trường volume nào).
