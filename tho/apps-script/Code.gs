/**
 * Tiền công chăm thỏ - máy chủ lưu dữ liệu trên Google Sheet.
 * Dán toàn bộ file này vào Apps Script của Google Sheet (Tiện ích mở rộng > Apps Script),
 * rồi Triển khai > Ứng dụng web (Chạy với tư cách: Tôi, Ai có quyền truy cập: Bất kỳ ai).
 *
 * Dữ liệu:
 *  - Sheet "Công việc": mỗi dòng là một việc của một ngày (trạng thái, giờ nộp, giờ duyệt, tiền, ảnh).
 *  - Sheet "Đã trả": mỗi lần mụ phù thủy trả tiền, tính theo tháng.
 *  - Ảnh nằm trong thư mục Drive "tho-photos" (riêng tư, chỉ chủ Sheet mở được trực tiếp).
 *  - Mã PIN của mụ phù thủy lưu dưới dạng băm trong Script Properties, không nằm trong Sheet.
 */
var RATE = 10000;
/* Đổi giá theo ngày áp dụng (yyyy-MM-dd). Giá tính theo ngày của việc, ghi vào cột Tiền lúc nộp và không bao giờ tính lại cho dòng cũ.
 * Việc không có trong bảng này dùng RATE. Thêm mốc mới ở cuối danh sách của việc đó. */
var RATE_CHANGES = { cage: [{ from: "2026-10-18", money: 15000 }] };
function rateFor(t, day) {
  var m = RATE;
  (RATE_CHANGES[t] || []).forEach(function (c) { if (String(day) >= c.from) m = c.money; });
  return m;
}
var TASKS = { cage: "Dọn chuồng thỏ", feed: "Cho thỏ ăn", water: "Lấy nước cho thỏ", laundry: "Phơi đồ" };
/* Side quest: bài kiểm tra điểm 10 đổi thưởng. Mỗi lần nộp là một dòng riêng, mã dạng q15, q15-2, q15-3... */
var QUESTS = {
  q15: { name: "Side quest: Bài kiểm tra 15 phút điểm 10", money: 5000 },
  q45: { name: "Side quest: Bài kiểm tra 1 tiết điểm 10", money: 10000 },
  qhk: { name: "Side quest: Bài thi học kì điểm 10", money: 20000 }
};
var FOLDER_NAME = "tho-photos";
var SHEET_ITEMS = "Công việc";
var SHEET_PAID = "Đã trả";
var ITEM_HEADERS = ["Ngày", "Mã việc", "Việc", "Trạng thái", "Nộp lúc", "Duyệt lúc", "Tiền", "Mã ảnh Drive", "Link ảnh"];
var PAID_HEADERS = ["Tháng", "Số tiền", "Lúc"];
var STATUS_TO_TEXT = { pending: "Chờ nghiệm thu", approved: "Đã duyệt", rejected: "Làm lại" };
var TEXT_TO_STATUS = { "Chờ nghiệm thu": "pending", "Đã duyệt": "approved", "Làm lại": "rejected" };
var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
var TIME_FORMAT = "dd/MM/yyyy HH:mm"; // hiển thị ngày giờ phút trong Sheet (múi giờ của Sheet)

function doGet(e) {
  var p = (e && e.parameter) || {};
  return out(handle({ a: p.a || "state", id: p.id }));
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  return out(handle(body));
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function handle(r) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (r.a) {
      case "state": return stateOut({});
      case "photo": return photo(r.id);
      case "submit": return submit(r);
      case "review": return review(r);
      case "pay": return pay(r);
      case "checkpin": return checkPinOut(r);
      case "setpin": return setPin(r);
    }
    return { error: "bad_action" };
  } catch (err) {
    return { error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Sheet helpers ---------- */
function getSheet(name, headers) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), 2).setNumberFormat("@");
    formatTimeColumns(sh, name);
  } else if (sh.getRange(1, 1).getValue() !== headers[0]) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  }
  return sh;
}
/** Cột giờ: Công việc có "Nộp lúc" (E) và "Duyệt lúc" (F); Đã trả có "Lúc" (C). */
function formatTimeColumns(sh, name) {
  var col = name === SHEET_ITEMS ? 5 : 3;
  var n = name === SHEET_ITEMS ? 2 : 1;
  sh.getRange(2, col, Math.max(1, sh.getMaxRows() - 1), n).setNumberFormat(TIME_FORMAT);
  for (var i = 0; i < n; i++) sh.setColumnWidth(col + i, 130);
}
function dayText(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v);
}
function ms(v) { return v instanceof Date ? v.getTime() : (v ? Number(v) : 0); }

