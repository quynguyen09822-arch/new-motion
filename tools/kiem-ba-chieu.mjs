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
 * Thứ được canh, theo thứ tự quan trọng:
 *   ①–④ Hình học và đèn — sai thì "hình nhìn kỳ kỳ", không ai truy ra.
 *   ⑦b–⑦c Cảnh và độ nặng — hỏng thì món chồng lên nhau, hoặc kéo chuột ì tay.
 *   ⑧  Câu chữ — hỏng thì từ kỹ thuật lọt ra màn hình người dùng.
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
const C = await import(path.join(M, 'bachieu', 'canh.js'));

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

console.log('\n①b Ống trụ — hình tròn dựng bằng toàn mặt phẳng');
{
  const N = 24, ban = 100, cao = 240;
  const mat = H.matCuaTru({ ban, cao, soMat: N });
  dat('đủ mặt bên cộng hai nắp', mat.length === N + 2, `${mat.length} mặt`);
  const canh = mat.filter((m) => m.id.startsWith('canh'));
  dat('pháp tuyến mặt bên nào cũng dài đúng 1',
    canh.every((m) => gan(Math.hypot(...m.n), 1, 1e-12)));
  /* Mặt bên phải chĩa NGANG ra ngoài. Lệch lên/xuống là đèn chiếu sai và ống
     trụ nhìn như bị bẹp. */
  dat('mặt bên chĩa ngang, không chếch lên xuống', canh.every((m) => gan(m.n[1], 0)));
  /* Các pháp tuyến phải RẢI ĐỀU quanh vòng. Dồn cục một phía nghĩa là tính góc
     sai, và nửa ống trụ sẽ tối om. */
  dat('pháp tuyến rải đều quanh vòng', (() => {
    const t = canh.map((m) => Math.atan2(m.n[0], m.n[2]));
    const b = 2 * Math.PI / N;
    return t.every((v, i) => i === 0 || gan(((v - t[i - 1]) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), b, 1e-9));
  })());
  /* Bề rộng là DÂY CUNG, không phải cung tròn. Lấy chu vi chia N thì mỗi mặt
     rộng dôi, các mép chồng nhau thành viền răng cưa. */
  const chuan = 2 * ban * Math.sin(Math.PI / N);
  dat('bề rộng mặt lấy theo dây cung', Math.abs(canh[0].w - chuan) <= 1.001,
    `${canh[0].w.toFixed(2)} so với dây cung ${chuan.toFixed(2)} (chu vi/N = ${(2*Math.PI*ban/N).toFixed(2)})`);
  dat('mặt bên cao đúng bằng ống', canh.every((m) => m.h === cao));
  const nap = mat.filter((m) => m.tron);
  dat('hai nắp quay lên và quay xuống',
    nap.length === 2 && ganVec(nap[0].n, [0, -1, 0]) && ganVec(nap[1].n, [0, 1, 0]));
  dat('nắp rộng đúng đường kính', nap.every((m) => m.w === ban * 2 && m.h === ban * 2));
  dat('số mặt vô lý thì bị kẹp lại',
    H.matCuaTru({ soMat: 2 }).length >= 5 && H.matCuaTru({ soMat: 999 }).length <= 66);
  /* Càng nhiều mặt càng tròn: tổng dây cung phải tiệm cận chu vi thật. */
  dat('tăng số mặt thì càng sát hình tròn thật', (() => {
    const sai = (n) => Math.abs(n * 2 * ban * Math.sin(Math.PI / n) - 2 * Math.PI * ban);
    return sai(48) < sai(24) && sai(24) < sai(8);
  })());
}

