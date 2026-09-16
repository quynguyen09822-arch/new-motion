# Đổi khổ hình

## Lát A — cùng tỉ lệ (đã làm)

Trong bảng thuộc tính, bấm vào thanh chỉ đường "Cả clip" → mục **Khổ hình**.
Chọn 720p / 1080p / 2K / 4K, hoặc **Khổ tự do** rồi gõ số. Hoàn tác được.

Đây là **một phép nhân**, không phải xếp lại bố cục: 1280×720 → 1920×1080 là
nhân 1,5. Mọi món giữ nguyên chỗ **tương đối**, không món nào thò ra, không chữ
nào bé đi. Đo trên `thu-ve-lai-s02`: **156/156 món giữ nguyên chỗ** trong khung.

### Khoá nào được nhân, khoá nào không

Nhân nhầm một khoá mang đơn vị **giây** là clip chạy sai nhịp. Nhân nhầm một
khoá mang đơn vị **bậc** là khoảng thở phình gấp rưỡi rồi vỡ bố cục. Cả hai đều
hỏng lặng lẽ, nên danh sách này soi từ dữ liệu thật của 11 clip chứ không đoán:

| Nhân | Không nhân |
|---|---|
| `x` `y` `w` `h` `radius` `size` `blur` | `at` `for` `in.dur` `out.dur` `draw` `shine` `lineStagger` — **giây** |
| `in.dist` `out.dist` | `pad` `gap` `margin` `soft` `softIn` `shadow` `push` — **bậc** |
| toạ độ trong `path` (khung nhấn) | `rotate` — **độ** · `opacity` `subScale` `density` — **tỉ lệ** |
| | `rows` `dots` `days` `slices` `highlight` — **số đếm** |

### Khác tỉ lệ thì TỪ CHỐI

Gõ một khổ khác tỉ lệ thì nút không cho bấm, kèm câu nói rõ vì sao. Đây là chủ
ý: co giãn thẳng sang tỉ lệ khác thì **68% khung thành dải trống** và **301 món
chữ tụt xuống dưới 11px** (`tools/soi-doi-kho.mjs` đo sẵn). Âm thầm bóp méo clip
rồi để người dùng phát hiện lúc xuất video là kiểu hỏng tệ nhất.

## Vì sao chưa "code lại theo đúng định dạng"

Bộ dựng **đã có sẵn** cơ chế đó: khoá `place` đặt món theo **vùng có tên**
(`giua` `trai` `phai` `tren` `duoi` `cao` `day`), tính bằng phần trăm sân khấu —
nên đổi khổ nào nó cũng tự xếp lại đúng. Đó chính là "code lại theo đúng định
dạng".

Vấn đề nằm ở dữ liệu, không ở cơ chế. Đo 11 clip, 1.445 món:

| | Số món | Đổi tỉ lệ thì sao |
|---|---|---|
| Khai `place` | **46** (3,2%) | tự xếp lại |
| Khai toạ độ cứng | **1.399** (96,8%) | đứng im tại chỗ cũ |

Và nó chia hai cực:

- Clip **dựng tay** (`cta`, `thuong-hieu`, `vibe-host`, `nguon-toi`,
  `kich-ban-thu`) dùng `place` cho **30–45%** số món → chuyển nốt phần còn lại
  sang `place` là việc làm được.
- Ba clip **vẽ lại giao diện sản phẩm** (`thu-trien-khai-html` 676 món,
  `thu-trien-khai-doc` 472, `thu-ve-lai-s02` 156) → **100% toạ độ cứng**. Ở đây
  "code lại" không cứu được, vì thứ cần xếp lại **không tồn tại** ở khổ dọc: một
  bảng điều khiển rộng 1280px với thanh menu bên trái, bảng số liệu ba cột và
  biểu đồ ngang thì không có cách nào nhét vào khung 1080×1920 mà còn đọc được.
  Đó là **vẽ lại giao diện**, không phải đổi khổ.

## Kiểm

```bash
node tools/kiem-kho-hinh.mjs     # phép nhân, phép từ chối, và dựng thật để so
node tools/soi-doi-kho.mjs       # đo trước: đổi sang khổ nào thì hỏng bao nhiêu
```
