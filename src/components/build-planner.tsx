"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";
import { ZANI_S0_GRADE_REQUIREMENTS } from "@/lib/formula/zani-phoebe-verina";
import { HIYUKI_CHISA_LUCILLA_BUFFS, HIYUKI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/hiyuki-chisa-lucilla";
import { FORMULA_VERSION } from "@/lib/formula/versions";
import { resolveEchoSetEffects } from "@/lib/formula/echo-sets";
import type { StatKey, StatValues } from "@/lib/formula/stats";
import { getSubstatQuality } from "@/lib/formula/substat-analysis";
import { getImprovementActions } from "@/lib/formula/build-improvements";
import { echoSubstatRolls } from "@/lib/formula/echo-substats";

type Character = { externalKey: string; name: string; baseStats: StatValues & { weaponType?: string } };
type Weapon = { externalKey: string; name: string; weaponType: string; stats: StatValues };
type Echo = { id: string; externalKey: string; name: string; cost: 1 | 3 | 4 };
type EchoSet = { id: string; externalKey: string; name: string; effects: Record<string, unknown> };
type MainStat = { cost: 1 | 3 | 4; statKey: StatKey; value: number };
type BuildData = { games: { name: string; currentDataVersion: string | null; sourceSnapshot: string | null; sourceUrl: string | null }[]; characters: Character[]; weapons: Weapon[]; echoes: Echo[]; echoSets: EchoSet[]; mainStats: MainStat[]; echoSetMemberships: { echoSetId: string; echoId: string }[] };
type BuildInput = { name: string; characterKey: string; weaponKey: string; echoes: { slot: number; echoKey?: string; setKey: string; cost: 1 | 3 | 4; mainStat: string; subStats: { key: string; value: number }[] }[]; activeBuffIds: string[]; formulaVersion: string };
type SavedProfile = { id: string; name: string; buildInput: BuildInput; calculatedResult: { attack: number; critRate: number; critDamage: number; energyRegen: number; fusionDamageBonus: number; spectroDamageBonus?: number; glacioDamageBonus?: number; resonanceSkillDamageBonus: number; grade?: string | null } };

const slots: { slot: number; cost: 1 | 3 | 4 }[] = [{ slot: 1, cost: 4 }, { slot: 2, cost: 3 }, { slot: 3, cost: 3 }, { slot: 4, cost: 1 }, { slot: 5, cost: 1 }];
const statLabels: Record<StatKey, string> = { baseAttack: "기초 공격력", flatAttack: "공격력", attackPercent: "공격력 %", flatHealth: "HP", healthPercent: "HP %", flatDefense: "방어력", defensePercent: "방어력 %", critRate: "치명타 확률", critDamage: "치명타 피해", energyRegen: "공명 효율", fusionDamageBonus: "용융 피해 보너스", spectroDamageBonus: "회절 피해 보너스", glacioDamageBonus: "응결 피해 보너스", resonanceSkillDamageBonus: "공명 스킬 피해 보너스" };
const trackedStats = Object.keys(echoSubstatRolls) as (keyof typeof echoSubstatRolls)[];
const inputClass = "mt-2 w-full rounded-xl border border-white/8 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15";

function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

export function BuildPlanner({ userName }: { userName: string }) {
  const [data, setData] = useState<BuildData>();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [profileId, setProfileId] = useState<string>();
  const [comparisonProfileId, setComparisonProfileId] = useState<string>();
  const [name, setName] = useState("새 빌드");
  const [characterKey, setCharacterKey] = useState("");
  const [weaponKey, setWeaponKey] = useState("");
  const [setKeys, setSetKeys] = useState<string[]>([]);
  const [echoKeys, setEchoKeys] = useState<string[]>([]);
  const [mainStats, setMainStats] = useState<string[]>([]);
  const [subStats, setSubStats] = useState<StatValues[]>([]);
  const [activeBuffIds, setActiveBuffIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([fetch("/api/build-data").then((r) => r.json()), fetch("/api/build-profiles").then((r) => r.json())]).then(([loadedData, loadedProfiles]) => {
      const buildData = loadedData as BuildData;
      setData(buildData); setProfiles(loadedProfiles as SavedProfile[]);
      const character = buildData.characters[0]; const echoSet = buildData.echoSets[0];
      if (character) setCharacterKey(character.externalKey);
      if (echoSet) setSetKeys(slots.map(() => echoSet.externalKey));
      setMainStats(slots.map((slot) => buildData.mainStats.find((item) => item.cost === slot.cost)?.statKey ?? ""));
      setEchoKeys(slots.map((slot) => buildData.echoes.find((item) => item.cost === slot.cost)?.externalKey ?? ""));
      setSubStats(slots.map(() => ({})));
    });
  }, []);

  const character = data?.characters.find((item) => item.externalKey === characterKey);
  const compatibleWeapons = useMemo(() => data?.weapons.filter((weapon) => !character?.baseStats.weaponType || weapon.weaponType === character.baseStats.weaponType) ?? [], [data, character]);
  const weapon = compatibleWeapons.find((item) => item.externalKey === weaponKey) ?? compatibleWeapons[0];
  const buffs = useMemo(() => characterKey === "changli"
    ? CHANGLI_LUPA_BRANT_BUFFS.filter((buff) => buff.id !== "changli-signature-max-stacks" || weapon?.externalKey === "blazing-brilliance")
    : characterKey === "hiyuki" ? HIYUKI_CHISA_LUCILLA_BUFFS : [], [characterKey, weapon?.externalKey]);
  const optionsFor = useCallback((cost: 1 | 3 | 4) => data?.mainStats.filter((item) => item.cost === cost) ?? [], [data]);
  const echoesFor = useCallback((setKey: string, cost: 1 | 3 | 4) => {
    const echoSet = data?.echoSets.find((item) => item.externalKey === setKey);
    if (!echoSet) return [];
    const echoIds = new Set(data?.echoSetMemberships.filter((item) => item.echoSetId === echoSet.id).map((item) => item.echoId));
    return data?.echoes.filter((item) => item.cost === cost && echoIds.has(item.id)) ?? [];
  }, [data]);
  const calculation = useMemo(() => {
    if (!character || !weapon) return null;
    const echoes = slots.map((slot, index) => {
      const option = optionsFor(slot.cost).find((item) => item.statKey === mainStats[index]);
      return { id: `echo-${slot.slot}`, label: `Echo ${slot.slot}`, stats: { ...(option ? { [option.statKey]: option.value } : {}), ...(subStats[index] ?? {}) } };
    });
    const setEffects = resolveEchoSetEffects(setKeys, data?.echoSets ?? []);
    const result = calculateBuildStats({ character: { id: character.externalKey, label: character.name, stats: character.baseStats }, weapon: { id: weapon.externalKey, label: weapon.name, stats: weapon.stats }, echoes: [...echoes, ...setEffects.automaticSources], activeBuffIds }, [...buffs, ...setEffects.conditionalBuffs]);
    const gradeRequirements = characterKey === "changli"
      ? CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS
      : characterKey === "zani"
        ? ZANI_S0_GRADE_REQUIREMENTS
        : characterKey === "hiyuki"
          ? HIYUKI_S0_SIGNATURE_GRADE_REQUIREMENTS
        : null;
    return { result, grade: gradeRequirements ? evaluateBuildGrade(result, gradeRequirements) : null, conditionalSetBuffs: setEffects.conditionalBuffs };
  }, [activeBuffIds, buffs, character, characterKey, data?.echoSets, mainStats, optionsFor, setKeys, subStats, weapon]);
  const comparisonProfile = profiles.find((profile) => profile.id === comparisonProfileId);
  const improvementActions = calculation?.grade ? getImprovementActions(calculation.grade.unmetRequirements, slots.map((slot, index) => ({ ...slot, mainStat: mainStats[index] ?? "" })), data?.mainStats ?? []) : [];

  function payload(): BuildInput { return { name, characterKey, weaponKey: weaponKey || weapon?.externalKey || "", echoes: slots.map((slot, index) => ({ slot: slot.slot, echoKey: echoKeys[index], setKey: setKeys[index] ?? "", cost: slot.cost, mainStat: mainStats[index], subStats: Object.entries(subStats[index] ?? {}).map(([key, value]) => ({ key, value: value ?? 0 })) })), activeBuffIds, formulaVersion: FORMULA_VERSION }; }
  async function save() { setSaving(true); setMessage(undefined); const response = await fetch(profileId ? `/api/build-profiles/${profileId}` : "/api/build-profiles", { method: profileId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) }); const body = await response.json().catch(() => null); if (!response.ok) setMessage(body?.error ?? "빌드를 저장하지 못했습니다."); else { setProfiles((current) => profileId ? current.map((item) => item.id === body.id ? body : item) : [body, ...current]); setProfileId(body.id); setMessage("빌드를 저장했습니다."); } setSaving(false); }
  function load(profile: SavedProfile) { const input = profile.buildInput; setProfileId(profile.id); setName(input.name); setCharacterKey(input.characterKey); setWeaponKey(input.weaponKey); setSetKeys(input.echoes.map((echo) => echo.setKey)); setEchoKeys(input.echoes.map((echo) => echo.echoKey ?? "")); setMainStats(input.echoes.map((echo) => echo.mainStat)); setSubStats(input.echoes.map((echo) => Object.fromEntries(echo.subStats.map((stat) => [stat.key, stat.value])) as StatValues)); setActiveBuffIds(input.activeBuffIds); setMessage(`${profile.name}을 불러왔습니다.`); }
  function newBuild() { setProfileId(undefined); setName("새 빌드"); setSubStats(slots.map(() => ({}))); setActiveBuffIds([]); setMessage("새 빌드를 만들 준비가 됐습니다."); }
  function duplicate(profile: SavedProfile) { load(profile); setProfileId(undefined); setName(`${profile.name} 복사본`); setMessage("복사본을 저장하면 별도 빌드로 생성됩니다."); }
  async function remove(id: string) { if (!window.confirm("이 빌드를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return; const response = await fetch(`/api/build-profiles/${id}`, { method: "DELETE" }); if (response.ok) { setProfiles((items) => items.filter((item) => item.id !== id)); if (profileId === id) newBuild(); } }

  if (!data) return <main className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-400">빌드 데이터를 불러오는 중…</main>;
  const game = data.games[0];
  const statCards = [["CRIT Rate", calculation?.result.critRate ?? 0], ["CRIT DMG", calculation?.result.critDamage ?? 0], ["Energy Regen", calculation?.result.energyRegen ?? 0], ["Fusion DMG", calculation?.result.fusionDamageBonus ?? 0], ["Spectro DMG", calculation?.result.spectroDamageBonus ?? 0], ["Glacio DMG", calculation?.result.glacioDamageBonus ?? 0]] as const;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(124,58,237,.16),transparent_30rem),#09090b] pb-16 text-zinc-100">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="text-lg font-black tracking-tight text-white" href="/">BUILDEX<span className="text-violet-400">.</span></Link>
      <div className="flex items-center gap-3 text-sm"><span className="hidden text-zinc-400 sm:block">{userName}</span><button className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 transition hover:border-white/25 hover:text-white" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button></div>
    </header>

    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-7 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold tracking-[.2em] text-violet-400">WUTHERING WAVES · BUILD PLANNER</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">빌드를 설계하고, 바로 비교하세요.</h1><p className="mt-2 text-sm text-zinc-400">선택을 바꿀 때마다 결과와 다음 개선 포인트가 즉시 반영됩니다.</p></div>
        {game && <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-400">{game.name} · Data v{game.currentDataVersion ?? "—"}{game.sourceUrl && <> · <a className="text-violet-300 underline-offset-4 hover:underline" href={game.sourceUrl} rel="noreferrer" target="_blank">출처</a></>}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 shadow-xl shadow-black/10 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-violet-500 text-xs font-black">1</span><div><h2 className="font-bold">캐릭터와 무기</h2><p className="text-xs text-zinc-500">계산의 기준이 되는 조합입니다.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-zinc-300">캐릭터<select className={inputClass} value={characterKey} onChange={(e) => { setCharacterKey(e.target.value); setWeaponKey(""); }}><option value="" disabled>캐릭터를 선택하세요</option>{data.characters.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="text-sm font-medium text-zinc-300">무기<select className={inputClass} value={weapon?.externalKey ?? ""} onChange={(e) => setWeaponKey(e.target.value)}>{compatibleWeapons.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label></div></section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 shadow-xl shadow-black/10 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-violet-500 text-xs font-black">2</span><div><h2 className="font-bold">에코 세팅</h2><p className="text-xs text-zinc-500">코스트와 세트에 맞는 주옵션을 선택하세요.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{slots.map((slot, index) => <div key={slot.slot} className="rounded-xl border border-white/8 bg-zinc-950/45 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Echo {slot.slot}</h3><span className="rounded-full bg-white/8 px-2 py-0.5 text-xs font-bold text-zinc-300">Cost {slot.cost}</span></div><label className="block text-xs text-zinc-400">에코<select className={inputClass} value={echoKeys[index] ?? ""} onChange={(e) => setEchoKeys((items) => items.map((item, i) => i === index ? e.target.value : item))}>{echoesFor(setKeys[index] ?? "", slot.cost).map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="mt-3 block text-xs text-zinc-400">세트<select className={inputClass} value={setKeys[index] ?? ""} onChange={(e) => { const nextSetKey = e.target.value; setSetKeys((items) => items.map((item, i) => i === index ? nextSetKey : item)); setEchoKeys((items) => items.map((item, i) => i === index ? (echoesFor(nextSetKey, slot.cost)[0]?.externalKey ?? "") : item)); }}>{data.echoSets.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="mt-3 block text-xs text-zinc-400">주옵션<select className={inputClass} value={mainStats[index] ?? ""} onChange={(e) => setMainStats((items) => items.map((item, i) => i === index ? e.target.value : item))}>{optionsFor(slot.cost).map((item) => <option key={item.statKey} value={item.statKey}>{statLabels[item.statKey]} +{item.value}%</option>)}</select></label></div>)}</div></section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 shadow-xl shadow-black/10 sm:p-6"><div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-violet-500 text-xs font-black">3</span><div><h2 className="font-bold">부옵션</h2><p className="text-xs text-zinc-500">명조 에코의 실제 부옵션 롤 수치에서 선택합니다.</p></div></div><span className="hidden text-xs text-zinc-500 sm:block">에코당 최대 5개</span></div><div className="space-y-5">{slots.map((slot, index) => { const quality = getSubstatQuality(subStats[index] ?? {}); return <div key={slot.slot} className="border-t border-white/8 pt-5 first:border-0 first:pt-0"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Echo {slot.slot}</h3><span className="text-xs font-semibold text-violet-300">부옵션 {quality.count}/5 · 품질 {format(quality.score)}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{trackedStats.map((key) => { const selectedValue = subStats[index]?.[key]; const isAtLimit = quality.count >= 5 && selectedValue === undefined; const isFlatValue = key === "flatAttack" || key === "flatHealth" || key === "flatDefense"; return <label key={key} className="text-xs font-medium text-zinc-400">{statLabels[key]}<select className={inputClass} disabled={isAtLimit} value={selectedValue ?? ""} onChange={(e) => setSubStats((current) => current.map((stats, statIndex) => { if (statIndex !== index) return stats; if (!e.target.value) return Object.fromEntries(Object.entries(stats).filter(([statKey]) => statKey !== key)) as StatValues; return { ...stats, [key]: Number(e.target.value) }; }))}><option value="">선택 안 함</option>{echoSubstatRolls[key].map((value) => <option key={value} value={value}>+{format(value)}{isFlatValue ? "" : "%"}</option>)}</select></label>; })}</div></div>; })}</div></section>

          {(buffs.length > 0 || calculation?.conditionalSetBuffs.length) && <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 sm:p-6"><h2 className="font-bold">조건부 버프</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[...buffs, ...(calculation?.conditionalSetBuffs ?? [])].map((buff) => <label className="flex cursor-pointer gap-3 rounded-xl border border-white/8 bg-zinc-950/40 p-3 text-sm transition hover:border-violet-400/40" key={buff.id}><input className="mt-0.5 accent-violet-500" type="checkbox" checked={activeBuffIds.includes(buff.id)} onChange={() => setActiveBuffIds((items) => items.includes(buff.id) ? items.filter((id) => id !== buff.id) : [...items, buff.id])} /><span><strong className="block font-medium text-zinc-200">{buff.label}</strong><small className="text-zinc-500">{buff.condition}</small></span></label>)}</div></section>}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
          <section className="overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-b from-violet-950/55 to-zinc-900 p-5 shadow-2xl shadow-violet-950/20"><p className="text-xs font-bold tracking-[.16em] text-violet-300">CALCULATED RESULT</p><div className="mt-4 flex items-end justify-between"><div><p className="text-xs text-zinc-400">총 공격력</p><p className="mt-1 text-4xl font-black tracking-tight">{format(calculation?.result.attack ?? 0)}</p></div>{calculation?.grade && <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-sm font-bold text-violet-100">{calculation.grade.grade ?? "평가 중"}</span>}</div><dl className="mt-5 grid grid-cols-2 gap-2">{statCards.map(([label, value]) => <div className="rounded-xl border border-white/8 bg-black/20 p-3" key={label}><dt className="text-xs text-zinc-400">{label}</dt><dd className="mt-1 text-lg font-bold">{format(value)}<span className="ml-0.5 text-xs text-zinc-500">%</span></dd></div>)}</dl>{calculation?.grade?.unmetRequirements.length ? <div className="mt-4 rounded-xl border border-violet-300/20 bg-violet-400/10 p-3"><p className="text-sm font-bold text-violet-100">다음 등급까지</p><ul className="mt-2 space-y-1 text-xs text-violet-100/80">{calculation.grade.unmetRequirements.map((requirement) => <li key={requirement.stat}>{requirement.label} <strong>+{format(requirement.minimum - calculation.result[requirement.stat])}</strong></li>)}</ul></div> : null}</section>

          {improvementActions.length > 0 && <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5"><h2 className="text-sm font-bold text-amber-100">추천 개선 순서</h2><ol className="mt-3 space-y-3">{improvementActions.map((action, index) => { const missing = Math.max(0, action.minimum - (calculation?.result[action.stat] ?? 0)); return <li className="flex gap-3 text-xs leading-5 text-zinc-300" key={action.stat}><span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-300/15 font-bold text-amber-200">{index + 1}</span><span>{action.replacement ? <>Echo {action.replacement.slot} 주옵션을 <strong>{statLabels[action.replacement.statKey as StatKey]} +{action.replacement.value}%</strong>로 교체해 보세요.</> : <><strong>{action.label} +{format(missing)}</strong>를 부옵션에서 우선 확보하세요.</>}</span></li>; })}</ol></section>}

          <section className="rounded-2xl border border-white/10 bg-zinc-900/75 p-5"><h2 className="text-sm font-bold">빌드 저장</h2><input aria-label="빌드 이름" className={inputClass} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /><div className="mt-3 grid grid-cols-2 gap-2"><button className="rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50" disabled={saving || !name.trim()} onClick={save}>{saving ? "저장 중…" : profileId ? "수정 저장" : "빌드 저장"}</button><button className="rounded-xl border border-white/12 px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5" onClick={newBuild}>새 빌드</button></div>{message && <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300" role="status">{message}</p>}</section>

          {profiles.length > 0 && <section className="rounded-2xl border border-white/10 bg-zinc-900/75 p-5"><h2 className="text-sm font-bold">저장한 빌드</h2><label className="mt-3 block text-xs text-zinc-500">현재 결과와 비교<select className={inputClass} value={comparisonProfileId ?? ""} onChange={(event) => setComparisonProfileId(event.target.value || undefined)}><option value="">비교할 빌드 선택</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>{comparisonProfile && calculation && <dl className="mt-3 space-y-1.5">{([['ATK', 'attack'], ['CRIT Rate', 'critRate'], ['CRIT DMG', 'critDamage'], ['Energy Regen', 'energyRegen'], ['Fusion DMG', 'fusionDamageBonus'], ['Spectro DMG', 'spectroDamageBonus']] as const).map(([label, key]) => { const difference = calculation.result[key] - (comparisonProfile.calculatedResult[key] ?? 0); return <div className="grid grid-cols-[1fr_auto] rounded-lg bg-black/20 px-3 py-2 text-xs" key={key}><dt className="text-zinc-400">{label}</dt><dd className={difference === 0 ? "text-zinc-500" : difference > 0 ? "text-emerald-300" : "text-rose-300"}>{difference > 0 ? "+" : ""}{format(difference)}</dd></div>; })}</dl>}<ul className="mt-4 space-y-1 border-t border-white/8 pt-3">{profiles.map((profile) => <li className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-white/5" key={profile.id}><button className="min-w-0 truncate text-left text-sm font-semibold text-zinc-200" onClick={() => load(profile)}>{profile.name}</button><div className="flex shrink-0 gap-3 text-xs"><button className="text-zinc-400 hover:text-white" onClick={() => duplicate(profile)}>복제</button><button className="text-rose-300 hover:text-rose-200" onClick={() => { if (comparisonProfileId === profile.id) setComparisonProfileId(undefined); void remove(profile.id); }}>삭제</button></div></li>)}</ul></section>}
        </aside>
      </div>
    </div>
  </main>;
}
