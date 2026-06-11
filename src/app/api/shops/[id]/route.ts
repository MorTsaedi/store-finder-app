import { NextResponse } from "next/server";
import db from "@/lib/db";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = db
    .prepare(
      "SELECT s.*, c.name as category_name, c.name_en as category_slug, c.icon as category_icon FROM shops s JOIN categories c ON s.category_id = c.id WHERE s.id = ?"
    )
    .get(id) as any;

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const hours = db
    .prepare("SELECT * FROM shop_working_hours WHERE shop_id = ?")
    .all(shop.id) as any[];

  // Calculate open/closed
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  const todayHours = hours.find((h: any) => h.day_of_week === dayOfWeek);

  let isOpen = false;
  if (shop.is_available && todayHours && !todayHours.is_closed) {
    isOpen = currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
  }

  // Day names in Persian
  const dayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  const hoursFormatted = hours.map((h: any) => ({
    day: dayNames[h.day_of_week],
    day_of_week: h.day_of_week,
    open_time: h.open_time,
    close_time: h.close_time,
    is_closed: !!h.is_closed,
  }));

  return NextResponse.json({
    ...shop,
    is_open: isOpen,
    working_hours: hoursFormatted,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { is_available } = body;

  if (typeof is_available !== "undefined") {
    db.prepare("UPDATE shops SET is_available = ? WHERE id = ?").run(
      is_available ? 1 : 0,
      id
    );

    const shop = db.prepare("SELECT * FROM shops WHERE id = ?").get(id);
    return NextResponse.json({ success: true, shop });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
