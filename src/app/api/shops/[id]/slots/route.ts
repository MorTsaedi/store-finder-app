import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const date = request.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const shop = db.prepare("SELECT * FROM shops WHERE id = ?").get(id) as any;
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const d = new Date(date);
  const dayOfWeek = d.getDay();

  const hours = db
    .prepare("SELECT * FROM shop_working_hours WHERE shop_id = ? AND day_of_week = ?")
    .get(shop.id, dayOfWeek) as any;

  if (!hours || hours.is_closed) {
    return NextResponse.json({ slots: [] });
  }

  const slotDuration = shop.slot_duration || 30;
  const [openH, openM] = hours.open_time.split(":").map(Number);
  const [closeH, closeM] = hours.close_time.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const allSlots: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += slotDuration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    allSlots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }

  const existing = db
    .prepare("SELECT time_slot FROM appointments WHERE shop_id = ? AND date = ? AND status != 'cancelled'")
    .all(shop.id, date) as any[];
  const bookedSlots = new Set(existing.map((e: any) => e.time_slot));

  const now = new Date();
  const isToday = date === now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  const slots = allSlots.map((time) => ({
    time,
    available: !bookedSlots.has(time) && !(isToday && time <= currentTime),
  }));

  return NextResponse.json({ slots, slot_duration: slotDuration });
}
