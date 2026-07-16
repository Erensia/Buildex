import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { authIdentities, users } from "@/lib/db/schema";
import { signUpSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const input = signUpSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  const db = getDb();
  const email = input.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  const [user] = await db.insert(users).values({ email, displayName: input.data.displayName }).returning();
  await db.insert(authIdentities).values({ userId: user.id, provider: "password", providerSubject: email, passwordHash: await hash(input.data.password, 12) });
  return NextResponse.json({ id: user.id }, { status: 201 });
}
