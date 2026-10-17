/* MedLens 交互逻辑：视图切换、表单、localStorage 与提醒检查 */

(function () {
  "use strict";

  var STORAGE_KEY = "medlens-mvp-v1";
  var EXERCISE_TEXT = {
    shoulder: "抬起上臂，用滑块模拟肩部抬举角度。",
    elbow: "弯曲或伸直肘关节，用滑块模拟屈伸角度。",
    knee: "坐姿或站姿下活动膝关节，用滑块模拟屈伸角度。"
  };
  var EXERCISE_NAME = {
    shoulder: "肩部抬举",
    elbow: "肘关节屈伸",
    knee: "膝关节屈伸"
  };

  /* ---------- 工具函数 ---------- */

  function $(id) {
    return document.getElementById(id);
  }

  // 转义用户输入，避免写入页面时出现 XSS
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function nowText() {
    return new Date().toLocaleString("zh-CN", { hour12: false });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function toast(message) {
    var el = $("toast");
    el.textContent = message;
    el.classList.add("is-show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      el.classList.remove("is-show");
    }, 2400);
  }

  /* ---------- 数据 ---------- */

  function emptyData() {
    return {
      trauma: [],
      meds: [],
      rehab: [],
      visits: [],
      activity: [],
      voice: false
    };
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      var parsed = JSON.parse(raw);
      var base = emptyData();
      return Object.assign(base, parsed);
    } catch (err) {
      console.warn("读取本地数据失败，已重置。", err);
      return emptyData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      toast("本地保存失败，请检查浏览器是否禁用存储。");
    }
  }

  function addActivity(text) {
    data.activity.unshift({ id: uid(), text: text, time: nowText() });
    data.activity = data.activity.slice(0, 20);
  }

  var data = loadData();
  var rehabState = {
    running: false,
    startedAt: null,
    peak: 0
  };
  var lastRemindKey = "";

  /* ---------- 视图切换 ---------- */

  function closeMobileNav() {
    $("sidebar").classList.remove("is-open");
    $("navBackdrop").classList.remove("is-show");
  }

  function showView(name) {
    var views = document.querySelectorAll(".view");
    var buttons = document.querySelectorAll(".nav-btn");
    views.forEach(function (view) {
      var on = view.id === "view-" + name;
      view.classList.toggle("is-active", on);
      view.hidden = !on;
    });
    buttons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === name);
    });
    closeMobileNav();
    window.scrollTo(0, 0);
  }

  document.querySelectorAll("[data-view]").forEach(function (el) {
    el.addEventListener("click", function () {
      showView(el.getAttribute("data-view"));
    });
  });

  $("menuToggle").addEventListener("click", function () {
    $("sidebar").classList.toggle("is-open");
    $("navBackdrop").classList.toggle("is-show");
  });

  $("navBackdrop").addEventListener("click", closeMobileNav);

  /* ---------- 渲染 ---------- */

  function renderHome() {
    $("homeStats").innerHTML =
      statCard(data.trauma.length, "外伤记录") +
      statCard(data.meds.length, "用药计划") +
      statCard(data.rehab.length, "训练记录") +
      statCard(data.visits.length, "就诊摘要");

    $("homeActivity").innerHTML = data.activity.length
      ? data.activity.map(function (item) {
          return (
            '<li class="history-item"><header><strong>' +
            escapeHtml(item.text) +
            '</strong><span class="muted">' +
            escapeHtml(item.time) +
            "</span></header></li>"
          );
        }).join("")
      : '<li class="empty">暂无最近活动。完成一次保存后会出现在这里。</li>';
  }

  function statCard(n, label) {
    return (
      '<article class="card stat"><b>' +
      escapeHtml(n) +
      "</b><span>" +
      escapeHtml(label) +
      "</span></article>"
    );
  }

  function renderTrauma() {
    $("traumaHistory").innerHTML = data.trauma.length
      ? data.trauma.map(function (item) {
          return (
            '<li class="history-item">' +
            "<header><strong>" +
            escapeHtml(item.part) +
            " · " +
            escapeHtml(item.type) +
            '</strong><span class="muted">' +
            escapeHtml(item.time) +
            "</span></header>" +
            "<p>" +
            escapeHtml(item.story) +
            "</p>" +
            '<button class="btn btn-danger btn-sm" type="button" data-del-trauma="' +
            escapeHtml(item.id) +
            '">删除</button></li>'
          );
        }).join("")
      : '<li class="empty">还没有外伤记录。</li>';
  }

  function renderMeds() {
    $("medsList").innerHTML = data.meds.length
      ? data.meds.map(function (item) {
          var taken = item.takenToday === todayKey();
          return (
            '<li class="history-item">' +
            "<header><strong>" +
            escapeHtml(item.name) +
            '</strong><span class="muted">提醒 ' +
            escapeHtml(item.time) +
            "</span></header>" +
            "<p>医嘱剂量：" +
            escapeHtml(item.dose) +
            (item.note ? " · 注意事项：" + escapeHtml(item.note) : "") +
            "</p>" +
            "<p>今日状态：" +
            (taken ? "已标记服药" : "未标记") +
            "</p>" +
            '<div class="btn-row">' +
            '<button class="btn btn-primary btn-sm" type="button" data-take-med="' +
            escapeHtml(item.id) +
            '">标记已服药</button>' +
            '<button class="btn btn-danger btn-sm" type="button" data-del-med="' +
            escapeHtml(item.id) +
            '">删除</button></div></li>'
          );
        }).join("")
      : '<li class="empty">用药计划为空。请按医嘱添加药品，不要自行编造剂量。</li>';
  }

  function renderRehabHistory() {
    $("rehabHistory").innerHTML = data.rehab.length
      ? data.rehab.map(function (item) {
          return (
            '<li class="history-item"><header><strong>' +
            escapeHtml(item.exercise) +
            '</strong><span class="muted">' +
            escapeHtml(item.time) +
            "</span></header><p>目标 " +
            escapeHtml(item.target) +
            "° · 模拟最高 " +
            escapeHtml(item.peak) +
            "° · 时长 " +
            escapeHtml(item.duration) +
            " 秒 · " +
            escapeHtml(item.result) +
            "</p></li>"
          );
        }).join("")
      : '<li class="empty">还没有训练记录。</li>';
  }

  function renderVisits() {
    $("visitHistory").innerHTML = data.visits.length
      ? data.visits.map(function (item) {
          return (
            '<li class="history-item"><header><strong>' +
            escapeHtml(item.title) +
            '</strong><span class="muted">' +
            escapeHtml(item.time) +
            "</span></header><p>" +
            escapeHtml(item.body).slice(0, 180) +
            (item.body.length > 180 ? "…" : "") +
            "</p></li>"
          );
        }).join("")
      : '<li class="empty">还没有保存的就诊摘要。</li>';
  }

  function renderAll() {
    renderHome();
    renderTrauma();
    renderMeds();
    renderRehabHistory();
    renderVisits();
    $("voiceToggle").checked = !!data.voice;
  }

  /* ---------- 外伤 ---------- */

  $("traumaForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var form = event.target;
    var part = form.part.value.trim();
    var type = form.type.value.trim();
    var story = form.story.value.trim();
    if (!part || !type || !story) {
      toast("请完整填写受伤部位、类型和经过。");
      return;
    }
    data.trauma.unshift({
      id: uid(),
      part: part,
      type: type,
      story: story,
      time: nowText()
    });
    addActivity("保存外伤记录：" + part + " / " + type);
    saveData();
    renderAll();
    form.reset();
    toast("外伤事件已保存到本机浏览器。");
  });

  $("traumaHistory").addEventListener("click", function (event) {
    var id = event.target.getAttribute("data-del-trauma");
    if (!id) return;
    data.trauma = data.trauma.filter(function (item) {
      return item.id !== id;
    });
    addActivity("删除一条外伤记录");
    saveData();
    renderAll();
    toast("已删除该外伤记录。");
  });

  /* ---------- 用药 ---------- */

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentTimeValue() {
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  }

  $("medsForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var form = event.target;
    var name = form.name.value.trim();
    var dose = form.dose.value.trim();
    var time = form.time.value;
    var note = form.note.value.trim();
    if (!name || !dose || !time) {
      toast("请填写药品名称、医嘱剂量和提醒时间。");
      return;
    }
    data.meds.unshift({
      id: uid(),
      name: name,
      dose: dose,
      time: time,
      note: note,
      takenToday: ""
    });
    addActivity("添加用药计划：" + name);
    saveData();
    renderAll();
    form.reset();
    $("voiceToggle").checked = !!data.voice;
    toast("已加入用药计划。剂量请以医嘱为准。");
  });

  $("voiceToggle").addEventListener("change", function () {
    data.voice = $("voiceToggle").checked;
    saveData();
    toast(data.voice ? "已开启语音播报（需浏览器允许）。" : "已关闭语音播报。");
  });

  $("medsList").addEventListener("click", function (event) {
    var takeId = event.target.getAttribute("data-take-med");
    var delId = event.target.getAttribute("data-del-med");
    if (takeId) {
      data.meds.forEach(function (item) {
        if (item.id === takeId) item.takenToday = todayKey();
      });
      addActivity("标记已服药");
      saveData();
      renderAll();
      toast("已标记今日服药。");
    }
    if (delId) {
      data.meds = data.meds.filter(function (item) {
        return item.id !== delId;
      });
      addActivity("删除用药计划");
      saveData();
      renderAll();
      toast("已删除该药品计划。");
    }
  });

  function speak(text) {
    if (!data.voice || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-CN";
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.warn("语音播报不可用", err);
    }
  }

  function checkReminders() {
    var clock = currentTimeValue();
    $("medsClock").textContent = "当前检查时间：" + nowText() + "（仅网页打开时有效）";
    data.meds.forEach(function (item) {
      if (item.time !== clock) return;
      if (item.takenToday === todayKey()) return;
      var key = todayKey() + "-" + item.id + "-" + clock;
      if (lastRemindKey === key) return;
      lastRemindKey = key;
      var msg = "用药提醒：" + item.name + "，请按医嘱剂量 " + item.dose + " 核对后服用。";
      toast(msg);
      speak(msg);
    });
  }

  /* ---------- 康复训练 ---------- */

  function updateRehabHud() {
    var current = Number($("rehabSlider").value);
    var target = Number($("rehabTarget").value) || 90;
    var ratio = Math.max(0, Math.min(1, current / target));
    var deg = Math.round(ratio * 360);
    $("rehabGauge").style.background =
      "conic-gradient(#2ee6c7 " + deg + "deg, rgba(46,230,199,0.15) " + deg + "deg)";
    $("rehabCurrentLabel").textContent = current + "°";
    $("rehabBar").style.width = Math.round(ratio * 100) + "%";

    if (rehabState.running) {
      rehabState.peak = Math.max(rehabState.peak, current);
    }

    var status = $("rehabStatus");
    var feedback = $("rehabFeedback");
    if (!rehabState.running) {
      status.textContent = "等待开始";
      status.className = "status-pill";
      feedback.textContent = "请先点击「开始训练」，再用滑块模拟动作角度。";
      return;
    }
    if (current >= target) {
      status.textContent = "达标";
      status.className = "status-pill is-ok";
      feedback.textContent = "模拟角度已达到或超过目标。请保持动作稳定，不要过度用力。";
    } else if (current >= target * 0.8) {
      status.textContent = "接近目标";
      status.className = "status-pill is-warn";
      feedback.textContent = "接近目标角度，可在无痛范围内继续缓慢活动。";
    } else {
      status.textContent = "进行中";
      status.className = "status-pill";
      feedback.textContent = "模拟角度偏低。请按治疗师建议的幅度缓慢抬升或屈伸。";
    }
  }

  $("rehabExercise").addEventListener("change", function () {
    $("rehabHint").textContent = EXERCISE_TEXT[$("rehabExercise").value];
  });

  $("rehabSlider").addEventListener("input", updateRehabHud);
  $("rehabTarget").addEventListener("input", updateRehabHud);

  $("rehabStart").addEventListener("click", function () {
    var target = Number($("rehabTarget").value);
    if (!target || target < 10 || target > 180) {
      toast("目标角度请填写 10 到 180 之间的数字。");
      return;
    }
    rehabState.running = true;
    rehabState.startedAt = Date.now();
    rehabState.peak = Number($("rehabSlider").value);
    $("rehabSession").textContent = "训练状态：进行中（模拟）";
    updateRehabHud();
    toast("训练已开始。当前角度为滑块模拟值。");
  });

  $("rehabEnd").addEventListener("click", function () {
    if (!rehabState.running) {
      toast("还没有开始训练。");
      return;
    }
    rehabState.running = false;
    $("rehabSession").textContent = "训练状态：已结束";
    updateRehabHud();
    toast("训练已结束，可保存本次记录。");
  });

  $("rehabSave").addEventListener("click", function () {
    if (!rehabState.startedAt) {
      toast("请先开始一次训练再保存。");
      return;
    }
    var duration = Math.max(1, Math.round(((Date.now() - rehabState.startedAt) / 1000)));
    var target = Number($("rehabTarget").value);
    var result = rehabState.peak >= target ? "模拟达标" : "模拟未达标";
    var exercise = EXERCISE_NAME[$("rehabExercise").value];
    data.rehab.unshift({
      id: uid(),
      exercise: exercise,
      target: target,
      peak: rehabState.peak,
      duration: duration,
      result: result,
      time: nowText()
    });
    addActivity("保存训练记录：" + exercise);
    saveData();
    renderAll();
    toast("训练记录已保存。");
  });

  /* ---------- 就诊摘要 ---------- */

  function buildSummary(fields) {
    return [
      "【MedLens 就诊信息摘要 · 非诊断结论】",
      "整理时间：" + nowText(),
      "主要症状：" + fields.symptom,
      "持续时间：" + fields.duration,
      "自述程度：" + fields.level,
      "伴随症状：" + (fields.extra || "未填写"),
      "相关病史：" + (fields.history || "未填写"),
      "相关用药：" + (fields.meds || "未填写"),
      "",
      "说明：本摘要由用户自行填写后结构化整理，仅供就医时陈述参考，不构成疾病诊断或治疗建议。"
    ].join("\n");
  }

  $("visitForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var form = event.target;
    var fields = {
      symptom: form.symptom.value.trim(),
      duration: form.duration.value.trim(),
      level: form.level.value.trim(),
      extra: form.extra.value.trim(),
      history: form.history.value.trim(),
      meds: form.meds.value.trim()
    };
    if (!fields.symptom || !fields.duration || !fields.level) {
      toast("请至少填写主要症状、持续时间和自述程度。");
      return;
    }
    $("visitSummary").value = buildSummary(fields);
    toast("摘要已生成，可继续编辑、复制或保存。");
  });

  $("visitCopy").addEventListener("click", function () {
    var text = $("visitSummary").value.trim();
    if (!text) {
      toast("还没有可复制的摘要。");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast("摘要已复制。");
      }).catch(copyFallback);
    } else {
      copyFallback();
    }

    function copyFallback() {
      try {
        $("visitSummary").focus();
        $("visitSummary").select();
        var ok = document.execCommand("copy");
        toast(ok ? "摘要已复制。" : "复制失败，请手动全选后复制。");
      } catch (err) {
        toast("复制失败，请手动全选后复制。");
      }
    }
  });

  $("visitSave").addEventListener("click", function () {
    var body = $("visitSummary").value.trim();
    if (!body) {
      toast("请先生成或编辑摘要再保存。");
      return;
    }
    var firstLine = body.split("\n").find(function (line) {
      return line.indexOf("主要症状：") === 0;
    });
    data.visits.unshift({
      id: uid(),
      title: firstLine ? firstLine.replace("主要症状：", "") : "就诊摘要",
      body: body,
      time: nowText()
    });
    addActivity("保存就诊摘要");
    saveData();
    renderAll();
    toast("摘要已保存到本机。");
  });

  $("clearActivityBtn").addEventListener("click", function () {
    data.activity = [];
    saveData();
    renderAll();
    toast("最近活动已清空。");
  });

  /* ---------- 时钟与启动 ---------- */

  function tickClock() {
    $("hudTime").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  }

  tickClock();
  setInterval(tickClock, 1000);
  setInterval(checkReminders, 20000);
  renderAll();
  updateRehabHud();
  checkReminders();
})();
