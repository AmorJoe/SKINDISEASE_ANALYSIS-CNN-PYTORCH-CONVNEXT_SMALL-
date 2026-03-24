# SkinScan — AI-Powered Skin Disease Detection

SkinScan is a full-stack web application that uses deep learning (CNN) to detect skin diseases from uploaded images. It features user authentication, scan history, doctor consultations, AI chatbot, and an admin dashboard.

## 🧬 Features

- **AI Skin Analysis** — Upload skin images for CNN-based disease classification
- **Body Map** — Interactive body map to mark affected areas
- **Scan History** — Track past scans with detailed reports
- **Doctor Module** — Doctor registration, appointment booking, and report sharing
- **AI Chatbot** — Gemini-powered chatbot for skin health guidance
- **Admin Dashboard** — Full admin panel for user/doctor/system management
- **Billing & Invoicing** — Invoice generation and billing management
- **PWA Support** — Installable as a Progressive Web App
- **Notifications** — Real-time notification system

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML, CSS, JavaScript (Vanilla) |
| **Backend** | Django + Django REST Framework |
| **Database** | PostgreSQL (Supabase) |
| **ML Model** | PyTorch CNN (custom trained) |
| **AI Chatbot** | Google Gemini API |
| **Auth** | JWT (JSON Web Tokens) |
| **Storage** | Supabase Storage |

## 📁 Project Structure

```
FIREBASE/
├── index.html              # Landing page
├── login.html/css/js       # User authentication
├── dashboard.html/css/js   # Main user dashboard
├── body-map.html/css       # Interactive body map
├── report.html/css/js      # Scan report viewer
├── settings.html           # User settings
├── disease-info.html       # Disease information page
├── doctor-login.*          # Doctor authentication
├── doctor-dashboard.*      # Doctor panel
├── doctor-appointment.*    # Appointment booking
├── doctor-printable-report.* # Printable report
├── admin-login.*           # Admin authentication
├── admin.*                 # Admin dashboard
├── script.js               # Core application logic
├── style.css               # Global styles
├── sw.js                   # Service worker (PWA)
├── manifest.json           # PWA manifest
├── start_server.ps1        # Server startup script
│
├── skinscan-backend/       # Django backend
│   ├── authentication/     # User/Doctor auth & profiles
│   ├── prediction/         # ML prediction & scan history
│   ├── chatbot/            # AI chatbot module
│   ├── billing/            # Invoice & billing
│   ├── admin_module/       # Admin management
│   ├── skinscan/           # Django project settings
│   ├── ml_models/          # Trained CNN models (.pth)
│   ├── manage.py
│   └── requirements.txt
│
└── docs/                   # Documentation & diagrams
```

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- PostgreSQL (or Supabase account)
- Google Gemini API key

### Backend Setup

```bash
cd skinscan-backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file (see `.env.example` for reference):
```env
DATABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_key
JWT_SECRET_KEY=your_jwt_secret
```

Run migrations and start server:
```bash
python manage.py migrate
python manage.py runserver
```

### Frontend
Open `index.html` in a browser or serve via any static file server. Update API URLs in `script.js` if needed.

## 📄 License

This project was built as a college project for academic purposes.

## 👥 Team

Built with ❤️ by the SkinScan team.
