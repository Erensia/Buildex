"use client";
import { useMemo, useState } from "react";

const labels: Record<string, string> = { sword: "직검", broadblade: "대검", gauntlet: "권갑", gauntlets: "권갑", amplifier: "증폭기", rectifier: "증폭기", pistol: "권총", pistols: "권총" };
const category = (type?: string) => type === "amplifier" || type === "rectifier" ? "amplifier" : type;
type Weapon = { id: string; name: string; weaponType: string; stats: { baseAttack?: number; critRate?: number; critDamage?: number; energyRegen?: number; attackPercent?: number } };
type Character = { id: string; name: string; role: string; weaponType?: string };

function mainStat(stats: Weapon["stats"]) {
  if (stats.critRate !== undefined) return ["치명타 확률", `${stats.critRate}%`];
  if (stats.critDamage !== undefined) return ["치명타 피해", `${stats.critDamage}%`];
  if (stats.energyRegen !== undefined) return ["공명 효율", `${stats.energyRegen}%`];
  if (stats.attackPercent !== undefined) return ["공격력", `${stats.attackPercent}%`];
  return ["주옵션", "—"];
}

export function PublicLibrary({ characters, weapons, echoSetNames }: { characters: Character[]; weapons: Weapon[]; echoSetNames: string[] }) {
  const [query, setQuery] = useState(""); const [type, setType] = useState("all"); const text = query.trim().toLowerCase();
  const filteredCharacters = useMemo(() => characters.filter((character) => (type === "all" || category(character.weaponType) === type) && (!text || `${character.name} ${character.role}`.toLowerCase().includes(text))), [characters, text, type]);
  const filteredWeapons = useMemo(() => weapons.filter((weapon) => (type === "all" || category(weapon.weaponType) === type) && (!text || weapon.name.toLowerCase().includes(text))), [text, type, weapons]);
  return <><section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><div className="grid gap-3 sm:grid-cols-[1fr_180px]"><input aria-label="검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="캐릭터, 역할, 무기 검색" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5" /><select aria-label="무기 종류" value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5"><option value="all">전체 무기</option><option value="sword">직검</option><option value="broadblade">대검</option><option value="gauntlet">권갑</option><option value="amplifier">증폭기</option><option value="pistol">권총</option></select></div></section><section className="mt-10"><h2 className="text-xl font-bold">캐릭터와 호환 무기 <small className="text-zinc-500">{filteredCharacters.length}명</small></h2><div className="mt-4 grid gap-4 md:grid-cols-2">{filteredCharacters.map((character) => <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5" key={character.id}><h3 className="text-lg font-bold">{character.name}</h3><p className="mt-1 text-sm text-zinc-400">{character.role} · {labels[character.weaponType ?? ""] ?? "미지정"}</p><p className="mt-4 text-xs text-zinc-500">호환 무기</p><p className="mt-1 text-sm">{weapons.filter((weapon) => category(weapon.weaponType) === category(character.weaponType)).map((weapon) => weapon.name).join(" · ") || "등록된 무기 없음"}</p></article>)}</div></section><section className="mt-10"><h2 className="text-xl font-bold">무기 정보 <small className="text-zinc-500">{filteredWeapons.length}개</small></h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredWeapons.map((weapon) => { const [label, value] = mainStat(weapon.stats); return <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5" key={weapon.id}><p className="text-xs font-bold text-violet-300">{labels[weapon.weaponType] ?? weapon.weaponType}</p><h3 className="mt-2 text-lg font-bold">{weapon.name}</h3><dl className="mt-4 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-zinc-500">기초 공격력</dt><dd className="mt-1 font-semibold">{weapon.stats.baseAttack ?? "—"}</dd></div><div><dt className="text-zinc-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div></dl></article>; })}</div></section><section className="mt-10"><h2 className="text-xl font-bold">에코 세트</h2><div className="mt-4 flex flex-wrap gap-3">{echoSetNames.map((name) => <span className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm" key={name}>{name}</span>)}</div></section></>;
}
