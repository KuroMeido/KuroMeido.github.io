(function(){
  var API_URL = (window.THO_CONFIG && window.THO_CONFIG.apiUrl) || "";

  var RATE = 10000;
  var TASKS = [
    {id:"cage",  label:"Dọn chuồng thỏ"},
    {id:"feed",  label:"Cho thỏ ăn"},
    {id:"water", label:"Lấy nước cho thỏ"},
    {id:"laundry", label:"Phơi đồ"}
  ];
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICON = {
    cam:   SVG + '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    clock: SVG + '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: SVG + '<path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    redo:  SVG + '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>'
  };
  var CHIP = { none:"Chụp ảnh để nộp", pending:"Chờ nghiệm thu", approved:"Đã duyệt", rejected:"Làm lại, chụp ảnh mới" };
  var ERRORS = {
    bad_pin:"Sai mã PIN.",
    locked:"Nhập sai nhiều lần. Thử lại sau 10 phút.",
    bad_new_pin:"Mã PIN mới gồm đúng 4 chữ số.",
    already_approved:"Việc này đã được duyệt rồi.",
    nothing_owed:"Chưa có khoản nào cần trả.",
    bad_image:"Ảnh quá lớn hoặc không đọc được. Hãy chụp lại."
  };
  var NET_ERR = "Không kết nối được Google Sheet. Kiểm tra mạng rồi thử lại.";

  var state = { days:{}, payouts:[], hasPin:false, photos:{}, photoReq:{}, today:ymd(new Date()),
    parent:false, pinValue:"", pin:null, pinMsg:"", confirming:false, loaded:false, err:"", sig:"" };
  var busy = 0;

  function pad(n){ return n < 10 ? "0"+n : ""+n; }
  function ymd(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  function parse(s){ var p = s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
  function money(n){ return n.toLocaleString("vi-VN") + "đ"; }
  function $(id){ return document.getElementById(id); }
  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function taskLabel(id){ for(var i=0;i<TASKS.length;i++) if(TASKS[i].id === id) return TASKS[i].label; return id; }
  function errText(code){ return ERRORS[code] || "Có lỗi xảy ra. Thử lại sau."; }

  /* ---------- Mạng ---------- */
  function post(body){ return fetch(API_URL, { method:"POST", body:JSON.stringify(body) }).then(function(r){ return r.json(); }); }
  function get(q){ return fetch(API_URL + "?" + q).then(function(r){ return r.json(); }); }

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

  function refresh(){
    if(!API_URL) return;
    get("a=state").then(function(s){
      if(s && s.items){ if(state.err === NET_ERR){ state.err = ""; } applyState(s); render(); }
    }).catch(function(){
      if(!state.loaded){ state.err = NET_ERR; render(); }
    });
  }

  /* Gửi một thay đổi lên Google Sheet và đồng bộ lại theo kết quả máy chủ. */
  function write(body){
    busy++;
    return post(body).then(function(res){
      busy--;
      if(res && res.error){
        state.err = errText(res.error);
        if(res.error === "bad_pin" || res.error === "locked"){ state.parent = false; state.pinValue = ""; state.confirming = false; }
      } else { state.err = ""; }
      if(res && res.items && busy === 0){ state.sig = ""; applyState(res); }
      else if(!(res && res.items)){ refresh(); }
      render();
      return res;
    }).catch(function(){
      busy--; state.err = NET_ERR; render(); refresh();
    });
  }

  /* ---------- Dữ liệu theo ngày ---------- */
  function itemsOf(key){ var d = state.days[key]; return d ? d.items : {}; }
  function statusOf(key, id){ var it = itemsOf(key)[id]; return it ? it.status : "none"; }
  function countBy(key, st){ var it = itemsOf(key), n = 0; Object.keys(it).forEach(function(k){ if(it[k].status === st) n++; }); return n; }
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
  function dayLabel(key){ return parse(key).toLocaleDateString("vi-VN", { weekday:"short", day:"numeric", month:"numeric" }); }
  function timeLabel(ms){ return ms ? new Date(ms).toLocaleString("vi-VN", { weekday:"short", day:"numeric", month:"numeric", hour:"2-digit", minute:"2-digit" }) : ""; }

  /* ---------- Ảnh ---------- */
  function pkey(day, id){ var it = itemsOf(day)[id]; return day + "_" + id + "@" + (it ? it.at : 0); }
  function photoOf(day, id){
    var it = itemsOf(day)[id];
    if(!it || !it.photo || !API_URL) return null;
    var k = pkey(day, id);
    if(state.photos[k]) return state.photos[k];
    if(!state.photoReq[k]){
      state.photoReq[k] = 1;
      get("a=photo&id=" + encodeURIComponent(day + "_" + id)).then(function(r){
        if(r && r.img){ state.photos[k] = r.img; render(); } else { delete state.photoReq[k]; }
      }).catch(function(){ delete state.photoReq[k]; });
    }
    return null;
  }

  function compress(file){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function(){
        var s = Math.min(1, 900 / Math.max(im.width, im.height));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", 0.72));
      };
      im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error("img")); };
      im.src = url;
    });
  }

  function canWrite(){ return !!API_URL && state.loaded; }

  function submit(id, file){
    if(!canWrite()) return;
    var day = state.today;
    compress(file).then(function(img){
      var at = Math.floor(Date.now() / 1000) * 1000;
      var d = state.days[day] || (state.days[day] = { date:day, items:{} });
      d.items[id] = { status:"pending", at:at, money:RATE, photo:true };
      state.photos[day + "_" + id + "@" + at] = img;
      state.err = ""; render();
      write({ a:"submit", day:day, task:id, img:img, at:at });
    }).catch(function(){ state.err = errText("bad_image"); render(); });
  }

  function reviewMany(list, ok){
    if(!state.pinValue || !list.length) return;
    list.forEach(function(p){
      var it = itemsOf(p.key)[p.id];
      if(it && it.status === "pending"){ it.status = ok ? "approved" : "rejected"; it.reviewedAt = Date.now(); }
    });
    render();
    write({ a:"review", pin:state.pinValue, items:list.map(function(p){ return { d:p.key, t:p.id, ok:ok }; }) });
  }

  function monthLabel(key){ return "Tháng " + parseInt(key.slice(5), 10) + "/" + key.slice(0, 4); }

  /* Gom tiền theo tháng: đã duyệt, đã trả, còn nợ. */
  function monthRows(){
    var map = {};
    function row(k){ return map[k] || (map[k] = { key:k, earned:0, paid:0, count:0 }); }
    Object.keys(state.days).forEach(function(day){
      var e = earnedOf(day), c = countBy(day, "approved");
      if(c > 0){ var r = row(day.slice(0, 7)); r.earned += e; r.count += c; }
    });
    state.payouts.forEach(function(p){ if(p.d){ row(String(p.d).slice(0, 7)).paid += p.amount || 0; } });
    return Object.keys(map).sort().reverse().map(function(k){ var r = map[k]; r.owed = Math.max(0, r.earned - r.paid); return r; });
  }

  function pay(monthKey){
    state.confirming = false;
    var m = monthRows().filter(function(x){ return x.key === monthKey; })[0];
    if(!state.pinValue || !m || m.owed <= 0){ render(); return; }
    state.payouts = state.payouts.concat([{ d:monthKey, amount:m.owed }]);
    render();
    write({ a:"pay", pin:state.pinValue, month:monthKey, date:state.today });
  }

  /* ---------- Phần dành cho mụ phù thủy ---------- */
  function renderParent(){
    var box = $("parent");
    var formKey = state.pin ? state.pin + "|" + state.pinMsg : "";
    if(formKey && box.dataset.form === formKey) return;
    box.dataset.form = formKey;
    box.innerHTML = "";
    var pend = pendingList();

    if(!state.parent && !state.pin){
      var h = el("h2", null, "Dành cho mụ phù thủy");
      if(pend.length) h.appendChild(el("span", "badge", pend.length + " chờ duyệt"));
      box.appendChild(h);
      box.appendChild(el("p", "hint", "Cuối ngày xem ảnh bé nộp rồi duyệt. Tiền chỉ được tính cho việc đã duyệt."));
      var go = el("button", "act", "Nghiệm thu"); go.type = "button"; go.id = "parent-open"; go.disabled = !canWrite();
      go.addEventListener("click", function(){ state.pin = state.hasPin ? "enter" : "set"; state.pinMsg = ""; render(); });
      box.appendChild(go);
      return;
    }

    if(state.pin){
      var mode = state.pin;
      box.appendChild(el("h2", null, mode === "enter" ? "Nhập mã PIN" : mode === "set" ? "Tạo mã PIN cho mụ phù thủy" : "Đổi mã PIN"));
      var form = document.createElement("form"); form.style.cssText = "display:flex;flex-direction:column;gap:12px";
      var field = function(id, label){
        var f = el("div", "field"); var l = el("label", null, label); l.setAttribute("for", id);
        var i = document.createElement("input"); i.className = "pin"; i.id = id; i.type = "password"; i.inputMode = "numeric"; i.maxLength = 4; i.autocomplete = "off";
        f.appendChild(l); f.appendChild(i); return f;
      };
      if(mode === "change") form.appendChild(field("pinCur", "Mã PIN hiện tại"));
      form.appendChild(field("pin1", mode === "enter" ? "Mã PIN 4 số" : "Mã PIN mới, 4 số"));
      if(mode !== "enter") form.appendChild(field("pin2", "Nhập lại mã PIN mới"));
      if(state.pinMsg) form.appendChild(el("div", "msg", state.pinMsg));
      var r = el("div", "row");
      var ok = el("button", "act", "Xác nhận"); ok.type = "submit";
      var cancel = el("button", "act ghost", "Hủy"); cancel.type = "button";
      cancel.addEventListener("click", function(){ state.pin = null; state.pinMsg = ""; render(); });
      r.appendChild(ok); r.appendChild(cancel); form.appendChild(r);
      form.addEventListener("submit", function(e){
        e.preventDefault();
        var v1 = $("pin1").value, v2 = $("pin2") ? $("pin2").value : v1, cur = $("pinCur") ? $("pinCur").value : "";
        var fail = function(m){ ok.disabled = false; state.pinMsg = m; render(); };
        if(!/^\d{4}$/.test(v1)) return fail("Mã PIN gồm đúng 4 chữ số.");
        if(mode !== "enter" && v1 !== v2) return fail("Hai lần nhập chưa giống nhau.");
        if(mode === "change" && !/^\d{4}$/.test(cur)) return fail("Mã PIN hiện tại gồm đúng 4 chữ số.");
        var body = mode === "enter" ? { a:"checkpin", pin:v1 } : mode === "set" ? { a:"setpin", newPin:v1 } : { a:"setpin", pin:cur, newPin:v1 };
        ok.disabled = true;
        post(body).then(function(res){
          if(res && res.ok){
            state.parent = true; state.pinValue = v1; state.pin = null; state.pinMsg = "";
            state.sig = ""; applyState(res); render();
          } else {
            fail(errText(res && res.error));
          }
        }).catch(function(){ fail(NET_ERR); });
      });
      box.appendChild(form);
      return;
    }

    /* Chế độ nghiệm thu */
    var head = el("h2", null, "Nghiệm thu");
    var out = el("button", "act ghost", "Thoát"); out.type = "button"; out.id = "parent-exit";
    out.addEventListener("click", function(){ state.parent = false; state.pinValue = ""; state.confirming = false; render(); });
    head.appendChild(out); box.appendChild(head);

    if(!pend.length){
      box.appendChild(el("p", "hint", "Không có việc nào đang chờ duyệt."));
    } else {
      var all = el("button", "act", "Duyệt tất cả (" + pend.length + ")"); all.type = "button"; all.id = "approve-all";
      all.addEventListener("click", function(){ reviewMany(pend, true); });
      box.appendChild(all);
      var q = el("ul", "queue");
      pend.forEach(function(p){
        var li = el("li", "rev");
        var rh = el("div", "rev-h"); rh.appendChild(el("b", null, taskLabel(p.id))); rh.appendChild(el("small", null, timeLabel(p.item.at) || dayLabel(p.key)));
        li.appendChild(rh);
        var ph = photoOf(p.key, p.id);
        if(ph){ var im = document.createElement("img"); im.src = ph; im.alt = "Ảnh nộp: " + taskLabel(p.id); li.appendChild(im); }
        else li.appendChild(el("div", "none", p.item.photo ? "Đang tải ảnh…" : "Không có ảnh"));
        var ra = el("div", "row");
        var yes = el("button", "act", "Duyệt +" + money(p.item.money || RATE)); yes.type = "button";
        yes.addEventListener("click", function(){ reviewMany([p], true); });
        var no = el("button", "act warn", "Làm lại"); no.type = "button";
        no.addEventListener("click", function(){ reviewMany([p], false); });
        ra.appendChild(yes); ra.appendChild(no); li.appendChild(ra);
        q.appendChild(li);
      });
      box.appendChild(q);
    }

    box.appendChild(el("h2", null, "Trả tiền theo tháng"));
    var months = monthRows();
    if(!months.some(function(m){ return m.owed > 0; })) box.appendChild(el("p", "hint", "Chưa có tháng nào cần trả."));
    var pl2 = el("ul", "list"); pl2.style.marginTop = "0";
    months.forEach(function(m){
      var li = el("li"); li.style.alignItems = "center";
      var l = el("div", "l"); l.appendChild(el("span", null, monthLabel(m.key)));
      l.appendChild(el("small", null, "Đã duyệt " + m.count + " việc · " + money(m.earned) + (m.paid ? " · đã trả " + money(m.paid) : "")));
      li.appendChild(l);
      var r = el("div", "row"); r.style.justifyContent = "flex-end";
      if(m.owed <= 0){
        r.appendChild(el("span", "chip approved", "Đã trả đủ"));
      } else if(state.confirming === m.key){
        var y = el("button", "act", "Xác nhận trả " + money(m.owed)); y.type = "button"; y.id = "pay-yes";
        y.addEventListener("click", function(){ pay(m.key); });
        var n = el("button", "act ghost", "Hủy"); n.type = "button"; n.addEventListener("click", function(){ state.confirming = false; render(); });
        r.appendChild(y); r.appendChild(n);
      } else {
        var b = el("button", "act", "Đã trả " + money(m.owed)); b.type = "button"; b.id = "pay-start-" + m.key;
        b.addEventListener("click", function(){ state.confirming = m.key; render(); });
        r.appendChild(b);
      }
      li.appendChild(r); pl2.appendChild(li);
    });
    box.appendChild(pl2);

    var chg = el("button", "act ghost", "Đổi mã PIN"); chg.type = "button"; chg.id = "pin-change";
    chg.addEventListener("click", function(){ state.pin = "change"; state.pinMsg = ""; render(); });
    box.appendChild(chg);
  }

  /* ---------- Vẽ trang ---------- */
  function render(){
    $("date").textContent = parse(state.today).toLocaleDateString("vi-VN", { weekday:"long", day:"numeric", month:"long" });
    var A = countBy(state.today, "approved"), P = countBy(state.today, "pending");
    $("todayMoney").textContent = money(earnedOf(state.today));
    $("todayCount").textContent = A + "/" + TASKS.length + " đã duyệt" + (P ? " · " + P + " chờ nghiệm thu" : "");
    Array.prototype.forEach.call($("bar").children, function(e, i){ e.className = i < A ? "ok" : (i < A + P ? "wait" : ""); });
    $("setup").hidden = !!API_URL;
    $("loading").hidden = !API_URL || state.loaded || !!state.err;
    var er = $("err"); er.hidden = !state.err; er.textContent = state.err;
    var live = canWrite();

    var ul = $("chores"); ul.innerHTML = "";
    TASKS.forEach(function(t){
      var st = statusOf(state.today, t.id);
      var photo = photoOf(state.today, t.id);
      var li = document.createElement("li");
      var row = el("label", "chore " + st + (live ? "" : " off")); row.id = "chore-" + t.id;
      var bx = el("span", "box"); bx.innerHTML = st === "approved" ? ICON.check : st === "pending" ? ICON.clock : st === "rejected" ? ICON.redo : ICON.cam;
      var meta = el("span", "meta"); meta.appendChild(el("span", "label", t.label));
      var sub = el("span", "sub"); sub.appendChild(el("span", "chip " + st, CHIP[st])); sub.appendChild(el("span", "pay", "+" + money(RATE)));
      meta.appendChild(sub);
      row.appendChild(bx); row.appendChild(meta);
      if(photo){ var im = el("img", "thumb"); im.src = photo; im.alt = "Ảnh " + t.label; row.appendChild(im); }
      if(st !== "approved" && live){
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.setAttribute("capture", "environment");
        inp.id = "file-" + t.id; inp.setAttribute("aria-label", t.label + ": chụp ảnh để nộp");
        inp.addEventListener("change", function(){ var f = inp.files && inp.files[0]; if(f) submit(t.id, f); });
        row.appendChild(inp);
      }
      li.appendChild(row); ul.appendChild(li);
    });

    $("week").textContent = money(sumFrom(weekStartKey()));
    $("month").textContent = money(sumFrom(monthStartKey()));
    $("owed").textContent = money(owed());
    renderParent();

    var hist = $("history"); hist.innerHTML = "";
    var keys = Object.keys(state.days).filter(function(k){
      return (parse(state.today) - parse(k)) / 86400000 < 14 && (countBy(k, "approved") + countBy(k, "pending")) > 0;
    }).sort().reverse();
    if(!keys.length){ var e = el("li"); e.appendChild(el("span", "l hint", "Chưa có ngày nào được ghi.")); hist.appendChild(e); }
    keys.forEach(function(k){
      var li = el("li"); var l = el("div", "l"); l.appendChild(el("span", null, dayLabel(k)));
      var pp = countBy(k, "pending");
      l.appendChild(el("small", null, countBy(k, "approved") + "/" + TASKS.length + " đã duyệt" + (pp ? " · " + pp + " chờ nghiệm thu" : "")));
      li.appendChild(l); li.appendChild(el("div", "r", money(earnedOf(k)))); hist.appendChild(li);
    });

    var pl = $("payouts"); pl.innerHTML = "";
    var ms = monthRows().slice(0, 6);
    if(!ms.length){ var e2 = el("li"); e2.appendChild(el("span", "l hint", "Chưa có tháng nào được tính tiền.")); pl.appendChild(e2); }
    ms.forEach(function(m){
      var li = el("li"); var l = el("div", "l"); l.appendChild(el("span", null, monthLabel(m.key)));
      l.appendChild(el("small", null, m.owed > 0 ? "Còn " + money(m.owed) + " chưa trả" : "Đã trả đủ"));
      li.appendChild(l); li.appendChild(el("div", m.owed > 0 ? "r" : "r paid", money(m.earned))); pl.appendChild(li);
    });
  }

  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "hidden"){
      state.parent = false; state.pinValue = ""; state.pin = null; state.confirming = false;
    } else {
      var t = ymd(new Date());
      if(t !== state.today){ state.today = t; state.confirming = false; }
      render(); refresh();
    }
  });
  setInterval(function(){ if(document.visibilityState === "visible" && !busy && !state.pin) refresh(); }, 20000);

  render();
  refresh();
})();
