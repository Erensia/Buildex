# Buildex

Wuthering Waves 캐릭터 빌드와 파티 버프를 비교하는 웹 앱입니다.

## 시작하기

1. `.env.example`을 `.env.local`로 복사하고 `NEXTAUTH_SECRET` 값과 관리자용 `ADMIN_EMAIL`을 설정합니다.
2. `docker compose up -d`로 PostgreSQL을 실행합니다.
3. `pnpm db:migrate`로 데이터베이스 구조를 적용합니다.
4. `pnpm dev`로 앱을 실행합니다.

## 로컬 환경 설정

- 프로젝트별 로컬 설정은 `.env.local`에 둡니다. 이 파일은 Git에서 제외되며, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`을 설정합니다.
- `NEXTAUTH_SECRET`은 충분히 긴 고정 난수여야 합니다. 값을 바꾸면 기존 로그인 JWT를 복호화할 수 없으므로 브라우저 쿠키를 지우고 다시 로그인해야 합니다.
- Drizzle 설정은 `.env.local`을 자동으로 읽습니다. 따라서 `pnpm db:migrate` 등 Drizzle 명령을 실행할 때 별도의 환경변수 지정이 필요하지 않습니다.

## 관리자 데이터 운영

- `ADMIN_EMAIL` 계정으로 로그인한 뒤 `/admin`에서 게임 데이터를 관리합니다.
- 게임, 캐릭터, 무기, 에코, 에코 세트, 주옵션, 세트 구성을 등록·수정·삭제할 수 있습니다.
- 게임 데이터에는 버전, 검증 날짜, 출처 URL이 필수입니다. 초기 대량 적재와 데이터베이스 구조 변경은 Drizzle 마이그레이션으로 관리합니다.

## 현재 기반

- Next.js App Router, TypeScript, Tailwind CSS
- PostgreSQL + Drizzle ORM 데이터 모델과 초기 마이그레이션
- 이메일/비밀번호 기반 Auth.js 로그인·회원가입 흐름
- Zod 빌드 입력 검증 및 Vitest 테스트 기반
- 게임 데이터/계산식/빌드 결과 버전 분리

`src/lib/formula`에는 화면과 분리된 계산 모듈을 두며, 게임 공식은 이후 이 경계 안에서만 확장합니다.
