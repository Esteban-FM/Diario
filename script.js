(function () {
  "use strict";

  var STORAGE_KEY = "dosis-diaria-v1";
  var HISTORY_DAYS = 21;

  var DEFAULT_HABITS = [
    { id: "creatina", label: "Tomar creatina", unit: "dosis" },
    { id: "agua", label: "Beber agua", unit: "3 L" },
    { id: "gimnasio", label: "Ir al gimnasio", unit: "sesión" },
    { id: "proteina", label: "Consumir proteína", unit: "180 g" },
    { id: "pasos", label: "Caminar mis pasos", unit: "8,000" }
  ];

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.habits) && parsed.completions) return parsed;
      }
    } catch (e) {}
    return { habits: DEFAULT_HABITS.slice(), completions: {} };
  }

  var state = loadState();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function todayKey(d) {
    var date = d || new Date();
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function addDays(base, delta) {
    var d = new Date(base);
    d.setDate(d.getDate() + delta);
    return d;
  }

  var TODAY = new Date();
  var TODAY_KEY = todayKey(TODAY);

  var CHECK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 6L9 17l-5-5"/></svg>';

  function renderHeader() {
    var heading = document.getElementById("date-heading");
    var formatted = TODAY.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    heading.textContent = formatted;
  }

  function isDayComplete(dateKey) {
    var entry = state.completions[dateKey];
    if (!entry || state.habits.length === 0) return false;
    for (var i = 0; i < state.habits.length; i++) {
      if (!entry[state.habits[i].id]) return false;
    }
    return true;
  }

  function computeStreak() {
    var streak = 0;
    var cursor = TODAY;
    if (!isDayComplete(TODAY_KEY)) {
      cursor = addDays(TODAY, -1);
    }
    while (isDayComplete(todayKey(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function renderStreak() {
    var streak = computeStreak();
    document.getElementById("streak-value").textContent = streak;
    document.getElementById("streak-label").textContent =
      streak === 1 ? "día seguido" : "días seguidos";
  }

  function toggleHabit(habitId) {
    var entry = state.completions[TODAY_KEY] || {};
    entry[habitId] = !entry[habitId];
    state.completions[TODAY_KEY] = entry;
    save();
    renderAll();
  }

  function removeHabit(habitId) {
    state.habits = state.habits.filter(function (h) { return h.id !== habitId; });
    save();
    renderAll();
  }

  function renderHabits() {
    var list = document.getElementById("habit-list");
    list.innerHTML = "";
    var todayEntry = state.completions[TODAY_KEY] || {};

    state.habits.forEach(function (habit) {
      var done = !!todayEntry[habit.id];

      var row = document.createElement("button");
      row.type = "button";
      row.className = "habit-row" + (done ? " done" : "");
      row.setAttribute("aria-pressed", String(done));

      var fill = document.createElement("span");
      fill.className = "habit-fill";
      fill.setAttribute("aria-hidden", "true");

      var mark = document.createElement("span");
      mark.className = "habit-mark";
      mark.innerHTML = CHECK_SVG;

      var copy = document.createElement("span");
      copy.className = "habit-copy";
      var label = document.createElement("span");
      label.className = "habit-label";
      label.textContent = habit.label;
      copy.appendChild(label);
      if (habit.unit) {
        var unit = document.createElement("span");
        unit.className = "habit-unit";
        unit.textContent = habit.unit;
        copy.appendChild(unit);
      }

      var remove = document.createElement("span");
      remove.className = "habit-remove";
      remove.setAttribute("role", "button");
      remove.setAttribute("aria-label", "Eliminar " + habit.label);
      remove.tabIndex = 0;
      remove.textContent = "×";
      remove.addEventListener("click", function (e) {
        e.stopPropagation();
        removeHabit(habit.id);
      });
      remove.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          removeHabit(habit.id);
        }
      });

      row.appendChild(fill);
      row.appendChild(mark);
      row.appendChild(copy);
      row.appendChild(remove);

      row.addEventListener("click", function () { toggleHabit(habit.id); });

      list.appendChild(row);
    });
  }

  function renderHistory() {
    var grid = document.getElementById("history-grid");
    grid.style.setProperty("--days", HISTORY_DAYS);
    grid.innerHTML = "";

    var days = [];
    for (var i = HISTORY_DAYS - 1; i >= 0; i--) days.push(addDays(TODAY, -i));

    grid.appendChild(document.createElement("span"));
    days.forEach(function (d) {
      var colLabel = document.createElement("span");
      colLabel.className = "grid-col-label";
      colLabel.textContent = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
      grid.appendChild(colLabel);
    });

    state.habits.forEach(function (habit) {
      var rowLabel = document.createElement("span");
      rowLabel.className = "grid-row-label";
      rowLabel.textContent = habit.label;
      grid.appendChild(rowLabel);

      days.forEach(function (d) {
        var key = todayKey(d);
        var entry = state.completions[key];
        var cell = document.createElement("span");
        var cls = "cell";
        if (key === TODAY_KEY) cls += " today";
        if (!entry) {
          cls += " none";
        } else if (entry[habit.id]) {
          cls += " done";
        }
        cell.className = cls;
        cell.title = habit.label + " — " + key + (entry ? (entry[habit.id] ? " ✓" : " —") : " sin registro");
        grid.appendChild(cell);
      });
    });

    var range = document.getElementById("history-range");
    range.textContent =
      days[0].toLocaleDateString("es-ES", { day: "numeric", month: "short" }) +
      " → " +
      days[days.length - 1].toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  function renderAll() {
    renderHabits();
    renderStreak();
    renderHistory();
  }

  var addToggle = document.getElementById("add-toggle");
  var addForm = document.getElementById("add-form");
  addToggle.addEventListener("click", function () {
    var open = addForm.classList.toggle("open");
    if (open) addForm.querySelector('input[name="label"]').focus();
  });

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var labelInput = addForm.querySelector('input[name="label"]');
    var unitInput = addForm.querySelector('input[name="unit"]');
    var label = labelInput.value.trim();
    if (!label) return;
    var id = "h" + Date.now().toString(36);
    state.habits.push({ id: id, label: label, unit: unitInput.value.trim() });
    save();
    labelInput.value = "";
    unitInput.value = "";
    addForm.classList.remove("open");
    renderAll();
  });

  renderHeader();
  renderAll();
})();
