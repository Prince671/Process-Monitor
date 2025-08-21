🖥️ Django Process Monitor


A lightweight Process Monitoring System built with Django, Django REST Framework, HTML, CSS, and Vanilla JS.
It automatically fetches and displays the running processes of the host machine in a clean, interactive frontend — no external agent required.
---

## ✨ Features

* 📡 **Live process data** using `psutil` (no need to run a separate agent).
* 🌳 **Interactive tree view** of processes with expandable/collapsible child processes.
* 🔎 **Search/filter** by process name or PID.
* 🔄 **Auto-refresh** with configurable interval.
* 🖱️ **Detect Hostname** button (fetches processes from the current machine).
* 📱 **Responsive UI** with modern styling & smooth animations.

---

## 📂 Project Structure

```
process_monitor/              # Django project root
│
├── manage.py
├── process_monitor/          # Project settings
│   ├── settings.py
│   ├── urls.py
│   └── ...
│
├── monitoring/               # Django app
│   ├── models.py             # (Optional if storing processes in DB)
│   ├── views.py              # API + frontend logic
│   ├── urls.py               # Routes
│   ├── templates/
│   │   └── monitoring/
│   │       └── index.html    # Frontend page
│   └── static/
│       └── monitoring/
│           ├── css/style.css # Styling
│           └── js/processes.js # Frontend logic
│
└── agent/
    |__agent.py
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/django-process-monitor.git
cd django-process-monitor
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate   # Linux / macOS
venv\Scripts\activate      # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

If you don’t have `requirements.txt` yet, you can generate it with:

```bash
pip freeze > requirements.txt
```

### 4. Run migrations

```bash
python manage.py migrate
```

### 5. Start the Django server

```bash
python manage.py runserver
```

---

## ▶️ Usage

1. Open the app in your browser: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
2. Click **Detect** → The app automatically fetches and displays processes running on the host machine.
3. Expand/collapse process trees, search/filter, or enable auto-refresh.

---

📡 API Endpoints

* **POST** /api/processes/collect/ → Collects live processes from the host machine.
* **GET** /api/processes/ → Returns stored process data in JSON.
* **DELETE** /api/processes/clear/ → Clears stored process data from the database (if enabled).

---

## 🛠 Tech Stack

* **Backend:** Django, Django REST Framework
* **Frontend:** Django Templates, HTML, CSS, JavaScript
* **Process Data:** psutil
* **Database:** SQLite (default, only if storing data)

---

## 🚀 Future Enhancements

* Real-time updates with WebSockets
* Process history & trend charts
* Export data (CSV, JSON)
* Multi-host monitoring

---

## 📜 License

This project is licensed under the **MIT License** – feel free to use and modify.

---
