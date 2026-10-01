# Xưởng khối nổi — dự án riêng trong repo Motion

> Giai đoạn 1 của [`docs/LO-TRINH-3D.md`](../docs/LO-TRINH-3D.md).
> Vào bằng nút **“Mở xưởng”** trên trang chào của Motion, hoặc gõ thẳng
> **`/ba-chieu/`**. Trong xưởng có nút **“← Motion”** để lui về.

Dựng hình nổi (3D) để sau này gắn vào clip. **Không mượn thư viện nào** — dùng
đúng `transform-style: preserve-3d` mà trình duyệt làm sẵn.

---

## Vì sao đứng riêng

Repo này đã có hai phần mềm (`server/`+`web/` là trình sửa clip, `clip/` là bộ
dựng). Đây là phần thứ ba, và nó **cố ý không dính vào hai phần kia**:

- Lỗi 3D không được phép làm chết việc dựng clip. Trình sửa clip là thứ đang
  chạy thật cho người dùng; xưởng này còn đang thử nghiệm.
- Gỡ ra phải gọn. Thấy hướng này không ổn thì **xoá thư mục `bachieu/` + khối
  route trong `server/main.js`** là xong, không phải đi gỡ mã nằm rải rác.

### Nối với Motion

Vào bằng nút trên trang chào (dashboard), ra bằng nút “← Motion”. Chỉ là đường
dẫn qua lại — trang sửa clip **không nạp một dòng mã nào** của xưởng này, nên
xưởng hỏng thì clip vẫn chạy.

Chiều ngược lại, xưởng mượn đúng một thứ của Motion: bảng màu `web/phoimau.js`.
Không chép sang cho "sạch hẳn" vì hai nơi cùng nói về một thứ thì sớm muộn lệch
nhau, rồi bài kiểm đọc một nơi còn người dùng nhận nơi kia.

---

## Bảy loại khối

| Loại | Dùng khi |
|---|---|
| Hộp | hộp sản phẩm, gói dịch vụ |
| Thẻ lật | trước / sau khi dùng dịch vụ |
| Chữ nổi | tiêu đề có bề dày |
| Giá máy chủ | nhiều tầng xếp chồng, nhìn chéo |
| Logo khối | dấu hiệu thương hiệu trên cả sáu mặt |
| **Ống trụ** | cột, đồng xu, vòng tròn |
| **Biểu đồ cột** | khoe con số tăng trưởng |

**"Ống trụ" trông tròn nhưng vẫn là mặt phẳng.** Ghép 28 mặt hẹp quanh một trục
thì mắt thấy tròn — đứng cách màn hình một bước chân là không phân biệt được với
hình tròn thật. Nhờ mẹo đó mà có cột, đồng xu, vòng mà vẫn không mượn thư viện
nào; lộ trình vốn xếp mấy thứ này vào Giai đoạn 2.

Hai chỗ dễ sai, đều có bài kiểm canh:
- Bề rộng mỗi mặt là **dây cung** `2·r·sin(π/N)`, không phải chu vi chia N. Lấy
  nhầm thì các mặt chồng mép và viền thành răng cưa.
- Ống trụ **tròn xoay** nên quay kiểu gì cũng chỉ rộng bằng đường kính. Đo bằng
  đường chéo như khối hộp là tính dôi 41%, và lời nhắc "quá nửa khung" kêu oan.

---

## Bốn file

| File | Việc | Chạm DOM? |
|---|---|---|
| `hinhhoc.js` | mọi phép tính: góc quay, pháp tuyến, đèn, màu | **không** — nên kiểm được bằng Node |
| `khoi.js` | khối nổi là gì, năm loại, bố cục | không |
| `ve.js` | dựng ra thẻ và vẽ tại giây `t` | có |
| `giaodien.js` | bảng vặn | có |

Chia vậy vì lỗi 3D hay nằm ở **phép tính**, mà triệu chứng lại là "hình nhìn kỳ
kỳ" — không có lỗi, không có vệt đỏ. Để lẫn với mã dựng DOM thì phải mở trình
duyệt soi bằng mắt, và mỗi lần soi ra một kết luận khác.

---

## Hai luật, đo được bằng số

**Luật ① — khối không được chiếm quá nửa bề ngang khung.** Máy chủ dựng phim
không có chip đồ hoạ riêng. Đo thật: 3D phủ kín khung dọc 1080×1920 →
**18,7 hình/giây** (phim cần 30, tức sẽ giật). Chiếm nửa khung → **60**. Bảng
vặn báo ngay khi vượt mốc, và sân vẽ sẵn **vạch 50%** cho nhìn thấy.

**Luật ② — góc quay là hàm thuần của giây.** `gocTai(khoi, t)` không đọc đồng
hồ, không giữ biến đếm. Hỏng luật này là mất tua, mất chế độ xuất "vẽ kỹ", và
hai lần xuất ra hai phim khác nhau. Bộ dựng clip đã theo đúng luật này
(`render(now)`, `seek(s)` chỉ gọi `render(s)`).

---

## Kiểm

```bash
node tools/kiem-ba-chieu.mjs     # hoặc: npm run kiem -- ba-chieu
```

Chín mục. Đã **thử bẻ gãy 10 kiểu** để chắc không có mục nào xanh dễ dãi — và
lần thử ấy bắt được một chỗ xanh giả thật: mọi phép thử pháp tuyến đều dùng
vector có `x = 0`, nên một lỗi đảo dấu ở đúng số hạng chứa `x` thì không ai
thấy. Nay đã có phép thử "quay đi rồi quay về phải trở lại chỗ cũ".

---

## Còn thiếu gì (chưa làm, có chủ ý)

- **Chưa nối vào clip.** Nút "Chép mã khối" chỉ chép JSON ra. Nối vào là Giai
  đoạn 2.
- **Chưa có hình cong tự do.** Quả địa cầu có lục địa, người, xe — chưa làm
  được. Cố nặn bằng mặt phẳng thì ra thứ nhìn như đồ gấp giấy hỏng.
  (Tròn xoay thì ĐÃ làm được — xem "Ống trụ" bên dưới.)
- **Phép soát chất lượng chưa biết gì về 3D.** Ba tầng soát của trình sửa clip
  đo chữ và màu; chúng không biết khối đang bị cắt mất nửa hay quay lưng vào
  máy quay.
