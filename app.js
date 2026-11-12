const STORAGE_KEY = 'dailyfuel-state';

const defaultState = {
  meals: [
    { id: 1, name: 'Oats + berries', calories: 360, protein: 18 },
    { id: 2, name: 'Chicken salad', calories: 520, protein: 42 },
  ],
  workouts: [
    { id: 1, name: '30-min brisk walk', done: true },
    { id: 2, name: 'Strength circuit', done: false },
  ],
  water: 5,
  goal: 8,
};

const appState = loadState();

const mealList = document.querySelector('#mealList');
const workoutList = document.querySelector('#workoutList');
const mealForm = document.querySelector('#mealForm');
const scanMealBtn = document.querySelector('#scanMeal');
const foodImageInput = document.querySelector('#foodImage');
const resetButton = document.querySelector('#resetData');
const waterAddButton = document.querySelector('#waterAdd');

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    return {
      ...defaultState,
      ...parsed,
      meals: parsed.meals ?? defaultState.meals,
      workouts: parsed.workouts ?? defaultState.workouts,
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function calculateTotals() {
  const calories = appState.meals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
  const protein = appState.meals.reduce((sum, meal) => sum + Number(meal.protein || 0), 0);
  const workoutDone = appState.workouts.filter((workout) => workout.done).length;
  const goal = 2200;
  const progress = calories / goal;

  document.querySelector('#calorieTotal').textContent = calories;
  document.querySelector('#proteinTotal').textContent = protein;
  document.querySelector('#waterTotal').textContent = appState.water;
  document.querySelector('#workoutCount').textContent = workoutDone;
  document.querySelector('#waterStatus').textContent = `Goal: ${appState.goal} glasses`;

  const summary = document.querySelector('#summaryChip');
  if (progress < 0.8) summary.textContent = 'Goal ahead';
  else if (progress > 1.1) summary.textContent = 'Calorie target reached';
  else summary.textContent = 'On track';
}

function renderMeals() {
  mealList.innerHTML = appState.meals
    .map(
      (meal) => `
        <li>
          <div class="item-copy">
            <strong>${meal.name}</strong>
            <small>${meal.calories} kcal • ${meal.protein}g protein</small>
          </div>
          <button class="secondary remove-meal" type="button" data-id="${meal.id}">Remove</button>
        </li>
      `,
    )
    .join('');

  document.querySelectorAll('.remove-meal').forEach((button) => {
    button.addEventListener('click', () => {
      const mealId = Number(button.dataset.id);
      appState.meals = appState.meals.filter((meal) => meal.id !== mealId);
      saveState();
      render();
    });
  });
}

function renderWorkouts() {
  workoutList.innerHTML = appState.workouts
    .map(
      (workout) => `
        <li class="${workout.done ? 'completed' : ''}">
          <div class="item-copy">
            <strong>${workout.name}</strong>
            <small>${workout.done ? 'Completed' : 'Planned'}</small>
          </div>
          <button class="secondary toggle-workout" type="button" data-id="${workout.id}">
            ${workout.done ? 'Undo' : 'Done'}
          </button>
        </li>
      `,
    )
    .join('');

  document.querySelectorAll('.toggle-workout').forEach((button) => {
    button.addEventListener('click', () => {
      const workoutId = Number(button.dataset.id);
      appState.workouts = appState.workouts.map((workout) =>
        workout.id === workoutId ? { ...workout, done: !workout.done } : workout,
      );
      saveState();
      render();
    });
  });
}

function render() {
  calculateTotals();
  renderMeals();
  renderWorkouts();
}

mealForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const mealName = document.querySelector('#mealName').value.trim();
  const mealCalories = Number(document.querySelector('#mealCalories').value);
  const mealProtein = Number(document.querySelector('#mealProtein').value);

  if (!mealName || Number.isNaN(mealCalories) || Number.isNaN(mealProtein)) return;

  appState.meals.push({
    id: Date.now(),
    name: mealName,
    calories: mealCalories,
    protein: mealProtein,
  });

  mealForm.reset();
  document.querySelector('#mealCalories').value = 420;
  document.querySelector('#mealProtein').value = 28;
  saveState();
  render();
});

scanMealBtn.addEventListener('click', () => {
  const file = foodImageInput.files[0];
  const preview = document.querySelector('#scanPreview');
  const result = document.querySelector('#scanResult');

  if (!file) {
    result.textContent = 'Please upload a food photo before scanning.';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    preview.innerHTML = `<img src="${event.target.result}" alt="Uploaded meal" />`;
  };
  reader.readAsDataURL(file);

  const name = file.name.toLowerCase();
  let suggestedMeal = 'Balanced meal';
  let calories = 420;
  let protein = 28;

  if (name.includes('salad')) {
    suggestedMeal = 'Garden salad';
    calories = 320;
    protein = 18;
  } else if (name.includes('burger')) {
    suggestedMeal = 'Lean burger';
    calories = 610;
    protein = 35;
  } else if (name.includes('rice') || name.includes('bowl')) {
    suggestedMeal = 'Protein rice bowl';
    calories = 560;
    protein = 33;
  } else if (name.includes('fruit') || name.includes('smoothie')) {
    suggestedMeal = 'Fruit smoothie';
    calories = 260;
    protein = 16;
  }

  result.textContent = `AI scan suggests: ${suggestedMeal} • ${calories} kcal • ${protein}g protein.`;
  appState.meals.push({
    id: Date.now(),
    name: suggestedMeal,
    calories,
    protein,
  });
  saveState();
  render();
});

waterAddButton.addEventListener('click', () => {
  if (appState.water < appState.goal) {
    appState.water += 1;
    saveState();
    render();
  }
});

resetButton.addEventListener('click', () => {
  const reset = window.confirm('Reset the day to the starter plan?');
  if (!reset) return;

  Object.assign(appState, structuredClone(defaultState));
  saveState();
  render();
});

render();
