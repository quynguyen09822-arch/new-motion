# ARCHITECTURE.md — Motion Design App

> Tài liệu này là **nguồn chân lý về kiến trúc** của repo.
> Mọi agent (Claude Code CLI, sub-agent trong pipeline) phải đọc file này trước khi sinh code.
> Khi có mâu thuẫn giữa code hiện tại và tài liệu này, **tài liệu này thắng** — hãy sửa code.

---

## 0. Vấn đề đang sửa

Kiến trúc cũ để AI xuất thẳng **HTML**. HTML là lớp hiển thị cuối cùng, nên toàn bộ thông tin cấu trúc bị mất:
`<div>` đó là "card sản phẩm" hay hộp trang trí? `24px` là padding cố định hay token spacing? Không ai biết
→ không có gì để chỉnh sửa, không có contract để chia việc, không có bước bàn giao rõ ràng.

**Nguyên tắc thay thế:**

> **AI sinh DATA có schema, không sinh PRESENTATION.**
> Renderer biến DATA → Remotion/React. Người dùng edit DATA, không bao giờ edit HTML.

### Luật cứng (hard rules)

| # | Luật | Vi phạm = reject |
|---|------|------------------|
| R1 | Không agent nào được sinh HTML/JSX/CSS string vào document | ✅ |
| R2 | Agent chỉ trả **JSON Patch (RFC 6902)**, không trả full document | ✅ |
| R3 | Không hardcode màu/khoảng cách — chỉ dùng token reference `"{color.bg}"` | ✅ |
| R4 | Renderer phải **thuần & deterministic** — không gọi AI, không random, không `Date.now()` | ✅ |
| R5 | Mọi thay đổi (AI hoặc người dùng) đi qua **cùng một Command Bus** | ✅ |
| R6 | Mỗi agent chỉ được ghi vào vùng document được cấp quyền | ✅ |

R4 là bắt buộc vì Remotion render song song nhiều frame trên nhiều process — cùng một `doc` + `frame` phải luôn cho ra cùng một kết quả.

---

## 1. Kiến trúc 5 lớp

```
┌─────────────────────────────────────────────────────────┐
│ L5  Inspector UI      panel tự sinh từ schema           │
│     Canvas / Timeline                                    │
└────────────────────────┬────────────────────────────────┘
                         │ dispatch(Command)
┌────────────────────────▼────────────────────────────────┐
│ L3  Command Bus       undo/redo, inverse patch          │
│                       cổng duy nhất để mutate document  │
└──────────┬──────────────────────────────┬───────────────┘
           │ applyPatch                   │ applyPatch
┌──────────▼──────────┐        ┌──────────▼───────────────┐
│ L1  Scene Document  │◄───────┤ L2  Agent Pipeline       │
│     (IR — JSON)     │        │     Planner → Validator  │
│     SOURCE OF TRUTH │        └──────────────────────────┘
└──────────┬──────────┘
           │ render(doc, frame)
┌──────────▼──────────────────────────────────────────────┐
│ L4  Renderer         hàm thuần → React tree → Remotion  │
└─────────────────────────────────────────────────────────┘
```

**Thứ tự phụ thuộc:** L1 ← L4 ← L3 ← L5, và L2 cắm vào L3.
Không lớp nào được import ngược lên lớp trên.

---

## 2. L1 — Scene Document (IR)

### 2.1 Cấu trúc

```jsonc
{
  "version": "1.0",
  "meta": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "duration": 450           // tổng số frame, = tổng duration các scene
  },

  // Design tokens — agent chỉ được tham chiếu, không hardcode giá trị
  "tokens": {
    "color":  { "bg": "#0B0B0F", "surface": "#1C1C1E", "accent": "#4F7CFF",
                "text": "#FFFFFF", "textMuted": "#8E8E93" },
    "space":  { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 40 },
    "radius": { "sm": 8, "card": 20, "pill": 999 },
    "font":   { "display": "SF Pro Display", "body": "SF Pro Text" },
    "size":   { "title": 64, "body": 34, "caption": 24 }
  },

  "scenes": [
    {
      "id": "sc_01",
      "name": "Mở đầu",
      "start": 0,
      "duration": 90,
      "intent": "Giới thiệu tên app",   // Planner ghi, các agent sau đọc để hiểu mục tiêu
      "layers": [ /* Layer[] */ ]
    }
  ]
}
```

### 2.2 Layer

