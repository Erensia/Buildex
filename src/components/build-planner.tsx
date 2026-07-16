"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";
import type { StatKey, StatValues } from "@/lib/formula/stats";
import { FORMULA_VERSION } from "@/lib/formula/versions";
import { signOut } from "next-auth/react";

type MainStat = { key: StatKey; label: string; value: number };

const mainStatOptions: Record<4 | 3 | 1, MainStat[]> = {
  4: [
    { key: "critRate", label: "치명타 확률 22%", value: 22 },
    { key: "critDamage", label: "치명타 피해 44%", value: 44 },
    { key: "attackPercent", label: "공격력 33%", value: 33 },
  ],
  3: [
    { key: "fusionDamageBonus", label: "용융 피해 보너스 30%", value: 30 },
    { key: "attackPercent", label: "공격력 30%", value: 30 },
    { key: "energyRegen", label: "공명 효율 32%", value: 32 },
  ],
  1: [{ key: "attackPercent", label: "공격력 18%", value: 18 }],
};

const echoSlots = [
  { id: "echo-1", label: "4코 악몽 · 지옥불 기사", cost: 4 as const },
  { id: "echo-2", label: "3코 에코 1", cost: 3 as const },
  { id: "echo-3", label: "3코 에코 2", cost: 3 as const },
  { id: "echo-4", label: "1코 에코 1", cost: 1 as const },
  { id: "echo-5", label: "1코 에코 2", cost: 1 as const },
];

const initialMainStats = ["critRate", "fusionDamageBonus", "attackPercent", "attackPercent", "attackPercent"];
const trackedStats: { key: StatKey; label: string; step: number }[] = [
  { key: "flatAttack", label: "고정 공격력", step: 1 },
  { key: "critRate", label: "치명타 확률", step: 0.1 },
  { key: "critDamage", label: "치명타 피해", step: 0.1 },
  { key: "energyRegen", label: "공명 효율", step: 0.1 },
  { key: "fusionDamageBonus", label: "용융 피해 보너스", step: 0.1 },
];

type SavedProfile = {
  id: string;
  name: string;
  calculatedResult: { attack: number; critRate: number; critDamage: number };
};

