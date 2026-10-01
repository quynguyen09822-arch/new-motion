#!/usr/bin/env node
/**
 * KIỂM XƯỞNG KHỐI NỔI — Giai đoạn 1 của lộ trình 3D.
 *
 * VÌ SAO BÀI NÀY TỒN TẠI. Lỗi 3D không hiện ra thành vệt đỏ. Nó hiện ra thành
 * "hình nhìn kỳ kỳ": đèn chiếu sai mặt, khối tối chỗ đáng sáng, quay một vòng
 * xong không về đúng chỗ cũ. Soi bằng mắt thì mỗi lần soi ra một kết luận khác
 * — đúng kiểu lỗi clip bạc màu hôm 29/09 lọt qua mọi phép kiểm "có nội dung".
 *
 * Nên toàn bộ phép tính nằm ở `bachieu/hinhhoc.js`, không chạm DOM, và bài này
 * đo bằng SỐ.
 *
 * Ba thứ được canh, theo thứ tự quan trọng:
 *   ⑤ Vẽ theo giây — hỏng cái này là mất tua và mất chế độ xuất "vẽ kỹ".
 *   ⑥ Bề ngang    — hỏng cái này là người dùng chỉ biết lúc phim đã giật.
 *   ⑧ Câu chữ     — hỏng cái này là từ kỹ thuật lọt ra màn hình người dùng.
 *
 *   node tools/kiem-ba-chieu.mjs
 */
import path from 'node:path';
import { readFileSync } from 'node:fs';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
const gan = (a, b, sai = 1e-9) => Math.abs(a - b) <= sai;
const ganVec = (a, b, sai = 1e-9) => a.every((x, i) => gan(x, b[i], sai));

const H = await import(path.join(M, 'bachieu', 'hinhhoc.js'));
const K = await import(path.join(M, 'bachieu', 'khoi.js'));

console.log('\n① Sáu mặt của khối hộp');
{
  const mat = H.matCuaHop({ rong: 200, cao: 100, day: 50 });
  dat('đủ sáu mặt', mat.length === 6);
  dat('không mặt nào trùng tên', new Set(mat.map((m) => m.id)).size === 6);
  dat('pháp tuyến nào cũng dài đúng 1',
    mat.every((m) => gan(Math.hypot(...m.n), 1)),
    mat.map((m) => Math.hypot(...m.n).toFixed(3)).join(' '));
  /* Mặt đối nhau phải ngược hướng nhau. Sai chỗ này thì đèn chiếu vào mặt
     khuất, và khối nhìn như bị lộn từ trong ra ngoài. */
  for (const [a, b] of [['truoc', 'sau'], ['trai', 'phai'], ['tren', 'duoi']]) {
    const x = mat.find((m) => m.id === a).n, y = mat.find((m) => m.id === b).n;
    dat(`mặt ${a} và mặt ${b} ngược hướng nhau`, ganVec(x, y.map((v) => -v)));
  }
  /* Mặt bên rộng đúng bằng BỀ SÂU của khối, không phải bề ngang. Lộn chỗ này
     thì khối hở như hộp chưa gấp xong. */
  dat('mặt bên rộng bằng bề sâu', mat.find((m) => m.id === 'phai').w === 50);
  dat('mặt trên rộng bằng bề ngang và sâu bằng bề sâu',
    mat.find((m) => m.id === 'tren').w === 200 && mat.find((m) => m.id === 'tren').h === 50);
  /* Đúng câu lệnh CSS mà `ve.js` sẽ ghi ra — nếu đổi thì bài này phải đổi theo,
     có chủ ý, chứ không đổi lặng lẽ. */
  dat('mặt trên đặt bằng rotateX(90deg)', /rotateX\(90deg\)/.test(mat.find((m) => m.id === 'tren').bien));
}

