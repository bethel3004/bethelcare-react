// Google Sheets API 연동
// 사용법: .env 파일에 REACT_APP_SHEET_ID와 REACT_APP_API_KEY 설정

const SHEET_ID = process.env.REACT_APP_SHEET_ID || 'YOUR_SHEET_ID';
const API_KEY  = process.env.REACT_APP_API_KEY  || 'YOUR_API_KEY';
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;

// 시트에서 데이터 읽기
export async function readSheet(sheetName) {
  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(sheetName)}?key=${API_KEY}`);
    if (!res.ok) throw new Error('Sheet read failed');
    const json = await res.json();
    const [headers, ...rows] = json.values || [];
    return rows.map(row =>
      headers.reduce((obj, h, i) => ({ ...obj, [h]: row[i] || '' }), {})
    );
  } catch (e) {
    console.warn(`[Sheets] ${sheetName} 읽기 실패, 샘플 데이터 사용`);
    return null;
  }
}

// 시트에 행 추가 (Apps Script 웹훅 필요)
export async function appendRow(sheetName, rowData) {
  const WEBHOOK = process.env.REACT_APP_APPS_SCRIPT_URL;
  if (!WEBHOOK) { console.warn('Apps Script URL 없음'); return false; }
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'append', sheet: sheetName, data: rowData }),
      mode: 'no-cors'
    });
    return true;
  } catch (e) { return false; }
}