```jsonc
{
  "id": "ly_title",
  "type": "text",              // rect | text | image | screenshot | group | shape | video
  "name": "Tiêu đề",           // hiện trong panel Layers
  "locked": false,
  "hidden": false,
  "parent": null,              // id của group cha, null nếu ở root

  "props": {                   // thuộc tính riêng theo type
    "content": "Motion UI",
    "color": "{color.text}",
    "fontFamily": "{font.display}",
    "fontSize": "{size.title}",
    "fontWeight": 700,
    "align": "center",
    "lineHeight": 1.15
  },

  "transform": {               // tách riêng — user chỉnh nhiều nhất, timeline bind trực tiếp
    "x": 0, "y": 720,
    "w": 1080, "h": 200,
    "rotate": 0,
    "scale": 1,
    "opacity": 1
  },

  "animations": [ /* Animation[] */ ]
}
```

**Vì sao tách `transform` khỏi `props`:** Inspector, canvas drag-handle và timeline đều bind thẳng vào `transform`
mà không cần biết layer thuộc type gì. Đây là điều kiện để có một code path chung cho mọi loại layer.

### 2.3 Animation

```jsonc
{
  "id": "an_1",
  "property": "transform.opacity",   // dot-path vào layer
  "mode": "preset",                  // "preset" | "keyframes"

  // mode = "preset" (dành cho người mới)
  "preset": "fadeIn",                // fadeIn | fadeOut | slideUp | slideDown | popIn | scaleOut | blurIn
  "from": 0,
  "to": 1,
  "start": 0,                        // frame tương đối so với scene
  "duration": 15,
  "easing": "ios.standard",          // xem §2.4

  // mode = "keyframes" (chế độ nâng cao) — thay thế from/to/duration
  "keyframes": [
    { "frame": 0,  "value": 0, "easing": "ios.decelerate" },
    { "frame": 15, "value": 1 }
  ]
}
```

Animation là **mảng object có id**, không phải CSS string. Đây là điều kiện để timeline kéo-thả được.

### 2.4 Easing chuẩn iOS

| Tên | Loại | Tham số | Dùng cho |
|-----|------|---------|----------|
| `ios.standard` | cubic-bezier | `(0.4, 0.0, 0.2, 1)` | mặc định |
| `ios.decelerate` | cubic-bezier | `(0.0, 0.0, 0.2, 1)` | phần tử đi vào |
| `ios.accelerate` | cubic-bezier | `(0.4, 0.0, 1, 1)` | phần tử đi ra |
| `ios.spring` | spring | `stiffness 300, damping 30, mass 1` | pop, tap, bounce |
| `linear` | linear | — | chỉ dùng cho rotate liên tục |

`ios.spring` là thứ tạo cảm giác iOS rõ nhất. Mặc định của preset `popIn` và `slideUp` phải là spring.

### 2.5 Schema (Zod)

`schema/scene.ts` là định nghĩa duy nhất. Type TypeScript **suy ra từ Zod**, không viết tay song song.

```ts
import { z } from 'zod'

export const TokenRef = z.string().regex(/^\{[a-z]+\.[a-zA-Z0-9]+\}$/)
export const ColorValue = z.union([TokenRef, z.string().regex(/^#[0-9a-fA-F]{6}$/)])

export const Transform = z.object({
  x: z.number(), y: z.number(),
  w: z.number().positive(), h: z.number().positive(),
  rotate: z.number().default(0),
  scale:  z.number().positive().default(1),
  opacity: z.number().min(0).max(1).default(1),
})

export const TextProps = z.object({
  content:    z.string(),
  color:      ColorValue.describe('color'),          // → color picker
  fontFamily: TokenRef,
  fontSize:   z.union([TokenRef, z.number().min(8).max(400)]).describe('slider'),
  fontWeight: z.number().min(100).max(900).step(100).describe('segmented'),
  align:      z.enum(['left', 'center', 'right']).describe('segmented'),
  lineHeight: z.number().min(0.8).max(3).default(1.2).describe('slider'),
})

export type Transform = z.infer<typeof Transform>
```

`.describe()` mang metadata cho Inspector tự sinh (§5).

---

## 3. L2 — Agent Pipeline

Chạy **tuần tự**. Sau mỗi bước, Validator chạy; fail thì trả lỗi **về đúng agent gây ra**, không rerun cả pipeline.

