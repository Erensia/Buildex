# Buildex 기본 설계

## 기술 구성

- Next.js App Router, TypeScript, React, Tailwind CSS
- PostgreSQL 16, Drizzle ORM
- Auth.js Credentials 인증
- Zod 입력 검증, Vitest 단위 테스트

## 주요 흐름

1. 로그인한 사용자가 `/build`에 접근한다.
2. 클라이언트가 `/api/build-data`에서 캐릭터·무기·에코 선택 데이터를 읽는다.
3. 사용자는 캐릭터, 호환 무기, 에코 세트, 주옵션 및 부옵션을 선택한다.
4. 화면은 선택 내용을 바탕으로 즉시 스탯을 계산한다.
5. 저장 또는 수정 시 서버가 입력을 검증하고 동일한 계산식을 적용해 `build_profiles`에 기록한다.
6. 저장 목록에서 빌드를 불러와 수정하거나 삭제할 수 있다.

## 범위 제한

- 소셜 로그인은 이번 작업 범위에서 제외한다.
- 파티 DPS 시뮬레이션과 범용 빌드 추천은 MVP 이후 기능이다.
- 등급 판정은 현재 창리 S0 전용무기 기준만 제공한다.
