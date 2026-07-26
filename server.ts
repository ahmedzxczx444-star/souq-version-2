import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import validator from "validator";
import xss from "xss-clean";
import { GoogleGenAI, Type } from "@google/genai";
import { searchCars } from "./searchEngine";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("automarket.db");

// Subscription and Promotion System Configuration (Feature Flag)
const SUBSCRIPTION_SYSTEM_ENABLED = false;

const PLANS = {
  free: {
    carLimit: 5,
    promotionLimit: 0,
    isVerified: false,
    priority: 0
  },
  pro: {
    carLimit: 20,
    promotionLimit: 5,
    isVerified: true,
    priority: 1
  },
  plus: {
    carLimit: 50,
    promotionLimit: 15,
    isVerified: true,
    priority: 2
  },
  premium: {
    carLimit: -1, // Unlimited
    promotionLimit: -1, // Unlimited
    isVerified: true,
    priority: 3
  }
};

// Extend Database Schema for Subscription and Promotion System
// (Moved below to run after table creation)

// Core Logic for Subscription and Promotion System
function getUserPlanInfo(user: any) {
  const planName = user.plan || 'free';
  return (PLANS as any)[planName] || PLANS.free;
}

function canPostCar(user: any) {
  if (!SUBSCRIPTION_SYSTEM_ENABLED) return true;
  const plan = getUserPlanInfo(user);
  if (plan.carLimit === -1) return true;
  return (user.monthly_car_count || 0) < plan.carLimit;
}

