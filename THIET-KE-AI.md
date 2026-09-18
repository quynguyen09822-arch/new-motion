# Hướng dựng AI trợ lý cho trình sửa clip

**Viết cho:** anh Quý và người sẽ duyệt ngân sách AI của dự án. Không cần biết code,
nhưng cần quyết được: làm gì trước, tốn bao nhiêu, và chỗ nào AI **không** nên đụng.

Tài liệu này trả lời ba câu: **MCP là gì và có cần không · chia vai cho model Gemini
thế nào · làm theo thứ tự nào.**

---

## 0. Nền móng đã có (không phải bắt đầu từ số không)

| | |
|---|---|
| Clip là **JSON thuần** | AI đọc và sửa trực tiếp được. File `.aep` của After Effects là nhị phân — AI không mở nổi. **Đây là lợi thế lớn nhất của app này.** |
| **25 bài kiểm tự động** | AI sửa hỏng là biết ngay, không đợi người phát hiện |
| **Hai lớp soát** | `validateScene` chặn lưu bản hỏng · `soatChatLuong` cảnh báo mềm |
| **Hoàn tác đầy đủ** | mọi thay đổi đi qua một cửa `kho.sua`, Ctrl+Z là lùi |
| Bộ dựng **tất định** | cùng một giây luôn ra cùng một khung — AI đối chiếu hình được |
| Đã nối **2 nhà cung cấp** | ElevenLabs (giọng đọc) · Google AI Studio (viết lời) |

Nói cách khác: phần khó nhất — *làm sao biết AI sửa đúng hay sai* — đã xong.

---

## 1. MCP là gì, và ở đây có cần không

MCP là chuẩn để một trợ lý AI **gọi được công cụ của mình**. Không có nó thì AI chỉ
biết nói; có nó thì AI bấm được nút.

### Câu trả lời thẳng: cần, nhưng **không phải bây giờ**

Có hai đường để AI đụng vào clip, và chúng phục vụ hai người khác nhau:

| | **Đường A — AI trong app** | **Đường B — MCP** |
|---|---|---|
| Ai dùng | anh, ngay trong trình sửa | Claude/Cursor trên máy anh, hoặc đồng nghiệp |
| Gọi gì | app gọi thẳng Gemini | trợ lý ngoài gọi vào app |
| Cần gì | **đã có** (lát 6a, 6b) | phải viết thêm một lớp máy chủ MCP |
| Làm được | viết lời, chọn giọng, dựng cảnh | tất cả những cái đó + tự động hoá hàng loạt |

**Đường A là cái anh đang thiếu và vừa có.** Đường B chỉ đáng làm khi đã rõ *AI nên
làm được những việc gì* — mà muốn rõ thì phải dùng thật một thời gian.

Làm MCP trước khi biết cần công cụ nào là chuyện hay gặp: dựng xong hai chục công cụ,
dùng đúng ba cái.

### Nếu làm MCP thì phơi ra đúng 9 công cụ

Nhóm theo **mức nguy hiểm**, và đó là cách duy nhất để sau này cấp quyền cho đúng:

**Chỉ đọc — cho tự do**
| Công cụ | Làm gì |
|---|---|
| `liet_ke_clip` | danh sách clip, thời lượng, khổ hình |
| `doc_clip` | lấy nguyên JSON một clip |
| `soat_clip` | chạy bộ soát, trả về danh sách vấn đề |
| `chup_khung` | chụp clip tại giây thứ N → ảnh để AI **nhìn** |

**Sửa — phải qua cùng một cửa với người dùng**
| Công cụ | Làm gì |
|---|---|
| `sua_clip` | áp một bản vá JSON, **đi qua `kho.sua`** nên hoàn tác được |
| `them_mon` / `xoa_mon` | thêm/bỏ một thành phần |
| `dat_moc` | đặt mốc chuyển động cho một món |

**Tốn tiền hoặc tốn thời gian — luôn hỏi trước**
| Công cụ | Vì sao phải hỏi |
|---|---|
| `doc_loi` | ElevenLabs tính tiền theo ký tự |
| `xuat_video` | chiếm 4 luồng máy trong vài phút |

