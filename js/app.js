/* app.js - starts the app, handles navigation, theme, settings and the dashboard / planner screens. */
const App = (() => {
  const { $, $$, esc } = Utils;
  const VIEWS = { dashboard: 'Dashboard', subjects: 'My Subjects', tasks: 'All Tasks', planner: 'Daily Planner',
    calendar: 'Calendar', progress: 'Progress', settings: 'Settings' };

  /* ---------- Navigation ---------- */
  function showView(name) {
    if (!VIEWS[name]) name = 'dashboard';
    $$('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
    $$('.nav-item[data-view]').forEach((b) => {
      const active = b.dataset.view === name;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('#page-title').textContent = VIEWS[name];
    document.title = `${VIEWS[name]} | Student Study Planner`;
    document.body.classList.remove('sidebar-open');
    window.scrollTo(0, 0);
  }
  function goto(name) {
    showView(name);                                    // switch immediately
    if (location.hash.slice(1) !== name) location.hash = name; // keep the URL in sync (back button works)
  }

  /* ---------- Theme ---------- */
  function applyTheme() {
    const dark = Store.data.settings.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('#theme-toggle').innerHTML = `${Utils.icon(dark ? 'sun' : 'moon')}<span>${dark ? 'Light mode' : 'Dark mode'}</span>`;
    $('#settings-theme').textContent = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }
  function toggleTheme() {
    Store.data.settings.theme = Store.data.settings.theme === 'dark' ? 'light' : 'dark';
    Store.save(); applyTheme();
  }

  /* ---------- Dashboard ---------- */
  function statCard(iconName, label, value, tone) {
    return `<div class="stat ${tone}"><span class="stat-icon">${Utils.icon(iconName, 20)}</span><div><strong>${value}</strong><span>${label}</span></div></div>`;
  }
  function renderDashboard() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const name = Store.data.settings.userName;
    $('#dash-welcome').textContent = `${greeting}${name ? ', ' + name : ''}`;
    $('#dash-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const o = Progress.overall();
    $('#dash-stats').innerHTML =
      statCard('book', 'Subjects', Store.data.subjects.length, 'blue') + statCard('tasks', 'Total tasks', o.total, 'lav') +
      statCard('check', 'Completed', o.done, 'green') + statCard('clock', 'Pending', o.pending, 'orange');

    const t = Progress.today();
    const overdue = Store.data.tasks.filter(Tasks.isOverdue).length;
    $('#dash-today').innerHTML = `<div class="card-head"><h3>Today's study progress</h3></div>
      <div class="ring-row"><div class="ring big" style="--p:${t.pct}"><span>${t.pct}%</span></div>
      <div><p class="ring-text">${t.total ? `${t.done} of ${t.total} tasks done today` : 'No tasks due today'}</p>
      <p class="muted">${t.pending} pending${overdue ? `, ${overdue} overdue` : ''}</p>
      <button class="btn ghost" data-action="goto" data-view="planner">Open daily planner</button></div></div>`;

    const up = Tasks.upcoming(5);
    $('#dash-upcoming').innerHTML = up.length ? `<ul class="tasks compact">${up.map((x) => Tasks.itemHTML(x, { compact: true })).join('')}</ul>`
      : Utils.emptyState('No upcoming deadlines', 'Pending tasks will show up here, sorted by due date.');

    const recent = Store.data.tasks.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    $('#dash-recent').innerHTML = recent.length ? `<ul class="tasks compact">${recent.map((x) => Tasks.itemHTML(x, { compact: true })).join('')}</ul>`
      : Utils.emptyState('No tasks yet', 'Use "Quick add task" to create your first one.');

    const rows = Progress.bySubject();
    $('#dash-subjects').innerHTML = rows.length ? rows.map((r) => Progress.barRow(`${esc(r.subject.icon)} ${esc(r.subject.name)}`, r.subject.color, r.done, r.total)).join('')
      : Utils.emptyState('No subjects yet', 'Add a subject to see an overview here.', '<button class="btn primary" data-action="add-subject">Add subject</button>');
  }

  /* ---------- Daily planner ---------- */
  function taskBlock(title, tasks, extraClass = '') {
    return tasks.length ? `<div class="card ${extraClass}"><div class="card-head"><h3>${title} <span class="count">${tasks.length}</span></h3></div>
      <ul class="tasks">${tasks.map((t) => Tasks.itemHTML(t)).join('')}</ul></div>` : '';
  }
  function renderPlanner() {
    const t = Progress.today();
    const overdue = Store.data.tasks.filter((x) => x.dueDate < Utils.todayISO() && Tasks.isOverdue(x))
      .sort((a, b) => Tasks.dueKey(a).localeCompare(Tasks.dueKey(b)));
    $('#planner-summary').innerHTML = `<div class="card"><div class="card-head"><h3>${esc(Utils.formatLongDate(Utils.todayISO()))}</h3>
      <button class="btn ghost" data-action="add-task" data-date="${Utils.todayISO()}">${Utils.icon('plus', 16)}<span>Add task for today</span></button></div>
      <div class="mini-stats"><div><strong>${t.total}</strong><span>Today's tasks</span></div><div><strong>${t.done}</strong><span>Completed</span></div>
      <div><strong>${t.pending}</strong><span>Pending</span></div><div><strong>${t.pct}%</strong><span>Daily progress</span></div></div>
      <div class="bar big-bar" role="progressbar" aria-valuenow="${t.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${t.pct}%;background:var(--green)"></span></div></div>`;
    $('#planner-overdue').innerHTML = taskBlock('Overdue, catch up', overdue, 'overdue-card');
    const pending = t.list.filter((x) => x.status === 'Pending');
    const done = t.list.filter((x) => x.status === 'Completed');
    $('#planner-pending').innerHTML = t.total
      ? taskBlock('Pending today', pending) || '<div class="card"><p class="muted">Everything planned for today is done. Nice work.</p></div>'
      : `<div class="card">${Utils.emptyState('A free day', 'Nothing is due today. Add a task, or get ahead on something coming up.', `<button class="btn primary" data-action="add-task" data-date="${Utils.todayISO()}">Add task for today</button>`)}</div>`;
    $('#planner-done').innerHTML = taskBlock('Completed today', done);
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    $('#setting-name').value = Store.data.settings.userName;
    $('#btn-clear-sample').disabled = !(Store.data.tasks.some((t) => t.sample) || Store.data.subjects.some((s) => s.sample));
  }

  /* ---------- Render everything ---------- */
  function renderAll() {
    Tasks.refreshFilterOptions();
    renderDashboard(); Subjects.render(); Tasks.renderList(); renderPlanner();
    Calendar.render(); Progress.render(); renderSettings();
    const pending = Store.data.tasks.filter((t) => t.status === 'Pending').length;
    const badge = $('#nav-pending'); badge.textContent = pending; badge.hidden = pending === 0;
  }

  /* ---------- Click handling (one listener for every data-action button) ---------- */
  async function handleAction(el) {
    const { action, id, date, view } = el.dataset;
    switch (action) {
      case 'goto': goto(view); break;
      case 'add-task': Tasks.openForm({ date }); break;
      case 'edit-task': Tasks.openForm({ task: Store.getTask(id) }); break;
      case 'delete-task': await Tasks.remove(id); break;
      case 'toggle-task': Tasks.toggle(id); break;
      case 'add-subject': Subjects.openForm(); break;
      case 'edit-subject': Subjects.openForm(Store.getSubject(id)); break;
      case 'delete-subject': await Subjects.remove(id); break;
      case 'view-subject-tasks': Tasks.setSubjectFilter(id); renderAll(); goto('tasks'); break;
      case 'reset-filters': Tasks.resetFilters(); break;
      case 'cal-prev': Calendar.shift(-1); break;
      case 'cal-next': Calendar.shift(1); break;
      case 'cal-today': Calendar.goToday(); break;
      case 'cal-day': Calendar.select(date); break;
      case 'toggle-theme': toggleTheme(); break;
      case 'open-sidebar': document.body.classList.add('sidebar-open'); break;
      case 'close-sidebar': document.body.classList.remove('sidebar-open'); break;
      case 'export-csv': Tasks.exportCSV(); break;
      case 'load-sample':
        Store.addSampleData(); Store.save(); renderAll(); Utils.toast('Sample subjects and tasks added.'); break;
      case 'clear-sample': {
        const removed = Store.clearSampleData(); Store.save(); renderAll();
        Utils.toast(removed ? 'Sample data cleared.' : 'No sample data to clear.'); break;
      }
      case 'clear-all':
        if (await Utils.confirmDialog({ title: 'Clear all data?', message: 'This deletes every subject and task. Your name and theme are kept. This cannot be undone.', confirmText: 'Clear all data' })) {
          Store.clearAll(); Store.save(); Tasks.resetFilters(); renderAll(); Utils.toast('All data cleared.');
        }
        break;
      default: break;
    }
  }

  function init() {
    Store.load();
    Utils.hydrateIcons();
    Subjects.init(); Tasks.init();
    applyTheme();

    document.addEventListener('click', (e) => {
      const nav = e.target.closest('.nav-item[data-view]');
      if (nav) { goto(nav.dataset.view); return; }
      const closer = e.target.closest('[data-close]');
      if (closer) { closer.closest('dialog').close(); return; }
      const el = e.target.closest('[data-action]');
      if (el) handleAction(el);
    });
    $$('dialog').forEach((dlg) => dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); })); // click on backdrop
    $('#setting-name').addEventListener('change', (e) => {
      Store.data.settings.userName = e.target.value.trim().slice(0, 30);
      Store.save(); renderAll(); Utils.toast('Name saved.');
    });
    window.addEventListener('hashchange', () => showView(location.hash.slice(1)));

    renderAll();
    showView(location.hash.slice(1));
  }

  document.addEventListener('DOMContentLoaded', init);
  return { renderAll, goto, showView };
})();
