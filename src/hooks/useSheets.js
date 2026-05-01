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
    headers.reduce((obj, h, j) => ({ ...obj, [h.trim()]: (row[j] || '').replace(/\\n/g, '\n').trim() }), { _rowIndex: i + 2 })
  );
}

function normalizeDate(str) {
  if (!str) return '';
  str = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m1 = str.match(/(\d{4})[.\s년]+(\d{1,2})[.\s월]+(\d{1,2})/);
  if (m1) return `${m1[1]}-${String(m1[2]).padStart(2,'0')}-${String(m1[3]).padStart(2,'0')}`;
  const m2 = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m2) return `2026-${String(m2[1]).padStart(2,'0')}-${String(m2[2]).padStart(2,'0')}`;
  const m3 = str.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m3) return `${m3[1]}-${String(m3[2]).padStart(2,'0')}-${String(m3[3]).padStart(2,'0')}`;
  return str;
}

function normalizeAdmissionPeriod(str) {
  if (!str) return '';
  const lines = str.split(/[\n\/,]/).map(s=>s.trim()).filter(Boolean);
  return lines.map(line => {
    const parts = line.split(/\s*[~～]\s*/);
    if (parts.length >= 2) {
      const start = normalizeDate(parts[0].trim());
      const end   = normalizeDate(parts[parts.length-1].trim());
      if (start && end) return `${start} ~ ${end}`;
      if (start) return `${start} ~`;
    }
    return line;
  }).join('\n');
}

function normalizePatient(row) {
  return {
    ...row,
    치료경력: row['치료경력'] || row['치료경력(요약)'] || row['치료 경력'] || '',
    신장: row['신장'] || row['신장(cm)'] || '',
    현재체중: row['현재체중'] || row['현재체중(kg)'] || '',
    혈압_입소시: row['혈압_입소시'] || row['혈압(입소시)'] || '',
    혈당_입소시: row['혈당_입소시'] || row['혈당(입소시)'] || '',
    본인연락처: (() => { const v = String(row['본인연락처'] || row['본인 연락처'] || '').replace(/\D/g,''); return v && !v.startsWith('0') ? '0'+v : v; })(),
    보호자이름: row['보호자이름'] || row['보호자 이름'] || '',
    보호자연락처: (() => { const v = String(row['보호자연락처'] || row['보호자 연락처'] || '').replace(/\D/g,''); return v && !v.startsWith('0') ? '0'+v : v; })(),
    보호자관계: row['보호자관계'] || row['보호자 관계'] || '',
    입소기간: normalizeAdmissionPeriod(row['입소기간'] || row['입소 기간'] || ''),
  };
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
  const [data, setData] = useState({ patients: null, inbody: null, consults: null, bp: null, groups: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!SHEET_ID || !API_KEY) {
      console.warn('[Sheets] API 키 또는 시트 ID 없음');
      setLoading(false);
      return;
    }
    try {
      const [patients, inbody, consults, bp, groups] = await Promise.all([
        fetchSheet('입소자'),
        fetchSheet('인바디'),
        fetchSheet('상담내역'),
        fetchSheet('혈당혈압'),
        fetchSheet('기수행사'),
      ]);
      console.log('[Sheets] 로드 성공:', patients.length, '명, 혈당혈압:', bp.length, '건, 기수행사:', groups.length, '건');
      setData({
        patients: patients.map(normalizePatient),
        inbody,
        consults,
        bp: bp.map(normalizeBp),
        groups,
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

  return { ...data, loading, error, reload: load };
}
