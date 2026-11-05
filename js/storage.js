/* storage.js - the single place that reads and writes LocalStorage.
   All app data lives in Store.data = { subjects: [], tasks: [], settings: {} }. */
const Store = (() => {
  const KEY = 'studyPlanner.v1';
  const PRIORITIES = ['Low', 'Medium', 'High'];
  let data = emptyData();
  let warnedAboutSaving = false;

  function emptyData() {
    return { subjects: [], tasks: [], settings: { theme: 'light', userName: '', sampleHandled: true } };
  }

  const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

  /* Rebuilds saved data into a safe shape so broken or edited LocalStorage can never crash the app. */
  function sanitize(raw) {
    const out = emptyData();
    if (!raw || typeof raw !== 'object') return out;
    const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    out.settings.theme = s.theme === 'dark' ? 'dark' : 'light';
    out.settings.userName = cleanText(s.userName, 30);
    out.settings.sampleHandled = s.sampleHandled !== false;

    const subjectIds = new Set();
    (Array.isArray(raw.subjects) ? raw.subjects : []).forEach((x) => {
      if (!x || !x.id || !cleanText(x.name, 40) || subjectIds.has(String(x.id))) return;
      subjectIds.add(String(x.id));
      out.subjects.push({
        id: String(x.id), name: cleanText(x.name, 40), code: cleanText(x.code, 12),
        description: cleanText(x.description, 200),
        color: /^#[0-9a-f]{6}$/i.test(x.color) ? x.color : '#5B8DEF',
        icon: cleanText(x.icon, 4) || '📘', sample: x.sample === true
      });
    });

    const taskIds = new Set();
    (Array.isArray(raw.tasks) ? raw.tasks : []).forEach((x) => {
      if (!x || !x.id || taskIds.has(String(x.id)) || !cleanText(x.title, 100)) return;
      if (!subjectIds.has(String(x.subjectId))) return;
      taskIds.add(String(x.id));
      const done = x.status === 'Completed';
      out.tasks.push({
        id: String(x.id), title: cleanText(x.title, 100), subjectId: String(x.subjectId),
        description: cleanText(x.description, 300),
        priority: PRIORITIES.includes(x.priority) ? x.priority : 'Medium',
        dueDate: Utils.parseISO(x.dueDate) ? x.dueDate : Utils.todayISO(),
        dueTime: typeof x.dueTime === 'string' && Utils.isValidTime(x.dueTime) ? x.dueTime : '',
        status: done ? 'Completed' : 'Pending',
        completedOn: done ? (Utils.parseISO(x.completedOn) ? x.completedOn : Utils.todayISO()) : '',
        createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now(),
        sample: x.sample === true
      });
    });
    return out;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      if (!warnedAboutSaving) {
        warnedAboutSaving = true;
        Utils.toast('Could not save to this browser. Changes will be lost when you close the page.', 'error');
      }
      return false;
    }
  }

  function load() {
    let text = null;
    try { text = localStorage.getItem(KEY); } catch (error) { text = null; }
    if (text === null) {            // very first visit: start with sample data
      data = emptyData();
      addSampleData();
      save();
      return;
    }
    try {
      data = sanitize(JSON.parse(text));
    } catch (error) {               // unreadable data: keep a backup copy, start clean (no sample reload)
      try { localStorage.setItem(KEY + '.corrupt', text); } catch (e) { /* ignore */ }
      data = emptyData();
      save();
    }
  }

  /* ---------- Sample data ---------- */
  function addSampleData() {
    const today = Utils.todayISO();
    const day = (n) => Utils.addDays(today, n);
    const subjects = [
      ['Mathematics', 'MA201', 'Calculus, linear algebra and probability', '#5B8DEF', '📐'],
      ['Data Structures', 'CS202', 'Arrays, trees, graphs and complexity', '#8B7FE8', '💻'],
      ['Physics', 'PH101', 'Mechanics, waves and optics', '#F5A524', '🧪'],
      ['English', 'HS105', 'Technical writing and communication', '#2FB67C', '📝']
    ].map(([name, code, description, color, iconText]) => {
      const existing = data.subjects.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      const subject = { id: Utils.uid(), name, code, description, color, icon: iconText, sample: true };
      data.subjects.push(subject);
      return subject;
    });
    // [subject index, title, description, priority, day offset, time, done]
    [
      [0, 'Solve integration problem set', 'Exercises 4.1 to 4.6', 'High', -2, '', false],
      [1, 'Implement binary search tree', 'Insert, search and delete in C++', 'High', 0, '18:00', false],
      [0, 'Revise matrix operations', 'Chapter 3 summary notes', 'Medium', 0, '', true],
      [2, 'Physics lab record', 'Write up the pendulum experiment', 'Medium', 0, '20:00', false],
      [3, 'Read technical article', 'Prepare a short summary', 'Low', 0, '', true],
      [1, 'Graph traversal practice', 'BFS and DFS on five problems', 'Medium', 1, '', false],
      [3, 'Email etiquette presentation', 'Five-minute slide deck', 'Low', 3, '10:00', false],
      [0, 'Probability quiz preparation', 'Revise Bayes theorem', 'High', 4, '', false],
      [2, 'Waves numericals', 'Solve ten problems', 'Medium', 6, '', false],
      [1, 'Complexity analysis worksheet', 'Big-O practice', 'Low', -1, '', true],
      [2, 'Kinematics reading', 'Chapter 2 notes', 'Low', -3, '', true],
      [0, 'Limits worksheet', 'Practice set 2', 'Medium', -2, '', true]
    ].forEach(([index, title, description, priority, offset, time, done], i) => {
      const dueDate = day(offset);
      data.tasks.push({
        id: Utils.uid(), title, description, priority, dueDate, dueTime: time, subjectId: subjects[index].id,
        status: done ? 'Completed' : 'Pending', completedOn: done ? day(Math.min(offset, 0)) : '',
        createdAt: Date.now() - i * 1000, sample: true
      });
    });
    data.settings.sampleHandled = true;
  }

  /* Removes sample tasks. A sample subject is only removed if none of your own tasks use it. */
  function clearSampleData() {
    const before = data.tasks.length;
    data.tasks = data.tasks.filter((t) => !t.sample);
    const used = new Set(data.tasks.map((t) => t.subjectId));
    data.subjects = data.subjects.filter((s) => !s.sample || used.has(s.id));
    data.subjects.forEach((s) => { if (s.sample && used.has(s.id)) s.sample = false; });
    data.settings.sampleHandled = true;
    return before - data.tasks.length;
  }

  function clearAll() {
    data.subjects = [];
    data.tasks = [];
    data.settings.sampleHandled = true; // never bring the samples back by themselves
  }

  return {
    get data() { return data; },
    PRIORITIES, KEY, load, save, sanitize, addSampleData, clearSampleData, clearAll,
    getSubject: (id) => data.subjects.find((s) => s.id === id),
    getTask: (id) => data.tasks.find((t) => t.id === id)
  };
})();
