# Dựng clip sao cho sửa được bằng chuột

Dán phần **"Khối để dán vào prompt"** ở cuối file này vào yêu cầu dựng clip.

---

## Vì sao cần quy ước

Trình sửa cho anh kéo mấy khung nhấn ngay trên ảnh storyboard. Muốn làm được
thế, nó phải trả lời được ba câu:

1. **Ảnh nền nằm đâu?** — để bày ra cho anh kéo lên trên
2. **Khung nào ở đâu?** — bốn con số, và bốn số đó tính theo hệ nào
3. **Sửa số xong ghi lại vào chỗ nào trong file?**

Thiếu một câu là không kéo được. Đây không phải chuyện thẩm mỹ — clip xấu đẹp
thế nào cũng được, miễn ba câu trên trả lời được.

## Bằng chứng: hai clip cùng ngày, khác hẳn nhau

| | VH-03 CEO | VH-07 Map Domain |
|---|---|---|
| Chỉnh được | **89/89 lớp** | **0** |
| Ảnh storyboard | `const MK='public/image/hinh-kich-ban-v03/'` | không có |
| Tên mảng | `LOP` | `VONG` |
| Một mục trông như | `{sc:0, k:'che', box:[193,540,382,578], a:0.5, b:1.15}` | `[12.65,16.10, 310,322, 784,100]` |
| Bốn số nghĩa là | trái, trên, **phải, dưới** | x, y, **rộng, cao** |

Cả hai đều đẹp, đều đúng nghiệp vụ. Chỉ khác cách khai dữ liệu.

## Năm quy ước

**1. Có ảnh storyboard, và khai nó ra.**

```js
const MK  = 'public/image/<thư-mục>/';   // thư mục chứa ảnh
const ANH = ['tam-1.png', 'tam-2.png'];  // theo thứ tự cảnh
```

Không có ảnh thì không có gì để kéo lên. Đây là quy ước quan trọng nhất — bốn
cái sau vô nghĩa nếu thiếu cái này.

**2. Toạ độ tính theo pixel của CHÍNH tấm ảnh đó.**

Ảnh 941×1672 thì số chạy trong 0…941 và 0…1672. Đừng quy đổi sẵn ra cỡ sân
khấu, đừng trừ phần crop. Cần co giãn thì để lúc dựng hãy nhân, giữ nguyên số
gốc trong mảng.

**3. Mảng tên `LOP` (và `XOA` cho miếng che).**

Clip có bản ngang và bản dọc thì thêm hậu tố: `LOP_N`/`LOP_D`, `ANH_N`/`ANH_D`,
`MK_N`/`MK_D`. Hậu tố phải khớp nhau giữa các mảng.

**4. Mỗi mục là một OBJECT có trường `box`, bốn số là trái–trên–phải–dưới.**

```js
const LOP = [
 {sc:0, k:'vong', box:[193, 540, 382, 578], a:0.50, b:1.15},   /* nút Thêm */
 {sc:1, k:'che',  box:[352, 441, 880, 490], mau:'#181c22', a:11.7, b:12.85},
];
```

Đừng dùng mảng vị trí `[0, 193, 540, 382, 578]`. Đừng dùng `[x, y, rộng, cao]`.

**5. Mỗi mục MỘT DÒNG, có chú thích cuối dòng.**

Hai mục chung một dòng thì bộ sửa không lần ra đúng cái nào. Chú thích cuối
dòng được lấy làm nhãn hiển thị — `/* nút Thêm */` hữu ích hơn hẳn "Vòng sáng 3".

## Không cần lo

- **Đặt tên `k` thế nào cũng được.** `vong`, `che`, `cheD`, `mo`, `sang`… bộ sửa
  nhận diện theo hình học chứ không theo tên, nên nghĩ ra kiểu hé lộ mới cũng
  không sao.
- **Thêm trường tuỳ ý.** `mau`, `mauChu`, `tat`… đều được giữ nguyên khi ghi lại.
- **Căn lề tay.** Ghi lại vẫn giữ đúng bề rộng cột.

## Thứ vốn dĩ không kéo được

Lớp bay theo đường (`tu`/`den` là mảng toạ độ) — hộp chỉ là điểm xuất phát nên
kéo cái hộp là sai ý nghĩa. Bộ sửa tự khoá, không cần làm gì.

---

## Khối để dán vào prompt

```
Dựng clip theo quy ước để sửa được bằng công cụ nội bộ:

1. Dùng ảnh storyboard làm nền, khai:
      const MK  = 'public/image/<thư-mục>/';
      const ANH = ['tam-1.png', ...];   // theo thứ tự cảnh
2. Mọi toạ độ lớp vẽ đè tính theo PIXEL CỦA CHÍNH TẤM ẢNH (vd 941×1672),
   không quy đổi sẵn ra cỡ sân khấu, không trừ phần crop.
3. Mảng đặt tên LOP (miếng che logo thì XOA). Có bản ngang + dọc thì
   dùng hậu tố khớp nhau: LOP_N/LOP_D, ANH_N/ANH_D, MK_N/MK_D.
4. Mỗi mục là OBJECT có trường box, bốn số theo thứ tự
   [trái, trên, phải, dưới]:
      {sc:0, k:'vong', box:[193, 540, 382, 578], a:0.50, b:1.15},
   KHÔNG dùng mảng vị trí, KHÔNG dùng [x, y, rộng, cao].
5. Mỗi mục một dòng, kèm chú thích cuối dòng nói nó chỉ vào cái gì:
      {sc:1, k:'che', box:[352,441,880,490], a:11.7,b:12.85},  /* dòng prompt */

Đặt tên k tuỳ ý, thêm trường tuỳ ý — không ảnh hưởng.
```
