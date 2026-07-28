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
    correr:
      '<g><path d="M4.5 16.8c0-1.9 1.1-3 2.9-3.6l5.8-2.3c1.3-.5 2.8-.4 4 .4l2.5 1.7c1.1.7 1.6 2.1 1.3 3.3-.3 1.2-1.4 2.1-2.7 2.1H6.8c-1.3 0-2.3-.7-2.3-1.6z"/>' +
      '<line x1="8" y1="13.6" x2="10" y2="17"/></g>',
    default:
      '<g><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6" class="solid"/></g>'
  };

  var DEFAULT_HABITS = [
    { id: "creatina", label: "Tomar creatina", unit: "dosis 5 g", color: "violet", type: "toggle" },
    { id: "agua", label: "Beber agua", color: "indigo", type: "progress", target: 3, step: 1, unit: "L" },
    { id: "gimnasio", label: "Ir al gimnasio", color: "coral", type: "progress", target: 60, step: 15, unit: "min" },
    { id: "proteina", label: "Consumir proteína", color: "amber", type: "progress", target: 180, step: 15, unit: "g" },
    { id: "pasos", label: "Caminar mis pasos", color: "teal", type: "progress", target: 8000, step: 500, unit: "pasos" },
    { id: "correr", label: "Correr", color: "coral", type: "progress", target: 30, step: 10, unit: "min" }
  ];

  var DEFAULT_BY_ID = {};
  DEFAULT_HABITS.forEach(function (h) { DEFAULT_BY_ID[h.id] = h; });

  var WEEK_TARGET = 8;

  // Estimación de gasto/macros: fórmulas estándar (Mifflin-St Jeor + MET), no IA.
  var GYM_MET = 6; // pesas/entrenamiento de resistencia general
  var RUN_MET = 9; // trote/carrera a ritmo moderado
  var STEP_KCAL_PER_KG = 0.0005; // kcal por paso por kg de peso corporal
  var ACTIVITY_FACTOR = 1.2; // línea base sedentaria; el ejercicio se suma aparte para no duplicar
  var GOAL_CALORIE_ADJUST = { bajar: -400, subir: 300, recomp: 0 };
  var GOAL_PROTEIN_PER_KG = { bajar: 2.2, subir: 2, recomp: 2 };
  var FAT_PER_KG = 0.8;

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
    if (!parsed.sleep) parsed.sleep = {};
    if (!parsed.intake) parsed.intake = {};
    if (typeof parsed.profile === "undefined") parsed.profile = null;
    if (typeof parsed.updatedAt !== "number") parsed.updatedAt = 0;
    applyProfileToHabits(parsed);
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
    return { habits: DEFAULT_HABITS.slice(), completions: {}, training: {}, sleep: {}, intake: {}, profile: null, updatedAt: 0 };
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
  var YESTERDAY_KEY = todayKey(addDays(TODAY, -1));

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

  function computeBMR(profile) {
    var base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
    return profile.sex === "f" ? base - 161 : base + 5;
  }

  function proteinTargetG(profile) {
    var perKg = GOAL_PROTEIN_PER_KG[profile.goal] || 2;
    return Math.round(perKg * profile.weight);
  }

  function fatTargetG(profile) {
    return FAT_PER_KG * profile.weight;
  }

  function habitById(id) {
    return state.habits.filter(function (h) { return h.id === id; })[0];
  }

  function exerciseKcalToday(profile, entry) {
    var kcal = 0;
    var gym = habitById("gimnasio");
    if (gym) kcal += GYM_MET * profile.weight * (currentValue(gym, entry) / 60);
    var steps = habitById("pasos");
    if (steps) kcal += currentValue(steps, entry) * profile.weight * STEP_KCAL_PER_KG;
    var running = habitById("correr");
    if (running) kcal += RUN_MET * profile.weight * (currentValue(running, entry) / 60);
    return kcal;
  }

  function dailyCalorieTarget(profile, exerciseKcal) {
    var tdee = computeBMR(profile) * ACTIVITY_FACTOR + exerciseKcal;
    var adjust = GOAL_CALORIE_ADJUST[profile.goal] || 0;
    return Math.max(1200, tdee + adjust);
  }

  function carbsAvailableG(profile, calorieTarget) {
    var proteinKcal = proteinTargetG(profile) * 4;
    var fatKcal = fatTargetG(profile) * 9;
    return Math.max(0, Math.round((calorieTarget - proteinKcal - fatKcal) / 4));
  }

  function applyProfileToHabits(s) {
    if (!s.profile) return;
    var protein = s.habits.filter(function (h) { return h.id === "proteina"; })[0];
    if (protein) protein.target = proteinTargetG(s.profile);
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

  function renderNutrition() {
    var stats = document.getElementById("nutrition-stats");
    var editBtn = document.getElementById("nutrition-edit");
    if (!stats || !editBtn) return;
    stats.innerHTML = "";

    var consumedInput = document.getElementById("input-consumed");
    if (consumedInput) consumedInput.value = state.intake[TODAY_KEY] || "";

    if (!state.profile) {
      editBtn.textContent = "Configurar";
      var cta = document.createElement("button");
      cta.type = "button";
      cta.className = "nutrition-cta";
      cta.textContent = "Completá tu perfil para ver calorías y macros de hoy";
      cta.addEventListener("click", openProfileForm);
      stats.appendChild(cta);
      return;
    }

    editBtn.textContent = "Editar";
    var entry = state.completions[TODAY_KEY] || {};
    var exerciseKcal = exerciseKcalToday(state.profile, entry);
    var calorieTarget = dailyCalorieTarget(state.profile, exerciseKcal);
    var proteinTarget = proteinTargetG(state.profile);
    var proteinHabit = habitById("proteina");
    var proteinLogged = proteinHabit ? currentValue(proteinHabit, entry) : 0;
    var proteinRemaining = Math.max(0, Math.round(proteinTarget - proteinLogged));
    var carbsAvailable = carbsAvailableG(state.profile, calorieTarget);
    var consumed = state.intake[TODAY_KEY] || 0;
    var balance = Math.round(calorieTarget - consumed);
    var balanceValue = (balance >= 0 ? "+" : "") + formatNumber(balance) + " kcal";

    var tiles = [
      { icon: "🔥", value: formatNumber(Math.round(exerciseKcal)) + " kcal", label: "Quemadas hoy" },
      { icon: "⚖️", value: balanceValue, label: balance >= 0 ? "Te faltan" : "Excediste" },
      { icon: "🥩", value: formatNumber(proteinRemaining) + " g", label: "Proteína restante" },
      { icon: "🍚", value: formatNumber(carbsAvailable) + " g", label: "Carbos disponibles" }
    ];

    tiles.forEach(function (t) {
      var tile = document.createElement("div");
      tile.className = "nutrition-tile";
      var icon = document.createElement("span");
      icon.className = "nutrition-tile-icon";
      icon.textContent = t.icon;
      var value = document.createElement("span");
      value.className = "nutrition-tile-value";
      value.textContent = t.value;
      var label = document.createElement("span");
      label.className = "nutrition-tile-label";
      label.textContent = t.label;
      tile.appendChild(icon);
      tile.appendChild(value);
      tile.appendChild(label);
      stats.appendChild(tile);
    });
  }

  function minutesOfDay(hhmm) {
    var parts = hhmm.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function crossMidnightMinutes(startHHMM, endHHMM) {
    var start = minutesOfDay(startHHMM);
    var end = minutesOfDay(endHHMM);
    return (24 * 60 - start) + end;
  }

  function formatDuration(totalMinutes) {
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return h + "h " + String(m).padStart(2, "0") + "m";
  }

  var TIME_FIELDS = ["lastMeal", "breakFast", "bedtime", "wake"];
  var TIME_INPUTS = {
    lastMeal: document.getElementById("time-lastMeal"),
    breakFast: document.getElementById("time-breakFast"),
    bedtime: document.getElementById("time-bedtime"),
    wake: document.getElementById("time-wake")
  };

  function renderSleepFast() {
    var stats = document.getElementById("sleepfast-stats");
    if (!stats) return;
    stats.innerHTML = "";

    var yesterday = state.sleep[YESTERDAY_KEY] || {};
    var today = state.sleep[TODAY_KEY] || {};

    TIME_FIELDS.forEach(function (field) {
      var input = TIME_INPUTS[field];
      if (input) input.value = today[field] || "";
    });

    var fastingLabel = "—";
    if (yesterday.lastMeal && today.breakFast) {
      fastingLabel = formatDuration(crossMidnightMinutes(yesterday.lastMeal, today.breakFast));
    }

    var sleepLabel = "—";
    if (yesterday.bedtime && today.wake) {
      sleepLabel = formatDuration(crossMidnightMinutes(yesterday.bedtime, today.wake));
    }

    var tiles = [
      { icon: "⏳", value: fastingLabel, label: "Horas de ayuno" },
      { icon: "🌙", value: sleepLabel, label: "Horas de sueño" }
    ];

    tiles.forEach(function (t) {
      var tile = document.createElement("div");
      tile.className = "nutrition-tile";
      var icon = document.createElement("span");
      icon.className = "nutrition-tile-icon";
      icon.textContent = t.icon;
      var value = document.createElement("span");
      value.className = "nutrition-tile-value";
      value.textContent = t.value;
      var label = document.createElement("span");
      label.className = "nutrition-tile-label";
      label.textContent = t.label;
      tile.appendChild(icon);
      tile.appendChild(value);
      tile.appendChild(label);
      stats.appendChild(tile);
    });
  }

  function renderAll() {
    renderHabits();
    renderStreak();
    renderHistory();
    renderTraining();
    renderNutrition();
    renderSleepFast();
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

  var consumedInputEl = document.getElementById("input-consumed");
  if (consumedInputEl) {
    consumedInputEl.addEventListener("change", function () {
      var value = parseFloat(consumedInputEl.value);
      if (value > 0) {
        state.intake[TODAY_KEY] = value;
      } else {
        delete state.intake[TODAY_KEY];
      }
      save();
      renderNutrition();
    });
  }

  TIME_FIELDS.forEach(function (field) {
    var input = TIME_INPUTS[field];
    if (!input) return;
    input.addEventListener("change", function () {
      var entry = state.sleep[TODAY_KEY] || {};
      if (input.value) {
        entry[field] = input.value;
      } else {
        delete entry[field];
      }
      state.sleep[TODAY_KEY] = entry;
      save();
      renderSleepFast();
    });
  });

  var profileOverlay = document.getElementById("profile-overlay");
  var profileForm = document.getElementById("profile-form");
  var profileSexRow = document.getElementById("sex-row");
  var profileGoalRow = document.getElementById("goal-row");
  var profileCancel = document.getElementById("profile-cancel");
  var nutritionEdit = document.getElementById("nutrition-edit");
  var selectedSex = "m";
  var selectedGoal = "bajar";

  function applySexSelection() {
    Array.prototype.forEach.call(profileSexRow.querySelectorAll(".type-option"), function (btn) {
      var active = btn.getAttribute("data-sex") === selectedSex;
      btn.classList.toggle("selected", active);
      btn.setAttribute("aria-checked", String(active));
    });
  }

  function applyGoalSelection() {
    Array.prototype.forEach.call(profileGoalRow.querySelectorAll(".type-option"), function (btn) {
      var active = btn.getAttribute("data-goal") === selectedGoal;
      btn.classList.toggle("selected", active);
      btn.setAttribute("aria-checked", String(active));
    });
  }

  Array.prototype.forEach.call(profileSexRow.querySelectorAll(".type-option"), function (btn) {
    btn.addEventListener("click", function () {
      selectedSex = btn.getAttribute("data-sex");
      applySexSelection();
    });
  });

  Array.prototype.forEach.call(profileGoalRow.querySelectorAll(".type-option"), function (btn) {
    btn.addEventListener("click", function () {
      selectedGoal = btn.getAttribute("data-goal");
      applyGoalSelection();
    });
  });

  function openProfileForm() {
    var p = state.profile;
    profileForm.querySelector('input[name="weight"]').value = p ? p.weight : "";
    profileForm.querySelector('input[name="height"]').value = p ? p.height : "";
    profileForm.querySelector('input[name="age"]').value = p ? p.age : "";
    selectedSex = p ? p.sex : "m";
    selectedGoal = p ? p.goal : "bajar";
    applySexSelection();
    applyGoalSelection();
    profileOverlay.hidden = false;
  }

  function closeProfileForm() {
    profileOverlay.hidden = true;
  }

  nutritionEdit.addEventListener("click", openProfileForm);
  profileCancel.addEventListener("click", closeProfileForm);
  profileOverlay.addEventListener("click", function (e) {
    if (e.target === profileOverlay) closeProfileForm();
  });

  profileForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var weight = parseFloat(profileForm.querySelector('input[name="weight"]').value);
    var height = parseFloat(profileForm.querySelector('input[name="height"]').value);
    var age = parseInt(profileForm.querySelector('input[name="age"]').value, 10);
    if (!(weight > 0) || !(height > 0) || !(age > 0)) {
      alert("Completá peso, altura y edad con valores válidos.");
      return;
    }
    state.profile = { weight: weight, height: height, age: age, sex: selectedSex, goal: selectedGoal };
    applyProfileToHabits(state);
    save();
    closeProfileForm();
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
