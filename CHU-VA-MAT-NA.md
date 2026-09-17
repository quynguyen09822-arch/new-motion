# Đường cong, hoà trộn, mặt nạ, chữ chạy từng ký tự

Lát 1 của đợt nâng cấp motion. Bốn thứ này đều là **thuộc tính của một món**, khai
thẳng trong file clip, không cần dựng lại gì.

Phần vẽ nằm trong `scene-player.html` của dự án chung — file **không có git**. Bài
kiểm `tools/kiem-chu-mat-na.mjs` dựng cảnh thật rồi đo bằng Chromium, nên nếu ai đó
khôi phục bộ dựng từ một bản sao lưu cũ thì phép kiểm gãy ngay, chứ không hỏng lặng lẽ.

---

## 1. Đường cong tốc độ

Bốn kiểu cũ giữ **nguyên tên, nguyên kết quả** — cả kho 22 clip đang gọi chúng:

| Khai | Nghĩa |
|---|---|
| `out` | chậm dần lại |
| `inOut` | êm hai đầu |
| `back` | vượt quá rồi lùi |
| `linear` | đều tay |

Tám kiểu mới vẽ bằng đường Bézier bốn điểm, khai bằng **tên**:

| Khai | Bốn số | Dùng cho |
|---|---|---|
| `mem` | `.25 .10 .25 1` | êm, không tính cách — `ease` chuẩn của CSS |
| `ra-cham` | `0 0 .58 1` | **chữ** — vọt đi rồi hãm |
| `vao-cham` | `.42 0 1 1` | rời chỗ chậm rồi lao tới |
| `hai-dau` | `.42 0 .58 1` | nhanh ở giữa, chậm hai đầu |
| `manh` | `.16 1 .30 1` | bật rất nhanh rồi trôi — kiểu iOS |
| `ghim` | `.60 0 .40 1` | dứt khoát, đóng đinh hai đầu |
| `nay` | `.68 -.55 .27 1.55` | nhún ngược rồi vọt qua |
| `vot` | `.34 1.56 .64 1` | vọt quá đích rồi lùi về |

Hoặc khai thẳng bốn số: `"ease": [0.3, 0, 0.2, 1]`.

Tên lạ thì lùi về `out`, **không vỡ**.

### Vì sao tự giải Bézier thay vì nhờ CSS

Chuyển động ở đây tính theo **đồng hồ của clip**, không phải đồng hồ trình duyệt.
Nhờ CSS làm hộ thì tua tới giây nào cũng ra một khung khác, và mỗi lần xuất video
lại ra một kết quả khác — đúng cái bẫy mà `TICK.video` đã phải tránh.

Bộ giải đã đối chiếu với tham chiếu độc lập: lệch tối đa **2,8 × 10⁻⁷** trên 5
đường, và `[0,0,1,1]` trùng khít `linear` tới **0,0000px**.

---

## 2. Hoà vào nền — `blend`

| Khai | Trên màn hình |
|---|---|
| `thuong` | dán đè như thường (mặc định, không đặt gì) |
| `nhan` | ăn vào nền, tối đi — chữ như in lên chất liệu |
| `sang` | loé lên, sáng ra — khói, tia, vệt sáng |
| `phu` | phủ lên nhưng giữ chất nền |
| `toi` / `sang-hon` | chỉ giữ chỗ tối hơn / sáng hơn |
| `chenh` | đảo màu chỗ chồng nhau — rất mạnh, dùng ít |
| `cong` | cộng ánh sáng — vệt loé chồng nhau |

Đặt **một lần** lúc dựng nút, không tính mỗi khung hình. `thuong` thì bỏ qua hẳn:
ghi `normal` vào hàng trăm nút chỉ tổ sinh thêm lớp ghép mà không đổi hình.

---

## 3. Hiện ra theo hình — `mask`

Quy ước: chỗ **đặc** là chỗ nhìn thấy.

| Khai | Chạy theo nhịp vào? |
|---|---|
| `tron` | không — che **mãi**, dùng làm ảnh đại diện |
| `no-tron` | có — nở tròn từ giữa ra |
| `quet-phai` `quet-trai` `quet-len` `quet-xuong` | có — lộ dần theo một hướng |

Các kiểu chạy theo nhịp vào thì **hết nhịp là bỏ mặt nạ hẳn** — vừa cho mép sắc
lại, vừa đỡ phải tính mỗi khung hình.

- `maskSoft` 0..5 — nhoè mép chỗ cắt (`0 2 5 10 18 30` %)
- `maskSrc` — cắt theo hình của một ảnh riêng, thay cho mọi kiểu trên

Không khai gì thì **không đụng vào** — clip cũ giữ nguyên từng pixel.

---

## 4. Chữ chạy từng ký tự

Chỉ áp cho món `text`.

| Núm | Nghĩa |
|---|---|
| `charStagger` | giây cách nhau giữa hai chữ cái · `0` = tắt |
| `charIn` | `rise` `roi` `pop` `xoay` `nhoe` `go` `fade` |
| `charDur` | một chữ cái chạy bao lâu (mặc định `.42`) |
| `charEase` | đà của từng chữ cái (mặc định `ra-cham`) |

`charStagger` bật thì **`lineStagger` bị bỏ qua** — hai thứ cùng ghi `opacity` lên
một chỗ thì chữ nhấp nháy, và không ai đoán được vì sao.

### Hai điều dễ làm sai

**Bọc theo TỪ rồi mới tới ký tự.** Bọc thẳng từng ký tự thì trình duyệt được phép
ngắt dòng giữa thân một từ, và tiêu đề vỡ ở chỗ không ai ngờ. `.tu` giữ
`white-space: nowrap`, khoảng trắng nằm **ngoài** `.tu` để còn chỗ ngắt dòng hợp lệ.

**Đi theo nút, không cắt chuỗi HTML.** Dòng tiêu đề đã qua `rich()` nên bên trong có
sẵn `<i>` (chữ màu nhấn) và `<img>` (biểu tượng chen giữa dòng). Cắt chuỗi là xé đôi
các thẻ đó. Bài kiểm có một mục riêng canh chuyện này: `Xin chao *ban*` phải ra
**10 mảnh · 3 từ · 3 ký tự mang màu nhấn**.

---

## Chạy kiểm

```bash
node tools/kiem-chu-mat-na.mjs
```

Đã thử gỡ từng phần để chứng minh phép kiểm có răng:

| Gỡ | Số mục gãy |
|---|---|
| bộ giải Bézier | 2 |
| hoà trộn | 1 |
| mặt nạ | 3 |
| bọc từng ký tự | 2 |