function readItems() {
  var sh = getSheet(SHEET_ITEMS, ITEM_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, ITEM_HEADERS.length).getValues();
  var items = [];
  rows.forEach(function (r, i) {
    if (!r[0]) return;
    items.push({ row: i + 2, d: dayText(r[0]), t: String(r[1]), s: TEXT_TO_STATUS[r[3]] || "pending", at: ms(r[4]), rt: ms(r[5]), m: Number(r[6]) || RATE, fid: String(r[7] || "") });
  });
  return items;
}
function readPaid() {
  var sh = getSheet(SHEET_PAID, PAID_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 3).getValues().filter(function (r) { return r[0]; }).map(function (r) {
    return { d: dayText(r[0]), amount: Number(r[1]) || 0 };
  });
}
function findItem(items, d, t) {
  for (var i = 0; i < items.length; i++) if (items[i].d === d && items[i].t === t) return items[i];
  return null;
}
function writeItem(row, v) {
  var sh = getSheet(SHEET_ITEMS, ITEM_HEADERS);
  sh.getRange(row, 1, 1, ITEM_HEADERS.length).setValues([v]);
  sh.getRange(row, 5, 1, 2).setNumberFormat(TIME_FORMAT);
}
/** Tên và tiền của một mã việc (việc hằng ngày hoặc side quest). Trả null nếu mã không hợp lệ. */
function taskInfo(t, day) {
  t = String(t || "");
  if (TASKS.hasOwnProperty(t)) return { name: TASKS[t], money: rateFor(t, day) };
  var m = /^(q15|q45|qhk)(?:-(\d{1,2}))?$/.exec(t);
  if (m) return { name: QUESTS[m[1]].name + (m[2] ? " #" + m[2] : ""), money: QUESTS[m[1]].money };
  return null;
}
function itemRow(d, t, status, at, rt, money, fid) {
  return [d, t, (taskInfo(t) || { name: t }).name, STATUS_TO_TEXT[status], at ? new Date(at) : "", rt ? new Date(rt) : "", money, fid || "", fid ? "https://drive.google.com/file/d/" + fid + "/view" : ""];
}

/* ---------- Trạng thái trả về cho trang ---------- */
function stateOut(extra) {
  var items = readItems().map(function (x) { return { d: x.d, t: x.t, s: x.s, at: x.at, rt: x.rt, m: x.m, p: !!x.fid }; });
  extra.items = items;
  extra.payouts = readPaid();
  extra.hasPin = !!PropertiesService.getScriptProperties().getProperty("PIN_HASH");
  return extra;
}

/* ---------- PIN ---------- */
function hashPin(pin) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "tho:" + pin);
  return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
function checkPin(pin) {
  var props = PropertiesService.getScriptProperties();
  var stored = props.getProperty("PIN_HASH");
  if (!stored) return "no_pin";
  var until = Number(props.getProperty("LOCK_UNTIL") || 0);
  if (Date.now() < until) return "locked";
  if (/^\d{4}$/.test(String(pin)) && hashPin(String(pin)) === stored) {
    props.setProperty("FAILS", "0");
    return "ok";
  }
  var fails = Number(props.getProperty("FAILS") || 0) + 1;
  if (fails >= 5) {
    props.setProperty("FAILS", "0");
    props.setProperty("LOCK_UNTIL", String(Date.now() + 10 * 60 * 1000));
    return "locked";
  }
  props.setProperty("FAILS", String(fails));
  return "bad_pin";
}
function checkPinOut(r) {
  var res = checkPin(r.pin);
  if (res !== "ok") return { error: res };
  return stateOut({ ok: true });
}
function setPin(r) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty("PIN_HASH")) {
    var res = checkPin(r.pin);
    if (res !== "ok") return { error: res };
  }
  if (!/^\d{4}$/.test(String(r.newPin))) return { error: "bad_new_pin" };
  props.setProperty("PIN_HASH", hashPin(String(r.newPin)));
  return stateOut({ ok: true });
}