| # | Role | Input | Output | Quyền ghi |
|---|------|-------|--------|-----------|
| 1 | **Planner** | brief, screenshot, script | danh sách scene + `intent` + thời lượng | `meta`, `scenes[].{id,name,start,duration,intent}` |
| 2 | **Tokenizer** | brief, ảnh tham chiếu | bảng design token | `tokens` |
| 3 | **Layout** | scene meta + tokens | layer tree + transform | `scenes[].layers[].{id,type,name,parent,transform}` |
| 4 | **Content** | layout + script | text, nguồn ảnh | `scenes[].layers[].props` |
| 5 | **Motion** | layout đầy đủ | animation, easing, timing | `scenes[].layers[].animations` |
| 6 | **Validator** | full document | pass / danh sách lỗi | **không ghi** |

### 3.1 Contract chung cho mọi agent

**Output bắt buộc — JSON Patch, không gì khác:**

```jsonc
[
  { "op": "replace", "path": "/scenes/0/layers/1/transform/y", "value": 240 },
  { "op": "add",     "path": "/scenes/0/layers/1/animations/-", "value": { "id": "an_2", "...": "..." } }
]
```

Lý do dùng patch thay vì full document:
- Nhỏ → rẻ, ít lỗi cú pháp.
- Dễ review và dễ tạo inverse patch cho undo.
- **Không đè mất chỉnh sửa tay của người dùng** — đây là lý do quan trọng nhất.

**Runtime phải chặn patch ghi ngoài vùng quyền.** Agent Motion gửi patch vào `/tokens` → reject, log, retry với thông báo lỗi.

### 3.2 Validator — check list

Đây là role đang thiếu hoàn toàn và quan trọng nhất. Tối thiểu phải check:

**Cấu trúc**
- [ ] Document pass Zod schema
- [ ] Mọi `id` là duy nhất trong toàn document
- [ ] `parent` trỏ tới group tồn tại, không có vòng lặp
- [ ] `sum(scenes[].duration) === meta.duration`
- [ ] Các scene `start` liền mạch, không chồng lấn, không hở

**Layout**
- [ ] Không layer nào tràn khỏi khung quá 10% (trừ khi `intent` là bleed)
- [ ] Text không đè lên text khác
- [ ] Safe area: nội dung chính cách mép ≥ 60px (dọc) / 48px (ngang)

**Token**
- [ ] Không có hex/px hardcode trong `props` (R3)
- [ ] Mọi token reference trỏ tới token tồn tại

**Motion**
- [ ] `animation.start + duration ≤ scene.duration`
- [ ] `animation.property` là dot-path hợp lệ trên layer đó
- [ ] Không hai animation cùng ghi một `property` chồng thời gian

**Chất lượng**
- [ ] Contrast text/nền ≥ 4.5:1
- [ ] `fontSize` sau khi resolve ≥ 24px ở khung 1080 (đọc được trên mobile)

Output lỗi phải kèm `agent` để routing:

```jsonc
{
  "ok": false,
  "errors": [
    { "code": "TEXT_OVERFLOW", "agent": "layout", "path": "/scenes/1/layers/2",
      "message": "Text tràn 180px khỏi safe area dưới", "hint": "Giảm fontSize hoặc dời y lên" }
  ]
}
```

### 3.3 Cấu trúc thư mục prompt

```
agents/
  _shared.md          # luật R1–R6, mô tả schema, format JSON Patch
  planner.md
  tokenizer.md
  layout.md
  content.md
  motion.md
  validator.md
```

Mỗi file: vai trò → input nhận được → vùng được ghi → ví dụ output patch → các lỗi thường gặp cần tránh.

---

## 4. L3 — Command Bus

Cổng **duy nhất** để mutate document. AI và người dùng dùng chung.

```ts
export type Command =
  | { type: 'SET_PROP';      layerId: string; path: string; value: unknown }
  | { type: 'SET_TRANSFORM'; layerId: string; patch: Partial<Transform> }
  | { type: 'ADD_LAYER';     sceneId: string; layer: Layer; index?: number }
  | { type: 'REMOVE_LAYER';  layerId: string }
  | { type: 'MOVE_LAYER';    layerId: string; toIndex: number; toParent?: string | null }
  | { type: 'SET_KEYFRAME';  layerId: string; animId: string; frame: number; value: unknown }
  | { type: 'ADD_SCENE';     scene: Scene; index?: number }
  | { type: 'SET_TOKEN';     path: string; value: string | number }
  | { type: 'APPLY_PATCH';   patch: JsonPatch; source: 'ai' | 'user'; agent?: string }

export interface DispatchResult {
  doc: SceneDocument
  inverse: JsonPatch      // đẩy vào undo stack
  errors: ValidationError[]
}

export function dispatch(doc: SceneDocument, cmd: Command): DispatchResult
```

