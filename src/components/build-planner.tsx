"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";
import { FORMULA_VERSION } from "@/lib/formula/versions";
import type { StatKey, StatValues } from "@/lib/formula/stats";

type Character = { externalKey: string; name: string; baseStats: StatValues & { weaponType?: string } };
type Weapon = { externalKey: string; name: string; weaponType: string; stats: StatValues };
type Echo = { externalKey: string; name: string; cost: 1 | 3 | 4 };
type EchoSet = { externalKey: string; name: string };
type MainStat = { cost: 1 | 3 | 4; statKey: StatKey; value: number };
type BuildData = { characters: Character[]; weapons: Weapon[]; echoes: Echo[]; echoSets: EchoSet[]; mainStats: MainStat[] };
type BuildInput = { name: string; characterKey: string; weaponKey: string; echoes: { slot: number; echoKey?: string; setKey: string; cost: 1 | 3 | 4; mainStat: string; subStats: { key: string; value: number }[] }[]; activeBuffIds: string[]; formulaVersion: string };
type SavedProfile = { id: string; name: string; buildInput: BuildInput; calculatedResult: { attack: number; critRate: number; critDamage: number } };

const slots: { slot: number; cost: 1 | 3 | 4 }[] = [{ slot: 1, cost: 4 }, { slot: 2, cost: 3 }, { slot: 3, cost: 3 }, { slot: 4, cost: 1 }, { slot: 5, cost: 1 }];
const statLabels: Record<StatKey, string> = { baseAttack: "Base ATK", flatAttack: "Flat ATK", attackPercent: "ATK %", critRate: "CRIT Rate", critDamage: "CRIT DMG", energyRegen: "Energy Regen", fusionDamageBonus: "Fusion DMG", resonanceSkillDamageBonus: "Resonance Skill DMG" };
const trackedStats: StatKey[] = ["flatAttack", "critRate", "critDamage", "energyRegen", "fusionDamageBonus"];

function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