function display(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function BuildPlanner({ userName }: { userName: string }) {
  const [selectedMainStats, setSelectedMainStats] = useState(initialMainStats);
  const [subStats, setSubStats] = useState<StatValues>({});
  const [activeBuffIds, setActiveBuffIds] = useState<string[]>([]);
  const [profileName, setProfileName] = useState("장리 S0 전무 43311");
  const [saveMessage, setSaveMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  useEffect(() => {
    void fetch("/api/build-profiles")
      .then((response) => response.ok ? response.json() : [])
      .then((items: SavedProfile[]) => setProfiles(items));
  }, []);

  const calculation = useMemo(() => {
    const echoes = echoSlots.map((slot, index) => {
      const selected = mainStatOptions[slot.cost].find((option) => option.key === selectedMainStats[index]) ?? mainStatOptions[slot.cost][0];
      return { id: slot.id, label: slot.label, stats: { [selected.key]: selected.value } };
    });
    const result = calculateBuildStats({
      character: { id: "changli", label: "장리", stats: { baseAttack: 462, critRate: 5 } },
      weapon: { id: "blazing-brilliance", label: "솟아오르는 화염", stats: { baseAttack: 588, critDamage: 48.6 } },
      echoes: [...echoes, { id: "sub-stats", label: "부옵 합계", stats: subStats }],
      activeBuffIds,
    }, CHANGLI_LUPA_BRANT_BUFFS);
    return { result, grade: evaluateBuildGrade(result, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS) };
  }, [activeBuffIds, selectedMainStats, subStats]);

  function updateMainStat(index: number, key: string) {
    setSelectedMainStats((current) => current.map((value, itemIndex) => itemIndex === index ? key : value));
  }

  function updateSubStat(key: StatKey, value: string) {
    const numericValue = Number(value);
    setSubStats((current) => ({ ...current, [key]: Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0 }));
  }

  function toggleBuff(id: string) {
    setActiveBuffIds((current) => current.includes(id) ? current.filter((buffId) => buffId !== id) : [...current, id]);
  }

  async function saveProfile() {
    setSaving(true);
    setSaveMessage(undefined);
    const payload = {
      name: profileName,
      characterKey: "changli",
      weaponKey: "blazing-brilliance",
      echoes: echoSlots.map((slot, index) => ({
        slot: index + 1,
        setKey: "molten-rift",
        cost: slot.cost,
        mainStat: selectedMainStats[index],
        subStats: index === 0 ? Object.entries(subStats).map(([key, value]) => ({ key, value })) : [],
      })),
      activeBuffIds,
      formulaVersion: FORMULA_VERSION,
    };
    const response = await fetch("/api/build-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      setProfiles((current) => [body as SavedProfile, ...current]);
      setSaveMessage("빌드를 저장했습니다.");
    } else {
      setSaveMessage(body?.error ?? "빌드를 저장하지 못했습니다.");
    }
    setSaving(false);
  }

  async function deleteProfile(id: string) {
    const response = await fetch(`/api/build-profiles/${id}`, { method: "DELETE" });
    if (response.ok) setProfiles((current) => current.filter((profile) => profile.id !== id));
    else setSaveMessage("저장된 빌드를 삭제하지 못했습니다.");
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-16 text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link className="text-xl font-black tracking-tight" href="/">BUILDEX</Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-zinc-400 sm:block">{userName}님</span>
          <button className="text-xs font-semibold text-zinc-400 hover:text-white" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button>
          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">명조 3.5 · 장리 S0 전무</span>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-violet-400">BUILD INPUT</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">장리 빌드 플래너</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">43311 프리셋의 주옵과 부옵 합계를 입력하세요. 파티 효과는 조건을 만족했을 때만 적용됩니다.</p>
          </div>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="font-bold">에코 주옵</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {echoSlots.map((slot, index) => (
                <label className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4" key={slot.id}>
                  <span className="block text-sm font-semibold">{slot.label}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{slot.cost}코스트 · 5성 +25</span>
                  <select className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-400" value={selectedMainStats[index]} onChange={(event) => updateMainStat(index, event.target.value)}>
                    {mainStatOptions[slot.cost].map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="font-bold">빌드 프리셋 저장</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400" value={profileName} maxLength={80} onChange={(event) => setProfileName(event.target.value)} />
              <button className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={saving || !profileName.trim()} onClick={saveProfile}>{saving ? "저장 중" : "현재 빌드 저장"}</button>
            </div>
            {saveMessage && <p className="mt-3 text-sm text-zinc-300">{saveMessage}</p>}
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="font-bold">에코 부옵 합계</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">5개 에코에서 얻은 수치만 합산해 입력합니다. 게임 기본 스탯과 주옵은 자동 반영됩니다.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {trackedStats.map((stat) => (
                <label className="text-sm font-medium" key={stat.key}>{stat.label}
                  <input className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-400" min="0" step={stat.step} type="number" value={subStats[stat.key] ?? ""} onChange={(event) => updateSubStat(stat.key, event.target.value)} />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="font-bold">조건부 효과</h2>
            <div className="mt-4 space-y-3">
              {CHANGLI_LUPA_BRANT_BUFFS.map((buff) => (
                <label className="flex cursor-pointer gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4" key={buff.id}>
                  <input checked={activeBuffIds.includes(buff.id)} className="mt-1 size-4 accent-violet-500" onChange={() => toggleBuff(buff.id)} type="checkbox" />
                  <span><strong className="block text-sm">{buff.label}</strong><span className="mt-1 block text-xs leading-5 text-zinc-500">{buff.condition}</span></span>
                </label>
              ))}
            </div>
          </section>
        </section>

        <aside className="h-fit rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-500/15 to-zinc-900 p-6 lg:sticky lg:top-6">
          <p className="text-sm font-semibold text-violet-300">CALCULATED RESULT</p>
          <div className="mt-5 rounded-2xl bg-zinc-950/70 p-5">
            <p className="text-sm text-zinc-400">현재 등급</p>
            <p className="mt-1 text-3xl font-black">{calculation.grade.grade ? ({ standard: "준종결", good: "종결", excellent: "극종결" }[calculation.grade.grade]) : "미달"}</p>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["공격력", calculation.result.attack], ["치명타 확률", `${display(calculation.result.critRate)}%`],
              ["치명타 피해", `${display(calculation.result.critDamage)}%`], ["공명 효율", `${display(calculation.result.energyRegen)}%`],
              ["용융 피해", `${display(calculation.result.fusionDamageBonus)}%`], ["공명 스킬 피해", `${display(calculation.result.resonanceSkillDamageBonus)}%`],
            ].map(([label, value]) => <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4" key={String(label)}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 text-lg font-bold">{value}</dd></div>)}
          </dl>
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="font-bold">저장한 빌드</h2>
            {profiles.length === 0 ? <p className="mt-3 text-sm text-zinc-500">아직 저장한 빌드가 없습니다.</p> : <ul className="mt-3 space-y-3">
              {profiles.map((profile) => <li className="flex items-center justify-between gap-3" key={profile.id}>
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.name}</p><p className="text-xs text-zinc-500">공격력 {profile.calculatedResult.attack} · 치명 {display(profile.calculatedResult.critRate)} / {display(profile.calculatedResult.critDamage)}</p></div>
                <button className="shrink-0 text-xs font-semibold text-rose-300 hover:text-rose-200" onClick={() => deleteProfile(profile.id)}>삭제</button>
              </li>)}
            </ul>}
          </div>
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="font-bold">다음 목표</h2>
            {calculation.grade.unmetRequirements.length > 0 ? <ul className="mt-3 space-y-2 text-sm text-zinc-300">{calculation.grade.unmetRequirements.map((requirement) => <li key={requirement.stat}>· {requirement.label} {requirement.minimum}% 이상</li>)}</ul> : <p className="mt-3 text-sm text-emerald-300">극종결 기준을 달성했습니다.</p>}
          </div>
          <p className="mt-5 text-xs leading-5 text-zinc-500">저장 기능은 로그인 및 사용자 소유권 검증 단계와 함께 추가됩니다. 현재 결과는 이 화면에서만 계산됩니다.</p>
        </aside>
      </div>
    </main>
  );
}
