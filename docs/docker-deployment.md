# Docker deployment

This configuration runs three services: PostgreSQL, a one-time Drizzle migration
job, and the Next.js application. PostgreSQL is reachable only from the Docker
network; the application is exposed on `APP_PORT` (3000 by default).

## 집 PC에서 처음 실행하기 (PowerShell)

Docker Desktop을 실행한 뒤, 새로 clone한 저장소의 루트에서 아래를 수행합니다.

```powershell
Copy-Item docker.env.example .env
notepad .env
docker compose up --build -d
docker compose logs -f migrate app
```

`.env`에서는 다음 세 값을 반드시 실제 값으로 바꿉니다.

- `POSTGRES_PASSWORD`: 영문자와 숫자 위주의 충분히 긴 비밀번호
- `NEXTAUTH_SECRET`: 운영 중 바꾸지 않을 긴 무작위 문자열
- `ADMIN_EMAIL`: 첫 관리자 계정으로 가입할 이메일

로그에서 `migrate`가 오류 없이 종료되고 `app`에 `Ready`가 보이면
`http://localhost:3000`으로 접속합니다. `ADMIN_EMAIL`과 같은 이메일로
회원가입·로그인한 다음 `/admin`에 접근해 관리자 권한과 게임 데이터를 확인합니다.

중지할 때는 데이터 보존을 위해 다음 명령을 사용합니다.

```powershell
docker compose down
```

`docker compose down -v`는 PostgreSQL 데이터를 담은 볼륨까지 제거하므로,
초기화가 목적이 아닌 한 실행하지 않습니다.

## First run on a clean machine

1. Install Docker Desktop and start it.
2. Clone this repository and switch to the intended commit or branch.
3. Copy `docker.env.example` to `.env`.
4. Replace `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, and `ADMIN_EMAIL`. Keep
   `NEXTAUTH_SECRET` unchanged for the life of an environment. Set
   `NEXTAUTH_URL` to the address users will actually open.
5. Run `docker compose up --build -d`.
6. Follow initialization with `docker compose logs -f migrate app`. The
   `migrate` service must exit with code 0 before the app starts.
7. Open `http://localhost:3000` (or the configured `APP_PORT`). Register and
   sign in with the configured `ADMIN_EMAIL`, then open `/admin` to verify the
   administrator bootstrap and published game data.

The migration service runs on every `docker compose up`. Drizzle records applied
migrations, so a healthy existing database has nothing new to apply. It is a
single Compose service, which prevents web containers from racing to migrate.

## Updating an existing deployment

1. Back up PostgreSQL before changing the image or database schema.
2. Pull the desired Git revision.
3. Run `docker compose up --build -d`.
4. Check `docker compose logs migrate` and verify it completed successfully.
5. Perform a smoke test: sign in, load a character/build, and save a build.

Do not run `docker compose down -v` in production: the `-v` option deletes the
named PostgreSQL volume and therefore all service data. `docker compose down`
without `-v` retains it.

## Production notes

- Put the app behind an HTTPS reverse proxy (Caddy, Nginx, or a load balancer)
  and set `NEXTAUTH_URL` to the public `https://` URL.
- Keep `.env` and PostgreSQL backups outside the Git repository and rotate only
  with a documented session-invalidation plan.
- This Compose file intentionally does not publish port 5432. Use an SSH tunnel
  or an internal administration path when database access is needed.
- For a home-PC smoke test, use a fresh clone in a separate directory and do
  not mount the current working tree into containers.