**Yêu cầu:**
- `dispatch` là hàm thuần — nhận doc, trả doc mới. Không mutate tại chỗ (dùng Immer).
- Mọi command sinh `inverse` patch → undo/redo miễn phí và thống nhất.
- Kéo layer bằng chuột và AI chỉnh layer đó **đều tạo ra `SET_TRANSFORM`**. Đây là lý do phải làm Command Bus **trước** khi làm UI.
- Command từ AI gắn `source: 'ai'` để UI hiển thị badge "AI đã sửa" và cho phép revert riêng.

**Undo stack:** gom nhóm theo thời gian — các `SET_TRANSFORM` liên tiếp trong 300ms của cùng một layer gộp thành một bước undo (nếu không, kéo chuột một lần sẽ tạo 60 bước undo).

---

## 5. L4 — Renderer

```ts
// Hàm thuần. Không AI, không random, không I/O, không Date.now().
export function renderScene(doc: SceneDocument, sceneId: string, frame: number): ReactElement
export function resolveToken(tokens: Tokens, ref: string): string | number
export function resolveAnimation(anim: Animation, localFrame: number): unknown
```

**Quy trình render một layer tại frame `f`:**
1. Lấy `transform` và `props` gốc.
2. Với mỗi animation, tính giá trị tại `f` → ghi đè vào dot-path tương ứng.
3. Resolve mọi token reference thành giá trị thật.
4. Trả về component React tương ứng `type`.

**Registry theo type** — thêm loại layer mới không được sửa code renderer lõi:

```ts
export const layerRegistry: Record<LayerType, {
  schema: z.ZodType
  component: React.FC<{ props: any; transform: Transform }>
  defaults: () => Partial<Layer>
  icon: string
}> = { /* ... */ }
```

---

## 6. L5 — Inspector tự sinh & UI

### 6.1 AutoInspector

```tsx
<AutoInspector
  schema={layerRegistry[layer.type].schema}
  value={layer.props}
  onChange={(path, value) => dispatch({ type: 'SET_PROP', layerId, path, value })}
/>
```

Map từ metadata Zod sang control:

| Zod | `.describe()` | Control |
|-----|---------------|---------|
| `z.string()` | `'color'` | Color picker (kèm tab chọn token) |
| `z.number().min().max()` | `'slider'` | Slider iOS + ô nhập số |
| `z.enum()` | `'segmented'` | Segmented control |
| `z.boolean()` | — | Toggle iOS |
| `z.string()` | — | Text field |

**Thêm property mới = sửa schema, không đụng UI code.** Đây là mục tiêu chính của lớp này.

### 6.2 Bố cục 3 vùng

- **Trái — Scenes:** thumbnail dọc, vuốt để xoá (giống Photos app), kéo để đổi thứ tự.
- **Giữa — Canvas:** preview, tap chọn layer, drag để di chuyển, handle 8 điểm để resize. Timeline mỏng ở đáy.
- **Phải — Inspector:** grouped list, nền `#F2F2F7`, card bo `10px`, section có header chữ nhỏ in hoa.

### 6.3 Ba thứ tạo cảm giác iOS

1. **Spring animation** cho mọi chuyển động UI (`stiffness 300, damping 30`) — không dùng linear/ease.
2. **Bottom sheet** thay cho modal, có grabber, kéo xuống để đóng, snap point.
3. **Blur backdrop** (`backdrop-filter: blur(20px)` + nền `rgba(255,255,255,0.72)`) cho toolbar nổi.

### 6.4 Chế độ người mới

Mặc định **giấu keyframe**. Người mới chỉ thấy:
- Danh sách preset dạng card có preview động (`fadeIn`, `slideUp`, `popIn`…)
- Một slider **"Tốc độ"** (0.5× – 2×)
- Một slider **"Độ trễ"**

Chế độ keyframe chi tiết nằm sau nút **"Nâng cao"**. `mode: 'preset'` chuyển sang `mode: 'keyframes'` được, nhưng không quay lại — cảnh báo trước khi chuyển.

---

## 7. Cấu trúc thư mục

