#!/usr/bin/env node
/**
 * ĐẶT MẬT KHẨU cho trình sửa clip.
 *
 *   npm run dat-mat-khau
 *
 * Gõ mật khẩu hai lần, nó cất DẠNG BĂM (scrypt, muối ngẫu nhiên) vào `.env` của
 * repo này. Ai mở được file đó cũng không đọc ra được mật khẩu.
 *
 * KHÔNG NHẬN MẬT KHẨU QUA THAM SỐ DÒNG LỆNH. Tham số dòng lệnh nằm lại trong
 * lịch sử shell và hiện ra với mọi tiến trình khác qua `ps` — nghĩa là mật khẩu
 * rò ra ngay lúc đặt. Phải gõ vào, và gõ thì KHÔNG HIỆN trên màn hình.
 *
 * Muốn gỡ mật khẩu (cho app chạy mở lại) thì xoá dòng `MOTION_MAT_KHAU_HASH`
 * trong `.env`.
 */
import { createInterface } from 'node:readline';
import { bam, ghiEnv } from '../server/dangnhap.js';

const TOI_THIEU = 8;

/** Đọc một dòng mà KHÔNG hiện ra màn hình. */
function hoiKin(cau) {
  return new Promise((xong) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const ra = process.stdout;
    /* Nuốt mọi ký tự readline định in ra, trừ chính câu hỏi. Không có bước này
       thì mật khẩu hiện nguyên trên màn hình — và màn hình thì có người nhìn,
       có phần mềm quay lại. */
    const viet = ra.write.bind(ra);
    let cho = true;
    rl._writeToOutput = (s) => { if (cho) { viet(cau); cho = false; } };
    viet(cau);
    rl.question('', (tl) => { viet('\n'); rl.close(); xong(tl); });
  });
}

const mk = await hoiKin('Mật khẩu mới: ');
if (!mk) { console.error('\n❌ Chưa gõ gì cả.'); process.exit(1); }
if (mk.length < TOI_THIEU) {
  console.error(`\n❌ Mật khẩu chỉ ${mk.length} ký tự. Phải từ ${TOI_THIEU} ký tự trở lên.`);
  process.exit(1);
}
const lai = await hoiKin('Gõ lại cho chắc: ');
if (mk !== lai) { console.error('\n❌ Hai lần gõ không giống nhau. Chưa đổi gì cả.'); process.exit(1); }

ghiEnv('MOTION_MAT_KHAU_HASH', bam(mk));
console.log('\n✅ Đã đặt mật khẩu.');
console.log('   Khởi động lại trình sửa là nó bắt đầu hỏi mật khẩu.');
console.log('   Muốn bỏ thì xoá dòng MOTION_MAT_KHAU_HASH trong .env.');
