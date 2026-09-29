# Tài khoản người dùng — cho khách hàng vào dùng Motion

> Làm 28/09/2026, theo yêu cầu của anh Quý: *"tạo database của khách hàng hoặc
> của người khác vào dùng dự án của tôi"*.

## Trước và sau

| | Trước | Nay |
|---|---|---|
| Thêm một người | sửa `MOTION_TAI_KHOAN` trên Vibe Host rồi triển khai lại | bấm **Thêm người** ở trang chào |
| Mật khẩu | MỘT cái chung cho tất cả | mỗi người một cái riêng |
| Khoá một người | không có cách nào | bấm **Khoá** |
| Kho dự án | mỗi tài khoản một kho (đã có từ 20/09) | giữ nguyên |

Cách cũ có một cánh cửa mở sẵn: mật khẩu chung nghĩa là khách hàng gõ **email
của chủ kho** cũng vào được, và nhìn thấy — sửa được — toàn bộ clip của chủ.

## Chuyển sang cách mới — không ai bị đá ra

Lần khởi động đầu tiên sau khi cập nhật, máy chủ **chép** danh sách
`MOTION_TAI_KHOAN` vào bảng `nguoi_dung`, ai cũng giữ nguyên mật khẩu chung đang
dùng. Không ai mất quyền, không ai được thêm quyền. Chủ kho (`MOTION_CHU_KHO`,
hoặc tài khoản đầu danh sách) thành **quản trị**.

Từ đó trở đi **bảng quyết định** ai vào được; `MOTION_TAI_KHOAN` chỉ còn là đường
lùi khi bảng trống (bài kiểm, máy chạy thử, hoặc CSDL hỏng).

**Việc nên làm ngay sau khi cập nhật:** vào trang chào → mục *Người dùng* → tài
khoản nào còn nhãn đỏ **"còn dùng mật khẩu chung"** thì bấm *Đặt lại mật khẩu*.
Riêng tài khoản của chính mình thì đổi bằng `/api/doi-mat-khau-cua-toi` (gõ mật
khẩu cũ). Chừng nào còn nhãn đỏ thì mật khẩu chung cũ vẫn mở được tài khoản ấy.

## Dùng

Trang chào `/` → cuối trang, mục **Người dùng** (chỉ người quản trị thấy):

- **Thêm người** — nhập email, tên gọi, quyền. Máy sinh mật khẩu và hiện **đúng
  một lần**; chép hai dòng đưa cho khách. Máy chủ chỉ cất bản băm nên không có
  đường nào đọc lại — quên thì đặt cái mới.
- **Đặt lại mật khẩu** — sinh cái mới, cũng hiện một lần.
- **Khoá / Mở khoá** — khoá thì họ không vào được nữa, kho vẫn còn.
- **Xoá** — bỏ khỏi danh sách. **Kho clip của họ KHÔNG bị xoá**; thêm lại đúng
  email là thấy lại nguyên vẹn.

Hai quyền: **Người dùng** (chỉ làm clip trong kho của mình) và **Quản trị**
(thêm/khoá/xoá người khác).

## Luật cứng

1. **Không bao giờ khoá hết đường vào.** Khoá, xoá, hay hạ quyền người quản trị
   **cuối cùng** đều bị từ chối — khoá xong thì không ai vào để mở lại, và cách
   duy nhất là sửa CSDL trên máy chủ, thứ người dùng công cụ này không làm được.
2. **Xoá người không xoá kho.** Xem trên.
3. **Mật khẩu chỉ cất dạng băm** (scrypt, muối ngẫu nhiên), cùng khuôn với
   `dangnhap.js`. Không đường API nào trả về mật khẩu, trừ đúng lúc vừa sinh ra.
4. **Sai email và sai mật khẩu báo CÙNG một câu.** Nói khác nhau là chỉ cho
   người dò biết email nào có thật.
5. **Kiểm quyền ở TỪNG đường**, không kiểm một chỗ rồi tin.
6. **CSDL hỏng không được làm chết app** — `layCSDL()` trả `null`, đăng nhập rơi
   về đường cũ. Cùng luật với lúc khởi động.

## File