```
src/
  schema/
    scene.ts            # Zod schema — nguồn chân lý duy nhất
    tokens.ts
    patch.ts            # kiểu JSON Patch + helper
  store/                # L0 — Chunk Store, xem §11
    chunkStore.ts       # load / save / hydrate / evict, LRU
    hash.ts             # canonicalJSON + content hash (§11.5)
    cache.ts            # cache status, invalidation
    assets.ts           # asset registry, lazy decode
  core/
    commands.ts         # Command types + dispatch
    history.ts          # undo/redo stack theo chunk, gom nhóm
    validate.ts         # validateChunk + validateProject (§11.8)
    resolve.ts          # resolveToken, resolveAnimation, easing
  pipeline/
    renderChunk.ts      # render 1 chunk → segment mp4
    concat.ts           # sinh concat.txt + gọi ffmpeg stream copy
    proxy.ts            # render proxy 540p nền
  render/
    renderScene.tsx
    registry.ts
    layers/             # TextLayer, RectLayer, ImageLayer, ScreenshotLayer…
  agents/
    runner.ts           # điều phối pipeline, kiểm tra quyền ghi
    prompts/            # _shared.md, planner.md, …
  ui/
    Inspector/
      AutoInspector.tsx
      controls/         # ColorPicker, Slider, Segmented, Toggle
    Canvas/
    Timeline/
    SceneList/
  remotion/
    Root.tsx            # đăng ký composition, đọc doc từ props

fixtures/
  01-simple.json        # document mẫu viết tay để test renderer
  02-multiscene.json
  03-edge-cases.json
```

---

## 8. Thứ tự build

Làm đúng thứ tự này. **Không làm UI trước.**

| # | Milestone | Xong khi | Ước lượng |
|---|-----------|----------|-----------|
| 1 | **Schema + Validator** | Zod schema đầy đủ, 3 fixture viết tay pass, các case lỗi cố ý bị bắt đúng | 1–2 ngày |
| 2 | **Chunk Store + hash** | Load/save chunk lẻ, hash ổn định, sửa 1 chunk → đúng nó + 2 transition kề stale | 1–2 ngày |
| 3 | **Renderer 1 chunk** | `renderChunk` ra segment mp4 đúng cho cả 3 fixture, không có UI editor | 2–3 ngày |
| 4 | **Segment render + concat** | 10 chunk render song song, `ffmpeg -c copy` ghép ra file đúng fps/duration | 2 ngày |
| 5 | **Command Bus + undo/redo** | Test bằng script Node: apply 20 command rồi undo hết → doc về trạng thái gốc, `invalidated` đúng | 1–2 ngày |
| 6 | **Canvas + AutoInspector** | Chọn layer, kéo, sửa property, preview chunk đang edit đổi realtime | 3–5 ngày |
| 7 | **Proxy + scrub timeline** | Scrub 3 phút mượt bằng proxy, chunk stale hiện overlay | 2–3 ngày |
| 8 | **Agent pipeline** | Cắm từng role một, bắt đầu từ Layout, chạy theo chunk. Mỗi role pass Validator trước khi thêm role kế | 3–5 ngày |
| 9 | **Timeline + preset motion** | Kéo thanh animation, đổi preset, đổi tốc độ, split/merge chunk | 3–4 ngày |
| 10 | **Polish iOS** | Spring, bottom sheet, blur, haptic-style feedback | 2–3 ngày |

**Bước 1–5 là phần đang thiếu hoàn toàn** và cũng là phần khiến mọi thứ sau đó khả thi.
Nếu bị cám dỗ nhảy sang bước 6 sớm — đừng.

Mốc kiểm chứng quan trọng nhất là **bước 4**: nếu ghép 10 segment bằng stream copy chưa ra file sạch
(đúng fps, không drop frame, không lệch audio), đừng đi tiếp — mọi thứ sau đó đều dựa lên nó.

---

## 9. Test bắt buộc

```
tests/
  schema.test.ts       # fixture hợp lệ pass, fixture lỗi fail đúng mã lỗi
  determinism.test.ts  # render(doc, f) gọi 100 lần → kết quả giống hệt
  history.test.ts      # N command rồi undo N lần → deep-equal doc gốc
  patch-scope.test.ts  # patch của Motion ghi vào /tokens → bị reject
  agent-golden.test.ts # brief cố định → doc output pass toàn bộ Validator
```

`determinism.test.ts` và `history.test.ts` là hai test không được phép fail — chúng bảo vệ R4 và R5.

---

## 10. Ghi chú cho agent sinh code