> **Luật cứng:** công cụ MCP **không được** có đường ghi thẳng vào file, và **không
> được** nhận đường dẫn tuỳ ý. Mọi thứ đi qua đúng những cửa mà giao diện đang đi —
> nếu không, hoàn tác mất tác dụng và bộ soát bị vòng qua.

---

## 2. Chia vai cho model Gemini

Nguyên tắc: **chọn model theo VIỆC, không theo số hiệu phiên bản.** Số đo bên dưới
là đo thật trong workspace này ngày 17/09/2026, cùng một lời nhắc:

| Model | Kết quả |
|---|---|
| `gemini-3.8-flash` | ❌ 503 — và mất **63,8 giây** mới chịu báo 503 |
| `gemini-3.5-flash` | ❌ 503 — sau 31,8 giây |
| `gemini-2.5-flash` | ❌ **404** — API có liệt kê, gọi vào thì không có |
| `gemini-3.6-flash` | ✅ 4,9 giây |
| `gemini-3-flash-preview` | ✅ **1,56 giây** |
| `gemini-3.1-flash-lite` | ✅ 2,08 giây |

> **Bài học đắt nhất ở đây:** model mới nhất *không* phải model nên đặt đầu bảng, và
> danh sách model do API trả về **có nói dối**. Phải đo, và phải có đường lùi.

### Năm vai

| Vai | Model | Vì sao |
|---|---|---|
| **1 · Viết lời đọc** từ brief | `gemini-3.6-flash` → 3-flash-preview → 3.1-flash-lite | Việc ngôn ngữ thuần. Chênh lệch chất lượng giữa các model flash không đáng kể; chênh lệch 1,5 giây với 64 giây thì rất đáng kể. **Đã làm — lát 6b.** |
| **2 · Nhìn hình, góp ý bố cục** | `gemini-3.6-flash` (thị giác) | Chụp clip tại vài giây rồi hỏi "chữ có bị che không, mắt đi đâu trước". Rẻ, và bắt được thứ bộ soát bằng luật không bắt được. |
| **3 · Dựng cảnh từ mô tả** | `gemini-3.1-pro-preview` | Việc **khó nhất**: sinh JSON đúng schema. Đây là chỗ duy nhất đáng trả tiền cho model pro — sinh sai schema thì bộ kiểm chặn, nhưng sinh *đúng mà xấu* thì không ai chặn được. |
| **4 · Phân tích nhịp chuyển động** | `gemini-3.1-flash-lite` | Đọc JSON, đếm mốc thời gian, chỉ ra chỗ dồn cục hay chỗ chết. Việc đọc số — model nhẹ nhất là đủ. |
| **5 · Nghe lại lời đã đọc** | `gemini-3.5-transcribe` | Chép lại file tiếng rồi so với bản gốc. Đây là cách **duy nhất** máy tự bắt được lỗi phát âm. |

### Vai 5 đáng nói riêng

Giọng Việt của ElevenLabs có một tật đã đo: **lẫn dấu hỏi với dấu huyền** — "bảng"
đọc thành "bằng". Không chữa được bằng tham số.

Máy tự kiểm được, nhưng phải làm đúng cách: chép lại **rời từng câu**. Chép cả đoạn
thì bộ nhận dạng dựa vào ngữ cảnh *tự sửa hộ* lỗi phát âm, và báo là đọc đúng trong
khi tai người nghe ra ngay.

---

## 3. Ba việc anh hỏi, làm được tới đâu

### "Đọc hình và dựng hình thẳng trên giao diện"

**Đọc hình: làm được ngay.** Bộ dựng tất định, chụp clip tại giây thứ N ra ảnh giống
hệt nhau mỗi lần. Đưa ảnh cho Gemini hỏi "bố cục này có vấn đề gì" là việc thẳng thớm.

**Dựng hình: làm được, nhưng đây là phần khó nhất.** Không phải khó về kỹ thuật — AI
sinh JSON thì dễ. Khó ở chỗ *sinh ra thứ nhìn được*. Đường đi an toàn:

1. AI chỉ được ghép từ **24 thành phần và 16 bộ dựng sẵn** đã có, không tự chế
2. Sinh xong **bắt buộc** qua `validateScene` + `soatChatLuong`
3. Hiện ra dạng **đề xuất**, người bấm nhận mới vào clip
4. Vào rồi vẫn **Ctrl+Z** được