console.log('\n② Quay khối thì pháp tuyến quay theo');
{
  const truoc = [0, 0, 1];
  dat('không quay thì giữ nguyên', ganVec(H.phapTuyen(truoc, 0, 0), truoc));
  /* CSS rotateY(90deg) đưa +z sang +x. Đây là chỗ cực dễ lộn dấu. */
  dat('xoay ngang 90° → mặt trước quay sang phải', ganVec(H.phapTuyen(truoc, 90, 0), [1, 0, 0], 1e-12));
  /* rotateX(90deg) đưa +z lên TRÊN, mà trên là -y vì +y hướng xuống. */
  dat('ngả 90° → mặt trước ngửa lên trời', ganVec(H.phapTuyen(truoc, 0, 90), [0, -1, 0], 1e-12));
  dat('xoay ngang 180° → mặt trước quay ra sau', ganVec(H.phapTuyen(truoc, 180, 0), [0, 0, -1], 1e-12));
  /* BẪY ĐÃ SẬP MỘT LẦN. Mọi phép thử trên đây đều dùng vector có x = 0, nên một
     lỗi đảo dấu ở đúng số hạng chứa x thì KHÔNG mục nào đỏ — thử bẻ gãy mới lòi
     ra. Phải có ít nhất một vector x ≠ 0, và phải soi thành phần z của nó. */
  dat('xoay ngang 90° → mặt PHẢI quay ra sau', ganVec(H.phapTuyen([1, 0, 0], 90, 0), [0, 0, -1], 1e-12));
  dat('xoay ngang -90° → mặt phải quay về trước', ganVec(H.phapTuyen([1, 0, 0], -90, 0), [0, 0, 1], 1e-12));
  /* Quay đi rồi quay về đúng chừng ấy thì phải trở lại chỗ cũ. Phép này bắt
     được gần như mọi kiểu lộn dấu, kể cả kiểu chưa nghĩ ra. */
  for (const n of [[0.6, -0.8, 0], [1, 0, 0], [0.3, 0.4, 0.866]]) {
    dat(`quay đi rồi quay về (${n.join(',')}) thì trở lại chỗ cũ`,
      ganVec(H.phapTuyen(H.phapTuyen(n, 37, 0), -37, 0), n, 1e-12)
      && ganVec(H.phapTuyen(H.phapTuyen(n, 0, 52), 0, -52), n, 1e-12));
  }
  /* Quay là phép giữ độ dài. Dài ra hay ngắn đi nghĩa là ma trận sai, và hậu
     quả là độ sáng trôi theo góc quay — khối nhấp nháy khi xoay. */
  for (const [ng, dc] of [[33, 17], [-128, 61], [250, -44]]) {
    dat(`quay (${ng}°, ${dc}°) không làm pháp tuyến dài ra`,
      gan(Math.hypot(...H.phapTuyen([0.6, -0.8, 0], ng, dc)), 1, 1e-12));
  }
}

console.log('\n③ Đèn');
{
  const den = { ngang: 0, cao: 0, nen: 0.3 };  // đèn chiếu thẳng từ phía người xem
  dat('mặt hứng thẳng đèn thì sáng nhất', gan(H.doSang([0, 0, 1], den), 1, 1e-12));
  dat('mặt quay lưng vào đèn chỉ còn ánh nền', gan(H.doSang([0, 0, -1], den), 0.3, 1e-12));
  dat('mặt nghiêng thì nằm giữa', (() => {
    const s = H.doSang([1, 0, 1].map((v) => v / Math.SQRT2), den);
    return s > 0.3 && s < 1;
  })());
  dat('ánh nền 0 thì mặt khuất đen hẳn', gan(H.doSang([0, 0, -1], { ngang: 0, cao: 0, nen: 0 }), 0));
  dat('độ sáng không bao giờ vượt 1 hay xuống dưới ánh nền', (() => {
    for (let a = -180; a <= 180; a += 7) for (let b = -90; b <= 90; b += 7) {
      const s = H.doSang(H.phapTuyen([0, 0, 1], a, b), H.DEN_MAC_DINH);
      if (s < H.DEN_MAC_DINH.nen - 1e-12 || s > 1 + 1e-12) return false;
    }
    return true;
  })());
  /* Đèn "cao" phải thật sự ở TRÊN. Lộn dấu y là đèn chiếu từ dưới lên, khối
     trông như đang bị rọi đèn pin dưới cằm. */
  dat('đèn để cao thì chiếu sáng mặt TRÊN, không phải mặt dưới', (() => {
    const d = { ngang: 0, cao: 80, nen: 0.2 };
    return H.doSang([0, -1, 0], d) > H.doSang([0, 1, 0], d);
  })());
}

