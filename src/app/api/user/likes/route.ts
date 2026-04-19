import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userLikes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(userLikes)
    .where(eq(userLikes.userId, session.user.id))
    .orderBy(userLikes.createdAt);

  const likes = rows.map((r) => ({
    postId: r.postId,
    ...(r.postData as Record<string, unknown>),
  }));

  return NextResponse.json({ likes });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { postId, postData } = body;
  if (!postId || !postData) {
    return NextResponse.json({ error: "Missing postId or postData" }, { status: 400 });
  }

  await db
    .insert(userLikes)
    .values({
      userId: session.user.id,
      postId,
      postData,
    })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { postId } = body;
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  await db
    .delete(userLikes)
    .where(
      and(eq(userLikes.userId, session.user.id), eq(userLikes.postId, postId))
    );

  return NextResponse.json({ ok: true });
}
