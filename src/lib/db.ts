import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "demo.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT DEFAULT '🏪',
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    phone TEXT,
    address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    is_available INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS shop_working_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    is_closed INTEGER DEFAULT 0,
    UNIQUE(shop_id, day_of_week),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );
`);

// Check if data already exists
const count = db.prepare("SELECT COUNT(*) as c FROM shops").get() as { c: number };

if (count.c === 0) {
  // Insert categories
  const insertCat = db.prepare(
    "INSERT INTO categories (name, name_en, icon, display_order) VALUES (?, ?, ?, ?)"
  );
  const categories = [
    ["مواد غذایی", "grocery", "🥬", 1],
    ["دارو‌خانه", "pharmacy", "💊", 2],
    ["پوشاک", "clothing", "👕", 3],
    ["خدمات خودرو", "auto-services", "🚗", 4],
    ["الکترونیک", "electronics", "📱", 5],
    ["آرایشی و بهداشتی", "beauty", "💄", 6],
    ["کتاب و لوازم تحریر", "books", "📚", 7],
    ["رستوران و کافه", "restaurant", "🍽️", 8],
    ["خدمات عمومی", "public-services", "🏛️", 9],
    ["ورزش و تفریح", "sports", "⚽", 10],
  ];
  for (const cat of categories) {
    insertCat.run(cat[0], cat[1], cat[2], cat[3]);
  }

  // Insert demo shops in Tehran
  const insertShop = db.prepare(`
    INSERT INTO shops (category_id, name, description, phone, address, latitude, longitude, is_available, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHours = db.prepare(`
    INSERT INTO shop_working_hours (shop_id, day_of_week, open_time, close_time, is_closed)
    VALUES (?, ?, ?, ?, ?)
  `);

  const shops = [
    {
      category_id: 2, name: "دارو‌خانه انقلاب", description: "دارو‌خانه ۲۴ ساعته با تمام داروهای عمومی و تخصصی",
      phone: "021-66701234", address: "تهران، خیابان انقلاب، نبش خیابان آزادی", lat: 35.6997, lng: 51.3707,
      available: 1, image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=300&fit=crop",
    },
    {
      category_id: 1, name: "سوپرمارکت رفاه", description: "سوپرمارکت زنجیره‌ای با محصولات تازه و ارگانیک",
      phone: "021-88321000", address: "تهران، خیابان ولیعصر، پلاک ۲۳۴", lat: 35.7050, lng: 51.3750,
      available: 1, image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    },
    {
      category_id: 8, name: "کبابی برج", description: "بهترین کباب تهران با ۳۰ سال سابقه",
      phone: "021-66905511", address: "تهران، خیابان شریعتی، بین بهشتی و حکیم", lat: 35.6950, lng: 51.3850,
      available: 0, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop",
    },
    {
      category_id: 3, name: "مغازه پوشاک آریا", description: "لباس مردانه و زنانه با بهترین کیفیت",
      phone: "021-88776655", address: "تهران، خیابان جمهوری، پاساگ آریا", lat: 35.7100, lng: 51.3900,
      available: 1, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    },
    {
      category_id: 4, name: "تعمیرات خودرو احمد", description: "تعمیرات عمومی خودرو، مکانیک و برق",
      phone: "021-55443322", address: "تهران، خیابان آزادی، نبش خیابان دماوند", lat: 35.6800, lng: 51.3600,
      available: 0, image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop",
    },
    {
      category_id: 7, name: "کتاب‌فروشی فرهنگ", description: "کتاب‌های آموزشی، داستان و علمی",
      phone: "021-66554433", address: "تهران، خیابان فردوسی، پلاک ۱۲۳", lat: 35.7200, lng: 51.4000,
      available: 1, image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop",
    },
    {
      category_id: 5, name: "لوازم الکترونیک پارس", description: "موبایل، لپ‌تاپ و لوازم جانبی",
      phone: "021-88990011", address: "تهران، خیابان پاسداران، بین گلستان و نیستان", lat: 35.6900, lng: 51.3550,
      available: 1, image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
    },
    {
      category_id: 6, name: "آرایشگاه ستاره", description: "آرایشی و بهداشتی، عطر و ادکلن",
      phone: "021-55667788", address: "تهران، خیابان نیاوران، پلاک ۴۵", lat: 35.7150, lng: 51.3450,
      available: 0, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
    },
    {
      category_id: 1, name: "خواروباری سنتی", description: "میوه و سبزی تازه از بازار",
      phone: "021-66442233", address: "تهران، خیابان ۱۵ خرداد، بازار سنتی", lat: 35.6850, lng: 51.3950,
      available: 1, image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=300&fit=crop",
    },
    {
      category_id: 8, name: "کافه نقشه", description: "کافه با فضای دنج برای کار و مطالعه",
      phone: "021-88221100", address: "تهران، خیابان سهروردی، نبش خیابان ظفر", lat: 35.7050, lng: 51.3650,
      available: 1, image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
    },
    {
      category_id: 1, name: "میوه‌فروشی تازه", description: "میوه‌های فصل و خارجی با کیفیت",
      phone: "021-66335544", address: "تهران، خیابان انقلاب، بین فردوسی و جمهوری", lat: 35.7000, lng: 51.3800,
      available: 0, image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop",
    },
    {
      category_id: 9, name: "عینک‌سازی نور", description: "عینک طبی، آفتابی و لنز",
      phone: "021-55779900", address: "تهران، خیابان شریعتی، بین حکیم و ملت", lat: 35.6950, lng: 51.3700,
      available: 1, image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=300&fit=crop",
    },
  ];

  for (const shop of shops) {
    const result = insertShop.run(
      shop.category_id, shop.name, shop.description, shop.phone,
      shop.address, shop.lat, shop.lng, shop.available, shop.image
    );
    const shopId = result.lastInsertRowid as number;

    // Working hours: Sat-Thu 8:00-22:00, Fri closed
    for (let day = 0; day <= 6; day++) {
      if (day === 5) {
        // Friday - closed
        insertHours.run(shopId, day, "00:00", "00:00", 1);
      } else {
        insertHours.run(shopId, day, "08:00", "22:00", 0);
      }
    }
  }

  console.log(`✅ Seeded ${shops.length} demo shops`);
} else {
  console.log(`✅ Database already has ${count.c} shops`);
}

export default db;