- Đọc `schema/scene.ts` **trước** khi viết bất kỳ code nào chạm tới document.
- Không viết type TypeScript song song với Zod — luôn `z.infer`.
- Không thêm property vào document mà không thêm vào schema cùng lúc.
- Khi cần một loại layer mới: thêm vào `layerRegistry` + schema, không sửa `renderScene`.
- Khi không chắc một thay đổi thuộc lớp nào: nó thuộc lớp thấp nhất có thể.

---

## 11. Chunking — xử lý video dài (3 phút trở lên)

> Mục này **bổ sung và ghi đè** một phần §1, §2, §3, §7, §8.
> Không có mục này, kiến trúc chỉ chạy tốt với clip < 30 giây.

### 11.1 Vì sao cần

3 phút @ 30fps = **5400 frame**. Kiến trúc nguyên khối vỡ ở 4 điểm:

| Điểm vỡ | Hệ quả ở 3 phút |
|---------|-----------------|
| Một Remotion composition duy nhất | Sửa 1 scene → render lại 5400 frame. Lỗi frame 5000 → mất cả job |
| `renderScene` duyệt toàn document mỗi frame | Preview giật, scrub không kịp |
| Validator chạy full doc mỗi `dispatch` | Kéo chuột 1 giây = 60× validate toàn bộ |
| Agent nhận cả document | Context nổ ở ~15 scene |
| Undo stack giữ inverse patch của doc lớn | RAM phình theo thời lượng |

### 11.2 Chunk — đơn vị nguyên tử

**Chunk là đơn vị chung cho 5 việc:** render · cache · validate · undo · agent work.

- Kích thước mục tiêu: **90–240 frame (3–8 giây)**
- 3 phút → **25–50 chunk**
- Chunk không bao giờ vượt quá 300 frame. Planner phải cắt scene dài thành nhiều chunk.

```jsonc
{
  "id": "ck_012",
  "kind": "scene",            // "scene" | "transition"
  "sceneId": "sc_04",
  "start": 1080,              // frame tuyệt đối trong timeline
  "duration": 150,
  "layers": [ /* Layer[] */ ],

  "hash": "a3f9c2...",        // sha256, xem §11.5
  "cache": {
    "status": "fresh",        // fresh | stale | rendering | error
    "proxy":  "cache/ck_012.540p.mp4",
    "full":   "cache/ck_012.1080p.mp4",
    "renderedAt": 1757400000
  }
}
```

### 11.3 Tách file: manifest + chunk

Thay cho một `document.json` khổng lồ:

```
project.json           # manifest — LUÔN nằm trong RAM, nhỏ (< 50KB)
chunks/
  ck_001.json          # lazy load
  ck_002.json
  ...
assets/
  registry.json
cache/
  ck_001.540p.mp4      # proxy để scrub
  ck_001.1080p.mp4     # full res để export
```

**`project.json` (manifest)** — chỉ chứa thứ luôn cần:

```jsonc
{
  "version": "1.1",
  "meta": { "fps": 30, "width": 1080, "height": 1920, "duration": 5400 },
  "tokens": { /* ... */ },
  "assets": [ { "id": "img_04", "path": "assets/shot4.png", "hash": "…", "w": 1170, "h": 2532 } ],
  "chunks": [
    { "id": "ck_001", "kind": "scene", "sceneId": "sc_01", "start": 0,   "duration": 90,
      "name": "Mở đầu", "intent": "Giới thiệu tên app", "hash": "…", "cacheStatus": "fresh" },
    { "id": "ck_002", "kind": "transition", "from": "ck_001", "to": "ck_003",
      "start": 90, "duration": 15, "preset": "crossDissolve", "hash": "…", "cacheStatus": "stale" }
  ]
}
```

Manifest **không chứa layer**. Đây là lý do nó vẫn nhỏ ở video 10 phút.

### 11.4 Transition vắt qua ranh giới

Vấn đề: ghép segment bằng stream copy đòi hỏi mỗi segment độc lập, nhưng transition cần frame của cả hai chunk kề.

**Giải pháp: transition là một chunk riêng.**

```jsonc
{
  "id": "ck_002",
  "kind": "transition",
  "from": "ck_001", "to": "ck_003",
  "preset": "crossDissolve",   // crossDissolve | slidePush | scaleThrough | wipe
  "duration": 15,
  "easing": "ios.standard"
}
```