function canPromoteCar(user: any) {
  if (!SUBSCRIPTION_SYSTEM_ENABLED) return true;
  const plan = getUserPlanInfo(user);
  if (plan.promotionLimit === -1) return true;
  return (user.promotion_usage_count || 0) < plan.promotionLimit;
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'user',
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires DATETIME
  );

  CREATE TABLE IF NOT EXISTS dealers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    logo TEXT,
    description TEXT,
    location TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    address TEXT,
    map_location_link TEXT,
    rating REAL,
    branches_count INTEGER DEFAULT 1,
    reviews_count INTEGER DEFAULT 0,
    is_luxury INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    make TEXT,
    model TEXT,
    year INTEGER,
    price INTEGER,
    mileage INTEGER,
    location TEXT,
    fuel_type TEXT,
    transmission TEXT,
    description TEXT,
    images TEXT, -- JSON string array
    status TEXT DEFAULT 'available',
    views INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id)
  );

  CREATE TABLE IF NOT EXISTS reels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    caption TEXT,
    car_id INTEGER,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    FOREIGN KEY (car_id) REFERENCES cars(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER,
    car_id INTEGER,
    PRIMARY KEY (user_id, car_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (car_id) REFERENCES cars(id)
  );

  CREATE TABLE IF NOT EXISTS dealer_ratings (
    rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    user_id INTEGER,
    rating_value INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dealer_id, user_id),
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER,
    user_id INTEGER,
    dealer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (dealer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    sender_id INTEGER,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS dealer_follows (
    user_id INTEGER,
    dealer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, dealer_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (dealer_id) REFERENCES dealers(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    user_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reel_likes (
    user_id INTEGER,
    reel_id INTEGER,
    PRIMARY KEY (user_id, reel_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reel_id) REFERENCES reels(id)
  );

  CREATE TABLE IF NOT EXISTS dealer_branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    name TEXT,
    address TEXT,
    map_link TEXT,
    phone TEXT,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id)
  );
`);

// Extend Database Schema for Subscription and Promotion System (Safely after table creation)
try { db.exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN monthly_car_count INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN promotion_usage_count INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN subscription_start DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN subscription_end DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN is_promoted INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN promotion_expires DATETIME"); } catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME");
} catch (e) {}

try {
  db.exec("ALTER TABLE dealers ADD COLUMN latitude REAL");
} catch (e) {}
try {
  db.exec("ALTER TABLE dealers ADD COLUMN longitude REAL");
} catch (e) {}

// Migration: Add role column to users if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
} catch (e) {}

try {
  db.exec("ALTER TABLE dealers ADD COLUMN status TEXT DEFAULT 'pending'");
} catch (e) {}

try {
  db.exec("ALTER TABLE reels ADD COLUMN dealer_id INTEGER");
} catch (e) {}
try {
  db.exec("ALTER TABLE reels ADD COLUMN views INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE reels ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
} catch (e) {}

// Seed Data if empty
const dealerCount = db.prepare("SELECT COUNT(*) as count FROM dealers").get() as { count: number };
const carCount = db.prepare("SELECT COUNT(*) as count FROM cars").get() as { count: number };

if (dealerCount.count === 0 || carCount.count === 0) {
  console.log("Database empty or missing cars/dealers. Seeding...");
  
  // Clear existing to avoid ID mismatches if partially seeded
  if (dealerCount.count === 0 || carCount.count === 0) {
    db.prepare("DELETE FROM reels").run();
    db.prepare("DELETE FROM cars").run();
    db.prepare("DELETE FROM dealers").run();
    // Keep super_admin if exists
    db.prepare("DELETE FROM users WHERE role != 'super_admin'").run();
  }

  const insertUser = db.prepare("INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, 1)");

  // Check if admin exists
  const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@automarket.com");
  if (!adminExists) {
    insertUser.run("admin@automarket.com", bcrypt.hashSync("admin123", 10), "مدير النظام", "super_admin");
  }

  const dealer1User = insertUser.run("info@unitedmotors-eg.com", bcrypt.hashSync("password", 10), "المتحدة للسيارات", "dealer").lastInsertRowid;
  const dealer2User = insertUser.run("sales@alnasrauto-eg.com", bcrypt.hashSync("password", 10), "مركز النصر للسيارات", "dealer").lastInsertRowid;
  const dealer3User = insertUser.run("contact@rotanamotors-eg.com", bcrypt.hashSync("password", 10), "روتانا موتورز الفاخرة", "dealer").lastInsertRowid;
  const dealer4User = insertUser.run("info@alexandria-auto-eg.com", bcrypt.hashSync("password", 10), "الإسكندرية أوتو", "dealer").lastInsertRowid;

  const insertDealer = db.prepare("INSERT INTO dealers (user_id, name, logo, description, location, phone, whatsapp_number, rating, branches_count, reviews_count, is_luxury, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const d1 = insertDealer.run(dealer1User, "المتحدة للسيارات", "https://api.dicebear.com/7.x/initials/svg?seed=United%20Motors&backgroundColor=065f46", "معرض متخصص في السيارات الأوروبية والاقتصادية بخبرة تمتد لأكثر من 10 سنوات في السوق المصري.", "التجمع الخامس، القاهرة الجديدة", "+20 100 123 4567", "+20 100 123 4567", 4.6, 2, 0, 0, 'active').lastInsertRowid;
  const d2 = insertDealer.run(dealer2User, "مركز النصر للسيارات", "https://api.dicebear.com/7.x/initials/svg?seed=Al%20Nasr%20Auto&backgroundColor=1a4d3e", "معرض سيارات مستعملة وجديدة بأسعار تنافسية وضمان على كل سياراتنا.", "مدينة نصر، القاهرة", "+20 101 234 5678", "+20 101 234 5678", 4.4, 1, 0, 0, 'active').lastInsertRowid;
  const d3 = insertDealer.run(dealer3User, "روتانا موتورز الفاخرة", "https://api.dicebear.com/7.x/initials/svg?seed=Rotana%20Motors&backgroundColor=92400e", "معرض متخصص في السيارات الفاخرة والنادرة لعملائنا المميزين.", "الشيخ زايد، الجيزة", "+20 122 345 6789", "+20 122 345 6789", 4.9, 3, 0, 1, 'active').lastInsertRowid;
  const d4 = insertDealer.run(dealer4User, "الإسكندرية أوتو", "https://api.dicebear.com/7.x/initials/svg?seed=Alexandria%20Auto&backgroundColor=1e3a8a", "معرض سيارات موثوق يخدم عملاء الإسكندرية والمناطق المجاورة منذ عام 2015.", "سموحة، الإسكندرية", "+20 111 456 7890", "+20 111 456 7890", 4.3, 1, 0, 0, 'active').lastInsertRowid;

  const insertCar = db.prepare("INSERT INTO cars (dealer_id, make, model, year, price, mileage, location, fuel_type, transmission, description, images, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertCar.run(d1, "BMW", "320i", 2022, 2450000, 18000, "التجمع الخامس، القاهرة الجديدة", "بنزين", "Automatic", "بي إم دبليو 320i موديل 2022 باللون الأسود، فبريكا بالكامل، صيانة توكيل، اقتصادية في استهلاك الوقود وأداء رياضي ممتاز.", JSON.stringify(["https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600268330186-76564be81357?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d1, "Kia", "Sportage", 2017, 970000, 85000, "السادس من أكتوبر، الجيزة", "بنزين", "Automatic", "كيا سبورتاج 2017 دفع رباعي، اللون فضي، حالة ممتازة، مناسبة للعائلات والاستخدام اليومي، فحص كامل متاح.", JSON.stringify(["https://images.unsplash.com/photo-1688893288248-3338b8491a46?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1688893287874-ac7fbd686c24?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d2, "Mercedes-Benz", "C200", 2021, 2850000, 32000, "مدينة نصر، القاهرة", "بنزين", "Automatic", "مرسيدس C200 موديل 2021 باللون الأبيض اللؤلؤي، فل كامل، إطارات جديدة، صيانة دورية بالوكيل.", JSON.stringify(["https://images.unsplash.com/photo-1714873383875-58cb3fa5f5e1?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1584936684506-c3a7086e8212?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d2, "Toyota", "Corolla", 2020, 780000, 45000, "مدينة نصر، القاهرة", "بنزين", "Automatic", "تويوتا كورولا 2020 اللون فضي، اقتصادية وموفرة للوقود، صيانة دورية منتظمة، جاهزة للمعاينة في القاهرة.", JSON.stringify(["https://images.unsplash.com/photo-1638618164682-12b986ec2a75?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1626072557464-90403d788e8d?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d2, "Hyundai", "Elantra", 2022, 850000, 21000, "مدينة نصر، القاهرة", "بنزين", "Automatic", "هيونداي إلنترا 2022 اللون أبيض، سيارة عائلية مريحة وواسعة، حساسات خلفية وشاشة تعمل باللمس.", JSON.stringify(["https://images.unsplash.com/photo-1643142314913-0cf633d9bbb5?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1777175013302-eaf4b3ef785a?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d3, "Rolls-Royce", "Ghost", 2023, 24500000, 3000, "الشيخ زايد، الجيزة", "بنزين", "Automatic", "رولز رويس غوست 2023 اللون أسود، فبريكا بالكامل، سقف نجوم، تصميم فاخر استثنائي.", JSON.stringify(["https://images.unsplash.com/photo-1624804269473-828dcc30a210?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1696233016084-30c8345d85ff?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d3, "Bentley", "Continental GT", 2022, 18200000, 8000, "الشيخ زايد، الجيزة", "بنزين", "Automatic", "بنتلي كونتيننتال جي تي 2022 اللون رمادي، فرش مولينر الجلدي الفاخر، أداء رياضي بمواصفات فائقة الفخامة.", JSON.stringify(["https://images.unsplash.com/photo-1609679605571-4323e084c314?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1471289549423-04adaecfa1f1?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d4, "Audi", "A6", 2019, 1950000, 60000, "سموحة، الإسكندرية", "بنزين", "Automatic", "أودي A6 موديل 2019 اللون رصاصي، فبريكا، فرش جلد، صيانة بالوكيل، تصميم أنيق وأداء قوي.", JSON.stringify(["https://images.unsplash.com/photo-1561924563-d9ad0f32b23f?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1615715070496-d85daab3618d?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d4, "Chevrolet", "Optra", 2016, 320000, 110000, "سموحة، الإسكندرية", "بنزين", "Manual", "شيفروليه أوبترا 2016 اللون فضي، قير عادي (مانيوال)، اقتصادية جدًا ومناسبة للاستخدام اليومي.", JSON.stringify(["https://images.unsplash.com/photo-1604945417112-07c84e9a21fa?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1673769615853-59ecd9965fad?q=80&w=1200&auto=format&fit=crop"]), 0);
  insertCar.run(d4, "MG", "ZS", 2023, 890000, 5000, "سموحة، الإسكندرية", "بنزين", "Automatic", "إم جي ZS موديل 2023 اللون أبيض، SUV مدمجة، كاميرا خلفية وشاشة لمس، ضمان ساري من الوكيل.", JSON.stringify(["https://images.unsplash.com/photo-1615887110697-0819ec23465f?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1642345810417-eecf7dda339b?q=80&w=1200&auto=format&fit=crop"]), 0);

  const insertReel = db.prepare("INSERT INTO reels (dealer_id, car_id, video_url, caption) VALUES (?, ?, ?, ?)");
  insertReel.run(d1, 1, "https://assets.mixkit.co/videos/preview/mixkit-fast-car-driving-on-a-highway-at-night-34505-large.mp4", "بي إم دبليو 320i جاهزة للمعاينة 🚗");
  insertReel.run(d3, 6, "https://assets.mixkit.co/videos/preview/mixkit-white-car-driving-on-a-winding-road-in-the-mountains-34504-large.mp4", "رولز رويس غوست في أبهى صورها 🏎️");
} else {
  // Repair: Ensure all dealers are active if they were stuck in pending
  db.prepare("UPDATE dealers SET status = 'active' WHERE status = 'pending'").run();
}

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = Number(process.env.PORT) || 3000;
  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

  // Gemini client stays server-side only - never expose GEMINI_API_KEY to the browser.
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  console.log(`Configuring server on port ${PORT}...`);

  // Multer configuration for video uploads
  const uploadDir = path.join(process.cwd(), "uploads", "reels");
  const carImagesDir = path.join(process.cwd(), "uploads", "cars");
  
  [uploadDir, carImagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "reel-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  const carImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, carImagesDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "car-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [".mp4", ".mov"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only .mp4 and .mov formats are allowed"));
      }
    },
  });

  const uploadCarImages = multer({
    storage: carImageStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB per image
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only .jpg, .png and .webp formats are allowed"));
      }
    },
  });

  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for simplicity in this environment if needed, or configure properly
    xFrameOptions: false,
  }));
  app.use(xss());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Rate limiting for auth routes
  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { error: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // reCAPTCHA verification helper
  const verifyRecaptcha = async (token: string) => {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) return true; // Skip if no secret is set (for development)
    
    try {
      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secret}&response=${token}`,
      });
      const data = await response.json() as any;
      return data.success;
    } catch (e) {
      console.error("reCAPTCHA verification failed:", e);
      return false;
    }
  };

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: "Access Denied. Admins only." });
    }
    next();
  };

  const logActivity = (action: string, userId: number, details: string) => {
    try {
      db.prepare("INSERT INTO activity_log (action, user_id, details) VALUES (?, ?, ?)").run(action, userId, details);
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  };

  const createNotification = (userId: number, type: string, message: string) => {
    try {
      db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(userId, type, message);
    } catch (e) {
      console.error("Failed to create notification:", e);
    }
  };

  // Cooldown system
  const lastAction = new Map<string, number>();
  const cooldownMiddleware = (actionName: string, seconds: number) => (req: any, res: any, next: any) => {
    const userId = req.user?.id || req.ip;
    const key = `${actionName}:${userId}`;
    const now = Date.now();
    const last = lastAction.get(key) || 0;
    if (now - last < seconds * 1000) {
      return res.status(429).json({ error: "Too many requests. Please wait." });
    }
    lastAction.set(key, now);
    next();
  };

  // Shared helper: fetch all active-dealer cars with images parsed (used by /api/cars and /api/search)
  const getActiveCars = (): any[] => {
    const cars = db.prepare(`
      SELECT
        cars.*,
        dealers.name as dealer_name,
        dealers.logo as dealer_logo,
        dealers.location as dealer_location,
        dealers.user_id as dealer_user_id,
        COALESCE(users.plan, 'free') as user_plan,
        (SELECT COUNT(*) FROM favorites WHERE car_id = cars.id) as favorites_count
      FROM cars
      JOIN dealers ON cars.dealer_id = dealers.id
      LEFT JOIN users ON dealers.user_id = users.id
      WHERE dealers.status = 'active'
      ORDER BY
        (CASE WHEN ? THEN cars.is_promoted ELSE 0 END) DESC,
        (CASE WHEN ? THEN
          CASE COALESCE(users.plan, 'free')
            WHEN 'premium' THEN 3
            WHEN 'plus' THEN 2
            WHEN 'pro' THEN 1
            ELSE 0
          END
        ELSE 0 END) DESC,
        cars.featured DESC,
        cars.createdAt DESC,
        cars.views DESC
    `).all(SUBSCRIPTION_SYSTEM_ENABLED ? 1 : 0, SUBSCRIPTION_SYSTEM_ENABLED ? 1 : 0);
    return cars.map((c: any) => {
      let images = [];
      try {
        images = c.images ? JSON.parse(c.images) : [];
      } catch (e) {
        console.error("Failed to parse images for car", c.id);
      }
      return { ...c, images, featured: !!c.featured };
    });
  };

  // API Routes
  app.get("/api/cars", (req, res) => {
    res.json(getActiveCars());
  });

  app.get("/api/cars/:id", (req, res) => {
    // Increment views
    try {
      db.prepare("UPDATE cars SET views = views + 1 WHERE id = ?").run(req.params.id);
    } catch (e) {
      console.error("Failed to increment views:", e);
    }

    const car = db.prepare(`
      SELECT cars.*, dealers.name as dealer_name, dealers.logo as dealer_logo, dealers.location as dealer_location, dealers.phone as dealer_phone, dealers.whatsapp_number as dealer_whatsapp, dealers.user_id as dealer_user_id
      FROM cars 
      JOIN dealers ON cars.dealer_id = dealers.id
      WHERE cars.id = ?
    `).get(req.params.id) as any;
    if (!car) return res.status(404).json({ error: "Car not found" });
    let images = [];
    try {
      images = car.images ? JSON.parse(car.images) : [];
    } catch (e) {
      console.error("Failed to parse images for car", car.id);
    }
    res.json({ ...car, images, featured: !!car.featured });
  });

  // Arabic-aware search: typo tolerant, understands price/city/transmission/fuel/body-type
  // phrases, ranks results, and falls back to relaxed/suggested results instead of nothing.
  app.get("/api/search", (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const cars = getActiveCars();
    const outcome = searchCars(cars, q);
    res.json({
      results: outcome.cars,
      count: outcome.cars.length,
      noExactMatch: outcome.noExactMatch,
      emptyQuery: outcome.emptyQuery,
      parsed: outcome.parsed,
    });
  });

  // Deterministic (no-LLM) reply used whenever Gemini is unavailable or fails,
  // so AI Search stays usable even without GEMINI_API_KEY configured in production.
  const buildDeterministicReply = (outcome: ReturnType<typeof searchCars>) => {
    if (outcome.emptyQuery) {
      return "اسألني عن أي سيارة، مثلاً: \"كيا سبورتاج\"، \"BMW موديل 2022\" أو \"عربية أوتوماتيك أقل من مليون جنيه\".";
    }
    if (outcome.cars.length === 0) {
      return "للأسف مفيش سيارات متاحة دلوقتي تطابق طلبك. جرّب تغيّر الميزانية أو الموديل، أو تصفح أحدث السيارات المعروضة.";
    }
    if (outcome.noExactMatch) {
      return `مفيش نتيجة مطابقة تمامًا لطلبك، بس دي أقرب ${Math.min(outcome.cars.length, 6)} سيارات ممكن تعجبك:`;
    }
    return `لقيت لك ${outcome.cars.length} سيارة تناسب طلبك:`;
  };

  app.post("/api/ai-search/chat", async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

    const allCars = getActiveCars();
    const outcome = searchCars(allCars, message);
    const candidates = outcome.cars.slice(0, 15);

    // Deterministic fallback path (no API key configured, or model call fails)
    const fallback = () => {
      const cars = candidates.slice(0, 6);
      res.json({ text: buildDeterministicReply(outcome), cars });
    };

    if (!genAI) return fallback();

    try {
      const carContext = candidates.map((c: any) => ({
        id: c.id, make: c.make, model: c.model, year: c.year, price: c.price,
        mileage: c.mileage, location: c.location, fuel_type: c.fuel_type,
        transmission: c.transmission, status: c.status,
      }));

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [{ text: `
            انت مساعد ذكي لسوق سيارات مصري اسمه "سوق السيارات". مهمتك مساعدة المستخدمين في العثور على سيارة مناسبة بالعربية.

            السيارات المرشحة (تم ترشيحها مسبقًا حسب طلب المستخدم من قاعدة البيانات الفعلية): ${JSON.stringify(carContext)}
            طلب المستخدم: "${message}"

            التعليمات:
            1. رد باللهجة المصرية أو العربية الفصحى البسيطة، بشكل ودود ومختصر.
            2. اذكر فقط سيارات موجودة فعلاً في القائمة المرشحة أعلاه، ولا تخترع سيارات غير موجودة.
            3. لو مفيش سيارات مرشحة أصلاً، قل ذلك بوضوح واقترح تعديل الطلب (ميزانية أو موديل مختلف).
            4. رجّع الرد بصيغة JSON بحقلين فقط: "text" (ردك النصي) و"matchedCarIds" (مصفوفة IDs من القائمة المرشحة فقط).
          ` }],
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              matchedCarIds: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            },
            required: ["text", "matchedCarIds"],
          },
        },
      });

      const parsed = JSON.parse(response.text as string);
      const candidateIds = new Set(candidates.map((c: any) => c.id));
      const matchedCars = candidates.filter((c: any) =>
        Array.isArray(parsed.matchedCarIds) && parsed.matchedCarIds.includes(c.id) && candidateIds.has(c.id)
      );
      res.json({ text: parsed.text, cars: matchedCars.length > 0 ? matchedCars : candidates.slice(0, 6) });
    } catch (e) {
      console.error("AI search chat error, falling back to deterministic search:", e);
      fallback();
    }
  });

  app.get("/api/dealers", (req, res) => {
    const { type } = req.query;
    
    if (type === "top") {
      // Ranking logic:
      // Score = (branches_count * 3) + (number_of_cars * 1) + (average_rating * 5) + (price_transparency_bonus)
      // Price transparency bonus: +10 if all cars have price > 0
      const dealers = db.prepare(`
        SELECT 
          d.*,
          (SELECT COUNT(*) FROM cars WHERE dealer_id = d.id) as car_count,
          (SELECT COUNT(*) FROM dealer_follows WHERE dealer_id = d.id) as followers_count,
          (SELECT AVG(rating_value) FROM dealer_ratings WHERE dealer_id = d.id) as avg_rating,
          (SELECT COUNT(*) FROM dealer_ratings WHERE dealer_id = d.id) as reviews_count,
          (
            (d.branches_count * 3) + 
            (SELECT COUNT(*) FROM cars WHERE dealer_id = d.id) + 
            (COALESCE((SELECT AVG(rating_value) FROM dealer_ratings WHERE dealer_id = d.id), 0) * 5) +
            (CASE WHEN (SELECT COUNT(*) FROM cars WHERE dealer_id = d.id AND (price IS NULL OR price = 0)) = 0 AND (SELECT COUNT(*) FROM cars WHERE dealer_id = d.id) > 0 THEN 10 ELSE 0 END)
          ) as score
        FROM dealers d
        WHERE d.status = 'active'
        ORDER BY score DESC
        LIMIT 6
      `).all();
      
      return res.json(dealers.map((d: any) => ({
        ...d,
        rating: d.avg_rating || d.rating || 0, // Fallback to legacy rating if no new ratings
        reviews_count: d.reviews_count || 0
      })));
    }

    let query = "SELECT *, (SELECT COUNT(*) FROM cars WHERE dealer_id = dealers.id) as car_count, (SELECT COUNT(*) FROM dealer_follows WHERE dealer_id = dealers.id) as followers_count FROM dealers WHERE status = 'active'";
    const params: any[] = [];

    if (type === "luxury") {
      query += " AND is_luxury = 1";
    }

    const dealers = db.prepare(query).all(...params);
    res.json(dealers.map((d: any) => ({
      ...d,
      rating: db.prepare("SELECT AVG(rating_value) as avg FROM dealer_ratings WHERE dealer_id = ?").get(d.id)?.avg || d.rating || 0,
      reviews_count: db.prepare("SELECT COUNT(*) as count FROM dealer_ratings WHERE dealer_id = ?").get(d.id)?.count || 0
    })));
  });

  app.get("/api/dealers/:id", (req, res) => {
    const dealer = db.prepare(`
      SELECT 
        d.*,
        (SELECT AVG(rating_value) FROM dealer_ratings WHERE dealer_id = d.id) as avg_rating,
        (SELECT COUNT(*) FROM dealer_ratings WHERE dealer_id = d.id) as reviews_count_new,
        (SELECT COUNT(*) FROM dealer_follows WHERE dealer_id = d.id) as followers_count
      FROM dealers d 
      WHERE d.id = ?
    `).get(req.params.id) as any;
    
    const cars = db.prepare("SELECT * FROM cars WHERE dealer_id = ?").all(req.params.id);
    const branches = db.prepare("SELECT * FROM dealer_branches WHERE dealer_id = ?").all(req.params.id);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });
    
    res.json({ 
      ...dealer, 
      rating: dealer.avg_rating || dealer.rating || 0,
      reviews_count: dealer.reviews_count_new || 0,
      cars: cars.map((c: any) => {
        let images = [];
        try {
          images = c.images ? JSON.parse(c.images) : [];
        } catch (e) {
          console.error("Failed to parse images for car", c.id);
        }
        return { ...c, images };
      }),
      branches: branches
    });
  });

  app.post("/api/dealers/:id/rate", authenticate, (req: any, res) => {
    const { rating } = req.body;
    const dealerId = req.params.id;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Invalid rating value" });
    }

    // Check if dealer is rating themselves
    const dealer = db.prepare("SELECT user_id FROM dealers WHERE id = ?").get(dealerId) as any;
    if (dealer && dealer.user_id === userId) {
      return res.status(403).json({ error: "Dealers cannot rate themselves" });
    }

    try {
      db.prepare(`
        INSERT INTO dealer_ratings (dealer_id, user_id, rating_value)
        VALUES (?, ?, ?)
        ON CONFLICT(dealer_id, user_id) DO UPDATE SET rating_value = excluded.rating_value
      `).run(dealerId, userId, rating);
      
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to submit rating" });
    }
  });

  app.get("/api/dealer/profile", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can access this" });
    const dealer = db.prepare("SELECT * FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (dealer) {
      const branches = db.prepare("SELECT * FROM dealer_branches WHERE dealer_id = ?").all(dealer.id);
      dealer.branches = branches;
    }
    res.json(dealer);
  });

  app.put("/api/dealer/profile", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can access this" });
    const { name, logo, description, location, phone, whatsapp_number, address, map_location_link, branches } = req.body;
    
    const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    db.prepare(`
      UPDATE dealers 
      SET name = ?, logo = ?, description = ?, location = ?, phone = ?, whatsapp_number = ?, address = ?, map_location_link = ?
      WHERE user_id = ?
    `).run(name, logo, description, location, phone, whatsapp_number, address, map_location_link, req.user.id);
    
    // Update branches
    if (Array.isArray(branches)) {
      db.prepare("DELETE FROM dealer_branches WHERE dealer_id = ?").run(dealer.id);
      const insertBranch = db.prepare("INSERT INTO dealer_branches (dealer_id, name, address, map_link, phone) VALUES (?, ?, ?, ?, ?)");
      for (const branch of branches) {
        insertBranch.run(dealer.id, branch.name, branch.address, branch.map_link || null, branch.phone || null);
      }
    }

    res.json({ success: true });
  });

  // Favorites
  app.get("/api/favorites", authenticate, (req: any, res) => {
    const favorites = db.prepare(`
      SELECT cars.*, dealers.name as dealer_name
      FROM favorites
      JOIN cars ON favorites.car_id = cars.id
      JOIN dealers ON cars.dealer_id = dealers.id
      WHERE favorites.user_id = ?
    `).all(req.user.id);
    res.json(favorites.map((c: any) => {
      let images = [];
      try {
        images = c.images ? JSON.parse(c.images) : [];
      } catch (e) {
        console.error("Failed to parse images for car", c.id);
      }
      return { ...c, images };
    }));
  });

  app.post("/api/favorites/:carId", authenticate, (req: any, res) => {
    try {
      db.prepare("INSERT INTO favorites (user_id, car_id) VALUES (?, ?)").run(req.user.id, req.params.carId);
      
      // Notify dealer
      const car = db.prepare("SELECT dealer_id, make, model FROM cars WHERE id = ?").get(req.params.carId) as any;
      if (car) {
        const dealer = db.prepare("SELECT user_id FROM dealers WHERE id = ?").get(car.dealer_id) as any;
        if (dealer && dealer.user_id !== req.user.id) {
          createNotification(dealer.user_id, "favorite", `قام مستخدم بإضافة سيارتك (${car.make} ${car.model}) إلى المفضلة`);
        }
      }
      
      res.json({ success: true });
    } catch (e) {
      db.prepare("DELETE FROM favorites WHERE user_id = ? AND car_id = ?").run(req.user.id, req.params.carId);
      res.json({ success: true, removed: true });
    }
  });

  // Auth Routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const { email, password, name, role, phone, whatsapp_number, branches_count, address, latitude, longitude, logo, captchaToken } = req.body;
    
    // Input Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // reCAPTCHA verification
    if (process.env.RECAPTCHA_SECRET && !(await verifyRecaptcha(captchaToken))) {
      return res.status(400).json({ error: "reCAPTCHA verification failed" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    try {
      const result = db.prepare("INSERT INTO users (email, password, name, role, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?)").run(
        validator.normalizeEmail(email),
        hashedPassword,
        name,
        role || 'user',
        verificationToken,
        role === 'dealer' ? 0 : 1 // Auto-verify normal users for now, dealers must verify
      );
      const userId = result.lastInsertRowid;

      if (role === 'dealer') {
        db.prepare(`
          INSERT INTO dealers (user_id, name, logo, phone, whatsapp_number, branches_count, address, latitude, longitude, rating)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          name,
          logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          phone || '',
          whatsapp_number || '',
          branches_count || 1,
          address || '',
          latitude || null,
          longitude || null,
          5.0
        );

        console.log(`[EMAIL SIMULATION] Verification email sent to ${email}. Token: ${verificationToken}`);
        console.log(`[VERIFY LINK] http://localhost:3000/api/auth/verify/${verificationToken}`);
      }

      const token = jwt.sign({ id: userId, email, name, role: role || 'user' }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ 
        token, 
        user: { id: userId, email, name, role: role || 'user' },
        requiresVerification: role === 'dealer'
      });
    } catch (e) {
      console.error("Registration error:", e);
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.get("/api/auth/verify/:token", (req, res) => {
    const { token } = req.params;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const result = db.prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?").run(token);
      
      if (result.changes === 0) {
        return res.send("<h1>رابط التحقق غير صالح أو منتهي الصلاحية</h1>");
      }

      res.send(`
        <div style="text-align: center; padding: 50px; font-family: sans-serif;">
          <h1 style="color: #10b981;">تم التحقق من البريد الإلكتروني بنجاح!</h1>
          <p>يمكنك الآن تسجيل الدخول إلى حسابك.</p>
          <a href="/" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 12px; margin-top: 20px;">العودة للتطبيق</a>
        </div>
      `);
    } catch (e) {
      res.send("<h1>رابط التحقق غير صالح أو منتهي الصلاحية</h1>");
    }
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
    
    if (!user) {
      return res.json({ success: true }); // Don't reveal if user exists
    }

    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    const expires = new Date(Date.now() + 3600000).toISOString();

    db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?").run(resetToken, expires, user.id);

    console.log(`[EMAIL SIMULATION] Password reset email sent to ${email}. Token: ${resetToken}`);
    
    res.json({ success: true });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare("SELECT * FROM users WHERE id = ? AND reset_token = ?").get(decoded.id, token) as any;

      if (!user || new Date(user.reset_token_expires) < new Date()) {
        return res.status(400).json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare("UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?").run(hashedPassword, user.id);

      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password, captchaToken } = req.body;
    
    // Input Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // reCAPTCHA verification
    if (process.env.RECAPTCHA_SECRET && !(await verifyRecaptcha(captchaToken))) {
      return res.status(400).json({ error: "reCAPTCHA verification failed" });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      logActivity("Failed login attempt", 0, `Failed login attempt for email: ${email}`);
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }
    
    if (user.role === 'dealer' && !user.is_verified) {
      logActivity("Failed login attempt", user.id, `Unverified dealer login attempt: ${email}`);
      return res.status(403).json({ error: "يرجى التحقق من بريدك الإلكتروني أولاً" });
    }
    
    let dealerId = null;
    if (user.role === 'dealer') {
      const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(user.id) as any;
      dealerId = dealer?.id;
    }

    logActivity("Successful login", user.id, `User ${user.id} logged in`);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, dealerId }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, dealerId } });
  });

  // Notifications API
  app.get("/api/notifications", authenticate, (req: any, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(notifications);
  });

  app.put("/api/notifications/:id/read", authenticate, (req: any, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Privacy & Security API
  app.post("/api/auth/change-password", authenticate, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user.id) as any;
    
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
    
    logActivity("Password changed", req.user.id, "User changed their password");
    res.json({ success: true });
  });

  app.post("/api/auth/logout-all", authenticate, (req: any, res) => {
    logActivity("Logout from all devices", req.user.id, "User requested logout from all devices");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(req.user.id) as any;
    const dealer = db.prepare("SELECT phone FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    res.json({ ...user, phone: dealer?.phone || "" });
  });

  // Car Management
  app.post("/api/cars/upload", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can upload images" });
    
    uploadCarImages.array("images", 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Maximum 10 images allowed" });
        }
        return res.status(400).json({ error: `Multer error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.files || (req.files as any[]).length === 0) {
        return res.status(400).json({ error: "At least 1 image is required" });
      }

      const imageUrls = (req.files as any[]).map(file => `/uploads/cars/${file.filename}`);
      res.json({ images: imageUrls });
    });
  });

  app.post("/api/cars", authenticate, cooldownMiddleware("add_car", 10), (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can add cars" });
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!canPostCar(user)) {
      return res.status(403).json({ error: "Monthly car posting limit reached for your plan" });
    }

    const dealer = db.prepare("SELECT id, status FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (!dealer) return res.status(404).json({ error: "Dealer profile not found" });
    if (dealer.status !== 'active') return res.status(403).json({ error: "Your account is pending approval" });

    const { make, model, year, price, mileage, location, fuel_type, transmission, description, images, video_url, status } = req.body;
    
    // Validation
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least 1 image is required" });
    }
    if (images.length > 10) {
      return res.status(400).json({ error: "Maximum 10 images allowed" });
    }
    if (!make || !model || !year || !price) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Featured logic: luxury brands or price >= 5,000,000
    const luxuryBrands = ["porsche", "ferrari", "lamborghini", "rolls-royce", "bentley", "aston martin", "mclaren", "maserati", "bugatti", "maybach"];
    const isLuxuryBrand = luxuryBrands.includes(make.toLowerCase());
    const isHighPrice = parseInt(price) >= 5000000;
    const isFeatured = isLuxuryBrand || isHighPrice ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO cars (dealer_id, make, model, year, price, mileage, location, fuel_type, transmission, description, images, status, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(dealer.id, make, model, year, price, mileage, location, fuel_type || 'Petrol', transmission || 'Automatic', description, JSON.stringify(images || []), status || 'available', isFeatured);

    logActivity("Dealer added car", req.user.id, `Dealer ${dealer.id} added ${make} ${model}`);

    if (video_url) {
      db.prepare("INSERT INTO reels (car_id, video_url, caption) VALUES (?, ?, ?)").run(result.lastInsertRowid, video_url, `${make} ${model}`);
    }

    if (SUBSCRIPTION_SYSTEM_ENABLED) {
      db.prepare("UPDATE users SET monthly_car_count = monthly_car_count + 1 WHERE id = ?").run(req.user.id);
    }

    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.get("/api/dealer/cars", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can access this" });
    
    const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (!dealer) return res.status(404).json({ error: "Dealer profile not found" });

    const cars = db.prepare("SELECT * FROM cars WHERE dealer_id = ? ORDER BY id DESC").all(dealer.id);
    res.json(cars.map((c: any) => {
      let images = [];
      try {
        images = c.images ? JSON.parse(c.images) : [];
      } catch (e) {
        console.error("Failed to parse images for car", c.id);
      }
      return { ...c, images, featured: !!c.featured };
    }));
  });

  // Dealer Statistics
  app.get("/api/dealer/stats", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can access this" });
    
    const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (!dealer) return res.status(404).json({ error: "Dealer profile not found" });

    const totalCars = db.prepare("SELECT COUNT(*) as count FROM cars WHERE dealer_id = ?").get(dealer.id) as any;
    const totalFollowers = db.prepare("SELECT COUNT(*) as count FROM dealer_follows WHERE dealer_id = ?").get(dealer.id) as any;
    
    // Sum of likes from reels associated with this dealer's cars
    const totalLikes = db.prepare(`
      SELECT SUM(reels.likes) as count 
      FROM reels 
      JOIN cars ON reels.car_id = cars.id 
      WHERE cars.dealer_id = ?
    `).get(dealer.id) as any;

    res.json({
      totalCars: totalCars.count || 0,
      totalFollowers: totalFollowers.count || 0,
      totalLikes: totalLikes.count || 0
    });
  });

  // Subscription and Promotion Endpoints
  app.get("/api/user/plan", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, plan, monthly_car_count, promotion_usage_count, subscription_start, subscription_end FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const planConfig = getUserPlanInfo(user);
    res.json({
      ...user,
      config: planConfig,
      systemEnabled: SUBSCRIPTION_SYSTEM_ENABLED
    });
  });

  app.post("/api/cars/:id/promote", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can promote cars" });
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    const car = db.prepare("SELECT * FROM cars WHERE id = ?").get(req.params.id) as any;
    
    if (!car) return res.status(404).json({ error: "Car not found" });
    
    const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (car.dealer_id !== dealer.id) return res.status(403).json({ error: "You can only promote your own cars" });

    if (SUBSCRIPTION_SYSTEM_ENABLED) {
      if (!canPromoteCar(user)) {
        return res.status(403).json({ 
          error: "Promotion limit reached for your plan",
          paidPromotionAvailable: true 
        });
      }
      
      db.prepare("UPDATE cars SET is_promoted = 1, promotion_expires = datetime('now', '+7 days') WHERE id = ?").run(req.params.id);
      db.prepare("UPDATE users SET promotion_usage_count = promotion_usage_count + 1 WHERE id = ?").run(req.user.id);
      
      logActivity("Dealer promoted car", req.user.id, `Dealer ${dealer.id} promoted car ${car.id}`);
      res.json({ success: true, message: "Car promoted successfully for 7 days" });
    } else {
      res.json({ success: true, message: "Promotion system is currently in preview mode" });
    }
  });

  // --- Subscription & Promotion Control Layer ---

  // 1. Change User Plan
  app.post("/api/admin/users/:userId/plan", authenticate, isAdmin, (req: any, res) => {
    const { plan } = req.body;
    const { userId } = req.params;

    if (!(PLANS as any)[plan]) {
      return res.status(400).json({ error: "Invalid plan name" });
    }

    db.prepare("UPDATE users SET plan = ?, subscription_start = datetime('now') WHERE id = ?").run(plan, userId);
    logActivity("Admin changed user plan", req.user.id, `Admin changed user ${userId} plan to ${plan}`);
    res.json({ success: true, message: `User plan updated to ${plan}` });
  });

  // 2. Get User Subscription Info
  app.get("/api/user/subscription", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, plan, monthly_car_count, promotion_usage_count, subscription_start, subscription_end FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const planConfig = getUserPlanInfo(user);
    res.json({
      currentPlan: user.plan || 'free',
      carsUsedThisMonth: user.monthly_car_count || 0,
      promotionsUsed: user.promotion_usage_count || 0,
      planLimits: planConfig,
      subscriptionStart: user.subscription_start,
      subscriptionEnd: user.subscription_end,
      systemEnabled: SUBSCRIPTION_SYSTEM_ENABLED
    });
  });

  // 3. Promote Car (Admin/Control version)
  app.post("/api/admin/cars/:carId/promote-for-user/:userId", authenticate, isAdmin, (req: any, res) => {
    const { carId, userId } = req.params;
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const car = db.prepare("SELECT * FROM cars WHERE id = ?").get(carId) as any;
    
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!car) return res.status(404).json({ error: "Car not found" });

    if (SUBSCRIPTION_SYSTEM_ENABLED) {
      if (!canPromoteCar(user)) {
        return res.status(403).json({ 
          error: "Promotion limit reached for user plan",
          paidPromotionAvailable: true 
        });
      }
      
      db.prepare("UPDATE cars SET is_promoted = 1, promotion_expires = datetime('now', '+7 days') WHERE id = ?").run(carId);
      db.prepare("UPDATE users SET promotion_usage_count = promotion_usage_count + 1 WHERE id = ?").run(userId);
      
      logActivity("Admin promoted car for user", req.user.id, `Admin promoted car ${carId} for user ${userId}`);
      res.json({ success: true, message: "Car promoted successfully" });
    } else {
      // If system is disabled, still allow promotion but don't restrict
      db.prepare("UPDATE cars SET is_promoted = 1, promotion_expires = datetime('now', '+7 days') WHERE id = ?").run(carId);
      res.json({ success: true, message: "Car promoted successfully (System in preview mode)" });
    }
  });

  // 4. Reset Monthly Usage
  app.post("/api/admin/users/:userId/reset-usage", authenticate, isAdmin, (req: any, res) => {
    const { userId } = req.params;
    db.prepare("UPDATE users SET monthly_car_count = 0, promotion_usage_count = 0 WHERE id = ?").run(userId);
    logActivity("Admin reset user usage", req.user.id, `Admin reset usage for user ${userId}`);
    res.json({ success: true, message: "User usage reset successfully" });
  });

  app.post("/api/admin/reset-all-usage", authenticate, isAdmin, (req: any, res) => {
    db.prepare("UPDATE users SET monthly_car_count = 0, promotion_usage_count = 0").run();
    logActivity("Admin reset all users usage", req.user.id, "Admin reset usage for all users");
    res.json({ success: true, message: "All users usage reset successfully" });
  });

  // --- Missing Subscription API Endpoints ---

  // 1. Change Plan
  app.post("/api/subscription/change-plan", authenticate, isAdmin, (req: any, res) => {
    const { userId, plan } = req.body;

    if (!(PLANS as any)[plan]) {
      return res.status(400).json({ error: "Invalid plan name. Must be free, pro, plus, or premium." });
    }

    const result = db.prepare("UPDATE users SET plan = ?, subscription_start = datetime('now') WHERE id = ?").run(plan, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    logActivity("Subscription plan changed", req.user.id, `Plan for user ${userId} changed to ${plan}`);
    res.json({ success: true, message: `Plan updated to ${plan} for user ${userId}` });
  });

  // 2. Get Subscription Info
  app.get("/api/subscription/:userId", authenticate, (req: any, res) => {
    const { userId } = req.params;
    
    // Allow users to see their own info, or admins to see anyone's
    if (req.user.id != userId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized to view this subscription info" });
    }

    const user = db.prepare("SELECT plan, monthly_car_count, promotion_usage_count FROM users WHERE id = ?").get(userId) as any;
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const planConfig = getUserPlanInfo(user);
    
    res.json({
      currentPlan: user.plan || 'free',
      carsPostedThisMonth: user.monthly_car_count || 0,
      promotionsUsed: user.promotion_usage_count || 0,
      limits: planConfig
    });
  });

  // 3. Promote Car
  app.post("/api/subscription/promote", authenticate, (req: any, res) => {
    const { userId, carId } = req.body;

    // Security check: user can only promote for themselves unless admin
    if (req.user.id != userId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized to promote for this user" });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const car = db.prepare("SELECT * FROM cars WHERE id = ?").get(carId) as any;

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!car) return res.status(404).json({ error: "Car not found" });

    // Verify car belongs to the user (via dealer)
    const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(userId) as any;
    if (!dealer || car.dealer_id !== dealer.id) {
      return res.status(403).json({ error: "Car does not belong to this user's dealership" });
    }

    if (SUBSCRIPTION_SYSTEM_ENABLED) {
      if (!canPromoteCar(user)) {
        return res.status(403).json({ 
          error: "Promotion limit reached for this plan",
          paidPromotionAvailable: true 
        });
      }

      db.prepare("UPDATE cars SET is_promoted = 1, promotion_expires = datetime('now', '+7 days') WHERE id = ?").run(carId);
      db.prepare("UPDATE users SET promotion_usage_count = promotion_usage_count + 1 WHERE id = ?").run(userId);

      logActivity("Car promoted via API", req.user.id, `Car ${carId} promoted for user ${userId}`);
      res.json({ success: true, message: "Car promoted successfully" });
    } else {
      // If system is disabled, still allow promotion but don't restrict
      db.prepare("UPDATE cars SET is_promoted = 1, promotion_expires = datetime('now', '+7 days') WHERE id = ?").run(carId);
      res.json({ success: true, message: "Car promoted successfully (System in preview mode)" });
    }
  });

  // Follow Dealer
  app.post("/api/dealers/:id/follow", authenticate, (req: any, res) => {
    const dealerId = req.params.id;
    const userId = req.user.id;

    const existing = db.prepare("SELECT * FROM dealer_follows WHERE user_id = ? AND dealer_id = ?").get(userId, dealerId);

    if (existing) {
      db.prepare("DELETE FROM dealer_follows WHERE user_id = ? AND dealer_id = ?").run(userId, dealerId);
      res.json({ followed: false });
    } else {
      db.prepare("INSERT INTO dealer_follows (user_id, dealer_id) VALUES (?, ?)").run(userId, dealerId);
      
      // Notify dealer
      const dealer = db.prepare("SELECT user_id FROM dealers WHERE id = ?").get(dealerId) as any;
      if (dealer && dealer.user_id !== userId) {
        createNotification(dealer.user_id, "follow", "قام مستخدم بمتابعة معرضك");
      }
      
      logActivity("User followed dealer", userId, `User ${userId} followed dealer ${dealerId}`);
      res.json({ followed: true });
    }
  });

  app.get("/api/dealers/:id/follow-status", authenticate, (req: any, res) => {
    const dealerId = req.params.id;
    const userId = req.user.id;
    const existing = db.prepare("SELECT * FROM dealer_follows WHERE user_id = ? AND dealer_id = ?").get(userId, dealerId);
    res.json({ followed: !!existing });
  });

  app.put("/api/cars/:id", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can edit cars" });
    
    const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    const car = db.prepare("SELECT dealer_id FROM cars WHERE id = ?").get(req.params.id) as any;
    
    if (!car) return res.status(404).json({ error: "Car not found" });
    if (car.dealer_id !== dealer.id) return res.status(403).json({ error: "Unauthorized to edit this car" });

    const { make, model, year, price, mileage, location, fuel_type, transmission, description, images, status } = req.body;
    
    // Validation
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least 1 image is required" });
    }
    if (images.length > 10) {
      return res.status(400).json({ error: "Maximum 10 images allowed" });
    }
    if (!make || !model || !year || !price) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Featured logic: luxury brands or price >= 5,000,000
    const luxuryBrands = ["porsche", "ferrari", "lamborghini", "rolls-royce", "bentley", "aston martin", "mclaren", "maserati", "bugatti", "maybach"];
    const isLuxuryBrand = luxuryBrands.includes(make.toLowerCase());
    const isHighPrice = parseInt(price) >= 5000000;
    const isFeatured = isLuxuryBrand || isHighPrice ? 1 : 0;

    db.prepare(`
      UPDATE cars 
      SET make = ?, model = ?, year = ?, price = ?, mileage = ?, location = ?, fuel_type = ?, transmission = ?, description = ?, images = ?, status = ?, featured = ?
      WHERE id = ?
    `).run(make, model, year, price, mileage, location, fuel_type, transmission, description, JSON.stringify(images), status || 'available', isFeatured, req.params.id);

    res.json({ success: true });
  });

  app.delete("/api/cars/:id", authenticate, (req: any, res) => {
    console.log(`[DELETE] Attempting to delete car ID: ${req.params.id} by user: ${req.user.id}`);
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can delete cars" });
    
    const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (!dealer) {
      console.log(`[DELETE] Dealer profile not found for user: ${req.user.id}`);
      return res.status(404).json({ error: "Dealer profile not found" });
    }

    const car = db.prepare("SELECT dealer_id FROM cars WHERE id = ?").get(req.params.id) as any;
    if (!car) {
      console.log(`[DELETE] Car not found: ${req.params.id}`);
      return res.status(404).json({ error: "Car not found" });
    }
    
    if (car.dealer_id !== dealer.id) {
      console.log(`[DELETE] Unauthorized delete attempt. Car dealer: ${car.dealer_id}, Request dealer: ${dealer.id}`);
      return res.status(403).json({ error: "Unauthorized to delete this car" });
    }

    try {
      db.prepare("DELETE FROM favorites WHERE car_id = ?").run(req.params.id);
      db.prepare("DELETE FROM reels WHERE car_id = ?").run(req.params.id);
      db.prepare("DELETE FROM cars WHERE id = ?").run(req.params.id);
      console.log(`[DELETE] Successfully deleted car: ${req.params.id}`);
      res.json({ success: true });
    } catch (e) {
      console.error("[DELETE] Error deleting car:", e);
      res.status(500).json({ error: "Failed to delete car" });
    }
  });

  // Admin Routes
  app.get("/api/admin/stats", authenticate, isAdmin, (req, res) => {
    const totalCars = db.prepare("SELECT COUNT(*) as count FROM cars").get() as any;
    const totalDealers = db.prepare("SELECT COUNT(*) as count FROM dealers").get() as any;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    res.json({
      totalCars: totalCars.count,
      totalDealers: totalDealers.count,
      totalUsers: totalUsers.count
    });
  });

  app.get("/api/admin/cars", authenticate, isAdmin, (req, res) => {
    const cars = db.prepare(`
      SELECT cars.*, dealers.name as dealer_name 
      FROM cars 
      JOIN dealers ON cars.dealer_id = dealers.id
      ORDER BY cars.createdAt DESC
    `).all();
    res.json(cars.map((c: any) => {
      let images = [];
      try {
        images = c.images ? JSON.parse(c.images) : [];
      } catch (e) {
        console.error("Failed to parse images for car", c.id);
      }
      return { ...c, images };
    }));
  });

  app.delete("/api/admin/cars/:id", authenticate, isAdmin, (req: any, res) => {
    const car = db.prepare("SELECT make, model FROM cars WHERE id = ?").get(req.params.id) as any;
    if (car) {
      db.prepare("DELETE FROM favorites WHERE car_id = ?").run(req.params.id);
      db.prepare("DELETE FROM reels WHERE car_id = ?").run(req.params.id);
      db.prepare("DELETE FROM cars WHERE id = ?").run(req.params.id);
      logActivity("Admin deleted car", req.user.id, `Admin deleted car: ${car.make} ${car.model} (ID: ${req.params.id})`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Car not found" });
    }
  });

  app.put("/api/admin/cars/:id/hide", authenticate, isAdmin, (req: any, res) => {
    db.prepare("UPDATE cars SET status = 'hidden' WHERE id = ?").run(req.params.id);
    logActivity("Admin hid car", req.user.id, `Admin hid car ID: ${req.params.id}`);
    res.json({ success: true });
  });

  app.get("/api/admin/dealers", authenticate, isAdmin, (req, res) => {
    const { status } = req.query;
    let query = `
      SELECT d.*, u.email, (SELECT COUNT(*) FROM cars WHERE dealer_id = d.id) as car_count
      FROM dealers d
      JOIN users u ON d.user_id = u.id
    `;
    const params: any[] = [];
    
    if (status) {
      query += " WHERE d.status = ?";
      params.push(status);
    }

    const dealers = db.prepare(query).all(...params);
    res.json(dealers);
  });

  app.put("/api/admin/dealers/:id/approve", authenticate, isAdmin, (req: any, res) => {
    const dealer = db.prepare("SELECT name, user_id FROM dealers WHERE id = ?").get(req.params.id) as any;
    if (dealer) {
      db.prepare("UPDATE dealers SET status = 'active' WHERE id = ?").run(req.params.id);
      db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(dealer.user_id);
      logActivity("Admin approved dealer", req.user.id, `Admin approved dealer: ${dealer.name} (ID: ${req.params.id})`);
      createNotification(dealer.user_id, "approval", "تمت الموافقة على حساب المعرض الخاص بك بنجاح!");
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Dealer not found" });
    }
  });

  app.put("/api/admin/dealers/:id/reject", authenticate, isAdmin, (req: any, res) => {
    const dealer = db.prepare("SELECT name, user_id FROM dealers WHERE id = ?").get(req.params.id) as any;
    if (dealer) {
      db.prepare("UPDATE dealers SET status = 'rejected' WHERE id = ?").run(req.params.id);
      logActivity("Admin rejected dealer", req.user.id, `Admin rejected dealer: ${dealer.name} (ID: ${req.params.id})`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Dealer not found" });
    }
  });

  app.put("/api/admin/dealers/:id/suspend", authenticate, isAdmin, (req: any, res) => {
    const dealer = db.prepare("SELECT name, user_id FROM dealers WHERE id = ?").get(req.params.id) as any;
    if (dealer) {
      db.prepare("UPDATE users SET is_verified = 0 WHERE id = ?").run(dealer.user_id);
      logActivity("Admin suspended dealer", req.user.id, `Admin suspended dealer: ${dealer.name} (ID: ${req.params.id})`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Dealer not found" });
    }
  });

  app.delete("/api/admin/dealers/:id", authenticate, isAdmin, (req: any, res) => {
    const dealer = db.prepare("SELECT name, user_id FROM dealers WHERE id = ?").get(req.params.id) as any;
    if (dealer) {
      db.prepare("DELETE FROM dealer_follows WHERE dealer_id = ?").run(req.params.id);
      db.prepare("DELETE FROM cars WHERE dealer_id = ?").run(req.params.id);
      db.prepare("DELETE FROM dealers WHERE id = ?").run(req.params.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(dealer.user_id);
      logActivity("Admin deleted dealer", req.user.id, `Admin deleted dealer: ${dealer.name} (ID: ${req.params.id})`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Dealer not found" });
    }
  });

  app.get("/api/admin/users", authenticate, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, name, email, role, is_verified FROM users").all();
    res.json(users);
  });

  app.put("/api/admin/users/:id/ban", authenticate, isAdmin, (req: any, res) => {
    db.prepare("UPDATE users SET is_verified = -1 WHERE id = ?").run(req.params.id);
    logActivity("Admin banned user", req.user.id, `Admin banned user ID: ${req.params.id}`);
    res.json({ success: true });
  });

  app.delete("/api/admin/users/:id", authenticate, isAdmin, (req: any, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    logActivity("Admin deleted user", req.user.id, `Admin deleted user ID: ${req.params.id}`);
    res.json({ success: true });
  });

  app.get("/api/admin/activity", authenticate, isAdmin, (req, res) => {
    const activity = db.prepare(`
      SELECT activity_log.*, users.name as user_name
      FROM activity_log
      LEFT JOIN users ON activity_log.user_id = users.id
      ORDER BY activity_log.created_at DESC
    `).all();
    res.json(activity);
  });

  // Reels API
  app.post("/api/reels/upload", authenticate, (req: any, res) => {
    upload.single("video")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Multer error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can upload reels" });
      if (!req.file) return res.status(400).json({ error: "No video file uploaded" });
      
      const videoUrl = `/uploads/reels/${req.file.filename}`;
      res.json({ video_url: videoUrl });
    });
  });

  app.get("/api/reels", (req: any, res) => {
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as any;
        userId = decoded.id;
      } catch (e) {}
    }

    const reels = db.prepare(`
      SELECT r.*, d.name as dealer_name, d.logo as dealer_logo, c.make, c.model,
             (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) as is_liked
      FROM reels r
      JOIN dealers d ON r.dealer_id = d.id
      LEFT JOIN cars c ON r.car_id = c.id
      WHERE d.status = 'active'
      ORDER BY r.created_at DESC
    `).all(userId);
    res.json(reels);
  });

  app.post("/api/reels", authenticate, (req: any, res) => {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: "Only dealers can upload reels" });
    
    const dealer = db.prepare("SELECT id, status FROM dealers WHERE user_id = ?").get(req.user.id) as any;
    if (!dealer) return res.status(404).json({ error: "Dealer profile not found" });
    if (dealer.status !== 'active') return res.status(403).json({ error: "Your account is pending approval" });

    const { video_url, caption, car_id } = req.body;
    
    const result = db.prepare(`
      INSERT INTO reels (dealer_id, video_url, caption, car_id)
      VALUES (?, ?, ?, ?)
    `).run(dealer.id, video_url, caption, car_id || null);

    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/reels/:id/view", (req, res) => {
    db.prepare("UPDATE reels SET views = views + 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/reels/:id/like", authenticate, (req: any, res) => {
    const reelId = req.params.id;
    const userId = req.user.id;

    const existing = db.prepare("SELECT * FROM reel_likes WHERE user_id = ? AND reel_id = ?").get(userId, reelId);

    if (existing) {
      db.prepare("DELETE FROM reel_likes WHERE user_id = ? AND reel_id = ?").run(userId, reelId);
      db.prepare("UPDATE reels SET likes = MAX(0, likes - 1) WHERE id = ?").run(reelId);
      res.json({ success: true, liked: false });
    } else {
      db.prepare("INSERT INTO reel_likes (user_id, reel_id) VALUES (?, ?)").run(userId, reelId);
      db.prepare("UPDATE reels SET likes = likes + 1 WHERE id = ?").run(reelId);
      res.json({ success: true, liked: true });
    }
  });

  // WhatsApp Cooldown
  app.post("/api/contact/whatsapp-click", cooldownMiddleware("whatsapp_click", 5), (req, res) => {
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize Vite middleware:", e);
    }
  } else {
    console.log("Serving static files from dist...");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running and listening on http://0.0.0.0:${PORT}`);
  });
}

console.log("Executing startServer()...");
startServer().catch(err => {
  console.error("Critical error during server startup:", err);
});
