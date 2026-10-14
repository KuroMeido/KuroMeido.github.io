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

  function submit(id, file){
    if(!T.canWrite()) return;
    var day = S.today;
    compress(file).then(function(img){
      var at = Math.floor(Date.now() / 1000) * 1000;
      var d = S.days[day] || (S.days[day] = { date:day, items:{} });
      d.items[id] = { status:"pending", at:at, money:T.RATE, photo:true };
      S.photos[T.photoKey(day, id, at)] = img;
      S.err = ""; render();
      T.write({ a:"submit", day:day, task:id, img:img, at:at });
    }).catch(function(){ S.err = T.errText("bad_image"); render(); });
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

    $("week").textContent = money(T.sumFrom(T.weekStartKey()));
    $("month").textContent = money(T.sumFrom(T.monthStartKey()));
    $("owed").textContent = money(T.owed());

    var hist = $("history"); hist.innerHTML = "";
    var keys = Object.keys(S.days).filter(function(k){
      return (T.parse(S.today) - T.parse(k)) / 86400000 < 14 && (T.countBy(k, "approved") + T.countBy(k, "pending")) > 0;
    }).sort().reverse();
    if(!keys.length){ var e = el("li"); e.appendChild(el("span", "l hint", "Chưa có ngày nào được ghi.")); hist.appendChild(e); }
    keys.forEach(function(k){
      var li = el("li"); var l = el("div", "l"); l.appendChild(el("span", null, T.dayLabel(k)));
      var pp = T.countBy(k, "pending");
      l.appendChild(el("small", null, T.countBy(k, "approved") + "/" + T.TASKS.length + " đã duyệt" + (pp ? " · " + pp + " chờ nghiệm thu" : "")));
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
