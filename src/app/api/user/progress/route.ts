import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userContentProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = request.nextUrl.searchParams.get("hash");
  if (!hash) {
    return NextResponse.json({ error: "Missing hash" }, { status: 400 });
  }

  try {
    const row = await db
      .select()
      .from(userContentProgress)
      .where(
        and(
          eq(userContentProgress.userId, session.user.id),
          eq(userContentProgress.settingsHash, hash)
        )
      )
      .limit(1);

    return NextResponse.json({ progress: row[0] ?? null });
  } catch (error) {
    console.error("Database error in GET progress:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { settingsHash, afterTokens, items, currentIndex } = body;

  if (!settingsHash || !afterTokens || !items) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await db
      .insert(userContentProgress)
      .values({
        userId: session.user.id,
        settingsHash,
        afterTokens,
        items,
        currentIndex: currentIndex ?? 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userContentProgress.userId, userContentProgress.settingsHash],
        set: {
          afterTokens,
          items,
          currentIndex: currentIndex ?? 0,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Database error in PUT progress:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
