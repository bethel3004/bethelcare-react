import { useState, useEffect } from 'react';

const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const API_KEY  = process.env.REACT_APP_API_KEY;

async function fetchSheet(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${sheetName} 로드 실패: ${res.status}`);
  const json = await res.json();
  const [headers, ...rows] = json.values || [];
  if (!headers) return [];
  return rows.map((row, i) =>
    headers.reduce((obj, h, j) => ({ ...obj, [h.trim()]: (row[j] || '').trim() }), { _rowIndex: i + 2 })
  );
}

function normalizeBp(row) {
  return {
    ...row,
    성명: row['성명'] || '',
    날짜: row['날짜'] || '',
    혈당: row['혈당'] || row['혈당(mg/dL)'] || '',
    혈압수축기: row['혈압수축기'] || row['혈압수축기(mmHg)'] || '',
    혈압이완기: row['혈압이완기'] || row['혈압이완기(mmHg)'] || '',
    비고: row['비고'] || '',
  };
}

export function useSheets() {
  const [data, setData] = useState({ patients: null, inbody: null, consults: null, bp: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!SHEET_ID || !API_KEY) { setLoading(false); return; }
    try {
      const [patients, inbody, consults, bp] = await Promise.all([
        fetchSheet('입소자'),
        fetchSheet('인바디'),
        fetchSheet('상담내역'),
        fetchSheet('혈당혈압'),
      ]);
      console.log('[Sheets] 로드 성공:', patients.length, '명, 혈당혈압:', bp.length, '건');
      setData({ patients, inbody, consults, bp: bp.map(normalizeBp) });
      setError(null);
    } catch (e) {
      console.error('[Sheets] 로드 실패:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { ...data, loading, error };
}
