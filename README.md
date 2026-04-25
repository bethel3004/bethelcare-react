# 벧엘수양원 BethelCare — React 웹앱

## 배포 방법 (Netlify — 완전 무료)

### 1단계 — GitHub 새 저장소 만들기
1. github.com → "New repository"
2. 이름: `bethelcare-app`
3. Public 선택 → Create

### 2단계 — 이 파일들 업로드
GitHub Desktop으로 이 폴더 전체를 업로드

### 3단계 — Netlify 연결
1. netlify.com → 구글 계정으로 가입
2. "Add new site" → "Import an existing project"
3. GitHub 선택 → bethelcare-app 저장소 선택
4. Build command: `npm run build`
5. Publish directory: `build`
6. "Deploy site" 클릭

→ 자동으로 https://랜덤이름.netlify.app 주소 생성!

## 구글 시트 연동 방법

### 1단계 — Google Cloud API 키 발급
1. console.cloud.google.com 접속
2. 새 프로젝트 생성
3. "Google Sheets API" 활성화
4. 사용자 인증 정보 → API 키 생성

### 2단계 — 구글 시트 공개 설정
1. 기존 입소자 스프레드시트 열기
2. 공유 → "링크가 있는 모든 사용자" → 뷰어

### 3단계 — Netlify 환경변수 설정
Netlify → Site settings → Environment variables:
- `REACT_APP_SHEET_ID` = 스프레드시트 ID
- `REACT_APP_API_KEY` = 발급받은 API 키

### 4단계 — 재배포
Netlify → Deploys → "Trigger deploy"

## 로컬 실행 (테스트용)
```bash
npm install
npm start
```
→ http://localhost:3000 에서 확인
