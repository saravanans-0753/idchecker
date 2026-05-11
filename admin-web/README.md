# Admin Web Uploader (Rows + Photos)

This module gives admins a web page to:
1. Paste resident rows from local Excel.
2. Pick resident photos from a local folder.
3. Append rows into Google Sheet.
4. Replace the Drive ZIP file that the mobile app downloads during sync.

## Files

- `admin-web/index.html`: Static admin page (host in repository / GitHub Pages / local file).
- `admin-web/apps-script/Code.gs`: Google Apps Script backend.

## Data Columns Used

The uploader normalizes to exactly these columns:

1. `Name`
2. `flat number`
3. `Valid From`
4. `ValidTill`
5. `Aadhar/SRMID`
6. `Moblie`
7. `ID`

## Setup Steps

## 1. Create Apps Script

1. Open `https://script.google.com` and create a new project.
2. Replace default code with `admin-web/apps-script/Code.gs`.
3. Save project.

## 2. Enable Drive Advanced Service

1. In Apps Script editor, go to `Services`.
2. Add `Drive API` (Advanced Google Service).
3. Ensure Google Cloud Drive API is enabled for this project if prompted.

This is required so ZIP file content can be replaced while keeping the same Drive file ID.

## 3. Optional Security Token

If you want a token check:

1. In Apps Script, open `Project Settings`.
2. Add Script Property:
   - Key: `ADMIN_UPLOAD_TOKEN`
   - Value: your secret token.
3. In admin page, enter this same token in `Upload Token` field.

If `ADMIN_UPLOAD_TOKEN` is not set, token validation is skipped.

## 4. Deploy Web App

1. Click `Deploy` -> `New deployment`.
2. Type: `Web app`.
3. Execute as: `Me`.
4. Who has access: `Anyone` (or your org users if suitable).
5. Deploy and copy the web app URL.

## 5. Use Admin Page

1. Open `admin-web/index.html` in browser or host it via GitHub Pages.
2. Fill:
   - Apps Script Web App URL
   - Spreadsheet ID
   - Sheet name (example: `Residents`)
   - Drive ZIP File ID (current app uses `15puDxEMC5RrvxHbDugZPn1XWNSLmwIH6`)
3. Paste rows from Excel.
4. Select photo folder (or files).
5. Click `Push Rows + Replace Drive ZIP`.

## Photo Naming Rule

Keep photo file names as resident ID, for example:

- `5124.jpg`
- `6717.png`

The mobile app sync attaches photos by resident ID from the downloaded ZIP.

## Notes

- Row upload appends only new pasted rows. It does not delete old rows.
- ZIP replacement updates the same Drive file ID, so app sync URL stays unchanged.
- For very large photo sets, split uploads into batches.
