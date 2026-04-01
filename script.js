const STORAGE_KEY       = 'my-tasks';
const THEME_STORAGE_KEY = 'my-tasks-theme';

// ===========================
// 다크모드
// ===========================

function loadTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
}

// ===========================
// 데이터 레이어
// ===========================

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
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
// 유틸
// ===========================

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)        return '방금 전';
  if (diff < 3600)      return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(isoString).toLocaleDateString('ko-KR');
}

// 검색어를 <mark>로 감싼 HTML 반환 (XSS 방지: textContent 우선)
function highlightText(text, query) {
  if (!query) return null; // null이면 textContent로 처리
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex   = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// ===========================
// 상태
// ===========================

let todos        = loadTodos();
let activeFilter = '전체';
let searchQuery  = '';

// ===========================
// DOM 참조
// ===========================

const themeToggle      = document.getElementById('theme-toggle');
const input            = document.getElementById('todo-input');
const categorySelect   = document.getElementById('category-select');
const addBtn           = document.getElementById('add-btn');
const searchInput      = document.getElementById('search-input');
const list             = document.getElementById('todo-list');
const emptyMsg         = document.getElementById('empty-msg');
const filterBtns       = document.querySelectorAll('.filter-btn');
const clearCompletedBtn= document.getElementById('clear-completed-btn');

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

  const active    = base.filter((t) => !t.completed);
  const completed = base.filter((t) =>  t.completed);
  return { active, completed };
}

function createItem(todo, query) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');
  li.dataset.id = todo.id;

  // 체크박스
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  // 카테고리 배지
  const badge = document.createElement('span');
  badge.className = `category-badge badge-${todo.category}`;
  badge.textContent = todo.category;

  // 텍스트 + 시간
  const body = document.createElement('div');
  body.className = 'todo-body';

  const textSpan = document.createElement('span');
  textSpan.className = 'todo-text';
  const highlighted = highlightText(todo.text, query);
  if (highlighted) {
    textSpan.innerHTML = highlighted; // 검색어 하이라이트
  } else {
    textSpan.textContent = todo.text;
  }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'todo-time';
  timeSpan.textContent = timeAgo(todo.createdAt);

  body.append(textSpan, timeSpan);

  // 삭제 버튼
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.setAttribute('aria-label', '삭제');
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.append(checkbox, badge, body, deleteBtn);
  return li;
}

function render() {
  list.innerHTML = '';

  const query = searchQuery;
  const { active, completed } = getFiltered();
  const total = active.length + completed.length;

  active.forEach((todo)    => list.appendChild(createItem(todo, query)));

  if (completed.length > 0) {
    if (active.length > 0) {
      const divider = document.createElement('li');
      divider.className = 'completed-divider';
      divider.textContent = `완료 ${completed.length}개`;
      list.appendChild(divider);
    }
    completed.forEach((todo) => list.appendChild(createItem(todo, query)));
  }

  emptyMsg.classList.toggle('hidden', total > 0);

  // 완료 항목 삭제 버튼 활성화
  const hasCompleted = todos.some((t) => t.completed);
  clearCompletedBtn.disabled = !hasCompleted;
}

// ===========================
// 액션
// ===========================

function addTodo() {
  const text = input.value.trim();
  if (!text) return;

  todos.push(createTodo(text, categorySelect.value));
  saveTodos(todos);
  render();

  input.value = '';
  input.focus();
}

function toggleTodo(id) {
  todos = todos.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  saveTodos(todos);
  render();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos(todos);
  render();
}

function clearCompleted() {
  const count = todos.filter((t) => t.completed).length;
  if (count === 0) return;

  const ok = window.confirm(`완료된 항목 ${count}개를 모두 삭제할까요?`);
  if (!ok) return;

  todos = todos.filter((t) => !t.completed);
  saveTodos(todos);
  render();
}

function setFilter(filter) {
  activeFilter = filter;
  filterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  render();
}

// ===========================
// 이벤트
// ===========================

// 추가
addBtn.addEventListener('click', addTodo);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });

// 필터
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

// 완료 항목 일괄 삭제
clearCompletedBtn.addEventListener('click', clearCompleted);

// 다크모드 토글
themeToggle.addEventListener('click', toggleTheme);

// 실시간 검색
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  render();
});

// 키보드 단축키
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'n') {
    e.preventDefault();
    input.focus();
    input.select();
  }
  if (e.altKey && e.key === 'd') {
    e.preventDefault();
    toggleTheme();
  }
});

// 1분마다 시간 표시 갱신
setInterval(render, 60_000);

// ===========================
// 초기화
// ===========================

applyTheme(loadTheme());
render();
