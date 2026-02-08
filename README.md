# yuar-snap 계약서 생성기

서버 운영비를 최소화한 `React + Vite` 기반 계약서 생성/공유/서명/PDF 다운로드 서비스입니다.

## 주요 기능

- 계약서 폼 입력 후 미리보기
- 공유 링크 생성 (정상 시 `is.gd` 단축, 장애 시 원본 링크 fallback)
- 고객 서명 입력
- PDF 다운로드
- 서명 완료 후 이메일 입력 팝업을 통한 PDF 전송
  - 계약자가 입력한 이메일 + 작성자 이메일(`OWNER_EMAIL`)
  - Vercel Serverless Function(`/api/send-contract`)에서 Gmail API(OAuth2) 호출

## 로컬 실행

```bash
npm install
npm run dev
```

## 배포 환경 변수 (Vercel)

아래 값이 모두 필요합니다.

- `OWNER_EMAIL`: 작성자(본인) 수신 이메일
- `GMAIL_SENDER_EMAIL`(선택): 실제 발신 Gmail 주소. 비워두면 OAuth 인증 Gmail 주소를 자동 사용
- `GMAIL_CLIENT_ID`: Google OAuth Client ID
- `GMAIL_CLIENT_SECRET`: Google OAuth Client Secret
- `GMAIL_REFRESH_TOKEN`: 위 Gmail 계정으로 발급한 refresh token

## Gmail OAuth2 설정 요약

1. Google Cloud Console에서 프로젝트 생성
2. Gmail API 활성화
3. OAuth 동의 화면 구성
4. OAuth Client ID 발급 (`Web application` 권장)
5. OAuth flow로 `refresh_token` 발급
6. 위 5개 환경변수를 Vercel에 등록 후 재배포

## 이메일 발송 트리거

- 공유 링크 접속자가 서명을 완료한 뒤 `이메일로 받기` 버튼 클릭
- 팝업에서 이메일 입력 후 아래 조건 충족 시에만 전송 버튼 활성화
  - 서명(`signature`)이 존재할 것
  - 이메일 형식 검증을 통과할 것
- 전송 시 PDF를 메모리에서 생성(Base64 변환) 후 `/api/send-contract` 호출
- API가 계약자 입력 이메일 + 작성자 이메일로 첨부 발송
  - 발신자는 OAuth 인증된 Gmail 계정으로 자동 고정

## 참고 사항

- Vercel Node Function payload 제한(요청 본문/응답) 때문에 PDF가 너무 크면 전송 실패할 수 있습니다.
- `is.gd` 단축이 실패하거나 응답 지연되면 자동으로 원본 링크를 복사합니다.
