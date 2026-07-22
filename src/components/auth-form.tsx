"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type AuthFormProps = { mode: "signin" | "signup"; callbackUrl?: string };

export function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function submit(formData: FormData) {
    setLoading(true);
    setError(undefined);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    if (isSignup) {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName: formData.get("displayName") }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "회원가입을 완료하지 못했습니다.");
        setLoading(false);
        return;
      }
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) setError("이메일 또는 비밀번호를 확인해 주세요.");
    else router.push(callbackUrl ?? "/build");
    setLoading(false);
  }

  return (
    <main className="neumorphic-auth flex min-h-screen items-center justify-center bg-[#252b36] p-6 text-zinc-100">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <Link className="text-sm font-black tracking-widest text-violet-400" href="/">BUILDEX</Link>
        <h1 className="mt-7 text-3xl font-black">{isSignup ? "빌드 기록을 시작하세요" : "다시 만나서 반가워요"}</h1>
        <p className="mt-2 text-sm text-zinc-400">{isSignup ? "계정을 만들면 나만의 프리셋을 안전하게 저장할 수 있습니다." : "저장한 빌드를 이어서 확인하세요."}</p>
        <form action={submit} className="mt-8 space-y-4">
          {isSignup && <label className="block text-sm font-medium">닉네임<input name="displayName" required minLength={2} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-400" /></label>}
          <label className="block text-sm font-medium">이메일<input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-400" /></label>
          <label className="block text-sm font-medium">비밀번호<input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-400" /></label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-violet-500 px-4 py-3 font-bold text-white disabled:opacity-50">{loading ? "처리 중…" : isSignup ? "계정 만들기" : "로그인"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">{isSignup ? "이미 계정이 있나요?" : "처음이신가요?"} <Link className="font-semibold text-violet-400" href={isSignup ? "/signin" : "/signup"}>{isSignup ? "로그인" : "회원가입"}</Link></p>
      </section>
    </main>
  );
}
