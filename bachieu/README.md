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
dẫn qua lại — trang sửa clip **không nạp một dòng mã nào** của xưởng này.

Chiều ngược lại, xưởng mượn hai thứ của Motion, cả hai đều thuần và một chiều:
`web/phoimau.js` (bảng màu) và `web/goi.js` (dịch câu báo lỗi của máy chủ).
Chép lại thay vì mượn là tạo ra hai nơi nói hai kiểu về cùng một thứ.

`server/bay3d.js` thì đọc ngược vào `bachieu/` để biết "một cảnh hợp lệ là gì" —
cũng một chiều, và cũng vì lý do ấy.

---

## Đây là trình DỰNG CẢNH, không phải trình làm một món cho clip

Bản đầu nhốt mọi thứ trong **khung phim 9:16** và mỗi lần chỉ dựng được **một
khối**. Anh Quý nói rõ không muốn thế: muốn nó **như Blender**, dựng nhanh được
cảnh cho ra dáng chuyên nghiệp. Nên khung phim bỏ hẳn.

| | |
|---|---|
| Khung nhìn | tự do, không khổ nào gò. Kéo chuột xoay máy quay, lăn chuột phóng to thu nhỏ |
| Không có thanh thời gian | đây là chỗ dựng phối cảnh, không phải chỗ làm phim |
| Đơn vị làm việc | **cảnh** gồm nhiều món, không phải một khối |
| Danh sách món | thêm · ẩn · nhân đôi · bỏ, bấm để chọn |
| Sàn | lưới **nằm trong cảnh** nên xoay theo máy quay |
| Món mới | tự xếp vào chỗ trống và **đứng trên sàn** |
| Dời vật | **kéo thẳng trong khung nhìn**; giữ Shift để nâng hạ |
| Sửa dáng | xoay ngang · ngả · **nghiêng (bóp méo)** · **bo góc** |
| Bày từ ảnh | đưa một ảnh mẫu vào, **AI bày sẵn bối cảnh** |

### Kéo vật: đổi từ màn hình hai chiều sang không gian ba chiều

Chuột đi trên mặt phẳng, vật nằm trong không gian — phải đổi theo đúng góc máy
quay đang đứng. Bỏ qua chuyện đó là xoay máy sang bên, kéo sang phải mà vật
chạy về phía sau.

Dấu của các trục **đo thật trong trình duyệt**, không suy luận: `+z` hiện LÊN
TRÊN màn hình, nên kéo chuột xuống thì `z` phải GIẢM, có vậy vật mới bám theo
ngón tay.

Có **bẫy chia cho 0**: ngả máy về 0° là mặt sàn nhìn đúng ngang tầm, chiều sâu
bẹp thành số 0 và nhích một pixel là vật văng ra vô cực. Chặn ở `SIN_TOI_THIEU`.

### Bo góc là PHẦN TRĂM, không phải điểm ảnh

Sáu mặt phẳng bo góc thì ở mỗi **đỉnh** khối còn một lỗ hụt, to đúng bằng bán
kính. Đo trên khối 330: bo 20 còn mềm và đặc, bo 34 đã thấy hụt, **bo 48 thì
nhìn xuyên qua được**.

Để núm tính bằng điểm ảnh là mời người dùng tự vặn vào vùng hỏng — mà lỗi lại
hiện ở đỉnh khuất nên họ không hiểu vì sao hình kỳ. Nên núm là 0–100 phần trăm
của mức an toàn, và mức ấy tính theo chính kích thước khối.

### Hệ màu lấy theo Blender, và có lý do

Bản đầu để nền gần đen. Anh Quý phản hồi là **khó nhìn** — và đúng: vật tối (áo
choàng, giày đen của linh vật) chìm mất, lưới sàn không đọc được.

Blender cố ý dùng **xám trung tính**, không dùng đen. Mắt cần một mức sáng ở
GIỮA để so: nền đen thì chỉ thấy được vật sáng, nền trắng thì chỉ thấy được vật
tối.

| Chỗ | Màu | Vì sao |
|---|---|---|
| Nền khung nhìn | chuyển sắc `#4a4e55 → #303338` | xám trung tính, hơi tối dần xuống dưới cho ra chiều sâu |
| Vạch lưới | **đen mờ**, không phải trắng mờ | trên nền xám thì vạch sáng gần như biến mất; vạch tối đọc được ngay |
| Lưới hai cấp | ô 120 và ô 600 | một cấp thôi thì thu nhỏ là dính thành mảng xám, phóng to lại quá thưa |
| Trục ngang | đỏ `#BE3E3E` | lưới trơn thì đối xứng hoàn toàn, xoay một lúc là mất phương hướng |
| Trục sâu | xanh lá `#56963E` | cùng lý do, và cùng quy ước màu với Blender |
| Máy quay mở ra | nhìn xuống **28°** | dưới 20° thì sàn bẹt thành vệt mỏng, trên 50° thì vật mất dáng |

