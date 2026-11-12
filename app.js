const STORAGE_KEY = 'dailyfuel-v1';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT = {
  meals: [],
  water: {},
  weights: {},
  workouts: {},
  goals: { calories: 2200, protein: 120, carbs: 250, fat: 70, fiber: 30 },
  waterGoal: 2000,
  completed: {},
};

const $ = (id) => document.getElementById(id);

let db = load();
let selectedDate = today();
let photo = null;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return v && typeof v === 'object' ? { ...structuredClone(DEFAULT), ...v } : structuredClone(DEFAULT);
  } catch {
    return structuredClone(DEFAULT);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  render();
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function num(v) {
  return Math.max(0, Number(v) || 0);
}

function fmt(v) {
  return Number(v.toFixed(1)).toLocaleString();
}

function mealToday() {
  return db.meals.filter((m) => m.date === selectedDate);
}

function render() {
  const meals = mealToday();
  const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  const labels = {
    calories: '🔥 Calories',
    protein: '💪 Protein',
    carbs: '🌾 Carbs',
    fat: '🥑 Fat',
    fiber: '🥬 Fiber',
  };

  $('stats').innerHTML = keys
    .map((k) => {
      const total = meals.reduce((sum, meal) => sum + num(meal[k]), 0);
      const goal = num(db.goals[k]) || 1;
      return `
        <article class="stat">
          <span class="label">${labels[k]}</span>
          <strong>${fmt(total)}</strong>
          <small>of ${fmt(goal)} ${k === 'calories' ? 'kcal' : 'g'}</small>
          <div class="meter"><span style="width:${Math.min(100, (100 * total) / goal)}%"></span></div>
        </article>
      `;
    })
    .join('');

  $('recentMeals').innerHTML = meals.length
    ? meals
        .slice(-4)
        .reverse()
        .map(
          (m) => `
          <div class="rowitem">
            <div>
              <strong>${escapeHTML(m.name)}</strong>
              <small>${escapeHTML(m.type)} · ${fmt(num(m.calories))} kcal</small>
            </div>
          </div>
        `,
        )
        .join('')
    : '<div class="empty">No meals yet. Log your first meal!</div>';

  $('mealList').innerHTML = meals.length
    ? meals
        .map(
          (m) => `
          <div class="rowitem">
            <div>
              <strong>${escapeHTML(m.name)}</strong>
              <small>${escapeHTML(m.type)} · ${fmt(num(m.serving))}g · ${fmt(num(m.calories))} kcal · P ${fmt(num(m.protein))}g · C ${fmt(num(m.carbs))}g · F ${fmt(num(m.fat))}g · Fiber ${fmt(num(m.fiber))}g</small>
            </div>
            <div class="actions">
              <button class="secondary" data-edit="${escapeHTML(m.id)}" type="button">Edit</button>
              <button class="secondary" data-delete="${escapeHTML(m.id)}" type="button">Delete</button>
            </div>
          </div>
        `,
        )
        .join('')
    : '<div class="empty">Your food diary is empty for this date.</div>';

  const water = num(db.water[selectedDate]);
  $('waterCount').textContent = fmt(water);
  $('waterGoal').value = db.waterGoal;
  $('waterBar').style.width = `${Math.min(100, (100 * water) / (num(db.waterGoal) || 1))}%`;

  const day = $('workoutDay').value;
  const exercises = db.workouts[day] || [];
  $('exerciseList').innerHTML = exercises.length
    ? exercises
        .map((e) => {
          const key = selectedDate + ':' + e.id;
          const done = !!db.completed[key];
          return `
            <div class="rowitem">
              <div>
                <strong>${done ? '✅ ' : '🏋️ '}${escapeHTML(e.name)}</strong>
                <small>${escapeHTML(e.sets)} sets × ${escapeHTML(e.reps)} reps · ${escapeHTML(e.rest)}s rest · ${escapeHTML(e.notes || '')}</small>
                ${e.url ? `<small><a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer">Demo video ↗</a></small>` : ''}
              </div>
              <div class="actions">
                <button class="secondary" data-complete="${escapeHTML(e.id)}" type="button">${done ? 'Undo' : 'Complete'}</button>
                <button class="secondary" data-removeexercise="${escapeHTML(e.id)}" type="button">Delete</button>
              </div>
            </div>
          `;
        })
        .join('')
    : '<div class="empty">No exercises planned for this day.</div>';

  $('weightList').innerHTML =
    Object.entries(db.weights)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(
        ([d, w]) => `
          <div class="rowitem compact-row">
            <strong>${escapeHTML(d)}</strong>
            <span>${fmt(num(w))} kg</span>
          </div>
        `,
      )
      .join('') || '<div class="empty">No weight entries yet.</div>';
}

function show(page) {
  document.querySelectorAll('.page').forEach((el) => el.classList.toggle('active', el.id === page));
  document.querySelectorAll('nav button').forEach((el) => el.classList.toggle('active', el.dataset.page === page));
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-page]').forEach((b) => {
  b.addEventListener('click', () => show(b.dataset.page));
});

$('date').value = selectedDate;
$('date').addEventListener('change', (e) => {
  selectedDate = e.target.value || today();
  render();
});

function editMeal(m) {
  $('mealEditor').hidden = false;
  $('mealEditorTitle').textContent = m ? 'Edit meal' : 'Add meal';
  $('mealId').value = m?.id || '';

  const map = [
    ['foodName', 'name'],
    ['mealType', 'type'],
    ['serving', 'serving'],
    ['calories', 'calories'],
    ['protein', 'protein'],
    ['carbs', 'carbs'],
    ['fat', 'fat'],
    ['fiber', 'fiber'],
  ];

  for (const [field, key] of map) {
    const value = m?.[key];
    $(field).value =
      field === 'mealType'
        ? (value ?? 'Breakfast')
        : field === 'serving'
          ? (value ?? 100)
          : field === 'foodName'
            ? (value ?? '')
            : (value ?? 0);
  }

  $('mealEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('newMeal').onclick = () => editMeal(null);
$('cancelMeal').onclick = () => ($('mealEditor').hidden = true);

$('mealForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const id = $('mealId').value || crypto.randomUUID();
  const old = db.meals.find((m) => m.id === id);
  const meal = {
    id,
    date: old?.date || selectedDate,
    name: $('foodName').value.trim(),
    type: $('mealType').value,
    serving: num($('serving').value),
    calories: num($('calories').value),
    protein: num($('protein').value),
    carbs: num($('carbs').value),
    fat: num($('fat').value),
    fiber: num($('fiber').value),
  };

  if (!meal.name) return;

  db.meals = db.meals.filter((x) => x.id !== id);
  db.meals.push(meal);
  $('mealEditor').hidden = true;
  save();
});

$('mealList').addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-delete]');

  if (edit) {
    editMeal(db.meals.find((m) => m.id === edit.dataset.edit));
  }

  if (del && confirm('Delete this meal?')) {
    db.meals = db.meals.filter((m) => m.id !== del.dataset.delete);
    save();
  }
});

$('addWater').onclick = () => {
  db.water[selectedDate] = num(db.water[selectedDate]) + 250;
  save();
};

$('undoWater').onclick = () => {
  db.water[selectedDate] = Math.max(0, num(db.water[selectedDate]) - 250);
  save();
};

$('waterGoal').onchange = (e) => {
  db.waterGoal = Math.max(250, num(e.target.value));
  save();
};

$('workoutDay').innerHTML = DAYS.map((d) => `<option>${d}</option>`).join('');
$('workoutDay').value = DAYS[(new Date().getDay() + 6) % 7];
$('workoutDay').onchange = render;

$('exerciseForm').onsubmit = (e) => {
  e.preventDefault();
  const day = $('workoutDay').value;
  db.workouts[day] ??= [];
  db.workouts[day].push({
    id: crypto.randomUUID(),
    name: $('exerciseName').value.trim(),
    sets: num($('exerciseSets').value),
    reps: $('exerciseReps').value,
    rest: num($('exerciseRest').value),
    url: $('exerciseUrl').value,
    notes: $('exerciseNotes').value,
  });
  e.target.reset();
  save();
};

$('exerciseList').onclick = (e) => {
  const done = e.target.closest('[data-complete]');
  const del = e.target.closest('[data-removeexercise]');
  const day = $('workoutDay').value;

  if (done) {
    const key = selectedDate + ':' + done.dataset.complete;
    db.completed[key] = !db.completed[key];
    save();
  }

  if (del && confirm('Remove exercise from plan?')) {
    db.workouts[day] = (db.workouts[day] || []).filter((x) => x.id !== del.dataset.removeexercise);
    save();
  }
};

$('weightForm').onsubmit = (e) => {
  e.preventDefault();
  db.weights[selectedDate] = num($('weightInput').value);
  $('weightInput').value = '';
  save();
};

const goalNames = {
  calories: 'Calories (kcal)',
  protein: 'Protein (g)',
  carbs: 'Carbs (g)',
  fat: 'Fat (g)',
  fiber: 'Fiber (g)',
};

$('goalsForm').innerHTML = Object.entries(goalNames)
  .map(
    ([k, v]) => `
      <label>
        ${v}
        <input type="number" name="${k}" min="1" step="1" value="${num(db.goals[k])}" required />
      </label>
    `,
  )
  .join('') + '<button type="submit">Save goals</button>';

$('goalsForm').onsubmit = (e) => {
  e.preventDefault();
  for (const k of Object.keys(goalNames)) {
    db.goals[k] = Math.max(1, num(e.target.elements[k].value));
  }
  save();
};

$('exportData').onclick = () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dailyfuel-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

$('importData').onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.meals) || typeof parsed.water !== 'object' || !parsed.goals) {
      throw new Error('Invalid DailyFuel backup');
    }
    if (!confirm('Replace your existing DailyFuel data with this backup?')) return;
    db = { ...structuredClone(DEFAULT), ...parsed };
    save();
    alert('Backup imported');
  } catch (err) {
    alert('Import failed: ' + err.message);
  } finally {
    e.target.value = '';
  }
};

$('foodPhoto').onchange = (e) => {
  const file = e.target.files?.[0];
  photo = null;
  $('scanBtn').disabled = true;
  $('preview').hidden = true;

  if (!file) return;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    $('scanStatus').textContent = 'Please select a JPEG, PNG, or WebP image under 5 MB.';
    return;
  }

  photo = file;
  const reader = new FileReader();
  reader.onload = () => {
    $('preview').src = reader.result;
    $('preview').hidden = false;
  };
  reader.readAsDataURL(file);
  $('scanBtn').disabled = false;
  $('scanStatus').textContent = 'Photo ready. Configure your AI endpoint to analyze.';
};

$('aiEndpoint').value = localStorage.getItem('dailyfuel-ai-endpoint') || '';
$('aiEndpoint').onchange = (e) => localStorage.setItem('dailyfuel-ai-endpoint', e.target.value.trim());

$('scanBtn').onclick = async () => {
  if (!photo) return;

  const endpoint = $('aiEndpoint').value.trim();
  if (!endpoint) {
    $('scanStatus').textContent = 'Add a secure AI endpoint URL to enable photo analysis. You can log manually without one.';
    return;
  }

  let url;
  try {
    url = new URL(endpoint);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('Use HTTPS for your endpoint');
  } catch {
    $('scanStatus').textContent = 'Enter a valid HTTPS endpoint.';
    return;
  }

  const btn = $('scanBtn');
  btn.disabled = true;
  $('scanStatus').textContent = 'Analyzing photo…';

  try {
    const form = new FormData();
    form.append('image', photo);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let res;
    try {
      res = await fetch(endpoint, { method: 'POST', body: form, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const data = await res.json();
    const items = Array.isArray(data.foods) ? data.foods : Array.isArray(data.items) ? data.items : [data];
    if (!items.length) throw new Error('No foods detected');

    $('scanResults').innerHTML = '';

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'rowitem';
      const name = String(item.name || item.food || 'Unknown food').slice(0, 100);
      row.innerHTML = `
        <div>
          <strong>${escapeHTML(name)}</strong>
          <small>${fmt(num(item.calories))} kcal · ${fmt(num(item.protein))}g protein</small>
        </div>
        <button class="secondary" type="button">Review & save</button>
      `;
      row.querySelector('button').onclick = () => {
        show('meals');
        editMeal(null);
        $('foodName').value = name;
        ['serving', 'calories', 'protein', 'carbs', 'fat', 'fiber'].forEach((k) => {
          $(k).value = num(item[k] ?? (k === 'fat' ? item.fats : undefined) ?? (k === 'serving' ? 100 : 0));
        });
        $('mealType').value = 'Lunch';
      };
      $('scanResults').append(row);
    }

    $('scanStatus').textContent = 'AI estimates ready. Review each food before saving.';
  } catch (err) {
    $('scanStatus').textContent = `Analysis unavailable: ${err.message}. You can still log manually.`;
  } finally {
    btn.disabled = false;
  }
};

$('manualFromScan').onclick = () => {
  show('meals');
  editMeal(null);
};

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}





















