| File | Việc |
|---|---|
| `server/nguoidung.js` | thêm/khoá/xoá/đổi mật khẩu, chép từ env, kiểm đăng nhập |
| `server/csdl.js` | `layCSDL()` — kết nối dùng chung, hỏng thì `null` |
| `server/main.js` | `/api/nguoi-dung` (GET·POST·PATCH·DELETE), `/api/doi-mat-khau-cua-toi`, nhánh mới trong `/api/dang-nhap` |
| `web/chao.js` + `chao.html` + `chao.css` | mục *Người dùng* ở trang chào |
| `tools/kiem-nguoi-dung.mjs` | 40 mục, tự dựng máy chủ CÓ mật khẩu ở cổng 7896 |
| `server/csdl.js` (`luuChoLam`/`layChoLam`) + `csdl/003-cho-lam-viec.sql` | nhớ chỗ làm việc của từng tài khoản |
| `tools/kiem-phien-lam.mjs` | 15 mục: dự án riêng · nháp gửi lúc đóng tab · về đúng chỗ cũ |

Bảng `nguoi_dung` đã có sẵn trong `server/csdl/001-nen-mong.sql` từ 26/09 —
không phải thêm bước di trú nào.

## Bài kiểm — và một lần suýt hỏng

`tools/kiem-nguoi-dung.mjs` chạy bằng Node trần, tự dựng máy chủ riêng **có mật
khẩu** (bộ kiểm chung chạy máy chủ không mật khẩu nên không bao giờ đi vào nhánh
này), CSDL và kho đặt ở thư mục tạm qua `MOTION_CSDL` / `MOTION_GOC_KHO`.

Bản đầu của bài kiểm tạo một dự án **bằng tài khoản chủ kho** — mà kho của chủ
kho CHÍNH LÀ `scenes/` thật của dự án clip (447 MB, không có git). Nó đẻ ra
`cua-chu-kho.json` nằm giữa 11 clip thật. Đã xoá, và bài kiểm nay dùng **hai
khách hàng** để thử chuyện kho riêng. Cùng luật với `kiem-kho-rieng.mjs`:
**không bao giờ ghi với tư cách chủ kho.**

## Mỗi tài khoản giữ chỗ làm việc của mình

Anh Quý dặn "lưu phiên làm mỗi lần out ra". Ba lớp, tách bạch:

| Lớp | Ở đâu | Giữ gì |
|---|---|---|
| **Dự án** | `kho/<mã>/scenes/` — mỗi tài khoản một thư mục | clip đã lưu |
| **Nháp** | `kho/<mã>/.drafts/` | bản đang sửa dở, chưa bấm Lưu |
| **Chỗ làm việc** | bảng `cho_lam_viec` trong CSDL, khoá theo email | dự án nào, cảnh nào, giây nào |

Đóng tab thì trình duyệt gửi nốt cả hai thứ sau bằng `navigator.sendBeacon`.
Phải là beacon chứ không phải `fetch`: lúc trang đang đóng, `fetch` bị huỷ giữa
chừng. Và beacon **luôn là POST**, nên máy chủ nhận cả POST ở
`/api/draft/:slug` và `/api/cho-lam-viec` — thiếu nhánh POST thì đúng những sửa
đổi cuối cùng, thứ người ta tiếc nhất, không được lưu.

Bắt cả `pagehide` lẫn `visibilitychange`: trên điện thoại, chuyển sang app khác
rồi bị hệ điều hành thu hồi tab thì `beforeunload` không chạy.

Mở app lên mà không chỉ định dự án (`/sua` trơn) thì về **đúng dự án đang làm
dở, đúng giây**. Clip bị cắt ngắn đi thì không nhảy tới giây cũ nữa — nhảy tới
một giây không còn tồn tại là màn hình trắng mà không ai hiểu vì sao.

**Nháp vẫn chỉ là đề xuất.** Mở lại thấy nháp mới hơn file thật thì app HỎI,
không tự áp — luật cũ của `drafts.js`, không đổi.

## Chưa làm

- Quên mật khẩu thì phải nhờ người quản trị đặt lại — chưa có gửi thư.
- Chưa có màn "đổi mật khẩu của tôi" trên giao diện; đường API đã có.
- Hạn mức AI (`hanMuc`) vẫn tính theo email, chưa hiện trong bảng người dùng.
