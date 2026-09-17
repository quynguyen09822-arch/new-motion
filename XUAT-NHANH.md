# Xuất video nhanh — nhảy từng khung, chia luồng, bốn định dạng

Lát 2. Bộ xuất cũ (`export-video.mjs`) **vẫn còn nguyên** và vẫn chọn được — đây
là thêm một cách, không phải thay.

## Hai cách dựng, khác nhau ở đâu

| | Nhanh (mới) | Trung thực (cũ) |
|---|---|---|
| Cách hứng hình | nhảy thẳng tới từng mốc giây rồi chụp | quay màn hình theo thời gian thật |
| Chạy hai lần | ra **đúng một file** | mỗi lần lệch một ít |
| Rớt khung | không thể — khung `n` luôn là giây `n/fps` | có, và lệch bao nhiêu thì mỗi lần một khác |
| Chia luồng | 4 luồng | không |
| Định dạng | MP4 · WebM · GIF · chuỗi ảnh PNG | chỉ MP4 |
| Núm "chất lượng" | không dùng | có |

Mặc định là **Nhanh**. Giữ lại cách cũ làm đối chứng: nghi hình ra sai thì dựng
lại bằng cách cũ mà so.

## Vì sao giờ mới làm được

Chú thích trong bộ xuất cũ ghi rõ là **không được** nhảy khung, vì vài hiệu ứng
chạy theo đồng hồ trình duyệt. Điều đó **đã hết đúng**:

- `TICK.video` kéo cả phim lồng bên trong về đồng hồ của clip;
- `kiem-hieu-ung` canh mọi hiệu ứng phải là hàm thuần của `t`.

Đã đo lại bằng `tools/do-tat-dinh.mjs`: **24/24 mốc khớp**, cả khi tua ngược lẫn
khi nạp lại trang từ đầu.

## Số đo — và vì sao không được tin số cũ

Trên máy 12 lõi lúc **rảnh**:

| | |
|---|---|
| Nhảy tới một khung | 5,2ms |
| Chụp khung đó | 47,9ms |
| → nút thắt | khâu **chụp**, chiếm 89% |
| 4 luồng so với quay thật | **nhanh gấp 2,8 lần** |

Cũng phép đo đó lúc máy **tải 23 trên 12 lõi**: 80–210ms mỗi khung — tức là còn
**chậm hơn** quay thật. Chênh hơn bốn lần chỉ vì tải máy.

> Cần quyết thì chạy lại `tools/do-toc-xuat.mjs` và đọc luôn dòng tải máy nó in ra.
> Đừng trích số trong tài liệu này.

Đó cũng là lý do bài kiểm **không đặt ngưỡng tốc độ**: một phép kiểm đỏ vì máy bận
còn tệ hơn không có phép kiểm.

## Vài chỗ dễ làm sai

**Chia việc xen kẽ, không chia theo đoạn liền.** Luồng `k` lo các khung
`k, k+4, k+8…`. Chia theo đoạn liền thì luồng nào trúng cảnh nặng sẽ chạy lâu hơn
hẳn và cả bộ phải đợi nó.

**Số luồng không bao giờ quá nửa số lõi.** Mỗi luồng là một Chromium; ăn hết lõi
thì các luồng giành nhau và tổng thời gian còn xấu hơn.

**Mỗi lần chạy một thư mục tạm riêng.** Bộ cũ phải xếp hàng một-việc-một-lúc vì
nó để khung tạm ở một chỗ cố định — hai lệnh cùng chạy là giẫm lên nhau và cho ra
hai video hỏng trong im lặng. Bộ này thì không, nhưng **vẫn xếp chung một hàng**:
mỗi việc đã mở 4 trình duyệt rồi, cho hai việc cùng chạy trên máy 12 lõi là cả
hai cùng chậm chứ không ai nhanh lên.

**Chuỗi ảnh PNG gói thành một file zip.** Giao diện đưa cho người dùng đúng một
đường tải; để nguyên thư mục thì bấm vào là 404 và không ai hiểu vì sao.

**Đếm khung bằng `framemd5` phải có `-an`.** File MP4 luôn kèm một rãnh tiếng im
lặng (nhiều nền tảng từ chối video không tiếng). Không bỏ tiếng ra thì đếm được
76 "khung" cho một giây phim — 30 khung hình cộng 46 gói tiếng.

## Chạy kiểm

```bash
node tools/kiem-xuat-nhanh.mjs     # đúng/sai
node tools/do-toc-xuat.mjs         # tốc độ, kèm tải máy lúc đo
node tools/do-tat-dinh.mjs <clip>  # bộ dựng có tất định không
```

Bài kiểm canh điều quan trọng nhất là **tính tất định**, không phải tốc độ: mất
tính đó thì cái nhanh thành vô dụng — sửa một chữ rồi xuất lại mà cả phim đổi thì
không ai dám dùng.

Đã thử phá để chứng minh phép kiểm có răng: nhét một chút phụ thuộc đồng hồ thật
vào `seg()` của bộ dựng → mục "từng khung băm ra giống hệt nhau" đỏ ngay.
