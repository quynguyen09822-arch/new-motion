#!/usr/bin/env node
/**
 * KIỂM KHO RIÊNG — mỗi tài khoản một kho, không đồng bộ với nhau.
 *
 * CHẠY BẰNG NODE TRẦN. Không cần Chromium, không cần máy chủ đang chạy, vài
 * giây là xong. Tất cả những gì cần canh ở đây đều là chuyện của máy chủ; kéo
 * thêm một trình duyệt vào chỉ làm bài kiểm chậm và mong manh hơn.
 *
 * DỰNG MÁY CHỦ RIÊNG trên cổng khác, truyền mật khẩu và danh sách tài khoản
 * bằng BIẾN MÔI TRƯỜNG — không đụng `.env` thật. Bài kiểm mà sửa cấu hình thật
 * thì chạy xong người dùng bị khoá ra ngoài.
 *
 * LUẬT CỨNG CỦA CHÍNH BÀI KIỂM NÀY:
 *
 *   KHÔNG BAO GIỜ GHI VỚI TƯ CÁCH CHỦ KHO. Kho của chủ kho CHÍNH LÀ `scenes/`
 *   của dự án clip thật — thứ không có git. Mọi lần ghi ở đây đều phải đi bằng
 *   tài khoản "người mới", nơi kho nằm trong `kho/<mã>/` và xoá được sạch.
 *   Chủ kho chỉ được ĐỌC.
 *
 *   node tools/kiem-kho-rieng.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MK = 'mat-khau-kho-rieng-123';
const DUOI = '@kho-kiem.test';
const CHU = `chu-kho-kiem${DUOI}`;
const MOI = `nguoi-moi-kiem${DUOI}`;
const CONG = 7894;        // có mật khẩu + có danh sách tài khoản
const CONG_CHUNG = 7895;  // KHÔNG khai danh sách → mọi người chung kho gốc

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* `pathToFileURL`, không phải đường dẫn trần: trên Windows `import('C:\a\b.js')`
   bị bộ nạp ESM từ chối vì nó đọc "c:" thành tên giao thức. Bài kiểm này chạy
   bằng Node trần nên nó là bài duy nhất chạy được cả ở máy Windows — đừng để
   mất điều đó vì một dòng import. */
const nap = (f) => import(pathToFileURL(path.join(M, 'server', f)).href);
const { bam } = await nap('dangnhap.js');
const { maKho } = await nap('kho.js');

function moMayChu(cong, them = {}) {
  return spawn('node', [path.join(M, 'server', 'main.js')], {
    cwd: M, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, PORT: String(cong),
      MOTION_KHOA_PHIEN: 'khoa-kho-kiem',
      MOTION_MAT_KHAU_HASH: bam(MK),
      MOTION_DUOI_EMAIL: DUOI,
      MOTION_TAI_KHOAN: `chu-kho-kiem,nguoi-moi-kiem`,
      ...them },
  });
}

const cho = async (cong) => {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`http://127.0.0.1:${cong}/health`)).ok) return true; } catch { /* chưa lên */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};

