import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  console.log("GET /api/user/settings called");
  const session = await auth();
  console.log("Session:", session?.user?.id ? "authenticated" : "not authenticated");

  if (!session?.user?.id) {
    console.log("Unauthorized access to settings");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    console.log("Settings loaded from DB:", row[0]?.settings ? "found" : "not found");
    return NextResponse.json({ settings: row[0]?.settings ?? null });
  } catch (error) {
    console.error("Database error in GET settings:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log("PUT /api/user/settings called");
  const session = await auth();
  console.log("Session:", session?.user?.id ? "authenticated" : "not authenticated");

  if (!session?.user?.id) {
    console.log("Unauthorized access to settings");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const settings = body.settings;
  console.log("Settings to save:", settings ? "present" : "missing");

  if (!settings) {
    return NextResponse.json({ error: "Missing settings" }, { status: 400 });
  }

  try {
    await db
      .insert(userSettings)
      .values({
        userId: session.user.id,
        settings,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { settings, updatedAt: new Date() },
      });

    console.log("Settings saved to DB successfully");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Database error in PUT settings:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
