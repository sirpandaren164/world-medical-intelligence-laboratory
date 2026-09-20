# Hormone Therapy & Healthy Aging eLearning Program — Deployment Guide

This folder is ready to publish as a static **GitHub Pages** site.

## Included
- `index.html` — course dashboard and learner profile
- `course.html` — Modules 1–8, 54 lessons, 331 learning screens
- `exam.html` — randomized 25-question Final Assessment, pass mark 80%
- `certificate.html` — dynamic Certificate of Completion with Certificate ID + QR verification link + PDF export
- `verify.html` — certificate verification page
- `certificates.json` — optional public static certificate registry
- `app/` — shared UI, progress logic, and question bank
- `assets/` — course learning assets

## GitHub Pages deployment
1. Create a GitHub repository.
2. Upload **the contents of this folder** to the repository root (do not upload the outer ZIP as the site root).
3. Commit and push to `main`.
4. In GitHub: **Settings → Pages → Deploy from a branch → main / root**.
5. Open the generated GitHub Pages URL. The QR on certificates will automatically point to that deployed site's `verify.html?id=...` URL.

## Completion logic
- A learning screen is counted as visited when it is displayed in `course.html`.
- Legacy progress from the prior eLearning build is imported from the saved last-page state in the browser.
- Final Exam unlocks at **100% (331/331 screens)**.
- The exam randomly selects **25 questions** from a 32-question bank and distributes questions across all 8 modules.
- Passing score: **≥80%**.
- Certificate unlocks after course completion + exam pass.

## Certificate PDF
`certificate.html` uses browser-side `html2canvas` + `jsPDF` from public CDNs for one-click PDF download, with **Print / Save as PDF** as a fallback.

## QR verification modes
### 1) Local testing
A certificate generated in a browser can be verified on the same browser using localStorage.

### 2) Static public registry
Add issued certificate records to `certificates.json`, for example:
```json
[
  {
    "id": "WMC-HORM-2026-ABC12345",
    "name": "Example Learner",
    "score": 92,
    "issuedAt": "2026-09-19T07:00:00.000Z"
  }
]
```
After committing the updated file to GitHub, `verify.html` will show **Verified · Public Registry**.

### 3) Recommended production verification
For automatic issuance and true cross-device verification, replace the static registry adapter with a backend such as **Supabase**. Recommended table fields:
- `certificate_id` (unique)
- `learner_name`
- `email` (optional)
- `score`
- `issued_at`
- `course_version`
- `status` (`valid` / `revoked`)
- `record_hash`

## Important static-site limitation
GitHub Pages cannot securely write certificate records by itself. `certificates.json` is read-only at runtime. Use Supabase or another backend if certificates need to be automatically registered, revoked, or verified from any device.

## Privacy
Learner profile, progress, exam results, and locally issued certificate data are stored in the browser's localStorage in this static build. They are not transmitted unless you connect a backend.


## Green & Gold Certificate
The certificate page now uses a WMC green/gold A4 landscape design inspired by the supplied reference. Course title: **Hormone Therapy & Healthy Aging E-Learning Program**. It supports English name plus optional Thai name, Certificate ID, Final Assessment score, QR verification, browser print, and PDF download.


## Certificate signature
- Added embedded authorized signature asset: `assets/branding/signature_asawadech.png`
- Certificate pages updated to render the real signature image instead of a text-styled placeholder.


> หมายเหตุ: ข้อความเกี่ยวกับ deployment/build ถูกนำออกจากหน้าเว็บที่ผู้เรียนมองเห็นแล้ว เอกสารนี้ใช้สำหรับผู้ดูแลระบบเท่านั้น
