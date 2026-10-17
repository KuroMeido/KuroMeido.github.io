/* Phần dùng chung của hai trang (bé và nghiệm thu): dữ liệu, kết nối Google Sheet, tính tiền.
 * Mỗi trang đặt Tho.onChange để vẽ lại giao diện khi dữ liệu đổi. */
(function(){
  var API_URL = (window.THO_CONFIG && window.THO_CONFIG.apiUrl) || "";

  var RATE = 10000;
  /* Đổi giá việc hằng ngày theo ngày áp dụng (yyyy-MM-dd). Phải giống RATE_CHANGES trong apps-script/Code.gs.
   * Chỉ ảnh hưởng ngày hiển thị và dòng mới nộp, tiền đã ghi trong Sheet không đổi. */
  var RATE_CHANGES = { cage: [{ from: "2026-10-18", money: 15000 }] };
  var TASKS = [
    {id:"cage",  label:"Dọn chuồng thỏ"},
    {id:"feed",  label:"Cho thỏ ăn"},
    {id:"water", label:"Lấy nước cho thỏ"},
    {id:"laundry", label:"Phơi đồ"}
  ];
  /* Side quest: nộp bài kiểm tra điểm 10 để đổi thưởng. Mỗi lần nộp là một bài riêng (q15, q15-2, ...). */
  var QUESTS = [
    {id:"q15", label:"Bài kiểm tra 15 phút", reward:5000},
    {id:"q45", label:"Bài kiểm tra 1 tiết",  reward:10000},
    {id:"qhk", label:"Bài thi học kì",       reward:20000}
  ];
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICON = {
    cam:   SVG + '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    clock: SVG + '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: SVG + '<path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    redo:  SVG + '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>'
  };
  var CHIP = { none:"Chụp ảnh để nộp", pending:"Chờ nghiệm thu", approved:"Đã duyệt", rejected:"Làm lại, chụp ảnh mới" };
  var STATUS_TEXT = { pending:"Chờ nghiệm thu", approved:"Đã duyệt", rejected:"Làm lại" };
  var ERRORS = {
    bad_pin:"Sai mã PIN.",
    locked:"Nhập sai nhiều lần. Thử lại sau 10 phút.",
    bad_new_pin:"Mã PIN mới gồm đúng 4 chữ số.",
    already_approved:"Việc này đã được duyệt rồi.",
    nothing_owed:"Chưa có khoản nào cần trả.",
    bad_image:"Ảnh quá lớn hoặc không đọc được. Hãy chụp lại."
  };
  var NET_ERR = "Không kết nối được Google Sheet. Kiểm tra mạng rồi thử lại.";

  var state = { days:{}, payouts:[], hasPin:false, photos:{}, photoReq:{}, today:ymd(new Date()), loaded:false, err:"", sig:"" };
  var busy = 0;
  var T = { state:state, RATE:RATE, TASKS:TASKS, QUESTS:QUESTS, STATUS_TEXT:STATUS_TEXT, ICON:ICON, CHIP:CHIP, ERRORS:ERRORS, NET_ERR:NET_ERR, onChange:null, onError:null, onHide:null, pauseRefresh:null };

  /* ---------- Tiện ích ---------- */
  function pad(n){ return n < 10 ? "0"+n : ""+n; }
  function ymd(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  function parse(s){ var p = s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
  function money(n){ return n.toLocaleString("vi-VN") + "đ"; }
  function $(id){ return document.getElementById(id); }
  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function questOf(id){ var m = /^(q15|q45|qhk)(?:-(\d{1,2}))?$/.exec(id); if(!m) return null; for(var i=0;i<QUESTS.length;i++) if(QUESTS[i].id === m[1]) return { quest:QUESTS[i], n:m[2] ? +m[2] : 1 }; return null; }
  function isQuest(id){ return !!questOf(id); }
  /* Tiền của một mã việc: việc hằng ngày là RATE, side quest theo cấp. */
  function rateOf(id, day){
    var q = questOf(id); if(q) return q.quest.reward;
    var m = RATE, d = day || state.today;
    (RATE_CHANGES[id] || []).forEach(function(c){ if(d >= c.from) m = c.money; });
    return m;
  }
  function taskLabel(id){
    var q = questOf(id);
    if(q) return "Side quest: " + q.quest.label + " điểm 10" + (q.n > 1 ? " #" + q.n : "");
    for(var i=0;i<TASKS.length;i++) if(TASKS[i].id === id) return TASKS[i].label;
    return id;
  }
  function errText(code){ return ERRORS[code] || "Có lỗi xảy ra. Thử lại sau."; }
  function dayLabel(key){ return parse(key).toLocaleDateString("vi-VN", { weekday:"short", day:"numeric", month:"numeric" }); }
  function timeLabel(ms){ return ms ? new Date(ms).toLocaleString("vi-VN", { weekday:"short", day:"numeric", month:"numeric", hour:"2-digit", minute:"2-digit" }) : ""; }
  function monthLabel(key){ return "Tháng " + parseInt(key.slice(5), 10) + "/" + key.slice(0, 4); }
  function render(){ if(T.onChange) T.onChange(); }
  T.isQuest = isQuest; T.rateOf = rateOf; T.$ = $; T.el = el; T.ymd = ymd; T.parse = parse; T.money = money; T.taskLabel = taskLabel; T.errText = errText;
  T.dayLabel = dayLabel; T.timeLabel = timeLabel; T.monthLabel = monthLabel; T.render = render;

  /* ---------- Mạng ---------- */
  function post(body){ return fetch(API_URL, { method:"POST", body:JSON.stringify(body) }).then(function(r){ return r.json(); }); }
  function get(q){ return fetch(API_URL + "?" + q).then(function(r){ return r.json(); }); }
  T.post = post; T.get = get;

  function applyState(s){
    if(!s || !s.items) return;
    var sig = JSON.stringify([s.items, s.payouts, s.hasPin]);
    if(sig === state.sig && state.loaded) return;
    state.sig = sig;
    var days = {};
    s.items.forEach(function(x){
      var d = days[x.d] || (days[x.d] = { date:x.d, items:{} });
      d.items[x.t] = { status:x.s, at:x.at, reviewedAt:x.rt, money:x.m, photo:!!x.p };
    });
    state.days = days; state.payouts = s.payouts || []; state.hasPin = !!s.hasPin; state.loaded = true;
    render();
  }
  T.applyState = applyState;

  function refresh(){
    if(!API_URL) return;
    get("a=state").then(function(s){
      if(s && s.items){ if(state.err === NET_ERR){ state.err = ""; } applyState(s); render(); }
    }).catch(function(){
      if(!state.loaded){ state.err = NET_ERR; render(); }
    });
  }
  T.refresh = refresh;

  /* Gửi một thay đổi lên Google Sheet và đồng bộ lại theo kết quả máy chủ. */
  T.write = function(body){
    busy++;
    return post(body).then(function(res){
      busy--;
      if(res && res.error){
        state.err = errText(res.error);
        if(T.onError) T.onError(res.error);
      } else { state.err = ""; }
      if(res && res.items && busy === 0){ state.sig = ""; applyState(res); }
      else if(!(res && res.items)){ refresh(); }
      render();
      return res;
    }).catch(function(){
      busy--; state.err = NET_ERR; render(); refresh();
    });
  };

  T.canWrite = function(){ return !!API_URL && state.loaded; };

  /* ---------- Dữ liệu theo ngày và tháng ---------- */
  function itemsOf(key){ var d = state.days[key]; return d ? d.items : {}; }
  function statusOf(key, id){ var it = itemsOf(key)[id]; return it ? it.status : "none"; }
  /* Đếm theo trạng thái. Mặc định chỉ đếm việc hằng ngày; all=true đếm cả side quest. */
  function countBy(key, st, all){ var it = itemsOf(key), n = 0; Object.keys(it).forEach(function(k){ if(it[k].status === st && (all || !isQuest(k))) n++; }); return n; }
  function questCount(key, st){ return countBy(key, st, true) - countBy(key, st); }
  function earnedOf(key){
    var it = itemsOf(key), t = 0;
    Object.keys(it).forEach(function(k){ if(it[k].status === "approved") t += it[k].money || RATE; });
    return t;
  }
  function pendingList(){
    var out = [];
    Object.keys(state.days).sort().forEach(function(key){
      var it = itemsOf(key);
      Object.keys(it).forEach(function(id){ if(it[id].status === "pending") out.push({ key:key, id:id, item:it[id] }); });
    });
    return out;
  }
  function weekStartKey(){ var d = parse(state.today); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
  function monthStartKey(){ var d = parse(state.today); d.setDate(1); return ymd(d); }
  function sumFrom(startKey){ var t = 0; Object.keys(state.days).forEach(function(k){ if(k >= startKey && k <= state.today) t += earnedOf(k); }); return t; }
  function totalEarned(){ var t = 0; Object.keys(state.days).forEach(function(k){ t += earnedOf(k); }); return t; }
  function totalPaid(){ return state.payouts.reduce(function(a,p){ return a + (p.amount||0); }, 0); }
  function owed(){ return Math.max(0, totalEarned() - totalPaid()); }

  /* Gom tiền theo tháng: đã duyệt, đã trả, còn nợ. */
  function monthRows(){
    var map = {};
    function row(k){ return map[k] || (map[k] = { key:k, earned:0, paid:0, count:0 }); }
    Object.keys(state.days).forEach(function(day){
      var e = earnedOf(day), c = countBy(day, "approved", true);
      if(c > 0){ var r = row(day.slice(0, 7)); r.earned += e; r.count += c; }
    });
    state.payouts.forEach(function(p){ if(p.d){ row(String(p.d).slice(0, 7)).paid += p.amount || 0; } });
    return Object.keys(map).sort().reverse().map(function(k){ var r = map[k]; r.owed = Math.max(0, r.earned - r.paid); return r; });
  }
  T.itemsOf = itemsOf; T.statusOf = statusOf; T.countBy = countBy; T.questCount = questCount; T.earnedOf = earnedOf; T.pendingList = pendingList;
  T.weekStartKey = weekStartKey; T.monthStartKey = monthStartKey; T.sumFrom = sumFrom; T.owed = owed; T.monthRows = monthRows;

  /* ---------- Ảnh ---------- */
  function photoOf(day, id){
    var it = itemsOf(day)[id];
    if(!it || !it.photo || !API_URL) return null;
    var k = day + "_" + id + "@" + it.at;
    if(state.photos[k]) return state.photos[k];
    if(!state.photoReq[k]){
      state.photoReq[k] = 1;
      get("a=photo&id=" + encodeURIComponent(day + "_" + id)).then(function(r){
        if(r && r.img){ state.photos[k] = r.img; render(); } else { delete state.photoReq[k]; }
      }).catch(function(){ delete state.photoReq[k]; });
    }
    return null;
  }
  T.photoOf = photoOf;

  /* Mã mới cho một lần nộp side quest trong ngày: q15, q15-2, q15-3... */
  T.newQuestId = function(base, day){
    var it = itemsOf(day);
    for(var n = 1; n <= 99; n++){ var id = n === 1 ? base : base + "-" + n; if(!it[id]) return id; }
    return null;
  };
  /* Các lần nộp side quest trong số ngày gần đây, mới nhất trước. */
  T.questList = function(days){
    var out = [];
    Object.keys(state.days).forEach(function(day){
      if((parse(state.today) - parse(day)) / 86400000 >= days) return;
      var it = itemsOf(day);
      Object.keys(it).forEach(function(id){ if(isQuest(id)) out.push({ key:day, id:id, item:it[id] }); });
    });
    return out.sort(function(a, b){ return (b.item.at || 0) - (a.item.at || 0); });
  };
  T.photoKey = function(day, id, at){ return day + "_" + id + "@" + at; };

  /* ---------- Phần đầu trang dùng chung ---------- */
  T.renderDate = function(){
    $("date").textContent = parse(state.today).toLocaleDateString("vi-VN", { weekday:"long", day:"numeric", month:"long" });
  };
  T.renderNotes = function(){
    $("setup").hidden = !!API_URL;
    $("loading").hidden = !API_URL || state.loaded || !!state.err;
    var er = $("err"); er.hidden = !state.err; er.textContent = state.err;
  };

  /* ---------- Khởi động ---------- */
  T.start = function(){
    document.addEventListener("visibilitychange", function(){
      if(document.visibilityState === "hidden"){
        if(T.onHide) T.onHide();
      } else {
        var t = ymd(new Date());
        if(t !== state.today) state.today = t;
        render(); refresh();
      }
    });
    setInterval(function(){
      if(document.visibilityState === "visible" && !busy && !(T.pauseRefresh && T.pauseRefresh())) refresh();
    }, 20000);
    render();
    refresh();
  };

  window.Tho = T;
})();
