const WEBHOOK = process.env.REACT_APP_APPS_SCRIPT_URL;

export async function writeToSheet(sheet, action, row, rowIndex) {
  if (!WEBHOOK) {
    console.warn('[Sheets] Apps Script URL 없음 — 로컬만 저장');
    return false;
  }
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, sheet, row, rowIndex }),
      mode: 'no-cors',
    });
    console.log(`[Sheets] ${action} → ${sheet} 완료`);
    return true;
  } catch (e) {
    console.error('[Sheets] 쓰기 실패:', e.message);
    return false;
  }
}

export async function appendToSheet(sheet, row) {
  return writeToSheet(sheet, 'append', row);
}

export async function updateSheet(sheet, rowIndex, row) {
  return writeToSheet(sheet, 'update', row, rowIndex);
}

export async function deleteFromSheet(sheet, rowIndex) {
  return writeToSheet(sheet, 'delete', {}, rowIndex);
}
