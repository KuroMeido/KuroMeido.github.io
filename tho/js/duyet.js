/* Trang nghiệm thu của mụ phù thủy: nhập PIN, xem ảnh, duyệt, trả tiền theo tháng, đổi PIN.
 * Mã PIN chỉ giữ trong bộ nhớ trang, tự khóa khi ẩn trang. Máy chủ kiểm tra PIN ở mọi thao tác. */
(function(){
  var T = Tho, S = T.state, $ = T.$, el = T.el, money = T.money;
  var P = { unlocked:false, pinValue:"", mode:null, msg:"", confirming:false };

  function lock(){ P.unlocked = false; P.pinValue = ""; P.mode = null; P.msg = ""; P.confirming = false; }

  T.onError = function(code){ if(code === "bad_pin" || code === "locked"){ lock(); } };
  T.onHide = function(){ lock(); T.render(); };
  T.pauseRefresh = function(){ return !!P.mode; };

  function reviewMany(list, ok){
    if(!P.pinValue || !list.length) return;
    list.forEach(function(p){
      var it = T.itemsOf(p.key)[p.id];
      if(it && it.status === "pending"){ it.status = ok ? "approved" : "rejected"; it.reviewedAt = Date.now(); }
    });
    T.render();
    T.write({ a:"review", pin:P.pinValue, items:list.map(function(p){ return { d:p.key, t:p.id, ok:ok }; }) });
  }

  function pay(monthKey){
    P.confirming = false;
    var m = T.monthRows().filter(function(x){ return x.key === monthKey; })[0];
    if(!P.pinValue || !m || m.owed <= 0){ T.render(); return; }
    S.payouts = S.payouts.concat([{ d:monthKey, amount:m.owed }]);
    T.render();
    T.write({ a:"pay", pin:P.pinValue, month:monthKey, date:S.today });
  }

  /* ---------- Form PIN ---------- */
  function renderPinForm(box){
    var mode = P.mode;
    box.appendChild(el("h2", null, mode === "enter" ? "Nhập mã PIN" : mode === "set" ? "Tạo mã PIN cho mụ phù thủy" : "Đổi mã PIN"));
    var form = document.createElement("form"); form.className = "col";
    var field = function(id, label){
      var f = el("div", "field"); var l = el("label", null, label); l.setAttribute("for", id);
      var i = document.createElement("input"); i.className = "pin"; i.id = id; i.type = "password"; i.inputMode = "numeric"; i.maxLength = 4; i.autocomplete = "off";
      f.appendChild(l); f.appendChild(i); return f;
    };
    if(mode === "change") form.appendChild(field("pinCur", "Mã PIN hiện tại"));
    form.appendChild(field("pin1", mode === "enter" ? "Mã PIN 4 số" : "Mã PIN mới, 4 số"));
    if(mode !== "enter") form.appendChild(field("pin2", "Nhập lại mã PIN mới"));
    if(P.msg) form.appendChild(el("div", "msg", P.msg));
    var r = el("div", "row");
    var ok = el("button", "act", "Xác nhận"); ok.type = "submit";
    r.appendChild(ok);
    if(mode === "change"){
      var cancel = el("button", "act ghost", "Hủy"); cancel.type = "button";
      cancel.addEventListener("click", function(){ P.mode = null; P.msg = ""; T.render(); });
      r.appendChild(cancel);
    }
    form.appendChild(r);
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var v1 = $("pin1").value, v2 = $("pin2") ? $("pin2").value : v1, cur = $("pinCur") ? $("pinCur").value : "";
      var fail = function(m){ ok.disabled = false; P.msg = m; T.render(); };
      if(!/^\d{4}$/.test(v1)) return fail("Mã PIN gồm đúng 4 chữ số.");
      if(mode !== "enter" && v1 !== v2) return fail("Hai lần nhập chưa giống nhau.");
      if(mode === "change" && !/^\d{4}$/.test(cur)) return fail("Mã PIN hiện tại gồm đúng 4 chữ số.");
      var body = mode === "enter" ? { a:"checkpin", pin:v1 } : mode === "set" ? { a:"setpin", newPin:v1 } : { a:"setpin", pin:cur, newPin:v1 };
      ok.disabled = true;
      T.post(body).then(function(res){
        if(res && res.ok){
          P.unlocked = true; P.pinValue = v1; P.mode = null; P.msg = "";
          S.sig = ""; T.applyState(res); T.render();
        } else {
          fail(T.errText(res && res.error));
        }
      }).catch(function(){ fail(T.NET_ERR); });
    });
    box.appendChild(form);
  }

  /* ---------- Hàng đợi nghiệm thu ---------- */
  function renderQueue(box){
    var pend = T.pendingList();
    var head = el("h2", null, "Chờ nghiệm thu");
    if(pend.length) head.appendChild(el("span", "badge", String(pend.length)));
    box.appendChild(head);
    if(!pend.length){
      box.appendChild(el("p", "hint", "Không có việc nào đang chờ duyệt."));
      return;
    }
    var all = el("button", "act", "Duyệt tất cả (" + pend.length + ")"); all.type = "button"; all.id = "approve-all";
    all.addEventListener("click", function(){ reviewMany(pend, true); });
    box.appendChild(all);
    var q = el("ul", "queue");
    pend.forEach(function(p){
      var li = el("li", "rev");
      var rh = el("div", "rev-h"); rh.appendChild(el("b", null, T.taskLabel(p.id))); rh.appendChild(el("small", null, T.timeLabel(p.item.at) || T.dayLabel(p.key)));
      li.appendChild(rh);
      if(T.isQuest(p.id)){ var hn = el("p", "hint", "Side quest: kiểm tra bài có điểm 10 và ngày tháng làm bài, khớp với giờ nộp."); hn.style.margin = "0"; li.appendChild(hn); }
      var ph = T.photoOf(p.key, p.id);
      if(ph){ var im = document.createElement("img"); im.src = ph; im.alt = "Ảnh nộp: " + T.taskLabel(p.id); li.appendChild(im); }
      else li.appendChild(el("div", "none", p.item.photo ? "Đang tải ảnh…" : "Không có ảnh"));
      var ra = el("div", "row");
      var yes = el("button", "act", "Duyệt +" + money(p.item.money || T.RATE)); yes.type = "button";
      yes.addEventListener("click", function(){ reviewMany([p], true); });
      var no = el("button", "act warn", "Làm lại"); no.type = "button";
      no.addEventListener("click", function(){ reviewMany([p], false); });
      ra.appendChild(yes); ra.appendChild(no); li.appendChild(ra);
      q.appendChild(li);
    });
    box.appendChild(q);
  }

  /* ---------- Trả tiền theo tháng ---------- */
  function renderPay(box){
    box.appendChild(el("h2", null, "Trả tiền theo tháng"));
    var months = T.monthRows();
    if(!months.some(function(m){ return m.owed > 0; })) box.appendChild(el("p", "hint", "Chưa có tháng nào cần trả."));
    var ul = el("ul", "list"); ul.style.marginTop = "0";
    months.forEach(function(m){
      var li = el("li"); li.style.alignItems = "center";
      var l = el("div", "l"); l.appendChild(el("span", null, T.monthLabel(m.key)));
      l.appendChild(el("small", null, "Đã duyệt " + m.count + " việc · " + money(m.earned) + (m.paid ? " · đã trả " + money(m.paid) : "")));
      li.appendChild(l);
      var r = el("div", "row"); r.style.justifyContent = "flex-end";
      if(m.owed <= 0){
        r.appendChild(el("span", "chip approved", "Đã trả đủ"));
      } else if(P.confirming === m.key){
        var y = el("button", "act", "Xác nhận trả " + money(m.owed)); y.type = "button"; y.id = "pay-yes";
        y.addEventListener("click", function(){ pay(m.key); });
        var n = el("button", "act ghost", "Hủy"); n.type = "button"; n.addEventListener("click", function(){ P.confirming = false; T.render(); });
        r.appendChild(y); r.appendChild(n);
      } else {
        var b = el("button", "act", "Đã trả " + money(m.owed)); b.type = "button"; b.id = "pay-start-" + m.key;
        b.addEventListener("click", function(){ P.confirming = m.key; T.render(); });
        r.appendChild(b);
      }
      li.appendChild(r); ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /* ---------- Vẽ trang ---------- */
  function render(){
    T.renderDate();
    T.renderNotes();
    var box = $("panel");

    /* Chưa tải xong dữ liệu thì chưa biết đã có PIN hay chưa. */
    if(!T.state.loaded){ box.innerHTML = ""; box.dataset.form = ""; return; }
    if(!P.unlocked && !P.mode) P.mode = S.hasPin ? "enter" : "set";

    var formKey = P.mode ? P.mode + "|" + P.msg : "";
    if(formKey && box.dataset.form === formKey) return;
    box.dataset.form = formKey;
    box.innerHTML = "";

    if(P.mode){
      renderPinForm(box);
      var first = $("pinCur") || $("pin1");
      if(first) setTimeout(function(){ try{ first.focus(); }catch(e){} }, 0);
      return;
    }

    var top = el("div", "row"); top.style.justifyContent = "space-between";
    top.appendChild(el("span", "hint", "Đang mở khóa. Trang tự khóa khi bạn rời đi."));
    var out = el("button", "act ghost", "Khóa"); out.type = "button"; out.id = "lock";
    out.addEventListener("click", function(){ lock(); T.render(); });
    top.appendChild(out);
    box.appendChild(top);
    renderQueue(box);
    renderPay(box);
    var chg = el("button", "act ghost", "Đổi mã PIN"); chg.type = "button"; chg.id = "pin-change";
    chg.addEventListener("click", function(){ P.mode = "change"; P.msg = ""; T.render(); });
    box.appendChild(chg);
  }

  T.onChange = render;
  T.start();
})();
