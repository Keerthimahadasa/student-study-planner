/* progress.js - every statistic is calculated from the real task list (nothing is hard-coded). */
const Progress = (() => {
  const { $, esc, percent } = Utils;

  function overall() {
    const tasks = Store.data.tasks;
    const done = tasks.filter((t) => t.status === 'Completed').length;
    return { total: tasks.length, done, pending: tasks.length - done, pct: percent(done, tasks.length) };
  }

  /* Tasks due today. Overdue tasks from earlier days are listed separately by the planner. */
  function today() {
    const iso = Utils.todayISO();
    const list = Store.data.tasks.filter((t) => t.dueDate === iso).sort((a, b) => Tasks.dueKey(a).localeCompare(Tasks.dueKey(b)));
    const done = list.filter((t) => t.status === 'Completed').length;
    return { list, total: list.length, done, pending: list.length - done, pct: percent(done, list.length) };
  }

  function bySubject() {
    return Store.data.subjects.map((s) => { const c = Subjects.counts(s.id); return { subject: s, ...c, pct: percent(c.done, c.total) }; });
  }

  /* Monday to Sunday of the current week: tasks due per day and how many are finished. */
  function week() {
    const todayText = Utils.todayISO();
    const offset = (Utils.parseISO(todayText).getDay() + 6) % 7;
    const monday = Utils.addDays(todayText, -offset);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const iso = Utils.addDays(monday, i);
      const list = Store.data.tasks.filter((t) => t.dueDate === iso);
      days.push({ iso, total: list.length, done: list.filter((t) => t.status === 'Completed').length, isToday: iso === todayText });
    }
    const total = days.reduce((n, d) => n + d.total, 0);
    const done = days.reduce((n, d) => n + d.done, 0);
    return { days, total, done, pct: percent(done, total) };
  }

  /* Productivity is based on the day each task was marked completed. */
  function productivity() {
    const todayText = Utils.todayISO();
    const doneOn = (iso) => Store.data.tasks.filter((t) => t.status === 'Completed' && t.completedOn === iso).length;
    const last7 = [];
    for (let i = 0; i < 7; i++) { const iso = Utils.addDays(todayText, -i); last7.push({ iso, count: doneOn(iso) }); }
    const sum = last7.reduce((n, d) => n + d.count, 0);
    const best = last7.reduce((a, b) => (b.count > a.count ? b : a), last7[0]);
    let streak = 0;
    let cursor = doneOn(todayText) > 0 ? todayText : Utils.addDays(todayText, -1);
    while (doneOn(cursor) > 0) { streak++; cursor = Utils.addDays(cursor, -1); }
    return {
      completedToday: last7[0].count, last7: sum, average: (sum / 7).toFixed(1), streak,
      bestDay: best.count ? `${Utils.parseISO(best.iso).toLocaleDateString(undefined, { weekday: 'long' })} (${best.count})` : 'None yet'
    };
  }

  const barRow = (label, color, done, total) => {
    const pct = percent(done, total);
    return `<div class="bar-row"><div class="bar-label"><span>${label}</span><span class="muted">${done}/${total} (${pct}%)</span></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%;background:${esc(color)}"></span></div></div>`;
  };

  function render() {
    const o = overall();
    $('#progress-overall').innerHTML = `<div class="card-head"><h3>Overall completion</h3></div>
      <div class="ring-row"><div class="ring" style="--p:${o.pct}"><span>${o.pct}%</span></div>
      <ul class="plain-list"><li><strong>${o.done}</strong> completed</li><li><strong>${o.pending}</strong> pending</li><li><strong>${o.total}</strong> total tasks</li></ul></div>`;

    const p = productivity();
    $('#progress-prod').innerHTML = `<div class="card-head"><h3>Daily productivity</h3></div>
      <dl class="facts"><div><dt>Completed today</dt><dd>${p.completedToday}</dd></div><div><dt>Completed in last 7 days</dt><dd>${p.last7}</dd></div>
      <div><dt>Average per day</dt><dd>${p.average}</dd></div><div><dt>Day streak</dt><dd>${p.streak}</dd></div>
      <div class="wide"><dt>Most productive day (last 7 days)</dt><dd>${esc(p.bestDay)}</dd></div></dl>`;

    const w = week();
    const max = Math.max(1, ...w.days.map((d) => d.total));
    $('#progress-week').innerHTML = `<div class="week">${w.days.map((d) => {
      const name = Utils.parseISO(d.iso).toLocaleDateString(undefined, { weekday: 'short' });
      const height = d.total ? Math.max(8, (d.total / max) * 100) : 0;
      return `<div class="week-col ${d.isToday ? 'is-today' : ''}"><div class="week-track"><div class="week-bar ${d.total ? '' : 'empty'}" style="height:${height}%"><div class="week-fill" style="height:${percent(d.done, d.total)}%"></div></div></div>
        <span class="week-name">${name}</span><span class="week-count muted">${d.done}/${d.total}</span></div>`;
    }).join('')}</div>
    <p class="muted">${w.total ? `${w.done} of ${w.total} tasks due this week are completed (${w.pct}%).` : 'No tasks are due this week.'}</p>`;

    const rows = bySubject();
    $('#progress-subjects').innerHTML = rows.length
      ? rows.map((r) => barRow(`${esc(r.subject.icon)} ${esc(r.subject.name)}`, r.subject.color, r.done, r.total)).join('')
      : Utils.emptyState('No subjects yet', 'Add a subject and some tasks to see progress by subject.');
  }

  return { overall, today, bySubject, week, productivity, barRow, render };
})();
