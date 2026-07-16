# Buildex

Wuthering Waves 캐릭터 빌드와 파티 버프를 비교하는 웹 앱입니다.

## 시작하기

1. `.env.example`을 `.env.local`로 복사하고 `NEXTAUTH_SECRET` 값을 설정합니다.
2. `docker compose up -d`로 PostgreSQL을 실행합니다.
3. `pnpm db:migrate`로 데이터베이스 구조를 적용합니다.
4. `pnpm dev`로 앱을 실행합니다.

## 현재 기반

- Next.js App Router, TypeScript, Tailwind CSS
- PostgreSQL + Drizzle ORM 데이터 모델과 초기 마이그레이션
- 이메일/비밀번호 기반 Auth.js 로그인·회원가입 흐름
- Zod 빌드 입력 검증 및 Vitest 테스트 기반
- 게임 데이터/계산식/빌드 결과 버전 분리

`src/lib/formula`에는 화면과 분리된 계산 모듈을 두며, 게임 공식은 이후 이 경계 안에서만 확장합니다.
