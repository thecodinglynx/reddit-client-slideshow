import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userContentProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await db
      .select()
      .from(userContentProgress)
      .where(eq(userContentProgress.userId, session.user.id))
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
  const { settingsHash, afterTokens } = body;

  if (!settingsHash || !afterTokens) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await db
      .insert(userContentProgress)
      .values({
        userId: session.user.id,
        settingsHash,
        afterTokens,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userContentProgress.userId,
        set: { settingsHash, afterTokens, updatedAt: new Date() },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Database error in PUT progress:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
