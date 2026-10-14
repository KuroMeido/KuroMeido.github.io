/* Trang của bé: tick việc bằng cách chụp ảnh nộp, xem tiền. Không có phần nghiệm thu. */
(function(){
  var T = Tho, S = T.state, $ = T.$, el = T.el, money = T.money;

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

  /* id là mã việc hằng ngày, hoặc mã cấp side quest (q15, q45, qhk): mỗi lần nộp side quest là một bài mới. */
  function submit(base, file){
    if(!T.canWrite()) return;
    var day = S.today;
    compress(file).then(function(img){
      var id = T.isQuest(base) ? T.newQuestId(base, day) : base;
      if(!id){ S.err = "Hôm nay đã nộp quá nhiều bài. Hãy nhờ mụ phù thủy duyệt trước."; render(); return; }
      var at = Math.floor(Date.now() / 1000) * 1000;
      var d = S.days[day] || (S.days[day] = { date:day, items:{} });
      d.items[id] = { status:"pending", at:at, money:T.rateOf(id), photo:true };
      S.photos[T.photoKey(day, id, at)] = img;
      S.err = ""; render();
      T.write({ a:"submit", day:day, task:id, img:img, at:at });
    }).catch(function(){ S.err = T.errText("bad_image"); render(); });
  }

  /* Side quest: ba cấp để nộp bài điểm 10, và danh sách các lần đã nộp. */
  function renderQuests(live){
    var ul = $("questList"); ul.innerHTML = "";
    T.QUESTS.forEach(function(q){
      var li = document.createElement("li");
      var row = el("label", "chore none" + (live ? "" : " off")); row.id = "quest-" + q.id;
      var bx = el("span", "box"); bx.innerHTML = T.ICON.cam;
      var meta = el("span", "meta"); meta.appendChild(el("span", "label", q.label));
      var sub = el("span", "sub"); sub.appendChild(el("span", "chip none", "Nộp bài điểm 10")); sub.appendChild(el("span", "pay", "+" + money(q.reward)));
      meta.appendChild(sub);
      row.appendChild(bx); row.appendChild(meta);
      if(live){
        var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.setAttribute("capture", "environment");
        inp.id = "file-" + q.id; inp.setAttribute("aria-label", q.label + ": chụp ảnh bài điểm 10 để nộp");
        inp.addEventListener("change", function(){ var f = inp.files && inp.files[0]; if(f){ submit(q.id, f); inp.value = ""; } });
        row.appendChild(inp);
      }
      li.appendChild(row); ul.appendChild(li);
    });

    var qh = $("questHistory"); qh.innerHTML = "";
    var list = T.questList(60);
    if(!list.length){ var e0 = el("li"); e0.appendChild(el("span", "l hint", "Chưa nộp bài nào.")); qh.appendChild(e0); }
    list.forEach(function(p){
      var li = el("li"); var l = el("div", "l"); l.appendChild(el("span", null, T.taskLabel(p.id).replace("Side quest: ", "")));
      l.appendChild(el("small", null, T.timeLabel(p.item.at) + " · " + T.STATUS_TEXT[p.item.status]));
      li.appendChild(l); li.appendChild(el("div", p.item.status === "approved" ? "r paid" : "r", money(T.rateOf(p.id)))); qh.appendChild(li);
    });
  }

  function render(){
    T.renderDate();
    T.renderNotes();
    var A = T.countBy(S.today, "approved"), P = T.countBy(S.today, "pending");
    $("todayMoney").textContent = money(T.earnedOf(S.today));
    $("todayCount").textContent = A + "/" + T.TASKS.length + " đã duyệt" + (P ? " · " + P + " chờ nghiệm thu" : "");
    Array.prototype.forEach.call($("bar").children, function(e, i){ e.className = i < A ? "ok" : (i < A + P ? "wait" : ""); });
    var live = T.canWrite();

    var ul = $("chores"); ul.innerHTML = "";
    T.TASKS.forEach(function(t){
      var st = T.statusOf(S.today, t.id);
      var photo = T.photoOf(S.today, t.id);
      var li = document.createElement("li");
      var row = el("label", "chore " + st + (live ? "" : " off")); row.id = "chore-" + t.id;
      var bx = el("span", "box"); bx.innerHTML = st === "approved" ? T.ICON.check : st === "pending" ? T.ICON.clock : st === "rejected" ? T.ICON.redo : T.ICON.cam;
      var meta = el("span", "meta"); meta.appendChild(el("span", "label", t.label));
      var sub = el("span", "sub"); sub.appendChild(el("span", "chip " + st, T.CHIP[st])); sub.appendChild(el("span", "pay", "+" + money(T.RATE)));
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

    renderQuests(live);

    $("week").textContent = money(T.sumFrom(T.weekStartKey()));
    $("month").textContent = money(T.sumFrom(T.monthStartKey()));
    $("owed").textContent = money(T.owed());

    var hist = $("history"); hist.innerHTML = "";
    var keys = Object.keys(S.days).filter(function(k){
      return (T.parse(S.today) - T.parse(k)) / 86400000 < 14 && (T.countBy(k, "approved", true) + T.countBy(k, "pending", true)) > 0;
    }).sort().reverse();
    if(!keys.length){ var e = el("li"); e.appendChild(el("span", "l hint", "Chưa có ngày nào được ghi.")); hist.appendChild(e); }
    keys.forEach(function(k){
      var li = el("li"); var l = el("div", "l"); l.appendChild(el("span", null, T.dayLabel(k)));
      var pp = T.countBy(k, "pending");
      var qa = T.questCount(k, "approved");
      l.appendChild(el("small", null, T.countBy(k, "approved") + "/" + T.TASKS.length + " đã duyệt" + (qa ? " · " + qa + " side quest" : "") + (pp ? " · " + pp + " chờ nghiệm thu" : "")));
      li.appendChild(l); li.appendChild(el("div", "r", money(T.earnedOf(k)))); hist.appendChild(li);
    });

    var pl = $("payouts"); pl.innerHTML = "";
    var ms = T.monthRows().slice(0, 6);
    if(!ms.length){ var e2 = el("li"); e2.appendChild(el("span", "l hint", "Chưa có tháng nào được tính tiền.")); pl.appendChild(e2); }
    ms.forEach(function(m){
      var li = el("li"); var l = el("div", "l"); l.appendChild(el("span", null, T.monthLabel(m.key)));
      l.appendChild(el("small", null, m.owed > 0 ? "Còn " + money(m.owed) + " chưa trả" : "Đã trả đủ"));
      li.appendChild(l); li.appendChild(el("div", m.owed > 0 ? "r" : "r paid", money(m.earned))); pl.appendChild(li);
    });
  }

  T.onChange = render;
  T.start();
})();
