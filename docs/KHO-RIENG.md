# KHO-RIENG.md — mỗi tài khoản một kho dự án

> Làm ngày 20/09/2026. Trước đó mọi người đăng nhập vào đều nhìn chung một thư
> mục `scenes/`: ai sửa gì người khác cũng thấy, và hai người mở cùng một clip
> thì người lưu sau đè người lưu trước.

## Một câu

**Đăng nhập bằng tài khoản nào thì chỉ thấy dự án của tài khoản đó.** Vào app
là vào **trang chào** (`/`) chứ không rơi thẳng vào trình sửa; trình sửa dời
sang `/sua?clip=<tên>`.

## Kho gốc không dời đi đâu cả

| Ai | Kho nằm đâu |
|---|---|
| **Chủ kho** — tài khoản đầu tiên trong `MOTION_TAI_KHOAN`, hoặc khai thẳng ở `MOTION_CHU_KHO` | **chính `scenes/` của dự án clip**, y như trước |
| Mọi tài khoản khác | `kho/<mã>/scenes/` trong thư mục ứng dụng, **trống lúc mới tạo** |
| Chưa khai `MOTION_TAI_KHOAN` | **không chia** — mọi người dùng chung kho gốc |

Chủ kho dùng thẳng thư mục cũ, **không chép, không dời, không di trú**. Đây là
quyết định quan trọng nhất của cả đợt này, và lý do không phải là lười: dự án
clip nặng 447 MB và **không có git**. Mỗi bước "dời file cho gọn" là một cơ hội
mất dữ liệu không lấy lại được, đổi lấy đúng một thứ là sự gọn gàng. Không đáng.

Hệ quả kéo theo, đều là cố ý:

- **Clip đời cũ** (file HTML ở gốc dự án clip) chỉ hiện trong kho gốc. Bày cho
  người mới thì họ mở lên, bấm mãi không sửa được, rồi tưởng công cụ hỏng — mà
  đó còn là clip của người khác.
- **Kho của người mới trống trơn**, không chép sẵn clip của ai. Thấy trong kho
  mình có sẵn clip lạ thì người ta hoặc tưởng mình làm ra chúng, hoặc sửa vào
  bản mà người khác cũng đang sửa — đúng cái chuyện tính năng này sinh ra để
  chấm dứt.
- **Chưa khai danh sách tài khoản thì không chia.** Đó là trạng thái của 28 bài
  kiểm và của mọi lần chạy thử ở máy. Đoán bừa "ai đăng nhập đầu tiên là chủ
  kho" thì người vào trước chiếm mất kho của người khác, và cách duy nhất lấy
  lại là sửa file trên máy chủ — thứ người dùng của công cụ này không làm được.

## Mã kho

`nguyen.van.a@matbao.com` → `nguyen-van-a-matbao-com-3f8c1d20`

Phần chữ để người quản trị mở thư mục ra còn đoán được của ai. **Phần băm thì
không bỏ được:** thiếu nó thì `a.b@x.com` và `a-b@x.com` cùng rút gọn thành
`a-b-x-com`, hai người dùng chung một kho — đúng cái lỗi tính năng này sinh ra
để tránh. `tools/kiem-kho-rieng.mjs` mục 9 canh riêng ca đó.

## Mỗi kho gồm những gì

```
kho/<mã>/
  scenes/           kịch bản — thứ người dùng làm ra
  nhap/             bản nháp tự lưu
  sao-luu/scenes/   bản cất trước mỗi lần ghi đè
```

Nháp và kho sao lưu **cũng phải chia**: hai người đặt trùng tên dự án là chuyện
thường (ai cũng có một clip tên `thu-nghiem`). Chung thư mục nháp thì bản đang
sửa dở của người này hiện lên trong tab người kia; chung kho sao lưu thì bấm
"quay lại bản cũ" là khôi phục nhầm vào bản của nhau.

Kho gốc giữ nguyên hai đường cũ (`.drafts/`, `.hub-video-backups/`) — đổi tên là
bỏ lại toàn bộ nháp đang dở và cả kho sao lưu, tức bỏ lại đường lùi duy nhất của
một dự án không git.

## Bộ dựng nạp kịch bản kiểu gì

Kịch bản của kho riêng nằm **ngoài** dự án clip, nên `?scene=<tên>` (bộ dựng tự
ghép thành `scenes/<tên>.json`) không tới được.

May là bộ dựng nhận cả đường dẫn tuyệt đối:

```js
const url = /^https?:|^\//.test(name) ? name : `scenes/${name}.json`;
```

Nên kho riêng chỉ cần trỏ sang `?scene=/api/kich-ban/<tên>` — **không phải sửa
`scene-player.html` của dự án chung**, file có người thay hằng ngày và sửa vào
là mất lặng lẽ. Cùng lối `server/canhmau.js` đã đi.

Ảnh và video trong clip vẫn giải tương đối theo `/clip/` như cũ: trang vẫn là
trang đó, chỉ dữ liệu đi đường khác.

**Kho gốc thì GIỮ NGUYÊN `?scene=<tên>`.** Không đổi cho "đồng bộ": 10 bài kiểm
viết cứng dạng đường dẫn ấy, và đổi một thứ đang đúng là tự chuốc rủi ro.

## Trang chào

`/` — giới thiệu công cụ, nút **Tạo dự án mới**, nút **Kho dự án của bạn**, và
lưới dự án của chính người đang đăng nhập. `web/chao.html` · `chao.css` · `chao.js`.