Bỏ bước 3 là hỏng. Cho AI ghi thẳng vào clip thì lần nó làm sai, người dùng mất niềm
tin và không bao giờ bật lại.

### "Phân tích chuyển động phù hợp"

Làm được, và **rẻ**, vì đây là việc đọc số chứ không phải việc sáng tạo: đọc mốc thời
gian của mọi món, tìm chỗ ba bốn thứ cùng bay vào một lúc, tìm quãng chết dài 4 giây
không có gì động, tìm món dùng đà "đều tay" (nhìn như máy đẩy).

Phần lớn việc này **không cần AI** — viết luật là xong, và luật thì nhanh hơn, rẻ hơn,
giải thích được. Chỉ phần "clip này nên nhanh hay chậm, hợp với thông điệp nào" mới
cần model.

### "Build mọi thứ thật vững"

Vững không đến từ model, nó đến từ **cửa chặn**. Những cửa đã có và phải giữ:

- mọi sửa đổi qua `kho.sua` → hoàn tác được
- `validateScene` chặn lưu bản hỏng
- 25 bài kiểm tự động, và **mỗi bài đều đã thử phá để chứng minh nó có răng**
- khoá không bao giờ rời khỏi máy chủ
- việc tốn tiền phải báo giá trước khi bấm

Cửa cần thêm khi mở đường cho AI:

- **AI chỉ đề xuất, người duyệt** — cho mọi thứ động vào hình
- **Hạn mức theo ngày** cho việc tốn tiền, đếm ở máy chủ
- **Nhật ký**: việc nào do AI làm, dùng model nào, tốn bao nhiêu

---

## 4. Thứ tự đề xuất

| | Việc | Vì sao xếp ở đây | Code tay | ET_AI |
|---|---|---|---|---|
| ~~1~~ | ~~Chọn giọng · nghe thử · đọc lời~~ | **xong** — lát 6a | | |
| ~~2~~ | ~~Brief → AI viết lời~~ | **xong** — lát 6b | | |
| 3 | **Nghe lại lời đã đọc** | Rẻ nhất, và đóng được lỗ hổng duy nhất mà máy không tự bắt được | 1,5 ngày | **2,4h** |
| 4 | **Nhìn hình, góp ý bố cục** | Bắt được thứ bộ soát bằng luật không bắt được | 2,5 ngày | **4h** |
| 5 | **Soi nhịp chuyển động** | Phần lớn là luật, không phải AI — nên rẻ | 2 ngày | **3,2h** |
| 6 | **Dựng cảnh từ mô tả** | Khó nhất, và chỉ đáng làm khi 3–5 đã chạy trơn | 6 ngày | **9,6h** |
| 7 | **Máy chủ MCP, 9 công cụ** | Làm cuối, khi đã biết công cụ nào thật sự cần | 4 ngày | **6,4h** |

**Cộng: 25,6 giờ AI ≈ 4 ngày làm việc.**

### Nếu chỉ chọn được hai

Chọn **3** và **4**. Chúng rẻ nhất, và cả hai đều bắt được lỗi mà **máy hiện không
bắt được** — tức là chúng thêm năng lực, không phải thêm tiện nghi.

Việc số 6 nghe hấp dẫn nhất khi trình bày, nhưng nó là thứ dễ làm mất niềm tin nhất
nếu vội. Để sau cùng.

---

## 5. Ba điều nên nói thẳng khi trình bày

**AI ở đây không thay người dựng.** Nó đọc được JSON và đối chiếu được hình, nên nó
bắt lỗi và viết nháp tốt. Nó không biết clip này để thuyết phục ai.

**Chi phí có hai loại, và chúng khác hẳn nhau.** Google AI Studio đang miễn phí nhưng
có hạn lượt ngày và **hay quá tải** (đo được 503 trên hai model). ElevenLabs tính tiền
theo ký tự — một clip 24 giây tốn khoảng 250 ký tự, nghe thử thì miễn phí.

**Lợi thế thật của app này không phải là có AI.** Là chỗ nào cũng có cửa chặn, và
25 bài kiểm đều đã bị thử phá để chứng minh chúng có răng. Gắn AI vào một hệ không
có cửa chặn thì AI làm hỏng nhanh hơn người.
