# Student Study Planner

A responsive productivity web app that helps students organise subjects, schedule study tasks, track deadlines and monitor daily progress. Built with plain HTML, CSS and JavaScript. No frameworks, no backend, no build step.

## Problem Statement

Students juggle many subjects, assignments and exam dates at once. Notes scattered across chats, notebooks and memory lead to missed deadlines and last-minute stress. This project gives students one place to plan, prioritise and see how much they have actually finished.

## Objectives

- Let students create subjects and attach tasks with priorities and deadlines.
- Show what is due today, what is coming up and what is overdue.
- Turn real task data into progress statistics (daily, weekly, per subject).
- Keep all data in the browser so the app works offline with zero setup.
- Practise clean, modular, beginner-friendly vanilla JavaScript.

## Features

- **Dashboard**: greeting, current date, summary cards, today's progress ring, upcoming deadlines, recent tasks, subject overview, quick add button.
- **Subjects**: add, edit, delete; name, optional code and description, colour, icon; duplicate names blocked; task counts per subject; deleting a subject warns you and removes its tasks.
- **Tasks**: title, subject, description, priority, due date, optional time, status; add, edit, delete, complete and un-complete; search by title; filter by subject, priority and status (including overdue); sort by deadline or priority.
- **Daily Planner**: today's tasks, pending and completed lists, daily completion percentage, an overdue "catch up" list and a friendly empty state.
- **Calendar**: monthly view (Monday first), today highlighted, priority-coloured dots, overdue days highlighted, month navigation, click a date to see and add its tasks.
- **Progress**: overall completion, subject-wise bars, weekly chart (Monday to Sunday), daily productivity (completed today, 7-day total and average, best day, streak). Everything is calculated from your data.
- **Deadlines**: sorted by due date and labelled Due today, Due tomorrow, Due in N days or Overdue.
- **Extras**: dark and light mode, toast notifications, delete confirmations, mobile navigation, CSV export, sample data with a "Clear sample data" option, "Clear all data" with confirmation.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, Grid, Flexbox, media queries) |
| Logic | Vanilla JavaScript (ES6+) |
| Storage | Browser LocalStorage |
| Icons | Inline SVG (works offline, no CDN) |

## Screenshots

> Add your own screenshots to `assets/images/` and update the paths below.

| Dashboard | Calendar |
|-----------|----------|
| ![Dashboard](assets/images/dashboard.png) | ![Calendar](assets/images/calendar.png) |

| Progress | Mobile |
|----------|--------|
| ![Progress](assets/images/progress.png) | ![Mobile view](assets/images/mobile.png) |

## Project Structure

```
student-study-planner/
├── index.html          # All screens and dialogs
├── css/
│   ├── style.css       # Theme, layout and components
│   └── responsive.css  # Tablet and mobile rules
├── js/
│   ├── utils.js        # Dates, icons, toasts, confirm dialog, helpers
│   ├── storage.js      # LocalStorage load/save, validation, sample data
│   ├── subjects.js     # Subject CRUD and rendering
│   ├── tasks.js        # Task CRUD, filters, sorting, CSV export
│   ├── progress.js     # Statistics and progress screen
│   ├── calendar.js     # Monthly calendar
│   └── app.js          # Startup, navigation, theme, dashboard, planner, settings
├── assets/images/      # Screenshots go here
├── README.md
└── .gitignore
```

## Installation and Running

1. Download or clone the repository and extract it.
2. Open the `student-study-planner` folder in VS Code (optional).
3. Double-click `index.html` to open it in any modern browser.

Optional: install the **Live Server** extension in VS Code, right-click `index.html` and choose **Open with Live Server**. No npm packages are needed.

## How LocalStorage Works

LocalStorage is a small key-value store inside your browser. This app saves everything as one JSON string under the key `studyPlanner.v1`:

```json
{ "subjects": [...], "tasks": [...], "settings": { "theme": "light", "userName": "", "sampleHandled": true } }
```

- Every change calls `Store.save()`, so data survives refreshes and restarts.
- On startup `Store.load()` reads the JSON and passes it through `sanitize()`, which repairs bad fields and drops broken records, so edited or corrupted data cannot crash the app. Unreadable data is backed up under `studyPlanner.v1.corrupt`.
- Sample data is added only on the very first visit. The `sampleHandled` flag stops it from returning after you clear it.
- Data stays on your device and is per browser and per site. Clearing browser data erases it. Use **Export CSV** for a backup of your tasks.

## Future Enhancements

- Reminders and browser notifications
- Pomodoro focus timer linked to tasks
- Recurring tasks and exam countdowns
- Import from CSV and full JSON backup
- Drag-and-drop on the calendar
- Installable PWA with offline cache
- Optional cloud sync

## Author

**Your Name**
GitHub: [@your-username](https://github.com/your-username)
LinkedIn: [your-profile](https://linkedin.com/in/your-profile)

## License

MIT. Free to use for learning and portfolios.
