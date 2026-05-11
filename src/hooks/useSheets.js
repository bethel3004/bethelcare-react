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
  const lines = str.split(/\n/).map(s=>s.trim()).filter(Boolean);
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    const parts = line.split(/\s*[~～]\s*/);
    let normalized = line;
    if (parts.length >= 2) {
      const start = normalizeDate(parts[0].trim());
      const end   = normalizeDate(parts[parts.length-1].trim());
      if (start && end) normalized = `${start} ~ ${end}`;
      else if (start)   normalized = `${start} ~`;
    }
    if (!seen.has(normalized)) { seen.add(normalized); result.push(normalized); }
  }
  return result.join('\n');
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

// ── 인바디_상세 시트 정규화 ──────────────────────────────────
// 컬럼: 캠프장소 | 성명 | 성별 | 출생연도 | 신장 | 측정일 | 구분 |
//       체중(kg) | 골격근량(kg) | 체지방량(kg) | 체수분(L) |
//       단백질(kg) | 무기질(kg) | 체지방률(%) | 내장지방레벨 |
//       내장지방면적(cm²) | 복부비만율 | 기초대사량(kcal) |
//       종합점수 | 신체연령 | 체형판정
function normalizeInbody(row) {
  return {
    ...row,
    // 구버전 필드명 호환 (혹시 기존 인바디 시트 데이터 남아있을 경우)
    성명:       row['성명']       || row['이름']     || '',
    측정일:     row['측정일']     || row['날짜']     || '',
    구분:       row['구분']       || '',
    캠프장소:   row['캠프장소']   || '',
    종합점수:   row['종합점수']   || row['점수']     || '',
    신체연령:   row['신체연령']   || row['신체나이'] || '',
    체형판정:   row['체형판정']   || '',
    // 수치 필드 — 시트 컬럼명 그대로 사용
    '체중(kg)':        row['체중(kg)']        || '',
    '골격근량(kg)':    row['골격근량(kg)']    || '',
    '체지방량(kg)':    row['체지방량(kg)']    || '',
    '체수분(L)':       row['체수분(L)']       || '',
    '단백질(kg)':      row['단백질(kg)']      || '',
    '무기질(kg)':      row['무기질(kg)']      || '',
    '체지방률(%)':     row['체지방률(%)']     || '',
    내장지방레벨:      row['내장지방레벨']    || '',
    '내장지방면적(cm²)': row['내장지방면적(cm²)'] || '',
    복부비만율:        row['복부비만율']      || '',
    '기초대사량(kcal)': row['기초대사량(kcal)'] || '',
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
        fetchSheet('인바디_상세'),   // ← '인바디' → '인바디_상세' 변경
        fetchSheet('상담내역'),
        fetchSheet('혈당혈압'),
        fetchSheet('기수행사'),
      ]);
      console.log('[Sheets] 로드 성공:', patients.length, '명, 인바디:', inbody.length, '건');
      setData({
        patients: patients.map(normalizePatient),
        inbody:   inbody.map(normalizeInbody),   // ← 정규화 추가
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