console.log('\n①c Khối cầu — mặt cong dựng bằng mặt phẳng, chia theo hai chiều');
{
  const mat = H.matCuaCau({ ban: 100, vong: 12, tang: 8 });
  dat('đủ số ô: vòng × tầng', mat.length === 96, `${mat.length} ô`);
  dat('pháp tuyến nào cũng dài đúng 1',
    mat.every((m) => gan(Math.hypot(...m.n), 1, 1e-12)));
  /* Vành trên cùng phải chĩa LÊN (y âm vì +y xuống). Lộn dấu là quả cầu lộn
     từ trong ra ngoài, và đèn chiếu vào đúng nửa khuất. */
  dat('vành trên cùng chĩa lên trời', mat[0].n[1] < -0.9, mat[0].n[1].toFixed(3));
  dat('vành dưới cùng chĩa xuống đất', mat[mat.length - 1].n[1] > 0.9);
  /* Ô ở xích đạo phải rộng nhất, ô sát cực hẹp nhất — đó chính là hình dạng
     quả cầu. Rộng bằng nhau hết nghĩa là đang dựng cái ống. */
  const xichDao = mat.filter((m) => Math.abs(m.n[1]) < 0.25).map((m) => m.w);
  const ganCuc = mat.filter((m) => Math.abs(m.n[1]) > 0.9).map((m) => m.w);
  dat('ô ở xích đạo rộng hơn hẳn ô sát cực',
    Math.min(...xichDao) > Math.max(...ganCuc) * 1.8,
    `${Math.max(...xichDao).toFixed(1)} so với ${Math.min(...ganCuc).toFixed(1)}`);
  dat('mọi ô đều có bề rộng dương', mat.every((m) => m.w > 0 && m.h > 0));
  dat('số vòng và tầng vô lý thì bị kẹp lại',
    H.matCuaCau({ vong: 1, tang: 1 }).length >= 8
    && H.matCuaCau({ vong: 999, tang: 999 }).length <= 32 * 20);
  /* Chia mịn hơn thì tổng diện tích các ô tiệm cận diện tích mặt cầu thật. */
  dat('chia càng mịn càng sát mặt cầu thật', (() => {
    const dt = (v, t) => H.matCuaCau({ ban: 100, vong: v, tang: t })
      .reduce((s, m) => s + (m.w - 1) * (m.h - 1), 0);
    const that = 4 * Math.PI * 100 * 100;
    return Math.abs(dt(24, 16) - that) < Math.abs(dt(8, 5) - that);
  })());
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

console.log('\n⑤ Kéo chuột để dời vật — đổi từ màn hình hai chiều sang không gian ba chiều');
{
  const may = (ngang, doc = 28, ti = 1) => ({ ngang, doc, ti });

  /* Máy nhìn thẳng: kéo sang phải thì vật đi sang phải, không đi đâu khác. */
  {
    const d = H.keoTrenSan(100, 0, may(0));
    dat('máy nhìn thẳng, kéo phải → vật sang phải', d.x > 0 && gan(d.z, 0, 1e-9),
      `x ${d.x.toFixed(0)} z ${d.z.toFixed(0)}`);
  }
  /* Đo thật trong trình duyệt: trục +z hiện LÊN TRÊN màn hình. Nên kéo chuột
     XUỐNG thì z phải GIẢM, có vậy vật mới bám theo ngón tay. Lộn dấu chỗ này
     là kéo xuống mà vật chạy lên — không ai dùng nổi. */
  {
    const d = H.keoTrenSan(0, 100, may(0));
    dat('kéo chuột xuống → vật đi ra xa, bám theo tay', d.z < 0 && gan(d.x, 0, 1e-9),
      `z ${d.z.toFixed(0)}`);
  }
  /* Xoay máy rồi kéo thì phải đi theo MẮT, không theo trục thế giới. Bỏ qua
     chuyện này là xoay máy sang bên, kéo sang phải mà vật chạy về phía sau. */
  {
    const d = H.keoTrenSan(100, 0, may(90));
    dat('xoay máy 90° rồi kéo phải → vật đi theo mắt, không theo trục cũ',
      gan(d.x, 0, 1e-9) && d.z > 0, `x ${d.x.toFixed(0)} z ${d.z.toFixed(0)}`);
  }
  /* Kéo đi rồi kéo về đúng chừng ấy thì phải trở lại chỗ cũ. */
  for (const g of [0, 37, -128, 215]) {
    const a = H.keoTrenSan(80, 45, may(g)), b = H.keoTrenSan(-80, -45, may(g));
    dat(`máy ở ${g}°: kéo đi rồi kéo về thì trở lại chỗ cũ`,
      gan(a.x + b.x, 0, 1e-9) && gan(a.z + b.z, 0, 1e-9));
  }
  /* Phóng to gấp đôi thì cùng một quãng chuột phải dời vật ít đi một nửa —
     không thì phóng to xong kéo nhẹ là vật bay mất khỏi màn hình. */
  dat('phóng to gấp đôi thì vật dời ít đi một nửa',
    gan(H.keoTrenSan(100, 0, may(0, 28, 2)).x * 2, H.keoTrenSan(100, 0, may(0, 28, 1)).x, 1e-9));

  /* BẪY CHIA CHO 0: ngả máy về 0 là mặt sàn nhìn đúng ngang tầm, chiều sâu bẹp
     thành số 0. Không chặn thì nhích một pixel là vật văng ra vô cực. */
  for (const dc of [0, 0.5, -0.3, 90, -90]) {
    const d = H.keoTrenSan(10, 10, may(0, dc));
    dat(`ngả máy ${dc}° vẫn ra số hữu hạn`,
      Number.isFinite(d.x) && Number.isFinite(d.z) && Math.abs(d.z) < 1e4,
      `z ${d.z.toFixed(0)}`);
  }
  dat('ngả máy 0 thì bị chặn đúng ngưỡng đã khai',
    gan(Math.abs(H.keoTrenSan(0, 1, may(0, 0)).z), 1 / H.SIN_TOI_THIEU, 1e-9));
  dat('thu nhỏ hết cỡ cũng không chia cho 0',
    Number.isFinite(H.keoTrenSan(10, 10, may(0, 28, 0)).x));

  /* Nâng hạ: kéo chuột LÊN thì vật phải LÊN. */
  dat('Shift + kéo lên → vật nâng lên', H.keoTheoCao(-100, { doc: 28, ti: 1 }) > 0);
  dat('Shift + kéo xuống → vật hạ xuống', H.keoTheoCao(100, { doc: 28, ti: 1 }) < 0);
  dat('nhìn thẳng từ nóc xuống cũng không nổ',
    Number.isFinite(H.keoTheoCao(100, { doc: 90, ti: 1 })));
}

console.log('\n⑥ Bề ngang một món — dùng để xếp món vào chỗ trống');
{
  /* Luật "quá nửa khung phim" đã bỏ cùng với khung phim (xem ⑦c). Phép ĐO bề
     ngang thì giữ, vì `canh.js` cần nó để xếp món mới khỏi chồng lên món cũ. */
  dat('khối hộp: đo bằng đường chéo đáy, không bằng bề ngang',
    gan(H.beRongChiem({ rong: 300, day: 400 }), 500));
  dat('ống trụ tròn xoay: đo bằng đường kính',
    gan(H.beRongChiem({ loai: 'tru', ban: 150 }), 300));
  dat('biểu đồ: tính cả khe hở giữa các cột',
    H.beRongChiem({ loai: 'bieu-do', cot: [1, 2, 3], rongCot: 60, khe: 20, day: 60 }) > 220);
  dat('không khai gì thì vẫn ra số dùng được', Number.isFinite(H.beRongChiem()));
}

console.log('\n⑦ Bố cục năm loại khối');
{
  for (const l of K.KHO_LOAI) {
    const k = K.khoiMoi(l.id);
    const bc = K.boCuc(k);
    dat(`"${l.ten}" sinh ra đã dựng được`,
      bc.kieu === 'chu' ? bc.lop >= 2 : (bc.khoiCon?.length ?? 0) >= 1);
    dat(`"${l.ten}" mới tạo có bề ngang đo được`,
      H.beRongChiem(k) > 0 && Number.isFinite(H.beRongChiem(k)),
      `rộng ${Math.round(H.beRongChiem(k))}`);
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
  {
    const t = K.khoiMoi('tru');
    const con = K.boCuc(t).khoiCon[0];
    dat('ống trụ: khai đúng là hình trụ', con.hinh === 'tru');
    /* Ống trụ TRÒN XOAY: quay kiểu gì cũng chỉ rộng bằng đường kính. Lấy đường
       chéo cho nó là tính dôi 41% và lời nhắc "quá nửa khung" kêu oan. */
    dat('ống trụ đo bề ngang bằng đường kính, không bằng đường chéo',
      gan(H.beRongChiem(t), 2 * t.ban), `${H.beRongChiem(t)} so với đường kính ${2 * t.ban}`);
  }
  {
    const b = K.khoiMoi('bieu-do');
    b.cot = [20, 50, 100]; b.rongCot = 60; b.khe = 20; b.caoMax = 200;
    const con = K.boCuc(b).khoiCon;
    dat('biểu đồ: đúng số cột', con.length === 3);
    /* Cột mọc từ MỘT ĐÁY CHUNG. Căn theo tâm thì cột thấp lơ lửng giữa không
       trung và biểu đồ hết nghĩa. */
    dat('mọi cột chung một đáy',
      con.every((c) => gan(c.y - c.cao / 2, con[0].y - con[0].cao / 2, 1e-9)),
      con.map((c) => (c.y - c.cao / 2).toFixed(1)).join(' '));
    dat('cột cao nhất đúng bằng bề cao đã đặt', gan(Math.max(...con.map((c) => c.cao)), 200));
    dat('chiều cao cột đúng tỉ lệ với số liệu',
      gan(con[0].cao / con[2].cao, 0.2, 1e-9) && gan(con[1].cao / con[2].cao, 0.5, 1e-9));
    dat('cụm cột cân quanh tâm',
      gan(Math.min(...con.map((c) => c.x)) + Math.max(...con.map((c) => c.x)), 0, 1e-9));
    dat('các cột không chồng lên nhau',
      con.slice(1).every((c, i) => c.x - con[i].x >= 60), con.map((c) => c.x).join(' '));
    /* Số 0 hoặc toàn số 0 là ca hay làm vỡ: chia cho 0. */
    const khong = K.boCuc({ loai: 'bieu-do', cot: [0, 0, 0], caoMax: 200 }).khoiCon;
    dat('toàn số 0 vẫn dựng được, không chia cho 0',
      khong.length === 3 && khong.every((c) => Number.isFinite(c.cao) && c.cao > 0));
    dat('quá nhiều cột thì bị kẹp lại',
      K.boCuc({ loai: 'bieu-do', cot: Array(50).fill(10) }).khoiCon.length <= 12);
  }
  {
    /* LINH VẬT. Đây KHÔNG phải bản sao của hình gốc — hình gốc toàn mặt cong
       hữu cơ. Đây là bản 3D kiểu đồ chơi, nên thứ phải canh là TỈ LỆ và việc
       các bộ phận có đúng chỗ không, chứ không phải nó giống tới mấy phần trăm. */
    const nv = K.khoiMoi('nhan-vat');
    const con = K.boCuc(nv).khoiCon;
    dat('nhân vật: đủ bộ phận', con.length >= 20, `${con.length} bộ phận`);
    dat('nhân vật: bộ phận nào cũng có màu riêng',
      con.every((c) => c.mauRieng), con.filter((c) => !c.mauRieng).map((c) => c.id).join(', ') || 'đủ cả');
    dat('nhân vật: dùng cả cầu, trụ và hộp',
      new Set(con.map((c) => c.hinh)).size === 3,
      [...new Set(con.map((c) => c.hinh))].join(' '));
    /* Mới sinh ra đã phải nằm trong luật 50% của chính nó. Để nó ra đời đã vượt
       mốc thì lời nhắc kêu ngay lần đầu mở, và người dùng học cách bỏ qua. */
    dat('nhân vật: bề ngang theo đúng hệ số to nhỏ',
      gan(H.beRongChiem({ ...nv, co: 2 }) / H.beRongChiem(nv), 2 / nv.co, 1e-9),
      `${Math.round(H.beRongChiem(nv))}px ở cỡ ${nv.co}`);
    dat('nhân vật: núm độ lớn ăn vào mọi bộ phận', (() => {
      const to = K.boCuc({ ...nv, co: 2 }).khoiCon;
      return to.every((c, i) => {
        const g = con[i], ti = nv.co / 2;
        return gan((c.ban ?? c.rong) * ti, (g.ban ?? g.rong), 1e-9);
      });
    })());
    /* Hai mắt phải ĐỐI XỨNG. Lệch một bên là nhân vật nhìn như bị méo mặt, mà
       soi bằng mắt thì rất khó thấy lệch mấy pixel. */
    const cau = con.filter((c) => c.hinh === 'cau');
    const trai = cau.filter((c) => c.x < -1), phai = cau.filter((c) => c.x > 1);
    dat('nhân vật: hai bên đối xứng', trai.length === phai.length
      && trai.every((t) => phai.some((f) => gan(f.x, -t.x) && gan(f.y, t.y) && gan(f.ban, t.ban))),
      `${trai.length} bên trái / ${phai.length} bên phải`);
    /* Mặt phải NẰM TRONG mũ trùm. Lọt ra ngoài là mất hẳn dáng mũ. */
    dat('nhân vật: khuôn mặt nằm gọn trong mũ trùm', (() => {
      const mu = con.find((c) => c.mauRieng === K.MAU_LINH_VAT.doTuoi && c.ban > 150);
      const mt = con.find((c) => c.mauRieng === K.MAU_LINH_VAT.da);
      if (!mu || !mt) return false;
      return mt.ban < mu.ban && Math.abs(mt.y - mu.y) < mu.ban;
    })());
  }
  dat('thẻ lật thì mỏng, không thành hộp', K.boCuc(K.khoiMoi('the-lat')).khoiCon[0].day <= 16);
  dat('logo khối đặt dấu hiệu lên cả sáu mặt',
    Boolean(K.boCuc(K.khoiMoi('logo-khoi')).khoiCon[0].dauMoiMat));
  dat('chữ nổi: số lớp bị kẹp trong khoảng dùng được',
    K.boCuc({ loai: 'chu-noi', soLop: 500 }).lop <= 40 && K.boCuc({ loai: 'chu-noi', soLop: 0 }).lop >= 2);
}

console.log('\n⑦b Cảnh — nhiều món, một máy quay');
{
  const c = C.canhMoi('hop');
  dat('cảnh mới có đúng một món', c.mon.length === 1);
  /* Món phải ĐỨNG TRÊN SÀN (mặt y = 0), không lơ lửng ở tâm. Để y = 0 là mỗi
     món chìm một nửa xuống đất. */
  dat('món mới đứng trên sàn, không chìm một nửa',
    gan(c.mon[0].vi.y, K.caoTong(c.mon[0]) / 2), `y = ${c.mon[0].vi.y}`);
  C.themMon(c, 'tru'); C.themMon(c, 'hop');
  dat('thêm được món', c.mon.length === 3);
  /* Tên trùng phải tự đánh số, không thì danh sách có hai dòng "Hộp" và không
     ai biết dòng nào là món nào. */
  dat('tên trùng thì tự đánh số',
    new Set(c.mon.map((m) => m.ten)).size === 3, c.mon.map((m) => m.ten).join(' · '));
  /* Thả đúng gốc toạ độ thì món mới chồng khít lên món cũ, và người dùng tưởng
     bấm hụt. Đây là lỗi hay gặp nhất ở mọi trình dựng cảnh. */
  dat('món mới tự xếp sang chỗ trống, không chồng lên món cũ', (() => {
    for (let i = 1; i < c.mon.length; i++) {
      const a = c.mon[i - 1], b = c.mon[i];
      if (b.vi.x - a.vi.x < (C.rongMon(a) + C.rongMon(b)) / 2) return false;
    }
    return true;
  })(), c.mon.map((m) => `${m.ten}@${m.vi.x}`).join(' '));

  const b = C.hopBao(c);
  dat('hộp bao ôm hết các món',
    b.rong >= C.rongMon(c.mon[0]) && b.rong > 0 && b.cao > 0,
    `rộng ${Math.round(b.rong)} cao ${Math.round(b.cao)}`);
  dat('tâm hộp bao nằm giữa món đầu và món cuối',
    b.tamX > c.mon[0].vi.x && b.tamX < c.mon[c.mon.length - 1].vi.x);

  const z = C.thuPhongVua(c, 900, 600);
  dat('thu phóng vừa khung ra số dùng được', z.ti > 0 && z.ti <= 3, z.ti.toFixed(3));
  dat('cảnh rộng hơn thì phải thu nhỏ hơn',
    C.thuPhongVua(c, 400, 300).ti < C.thuPhongVua(c, 1800, 1200).ti);

  const n0 = c.mon.length;
  const ban = C.nhanBan(c, c.mon[0].id);
  dat('nhân đôi ra món mới, không dùng chung chỗ đứng',
    c.mon.length === n0 + 1 && ban.vi !== c.mon[0].vi && ban.vi.x !== c.mon[0].vi.x);
  dat('xoá được món', C.xoaMon(c, ban.id) && c.mon.length === n0);
  dat('xoá món không có thì không nổ', C.xoaMon(c, 'khong-co-that') === false);
}

console.log('\n⑦c Luật MỚI thay luật khung phim: đếm mảnh, không đếm bề ngang');
{
  /* Bỏ khung phim thì luật "quá nửa bề ngang" hết nghĩa. Nhưng LÝ DO sinh ra
     nó vẫn còn: máy chủ không có chip đồ hoạ riêng. Nên đo lại đúng thứ thật
     sự tốn — tổng số mảnh. Bỏ một luật thì phải thay bằng luật đúng. */
  const c = C.canhMoi('hop');
  dat('một khối hộp thì im', C.soatCanh(c, K.boCuc).length === 0);
  dat('đếm đúng số mảnh của khối hộp', C.soMatMon(c.mon[0], K.boCuc) === 6);
  dat('đếm được cả món ghép nhiều bộ phận',
    C.soMatMon(K.khoiMoi('nhan-vat'), K.boCuc) > 900);
  for (let i = 0; i < 4; i++) C.themMon(c, 'nhan-vat');
  const nhac = C.soatCanh(c, K.boCuc);
  dat('cảnh nặng thì nhắc', nhac.length === 1);
  dat('nói rõ đang có bao nhiêu mảnh', /\d/.test(nhac[0] || ''), nhac[0]);
  dat('và chỉ cách làm nhẹ đi', /bớt món|hạ độ mịn/i.test(nhac[0] || ''));
  dat('lời nhắc không lọt chữ kỹ thuật',
    !/DOM|GPU|fps|render|mesh|polygon/i.test(nhac[0] || ''));
  /* Món bị ẩn thì không vẽ, nên không được tính vào độ nặng. */
  for (const m of c.mon) if (m.loai === 'nhan-vat') m.an = true;
  dat('món đang ẩn thì không tính vào độ nặng', C.soatCanh(c, K.boCuc).length === 0);
}

console.log('\n⑧ Câu chữ — không để lọt tiếng máy ra màn hình');
{
  const CAM = /\b(CPU|mesh|normal map|PBR|roughness|metalness|bake|FOV|viewport|shader|vertex|polygon|WebGL|GPU|render|opacity|stagger|easing|transform|matrix)\b/i;

  const loi = [];
  for (const l of K.KHO_LOAI) if (CAM.test(l.ten + ' ' + l.mo)) loi.push(l.ten);
  dat('tên loại khối sạch tiếng máy', loi.length === 0, loi.join(', '));

  dat('loại khối nào cũng có câu giải thích cho người đọc',
    K.KHO_LOAI.every((l) => l.mo && l.mo.length > 12));
  dat('tên nào cũng là tiếng Việt có dấu',
    K.KHO_LOAI.every((x) => /[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừử]/i.test(x.ten + x.mo)));

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
