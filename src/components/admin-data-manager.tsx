"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Entity = "game" | "character" | "weapon" | "echo" | "echoSet" | "mainStat" | "echoSetMembership";
type Data = Record<string, Array<Record<string, unknown>>>;

const examples: Record<Entity, Record<string, unknown>> = {
  game: { entity: "game", slug: "wuthering-waves", name: "명조: 워더링 웨이브", dataVersion: "3.5", sourceSnapshot: "2026-07-16", sourceUrl: "https://example.com/source", isActive: true },
  character: { entity: "character", gameSlug: "wuthering-waves", externalKey: "example-character", name: "예시 캐릭터", role: "메인 딜러", dataVersion: "3.5", sourceSnapshot: "2026-07-16", sourceUrl: "https://example.com/source", baseStats: { baseAttack: 400, element: "fusion", weaponType: "sword", level: 90 } },
  weapon: { entity: "weapon", gameSlug: "wuthering-waves", externalKey: "example-weapon", name: "예시 무기", weaponType: "sword", dataVersion: "3.5", sourceSnapshot: "2026-07-16", sourceUrl: "https://example.com/source", stats: { baseAttack: 500, level: 90, refinement: 1 } },
  echo: { entity: "echo", gameSlug: "wuthering-waves", externalKey: "example-echo", name: "예시 에코", cost: 4, dataVersion: "3.5", sourceSnapshot: "2026-07-16", sourceUrl: "https://example.com/source", stats: {} },
  echoSet: { entity: "echoSet", gameSlug: "wuthering-waves", externalKey: "example-set", name: "예시 세트", dataVersion: "3.5", sourceSnapshot: "2026-07-16", sourceUrl: "https://example.com/source", effects: { twoPiece: { fusionDamageBonus: 10 } } },
  mainStat: { entity: "mainStat", gameSlug: "wuthering-waves", cost: 4, statKey: "critRate", value: 22, dataVersion: "3.5", sourceSnapshot: "2026-07-16", sourceUrl: "https://example.com/source" },
  echoSetMembership: { entity: "echoSetMembership", gameSlug: "wuthering-waves", echoSetKey: "example-set", echoKey: "example-echo" },
};

const entityLabels: Record<Entity, string> = { game: "게임", character: "캐릭터", weapon: "무기", echo: "에코", echoSet: "에코 세트", mainStat: "에코 주옵션", echoSetMembership: "세트 구성" };