console.log('\n③b Bàn đèn — kéo cái đèn tới đâu thì nó chiếu từ đó');
{
  const g = (x, y) => H.gocTuBanDen(x, y);
  dat('giữa bàn → đèn chiếu thẳng từ phía người xem',
    gan(g(0, 0).ngang, 0) && gan(g(0, 0).cao, 0));
  dat('kéo lên đỉnh → đèn trần', gan(g(0, -1).cao, 90, 1e-9));
  dat('kéo xuống đáy → đèn hắt từ dưới', gan(g(0, 1).cao, -90, 1e-9));
  /* "âm là bên trái" — đúng câu đang ghi trên giao diện. Lộn dấu ở đây là kéo
     đèn sang trái mà khối sáng bên phải. */
  dat('kéo sang trái → góc âm', g(-1, 0).ngang < -80);
  dat('kéo sang phải → góc dương', g(1, 0).ngang > 80);

  /* Kéo ra ngoài vành: phải bám vành, không được nhảy về giữa và không được
     ra số vô nghĩa. Người kéo mạnh tay là chuyện thường. */
  for (const [x, y] of [[3, 0], [-2, -2], [0, 9]]) {
    const o = g(x, y);
    dat(`kéo ra ngoài vành (${x},${y}) vẫn ra góc dùng được`,
      Number.isFinite(o.ngang) && Number.isFinite(o.cao)
      && Math.abs(o.cao) <= 90.0001 && Math.abs(o.ngang) <= 180.0001,
      `${o.ngang.toFixed(1)}° / ${o.cao.toFixed(1)}°`);
  }

  /* Mở bảng ra thì cái đèn phải nằm ĐÚNG chỗ nó đang chiếu — tức đi một vòng
     rồi về phải ra chính nó. Lệch thì mỗi lần mở bảng cái đèn lại nhích đi. */
  for (const [a, e] of [[0, 0], [-35, 45], [60, 20], [-80, -30], [15, 70]]) {
    const { x, y } = H.banDenTuGoc(a, e);
    const o = g(x, y);
    dat(`đặt đèn (${a}°, ${e}°) rồi đọc lại vẫn đúng chỗ ấy`,
      gan(o.ngang, a, 1e-9) && gan(o.cao, e, 1e-9),
      `đọc lại ${o.ngang.toFixed(1)}° / ${o.cao.toFixed(1)}°`);
  }

  /* Hướng đèn đọc từ bàn phải khớp với hướng đèn dùng để tính độ sáng — hai
     nơi lệch nhau thì xem trước nói một đằng, khối sáng một nẻo. */
  dat('chỗ kéo khớp với hướng đèn thật', (() => {
    const { x, y } = H.banDenTuGoc(-35, 45);
    const L = H.huongDen({ ngang: -35, cao: 45 });
    return gan(x, L[0], 1e-12) && gan(y, L[1], 1e-12);
  })());

  dat('tả chỗ đèn bằng lời, không bằng số',
    /trái/.test(H.taDen({ ngang: -50, cao: 40 }))
    && /phải/.test(H.taDen({ ngang: 50, cao: 40 }))
    && /chính diện/.test(H.taDen({ ngang: 2, cao: 5 })),
    H.taDen({ ngang: -50, cao: 40 }));
  dat('lời tả không lọt số hay chữ kỹ thuật',
    [[0, 0], [-35, 45], [90, -70]].every((v) => !/\d|deg|°/.test(H.taDen({ ngang: v[0], cao: v[1] }))));
}

