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

// 입소기간 날짜 정규화 → YYYY-MM-DD ~ YYYY-MM-DD
function normalizeDate(str) {
  if (!str) return '';
  str = str.trim();
  // YYYY-MM-DD 이미 정상
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // YYYY. M. D 또는 YYYY.M.D
  const m1 = str.match(/(\d{4})[.\s년]+(\d{1,2})[.\s월]+(\d{1,2})/);
  if (m1) return `${m1[1]}-${String(m1[2]).padStart(2,'0')}-${String(m1[3]).padStart(2,'0')}`;
  // M/D (현재 연도)
  const m2 = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m2) return `2026-${String(m2[1]).padStart(2,'0')}-${String(m2[2]).padStart(2,'0')}`;
  // YYYY/MM/DD
  const m3 = str.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m3) return `${m3[1]}-${String(m3[2]).padStart(2,'0')}-${String(m3[3]).padStart(2,'0')}`;
  return str;
}

function normalizeAdmissionPeriod(str) {
  if (!str) return '';
  // 여러 줄 또는 쉼표로 구분된 경우 처리
  const lines = str.split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
  return lines.map(line => {
    // 날짜~날짜 패턴 찾기
    const parts = line.split(/[~～\-－]+(?=\s*\d)/);
    if (parts.length >= 2) {
      const start = normalizeDate(parts[0].trim());
      const end   = normalizeDate(parts[parts.length-1].trim());
      if (start && end) return `${start} ~ ${end}`;
      if (start) return `${start} ~`;
    }
    // 단일 날짜
    const single = normalizeDate(line);
    if (single) return `${single} ~`;
    return line;
  }).join('\n');
}

function normalizePatient(row) {
  return {
    ...row,
    입소기간: normalizeAdmissionPeriod(row['입소기간'] || row['입소 기간'] || ''),
  };
}

// 혈당/혈압 컬럼명 정규화 (구글 시트 컬럼명 → 앱 필드명)
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
  const [data, setData] = useState({
    patients: null, inbody: null, consults: null, bp: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!SHEET_ID || !API_KEY) {
      console.warn('[Sheets] API 키 또는 시트 ID 없음');
      setLoading(false);
      return;
    }
    try {
      const [patients, inbody, consults, bp] = await Promise.all([
        fetchSheet('입소자'),
        fetchSheet('인바디'),
        fetchSheet('상담내역'),
        fetchSheet('혈당혈압'),
      ]);
      console.log('[Sheets] 로드 성공:', patients.length, '명, 혈당혈압:', bp.length, '건');
      setData({
        patients,
        inbody,
        consults,
        bp: bp.map(normalizeBp),
      });
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