Khi render, transition chunk tự mount **đuôi của `from`** và **đầu của `to`**, blend theo preset.
Hash của nó phụ thuộc hash của cả hai neighbor → sửa scene A thì chỉ scene A và transition kề nó bị stale, scene B vẫn giữ cache.

Nhờ vậy **mọi segment vẫn độc lập** và concat vẫn là stream copy.

### 11.5 Content hash & cache invalidation

```ts
hash(chunk) = sha256(
  canonicalJSON(chunk.layers) +
  canonicalJSON(pickUsedTokens(chunk, tokens)) +   // chỉ token chunk thật sự dùng
  assetHashes(chunk) +
  canonicalJSON({ fps, width, height }) +
  RENDERER_VERSION                                  // bump khi đổi logic render
)
```

Ba chi tiết quan trọng:

1. **`pickUsedTokens`, không phải toàn bộ `tokens`.** Nếu hash cả bảng token, đổi 1 màu → stale toàn bộ 40 chunk. Chỉ hash token chunk đó thật sự tham chiếu.
2. **`canonicalJSON`** — sắp key theo alphabet, số làm tròn 6 chữ số. Không có bước này, cùng nội dung ra hash khác nhau.
3. **`RENDERER_VERSION`** — không có nó, sửa bug renderer sẽ không invalidate cache cũ.

Sau mỗi `dispatch`, chỉ chunk bị chạm (và transition kề) chuyển `stale`.

### 11.6 Render pipeline

```
                 ┌── ck_001 (fresh) ──► dùng cache
manifest ────────┼── ck_002 (stale) ──► render ──► cache/ck_002.1080p.mp4
                 ├── ck_003 (fresh) ──► dùng cache
                 └── ck_00N …
                                            │
                                            ▼
                              ffmpeg concat demuxer (stream copy)
                                            │
                                            ▼
                                      output.mp4
```

```bash
# concat.txt sinh từ manifest, theo đúng thứ tự chunk
ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4
```

**Yêu cầu để stream copy hoạt động:** mọi segment phải cùng codec, cùng độ phân giải, cùng fps, cùng pixel format, và **mỗi segment bắt đầu bằng keyframe**. Đặt `-g 1` hoặc GOP = duration chunk khi render segment.

**Song song:** N chunk stale render đồng thời (`concurrency = số core / 2`). Mỗi chunk chỉ load layer của chính nó → RAM phẳng theo thời lượng video.

**Chunk lỗi không giết cả job.** Chunk error → đánh dấu `status: "error"`, chèn placeholder đen, tiếp tục các chunk còn lại, báo lỗi cuối cùng.

### 11.7 Preview & scrub

Đây là chỗ quyết định app có mượt hay không. Mô hình giống Premiere/Resolve:

| Vùng | Nguồn hiển thị |
|------|----------------|
| Chunk đang edit | **Live React render** (Remotion Player) |
| Chunk khác | **Proxy video 540p từ cache** |
| Chunk stale chưa render | Frame cuối cùng đã cache + overlay sọc "cần render" |

- **Hydration window:** chỉ giữ layer của `[active-2 … active+2]` trong RAM. LRU tối đa 5 chunk hydrated.
- Scrub toàn timeline = phát chuỗi proxy mp4, không phải render React → mượt bất kể video dài bao nhiêu.
- Proxy render nền, ưu tiên chunk gần con trỏ playhead trước.

### 11.8 Validator hai tầng

Thay cho một `validate(doc)` duy nhất trong §3.2:

```ts
validateChunk(chunk, tokens, neighbors): ValidationError[]
// Chạy mỗi dispatch. O(số layer trong chunk). Phải < 5ms.
// Check: schema, layout, safe area, token tồn tại, animation ≤ duration, contrast

validateProject(manifest): ValidationError[]
// Chạy khi save / trước export / debounce 2s. O(số chunk).
// Check: id duy nhất toàn cục, chunks liền mạch không hở không chồng,
//        sum(duration) === meta.duration, transition trỏ tới chunk tồn tại,
//        asset reference tồn tại
```

Không bao giờ chạy `validateProject` trong vòng lặp kéo chuột.

### 11.9 Agent pipeline theo chunk

Sửa bảng role ở §3:

| Role | Phạm vi | Context nhận được |
|------|---------|-------------------|
| **Planner** | manifest | brief + script. Xuất danh sách chunk + `intent` + duration. **Không sinh layer** |
| **Tokenizer** | manifest | brief + ảnh tham chiếu |
| **Layout** | **1 chunk** | tokens + `intent` của chunk + **tóm tắt 1 dòng** của 2 chunk kề |
| **Content** | **1 chunk** | layout chunk đó + đoạn script tương ứng |
| **Motion** | **1 chunk** | layout chunk đó + preset transition kề |
| **Validator** | chunk hoặc project | tương ứng |