/** Một "người dùng": giữ cookie phiên của riêng mình, y như một tab trình duyệt. */
async function vao(cong, email) {
  const goc = `http://127.0.0.1:${cong}`;
  let ve = '';
  const goi = async (duong, than, method) => {
    const r = await fetch(goc + duong, {
      method: method || (than === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', ...(ve ? { Cookie: ve } : {}) },
      body: than === undefined ? undefined : JSON.stringify(than),
      redirect: 'manual',
    });
    const dat2 = r.headers.get('set-cookie');
    if (dat2) ve = dat2.split(';')[0];
    let d = null;
    try { d = await r.json(); } catch { /* trang HTML thì thôi */ }
    return { ma: r.status, d };
  };
  const dn = await goi('/api/dang-nhap', { email, mk: MK });
  return { goi, dangNhapOk: dn.d?.ok === true };
}

const con = [];
/* Chụp danh sách file trong `scenes/` của dự án clip TRƯỚC khi chạy. Mục cuối
   đối chiếu lại: bài kiểm này không được để lại một byte nào ở đó. */
const SCENES_THAT = path.join(process.env.PROJ_ROOT || path.join(M, 'clip'), 'scenes');
const truoc = existsSync(SCENES_THAT) ? readdirSync(SCENES_THAT).sort().join('|') : '';
const KHO_MOI = path.join(M, 'kho', maKho(MOI));

try {
  /* ---------- 1. dựng máy chủ ---------- */
  console.log('\n1. Máy chủ có mật khẩu và có danh sách tài khoản');
  con.push(moMayChu(CONG));
  dat('máy chủ lên được', await cho(CONG));

  const chua = await fetch(`http://127.0.0.1:${CONG}/api/kho`, { redirect: 'manual' });
  dat('chưa đăng nhập thì /api/kho trả 401', chua.status === 401, `nhận ${chua.status}`);

  const chu = await vao(CONG, CHU);
  const moi = await vao(CONG, MOI);
  dat('chủ kho đăng nhập được', chu.dangNhapOk);
  dat('người mới đăng nhập được', moi.dangNhapOk);

  /* ---------- 2. hai kho khác nhau ---------- */
  console.log('\n2. Hai tài khoản, hai kho');
  const kChu = (await chu.goi('/api/kho')).d;
  const kMoi = (await moi.goi('/api/kho')).d;
  dat('chủ kho dùng KHO GỐC', kChu.laGoc === true && kChu.ma === 'goc');
  dat('người mới có kho riêng', kMoi.laGoc === false && kMoi.ma !== 'goc', kMoi.ma);
  dat('kho người mới trống', kMoi.soDuAn === 0, `đếm ${kMoi.soDuAn}`);

  const dsChu = (await chu.goi('/api/clips')).d.clips;
  const dsMoi = (await moi.goi('/api/clips')).d.clips;
  dat('chủ kho thấy clip sẵn có', dsChu.length > 0, `${dsChu.length} clip`);
  dat('người mới KHÔNG thấy clip của chủ kho', dsMoi.length === 0, `${dsMoi.length} clip`);
  /* Clip đời cũ là file HTML ở gốc dự án clip — của chung, nhưng chỉ kho gốc
     bày ra. Bày cho người mới thì họ mở lên, bấm mãi không sửa được. */
  dat('clip đời cũ chỉ hiện ở kho gốc',
    dsChu.some((c) => c.doi === 1) && !dsMoi.some((c) => c.doi === 1));

  /* ---------- 3. tạo dự án ---------- */
  console.log('\n3. Tạo dự án trong kho riêng');
  const t1 = await moi.goi('/api/du-an', { ten: 'Giới thiệu gói Hosting', kho: 'doc' });
  dat('tạo được', t1.ma === 201 && t1.d.ok === true, JSON.stringify(t1.d));
  dat('tên file bỏ dấu đúng', t1.d.slug === 'gioi-thieu-goi-hosting', t1.d.slug);

  const sau = (await moi.goi('/api/clips')).d.clips;
  dat('dự án hiện trong kho người mới', sau.length === 1 && sau[0].slug === t1.d.slug);
  dat('khổ dọc đúng như đã chọn', sau[0].rong === 720 && sau[0].cao === 1280);
  /* Kho riêng thì bộ dựng phải nạp kịch bản qua đường API — file nằm ngoài dự
     án clip nên `?scene=<tên>` không tới được. */
  dat('đường xem trỏ qua /api/kich-ban', sau[0].xem.includes('scene=/api/kich-ban/'), sau[0].xem);
  dat('kho gốc vẫn giữ đường xem cũ',
    dsChu.find((c) => c.doi === 2)?.xem.includes('?scene=') === true
    && !dsChu.find((c) => c.doi === 2)?.xem.includes('/api/kich-ban/'));

  const lai = (await chu.goi('/api/clips')).d.clips;
  dat('chủ kho KHÔNG thấy dự án vừa tạo', !lai.some((c) => c.slug === t1.d.slug));
  dat('số clip của chủ kho không đổi', lai.length === dsChu.length);

  /* ---------- 4. không bao giờ đè ---------- */
  console.log('\n4. Trùng tên thì từ chối, không đè');
  const t2 = await moi.goi('/api/du-an', { ten: 'Giới thiệu gói Hosting', kho: 'doc' });
  dat('trùng tên bị từ chối', t2.ma === 409);
  dat('có gợi ý tên còn trống', t2.d.goiY === 'gioi-thieu-goi-hosting-2', t2.d.goiY);
  for (const bay of ['../vibe-host', 'Có Dấu', 'a.b', '/etc/passwd']) {
    const x = await moi.goi('/api/du-an', { ten: 'Thử', slug: bay });
    dat(`tên rút gọn bậy bị chặn: ${bay}`, x.ma === 400, `nhận ${x.ma}`);
  }

  /* ---------- 5. không với sang kho người khác ---------- */
  console.log('\n5. Không ai với sang kho của ai');
  dat('chủ kho đọc kịch bản của người mới → 404',
    (await chu.goi(`/api/kich-ban/${t1.d.slug}`)).ma === 404);
  dat('chủ kho mở clip của người mới → 404',
    (await chu.goi(`/api/clip/${t1.d.slug}`)).ma === 404);
  dat('người mới mở clip của chủ kho → 404',
    (await moi.goi('/api/clip/vibe-host')).ma === 404);
  /* Chép làm mẫu cũng phải chặn — nếu không thì cửa đọc trộm nằm ngay trong
     tính năng sinh ra để tách kho. */
  dat('người mới chép clip của chủ kho làm mẫu → 404',
    (await moi.goi('/api/du-an', { ten: 'Trộm', mau: 'vibe-host' })).ma === 404);

  /* ---------- 6. sửa và lưu trong kho riêng ---------- */
  console.log('\n6. Sửa, lưu, lịch sử — tất cả trong kho riêng');
  const mo = (await moi.goi(`/api/clip/${t1.d.slug}`)).d;
  mo.doc.scenes[0].elements[0].text = 'Đã sửa';
  const luu = await moi.goi(`/api/clip/${t1.d.slug}`, { doc: mo.doc });
  dat('lưu được', luu.ma === 200 && luu.d.ok === true, JSON.stringify(luu.d).slice(0, 80));
  const lai2 = (await moi.goi(`/api/kich-ban/${t1.d.slug}`)).d;
  dat('đọc lại đúng chữ vừa sửa', lai2.scenes[0].elements[0].text === 'Đã sửa');
  const ls = (await moi.goi(`/api/history/${t1.d.slug}`)).d;
  dat('có bản cất trước khi ghi đè', Array.isArray(ls.ban) && ls.ban.length >= 1,
    `${ls.ban?.length} bản`);

  /* Nháp cũng phải chia kho: hai người đặt trùng tên dự án là chuyện thường. */
  await moi.goi(`/api/draft/${t1.d.slug}`, { doc: mo.doc }, 'PUT');
  dat('nháp nằm trong kho riêng',
    existsSync(path.join(KHO_MOI, 'nhap', `${t1.d.slug}.json`)));

  /* ---------- 7. file nằm đúng chỗ ---------- */
  console.log('\n7. File nằm đúng chỗ');
  dat('kịch bản nằm trong kho/<mã>/scenes/',
    existsSync(path.join(KHO_MOI, 'scenes', `${t1.d.slug}.json`)));
  dat('KHÔNG lọt vào scenes/ của dự án clip',
    !existsSync(path.join(SCENES_THAT, `${t1.d.slug}.json`)));
  dat('bản sao lưu cũng nằm trong kho riêng',
    existsSync(path.join(KHO_MOI, 'sao-luu', 'scenes', t1.d.slug)));

  /* ---------- 8. chưa khai danh sách thì KHÔNG chia ---------- */
  /* Đây là trạng thái của 28 bài kiểm cũ và của mọi bản chạy thử ở máy: không
     có danh sách tài khoản thì không có chủ kho, và mọi người dùng chung kho
     gốc y như trước khi có tính năng này. Đoán bừa "ai vào trước là chủ" thì
     người vào trước chiếm mất kho của người khác. */
  console.log('\n8. Chưa khai danh sách tài khoản thì mọi người chung kho gốc');
  con.push(moMayChu(CONG_CHUNG, { MOTION_TAI_KHOAN: '' }));
  dat('máy chủ thứ hai lên được', await cho(CONG_CHUNG));
  const a = await vao(CONG_CHUNG, `ai-do${DUOI}`);
  const b = await vao(CONG_CHUNG, `ai-khac${DUOI}`);
  const ka = (await a.goi('/api/kho')).d;
  const kb = (await b.goi('/api/kho')).d;
  dat('cả hai đều vào kho gốc', ka.laGoc === true && kb.laGoc === true);
  dat('và thấy cùng một số clip', ka.soDuAn === kb.soDuAn && ka.soDuAn > 0);

  /* ---------- 9. mã kho không đụng nhau ---------- */
  console.log('\n9. Mã kho');
  /* Thiếu phần băm thì `a.b@x.com` và `a-b@x.com` cùng rút gọn thành
     `a-b-x-com` — hai người dùng chung một kho, đúng cái lỗi tính năng này
     sinh ra để tránh. */
  dat('hai email rút gọn giống nhau vẫn ra hai mã khác nhau',
    maKho('a.b@x.com') !== maKho('a-b@x.com'));
  dat('cùng một email luôn ra cùng một mã', maKho(MOI) === maKho(MOI));
  dat('mã dùng được làm tên thư mục', /^[a-z0-9-]+$/.test(maKho(MOI)), maKho(MOI));
} finally {
  for (const c of con) { try { c.kill(); } catch { /* đã chết */ } }
  /* Dọn sạch kho thử. `finally` chứ không phải cuối thân hàm: bài kiểm đỏ giữa
     chừng mà vẫn phải dọn, không thì lần chạy sau thấy dự án cũ và đỏ vì một
     lý do khác hẳn. */
  rmSync(KHO_MOI, { recursive: true, force: true });
}

/* ---------- 10. không để lại dấu vết ---------- */
console.log('\n10. Không để lại dấu vết');
const sau2 = existsSync(SCENES_THAT) ? readdirSync(SCENES_THAT).sort().join('|') : '';
dat('scenes/ của dự án clip y nguyên', truoc === sau2);
dat('thư mục kho thử đã xoá', !existsSync(KHO_MOI));

console.log(hong ? `\n❌ ${hong} mục hỏng.` : '\n✅ Kho riêng: tất cả các mục đều qua.');
process.exit(hong ? 1 : 0);