/* ---------- Bé nộp bài ---------- */
function photoFolder() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
function submit(r) {
  var d = String(r.day || ""), t = String(r.task || "");
  var info = taskInfo(t, d);
  if (!DAY_RE.test(d) || !info) return { error: "bad_input" };
  var img = String(r.img || "");
  var prefix = "data:image/jpeg;base64,";
  if (img.indexOf(prefix) !== 0 || img.length > 600000) return { error: "bad_image" };
  var at = Number(r.at);
  if (!at || Math.abs(Date.now() - at) > 2 * 86400000) at = Date.now();

  var items = readItems();
  var cur = findItem(items, d, t);
  if (cur && cur.s === "approved") return stateOut({ error: "already_approved" });

  var blob = Utilities.newBlob(Utilities.base64Decode(img.slice(prefix.length)), "image/jpeg", d + "_" + t + "_" + at + ".jpg");
  var file = photoFolder().createFile(blob);
  if (cur && cur.fid) { try { DriveApp.getFileById(cur.fid).setTrashed(true); } catch (err) {} }

  var row = itemRow(d, t, "pending", at, 0, info.money, file.getId());
  if (cur) writeItem(cur.row, row);
  else {
    var sh = getSheet(SHEET_ITEMS, ITEM_HEADERS);
    writeItem(sh.getLastRow() + 1, row);
  }
  return stateOut({ ok: true });
}

function photo(pid) {
  var m = /^(\d{4}-\d{2}-\d{2})_([\w-]+)$/.exec(String(pid || ""));
  if (!m) return { error: "bad_input" };
  var it = findItem(readItems(), m[1], m[2]);
  if (!it || !it.fid) return { error: "no_photo" };
  var bytes = DriveApp.getFileById(it.fid).getBlob().getBytes();
  return { img: "data:image/jpeg;base64," + Utilities.base64Encode(bytes), at: it.at };
}

/* ---------- Mụ phù thủy nghiệm thu và trả tiền ---------- */
function review(r) {
  var res = checkPin(r.pin);
  if (res !== "ok") return { error: res };
  var items = readItems();
  var now = Date.now();
  (r.items || []).forEach(function (x) {
    var it = findItem(items, String(x.d), String(x.t));
    if (!it || it.s !== "pending") return;
    var status = x.ok ? "approved" : "rejected";
    writeItem(it.row, itemRow(it.d, it.t, status, it.at, now, it.m, it.fid));
    it.s = status;
  });
  return stateOut({ ok: true });
}

function pay(r) {
  var res = checkPin(r.pin);
  if (res !== "ok") return { error: res };
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var month = String(r.month || "");
  if (!/^\d{4}-\d{2}$/.test(month)) month = (DAY_RE.test(String(r.date)) ? String(r.date) : today).slice(0, 7);
  var earned = 0, paid = 0;
  readItems().forEach(function (x) { if (x.s === "approved" && x.d.slice(0, 7) === month) earned += x.m; });
  readPaid().forEach(function (p) { if (p.d.slice(0, 7) === month) paid += p.amount; });
  var owed = earned - paid;
  if (owed <= 0) return stateOut({ error: "nothing_owed" });
  var sh = getSheet(SHEET_PAID, PAID_HEADERS);
  var payRow = sh.getLastRow() + 1;
  sh.getRange(payRow, 1, 1, 3).setValues([[month, owed, new Date()]]);
  sh.getRange(payRow, 3).setNumberFormat(TIME_FORMAT);
  return stateOut({ ok: true });
}

/** Chạy hàm này trong trình soạn thảo: Google hỏi quyền truy cập Sheet và Drive (lần đầu), đồng thời định dạng lại cột giờ cho các dòng đã có. Chạy lại bao nhiêu lần cũng được. */
function authorize() {
  formatTimeColumns(getSheet(SHEET_ITEMS, ITEM_HEADERS), SHEET_ITEMS);
  formatTimeColumns(getSheet(SHEET_PAID, PAID_HEADERS), SHEET_PAID);
  photoFolder();
}
