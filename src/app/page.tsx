import Link from "next/link";

export default function Home() {
  return (
    <div className="neumorphic-app min-h-screen bg-[#09070d] text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-black tracking-tight">BUILDEX</span>
        <nav className="flex items-center gap-5 text-sm text-zinc-400">
          <span>빌드 플래너</span>
          <Link className="rounded-full bg-zinc-100 px-4 py-2 font-semibold text-zinc-900" href="/signin">로그인</Link>
        </nav>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[1.3fr_0.7fr] lg:py-36">
        <section>
          <p className="mb-5 text-sm font-semibold tracking-[0.22em] text-violet-400">WUTHERING WAVES BUILD PLANNER</p>
          <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight sm:text-7xl">내 빌드의 다음 한 칸을<br />정확하게 계산합니다.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-400">에코, 무기, 파티 버프를 한 곳에서 비교하고 다음 교체 우선순위를 찾으세요. 계산식과 게임 데이터의 버전도 함께 기록합니다.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-violet-500 px-5 py-3 font-bold text-white transition hover:bg-violet-400" href="/build">빌드 만들기</Link>
            <span className="rounded-xl border border-zinc-700 px-5 py-3 text-zinc-300">장리 S0 · 전무 지원</span>
          </div>
        </section>
        <aside className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7 shadow-2xl shadow-violet-950/20">
          <p className="text-sm font-semibold text-zinc-400">기반 구축 현황</p>
          <ul className="mt-6 space-y-5 text-sm">
            <li><strong className="block text-zinc-100">타입 안전한 데이터 모델</strong><span className="text-zinc-500">PostgreSQL + Drizzle ORM</span></li>
            <li><strong className="block text-zinc-100">입력값 검증 레이어</strong><span className="text-zinc-500">Zod 스키마로 에코와 빌드 데이터 보호</span></li>
            <li><strong className="block text-zinc-100">계산 엔진 분리</strong><span className="text-zinc-500">화면과 독립된 공식·버전 관리 구조</span></li>
          </ul>
        </aside>
      </main>
    </div>
  );
}
