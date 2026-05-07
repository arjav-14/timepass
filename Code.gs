// =========================================================
//  LaundryPress — Google Apps Script Backend (Code.gs)
//  Paste this entire file into your Apps Script editor
// =========================================================

const SHEET_NAME = 'Batches';

// ---- Ensure header row exists ----
function ensureHeaders() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'name', 'dateGiven', 'dateExp', 'notes', 'itemsJSON', 'createdAt']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#6c63ff').setFontColor('#ffffff');
  }
  return sheet;
}

// ---- GET — fetch all batches ----
function doGet(e) {
  try {
    const sheet = ensureHeaders();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) return jsonOk([]);

    const rows    = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    const batches = rows
      .filter(r => r[0] !== '')          // skip empty rows
      .map(r => ({
        id:        String(r[0]),
        name:      r[1],
        dateGiven: r[2],
        dateExp:   r[3],
        notes:     r[4],
        items:     safeParseJSON(r[5]),
        createdAt: r[6],
      }));

    // Return newest first
    batches.reverse();
    return jsonOk(batches);

  } catch (err) {
    return jsonError(err.message);
  }
}

// ---- POST — add / update / delete ----
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'add')    return handleAdd(data.batch);
    if (action === 'update') return handleUpdate(data.batch);
    if (action === 'delete') return handleDelete(data.id);

    return jsonError('Unknown action: ' + action);
  } catch (err) {
    return jsonError(err.message);
  }
}

// ---- ADD ----
function handleAdd(batch) {
  const sheet = ensureHeaders();
  sheet.appendRow([
    batch.id,
    batch.name,
    batch.dateGiven || '',
    batch.dateExp   || '',
    batch.notes     || '',
    JSON.stringify(batch.items),
    batch.createdAt || new Date().toISOString(),
  ]);
  return jsonOk({ success: true });
}

// ---- UPDATE ----
function handleUpdate(batch) {
  const sheet   = ensureHeaders();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonError('Batch not found');

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  const idx = ids.indexOf(String(batch.id));

  if (idx === -1) return jsonError('Batch not found: ' + batch.id);

  const rowNum = idx + 2;   // +1 for header, +1 for 1-indexed
  sheet.getRange(rowNum, 1, 1, 7).setValues([[
    batch.id,
    batch.name,
    batch.dateGiven || '',
    batch.dateExp   || '',
    batch.notes     || '',
    JSON.stringify(batch.items),
    batch.createdAt || new Date().toISOString(),
  ]]);
  return jsonOk({ success: true });
}

// ---- DELETE ----
function handleDelete(id) {
  const sheet   = ensureHeaders();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonError('Batch not found');

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  const idx = ids.indexOf(String(id));

  if (idx === -1) return jsonError('Batch not found: ' + id);

  sheet.deleteRow(idx + 2);
  return jsonOk({ success: true });
}

// ---- Helpers ----
function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeParseJSON(str) {
  try { return JSON.parse(str); } catch { return []; }
}
