"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";
import { ZANI_S0_GRADE_REQUIREMENTS } from "@/lib/formula/zani-phoebe-verina";
import { HIYUKI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/hiyuki-chisa-lucilla";
import { FORMULA_VERSION, type BuildGrade } from "@/lib/formula/versions";
import { getPersonalBuffs, resolvePartyBuffs } from "@/lib/formula/party-buffs";
import { resolveEchoSetEffects } from "@/lib/formula/echo-sets";
import { addStats, type CalculatedStats, type StatKey, type StatValues } from "@/lib/formula/stats";
import { getSubstatQuality } from "@/lib/formula/substat-analysis";
import { getImprovementActions } from "@/lib/formula/build-improvements";
import { echoSubstatRolls } from "@/lib/formula/echo-substats";
import { MemberCollections } from "@/components/member-collections";

type Character = { externalKey: string; name: string; baseStats: StatValues & { weaponType?: string } };
type Weapon = { externalKey: string; name: string; weaponType: string; stats: StatValues };
type Echo = { id: string; externalKey: string; name: string; cost: 1 | 3 | 4 };
type EchoSet = { id: string; externalKey: string; name: string; effects: Record<string, unknown> };
type MainStat = { cost: 1 | 3 | 4; statKey: StatKey; value: number };
type Source = { label: string; url: string };
type BuildData = { games: { name: string; currentDataVersion: string | null; sourceSnapshot: string | null; sourceManifest: Source[]; releaseId: string }[]; characters: Character[]; weapons: Weapon[]; echoes: Echo[]; echoSets: EchoSet[]; mainStats: MainStat[]; partyBuffs: PartyBuff[]; echoSetMemberships: { echoSetId: string; echoId: string }[] };
type BuildInput = { name: string; characterKey: string; weaponKey: string; echoes: { slot: number; echoKey?: string; setKey: string; cost: 1 | 3 | 4; mainStat: string; subStats: { key: string; value: number }[] }[]; activeBuffIds: string[]; partyMemberKeys: string[]; formulaVersion: string };
type SavedProfile = { id: string; name: string; dataReleaseId: string | null; dataVersion: string; formulaVersion: string; buildInput: BuildInput; calculatedResult: CalculatedStats & { grade?: BuildGrade | null } };
type PartyBuff = { targetCharacterKey: string; providerCharacterKey: string; externalKey: string; label: string; condition: string; stats: StatValues };

const slots: { slot: number; cost: 1 | 3 | 4 }[] = [{ slot: 1, cost: 4 }, { slot: 2, cost: 3 }, { slot: 3, cost: 3 }, { slot: 4, cost: 1 }, { slot: 5, cost: 1 }];
const statLabels: Record<StatKey, string> = { baseAttack: "기초 공격력", flatAttack: "공격력", attackPercent: "공격력 %", flatHealth: "HP", healthPercent: "HP %", flatDefense: "방어력", defensePercent: "방어력 %", critRate: "치명타 확률", critDamage: "치명타 피해", energyRegen: "공명 효율", fusionDamageBonus: "용융 피해 보너스", spectroDamageBonus: "회절 피해 보너스", glacioDamageBonus: "응결 피해 보너스", electroDamageBonus: "전도 피해 보너스", aeroDamageBonus: "기류 피해 보너스", havocDamageBonus: "인멸 피해 보너스", basicAttackDamageBonus: "일반 공격 피해 보너스", heavyAttackDamageBonus: "강공격 피해 보너스", resonanceSkillDamageBonus: "공명 스킬 피해 보너스", resonanceLiberationDamageBonus: "공명 해방 피해 보너스" };
const trackedStats = Object.keys(echoSubstatRolls) as (keyof typeof echoSubstatRolls)[];
const inputClass = "mt-2 w-full rounded-xl border border-transparent bg-[#0f0c15] px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/15";

function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
const percentStats = new Set<string>(["attackPercent", "healthPercent", "defensePercent", "critRate", "critDamage", "energyRegen", "fusionDamageBonus", "spectroDamageBonus", "glacioDamageBonus", "electroDamageBonus", "aeroDamageBonus", "havocDamageBonus", "basicAttackDamageBonus", "heavyAttackDamageBonus", "resonanceSkillDamageBonus", "resonanceLiberationDamageBonus"]);
function formatStat(value: number, stat: string) { return `${format(value)}${percentStats.has(stat) ? "%" : ""}`; }
function buildInputSignature(input: BuildInput) { return JSON.stringify({ characterKey: input.characterKey, weaponKey: input.weaponKey, echoes: input.echoes, activeBuffIds: input.activeBuffIds, partyMemberKeys: input.partyMemberKeys }); }

export function BuildPlanner({ userName }: { userName: string }) {
  const [data, setData] = useState<BuildData>();
  const [latestData, setLatestData] = useState<BuildData>();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [profileId, setProfileId] = useState<string>();
  const [loadedProfile, setLoadedProfile] = useState<SavedProfile>();
  const [comparisonProfileId, setComparisonProfileId] = useState<string>();
  const [name, setName] = useState("새 빌드");
  const [characterKey, setCharacterKey] = useState("");
  const [weaponKey, setWeaponKey] = useState("");
  const [setKeys, setSetKeys] = useState<string[]>([]);
  const [echoKeys, setEchoKeys] = useState<string[]>([]);
  const [mainStats, setMainStats] = useState<string[]>([]);
  const [subStats, setSubStats] = useState<StatValues[]>([]);
  const [activeBuffIds, setActiveBuffIds] = useState<string[]>([]);
  const [partyMemberKeys, setPartyMemberKeys] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([fetch("/api/build-data"), fetch("/api/build-profiles")]).then(async ([dataResponse, profilesResponse]) => {
      const loadedData = await dataResponse.json();
      const loadedProfiles = await profilesResponse.json();
      if (!dataResponse.ok || !Array.isArray(loadedData.characters)) {
        setMessage(loadedData?.error ?? "빌드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const buildData = loadedData as BuildData;
      setData(buildData); setLatestData(buildData); setProfiles(profilesResponse.ok && Array.isArray(loadedProfiles) ? loadedProfiles as SavedProfile[] : []);
      const character = buildData.characters[0]; const echoSet = buildData.echoSets[0];
      if (character) setCharacterKey(character.externalKey);
      if (echoSet) setSetKeys(slots.map(() => echoSet.externalKey));
      setMainStats(slots.map((slot) => buildData.mainStats.find((item) => item.cost === slot.cost)?.statKey ?? ""));
      setEchoKeys(slots.map((slot) => buildData.echoes.find((item) => item.cost === slot.cost)?.externalKey ?? ""));
      setSubStats(slots.map(() => ({})));
    }).catch(() => setMessage("빌드 데이터를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요."));
  }, []);

  const character = data?.characters?.find((item) => item.externalKey === characterKey);
  const compatibleWeapons = useMemo(() => data?.weapons?.filter((weapon) => !character?.baseStats.weaponType || weapon.weaponType === character.baseStats.weaponType) ?? [], [data, character]);
  const weapon = compatibleWeapons.find((item) => item.externalKey === weaponKey) ?? compatibleWeapons[0];
  const selectedPartyMemberKeys = useMemo(() => partyMemberKeys.filter((member) => member !== characterKey), [characterKey, partyMemberKeys]);
  const partyBuffEvidence = useMemo(() => resolvePartyBuffs(characterKey, selectedPartyMemberKeys, data?.partyBuffs ?? []), [characterKey, data?.partyBuffs, selectedPartyMemberKeys]);
  const buffs = useMemo(() => [...getPersonalBuffs(characterKey, weapon?.externalKey), ...partyBuffEvidence.filter((evidence) => evidence.available).map((evidence) => evidence.buff)], [characterKey, partyBuffEvidence, weapon?.externalKey]);
  const optionsFor = useCallback((cost: 1 | 3 | 4) => data?.mainStats.filter((item) => item.cost === cost) ?? [], [data]);
  const echoesFor = useCallback((setKey: string, cost: 1 | 3 | 4) => {
    const echoSet = data?.echoSets.find((item) => item.externalKey === setKey);
    if (!echoSet) return [];
    const echoIds = new Set(data?.echoSetMemberships.filter((item) => item.echoSetId === echoSet.id).map((item) => item.echoId));
    return data?.echoes.filter((item) => item.cost === cost && echoIds.has(item.id)) ?? [];
  }, [data]);
  const currentInput = useMemo<BuildInput>(() => ({ name, characterKey, weaponKey: weaponKey || weapon?.externalKey || "", echoes: slots.map((slot, index) => ({ slot: slot.slot, echoKey: echoKeys[index], setKey: setKeys[index] ?? "", cost: slot.cost, mainStat: mainStats[index], subStats: Object.entries(subStats[index] ?? {}).map(([key, value]) => ({ key, value: value ?? 0 })) })), activeBuffIds: activeBuffIds.filter((id) => buffs.some((buff) => buff.id === id)), partyMemberKeys: selectedPartyMemberKeys, formulaVersion: FORMULA_VERSION }), [activeBuffIds, buffs, characterKey, echoKeys, mainStats, name, selectedPartyMemberKeys, setKeys, subStats, weapon?.externalKey, weaponKey]);
  const calculation = useMemo(() => {
    if (!character || !weapon) return null;
    const echoes = slots.map((slot, index) => {
      const option = optionsFor(slot.cost).find((item) => item.statKey === mainStats[index]);
      return { id: `echo-${slot.slot}`, label: `Echo ${slot.slot}`, stats: addStats(option ? { [option.statKey]: option.value } as StatValues : {}, subStats[index] ?? {}) };
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
  const isReplayingStoredResult = Boolean(loadedProfile && loadedProfile.formulaVersion !== FORMULA_VERSION && buildInputSignature(loadedProfile.buildInput) === buildInputSignature(currentInput));
  const displayedCalculation = isReplayingStoredResult && loadedProfile
    ? { result: loadedProfile.calculatedResult, grade: loadedProfile.calculatedResult.grade ? { grade: loadedProfile.calculatedResult.grade, achievedGrades: [], unmetRequirements: [] } : null, conditionalSetBuffs: calculation?.conditionalSetBuffs ?? [] }
    : calculation;
  const comparisonProfile = profiles.find((profile) => profile.id === comparisonProfileId);
  const improvementActions = !isReplayingStoredResult && displayedCalculation?.grade ? getImprovementActions(displayedCalculation.grade.unmetRequirements, slots.map((slot, index) => ({ ...slot, mainStat: mainStats[index] ?? "" })), data?.mainStats ?? []) : [];

  function payload(): BuildInput { return currentInput; }
  async function save() { setSaving(true); setMessage(undefined); const response = await fetch(profileId ? `/api/build-profiles/${profileId}` : "/api/build-profiles", { method: profileId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) }); const body = await response.json().catch(() => null); if (!response.ok) setMessage(body?.error ?? "빌드를 저장하지 못했습니다."); else { setProfiles((current) => profileId ? current.map((item) => item.id === body.id ? body : item) : [body, ...current]); setProfileId(body.id); setLoadedProfile(body as SavedProfile); setMessage(isReplayingStoredResult ? `현재 계산식(${FORMULA_VERSION})으로 재계산해 저장했습니다.` : "빌드를 저장했습니다."); } setSaving(false); }
  function applyInput(input: BuildInput) { setName(input.name); setCharacterKey(input.characterKey); setWeaponKey(input.weaponKey); setSetKeys(input.echoes.map((echo) => echo.setKey)); setEchoKeys(input.echoes.map((echo) => echo.echoKey ?? "")); setMainStats(input.echoes.map((echo) => echo.mainStat)); setSubStats(input.echoes.map((echo) => Object.fromEntries(echo.subStats.map((stat) => [stat.key, stat.value])) as StatValues)); setActiveBuffIds(input.activeBuffIds); setPartyMemberKeys(input.partyMemberKeys ?? []); }
  async function load(profile: SavedProfile) { const loadedReleaseId = data?.games[0]?.releaseId; if (profile.dataReleaseId && profile.dataReleaseId !== loadedReleaseId) { const response = await fetch(`/api/build-data?releaseId=${encodeURIComponent(profile.dataReleaseId)}`); const historicalData = await response.json().catch(() => null); if (!response.ok) { setMessage(historicalData?.error ?? "저장 당시의 게임 데이터를 불러올 수 없습니다."); return; } setData(historicalData as BuildData); } applyInput(profile.buildInput); setProfileId(profile.id); setLoadedProfile(profile); setMessage(profile.formulaVersion !== FORMULA_VERSION ? `${profile.name}을 저장 당시 데이터(v${profile.dataVersion})와 계산식(${profile.formulaVersion}) 결과로 불러왔습니다.` : `${profile.name}을 저장 당시 데이터(v${profile.dataVersion})로 불러왔습니다.`); }
  function newBuild() { if (latestData) setData(latestData); setProfileId(undefined); setLoadedProfile(undefined); setName("새 빌드"); setSubStats(slots.map(() => ({}))); setActiveBuffIds([]); setMessage("현재 공개 데이터로 새 빌드를 만듭니다."); }
  function duplicate(profile: SavedProfile) { if (latestData) setData(latestData); applyInput(profile.buildInput); setProfileId(undefined); setLoadedProfile(undefined); setName(`${profile.name} 복사본`); setMessage("현재 공개 데이터로 복사했습니다. 호환되지 않는 선택지는 저장 전에 조정해 주세요."); }
  function animatePageScroll(target: number) {
    const start = window.scrollY;
    const distance = target - start;
    if (!distance) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo({ top: target }); return; }
    const duration = Math.min(850, Math.max(450, Math.abs(distance) * 0.18));
    const startedAt = performance.now();
    const easeInOutCubic = (progress: number) => progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    const frame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo({ top: start + distance * easeInOutCubic(progress) });
      if (progress < 1) window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame(frame);
  }

  async function remove(id: string) { if (!window.confirm("이 빌드를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return; const response = await fetch(`/api/build-profiles/${id}`, { method: "DELETE" }); if (response.ok) { setProfiles((items) => items.filter((item) => item.id !== id)); if (profileId === id) newBuild(); } }

  if (!data) return <main className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-400">빌드 데이터를 불러오는 중…</main>;
  const game = data.games[0];
  const statCards = [["CRIT Rate", displayedCalculation?.result.critRate ?? 0], ["CRIT DMG", displayedCalculation?.result.critDamage ?? 0], ["Energy Regen", displayedCalculation?.result.energyRegen ?? 0], ["Fusion DMG", displayedCalculation?.result.fusionDamageBonus ?? 0], ["Spectro DMG", displayedCalculation?.result.spectroDamageBonus ?? 0], ["Glacio DMG", displayedCalculation?.result.glacioDamageBonus ?? 0], ["Electro DMG", displayedCalculation?.result.electroDamageBonus ?? 0], ["Aero DMG", displayedCalculation?.result.aeroDamageBonus ?? 0], ["Havoc DMG", displayedCalculation?.result.havocDamageBonus ?? 0]] as const;

  return <main className="build-planner min-h-screen bg-[#09070d] pb-16 text-zinc-100">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="text-lg font-black tracking-tight text-white" href="/">BUILDEX<span className="text-violet-400">.</span></Link>
      <div className="flex items-center gap-3 text-sm"><span className="hidden text-zinc-400 sm:block">{userName}</span><button className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 transition hover:border-white/25 hover:text-white" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button></div>
    </header>

    <section className="mx-auto max-w-7xl px-5 pb-2 sm:px-8">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-violet-300">PARTY STAT CALCULATION</p><h2 className="mt-1 text-lg font-bold">파티 편성 및 버프 근거</h2><p className="mt-1 text-xs text-zinc-500">지원 캐릭터가 편성돼야 해당 파티 버프를 활성화할 수 있습니다. DPS는 계산하지 않습니다.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-zinc-400">지원 캐릭터 1<select className={inputClass} value={partyMemberKeys[0] ?? ""} onChange={(event) => setPartyMemberKeys((members) => [event.target.value, members[1]].filter(Boolean))}><option value="">선택 안 함</option>{data.characters.filter((item) => item.externalKey !== characterKey && item.externalKey !== partyMemberKeys[1]).map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="text-xs font-medium text-zinc-400">지원 캐릭터 2<select className={inputClass} value={partyMemberKeys[1] ?? ""} onChange={(event) => setPartyMemberKeys((members) => [members[0], event.target.value].filter(Boolean))}><option value="">선택 안 함</option>{data.characters.filter((item) => item.externalKey !== characterKey && item.externalKey !== partyMemberKeys[0]).map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label></div></div>
        {partyBuffEvidence.length > 0 && <ul className="mt-4 grid gap-2 md:grid-cols-2">{partyBuffEvidence.map((evidence) => { const provider = data.characters.find((item) => item.externalKey === evidence.requiredMemberKey)?.name ?? evidence.requiredMemberKey; return <li className={`rounded-xl border p-3 text-xs ${evidence.available ? "border-emerald-400/25 bg-emerald-400/5 text-emerald-100" : "border-white/8 bg-black/15 text-zinc-500"}`} key={evidence.buff.id}><strong className="block">{evidence.available ? "적용 가능" : "미적용"} · {provider}</strong><span className="mt-1 block">{evidence.buff.label}</span><small className="mt-1 block opacity-80">{evidence.available ? evidence.buff.condition : `${provider}을(를) 편성하면 조건을 확인할 수 있습니다.`}</small></li>; })}</ul>}
      </div>
    </section>

    {partyBuffEvidence.some((evidence) => evidence.available) && <p className="mx-auto max-w-7xl px-5 pb-3 text-xs text-zinc-400 sm:px-8">편성이 충족된 버프도 아래의 조건 체크를 켜야 최종 스탯에 반영됩니다. 현재 반영 중인 파티 버프: <strong className="text-emerald-200">{partyBuffEvidence.filter((evidence) => evidence.available && activeBuffIds.includes(evidence.buff.id)).map((evidence) => evidence.buff.label).join(", ") || "없음"}</strong></p>}

    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-7 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold tracking-[.2em] text-violet-400">WUTHERING WAVES · BUILD PLANNER</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">빌드를 설계하고, 바로 비교하세요.</h1><p className="mt-2 text-sm text-zinc-400">선택을 바꿀 때마다 결과와 다음 개선 포인트가 즉시 반영됩니다.</p></div>
        {game && <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-400"><span>{game.name} · Data v{game.currentDataVersion ?? "—"}{game.sourceSnapshot && ` · 검증 ${game.sourceSnapshot}`}</span>{game.sourceManifest.length > 0 && <span> · {game.sourceManifest.map((source, index) => <span key={source.url}>{index > 0 && " · "}<a className="text-violet-300 underline-offset-4 hover:underline" href={source.url} rel="noreferrer" target="_blank">{source.label}</a></span>)}</span>}</div>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 shadow-xl shadow-black/10 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-violet-500 text-xs font-black">1</span><div><h2 className="font-bold">캐릭터와 무기</h2><p className="text-xs text-zinc-500">계산의 기준이 되는 조합입니다.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-zinc-300">캐릭터<select className={inputClass} value={characterKey} onChange={(e) => { setCharacterKey(e.target.value); setWeaponKey(""); }}><option value="" disabled>캐릭터를 선택하세요</option>{data.characters.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="text-sm font-medium text-zinc-300">무기<select className={inputClass} value={weapon?.externalKey ?? ""} onChange={(e) => setWeaponKey(e.target.value)}>{compatibleWeapons.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label></div></section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 shadow-xl shadow-black/10 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-violet-500 text-xs font-black">2</span><div><h2 className="font-bold">에코 세팅</h2><p className="text-xs text-zinc-500">코스트와 세트에 맞는 주옵션을 선택하세요.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{slots.map((slot, index) => <div key={slot.slot} className="rounded-xl border border-white/8 bg-zinc-950/45 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Echo {slot.slot}</h3><span className="rounded-full bg-white/8 px-2 py-0.5 text-xs font-bold text-zinc-300">Cost {slot.cost}</span></div><label className="block text-xs text-zinc-400">에코<select className={inputClass} value={echoKeys[index] ?? ""} onChange={(e) => setEchoKeys((items) => items.map((item, i) => i === index ? e.target.value : item))}>{echoesFor(setKeys[index] ?? "", slot.cost).map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="mt-3 block text-xs text-zinc-400">세트<select className={inputClass} value={setKeys[index] ?? ""} onChange={(e) => { const nextSetKey = e.target.value; setSetKeys((items) => items.map((item, i) => i === index ? nextSetKey : item)); setEchoKeys((items) => items.map((item, i) => i === index ? (echoesFor(nextSetKey, slot.cost)[0]?.externalKey ?? "") : item)); }}>{data.echoSets.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="mt-3 block text-xs text-zinc-400">주옵션<select className={inputClass} value={mainStats[index] ?? ""} onChange={(e) => setMainStats((items) => items.map((item, i) => i === index ? e.target.value : item))}>{optionsFor(slot.cost).map((item) => <option key={item.statKey} value={item.statKey}>{statLabels[item.statKey]} +{formatStat(item.value, item.statKey)}</option>)}</select></label></div>)}</div></section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 shadow-xl shadow-black/10 sm:p-6"><div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-violet-500 text-xs font-black">3</span><div><h2 className="font-bold">부옵션</h2><p className="text-xs text-zinc-500">명조 에코의 실제 부옵션 롤 수치에서 선택합니다.</p></div></div><span className="hidden text-xs text-zinc-500 sm:block">에코당 최대 5개</span></div><div className="space-y-5">{slots.map((slot, index) => { const quality = getSubstatQuality(subStats[index] ?? {}); return <div key={slot.slot} className="border-t border-white/8 pt-5 first:border-0 first:pt-0"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Echo {slot.slot}</h3><span className="text-xs font-semibold text-violet-300">부옵션 {quality.count}/5 · 품질 {format(quality.score)}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{trackedStats.map((key) => { const selectedValue = subStats[index]?.[key]; const isAtLimit = quality.count >= 5 && selectedValue === undefined; const isFlatValue = key === "flatAttack" || key === "flatHealth" || key === "flatDefense"; return <label key={key} className="text-xs font-medium text-zinc-400">{statLabels[key]}<select className={inputClass} disabled={isAtLimit} value={selectedValue ?? ""} onChange={(e) => setSubStats((current) => current.map((stats, statIndex) => { if (statIndex !== index) return stats; if (!e.target.value) return Object.fromEntries(Object.entries(stats).filter(([statKey]) => statKey !== key)) as StatValues; return { ...stats, [key]: Number(e.target.value) }; }))}><option value="">선택 안 함</option>{echoSubstatRolls[key].map((value) => <option key={value} value={value}>+{format(value)}{isFlatValue ? "" : "%"}</option>)}</select></label>; })}</div></div>; })}</div></section>

          {(buffs.length > 0 || calculation?.conditionalSetBuffs.length) && <section className="rounded-2xl border border-white/10 bg-zinc-900/65 p-5 sm:p-6"><h2 className="font-bold">조건부 버프</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[...buffs, ...(calculation?.conditionalSetBuffs ?? [])].map((buff) => <label className="flex cursor-pointer gap-3 rounded-xl border border-white/8 bg-zinc-950/40 p-3 text-sm transition hover:border-violet-400/40" key={buff.id}><input className="mt-0.5 accent-violet-500" type="checkbox" checked={activeBuffIds.includes(buff.id)} onChange={() => setActiveBuffIds((items) => items.includes(buff.id) ? items.filter((id) => id !== buff.id) : [...items, buff.id])} /><span><strong className="block font-medium text-zinc-200">{buff.label}</strong><small className="text-zinc-500">{buff.condition}</small></span></label>)}</div></section>}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
          <MemberCollections builds={profiles.map((profile) => ({ id: profile.id, name: profile.name }))} />
          <section className="overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-b from-violet-950/55 to-zinc-900 p-5 shadow-2xl shadow-violet-950/20"><p className="text-xs font-bold tracking-[.16em] text-violet-300">{isReplayingStoredResult ? `SAVED RESULT · ${loadedProfile?.formulaVersion}` : "CALCULATED RESULT"}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-xs text-zinc-400">총 공격력</p><p className="mt-1 text-4xl font-black tracking-tight">{format(displayedCalculation?.result.attack ?? 0)}</p></div>{displayedCalculation?.grade && <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-sm font-bold text-violet-100">{displayedCalculation.grade.grade ?? "평가 중"}</span>}</div><dl className="mt-5 grid grid-cols-2 gap-2">{statCards.map(([label, value]) => <div className="rounded-xl border border-white/8 bg-black/20 p-3" key={label}><dt className="text-xs text-zinc-400">{label}</dt><dd className="mt-1 text-lg font-bold">{format(value)}<span className="ml-0.5 text-xs text-zinc-500">%</span></dd></div>)}</dl>{displayedCalculation?.grade?.unmetRequirements.length ? <div className="mt-4 rounded-xl border border-violet-300/20 bg-violet-400/10 p-3"><p className="text-sm font-bold text-violet-100">다음 등급까지</p><ul className="mt-2 space-y-1 text-xs text-violet-100/80">{displayedCalculation.grade.unmetRequirements.map((requirement) => <li key={requirement.stat}>{requirement.label} <strong>+{formatStat(requirement.minimum - displayedCalculation.result[requirement.stat], requirement.stat)}</strong></li>)}</ul></div> : null}</section>

          {improvementActions.length > 0 && <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5"><h2 className="text-sm font-bold text-amber-100">추천 개선 순서</h2><ol className="mt-3 space-y-3">{improvementActions.map((action, index) => { const missing = Math.max(0, action.minimum - (displayedCalculation?.result[action.stat] ?? 0)); return <li className="flex gap-3 text-xs leading-5 text-zinc-300" key={action.stat}><span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-300/15 font-bold text-amber-200">{index + 1}</span><span>{action.replacement ? <>Echo {action.replacement.slot} 주옵션을 <strong>{statLabels[action.replacement.statKey as StatKey]} +{formatStat(action.replacement.value, action.replacement.statKey)}</strong>로 교체해 보세요.</> : <><strong>{action.label} +{formatStat(missing, action.stat)}</strong>를 부옵션에서 우선 확보하세요.</>}</span></li>; })}</ol></section>}

          <section className="rounded-2xl border border-white/10 bg-zinc-900/75 p-5"><h2 className="text-sm font-bold">빌드 저장</h2><input aria-label="빌드 이름" className={inputClass} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /><div className="mt-3 grid grid-cols-2 gap-2"><button className="rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50" disabled={saving || !name.trim()} onClick={save}>{saving ? "저장 중…" : isReplayingStoredResult ? "현재 식으로 재계산" : profileId ? "수정 저장" : "빌드 저장"}</button><button className="rounded-xl border border-white/12 px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5" onClick={newBuild}>새 빌드</button></div>{message && <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300" role="status">{message}</p>}</section>

          {profiles.length > 0 && <section className="rounded-2xl border border-white/10 bg-zinc-900/75 p-5"><h2 className="text-sm font-bold">저장한 빌드</h2><label className="mt-3 block text-xs text-zinc-500">현재 결과와 비교<select className={inputClass} value={comparisonProfileId ?? ""} onChange={(event) => setComparisonProfileId(event.target.value || undefined)}><option value="">비교할 빌드 선택</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>{comparisonProfile && displayedCalculation && <dl className="mt-3 space-y-1.5">{([['ATK', 'attack'], ['CRIT Rate', 'critRate'], ['CRIT DMG', 'critDamage'], ['Energy Regen', 'energyRegen'], ['Fusion DMG', 'fusionDamageBonus'], ['Spectro DMG', 'spectroDamageBonus'], ['Glacio DMG', 'glacioDamageBonus']] as const).map(([label, key]) => { const difference = displayedCalculation.result[key] - comparisonProfile.calculatedResult[key]; return <div className="grid grid-cols-[1fr_auto] rounded-lg bg-black/20 px-3 py-2 text-xs" key={key}><dt className="text-zinc-400">{label}</dt><dd className={difference === 0 ? "text-zinc-500" : difference > 0 ? "text-emerald-300" : "text-rose-300"}>{difference > 0 ? "+" : ""}{format(difference)}</dd></div>; })}</dl>}<ul className="mt-4 space-y-1 border-t border-white/8 pt-3">{profiles.map((profile) => <li className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-white/5" key={profile.id}><button className="min-w-0 truncate text-left text-sm font-semibold text-zinc-200" onClick={() => load(profile)}>{profile.name}</button><div className="flex shrink-0 gap-3 text-xs"><button className="text-zinc-400 hover:text-white" onClick={() => duplicate(profile)}>복제</button><button className="text-rose-300 hover:text-rose-200" onClick={() => { if (comparisonProfileId === profile.id) setComparisonProfileId(undefined); void remove(profile.id); }}>삭제</button></div></li>)}</ul></section>}
        </aside>
      </div>
    </div>
    <nav aria-label="페이지 이동" className="fixed bottom-5 right-5 z-20 flex flex-col gap-2 sm:bottom-7 sm:right-7">
      <button aria-label="페이지 맨 위로 이동" className="build-scroll-control" onClick={() => animatePageScroll(0)} title="맨 위로 이동">
        <span aria-hidden="true">↑</span>
      </button>
      <button aria-label="페이지 맨 아래로 이동" className="build-scroll-control" onClick={() => animatePageScroll(document.documentElement.scrollHeight - window.innerHeight)} title="맨 아래로 이동">
        <span aria-hidden="true">↓</span>
      </button>
    </nav>
  </main>;
}
