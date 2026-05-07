# 👕 LaundryPress — Smart Laundry Tracker

A beautiful, responsive web app to track laundry items given to your laundry person and verify everything is returned.

## ✨ Features

- Add laundry batches with items (shirts, pants, sarees, etc.)
- Set dates given & expected return date
- Mark items as returned — individually or all at once
- Progress bar for each batch
- Overdue detection
- Filter by All / Pending / Partial / Completed
- Syncs to **Google Sheets** (cloud backup across all devices)
- Offline fallback via `localStorage`
- Fully responsive dark UI

## 🗂️ Files

| File | Description |
|---|---|
| `index.html` | App structure |
| `style.css` | All styles |
| `app.js` | App logic + Google Sheets API |
| `Code.gs` | Google Apps Script backend (paste into Apps Script editor) |

## 🚀 Setup Google Sheets Sync

1. Create a Google Sheet → Extensions → Apps Script
2. Paste contents of `Code.gs` → Save
3. Deploy → New Deployment → Web App → Anyone can access
4. Copy the Web App URL and paste it into `app.js`:
   ```js
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
   ```

## 🌐 Live Demo

Deployed on GitHub Pages — [View Live](#)

## 📄 License

MIT
