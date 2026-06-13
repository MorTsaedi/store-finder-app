import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { shop_id, customer_name, customer_phone, date, time_slot } = body;

  if (!shop_id || !customer_name || !customer_phone || !date || !time_slot) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id FROM appointments WHERE shop_id = ? AND date = ? AND time_slot = ? AND status != 'cancelled'")
    .get(shop_id, date, time_slot);

  if (existing) {
    return NextResponse.json({ error: "این س час قبلاً رزرو شده است" }, { status: 409 });
  }

  const result = db
    .prepare("INSERT INTO appointments (shop_id, customer_name, customer_phone, date, time_slot) VALUES (?, ?, ?, ?, ?)")
    .run(shop_id, customer_name, customer_phone, date, time_slot);

  return NextResponse.json({ success: true, id: result.lastInsertRowid });
}

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const appointments = db
    .prepare(`
      SELECT a.*, s.name as shop_name, s.phone as shop_phone, s.category_icon
      FROM appointments a
      JOIN shops s ON a.shop_id = s.id
      WHERE a.customer_phone = ? AND a.status != 'cancelled'
      ORDER BY a.date DESC, a.time_slot DESC
    `)
    .all(phone);

  return NextResponse.json({ appointments });
}
