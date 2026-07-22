"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Entity = "character" | "weapon" | "echo" | "echoSet" | "mainStat" | "echoSetMembership";
type Release = { id: string; gameId: string; version: string; status: "draft" | "published" | "superseded"; sourceSnapshot: string; sourceManifest: unknown; notes?: string | null; publishedAt?: string | null };
type Game = { id: string; slug: string; name: string; currentDataReleaseId?: string | null };
type Data = Record<string, Array<Record<string, unknown>>>;

const labels: Record<Entity, string> = { character: "캐릭터", weapon: "무기", echo: "에코", echoSet: "에코 세트", mainStat: "에코 주옵션", echoSetMembership: "세트 구성" };
const examples: Record<Entity, Record<string, unknown>> = {
  character: { entity: "character", externalKey: "example-character", name: "예시 캐릭터", role: "메인 딜러", baseStats: { baseAttack: 400, element: "fusion", weaponType: "sword", level: 90 } },
  weapon: { entity: "weapon", externalKey: "example-weapon", name: "예시 무기", weaponType: "sword", stats: { baseAttack: 500, level: 90, refinement: 1 } },
  echo: { entity: "echo", externalKey: "example-echo", name: "예시 에코", cost: 4, stats: {} },
  echoSet: { entity: "echoSet", externalKey: "example-set", name: "예시 세트", effects: { twoPiece: { fusionDamageBonus: 10 } } },
  mainStat: { entity: "mainStat", cost: 4, statKey: "critRate", value: 22 },
  echoSetMembership: { entity: "echoSetMembership", echoSetKey: "example-set", echoKey: "example-echo" },
};

