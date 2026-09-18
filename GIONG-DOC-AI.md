# Giọng đọc AI

Lát 6a. Nằm ở thẻ **"Giọng đọc"** trong bảng AI dưới thanh phát (bấm nút **AI** ở góc
phải): gõ lời (hoặc rút từ chính chữ trong clip) → nghe thử giọng → đọc thành file →
tự thành một rãnh tiếng của clip.

> Trước đây đây là một thẻ riêng ở cột phải. Đã gộp xuống bảng AI — hai cửa cho cùng
> một thứ thì người dùng bao giờ cũng mở nhầm cái kia. Xem [THANH-AI.md](THANH-AI.md).

## Khoá

Đọc từ `.env` của **dự án clip**, không phải từ `Library-Source/.env`:

| Biến | Dùng cho |
|---|---|
| `ELEVENLABS_API_KEY` | đọc lời · danh sách giọng · nghe thử |
| `gooogle_Ai_studio_API_key` | (lát 6b) viết lời từ brief · đọc hình |

> Tên biến Google đang **viết sai chính tả** trong `.env` (ba chữ `o`). Mã nhận cả
> `gooogle_Ai_studio_API_key`, `GOOGLE_AI_STUDIO_API_KEY` và `GEMINI_API_KEY` —
> sửa tên trong `.env` cũng được, không sửa cũng chạy.

**Khoá không bao giờ rời khỏi máy chủ.** Trình duyệt chỉ gọi app của mình; app gọi
ElevenLabs. Kể cả nghe thử cũng đi vòng qua máy chủ chứ không đưa `preview_url`
thẳng cho trình duyệt — không phải vì đường dẫn đó bí mật, mà vì đổi nhà cung cấp
thì chỉ phải sửa một chỗ. `kiem-giong.mjs` mục 4 lục cả trang và **mọi lời đáp
mạng** xem có chuỗi `sk_…` nào lọt ra không.

Khoá đọc lại từ file mỗi khi file đổi (nhớ theo `mtime`), **không** đọc từ biến môi
trường của tiến trình: người dùng sửa khoá bằng cách mở file ra sửa rồi mong nó ăn
ngay, chứ không đi khởi động lại máy chủ.

Kiểm **dạng** khoá chứ không chỉ kiểm khác rỗng — khoá ElevenLabs thật bắt đầu bằng
`sk_`. Người ta rất hay dán nhầm *mã số của khoá* (cũng dài, cũng trông giống) thay
vì chính khoá, và lúc đó mọi lời gọi trả 401 với câu báo chung chung.

## Giọng

Kho hiện có **28 giọng, trong đó 7 giọng đọc tiếng Việt thật** — cả giọng Bắc lẫn
Nam, cả nam lẫn nữ:

| Giọng | |
|---|---|
| An Nhiên | nữ · Nam · trẻ |
| Ngoc Nhien | nữ · Nam · trẻ |
| Minh Trung | nam · Nam · trẻ |
| Nhật Nam | nam · Bắc · trẻ |
| Tuyền Lâm | nữ · ấm áp |
| Quang Toan | nam · Nam · trung niên |
| Trong Nguyen | nam · Bắc · trung niên |

Giọng Việt **xếp lên đầu**, rồi tới một vạch ngăn *"Giọng nước ngoài — đọc tiếng
Việt sẽ nghe ra ngay"*. Bày lẫn thì người dùng chọn một giọng Mỹ rồi thắc mắc vì
sao nghe như người nước ngoài đọc.

## Nghe thử miễn phí, đọc lời tính tiền

Mỗi giọng có sẵn một đoạn mẫu (`preview_url`) — **không tốn ký tự**, nghe bao nhiêu
lần cũng được. Đoạn mẫu tải về đĩa rồi phục vụ lại: người dùng bấm nghe đi nghe lại
để so giọng, mỗi lần đi một vòng ra Internet thì chậm và phí. Đo được: lần đầu
~2 giây, lần sau **9ms**.

Đọc lời thì tính tiền theo ký tự, nên:
- số ký tự hiện ngay cạnh nút;
- nút chỉ mở khi đã có **cả lời lẫn giọng**, và ghi rõ *"Đọc bằng giọng An Nhiên"*;
- quá `5000` ký tự thì chặn **ở máy chủ**, không chỉ ở giao diện — giao diện chặn
  được thì tốt, nhưng ai gọi thẳng đường dẫn vẫn đốt được hạn mức.

## Tật đã biết của giọng Việt

`eleven_turbo_v2_5` + `language_code: 'vi'` là cặp đã đo là hợp nhất. Nhưng có một
tật **không chữa được bằng tham số**: giọng đọc lẫn **dấu hỏi với dấu huyền**
("bảng" nghe thành "bằng"). Chỗ nào nghĩa đổi theo dấu thì phải nghe lại rồi viết
chệch chính tả cho nó đọc đúng.

> Máy không tự kiểm được chuyện này. Muốn chắc thì **nghe mù**: nghe mà không nhìn
> bản chữ, rồi chép lại xem có ra đúng câu không — và phải chép **rời từng câu**,
> vì chép cả đoạn thì bộ nhận dạng tự sửa hộ lỗi phát âm.

## Chạy kiểm

```bash
node tools/kiem-giong.mjs              # chỉ phần miễn phí — 20 mục
DOC_THAT=1 node tools/kiem-giong.mjs   # kiểm cả đường đọc thật (tốn 8 ký tự)
```

Bài kiểm **cố ý không đọc lời thật** mỗi lần chạy. Chạy vài chục lần mỗi ngày mà
lần nào cũng đọc là âm thầm ăn hết hạn mức tháng, rồi tới lúc cần dùng thật thì hết.
