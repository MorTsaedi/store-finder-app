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
    telegram TEXT,
    instagram TEXT,
    whatsapp TEXT,
    about TEXT,
    is_bookable INTEGER DEFAULT 0,
    slot_duration INTEGER DEFAULT 30,
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

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now')),
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

  const insertShop = db.prepare(`
    INSERT INTO shops (category_id, name, description, phone, address, latitude, longitude, is_available, image_url, telegram, instagram, whatsapp, about, is_bookable, slot_duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      telegram: "https://t.me/darookhaneh_enqelab", instagram: "darookhaneh_enqelab", whatsapp: "9891212345678",
      about: "دارو‌خانه انقلاب از سال ۱۳۷۵ در خدمت شهروندان تهرانی است. ما با بیش از ۱۰,۰۰۰ نوع داروی عمومی و تخصصی، مشاوره دارویی رایگان و ارسال دارو درب منزل، آماده خدمت‌رسانی به شما عزیزان هستیم. تیم مجرب ما شامل ۳ داروساز خبره است که به صورت ۲۴ ساعته پاسخگوی سوالات شما هستند.",
      bookable: 1, slotDuration: 15,
      hours: [[0, "00:00", "23:59", 0], [1, "00:00", "23:59", 0], [2, "00:00", "23:59", 0], [3, "00:00", "23:59", 0], [4, "00:00", "23:59", 0], [5, "00:00", "23:59", 0], [6, "00:00", "23:59", 0]],
    },
    {
      category_id: 1, name: "سوپرمارکت رفاه", description: "سوپرمارکت زنجیره‌ای با محصولات تازه و ارگانیک",
      phone: "021-88321000", address: "تهران، خیابان ولیعصر، پلاک ۲۳۴", lat: 35.7050, lng: 51.3750,
      available: 1, image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      telegram: "https://t.me/refah_supermarket", instagram: "refah_supermarket", whatsapp: "9891223456789",
      about: "سوپرمارکت رفاه با بیش از ۵۰۰۰ محصول غذایی و بهداشتی، انتخاب اول خانواده‌های ایرانی. ما به صورت روزانه تازه‌ترین محصولات ارگانیک و محلی را از بهترین تأمین‌کنندگان کشور دریافت می‌کنیم. ارسال رایگان سفارشات بالای ۵۰۰ هزار تومان.",
      bookable: 0, slotDuration: 30,
      hours: [[0, "08:00", "23:00", 0], [1, "08:00", "23:00", 0], [2, "08:00", "23:00", 0], [3, "08:00", "23:00", 0], [4, "08:00", "23:00", 0], [5, "08:00", "23:00", 0], [6, "09:00", "22:00", 0]],
    },
    {
      category_id: 8, name: "کبابی برج", description: "بهترین کباب تهران با ۳۰ سال سابقه",
      phone: "021-66905511", address: "تهران، خیابان شریعتی، بین بهشتی و حکیم", lat: 35.6950, lng: 51.3850,
      available: 0, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop",
      telegram: "https://t.me/kabab_borj", instagram: "kabab_borj_tehran", whatsapp: "9891234567890",
      about: "کبابی برج با بیش از ۳۰ سال سابقه درخشان، خاطره‌ی خوش طعم کباب اصیل ایرانی را برایتان زنده می‌کند. گوشت تازه از بهترین دامداری‌های کشور، طبخ روی ذغال طبیعی و دستور پخت اختصاصی خانوادگی. ظرفیت پذیرایی ۸۰ نفر با سالن VIP.",
      bookable: 0, slotDuration: 30,
      hours: [[0, "12:00", "23:00", 0], [1, "12:00", "23:00", 0], [2, "12:00", "23:00", 0], [3, "12:00", "23:00", 0], [4, "12:00", "23:00", 0], [5, "12:00", "23:00", 0], [6, "12:00", "00:00", 0]],
    },
    {
      category_id: 3, name: "مغازه پوشاک آریا", description: "لباس مردانه و زنانه با بهترین کیفیت",
      phone: "021-88776655", address: "تهران، خیابان جمهوری، پاساگ آریا", lat: 35.7100, lng: 51.3900,
      available: 1, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
      telegram: "https://t.me/arya_clothing", instagram: "arya_clothing_shop", whatsapp: "9891245678901",
      about: "فروشگاه پوشاک آریا با ارائه جدیدترین مدل‌های روز دنیا از برندهای معتبر ایرانی و خارجی، پذیرای شما عزیزان است. ما با تضمین اصالت کالا و امکان مرجوعی تا ۷ روز، خریدی مطمئن را برایتان فراهم می‌کنیم. تخفیف‌های فصلی تا ۵۰٪.",
      bookable: 0, slotDuration: 30,
      hours: [[0, "10:00", "22:00", 0], [1, "10:00", "22:00", 0], [2, "10:00", "22:00", 0], [3, "10:00", "22:00", 0], [4, "10:00", "22:00", 0], [5, "10:00", "22:00", 0], [6, "14:00", "21:00", 0]],
    },
    {
      category_id: 4, name: "تعمیرات خودرو احمد", description: "تعمیرات عمومی خودرو، مکانیک و برق",
      phone: "021-55443322", address: "تهران، خیابان آزادی، نبش خیابان دماوند", lat: 35.6800, lng: 51.3600,
      available: 0, image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop",
      telegram: null, instagram: "ahmad_auto_repair", whatsapp: "9891256789012",
      about: "تعمیرگاه تخصصی خودرو احمد با بیش از ۲۰ سال تجربه در تعمیر انواع خودروهای ایرانی و خارجی. خدمات شامل: مکانیک، برق خودرو، دیاگ تخصصی، تعویض روغن و سرویس دوره‌ای. قطعات اصلی با گارانتی ۶ ماهه.",
      bookable: 1, slotDuration: 60,
      hours: [[0, "09:00", "18:00", 0], [1, "09:00", "18:00", 0], [2, "09:00", "18:00", 0], [3, "09:00", "18:00", 0], [4, "09:00", "18:00", 0], [5, "09:00", "14:00", 0], [6, "00:00", "00:00", 1]],
    },
    {
      category_id: 7, name: "کتاب‌فروشی فرهنگ", description: "کتاب‌های آموزشی، داستان و علمی",
      phone: "021-66554433", address: "تهران، خیابان فردوسی، پلاک ۱۲۳", lat: 35.7200, lng: 51.4000,
      available: 1, image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop",
      telegram: "https://t.me/farhang_bookshop", instagram: "farhang_ketab", whatsapp: "9891267890123",
      about: "کتاب‌فروشی فرهنگ با بیش از ۱۵,۰۰۰ عنوان کتاب در موضوعات مختلف، یکی از غنی‌ترین کتاب‌فروشی‌های تهران است. از رمان‌های پرفروش ایرانی و خارجی تا کتاب‌های تخصصی دانشگاهی. فضای مطالعه رایگان با چای و قهوه.",
      bookable: 0, slotDuration: 30,
      hours: [[0, "09:00", "21:00", 0], [1, "09:00", "21:00", 0], [2, "09:00", "21:00", 0], [3, "09:00", "21:00", 0], [4, "09:00", "21:00", 0], [5, "09:00", "21:00", 0], [6, "10:00", "20:00", 0]],
    },
    {
      category_id: 5, name: "لوازم الکترونیک پارس", description: "موبایل، لپ‌تاپ و لوازم جانبی",
      phone: "021-88990011", address: "تهران، خیابان پاسداران، بین گلستان و نیستان", lat: 35.6900, lng: 51.3550,
      available: 1, image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
      telegram: "https://t.me/pars_electronics", instagram: "pars_electronics_ir", whatsapp: "9891278901234",
      about: "فروشگاه الکترونیک پارس نمایندگی رسمی برندهای اپل، سامسونگ، شیائومی و هوآوی در تهران. فروش نقد و اقساطی با ضمانت اصالت کالا. تعمیرات تخصصی موبایل و لپ‌تاپ توسط تیم فنی مجرب.",
      bookable: 1, slotDuration: 30,
      hours: [[0, "10:00", "22:00", 0], [1, "10:00", "22:00", 0], [2, "10:00", "22:00", 0], [3, "10:00", "22:00", 0], [4, "10:00", "22:00", 0], [5, "10:00", "22:00", 0], [6, "11:00", "21:00", 0]],
    },
    {
      category_id: 6, name: "آرایشگاه ستاره", description: "آرایشی و بهداشتی، عطر و ادکلن",
      phone: "021-55667788", address: "تهران، خیابان نیاوران، پلاک ۴۵", lat: 35.7150, lng: 51.3450,
      available: 0, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
      telegram: null, instagram: "setareh_beauty", whatsapp: "9891289012345",
      about: "آرایشگاه ستاره با بهترین متخصصان زیبایی و آرایش، خدمات تخصصی کوتاهی مو، رنگ و مش، میکاپ عروس و ابرو را ارائه می‌دهد. محصولات اصل اروپایی و محیطی کاملاً بهداشتی. رزرو آنلاین از طریق اینستاگرام.",
      bookable: 1, slotDuration: 30,
      hours: [[0, "10:00", "20:00", 0], [1, "10:00", "20:00", 0], [2, "10:00", "20:00", 0], [3, "10:00", "20:00", 0], [4, "10:00", "20:00", 0], [5, "10:00", "20:00", 0], [6, "00:00", "00:00", 1]],
    },
    {
      category_id: 1, name: "خواروباری سنتی", description: "میوه و سبزی تازه از بازار",
      phone: "021-66442233", address: "تهران، خیابان ۱۵ خرداد، بازار سنتی", lat: 35.6850, lng: 51.3950,
      available: 1, image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=300&fit=crop",
      telegram: null, instagram: "sonnati_khavarobar", whatsapp: "9891290123456",
      about: "خواروباری سنتی با بیش از ۴۰ سال سابقه در بازار بزرگ تهران، تازه‌ترین میوه‌ها و سبزیجات فصل را مستقیماً از باغ‌های شمال و جنوب کشور تأمین می‌کند. قیمت‌های مناسب و کیفیت تضمینی. امکان ارسال سفارش تلفنی.",
      bookable: 0, slotDuration: 30,
      hours: [[0, "06:00", "14:00", 0], [1, "06:00", "14:00", 0], [2, "06:00", "14:00", 0], [3, "06:00", "14:00", 0], [4, "06:00", "14:00", 0], [5, "06:00", "14:00", 0], [6, "00:00", "00:00", 1]],
    },
    {
      category_id: 8, name: "کافه نقشه", description: "کافه با فضای دنج برای کار و مطالعه",
      phone: "021-88221100", address: "تهران، خیابان سهروردی، نبش خیابان ظفر", lat: 35.7050, lng: 51.3650,
      available: 1, image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
      telegram: "https://t.me/naghsheh_cafe", instagram: "naghsheh_cafe", whatsapp: "9891201234567",
      about: "کافه نقشه با فضایی مینیمال و آرام، انتخاب ایده‌آل برای دورکاری، مطالعه و قرارهای دوستانه. منوی متنوع شامل قهوه‌های تخصصی، دمنوش‌ها، صبحانه و عصرانه. اینترنت پرسرعت رایگان و پریز برق در تمام میزها.",
      bookable: 0, slotDuration: 30,
      hours: [[0, "08:00", "23:00", 0], [1, "08:00", "23:00", 0], [2, "08:00", "23:00", 0], [3, "08:00", "23:00", 0], [4, "08:00", "23:00", 0], [5, "08:00", "00:00", 0], [6, "09:00", "23:00", 0]],
    },
    {
      category_id: 1, name: "میوه‌فروشی تازه", description: "میوه‌های فصل و خارجی با کیفیت",
      phone: "021-66335544", address: "تهران، خیابان انقلاب، بین فردوسی و جمهوری", lat: 35.7000, lng: 51.3800,
      available: 0, image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop",
      telegram: null, instagram: "tazeh_miveh", whatsapp: "9891211234567",
      about: "میوه‌فروشی تازه با تمرکز بر کیفیت و تازگی، انواع میوه‌های فصل و خارجی را با مناسب‌ترین قیمت عرضه می‌کند. میوه‌های ارگانیک محلی و میوه‌های وارداتی از بهترین برندها. جعبه‌های هدیه ویژه مناسبتهای خاص.",
      bookable: 0, slotDuration: 30,
      hours: [[0, "07:00", "15:00", 0], [1, "07:00", "15:00", 0], [2, "07:00", "15:00", 0], [3, "07:00", "15:00", 0], [4, "07:00", "15:00", 0], [5, "07:00", "15:00", 0], [6, "00:00", "00:00", 1]],
    },
    {
      category_id: 9, name: "عینک‌سازی نور", description: "عینک طبی، آفتابی و لنز",
      phone: "021-55779900", address: "تهران، خیابان شریعتی، بین حکیم و ملت", lat: 35.6950, lng: 51.3700,
      available: 1, image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=300&fit=crop",
      telegram: "https://t.me/noor_optics", instagram: "noor_optics_ir", whatsapp: "9891222345678",
      about: "عینک‌سازی نور با بیش از ۱۵ سال تجربه، خدمات بینایی‌سنجی توسط اپتومتریست مجرب و عینک‌های طبی و آفتابی از برندهای معتبر را ارائه می‌دهد. لنزهای طبی با گارانتی تعویض و تخفیف ویژه دانشجویان.",
      bookable: 1, slotDuration: 20,
      hours: [[0, "09:00", "19:00", 0], [1, "09:00", "19:00", 0], [2, "09:00", "19:00", 0], [3, "09:00", "19:00", 0], [4, "09:00", "19:00", 0], [5, "09:00", "14:00", 0], [6, "00:00", "00:00", 1]],
    },
  ];

  for (const shop of shops) {
    const result = insertShop.run(
      shop.category_id, shop.name, shop.description, shop.phone,
      shop.address, shop.lat, shop.lng, shop.available, shop.image,
      shop.telegram, shop.instagram, shop.whatsapp, shop.about,
      shop.bookable, shop.slotDuration
    );
    const shopId = result.lastInsertRowid as number;

    for (const [day, open, close, closed] of shop.hours) {
      insertHours.run(shopId, day, open, close, closed);
    }
  }

  console.log(`✅ Seeded ${shops.length} demo shops`);
} else {
  console.log(`✅ Database already has ${count.c} shops`);
}

export default db;