console.log('\n④ Nhuộm màu theo độ sáng');
{
  dat('sáng hết cỡ thì giữ nguyên màu', H.mauTheoSang('#FF7A2F', 1).toLowerCase() === '#ff7a2f');
  dat('tối đi thì tối thật', (() => {
    const a = H.mauTheoSang('#FF7A2F', 1), b = H.mauTheoSang('#FF7A2F', 0.4);
    const t = (m) => parseInt(m.slice(1, 3), 16) + parseInt(m.slice(3, 5), 16) + parseInt(m.slice(5, 7), 16);
    return t(b) < t(a);
  })());
  /* Bệnh bạc màu: tối đi mà màu ngả xám. Kênh đỏ phải vẫn trội hơn kênh lam
     đúng như màu gốc. */
  dat('tối đi mà KHÔNG bạc màu', (() => {
    const b = H.mauTheoSang('#FF7A2F', 0.35);
    const [r, g, l] = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return r > g && g > l && r > l * 2;
  })(), H.mauTheoSang('#FF7A2F', 0.35));
  dat('màu viết tắt 3 ký tự vẫn hiểu', /^#[0-9a-f]{6}$/i.test(H.mauTheoSang('#f72', 0.8)));
  dat('màu không đọc được thì trả lại nguyên, không đoán bừa',
    H.mauTheoSang('xanh lá', 0.5) === 'xanh lá');
}

console.log('\n⑤ LUẬT ② — vẽ theo giây, không theo đồng hồ riêng');
{
  const k = { xoayNgang: 10, xoayDoc: 5, dong: { kieu: 'xoay-vong', chuKy: 8 } };
  dat('cùng một giây, gọi hai lần ra đúng một kết quả',
    JSON.stringify(H.gocTai(k, 3.37)) === JSON.stringify(H.gocTai(k, 3.37)));
  /* Hết một vòng phải về ĐÚNG chỗ cũ. Lệch một chút thôi là clip lặp bị giật
     một cái ở mỗi mối nối — rất khó truy vì nó chỉ hiện khi xem đủ lâu. */
  const vong = (a, b) => gan(((a - b) % 360 + 360) % 360, 0, 1e-9) || gan(((a - b) % 360 + 360) % 360, 360, 1e-9);
  dat('hết một vòng thì về đúng góc cũ', vong(H.gocTai(k, 8).ngang, H.gocTai(k, 0).ngang));
  dat('giây 3 và giây 11 trùng nhau (cùng pha)', vong(H.gocTai(k, 11).ngang, H.gocTai(k, 3).ngang));
  dat('kéo thanh tua về trước mốc 0 vẫn đúng', vong(H.gocTai(k, -2).ngang, H.gocTai(k, 6).ngang));
  dat('"Đứng im" thì giây nào cũng y hệt', (() => {
    const d = { xoayNgang: 10, xoayDoc: 5, dong: { kieu: 'dung-im', chuKy: 8 } };
    return [0, 1.7, 99].every((t) => H.gocTai(d, t).ngang === 10 && H.gocTai(d, t).doc === 5);
  })());
  {
    const l = { xoayNgang: 0, xoayDoc: 0, dong: { kieu: 'lat-the', chuKy: 4 } };
    dat('lật thẻ: đầu vòng úp mặt trước', gan(H.gocTai(l, 0).ngang, 0));
    dat('lật thẻ: giữa vòng quay đúng 180°', gan(H.gocTai(l, 2).ngang, 180));
    dat('lật thẻ: cuối vòng lật về như cũ', gan(H.gocTai(l, 4).ngang, 0, 1e-9));
  }
  dat('chu kỳ 0 không làm chia cho 0', Number.isFinite(H.gocTai({ dong: { kieu: 'xoay-vong', chuKy: 0 } }, 1).ngang));
  dat('không khai gì thì vẫn ra góc dùng được',
    Number.isFinite(H.gocTai().ngang) && Number.isFinite(H.gocTai().doc));
}

console.log('\n⑥ LUẬT ① — chiếm quá nửa khung thì phải báo TRƯỚC');
{
  /* Khối quay tới 45° thì chỗ rộng nhất là đường chéo đáy, không phải bề ngang.
     Đo bằng bề ngang là lúc xuất phim mới thấy hình bị cắt hai bên. */
  dat('đo bằng đường chéo đáy, không phải bề ngang',
    gan(H.beRongChiem({ rong: 300, day: 400 }), 500));
  dat('khối nhỏ thì im lặng', H.soatBeRong({ rong: 300, day: 300 }, 1080).length === 0);
  const b = H.soatBeRong({ rong: 800, day: 800 }, 1080);
  dat('khối to thì báo', b.length === 1);
  dat('nói rõ đang chiếm bao nhiêu phần trăm', /\d+%/.test(b[0] || ''), b[0]);
  dat('nói luôn cách đi tiếp', /thu nhỏ|vẽ kỹ/i.test(b[0] || ''));
  dat('lời nhắc không lọt chữ kỹ thuật',
    !/WebGL|GPU|fps|render|shader|mesh/i.test(b[0] || ''), b[0]);
  dat('ngưỡng đúng con số đã đo (50%)', H.NGUONG_CHIEM === 0.5);
}

console.log('\n⑦ Bố cục năm loại khối');
{
  for (const l of K.KHO_LOAI) {
    const k = K.khoiMoi(l.id);
    const bc = K.boCuc(k);
    dat(`"${l.ten}" sinh ra đã dựng được`,
      bc.kieu === 'chu' ? bc.lop >= 2 : (bc.khoiCon?.length ?? 0) >= 1);
    dat(`"${l.ten}" mới tạo đã nằm gọn trong khung dọc`,
      H.soatBeRong(k, 1080).length === 0, `rộng ${Math.round(H.beRongChiem(k))}`);
  }
  {
    const g = K.khoiMoi('gia-may-chu');
    g.tang = 6; g.cao = 40; g.khe = 10;
    const con = K.boCuc(g).khoiCon;
    dat('giá máy chủ: đúng số tầng', con.length === 6);
    /* Cụm phải cân quanh tâm sân. Lệch thì người dùng đi chỉnh vị trí của SÂN,
       rồi lần sau đổi số tầng là lệch lại — và họ không hiểu vì sao. */
    const ys = con.map((c) => c.y);
    dat('giá máy chủ: cụm cân quanh tâm', gan(Math.max(...ys) + Math.min(...ys), 0, 1e-9));
    dat('giá máy chủ: các tầng không chồng lên nhau',
      ys.slice(1).every((y, i) => gan(ys[i] - y, 50)), ys.join(' '));
    dat('giá máy chủ: chiều cao tổng đúng', K.caoTong(g) === 6 * 40 + 5 * 10);
    dat('giá máy chủ: tầng trên sáng hơn tầng dưới', con[0].pha > con[5].pha);
    g.tang = 99;
    dat('số tầng vô lý thì bị chặn lại', K.boCuc(g).khoiCon.length <= 12);
  }
  dat('thẻ lật thì mỏng, không thành hộp', K.boCuc(K.khoiMoi('the-lat')).khoiCon[0].day <= 16);
  dat('logo khối đặt dấu hiệu lên cả sáu mặt',
    Boolean(K.boCuc(K.khoiMoi('logo-khoi')).khoiCon[0].dauMoiMat));
  dat('chữ nổi: số lớp bị kẹp trong khoảng dùng được',
    K.boCuc({ loai: 'chu-noi', soLop: 500 }).lop <= 40 && K.boCuc({ loai: 'chu-noi', soLop: 0 }).lop >= 2);
}

console.log('\n⑧ Câu chữ — không để lọt tiếng máy ra màn hình');
{
  const CAM = /\b(CPU|mesh|normal map|PBR|roughness|metalness|bake|FOV|viewport|shader|vertex|polygon|WebGL|GPU|render|opacity|stagger|easing|transform|matrix)\b/i;

  const loi = [];
  for (const l of K.KHO_LOAI) if (CAM.test(l.ten + ' ' + l.mo)) loi.push(l.ten);
  for (const d of H.KHO_DONG) if (CAM.test(d.ten + ' ' + d.goi)) loi.push(d.ten);
  dat('tên loại khối và tên chuyển động sạch tiếng máy', loi.length === 0, loi.join(', '));

  dat('loại khối nào cũng có câu giải thích cho người đọc',
    K.KHO_LOAI.every((l) => l.mo && l.mo.length > 12));
  dat('chuyển động nào cũng nói rõ dùng khi nào',
    H.KHO_DONG.every((d) => d.goi && d.goi.length > 10));
  dat('tên nào cũng là tiếng Việt có dấu',
    [...K.KHO_LOAI, ...H.KHO_DONG].every((x) => /[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừử]/i.test(x.ten + x.mo + (x.goi || ''))));

  /* Chữ hiện trên trang: bóc hết thẻ, bỏ phần style và script. */
  const html = readFileSync(path.join(M, 'bachieu', 'index.html'), 'utf8')
    .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const chuTrang = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  dat('trang không in chữ kỹ thuật nào', !CAM.test(chuTrang),
    (chuTrang.match(CAM) || [''])[0]);

  /* Nhãn trong bảng vặn nằm trong giaodien.js — quét luôn phần chuỗi. */
  const gd = readFileSync(path.join(M, 'bachieu', 'giaodien.js'), 'utf8')
    .split('\n').filter((d) => !/^\s*[/*]/.test(d)).join('\n');
  const nhan = [...gd.matchAll(/'([^']{6,})'/g)].map((m) => m[1])
    .filter((s) => /[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừửĐ]/i.test(s));
  const ban = nhan.filter((s) => CAM.test(s));
  dat('nhãn trên bảng vặn sạch tiếng máy', ban.length === 0, ban.join(' | '));
  dat('bảng vặn có ít nhất 10 nhãn tiếng Việt', nhan.length >= 10, `${nhan.length} nhãn`);
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Xưởng khối nổi đạt hết.\n');
process.exit(hong ? 1 : 0);
