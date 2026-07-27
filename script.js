(function () {
  "use strict";

  var STORAGE_KEY = "dosis-diaria-v1";
  var HISTORY_DAYS = 21;

  var COLORS = {
    coral: { g1: "#f2966d", g2: "#c24c5c" },
    indigo: { g1: "#8d93f2", g2: "#5860c9" },
    amber: { g1: "#e7b979", g2: "#b4813f" },
    teal: { g1: "#6fcfb0", g2: "#3e9c82" },
    violet: { g1: "#b78be0", g2: "#7c56b0" }
  };
  var COLOR_KEYS = Object.keys(COLORS);

  var ICONS = {
    creatina:
      '<g transform="rotate(-45 12 12)"><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g>',
    agua:
      '<path d="M12 3c2.8 3.6 6 8 6 11.5A6 6 0 0 1 6 14.5C6 11 9.2 6.6 12 3z"/>',
    gimnasio:
      '<g><rect x="2" y="9.5" width="3" height="5" rx="1"/><rect x="19" y="9.5" width="3" height="5" rx="1"/>' +
      '<rect x="5.5" y="8" width="3" height="8" rx="1.2"/><rect x="15.5" y="8" width="3" height="8" rx="1.2"/>' +
      '<line x1="8.5" y1="12" x2="15.5" y2="12"/></g>',
    proteina:
      '<path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-1.8-1-2.5.7.3 3 1.8 3 5.5a5 5 0 0 1-10 0c0-4.5 3.5-6 5-11z"/>',
    pasos:
      '<g><ellipse cx="8.5" cy="7.5" rx="2.6" ry="3.4"/><circle cx="8.5" cy="12.6" r="1" class="solid"/>' +
      '<ellipse cx="15.5" cy="15.5" rx="2.6" ry="3.4" transform="rotate(180 15.5 15.5)"/><circle cx="15.5" cy="10.4" r="1" class="solid"/></g>',
    default:
      '<g><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6" class="solid"/></g>'
  };

  var DEFAULT_HABITS = [
    { id: "creatina", label: "Tomar creatina", unit: "dosis 5 g", color: "violet", type: "toggle" },
    { id: "agua", label: "Beber agua", color: "indigo", type: "progress", target: 3, step: 1, unit: "L" },
    { id: "gimnasio", label: "Ir al gimnasio", color: "coral", type: "progress", target: 60, step: 15, unit: "min" },
    { id: "proteina", label: "Consumir proteína", color: "amber", type: "progress", target: 180, step: 15, unit: "g" },
    { id: "pasos", label: "Caminar mis pasos", color: "teal", type: "progress", target: 8000, step: 500, unit: "pasos" }
  ];

  var DEFAULT_BY_ID = {};
  DEFAULT_HABITS.forEach(function (h) { DEFAULT_BY_ID[h.id] = h; });

  var WEEK_TARGET = 8;

  var MUSCLES = [
    { id: "pecho", label: "Pecho", color: "coral" },
    { id: "biceps", label: "Bíceps", color: "indigo" },
    { id: "triceps", label: "Tríceps", color: "amber" },
    { id: "hombro", label: "Hombro", color: "teal" },
    { id: "espalda", label: "Espalda", color: "violet" },
    { id: "pierna", label: "Pierna", color: "coral" },
    { id: "gluteo", label: "Glúteo", color: "indigo" },
    { id: "antebrazo", label: "Antebrazo", color: "amber" },
    { id: "trapecio", label: "Trapecio / cuello", color: "teal" }
  ];

  var MUSCLE_ICONS = {
    pecho: '<circle cx="8.7" cy="12" r="4.6"/><circle cx="15.3" cy="12" r="4.6"/><line x1="12" y1="7" x2="12" y2="17"/>',
    biceps: '<path d="M6 18c0-6 2-10 7-11"/><circle cx="15" cy="7" r="2.6"/>',
    triceps: '<path d="M18 18c0-6-2-10-7-11"/><circle cx="9" cy="7" r="2.6"/>',
    hombro: '<path d="M6 14a6 5 0 0 1 12 0"/><path d="M6 14v4M18 14v4"/>',
    espalda: '<path d="M12 4v5M12 9L5 20M12 9l7 11"/>',
    pierna: '<path d="M10 3l-1 9-3 9M14 3l1 7 3 11"/>',
    gluteo: '<path d="M4 17c0-7 3.5-11 8-11s8 4 8 11"/>',
    antebrazo: '<path d="M6 6l7 12"/><circle cx="16" cy="19" r="2.6"/>',
    trapecio: '<path d="M8 6h8l4 12H4z"/>'
  };

  function normalizeState(parsed) {
    parsed.habits.forEach(function (h, i) {
      if (!h.color || !COLORS[h.color]) h.color = COLOR_KEYS[i % COLOR_KEYS.length];
      var def = DEFAULT_BY_ID[h.id];
      if (def && def.type === "progress") {
        h.type = "progress";
        h.target = def.target;
        h.step = def.step;
        h.unit = def.unit;
      } else {
        if (!h.type) h.type = "toggle";
        if (def && def.unit) h.unit = def.unit;
      }
    });
    var presentIds = parsed.habits.map(function (h) { return h.id; });
    DEFAULT_HABITS.forEach(function (def) {
      if (presentIds.indexOf(def.id) === -1) parsed.habits.push(Object.assign({}, def));
    });
    if (!parsed.training) parsed.training = {};
    if (typeof parsed.updatedAt !== "number") parsed.updatedAt = 0;
    return parsed;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.habits) && parsed.completions) {
          return normalizeState(parsed);
        }
      }
    } catch (e) {}
    return { habits: DEFAULT_HABITS.slice(), completions: {}, training: {}, updatedAt: 0 };
  }

  var state = loadState();

  var cloudUid = null;
  var cloudUnsub = null;
  var applyingRemote = false;

  function setCloudStatus(text, connected) {
    var bar = document.getElementById("cloud-bar");
    var txt = document.getElementById("cloud-text");
    if (!bar || !txt) return;
    txt.textContent = text;
    bar.classList.toggle("connected", !!connected);
  }

  function pushToCloud() {
    if (!cloudUid || applyingRemote || !window.DosisCloud) return;
    window.DosisCloud.pushRemote(cloudUid, state).catch(function (e) {
      console.warn("No se pudo sincronizar con la nube", e);
    });
  }

  function mergeRemote(remote) {
    if (!remote || !Array.isArray(remote.habits) || !remote.completions) return;
    if ((remote.updatedAt || 0) > (state.updatedAt || 0)) {
      applyingRemote = true;
      state = normalizeState(remote);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
      applyingRemote = false;
    } else if ((state.updatedAt || 0) > (remote.updatedAt || 0)) {
      pushToCloud();
    }
  }

  function save() {
    state.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    pushToCloud();
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

  function mondayOf(date) {
    var day = date.getDay();
    var offset = day === 0 ? -6 : 1 - day;
    return addDays(date, offset);
  }

  var WEEK_START = mondayOf(TODAY);
  var WEEK_KEY = todayKey(WEEK_START);
  var WEEK_END = addDays(WEEK_START, 6);

  function rawValueOf(habit, entry) {
    return entry ? entry[habit.id] : undefined;
  }

  function currentValue(habit, entry) {
    var raw = rawValueOf(habit, entry);
    if (habit.type === "progress") {
      if (typeof raw === "number") return raw;
      return raw ? habit.target : 0;
    }
    return !!raw;
  }

  function isHabitDone(habit, entry) {
    var value = currentValue(habit, entry);
    if (habit.type === "progress") return value >= habit.target;
    return !!value;
  }

  function fillRatio(habit, entry) {
    var value = currentValue(habit, entry);
    if (habit.type === "progress") return Math.max(0, Math.min(1, value / habit.target));
    return value ? 1 : 0;
  }

  function formatNumber(n) {
    return n.toLocaleString("es-ES");
  }

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
      if (!isHabitDone(state.habits[i], entry)) return false;
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

  function tapHabit(habit) {
    var entry = state.completions[TODAY_KEY] || {};
    if (habit.type === "progress") {
      var current = currentValue(habit, entry);
      entry[habit.id] = current >= habit.target ? 0 : Math.min(current + habit.step, habit.target);
    } else {
      entry[habit.id] = !currentValue(habit, entry);
    }
    state.completions[TODAY_KEY] = entry;
    save();
    renderAll();
  }

  function tapMuscle(muscleId) {
    var week = state.training[WEEK_KEY] || {};
    var current = week[muscleId] || 0;
    week[muscleId] = current >= WEEK_TARGET ? 0 : current + 1;
    state.training[WEEK_KEY] = week;
    save();
    renderTraining();
  }

  function removeHabit(habitId, label) {
    if (!confirm('¿Eliminar "' + label + '" de tu lista de metas?')) return;
    state.habits = state.habits.filter(function (h) { return h.id !== habitId; });
    save();
    renderAll();
  }

  function renderHabits() {
    var list = document.getElementById("habit-list");
    list.innerHTML = "";
    var todayEntry = state.completions[TODAY_KEY] || {};

    state.habits.forEach(function (habit) {
      var done = isHabitDone(habit, todayEntry);
      var ratio = fillRatio(habit, todayEntry);
      var colors = COLORS[habit.color] || COLORS.coral;

      var row = document.createElement("button");
      row.type = "button";
      row.className = "habit-row" + (done ? " done" : "");
      row.style.setProperty("--g1", colors.g1);
      row.style.setProperty("--g2", colors.g2);

      var iconWrap = document.createElement("span");
      iconWrap.className = "habit-icon-wrap";

      var ring = document.createElement("span");
      ring.className = "habit-ring";
      ring.style.setProperty("--ring", Math.round(ratio * 360) + "deg");
      ring.setAttribute("aria-hidden", "true");

      var icon = document.createElement("span");
      icon.className = "habit-icon";
      var iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      iconSvg.setAttribute("viewBox", "0 0 24 24");
      iconSvg.innerHTML = ICONS[habit.id] || ICONS.default;
      icon.appendChild(iconSvg);

      iconWrap.appendChild(ring);
      iconWrap.appendChild(icon);

      var copy = document.createElement("span");
      copy.className = "habit-copy";
      var label = document.createElement("span");
      label.className = "habit-label";
      label.textContent = habit.label;
      copy.appendChild(label);

      if (habit.type !== "progress" && habit.unit) {
        var unit = document.createElement("span");
        unit.className = "habit-unit";
        unit.textContent = habit.unit;
        copy.appendChild(unit);
      }

      if (habit.type === "progress") {
        var meter = document.createElement("span");
        meter.className = "habit-meter";
        var meterFill = document.createElement("span");
        meterFill.className = "habit-meter-fill";
        meterFill.style.width = Math.max(ratio * 100, currentValue(habit, todayEntry) > 0 ? 6 : 0) + "%";
        meter.appendChild(meterFill);
        copy.appendChild(meter);
      }

      var status = document.createElement("span");
      status.className = "habit-status";

      if (habit.type === "progress") {
        var value = document.createElement("span");
        value.className = "habit-value";
        var current = currentValue(habit, todayEntry);
        var big = document.createElement("span");
        big.className = "habit-value-current";
        big.textContent = formatNumber(current);
        var small = document.createElement("span");
        small.className = "habit-value-target";
        small.textContent = "/" + formatNumber(habit.target) + " " + habit.unit;
        value.appendChild(big);
        value.appendChild(small);
        status.appendChild(value);
        row.setAttribute(
          "aria-label",
          habit.label + ": " + current + " de " + habit.target + " " + habit.unit
        );
      } else {
        var mark = document.createElement("span");
        mark.className = "habit-mark";
        mark.innerHTML = CHECK_SVG;
        status.appendChild(mark);
        row.setAttribute("aria-pressed", String(done));
      }

      var remove = document.createElement("span");
      remove.className = "habit-remove";
      remove.setAttribute("role", "button");
      remove.setAttribute("aria-label", "Eliminar " + habit.label);
      remove.tabIndex = 0;
      remove.textContent = "×";
      remove.addEventListener("click", function (e) {
        e.stopPropagation();
        removeHabit(habit.id, habit.label);
      });
      remove.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          removeHabit(habit.id, habit.label);
        }
      });
      status.appendChild(remove);

      row.appendChild(iconWrap);
      row.appendChild(copy);
      row.appendChild(status);

      row.addEventListener("click", function () { tapHabit(habit); });

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
      var key = todayKey(d);
      var colLabel = document.createElement("span");
      colLabel.className = "grid-col-label" + (key === TODAY_KEY ? " today" : "");
      colLabel.textContent = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
      grid.appendChild(colLabel);
    });

    state.habits.forEach(function (habit) {
      var colors = COLORS[habit.color] || COLORS.coral;
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
        } else if (isHabitDone(habit, entry)) {
          cls += " done";
          cell.style.setProperty("--dot", colors.g1);
        }
        cell.className = cls;
        cell.title = habit.label + " — " + key + (entry ? (isHabitDone(habit, entry) ? " ✓" : " —") : " sin registro");
        grid.appendChild(cell);
      });
    });

    var range = document.getElementById("history-range");
    range.textContent =
      days[0].toLocaleDateString("es-ES", { day: "numeric", month: "short" }) +
      " → " +
      days[days.length - 1].toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  function renderTraining() {
    var grid = document.getElementById("muscle-grid");
    grid.innerHTML = "";
    var week = state.training[WEEK_KEY] || {};

    MUSCLES.forEach(function (muscle) {
      var current = week[muscle.id] || 0;
      var done = current >= WEEK_TARGET;
      var colors = COLORS[muscle.color] || COLORS.coral;

      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "muscle-tile" + (done ? " done" : "");
      tile.style.setProperty("--g1", colors.g1);
      tile.style.setProperty("--g2", colors.g2);
      tile.setAttribute(
        "aria-label",
        muscle.label + ": " + current + " de " + WEEK_TARGET + " ejercicios esta semana"
      );

      var ringWrap = document.createElement("span");
      ringWrap.className = "muscle-ring-wrap";

      var ring = document.createElement("span");
      ring.className = "muscle-ring";
      ring.style.setProperty("--ring", Math.round((current / WEEK_TARGET) * 360) + "deg");
      ring.setAttribute("aria-hidden", "true");

      var icon = document.createElement("span");
      icon.className = "muscle-icon";
      var iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      iconSvg.setAttribute("viewBox", "0 0 24 24");
      iconSvg.innerHTML = MUSCLE_ICONS[muscle.id] || "";
      icon.appendChild(iconSvg);

      ringWrap.appendChild(ring);
      ringWrap.appendChild(icon);

      var count = document.createElement("span");
      count.className = "muscle-count";
      var big = document.createElement("span");
      big.className = "muscle-count-current";
      big.textContent = current;
      var small = document.createElement("span");
      small.className = "muscle-count-target";
      small.textContent = "/" + WEEK_TARGET;
      count.appendChild(big);
      count.appendChild(small);

      var label = document.createElement("span");
      label.className = "muscle-label";
      label.textContent = muscle.label;

      tile.appendChild(ringWrap);
      tile.appendChild(count);
      tile.appendChild(label);

      tile.addEventListener("click", function () { tapMuscle(muscle.id); });

      grid.appendChild(tile);
    });

    var range = document.getElementById("training-range");
    range.textContent =
      WEEK_START.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) +
      " → " +
      WEEK_END.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  function renderAll() {
    renderHabits();
    renderStreak();
    renderHistory();
    renderTraining();
  }

  var addToggle = document.getElementById("add-toggle");
  var addForm = document.getElementById("add-form");
  var swatchRow = document.getElementById("swatch-row");
  var typeRow = document.getElementById("type-row");
  var typeHint = document.getElementById("type-hint");
  var unitInput = document.getElementById("unit-input");
  var progressFields = document.getElementById("progress-fields");
  var selectedColor = COLOR_KEYS[state.habits.length % COLOR_KEYS.length];
  var selectedType = "toggle";

  var TYPE_HINTS = {
    toggle: 'Se marca como cumplida o no, como "Tomar creatina".',
    progress: 'Acumulás unidades a lo largo del día hasta llegar a una meta, como "Beber agua" o "Caminar mis pasos".'
  };

  function applyType() {
    Array.prototype.forEach.call(typeRow.querySelectorAll(".type-option"), function (btn) {
      var active = btn.getAttribute("data-type") === selectedType;
      btn.classList.toggle("selected", active);
      btn.setAttribute("aria-checked", String(active));
    });
    typeHint.textContent = TYPE_HINTS[selectedType];
    progressFields.hidden = selectedType !== "progress";
    unitInput.placeholder =
      selectedType === "progress" ? "Unidad (ej. L, g, min, pasos)" : "Detalle (opcional, ej. dosis 5 g)";
  }
  applyType();

  Array.prototype.forEach.call(typeRow.querySelectorAll(".type-option"), function (btn) {
    btn.addEventListener("click", function () {
      selectedType = btn.getAttribute("data-type");
      applyType();
    });
  });

  function renderSwatches() {
    swatchRow.innerHTML = "";
    COLOR_KEYS.forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch" + (key === selectedColor ? " selected" : "");
      btn.style.background = "linear-gradient(135deg, " + COLORS[key].g1 + ", " + COLORS[key].g2 + ")";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", String(key === selectedColor));
      btn.setAttribute("aria-label", key);
      btn.addEventListener("click", function () {
        selectedColor = key;
        renderSwatches();
      });
      swatchRow.appendChild(btn);
    });
  }
  renderSwatches();

  addToggle.addEventListener("click", function () {
    var open = addForm.classList.toggle("open");
    if (open) addForm.querySelector('input[name="label"]').focus();
  });

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var labelInput = addForm.querySelector('input[name="label"]');
    var label = labelInput.value.trim();
    if (!label) return;

    var habit = {
      id: "h" + Date.now().toString(36),
      label: label,
      color: selectedColor,
      type: selectedType,
      unit: unitInput.value.trim()
    };

    if (selectedType === "progress") {
      var targetInput = addForm.querySelector('input[name="target"]');
      var stepInput = addForm.querySelector('input[name="step"]');
      var target = parseFloat(targetInput.value);
      var step = parseFloat(stepInput.value);
      if (!habit.unit || !(target > 0) || !(step > 0)) {
        alert("Para una meta de progreso completá unidad, meta e incremento (mayores a 0).");
        return;
      }
      habit.target = target;
      habit.step = step;
    }

    state.habits.push(habit);
    save();

    labelInput.value = "";
    unitInput.value = "";
    addForm.querySelector('input[name="target"]').value = "";
    addForm.querySelector('input[name="step"]').value = "";
    addForm.classList.remove("open");
    selectedType = "toggle";
    applyType();
    selectedColor = COLOR_KEYS[state.habits.length % COLOR_KEYS.length];
    renderSwatches();
    renderAll();
  });

  renderHeader();
  renderAll();

  if (window.DosisCloud) {
    var cloudBar = document.getElementById("cloud-bar");
    if (cloudBar) {
      cloudBar.addEventListener("click", function () {
        if (cloudUid) {
          if (confirm("¿Cerrar sesión de sincronización en la nube? Tus datos siguen guardados en este dispositivo.")) {
            window.DosisCloud.signOut();
          }
        } else {
          setCloudStatus("Conectando con Google…", false);
          window.DosisCloud.signIn().catch(function (e) {
            if (e && e.code === "auth/popup-closed-by-user") {
              setCloudStatus("Sin sincronizar — tocá para conectar con Google", false);
            } else {
              console.warn("No se pudo iniciar sesión", e);
              setCloudStatus("No se pudo conectar — probá de nuevo", false);
            }
          });
        }
      });
    }

    window.DosisCloud.onAuthChange(function (user) {
      if (cloudUnsub) {
        cloudUnsub();
        cloudUnsub = null;
      }
      if (user) {
        cloudUid = user.uid;
        setCloudStatus("Sincronizado como " + (user.email || user.displayName || "cuenta de Google"), true);
        window.DosisCloud.fetchRemote(cloudUid).then(function (remote) {
          if (remote) {
            mergeRemote(remote);
          } else {
            pushToCloud();
          }
          cloudUnsub = window.DosisCloud.subscribe(cloudUid, mergeRemote);
        });
      } else {
        cloudUid = null;
        setCloudStatus("Sin sincronizar — tocá para conectar con Google", false);
      }
    });
  } else {
    setCloudStatus("Sincronización en la nube no disponible", false);
  }
})();
