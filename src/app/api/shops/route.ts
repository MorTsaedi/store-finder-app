import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "35.6997");
  const lng = parseFloat(searchParams.get("lng") || "51.3707");
  const radius = parseFloat(searchParams.get("radius") || "10000");
  const category = searchParams.get("category");
  const openOnly = searchParams.get("open") === "true";
  const q = searchParams.get("q");

  // Get current time and day for open/closed logic
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  let query = `
    SELECT s.*, c.name as category_name, c.name_en as category_slug, c.icon as category_icon,
      ROUND(6371000 * acos(
        cos(radians(?)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(s.latitude))
      )) as distance
    FROM shops s
    JOIN categories c ON s.category_id = c.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [lat, lng, lat];

  if (category) {
    query += " AND c.name_en = ?";
    params.push(category);
  }

  if (q) {
    query += " AND (s.name LIKE ? OR s.description LIKE ? OR s.address LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  query += " ORDER BY distance ASC";

  const shops = db.prepare(query).all(...params) as any[];

  // Enrich with open/closed status
  const enriched = shops.map((shop) => {
    const hours = db
      .prepare(
        "SELECT * FROM shop_working_hours WHERE shop_id = ? AND day_of_week = ?"
      )
      .get(shop.id, dayOfWeek) as any;

    let isOpen = false;
    if (shop.is_available && hours && !hours.is_closed) {
      isOpen = currentTime >= hours.open_time && currentTime <= hours.close_time;
    }

    return {
      ...shop,
      is_open: isOpen,
      working_hours: hours,
    };
  });

  const filtered = openOnly ? enriched.filter((s) => s.is_open) : enriched;

  return NextResponse.json({ shops: filtered, total: filtered.length });
}
