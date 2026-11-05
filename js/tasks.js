/* tasks.js - add, edit, delete, filter, sort and display tasks. */
const Tasks = (() => {
  const { $, esc } = Utils;
  const filters = { search: '', subject: 'all', priority: 'all', status: 'all', sort: 'dueAsc' };
  const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

  const dueKey = (t) => `${t.dueDate} ${t.dueTime || '23:59'}`;
  function nowHM() { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; }

  /* A pending task is overdue once its date has passed, or today's due time has passed. */
  function isOverdue(task) {
    if (task.status === 'Completed') return false;
    const today = Utils.todayISO();
    if (task.dueDate < today) return true;
    return task.dueDate === today && !!task.dueTime && task.dueTime < nowHM();
  }

  /* Describes how urgent a task is: { key, label } */
  function dueInfo(task) {
    if (task.status === 'Completed') return { key: 'completed', label: 'Completed' };
    const diff = Utils.daysBetween(Utils.todayISO(), task.dueDate);
    const at = task.dueTime ? ` at ${Utils.formatTime(task.dueTime)}` : '';
    if (isOverdue(task)) return { key: 'overdue', label: diff === 0 ? 'Overdue, time has passed' : `Overdue by ${-diff} day${-diff === 1 ? '' : 's'}` };
    if (diff === 0) return { key: 'today', label: `Due today${at}` };
    if (diff === 1) return { key: 'tomorrow', label: `Due tomorrow${at}` };
    if (diff <= 7) return { key: 'soon', label: `Due in ${diff} days` };
    return { key: 'later', label: `Due in ${diff} days` };
  }

  function validate(form, editingId) {
    if (!form.title) return 'Enter a task title.';
    if (!Store.getSubject(form.subjectId)) return 'Choose a subject for this task.';
    if (!Store.PRIORITIES.includes(form.priority)) return 'Choose a priority.';
    if (!Utils.parseISO(form.dueDate)) return 'Enter a valid due date.';
    if (!Utils.isValidTime(form.dueTime)) return 'Enter a valid due time.';
    const duplicate = Store.data.tasks.some((t) => t.id !== editingId && t.subjectId === form.subjectId &&
      t.dueDate === form.dueDate && t.title.toLowerCase() === form.title.toLowerCase());
    if (duplicate) return 'This subject already has a task with the same title on that date.';
    return null;
  }

  function setStatus(task, status) {
    task.status = status;
    task.completedOn = status === 'Completed' ? Utils.todayISO() : '';
  }

  /* ---------- Filtering, sorting and lists ---------- */
  function getFiltered() {
    const q = filters.search.trim().toLowerCase();
    const list = Store.data.tasks.filter((t) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (filters.subject === 'all' || t.subjectId === filters.subject) &&
      (filters.priority === 'all' || t.priority === filters.priority) &&
      (filters.status === 'all' || (filters.status === 'Overdue' ? isOverdue(t) : t.status === filters.status)));
    const byDue = (a, b) => dueKey(a).localeCompare(dueKey(b));
    const sorters = {
      dueAsc: byDue,
      dueDesc: (a, b) => byDue(b, a),
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b),
      newest: (a, b) => b.createdAt - a.createdAt
    };
    return list.sort(sorters[filters.sort] || byDue);
  }
  const upcoming = (limit) => Store.data.tasks.filter((t) => t.status === 'Pending')
    .sort((a, b) => dueKey(a).localeCompare(dueKey(b))).slice(0, limit);

  /* ---------- HTML for one task row (also used by dashboard, planner, calendar) ---------- */
  function itemHTML(task, opts = {}) {
    const subject = Store.getSubject(task.subjectId) || { name: 'Unknown', color: '#8A94A6', icon: '📘' };
    const info = dueInfo(task);
    const done = task.status === 'Completed';
    const id = esc(task.id);
    return `<li class="task ${done ? 'is-done' : ''} ${info.key === 'overdue' ? 'is-overdue' : ''}" data-priority="${task.priority}">
      <button class="check" data-action="toggle-task" data-id="${id}" role="checkbox" aria-checked="${done}" aria-label="${done ? 'Mark as pending' : 'Mark as completed'}: ${esc(task.title)}">${done ? Utils.icon('check', 14) : ''}</button>
      <div class="task-body">
        <div class="task-title">${esc(task.title)}</div>
        ${task.description && !opts.compact ? `<p class="task-desc">${esc(task.description)}</p>` : ''}
        <div class="task-meta">
          <span class="chip" style="--c:${esc(subject.color)}">${esc(subject.icon)} ${esc(subject.name)}</span>
          <span class="badge pri-${task.priority.toLowerCase()}">${task.priority}</span>
          <span class="due">${Utils.icon('clock', 13)} ${Utils.formatDate(task.dueDate)}${task.dueTime ? ', ' + Utils.formatTime(task.dueTime) : ''}</span>
          <span class="status status-${info.key}">${esc(info.label)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-action="edit-task" data-id="${id}" aria-label="Edit ${esc(task.title)}">${Utils.icon('edit', 16)}</button>
        <button class="icon-btn danger-text" data-action="delete-task" data-id="${id}" aria-label="Delete ${esc(task.title)}">${Utils.icon('trash', 16)}</button>
      </div></li>`;
  }

  function renderList() {
    const list = getFiltered();
    const total = Store.data.tasks.length;
    $('#task-count').textContent = total ? `Showing ${list.length} of ${total} task${total === 1 ? '' : 's'}` : '';
    if (!list.length) {
      $('#task-list').innerHTML = '<li>' + (total
        ? Utils.emptyState('No tasks match these filters', 'Try a different search or reset the filters.', '<button class="btn ghost" data-action="reset-filters">Reset filters</button>')
        : Utils.emptyState('No tasks yet', 'Add a task to start planning your study time.', '<button class="btn primary" data-action="add-task">Add task</button>')) + '</li>';
      return;
    }
    $('#task-list').innerHTML = list.map((t) => itemHTML(t)).join('');
  }

  function refreshFilterOptions() {
    if (filters.subject !== 'all' && !Store.getSubject(filters.subject)) filters.subject = 'all';
    $('#filter-subject').innerHTML = '<option value="all">All subjects</option>' +
      Store.data.subjects.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    $('#filter-subject').value = filters.subject;
  }
  function syncControls() {
    $('#filter-search').value = filters.search;
    $('#filter-priority').value = filters.priority;
    $('#filter-status').value = filters.status;
    $('#filter-sort').value = filters.sort;
    $('#filter-subject').value = filters.subject;
  }
  function setSubjectFilter(id) { filters.subject = id; syncControls(); }
  function resetFilters() {
    Object.assign(filters, { search: '', subject: 'all', priority: 'all', status: 'all', sort: 'dueAsc' });
    syncControls(); renderList();
  }

  /* ---------- Form ---------- */
  function openForm({ task, date } = {}) {
    if (!Store.data.subjects.length) {
      Utils.toast('Add a subject first, then you can create tasks for it.', 'error');
      App.goto('subjects'); Subjects.openForm();
      return;
    }
    $('#task-dialog-title').textContent = task ? 'Edit task' : 'Add task';
    $('#task-id').value = task ? task.id : '';
    $('#task-title').value = task ? task.title : '';
    $('#task-subject').innerHTML = Store.data.subjects.map((s) => `<option value="${esc(s.id)}">${esc(s.icon)} ${esc(s.name)}</option>`).join('');
    const preferred = task ? task.subjectId : (filters.subject !== 'all' ? filters.subject : Store.data.subjects[0].id);
    $('#task-subject').value = preferred;
    $('#task-priority').value = task ? task.priority : 'Medium';
    $('#task-date').value = task ? task.dueDate : (date && Utils.parseISO(date) ? date : Utils.todayISO());
    $('#task-time').value = task ? task.dueTime : '';
    $('#task-status').value = task ? task.status : 'Pending';
    $('#task-desc').value = task ? task.description : '';
    $('#task-error').hidden = true;
    $('#task-dialog').showModal();
    $('#task-title').focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const id = $('#task-id').value;
    const form = {
      title: $('#task-title').value.trim(), subjectId: $('#task-subject').value,
      priority: $('#task-priority').value, dueDate: $('#task-date').value, dueTime: $('#task-time').value,
      status: $('#task-status').value, description: $('#task-desc').value.trim()
    };
    const problem = validate(form, id);
    if (problem) { const box = $('#task-error'); box.textContent = problem; box.hidden = false; return; }
    if (id) {
      const task = Store.getTask(id);
      const { status, ...rest } = form;
      Object.assign(task, rest, { sample: false });
      if (status !== task.status) setStatus(task, status);
    } else {
      const task = { id: Utils.uid(), ...form, completedOn: '', createdAt: Date.now(), sample: false };
      setStatus(task, form.status);
      Store.data.tasks.push(task);
    }
    Store.save();
    $('#task-dialog').close();
    App.renderAll();
    Utils.toast(id ? 'Task updated.' : 'Task added.');
  }

  function toggle(id) {
    const task = Store.getTask(id);
    if (!task) return;
    const done = task.status !== 'Completed';
    setStatus(task, done ? 'Completed' : 'Pending');
    Store.save();
    App.renderAll();
    Utils.toast(done ? 'Task marked as completed.' : 'Task moved back to pending.');
  }

  async function remove(id) {
    const task = Store.getTask(id);
    if (!task) return;
    const ok = await Utils.confirmDialog({ title: 'Delete task?', message: `Delete "${task.title}"? This cannot be undone.`, confirmText: 'Delete task' });
    if (!ok) return;
    Store.data.tasks = Store.data.tasks.filter((t) => t.id !== id);
    Store.save();
    App.renderAll();
    Utils.toast('Task deleted.');
  }

  /* ---------- CSV export ---------- */
  function toCSV() {
    const cell = (value) => {
      let text = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; // stops spreadsheet formula injection
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = [['Title', 'Subject', 'Description', 'Priority', 'Due Date', 'Due Time', 'Status']];
    getSortedForExport().forEach((t) => {
      const s = Store.getSubject(t.subjectId);
      rows.push([t.title, s ? s.name : '', t.description, t.priority, t.dueDate, t.dueTime, t.status]);
    });
    return rows.map((r) => r.map(cell).join(',')).join('\r\n');
  }
  const getSortedForExport = () => Store.data.tasks.slice().sort((a, b) => dueKey(a).localeCompare(dueKey(b)));

  function exportCSV() {
    if (!Store.data.tasks.length) { Utils.toast('There are no tasks to export yet.', 'error'); return; }
    Utils.downloadFile(`study-planner-tasks-${Utils.todayISO()}.csv`, '\uFEFF' + toCSV(), 'text/csv;charset=utf-8');
    Utils.toast('Tasks exported as CSV.');
  }

  function init() {
    $('#task-form').addEventListener('submit', handleSubmit);
    $('#filter-search').addEventListener('input', (e) => { filters.search = e.target.value; renderList(); });
    [['subject', '#filter-subject'], ['priority', '#filter-priority'], ['status', '#filter-status'], ['sort', '#filter-sort']]
      .forEach(([key, selector]) => $(selector).addEventListener('change', (e) => { filters[key] = e.target.value; renderList(); }));
    $('#filter-reset').addEventListener('click', resetFilters);
  }

  return { init, filters, isOverdue, dueInfo, validate, getFiltered, upcoming, itemHTML, renderList,
    refreshFilterOptions, setSubjectFilter, resetFilters, openForm, toggle, remove, toCSV, exportCSV, dueKey };
})();
