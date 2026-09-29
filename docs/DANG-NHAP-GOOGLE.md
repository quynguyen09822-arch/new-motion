# Đăng nhập bằng Google

> Làm 28/09/2026, theo yêu cầu của anh Quý: *"đăng ký được nhiều tài khoản khác
> nhau thông qua tài khoản Google, phải verify và chính chủ đàng hoàng đủ bảo mật"*.

## Anh Quý phải làm một lần — 5 phút

Motion không tự lấy được khoá Google; phải tạo trong tài khoản Google của mình.

1. Mở **console.cloud.google.com** → tạo một dự án (hoặc chọn dự án có sẵn).
2. **APIs & Services → OAuth consent screen**:
   - Kiểu: **External** (để khách hàng ngoài công ty vào được).
   - Tên ứng dụng: `Motion — Mắt Bão`, email hỗ trợ: email của anh.
   - Scope: chỉ cần `openid`, `email`, `profile` — **không xin thêm gì**.
   - Trong lúc còn ở chế độ *Testing*, chỉ email nào anh thêm vào "Test users"
     mới đăng nhập được. Muốn mở cho mọi người thì bấm **Publish app**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs** — dán CHÍNH XÁC hai dòng:
     ```
     https://motion.n1.tinhgon.xyz/dang-nhap/google/tra-ve
     http://127.0.0.1:7803/dang-nhap/google/tra-ve
     ```
     Sai một ký tự là Google từ chối với câu `redirect_uri_mismatch`.
4. Google cho **Client ID** và **Client secret**. Khai hai biến này trên Vibe Host:

   | Biến | Giá trị |
   |---|---|
   | `GOOGLE_CLIENT_ID` | `…apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | chuỗi bí mật (đánh dấu **secret**) |
   | `MOTION_TU_DUYET_DUOI` | *(không bắt buộc)* `@matbao.com` — email đuôi này vào thẳng, khỏi chờ duyệt |

   Khai xong phải **triển khai lại** thì mới có hiệu lực.

Chưa khai thì nút "Đăng nhập bằng Google" **không hiện** — không bày nút bấm vào
rồi mới báo chưa cấu hình.

> **Client secret là bí mật.** Đừng dán vào chat, tài liệu hay commit. Dán thẳng
> vào ô biến môi trường của Vibe Host và đánh dấu *secret*.

## Người dùng thấy gì

1. Trang đăng nhập có nút **Đăng nhập bằng Google** (và vẫn giữ lối email + mật khẩu).
2. Bấm → chọn tài khoản Google → quay về Motion.
3. **Người mới**: hiện *"Tài khoản của bạn đang chờ người quản trị duyệt"*. Chưa
   dùng được gì.
4. Anh vào trang chào → mục **Người dùng** → hàng viền cam **đang chờ duyệt** →
   bấm **Duyệt cho vào** (hoặc **Từ chối**).
5. Họ đăng nhập lại là vào được, với **kho dự án riêng, trống trơn**.

Email đúng đuôi khai ở `MOTION_TU_DUYET_DUOI` thì bỏ qua bước 3–4.

## Vì sao phải chờ duyệt

Ai trên đời cũng có tài khoản Google. Cho vào thẳng là người lạ dùng được hạn
mức AI của anh (`goiAI` 300 lượt/ngày), chiếm chỗ trong kho, và tên họ nằm trong
danh sách người dùng của anh. Duyệt từng người là chặn ở đúng chỗ rẻ nhất.

## Bảo mật — bốn cửa kiểm, không bỏ cửa nào

Chỗ này sai thì ai cũng giả được người khác, nên liệt kê đủ (`server/google.js`):

| Cửa | Chặn được gì |
|---|---|
| **`state`** ký HMAC, cất trong cookie `HttpOnly`, **dùng một lần** | kẻ khác ép anh đăng nhập vào tài khoản của họ (login CSRF), và gửi lại nguyên lượt đăng nhập cũ |
| **`nonce`** | dùng lại một id_token ăn cắp được ở lượt sau |
| **Chữ ký RS256** kiểm bằng khoá công khai của Google, kèm `iss` · `aud` · `exp` | ai đó tự viết một thẻ "email: sếp@matbao.com"; hoặc mượn thẻ cấp cho ứng dụng khác |
| **`email_verified === true`** | tài khoản Google chưa xác minh email |

Thêm: **PKCE** (`code_challenge` S256) dù ứng dụng loại web đã có client secret;
`prompt=select_account` để máy dùng chung không lẳng lặng lấy tài khoản người
trước; chỉ xin đúng ba scope `openid email profile`.

Gắn tài khoản theo **`sub` của Google**, không theo email: Google Workspace đổi
được email của một người mà `sub` giữ nguyên, còn email thì có thể cấp lại cho
người khác. Email đã có tài khoản mật khẩu thì **gắn Google vào chính dòng đó**,
không đẻ dòng thứ hai — hai dòng cùng email là kho bị tách làm đôi.

## Bài kiểm — `tools/kiem-google.mjs`

Không gọi Google thật (không tự bấm được nút trong trang của họ). Bài kiểm dựng
một **Google giả**: tự sinh cặp khoá RSA, tự ký id_token, tự phơi JWKS. Nhờ vậy
thử được cả những ca Google thật không dựng lại được — thẻ hết hạn, thẻ ký bằng
khoá khác, thẻ cấp cho ứng dụng khác, thẻ của tài khoản chưa xác minh.

**Bài này đã bắt được một lỗ thật:** bản đầu cho **dùng lại `state` cũ** — xoá
cookie tạm chỉ nhờ trình duyệt quên đi, còn ai giữ được giá trị cookie thì gửi
lại nguyên lượt đăng nhập trong 10 phút vẫn vào được. Nay có sổ một-lần trong bộ
nhớ. Google cũng chỉ cho đổi `code` một lần, nhưng đó là hàng rào của người
khác — không phải thứ ta được phép dựa vào.

Bản đầu của bài kiểm còn **xanh nhầm**: nó chỉ hỏi "có vé không", nên một lỗi
500 cũng tính là "đã chặn". Nay kiểm cả mã trả về lẫn câu báo.

## Chưa làm

- Chưa gỡ được liên kết Google khỏi một tài khoản (phải xoá cả tài khoản).
- Chưa báo cho người quản trị khi có người mới đăng ký — phải tự ngó danh sách.
- Chưa có đăng nhập bằng Microsoft/Facebook. Khung trong `google.js` chép sang
  được, nhưng chưa cần thì chưa làm.
- Người bị từ chối vẫn đăng ký lại được ngay; chưa có danh sách chặn hẳn.