export function BuildPlanner({ userName }: { userName: string }) {
  const [data, setData] = useState<BuildData>();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [profileId, setProfileId] = useState<string>();
  const [name, setName] = useState("New build");
  const [characterKey, setCharacterKey] = useState("");
  const [weaponKey, setWeaponKey] = useState("");
  const [setKey, setSetKey] = useState("");
  const [echoKeys, setEchoKeys] = useState<string[]>([]);
  const [mainStats, setMainStats] = useState<string[]>([]);
  const [subStats, setSubStats] = useState<StatValues>({});
  const [activeBuffIds, setActiveBuffIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([fetch("/api/build-data").then((r) => r.json()), fetch("/api/build-profiles").then((r) => r.json())]).then(([loadedData, loadedProfiles]) => {
      const buildData = loadedData as BuildData;
      setData(buildData);
      setProfiles(loadedProfiles as SavedProfile[]);
      const character = buildData.characters[0];
      const set = buildData.echoSets[0];
      if (character) setCharacterKey(character.externalKey);
      if (set) setSetKey(set.externalKey);
      setMainStats(slots.map((slot) => buildData.mainStats.find((item) => item.cost === slot.cost)?.statKey ?? ""));
      setEchoKeys(slots.map((slot) => buildData.echoes.find((item) => item.cost === slot.cost)?.externalKey ?? ""));
    });
  }, []);

  const character = data?.characters.find((item) => item.externalKey === characterKey);
  const compatibleWeapons = useMemo(() => data?.weapons.filter((weapon) => !character?.baseStats.weaponType || weapon.weaponType === character.baseStats.weaponType) ?? [], [data, character]);
  const weapon = compatibleWeapons.find((item) => item.externalKey === weaponKey) ?? compatibleWeapons[0];
  const buffs = useMemo(() => characterKey === "changli" ? CHANGLI_LUPA_BRANT_BUFFS : [], [characterKey]);
  const optionsFor = useCallback((cost: 1 | 3 | 4) => data?.mainStats.filter((item) => item.cost === cost) ?? [], [data]);

  const calculation = useMemo(() => {
    if (!character || !weapon) return null;
    const echoes = slots.map((slot, index) => {
      const option = optionsFor(slot.cost).find((item) => item.statKey === mainStats[index]);
      return { id: `echo-${slot.slot}`, label: `Echo ${slot.slot}`, stats: { ...(option ? { [option.statKey]: option.value } : {}), ...(index === 0 ? subStats : {}) } };
    });
    const result = calculateBuildStats({ character: { id: character.externalKey, label: character.name, stats: character.baseStats }, weapon: { id: weapon.externalKey, label: weapon.name, stats: weapon.stats }, echoes, activeBuffIds }, buffs);
    return { result, grade: characterKey === "changli" ? evaluateBuildGrade(result, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS) : null };
  }, [activeBuffIds, buffs, character, characterKey, mainStats, optionsFor, subStats, weapon]);

  function payload(): BuildInput {
    return { name, characterKey, weaponKey: weaponKey || weapon?.externalKey || "", echoes: slots.map((slot, index) => ({ slot: slot.slot, echoKey: echoKeys[index], setKey, cost: slot.cost, mainStat: mainStats[index], subStats: index === 0 ? Object.entries(subStats).map(([key, value]) => ({ key, value: value ?? 0 })) : [] })), activeBuffIds, formulaVersion: FORMULA_VERSION };
  }
  async function save() {
    setSaving(true); setMessage(undefined);
    const response = await fetch(profileId ? `/api/build-profiles/${profileId}` : "/api/build-profiles", { method: profileId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
    const body = await response.json().catch(() => null);
    if (!response.ok) setMessage(body?.error ?? "Could not save the build.");
    else { setProfiles((current) => profileId ? current.map((item) => item.id === body.id ? body : item) : [body, ...current]); setProfileId(body.id); setMessage("Build saved."); }
    setSaving(false);
  }
  function load(profile: SavedProfile) {
    const input = profile.buildInput;
    setProfileId(profile.id); setName(input.name); setCharacterKey(input.characterKey); setWeaponKey(input.weaponKey); setSetKey(input.echoes[0]?.setKey ?? ""); setEchoKeys(input.echoes.map((echo) => echo.echoKey ?? "")); setMainStats(input.echoes.map((echo) => echo.mainStat)); setSubStats(Object.fromEntries(input.echoes.flatMap((echo) => echo.subStats.map((stat) => [stat.key, stat.value] as const)))); setActiveBuffIds(input.activeBuffIds); setMessage(`Loaded ${profile.name}.`);
  }
  function newBuild() { setProfileId(undefined); setName("New build"); setSubStats({}); setActiveBuffIds([]); setMessage("New build ready."); }
  async function remove(id: string) { const response = await fetch(`/api/build-profiles/${id}`, { method: "DELETE" }); if (response.ok) { setProfiles((items) => items.filter((item) => item.id !== id)); if (profileId === id) newBuild(); } }

  if (!data) return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-100">Loading build data…</main>;
  return <main className="min-h-screen bg-zinc-950 pb-16 text-zinc-100">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"><Link className="text-xl font-black" href="/">BUILDEX</Link><div className="flex gap-3 text-sm text-zinc-400"><span>{userName}</span><button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button></div></header>
    <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[1.2fr_.8fr]"><section className="space-y-6">
      <div><p className="text-sm font-semibold tracking-widest text-violet-400">BUILD PLANNER</p><h1 className="mt-2 text-4xl font-black">Configure your build</h1></div>
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="font-bold">Character and weapon</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label>Character<select className="mt-2 w-full rounded-xl bg-zinc-950 p-3" value={characterKey} onChange={(e) => setCharacterKey(e.target.value)}>{data.characters.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label>Weapon<select className="mt-2 w-full rounded-xl bg-zinc-950 p-3" value={weapon?.externalKey ?? ""} onChange={(e) => setWeaponKey(e.target.value)}>{compatibleWeapons.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label></div></section>
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="font-bold">Echo setup</h2><label className="mt-4 block">Echo set<select className="mt-2 w-full rounded-xl bg-zinc-950 p-3" value={setKey} onChange={(e) => setSetKey(e.target.value)}>{data.echoSets.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><div className="mt-4 grid gap-3 sm:grid-cols-2">{slots.map((slot, index) => <div key={slot.slot} className="rounded-xl bg-zinc-950/50 p-3"><label className="block">Echo {slot.slot} · Cost {slot.cost}<select className="mt-2 w-full rounded-xl bg-zinc-950 p-3" value={echoKeys[index] ?? ""} onChange={(e) => setEchoKeys((items) => items.map((item, i) => i === index ? e.target.value : item))}>{data.echoes.filter((item) => item.cost === slot.cost).map((item) => <option key={item.externalKey} value={item.externalKey}>{item.name}</option>)}</select></label><label className="mt-3 block">Main stat<select className="mt-2 w-full rounded-xl bg-zinc-950 p-3" value={mainStats[index] ?? ""} onChange={(e) => setMainStats((items) => items.map((item, i) => i === index ? e.target.value : item))}>{optionsFor(slot.cost).map((item) => <option key={item.statKey} value={item.statKey}>{statLabels[item.statKey]} +{item.value}%</option>)}</select></label></div>)}</div></section>
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="font-bold">Substats</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{trackedStats.map((key) => <label key={key}>{statLabels[key]}<input className="mt-2 w-full rounded-xl bg-zinc-950 p-3" min="0" step="0.1" type="number" value={subStats[key] ?? ""} onChange={(e) => setSubStats((current) => ({ ...current, [key]: Math.max(0, Number(e.target.value) || 0) }))} /></label>)}</div></section>
      {buffs.length > 0 && <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"><h2 className="font-bold">Conditional buffs</h2>{buffs.map((buff) => <label className="mt-3 flex gap-3" key={buff.id}><input type="checkbox" checked={activeBuffIds.includes(buff.id)} onChange={() => setActiveBuffIds((items) => items.includes(buff.id) ? items.filter((id) => id !== buff.id) : [...items, buff.id])} /><span>{buff.label}</span></label>)}</section>}
    </section>
    <aside className="h-fit rounded-3xl border border-violet-500/30 bg-zinc-900 p-6 lg:sticky lg:top-6"><p className="text-sm text-violet-300">CALCULATED RESULT</p>{calculation && <><p className="mt-3 text-3xl font-black">ATK {format(calculation.result.attack)}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{([["CRIT Rate", calculation.result.critRate], ["CRIT DMG", calculation.result.critDamage], ["Energy Regen", calculation.result.energyRegen], ["Fusion DMG", calculation.result.fusionDamageBonus]] as const).map(([label, value]) => <div className="rounded-xl bg-zinc-950 p-3" key={label}><dt className="text-zinc-500">{label}</dt><dd className="font-bold">{format(value)}%</dd></div>)}</dl>{calculation.grade && <p className="mt-4 text-sm text-zinc-300">Grade: {calculation.grade.grade ?? "Not graded"}</p>}</>}
      <div className="mt-6 border-t border-zinc-700 pt-5"><input className="w-full rounded-xl bg-zinc-950 p-3" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /><div className="mt-3 flex gap-3"><button className="rounded-xl bg-violet-500 px-4 py-2 font-bold disabled:opacity-50" disabled={saving || !name.trim()} onClick={save}>{saving ? "Saving…" : profileId ? "Update build" : "Save build"}</button><button className="rounded-xl border border-zinc-700 px-4 py-2" onClick={newBuild}>New</button></div>{message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}</div>
      <div className="mt-6 border-t border-zinc-700 pt-5"><h2 className="font-bold">Saved builds</h2>{profiles.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No saved builds.</p> : <ul className="mt-3 space-y-3">{profiles.map((profile) => <li className="flex items-center justify-between gap-2" key={profile.id}><button className="min-w-0 truncate text-left text-sm font-semibold" onClick={() => load(profile)}>{profile.name}</button><button className="text-xs text-rose-300" onClick={() => remove(profile.id)}>Delete</button></li>)}</ul>}</div>
    </aside></div>
  </main>;
}
