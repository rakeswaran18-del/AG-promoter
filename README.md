# AG Promoters — Full Stack

This version keeps the supplied AG Promoters design and hero video, but replaces browser-only localStorage with a real Flask API + SQLite database. No Node/npm is required.

## Included
- Existing responsive AG Promoters public website
- Autoplay/muted/loop hero video
- Real database-backed properties
- Public customer enquiry form stored in database
- Admin login with server-side session
- Admin dashboard
- Add/edit/delete properties
- Enquiry status management
- Website settings stored in database
- Projects read from database
- Dockerfile for Google Cloud Run
- Render deployment file
- Firebase Hosting configuration for static-only use

## 1. Run in VS Code (Windows)
Open this folder in VS Code, then PowerShell:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Open: http://127.0.0.1:5000

Do NOT run `npm install` or `npm start`. This project intentionally does not use Node/npm.

Admin:
- username: admin
- password: admin123

Before giving to a client, set a strong ADMIN_PASSWORD and SECRET_KEY.

## 2. If PowerShell blocks activation
You do not need activation. Use the exact commands above with `.venv\Scripts\python.exe`.

## 3. Database
The local database is created automatically at:
`data/ag_promoters.db`

It is SQLite, so it needs no MySQL/PostgreSQL installation.

## 4. Google Cloud Run
Cloud Run can run the complete Flask application in one service.

1. Create a Google Cloud project.
2. Enable billing/Cloud Run as required by Google.
3. Install Google Cloud CLI.
4. Open this project folder.
5. Run:
   `gcloud auth login`
6. Select the project:
   `gcloud config set project YOUR_PROJECT_ID`
7. Deploy:
   `gcloud run deploy ag-promoters --source . --region asia-south1 --allow-unauthenticated --set-env-vars ADMIN_USERNAME=admin,ADMIN_PASSWORD=CHANGE_THIS,SECRET_KEY=CHANGE_THIS_LONG_SECRET`
8. Google gives you a public HTTPS Cloud Run URL.

Important: Cloud Run is pay-per-use with a no-cost tier, but Google Cloud billing is required for Cloud Run. The SQLite file inside a Cloud Run container is NOT a production persistent database. For a real client deployment, replace SQLite with a managed PostgreSQL/Cloud SQL database using a DATABASE_URL/Cloud SQL setup.

## 5. Easiest free demo hosting
Render can deploy Python/Flask web services for free. Push this folder to GitHub, create a Render Web Service, select the repository, choose Free, and use:
Build: `pip install -r requirements.txt`
Start: `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120 app:app`

Free Render services sleep after inactivity and their local filesystem is ephemeral. Therefore this is suitable for a demo, not permanent client data storage.

## 6. Firebase Hosting
Firebase Hosting is excellent for static files, but this project is full-stack. If you use Firebase Hosting, the Flask API still needs Cloud Run or another backend. The included firebase.json is only for the static frontend scenario.

## Client handover checklist
- Change admin password.
- Change phone, WhatsApp number and email in the admin Settings page.
- Replace sample property/project images with client-approved images.
- Test enquiry from a phone.
- Test admin login.
- Test Add/Edit/Delete property.
- Test mobile layout.
- Configure a persistent production database before storing important client data.

## Architecture
Browser -> Flask routes -> SQLite database
Browser -> /api/properties
Browser -> /api/enquiries
Browser -> /api/login
Browser -> /api/settings
Browser -> /api/projects
