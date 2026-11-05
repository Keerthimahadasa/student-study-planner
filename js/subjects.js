/* subjects.js - add, edit, delete and display subjects. */
const Subjects = (() => {
  const { $, esc } = Utils;
  const ICONS = ['📘', '📐', '💻', '🧪', '🌍', '🎨', '⚙️', '📊', '🧠', '📝', '🎵', '⚡'];
  const COLORS = ['#5B8DEF', '#8B7FE8', '#F26B5B', '#F5A524', '#2FB67C', '#E86BA8', '#3FB8D9', '#8A94A6'];
  const draft = { color: COLORS[0], icon: ICONS[0] };

  function counts(subjectId) {
    const list = Store.data.tasks.filter((t) => t.subjectId === subjectId);
    const done = list.filter((t) => t.status === 'Completed').length;
    return { total: list.length, done, pending: list.length - done };
  }

  const nameTaken = (name, exceptId) =>
    Store.data.subjects.some((s) => s.id !== exceptId && s.name.toLowerCase() === name.toLowerCase());

  function validate(form, editingId) {
    if (!form.name) return 'Enter a subject name.';
    if (nameTaken(form.name, editingId)) return `A subject named "${form.name}" already exists. Choose a different name.`;
    return null;
  }

  function drawPickers() {
    $('#subject-swatches').innerHTML = COLORS.map((c) =>
      `<button type="button" class="swatch ${c.toLowerCase() === draft.color.toLowerCase() ? 'selected' : ''}" style="background:${c}" data-color="${c}" aria-label="Colour ${c}"></button>`).join('');
    $('#subject-icons').innerHTML = ICONS.map((i) =>
      `<button type="button" class="icon-choice ${i === draft.icon ? 'selected' : ''}" data-icon-choice="${i}" aria-label="Icon ${i}">${i}</button>`).join('');
    $('#subject-color').value = draft.color;
  }

  function openForm(subject) {
    $('#subject-dialog-title').textContent = subject ? 'Edit subject' : 'Add subject';
    $('#subject-id').value = subject ? subject.id : '';
    $('#subject-name').value = subject ? subject.name : '';
    $('#subject-code').value = subject ? subject.code : '';
    $('#subject-desc').value = subject ? subject.description : '';
    draft.color = subject ? subject.color : COLORS[Store.data.subjects.length % COLORS.length];
    draft.icon = subject ? subject.icon : ICONS[0];
    $('#subject-error').hidden = true;
    drawPickers();
    $('#subject-dialog').showModal();
    $('#subject-name').focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const id = $('#subject-id').value;
    const form = {
      name: $('#subject-name').value.trim(), code: $('#subject-code').value.trim(),
      description: $('#subject-desc').value.trim(), color: draft.color, icon: draft.icon
    };
    const problem = validate(form, id);
    if (problem) { const box = $('#subject-error'); box.textContent = problem; box.hidden = false; return; }
    if (id) {
      Object.assign(Store.getSubject(id), form, { sample: false });
    } else {
      Store.data.subjects.push({ id: Utils.uid(), ...form, sample: false });
    }
    Store.save();
    $('#subject-dialog').close();
    App.renderAll();
    Utils.toast(id ? 'Subject updated.' : 'Subject added.');
  }

  async function remove(id) {
    const subject = Store.getSubject(id);
    if (!subject) return;
    const n = counts(id).total;
    const message = n
      ? `"${subject.name}" has ${n} task${n === 1 ? '' : 's'}. Deleting this subject will also delete ${n === 1 ? 'that task' : 'those tasks'}. This cannot be undone.`
      : `Delete "${subject.name}"? This cannot be undone.`;
    if (!(await Utils.confirmDialog({ title: 'Delete subject?', message, confirmText: 'Delete subject' }))) return;
    Store.data.tasks = Store.data.tasks.filter((t) => t.subjectId !== id);
    Store.data.subjects = Store.data.subjects.filter((s) => s.id !== id);
    Store.save();
    App.renderAll();
    Utils.toast(n ? `Subject deleted along with ${n} task${n === 1 ? '' : 's'}.` : 'Subject deleted.');
  }

  function render() {
    const grid = $('#subject-grid');
    const subjects = Store.data.subjects;
    if (!subjects.length) {
      grid.innerHTML = Utils.emptyState('No subjects yet', 'Add your first subject, then start adding tasks to it.',
        '<button class="btn primary" data-action="add-subject">Add subject</button>');
      return;
    }
    grid.innerHTML = subjects.map((s) => {
      const c = counts(s.id);
      return `<article class="subject-card" style="--c:${esc(s.color)}">
        <div class="subject-top"><span class="subject-icon">${esc(s.icon)}</span>
          <div><h3>${esc(s.name)}</h3>${s.code ? `<span class="muted small">${esc(s.code)}</span>` : ''}</div></div>
        ${s.description ? `<p class="muted subject-desc">${esc(s.description)}</p>` : ''}
        <p class="subject-count"><strong>${c.total}</strong> task${c.total === 1 ? '' : 's'} (${c.pending} pending, ${c.done} done)</p>
        <div class="subject-actions">
          <button class="btn ghost small-btn" data-action="view-subject-tasks" data-id="${esc(s.id)}">View tasks</button>
          <button class="icon-btn" data-action="edit-subject" data-id="${esc(s.id)}" aria-label="Edit ${esc(s.name)}">${Utils.icon('edit', 16)}</button>
          <button class="icon-btn danger-text" data-action="delete-subject" data-id="${esc(s.id)}" aria-label="Delete ${esc(s.name)}">${Utils.icon('trash', 16)}</button>
        </div></article>`;
    }).join('');
  }

  function init() {
    $('#subject-form').addEventListener('submit', handleSubmit);
    $('#subject-swatches').addEventListener('click', (e) => {
      const b = e.target.closest('[data-color]'); if (!b) return;
      draft.color = b.dataset.color; drawPickers();
    });
    $('#subject-icons').addEventListener('click', (e) => {
      const b = e.target.closest('[data-icon-choice]'); if (!b) return;
      draft.icon = b.dataset.iconChoice; drawPickers();
    });
    $('#subject-color').addEventListener('input', (e) => {
      draft.color = e.target.value;
      document.querySelectorAll('#subject-swatches .swatch').forEach((s) => s.classList.remove('selected'));
    });
  }

  return { init, render, openForm, remove, counts, validate };
})();
