/* calendar.js - monthly calendar with tasks shown on their deadlines. */
const Calendar = (() => {
  const { $, esc } = Utils;
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const start = new Date();
  let year = start.getFullYear();
  let month = start.getMonth();
  let selected = Utils.todayISO();

  function shift(n) { const d = new Date(year, month + n, 1); year = d.getFullYear(); month = d.getMonth(); render(); }
  function goToday() { const n = new Date(); year = n.getFullYear(); month = n.getMonth(); selected = Utils.todayISO(); render(); }
  function select(iso) {
    if (!Utils.parseISO(iso)) return;
    selected = iso;
    render();
  }

  function render() {
    $('#cal-title').textContent = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    $('#cal-weekdays').innerHTML = WEEKDAYS.map((d) => `<span>${d}</span>`).join('');

    const byDate = {};
    Store.data.tasks.forEach((t) => { (byDate[t.dueDate] = byDate[t.dueDate] || []).push(t); });

    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((lead + daysInMonth) / 7) * 7;
    const today = Utils.todayISO();
    let html = '';
    for (let i = 0; i < cellCount; i++) {
      const date = new Date(year, month, 1 - lead + i);
      const iso = Utils.toISO(date);
      const tasks = (byDate[iso] || []).slice().sort((a, b) => Tasks.dueKey(a).localeCompare(Tasks.dueKey(b)));
      const overdue = tasks.some(Tasks.isOverdue);
      const dots = tasks.slice(0, 3).map((t) => `<i class="dot ${t.status === 'Completed' ? 'done' : 'pri-' + t.priority.toLowerCase()}"></i>`).join('');
      const more = tasks.length > 3 ? `<span class="more">+${tasks.length - 3}</span>` : '';
      const label = `${Utils.formatLongDate(iso)}, ${tasks.length} task${tasks.length === 1 ? '' : 's'}${overdue ? ', has overdue tasks' : ''}`;
      html += `<button class="cal-cell ${date.getMonth() !== month ? 'other' : ''} ${iso === today ? 'today' : ''} ${iso === selected ? 'selected' : ''} ${overdue ? 'has-overdue' : ''}"
        data-action="cal-day" data-date="${iso}" aria-label="${esc(label)}" aria-pressed="${iso === selected}">
        <span class="cal-num">${date.getDate()}</span><span class="cal-dots">${dots}${more}</span></button>`;
    }
    $('#cal-grid').innerHTML = html;

    const list = (byDate[selected] || []).slice().sort((a, b) => Tasks.dueKey(a).localeCompare(Tasks.dueKey(b)));
    $('#cal-details').innerHTML = `<div class="card-head"><h3>${esc(Utils.formatLongDate(selected))}</h3>
      <button class="btn ghost" data-action="add-task" data-date="${selected}">${Utils.icon('plus', 16)}<span>Add task on this day</span></button></div>` +
      (list.length ? `<ul class="tasks">${list.map((t) => Tasks.itemHTML(t)).join('')}</ul>`
        : Utils.emptyState('Nothing scheduled', 'No tasks are due on this date.'));
  }

  return { render, shift, goToday, select };
})();