**Bóng đổ dưới chân** là thứ làm cảnh "có thật" nhiều nhất mà rẻ nhất: chỉ là
một vệt tối nằm bẹp trên sàn, không tính bóng thật. Món càng nâng cao khỏi đất
thì bóng càng loe và càng nhạt — không làm vậy thì nâng món lên mà bóng vẫn đậm
y nguyên, mắt tưởng nó còn chạm đất.

### Ba thứ tách bạch — chỗ bản đầu làm lẫn

- **Món** — đứng ở đâu, xoay bao nhiêu, to nhỏ ra sao.
- **Máy quay** — người xem đứng ở đâu nhìn vào. KHÔNG phải xoay cái cảnh.
- **Đèn** — gắn vào **thế giới**, không gắn vào máy quay.

Lẫn máy quay với xoay vật là cái bẫy kinh điển: lia máy một vòng mà mặt sáng cứ
bám theo mắt người xem, thành ra vật trông bẹt như dán lên màn hình. Tách ra thì
lia tới mặt khuất là thấy tối — đúng như ngoài đời.

---

## AI bày sẵn bối cảnh từ ảnh mẫu

**Gọi đúng tên để khỏi kỳ vọng sai: nó KHÔNG vẽ lại cái ảnh.** Gemini không
sinh được hình ba chiều — nó **chọn trong kho khối có sẵn rồi xếp đặt**. Đưa
ảnh một văn phòng vào thì nhận lại mấy khối hộp đứng đúng chỗ cái bàn cái ghế:
một **bản phác**, không phải bản sao.

Nhưng bản phác ấy đúng là phần tốn thời gian nhất khi bày tay — góc máy quay,
hướng đèn, bảng màu, vật nào đứng đâu. Phác xong thì kéo chỉnh.

Mã ở `server/bay3d.js`, mượn nguyên khuôn mẫu của `server/dungcanh.js` vì nó đã
chạy thật: ① AI chỉ được ghép từ thành phần **có sẵn** ② sinh xong **bắt buộc
qua bộ soát** ③ sai thì trả **nguyên danh sách lỗi** về cho nó tự sửa, đúng một
lượt.

### Sửa chuyện vặt tại chỗ, chỉ hỏi lại khi thật cần

Gọi AI kèm ảnh mất 30–120 giây. Bắt nó chạy lại chỉ vì quên khai một trường hay
vì `den.nen` ghi 1,4 là phí một phút của người dùng. Nên:

| Sửa tại chỗ | Hỏi lại AI |
|---|---|
| lấp trường thiếu, kẹp số quá khoảng | chế ra loại khối không có thật |
| màu sai dạng | mọi vật chồng đống lên nhau |
| **nâng vật đang chìm lên mặt đất** | cảnh nặng quá ngưỡng |
| cắt bớt khi quá số món | khai sai đơn vị (bé tí hoặc quá khổ) |

Chỉ nâng vật đang **chìm**, không đụng vật đang **bay**: vật nằm cao hơn mặt
đất có thể là thứ AI cố ý treo lên (đèn trần, biển hiệu). Kéo tuột nó xuống là
tự tay phá bố cục nó cố ý dựng — bài kiểm đã bắt đúng lỗi này.

### Kiểm được mà không cần mạng

Phần chạm mạng gói trong đúng một hàm; soạn lời nhắc, bóc JSON, chuẩn hoá, soát
đều thuần. `tools/kiem-bay-3d.mjs` nạp thẳng những thứ AI **thật sự hay trả về**
— kể cả thứ hỏng — rồi đo bằng số.

Phép kiểm quan trọng nhất: **thứ AI trả về, xưởng phải mở được**. Một cảnh "hợp
lệ" mà `boCuc()` nổ khi dựng thì người dùng chờ gần một phút rồi nhận một trang
trắng. Bài kiểm dựng thử cả 8 loại, kể cả khi AI chỉ khai mỗi `loai`.

---

## Tám loại khối

