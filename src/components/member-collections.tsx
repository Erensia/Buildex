"use client";

import { useEffect, useState } from "react";

type Build = { id: string; name: string };
type Party = { id: string; name: string; memberBuildIds: string[] };

export function MemberCollections({ builds }: { builds: Build[] }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [name, setName] = useState("새 3인 파티");
  const [slots, setSlots] = useState(["", "", ""]);
  const [message, setMessage] = useState("");

  useEffect(() => { void fetch("/api/member-collections").then((response) => response.json()).then((data) => { setFavorites(data.favoriteBuildIds ?? []); setParties(data.parties ?? []); }); }, []);
  async function toggleFavorite(buildId: string) { const response = await fetch("/api/member-collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggleFavorite", buildId }) }); const data = await response.json(); if (response.ok) setFavorites((items) => data.favorite ? [...items, buildId] : items.filter((id) => id !== buildId)); }
  async function saveParty() { const response = await fetch("/api/member-collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "createParty", name, memberBuildIds: slots }) }); const data = await response.json(); if (!response.ok) setMessage(data.error ?? "파티를 저장하지 못했습니다."); else { setParties((items) => [data, ...items]); setMessage("3인 파티를 저장했습니다."); } }

  if (!builds.length) return null;
  return <section className="rounded-2xl border border-white/10 bg-zinc-900/75 p-5"><h2 className="text-sm font-bold">즐겨찾기와 3인 파티</h2><p className="mt-1 text-xs text-zinc-500">파티는 대미지를 계산하지 않는 빌드 구성 관리 기능입니다.</p><div className="mt-3 flex flex-wrap gap-2">{builds.map((build) => <button key={build.id} onClick={() => void toggleFavorite(build.id)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-200">{favorites.includes(build.id) ? "★" : "☆"} {build.name}</button>)}</div><div className="mt-5 border-t border-white/10 pt-4"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />{slots.map((slot, index) => <select key={index} value={slot} onChange={(event) => setSlots((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"><option value="">파티 슬롯 {index + 1}</option>{builds.map((build) => <option key={build.id} value={build.id}>{build.name}</option>)}</select>)}<button disabled={slots.some((slot) => !slot)} onClick={() => void saveParty()} className="mt-3 rounded-lg bg-violet-500 px-3 py-2 text-sm font-bold disabled:opacity-50">3인 파티 저장</button>{message && <p className="mt-2 text-xs text-violet-200">{message}</p>}{parties.map((party) => <p className="mt-2 text-xs text-zinc-400" key={party.id}>{party.name} · {party.memberBuildIds.length}명 구성</p>)}</div></section>;
}