export function AdminDataManager({ adminName }: { adminName: string }) {
  const [entity, setEntity] = useState<Entity>("character");
  const [payload, setPayload] = useState(() => JSON.stringify(examples.character, null, 2));
  const [data, setData] = useState<Data>({});
  const [message, setMessage] = useState("데이터를 불러오는 중입니다.");

  async function load() {
    const response = await fetch("/api/admin/game-data");
    if (!response.ok) { setMessage("데이터를 불러오지 못했습니다."); return; }
    setData(await response.json());
    setMessage("");
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/game-data", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) { setMessage("데이터를 불러오지 못했습니다."); return; }
        setData(await response.json() as Data);
        setMessage("");
      })
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setMessage("데이터를 불러오지 못했습니다."); });
    return () => controller.abort();
  }, []);

  function changeEntity(next: Entity) {
    setEntity(next);
    setPayload(JSON.stringify(examples[next], null, 2));
  }
  async function save() {
    let body: Record<string, unknown>;
    try { body = JSON.parse(payload) as Record<string, unknown>; } catch { setMessage("JSON 형식을 확인해 주세요."); return; }
    const response = await fetch("/api/admin/game-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "저장에 실패했습니다."); return; }
    setMessage("저장했습니다. 같은 식별자로 다시 저장하면 수정됩니다.");
    await load();
  }
  const rows = useMemo(() => {
    const key: Record<Entity, string> = { game: "games", character: "characters", weapon: "weapons", echo: "echoes", echoSet: "echoSets", mainStat: "mainStats", echoSetMembership: "memberships" };
    return data[key[entity]] ?? [];
  }, [data, entity]);
  const gameSlugFor = (gameId: unknown) => (data.games ?? []).find((game) => game.id === gameId)?.slug as string | undefined;
  function edit(row: Record<string, unknown>) {
    const gameSlug = gameSlugFor(row.gameId);
    let next: Record<string, unknown>;
    if (entity === "game") next = { entity, slug: row.slug, name: row.name, dataVersion: row.currentDataVersion, sourceSnapshot: row.sourceSnapshot, sourceUrl: row.sourceUrl, isActive: row.isActive };
    else if (entity === "character") next = { entity, gameSlug, externalKey: row.externalKey, name: row.name, role: row.role, dataVersion: row.dataVersion, sourceSnapshot: row.sourceSnapshot, sourceUrl: row.sourceUrl, baseStats: row.baseStats };
    else if (entity === "weapon") next = { entity, gameSlug, externalKey: row.externalKey, name: row.name, weaponType: row.weaponType, dataVersion: row.dataVersion, sourceSnapshot: row.sourceSnapshot, sourceUrl: row.sourceUrl, stats: row.stats };
    else if (entity === "echo") next = { entity, gameSlug, externalKey: row.externalKey, name: row.name, cost: row.cost, dataVersion: row.dataVersion, sourceSnapshot: row.sourceSnapshot, sourceUrl: row.sourceUrl, stats: row.stats };
    else if (entity === "echoSet") next = { entity, gameSlug, externalKey: row.externalKey, name: row.name, dataVersion: row.dataVersion, sourceSnapshot: row.sourceSnapshot, sourceUrl: row.sourceUrl, effects: row.effects };
    else if (entity === "mainStat") next = { entity, gameSlug, cost: row.cost, statKey: row.statKey, value: row.value, dataVersion: row.dataVersion, sourceSnapshot: row.sourceSnapshot, sourceUrl: row.sourceUrl };
    else {
      const set = (data.echoSets ?? []).find((item) => item.id === row.echoSetId);
      const echo = (data.echoes ?? []).find((item) => item.id === row.echoId);
      next = { entity, gameSlug: set && gameSlugFor(set.gameId), echoSetKey: set?.externalKey, echoKey: echo?.externalKey };
    }
    setPayload(JSON.stringify(next, null, 2));
  }
  async function remove(row: Record<string, unknown>) {
    if (!confirm("이 데이터를 삭제할까요? 관련 빌드 데이터에 영향을 줄 수 있습니다.")) return;
    const gameSlug = gameSlugFor(row.gameId);
    const body = entity === "game" ? { entity, slug: row.slug } : entity === "mainStat" ? { entity, gameSlug, cost: row.cost, statKey: row.statKey } : entity === "echoSetMembership"
      ? (() => { const set = (data.echoSets ?? []).find((item) => item.id === row.echoSetId); const echo = (data.echoes ?? []).find((item) => item.id === row.echoId); return { entity, gameSlug: set && gameSlugFor(set.gameId), echoSetKey: set?.externalKey, echoKey: echo?.externalKey }; })()
      : { entity, gameSlug, externalKey: row.externalKey };
    const response = await fetch("/api/admin/game-data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMessage(response.ok ? "삭제했습니다." : "삭제하지 못했습니다.");
    if (response.ok) await load();
  }

  return <main className="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-violet-300">ADMINISTRATION</p><h1 className="mt-1 text-3xl font-black">게임 데이터 관리</h1><p className="mt-2 text-sm text-zinc-400">{adminName}님 · 저장 시 출처와 버전을 함께 검증합니다.</p></div><Link href="/build" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800">플래너로 이동</Link></header>
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><label className="text-sm font-bold">데이터 종류</label><select value={entity} onChange={(event) => changeEntity(event.target.value as Entity)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3">{(Object.keys(entityLabels) as Entity[]).map((key) => <option value={key} key={key}>{entityLabels[key]}</option>)}</select><p className="mt-4 text-sm leading-6 text-zinc-400">JSON을 수정해 저장하세요. 같은 게임과 식별자로 저장하면 기존 항목을 갱신합니다. 세트 구성은 연결만 추가합니다.</p><textarea value={payload} onChange={(event) => setPayload(event.target.value)} spellCheck={false} className="mt-4 h-[430px] w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-200" /><button onClick={() => void save()} className="mt-4 w-full rounded-lg bg-violet-500 px-4 py-3 font-bold hover:bg-violet-400">저장 또는 수정</button>{message && <p className="mt-3 text-sm text-violet-200">{message}</p>}</section>
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex items-center justify-between"><h2 className="font-bold">등록된 {entityLabels[entity]}</h2><span className="text-sm text-zinc-400">{rows.length}개</span></div><div className="mt-4 max-h-[590px] space-y-2 overflow-y-auto">{rows.map((row, index) => <article key={String(row.id ?? `${row.echoSetId}-${row.echoId}`)} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{String(row.name ?? row.slug ?? row.externalKey ?? `${row.statKey ?? "세트"} ${row.cost ?? ""}`)}</p><p className="mt-1 truncate font-mono text-xs text-zinc-500">{String(row.externalKey ?? row.statKey ?? row.id ?? index)}</p></div><div className="flex gap-2"><button onClick={() => edit(row)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">수정</button><button onClick={() => void remove(row)} className="rounded border border-red-900/80 px-2 py-1 text-xs text-red-300 hover:bg-red-950">삭제</button></div></div></article>)}{!rows.length && <p className="py-12 text-center text-sm text-zinc-500">등록된 데이터가 없습니다.</p>}</div></section></div>
  </div></main>;
}
