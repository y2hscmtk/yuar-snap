# yuar-snap 계약서 생성기

서버 운영비를 최소화한 `React + Vite` 기반 계약서 생성/공유/서명/PDF 다운로드 서비스입니다.

## 주요 기능

- 계약서 폼 입력 후 미리보기
- 공유 링크 생성 (광고·중간 페이지 없는 `Short.io` 단축, 장애 시 원본 링크 복사)
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

## Short.io 실제 연동 테스트

`SHORT_IO_API_KEY`, `SHORT_IO_DOMAIN`, `SHORT_IO_TEST_URL`을 설정한 환경에서 아래 명령을 실행합니다.

```bash
npm run test:integration
```

테스트는 Short.io API로 링크를 생성한 뒤 해당 주소가 HTML 중간 페이지를 반환하지 않고 `SHORT_IO_TEST_URL`로 한 번에 HTTP 리디렉션되는지 확인합니다.

## 배포 환경 변수 (Vercel)

아래 값이 모두 필요합니다.

- `SHORT_IO_API_KEY`: Short.io의 `Integrations & API`에서 발급한 비밀 API 키
- `SHORT_IO_DOMAIN`: Short.io 계정에 등록한 단축 도메인 호스트명 (예: `your-domain.s.gy`)
- `OWNER_EMAIL`: 작성자(본인) 수신 이메일
- `GMAIL_SENDER_EMAIL`: 실제 발신 Gmail 주소 (예: `yourid@gmail.com`)
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

## 참고 사항

- Vercel Node Function payload 제한(요청 본문/응답) 때문에 PDF가 너무 크면 전송 실패할 수 있습니다.
- `Short.io` 무료 플랜은 API를 지원하며 계정 전체에서 최대 1,000개의 링크를 생성할 수 있습니다.
- Short.io 대시보드에서 무료 단축 도메인 또는 사용자 도메인을 먼저 등록한 뒤, 같은 호스트명을 `SHORT_IO_DOMAIN`에 설정해야 합니다.
- 일반 Short.io 링크는 광고나 중간 안내 페이지 없이 원본 주소로 직접 리디렉션됩니다. 이 앱은 cloaking을 끄고 HTTP 302 리디렉션을 사용합니다.
- `Short.io` 설정이 없거나 단축 요청이 실패하면 자동으로 압축된 원본 계약 링크를 복사합니다.
