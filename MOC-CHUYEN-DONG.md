# Mốc chuyển động (keyframe)

Lát 4 của nhóm B. Trước đó mỗi món chỉ có **một hiệu ứng vào + một hiệu ứng ra**,
chọn từ danh sách có sẵn. Giờ tự đặt mốc cho từng lúc.

```json
"keys": [
  { "t": 0,   "y": 100, "opacity": 0, "scale": 0.5 },
  { "t": 2,   "y": 0,   "opacity": 1, "scale": 1, "ease": "manh" },
  { "t": 4,   "y": -60, "ease": "mem" }
]
```

Năm thứ đặt mốc được: `x` · `y` · `scale` · `rotate` · `opacity`.
Tất cả đều là `transform`/`opacity` — không món nào phải dàn lại trang.

## Bốn điều phải nhớ

**1 · `t` tính theo giây CỦA CẢNH**, cùng đồng hồ với `at`, không phải giây của cả
clip. Cảnh nào cũng đếm lại từ 0, nên chép một món sang cảnh khác là chạy y nguyên.

**2 · `x`/`y` là ĐỘ DỜI**, không phải toạ độ. Toạ độ tuyệt đối vẫn nằm ở `el.x`/`el.y`
và do phần dàn trang lo. Trộn hai thứ là món nhảy về góc trên trái ngay khung đầu.
`rotate` cũng vậy: `el.rotate` là góc đứng yên, `keys[].rotate` **cộng thêm** vào đó.

**3 · Từng thuộc tính một đường riêng.** Mốc chỉ khai `x` thì `opacity` vẫn chạy theo
hai mốc gần nhất *có* khai `opacity`. Bắt mỗi mốc khai đủ mọi thứ thì người dùng đặt
mốc thứ hai để xoay là món bị ghim luôn cả vị trí lẫn độ mờ — hết chuyển động, mà
chẳng hiểu vì sao.

**4 · Có `keys` thì hiệu ứng vào/ra nghỉ hẳn.** Cho cả hai cùng ghi `transform` là
không ai đoán nổi kết quả — đúng cái bẫy `charStagger` chồng `lineStagger` đã gặp ở
lát 1. Bỏ hết mốc thì chúng trở lại.

Ngoài quãng mốc thì **giữ nguyên giá trị đầu/cuối**, không nhảy về 0.

`ease` nằm trên mốc **đích** — nó tả đường đi *tới* mốc đó, giống cách After Effects
và CSS đều hiểu. Dùng được cả 12 kiểu đà của lát 1, kể cả Bézier bốn số.

## Trong trình sửa

Mục **"Mốc chuyển động"** không bày sẵn: chưa có mốc thì chỉ hiện đúng một nút
*"Tự đặt mốc chuyển động"*, kèm câu nói rõ rằng bật lên thì hiệu ứng vào/ra sẽ nghỉ.

Bật lên thì tạo **hai** mốc, không phải một — một mốc thì chẳng có gì để nội suy, món
đứng im và người dùng tưởng tính năng hỏng.

- Dải thời gian ở trên có vạch cho từng mốc và một kim chỉ chỗ đang đứng.
- *"Thêm mốc tại chỗ kim đứng"* — tua tới chỗ ưng mắt rồi bấm, không phải nhẩm số.
  Mốc mới **chép giá trị đang hiện** tại chỗ đó; thêm mốc mà món nhảy đi chỗ khác thì
  không ai dùng được.
- Kim đang đứng ngay trên một mốc thì nút bị **khoá**, và tooltip nói rõ vì sao. Để nút
  bấm được rồi im lặng không làm gì là kiểu hỏng khó chịu nhất.
- Mỗi thuộc tính có một ô tích riêng. Chưa bật thì mờ đi — nhìn một cái là biết mốc
  này ghim những gì.

Một điều về cách app vẽ lại: `apDung()` **cố ý** không vẽ lại bảng thuộc tính (gõ từng
phím mà dựng lại cả bảng thì giật). Các núm khác không cần vì chúng tự giữ giá trị.
Bảng mốc thì đổi **cấu trúc**, nên nó tự xin vẽ lại — nhưng chỉ khi thêm/bỏ mốc hay
bật/tắt thuộc tính, không phải khi đổi con số (vẽ lại là mất chỗ con trỏ).

## Chạy kiểm

```bash
node tools/kiem-moc.mjs
```

21 mục, đo `transform` và `opacity` thật qua Chromium chứ không tin vào việc "có ghi
`keys` vào file là xong". Có cả mục canh **tính tất định** — nhảy tới cùng một giây
bằng hai đường phải ra cùng kết quả, nếu không bộ xuất video nhảy khung sẽ sai.

Đã thử phá:

| Gỡ | Số mục gãy |
|---|---|
| keyframe cầm lái | 8 |
| lọc theo từng thuộc tính | 9 |
| giữ giá trị ngoài quãng | 1 |

> Lần đầu em viết phép phá cho mục thứ hai **sai** — nó tương đương mã gốc vì bảng kết
> quả đã khởi tạo bằng giá trị mặc định, nên báo "0 mục gãy". Phép phá cũng phải kiểm
> lại, không thì nó chứng minh nhầm rằng phép kiểm vô dụng.