**Context mỗi lần gọi agent là hằng số, không phụ thuộc độ dài video.** Đây là điều kiện để làm được video 10 phút.

Layout/Content/Motion của các chunk khác nhau **chạy song song được** — chúng không đọc layer của nhau, chỉ đọc `intent` tóm tắt.

Quy tắc: **agent không được đọc/ghi chunk ngoài phạm vi được giao.** Patch có `path` trỏ ra ngoài `/chunks/{id}` → reject.

### 11.10 Command & undo theo chunk

```ts
type Command =
  | { /* … các command cũ … */ chunkId: string }     // thêm chunkId bắt buộc
  | { type: 'SPLIT_CHUNK';  chunkId: string; atFrame: number }
  | { type: 'MERGE_CHUNKS'; a: string; b: string }
  | { type: 'REORDER_CHUNK'; chunkId: string; toIndex: number }
  | { type: 'SET_TRANSITION'; chunkId: string; preset: string; duration: number }
```

- Undo stack **theo từng chunk** + một stack riêng cho thao tác manifest.
- Inverse patch chỉ giữ delta trong phạm vi chunk → RAM không phình theo độ dài video.
- `dispatch` trả thêm `invalidated: string[]` — danh sách chunk id cần chuyển `stale`.
- `REORDER_CHUNK` phải tính lại `start` của mọi chunk sau nó, nhưng **không** invalidate cache của chúng (nội dung không đổi, chỉ vị trí trên timeline đổi).

### 11.11 Asset registry

Assets nằm ở manifest, chunk chỉ tham chiếu bằng id:

```jsonc
// trong layer
{ "type": "image", "props": { "src": "asset:img_04", "fit": "cover" } }
```

- Lazy load: chỉ decode asset của chunk đang hydrated.
- Cache theo hash — cùng screenshot dùng ở 5 chunk chỉ decode 1 lần.
- Video asset: dùng proxy 540p khi preview, file gốc khi export.

### 11.12 Ngân sách hiệu năng (mục tiêu)

| Thao tác | Mục tiêu |
|----------|----------|
| Mở project 3 phút | < 1s (chỉ load manifest) |
| Chuyển chunk đang edit | < 200ms |
| `dispatch` + `validateChunk` | < 5ms |
| Render 1 chunk (150 frame, 1080p) | 3–8s |
| Re-export sau khi sửa 1 chunk | < 15s (1 chunk + 2 transition + concat) |
| Export sạch từ đầu, 3 phút | 2–5 phút với concurrency 4 |
| RAM khi edit video 10 phút | < 1.5GB |

---

## 12. Thay đổi tới các mục trước

| Mục | Thay đổi |
|-----|----------|
| §1 | Thêm lớp **L0 — Chunk Store** dưới L1: load/save/hydrate/evict chunk, quản lý cache status |
| §2.1 | `scenes[]` → `chunks[]` ở manifest; `layers` chuyển sang file chunk riêng |
| §3 | Bảng role thay bằng §11.9 (phạm vi theo chunk) |
| §3.2 | Validator tách hai tầng theo §11.8 |
| §4 | `Command` thêm `chunkId` bắt buộc + 4 command mới ở §11.10 |
| §4 | `DispatchResult` thêm `invalidated: string[]` |
| §5 | `renderScene(doc, sceneId, frame)` → `renderChunk(chunk, tokens, localFrame)` |
| §9 | Thêm `chunk-cache.test.ts`: sửa chunk N → đúng N và 2 transition kề bị stale, còn lại fresh |
| §9 | Thêm `concat.test.ts`: ghép 10 segment bằng stream copy, kiểm tra fps/duration/không drop frame |

**Luật cứng bổ sung:**

| # | Luật |
|---|------|
| R7 | Không code nào được load toàn bộ chunk cùng lúc. Chỉ đi qua Chunk Store với LRU |
| R8 | Chunk không vượt 300 frame. Planner phải cắt nhỏ |
| R9 | Hash chunk chỉ gồm token nó thật sự dùng, không phải cả bảng token |
| R10 | Mọi segment render ra phải bắt đầu bằng keyframe (để concat stream-copy được) |
