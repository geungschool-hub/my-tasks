import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ===========================
// Firebase 초기화
// ===========================

const firebaseConfig = {
  apiKey: "AIzaSyDHQALGBJ_BkMGymHCksRQDs3S8sR0B5Y8",
  authDomain: "my-tasks-e28cb.firebaseapp.com",
  databaseURL: "https://my-tasks-e28cb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-tasks-e28cb",
  storageBucket: "my-tasks-e28cb.firebasestorage.app",
  messagingSenderId: "226024601715",
  appId: "1:226024601715:web:ed4293ac54ae7d236cd206"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const TODOS_REF = doc(db, "todos", "shared"); // 모바일 버전과 같은 문서 공유

// ===========================
// 데이터 저장 (Firestore)
// ===========================

async function saveTodos(list) {
  await setDoc(TODOS_REF, { list });
}

function createTodo(text, category) {
  return {
    id: Date.now(),
    text: text.trim(),
    category,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

// ===========================
// 다크모드
// ===========================

const THEME_KEY = 'my-tasks-theme';

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon  = themeToggle.querySelector('.theme-icon');
  const label = themeToggle.querySelector('.theme-label');
  icon.textContent  = theme === 'dark' ? '☀️' : '🌙';
  label.textContent = theme === 'dark' ? '라이트 모드' : '다크 모드';
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// ===========================
// 유틸
// ===========================

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)         return '방금 전';
  if (diff < 3600)       return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400)      return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7)  return `${Math.floor(diff / 86400)}일 전`;
  return new Date(isoString).toLocaleDateString('ko-KR');
}

function highlightText(text, query) {
  if (!query) return null;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

// ===========================
// 상태
// ===========================

let todos        = [];
let activeFilter = '전체';
let searchQuery  = '';

// ===========================
// DOM 참조
// ===========================

const themeToggle       = document.getElementById('theme-toggle');
const input             = document.getElementById('todo-input');
const categorySelect    = document.getElementById('category-select');
const addBtn            = document.getElementById('add-btn');
const searchInput       = document.getElementById('search-input');
const list              = document.getElementById('todo-list');
const emptyMsg          = document.getElementById('empty-msg');
const filterBtns        = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const viewTitle         = document.getElementById('view-title');
const taskCount         = document.getElementById('task-count');
const progressBar       = document.getElementById('progress-bar');
const progressText      = document.getElementById('progress-text');

// ===========================
// 렌더링
// ===========================

function getFiltered() {
  let base = activeFilter === '전체'
    ? todos
    : todos.filter((t) => t.category === activeFilter);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    base = base.filter((t) => t.text.toLowerCase().includes(q));
  }

  return {
    active:    base.filter((t) => !t.completed),
    completed: base.filter((t) =>  t.completed),
  };
}

function createItem(todo, query) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');
  li.dataset.id = todo.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  const badge = document.createElement('span');
  badge.className = `category-badge badge-${todo.category}`;
  badge.textContent = todo.category;

  const body = document.createElement('div');
  body.className = 'todo-body';

  const textSpan = document.createElement('span');
  textSpan.className = 'todo-text';
  const hl = highlightText(todo.text, query);
  if (hl) { textSpan.innerHTML = hl; } else { textSpan.textContent = todo.text; }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'todo-time';
  timeSpan.textContent = timeAgo(todo.createdAt);

  body.append(textSpan, timeSpan);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.setAttribute('aria-label', '삭제');
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.append(checkbox, badge, body, deleteBtn);
  return li;
}

function updateBadges() {
  ['전체', '업무', '개인', '공부'].forEach((cat) => {
    const el = document.getElementById(`badge-${cat}`);
    if (!el) return;
    const count = cat === '전체'
      ? todos.filter((t) => !t.completed).length
      : todos.filter((t) => t.category === cat && !t.completed).length;
    el.textContent = count > 0 ? count : '';
  });
}

function updateProgress() {
  const total     = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${completed} / ${total}`;
}

function render() {
  list.innerHTML = '';

  const { active, completed } = getFiltered();
  const total = active.length + completed.length;

  active.forEach((t)    => list.appendChild(createItem(t, searchQuery)));

  if (completed.length > 0) {
    if (active.length > 0) {
      const divider = document.createElement('li');
      divider.className = 'completed-divider';
      divider.textContent = `완료 ${completed.length}개`;
      list.appendChild(divider);
    }
    completed.forEach((t) => list.appendChild(createItem(t, searchQuery)));
  }

  emptyMsg.classList.toggle('hidden', total > 0);
  taskCount.textContent = total > 0 ? `${active.length}개 남음` : '';
  clearCompletedBtn.disabled = !todos.some((t) => t.completed);

  updateBadges();
  updateProgress();
}

// ===========================
// 액션
// ===========================

function addTodo() {
  const text = input.value.trim();
  if (!text) return;

  saveTodos([...todos, createTodo(text, categorySelect.value)]);
  input.value = '';
  input.focus();
}

function toggleTodo(id) {
  saveTodos(todos.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
}

function deleteTodo(id) {
  saveTodos(todos.filter((t) => t.id !== id));
}

function clearCompleted() {
  const count = todos.filter((t) => t.completed).length;
  if (!count) return;
  if (!window.confirm(`완료된 항목 ${count}개를 모두 삭제할까요?`)) return;
  saveTodos(todos.filter((t) => !t.completed));
}

function setFilter(filter) {
  activeFilter = filter;
  viewTitle.textContent = filter;
  filterBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.filter === filter));
  render();
}

// ===========================
// 이벤트
// ===========================

addBtn.addEventListener('click', addTodo);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });
filterBtns.forEach((btn) => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
clearCompletedBtn.addEventListener('click', clearCompleted);
themeToggle.addEventListener('click', toggleTheme);
searchInput.addEventListener('input', (e) => { searchQuery = e.target.value.trim(); render(); });

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
  if (e.altKey && e.key === 'n') { e.preventDefault(); input.focus(); input.select(); }
  if (e.altKey && e.key === 'd') { e.preventDefault(); toggleTheme(); }
});

setInterval(render, 60_000);

// ===========================
// Firestore 실시간 동기화
// ===========================

// Firestore 변경 감지 → todos 갱신 → 화면 자동 업데이트
onSnapshot(TODOS_REF, (snap) => {
  todos = snap.exists() ? (snap.data().list || []) : [];
  render();
});

// ===========================
// 초기화
// ===========================

applyTheme(loadTheme());