export function AdminDataManager({ adminName }: { adminName: string }) {
  const [games, setGames] = useState<Game[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [releaseId, setReleaseId] = useState("");
  const [entity, setEntity] = useState<Entity>("character");
  const [payload, setPayload] = useState(() => JSON.stringify(examples.character, null, 2));
  const [data, setData] = useState<Data>({});
  const [message, setMessage] = useState("릴리스 정보를 불러오는 중입니다.");
  const release = releases.find((item) => item.id === releaseId);
  const game = games.find((item) => item.id === release?.gameId);
  const editable = release?.status === "draft";

  async function loadReleases() {
    const response = await fetch("/api/admin/game-data/releases");
    if (!response.ok) throw new Error("릴리스 정보를 불러오지 못했습니다.");
    const loaded = await response.json() as { games: Game[]; releases: Release[] };
    setGames(loaded.games); setReleases(loaded.releases);
    setReleaseId((current) => current || loaded.releases.find((item) => item.status === "draft")?.id || loaded.games[0]?.currentDataReleaseId || "");
  }
  async function loadData(id = releaseId) {
    if (!id) return;
    const response = await fetch(`/api/admin/game-data?releaseId=${encodeURIComponent(id)}`);
    if (!response.ok) { setMessage("릴리스 데이터를 불러오지 못했습니다."); return; }
    setData(await response.json() as Data);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/game-data/releases", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("릴리스 정보를 불러오지 못했습니다.");
      const loaded = await response.json() as { games: Game[]; releases: Release[] };
      setGames(loaded.games); setReleases(loaded.releases);
      setReleaseId((current) => current || loaded.releases.find((item) => item.status === "draft")?.id || loaded.games[0]?.currentDataReleaseId || ""); setMessage("");
    }).catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setMessage((error as Error).message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!releaseId) return;
    const controller = new AbortController();
    void fetch(`/api/admin/game-data?releaseId=${encodeURIComponent(releaseId)}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("릴리스 데이터를 불러오지 못했습니다."); setData(await response.json() as Data);
    }).catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setMessage((error as Error).message); });
    return () => controller.abort();
  }, [releaseId]);

  async function createDraft() {
    const version = prompt("새 데이터 버전", "3.6"); if (!version) return;
    const sourceSnapshot = prompt("검증 날짜 (YYYY-MM-DD)", new Date().toISOString().slice(0, 10)); if (!sourceSnapshot) return;
    const sourceManifest = release?.sourceManifest as { url?: string }[] | undefined;
    const sourceUrl = prompt("대표 출처 URL (https:// 포함)", sourceManifest?.[0]?.url ?? ""); if (!sourceUrl || !game) return;
    const response = await fetch("/api/admin/game-data/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "createDraft", gameSlug: game.slug, version, sourceSnapshot, sourceManifest: [{ label: `${version} 검증 출처`, url: sourceUrl }] }) });
    const result = await response.json();
    if (!response.ok) { const details = Array.isArray(result.details) ? result.details.map((item: { message?: string }) => item.message).join(" / ") : ""; setMessage(`${result.error ?? "초안을 만들지 못했습니다."}${details ? `: ${details}` : ""}`); return; }
    await loadReleases(); setReleaseId(result.draft.id); setMessage(`${version} 초안을 만들었습니다. 공개 데이터는 아직 바뀌지 않았습니다.`);
  }
  async function save() {
    if (!editable || !release || !game) return;
    try {
      const body = JSON.parse(payload) as Record<string, unknown>;
      const response = await fetch("/api/admin/game-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, entity, releaseId: release.id, gameSlug: game.slug, dataVersion: release.version, sourceSnapshot: release.sourceSnapshot, sourceUrl: (body.sourceUrl as string | undefined) ?? (release.sourceManifest as { url?: string }[])?.[0]?.url }) });
      const result = await response.json(); if (!response.ok) { setMessage(result.error ?? "저장에 실패했습니다."); return; }
      setMessage("초안에 저장했습니다. 아직 사용자에게 공개되지 않습니다."); await loadData();
    } catch { setMessage("JSON 형식을 확인해 주세요."); }
  }
  async function validateAndPublish() {
    if (!release || !editable) return;
    const validationResponse = await fetch("/api/admin/game-data/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "validate", releaseId: release.id }) });
    const validation = await validationResponse.json();
    if (!validationResponse.ok || validation.errors?.length) { setMessage(`발행 검증 실패: ${(validation.errors ?? [validation.error]).join(" / ")}`); return; }
    if (!confirm(`${release.version}을 공개합니다. 이전 공개 릴리스는 보존되지만 더 이상 플래너에 노출되지 않습니다.`)) return;
    const response = await fetch("/api/admin/game-data/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", releaseId: release.id }) });
    const result = await response.json(); if (!response.ok) { setMessage(result.error ?? "발행하지 못했습니다."); return; }
    await loadReleases(); setMessage(`${release.version}을 공개했습니다.`);
  }
  const rows = useMemo(() => data[{ character: "characters", weapon: "weapons", echo: "echoes", echoSet: "echoSets", mainStat: "mainStats", echoSetMembership: "memberships" }[entity]] ?? [], [data, entity]);

  return <main className="neumorphic-admin min-h-screen bg-[#09070d] px-5 py-8 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-violet-300">RELEASE ADMINISTRATION</p><h1 className="mt-1 text-3xl font-black">게임 데이터 릴리스</h1><p className="mt-2 text-sm text-zinc-400">{adminName}님 · 공개 데이터는 읽기 전용이며, 변경은 초안에서만 이뤄집니다.</p></div><Link href="/build" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800">플래너로 이동</Link></header>
    <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-sm font-bold">작업 릴리스<select value={releaseId} onChange={(event) => setReleaseId(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3">{releases.map((item) => <option key={item.id} value={item.id}>{item.version} · {item.status} · {item.sourceSnapshot}</option>)}</select></label><button onClick={() => void createDraft()} disabled={!game} className="rounded-lg bg-violet-500 px-4 py-3 text-sm font-bold hover:bg-violet-400 disabled:opacity-50">현재 공개본에서 초안 만들기</button>{editable && <button onClick={() => void validateAndPublish()} className="rounded-lg border border-emerald-500/60 px-4 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-500/10">검증 후 Publish</button>}</div>{release && <p className="mt-3 text-sm text-zinc-400">{release.status === "draft" ? "초안: 저장해도 사용자에게 노출되지 않습니다." : release.status === "published" ? "현재 공개 릴리스: 직접 수정할 수 없습니다." : "보존된 과거 릴리스: 읽기 전용입니다."}</p>}</section>
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><label className="text-sm font-bold">데이터 종류</label><select disabled={!editable} value={entity} onChange={(event) => { const next = event.target.value as Entity; setEntity(next); setPayload(JSON.stringify(examples[next], null, 2)); }} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 disabled:opacity-50">{(Object.keys(labels) as Entity[]).map((key) => <option value={key} key={key}>{labels[key]}</option>)}</select><p className="mt-4 text-sm leading-6 text-zinc-400">JSON은 선택한 초안에만 저장됩니다. 발행 전에는 언제든 안전하게 수정할 수 있습니다.</p><textarea disabled={!editable} value={payload} onChange={(event) => setPayload(event.target.value)} spellCheck={false} className="mt-4 h-[360px] w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-200 disabled:opacity-50" /><button disabled={!editable} onClick={() => void save()} className="mt-4 w-full rounded-lg bg-violet-500 px-4 py-3 font-bold hover:bg-violet-400 disabled:opacity-50">초안에 저장</button>{message && <p className="mt-3 text-sm text-violet-200">{message}</p>}</section>
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex items-center justify-between"><h2 className="font-bold">{release?.version ?? ""} · {labels[entity]}</h2><span className="text-sm text-zinc-400">{rows.length}개</span></div><div className="mt-4 max-h-[540px] space-y-2 overflow-y-auto">{rows.map((row, index) => <article key={String(row.id ?? index)} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"><p className="font-semibold">{String(row.name ?? row.externalKey ?? row.statKey ?? "세트 구성")}</p><p className="mt-1 font-mono text-xs text-zinc-500">{String(row.externalKey ?? row.id ?? index)}</p></article>)}{!rows.length && <p className="py-12 text-center text-sm text-zinc-500">등록된 데이터가 없습니다.</p>}</div></section></div>
  </div></main>;
}