Vì sao đổi `/`: vào app là rơi thẳng vào clip đầu tiên trong thư mục — một clip
người dùng không chọn, và từ khi chia kho thì còn có thể là **kho trống**, tức
một màn hình lỗi ngay ở nước đi đầu tiên.

**21 bài kiểm đã đổi theo** — chúng mở `/` để lấy trình sửa, nay mở `/sua`.

## Tạo dự án mới

`POST /api/du-an` `{ ten, slug?, kho: 'ngang'|'doc'|'vuong', mau? }`

- Tên rút gọn sinh từ tên người gõ bằng `web/tenfile.js` — **một file, hai nơi
  chạy** (trình duyệt hiện tên file ngay lúc gõ, máy chủ quyết định tên thật).
  Hai bản luật đặt tên thì sớm muộn cũng lệch, và lệch ở đây nghĩa là người dùng
  thấy một tên rồi nhận một tên khác. Cùng lối `web/soat.js` đã đi.
- **Không bao giờ đè.** Trùng tên thì trả `409` kèm một tên còn trống, và để
  người dùng bấm. Tự đè là mất việc của người khác; tự thêm đuôi số lặng lẽ là
  hai dự án cùng hiện một cái tên trong danh sách.
- **Dự án trắng đi qua đúng `luuClip`**, nghĩa là qua `validateScene` như mọi
  lần lưu khác. Sinh thẳng ra file là có ngày khuôn đổi mà chỗ này không đổi
  theo, và người dùng nhận một dự án mở ra đã hỏng.
- **Trắng nhưng không rỗng:** một cảnh không có món nào vẫn hợp lệ, nhưng mở ra
  là khung đen thui. Đặt sẵn đúng một thẻ chữ mang tên dự án.
- Mẫu để chép **phải nằm trong chính kho đó**. Cho chép từ kho người khác là mở
  một cửa đọc trộm ngay trong tính năng sinh ra để tách kho.

## Cấu hình

```
MOTION_TAI_KHOAN=motion11011,ban.thiet.ke     # có danh sách → bật chia kho
MOTION_DUOI_EMAIL=@matbao.com
MOTION_CHU_KHO=motion11011                    # không khai thì lấy người đầu danh sách
```

## Chạy kiểm

```bash
node tools/kiem-kho-rieng.mjs     # 44 mục, Node trần, vài giây
npm run kiem -- kho-rieng
```

Bài này **không cần Chromium và không cần máy chủ đang chạy** — nó tự dựng hai
máy chủ trên cổng 7894/7895 rồi gọi bằng `fetch`. Nhờ vậy nó cũng là bài duy
nhất chạy được trên máy Windows.

Luật cứng của chính bài kiểm: **không bao giờ ghi với tư cách chủ kho.** Kho của
chủ kho chính là `scenes/` thật, thứ không có git. Mọi lần ghi đều đi bằng tài
khoản "người mới", nơi kho nằm trong `kho/<mã>/` và xoá được sạch. Mục 10 đối
chiếu lại: chạy xong `scenes/` phải y nguyên từng tên file.

## Giới hạn thật, nói thẳng

- **`kho/` phải gắn ổ lưu, nếu không mất hẳn khi dựng lại container.** Với kho
  gốc thì còn `.hub-video-backups` và bản chụp hằng ngày làm phao; với kho riêng
  thì `kho/` là **nơi duy nhất trên đời**. `docker-compose.yml` đã khai sẵn
  `motion-kho:/app/kho` — đừng bỏ dòng đó.

  App **tự dò và hét lên** nếu thiếu: `oLuuBenVung()` đọc `/proc/self/mountinfo`
  xem `/app/kho` có phải điểm gắn không, rồi báo ở log khởi động và bằng một dải
  đỏ ngay trên lưới dự án. Chỉ báo khi đủ ba điều kiện — kho riêng đang bật, đang
  chạy trong container, và thư mục chưa gắn ổ — vì một lời báo sai dạy người dùng
  rằng chỗ này nói nhảm, và từ đó họ bỏ qua cả lời báo đúng.
- ~~Xuất video trong kho riêng chưa chạy được.~~ **Đã vá 22/09/2026** bằng vé
  ngắn hạn có chữ ký (`taoVeXuat` trong `server/dangnhap.js`): máy chủ tự ký một
  vé sống một giờ, nhét vào `?ve=` của đường dẫn đưa cho bộ xuất, và lời đáp đầu
  tiên biến vé ấy thành cookie để hàng chục đường con (phông, ảnh, video nguồn)
  đi được. Vé mang theo email nên bộ dựng đọc đúng kho của người bấm nút.

  Vé **không phải một lần đăng nhập**: danh sách trắng `duocVaoKhiXuat` chỉ mở
  `/clip/*`, `/api/kich-ban/*`, `/api/canh-mau` và `/health` — không một đường
  ghi nào. Lỡ lọt ra ngoài thì thứ lấy được cũng chỉ là xem clip, trong một giờ.
  KHÔNG dùng cửa hậu "bỏ qua đăng nhập ở localhost": cửa hậu nào rồi cũng có
  ngày bị bật nhầm trên bản chạy thật. Canh bằng `tools/kiem-ve-xuat.mjs`.
- **Vẫn một mật khẩu chung.** Chia kho là chia *chỗ để đồ*, không phải chia
  quyền: ai biết mật khẩu và có tên trong `MOTION_TAI_KHOAN` đều đăng nhập được
  thành bất kỳ ai trong danh sách đó. Muốn thật sự tách quyền thì phải mỗi người
  một mật khẩu — xem `DANG-NHAP.md`.
