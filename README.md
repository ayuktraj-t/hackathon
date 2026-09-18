# PolicyLens 2.0 — Enterprise AI Policy Comparator & Compliance Intelligence

> **Hackathon Problem Statement #20**: Intelligent policy document comparison, entity delta extraction, and strictness risk scoring.

🔗 **Live Demo:** [ADD YOUR VERCEL URL HERE AFTER DEPLOYING]

---

## ⚡ Standout Hackathon Features

1. **1-Click Judge Demo Scenarios**:
   - 🏢 **Corporate HR & Hybrid Work Policy**: Evaluates probation shifts, attendance hurdles, and broadband stipend increments.
   - 🎓 **University Merit Scholarship Policy**: Detects GPA threshold hikes, tuition waiver grants, and grace period cancellations.
   - 💳 **Fintech Micro-Lending Terms**: Flags APR interest shifts, reduced grace periods, and mandatory binding arbitration waivers.
   - ☁️ **Enterprise Cloud SaaS TOS & Privacy**: Identifies telemetry AI model training clauses and shortened data retention windows.

2. **Semantic Category & Risk Severity Engine**:
   - Automatically tags clauses: `💰 Financial`, `⏳ Timeline`, `⚖️ Eligibility`, `🛡️ Legal & Governance`, `📋 Operational`.
   - Assigns severity scores: `🔴 High Risk`, `🟡 Medium Risk`, `🟢 Favorable`, `⚪ Low Risk`.
   - Computes global **Policy Volatility Index (0–100)** and **Strictness Verdict**.

3. **Executive AI Briefing & Actionable Takeaways**, **Multi-View Inspection Modes**, and **Compliance Audit Export** (CSV / print).

---

## 📁 Project Structure (required for Vercel)

Flask expects HTML templates and static assets in specific folders, and your `index.html` already references them via `{{ url_for('static', filename='style.css') }}`. The project must be laid out like this:

```
policylens/
├── api/
│   └── index.py          # Vercel's serverless entry point (imports app.py)
├── templates/
│   └── index.html        # moved here — do not leave it at project root
├── static/
│   ├── app.js             # moved here — do not leave it at project root
│   └── style.css          # moved here — do not leave it at project root
├── app.py                 # all backend logic, unchanged in behavior
├── requirements.txt
├── vercel.json             # tells Vercel how to route requests to Flask
├── .vercelignore
└── README.md
```

---

## 🚀 Deploy to Vercel

1. Push this repo (with the folder structure above) to GitHub.
2. Go to **[vercel.com](https://vercel.com)** → sign in with GitHub.
3. Click **Add New → Project**, import this repository.
4. Vercel auto-detects `vercel.json` — leave the default settings and click **Deploy**.
5. In a minute or two you'll get a live URL like `https://policylens.vercel.app`.
6. Paste that URL into the **Live Demo** line at the top of this README.

### Important notes for Vercel specifically

- **Cold starts, not sleep**: unlike Render's free tier (which sleeps after inactivity), Vercel spins up a fresh serverless instance per request. First request after idle time may take a second or two longer — normal.
- **10-second execution limit** on Vercel's free (Hobby) tier per request. Comparing very large documents (dozens of sections) should be fine; if you start timing out on huge inputs, that's why.
- **No persistent disk**: uploaded files are written to `/tmp` and processed in-memory for the response — nothing survives between requests. This is already handled in `app.py`; don't reintroduce a local `uploads/` folder.
- **`pdfplumber` is a heavier dependency** — first deploy may take a bit longer to build. If it ever exceeds Vercel's function size limit, the fallback is to drop PDF support and accept `.txt`/`.md` only.

### Run locally (for development)

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

Open **[http://127.0.0.1:5001](http://127.0.0.1:5001)**.

---