| Loại | Dùng khi |
|---|---|
| Hộp | hộp sản phẩm, gói dịch vụ |
| Thẻ lật | trước / sau khi dùng dịch vụ |
| Chữ nổi | tiêu đề có bề dày |
| Giá máy chủ | nhiều tầng xếp chồng, nhìn chéo |
| Logo khối | dấu hiệu thương hiệu trên cả sáu mặt |
| **Ống trụ** | cột, đồng xu, vòng tròn |
| **Biểu đồ cột** | khoe con số tăng trưởng |
| **Nhân vật** | linh vật Mắt Bão, ghép từ cầu và trụ |

### Linh vật — nói rõ đây là cái gì

**Không phải bản sao của hình gốc.** Hình gốc là bản dựng 3D mặt cong hữu cơ;
ghép mặt phẳng không nặn lại được thứ đó. Đây là bản **kiểu đồ chơi**: giữ đúng
tỉ lệ, dáng và màu nên nhận ra ngay là ai, nhưng mềm mại thì không bằng.

25 bộ phận, 1.180 mặt, vẽ lại một khung mất ~16 ms (tức thừa sức 60 hình/giây).
Màu **trích thẳng từ ảnh gốc bằng thống kê màu trội**, không chọn bằng mắt —
chọn bằng mắt là mỗi lần mở lại ra một tông khác.

Toạ độ mắt, lông mày đặt bằng **phép tính bám mặt cầu khuôn mặt**, không đặt mò:
`z = z₀ + √(r² − dx² − dy²)`. Đặt mò thì chúng nổi lơ lửng trước mặt, mà nhìn
thẳng từ trước lại không thấy sai — chỉ lộ ra khi xoay ngang.

Ánh nền để **0,72** chứ không dùng mức mặc định 0,42: linh vật là đồ nhựa bóng
chụp trong hộp sáng, không phải tượng đá ngoài trời. Để nền thấp là nó thành
một cục đất sét đỏ.

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

## Sáu file

| File | Việc | Chạm DOM? |
|---|---|---|
| `../server/bay3d.js` | AI bày bối cảnh từ ảnh — **thuần trừ đúng một hàm** | không |
| `hinhhoc.js` | mọi phép tính: mặt của hộp/trụ/cầu, góc quay, đèn, màu | **không** — kiểm được bằng Node |
| `khoi.js` | một món là gì, tám loại, bố cục từng loại | **không** |
| `canh.js` | một cảnh là gì: nhiều món, máy quay, đếm độ nặng | **không** |
| `ve.js` | dựng ra thẻ và vẽ tại giây `t` | có |
| `giaodien.js` | khung nhìn, danh sách món, bảng vặn | có |

Chia vậy vì lỗi 3D hay nằm ở **phép tính**, mà triệu chứng lại là "hình nhìn kỳ
kỳ" — không có lỗi, không có vệt đỏ. Để lẫn với mã dựng DOM thì phải mở trình
duyệt soi bằng mắt, và mỗi lần soi ra một kết luận khác.

---

## Luật, đo được bằng số


**Luật đếm mảnh.** Luật cũ là "khối không được chiếm quá nửa bề ngang khung
phim". Bỏ khung phim thì luật ấy hết nghĩa — nhưng **lý do** sinh ra nó vẫn còn:
máy chủ dựng phim không có chip đồ hoạ riêng.

Nên đo lại đúng thứ thật sự tốn: **tổng số mảnh trong cảnh**. Đo trên chính máy
này — 1.180 mảnh mất 16 ms một khung, tức thừa cho 60 hình/giây. Ngưỡng nhắc:
**3.500 mảnh** là chạm 30 hình/giây, **6.000** là bắt đầu ì tay.

*Bỏ một luật thì phải thay bằng luật đúng, không phải bỏ trống.*

**Không có chuyển động, và đó là chủ ý.** Bản trước có kho chuyển động, thanh
thời gian và luật "góc quay là hàm thuần của giây" — tất cả sinh ra từ giả định
xưởng làm một món để nhét vào clip. Anh Quý nói rõ: *"chỗ này để dựng phối cảnh
và nhân vật 3D chứ không phải ngồi làm video"*.

Nên cả bộ ấy **gỡ hẳn**, không giấu đi. Món vẫn xoay được, nhưng đó là **đặt
dáng** — một con số đứng yên, không phải chuyển động theo thời gian.

---

## Kiểm

```bash
node tools/kiem-ba-chieu.mjs     # hoặc: npm run kiem -- ba-chieu
```

Mười mục. Đã **thử bẻ gãy 10 kiểu** để chắc không có mục nào xanh dễ dãi — và
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
