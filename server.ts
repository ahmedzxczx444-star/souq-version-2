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
import { searchCars, searchCarsByFilters, SearchParsed, BRAND_COUNTRY_MAP } from "./searchEngine";
import { initOtpService, sendOtp, verifyOtp, clearExpiredOtps } from "./services/otpService";
import { isValidEgyptE164 } from "./phoneUtils";
import { createDealerCategoryRouter } from "./routes/dealerCategory";
import { createImporterRouter } from "./routes/importer";
import { createOfficialAgentRouter } from "./routes/officialAgent";
import { createPartsRouter } from "./routes/parts";
import { createPartsOrdersRouter } from "./routes/partsOrders";
import { classifyDomain } from "./ai/domainClassifier";
import { searchParts, searchPartsByFilters, parsePartQuery } from "./ai/partsSearchEngine";
import { respondWithPartsCandidates, buildDeterministicPartsReply } from "./ai/partsChat";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("automarket.db");

// Subscription and Promotion System Configuration (Feature Flag)
const SUBSCRIPTION_SYSTEM_ENABLED = false;

// Dealer categories (multi-branch/chain/importer/official-agent dashboards) and the
// auto-parts marketplace ship dark behind these flags until each phase is verified in
// production. Both default false: zero user-visible change until explicitly enabled.
const DEALER_CATEGORIES_ENABLED = false;
const PARTS_MARKETPLACE_ENABLED = false;

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

// Dealer categories, auto-parts marketplace: new tables only, additive to the schema above.
// Gated behind DEALER_CATEGORIES_ENABLED / PARTS_MARKETPLACE_ENABLED - see feature flags below.
db.exec(`
  CREATE TABLE IF NOT EXISTS dealer_employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    branch_id INTEGER,
    user_id INTEGER,
    role TEXT,
    permissions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    FOREIGN KEY (branch_id) REFERENCES dealer_branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    name TEXT,
    location TEXT,
    address TEXT,
    latitude REAL,
    longitude REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id)
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    warehouse_id INTEGER,
    reference_code TEXT,
    origin_country TEXT,
    carrier TEXT,
    status TEXT DEFAULT 'pending',
    eta DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS shipment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER,
    item_type TEXT,
    car_id INTEGER,
    part_id INTEGER,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
  );

  CREATE TABLE IF NOT EXISTS preorders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    shipment_item_id INTEGER,
    customer_user_id INTEGER,
    car_make TEXT,
    car_model TEXT,
    desired_year INTEGER,
    notes TEXT,
    status TEXT DEFAULT 'requested',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    FOREIGN KEY (shipment_item_id) REFERENCES shipment_items(id),
    FOREIGN KEY (customer_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS service_centers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    branch_id INTEGER,
    name TEXT,
    address TEXT,
    phone TEXT,
    services TEXT,
    latitude REAL,
    longitude REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    FOREIGN KEY (branch_id) REFERENCES dealer_branches(id)
  );

  CREATE TABLE IF NOT EXISTS official_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    title TEXT,
    description TEXT,
    image TEXT,
    discount_percent INTEGER,
    valid_from DATE,
    valid_to DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id)
  );

  CREATE TABLE IF NOT EXISTS car_warranties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER,
    dealer_id INTEGER,
    warranty_type TEXT,
    duration_months INTEGER,
    coverage_details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (dealer_id) REFERENCES dealers(id)
  );

  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    name TEXT,
    part_number TEXT,
    manufacturer TEXT,
    category TEXT,
    part_subtype TEXT,
    condition_status TEXT,
    images TEXT, -- JSON string array, same convention as cars.images
    price INTEGER,
    status TEXT DEFAULT 'available', -- 'available' | 'unavailable' ONLY, no quantity tracking
    delivery_supported INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id)
  );

  CREATE TABLE IF NOT EXISTS part_compatibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER,
    make TEXT,
    model TEXT,
    year_from INTEGER,
    year_to INTEGER,
    FOREIGN KEY (part_id) REFERENCES parts(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    buyer_user_id INTEGER,
    status TEXT DEFAULT 'pending', -- pending | confirmed | delivered | cancelled
    delivery_method TEXT,
    delivery_address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    FOREIGN KEY (buyer_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    part_id INTEGER,
    price_at_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (part_id) REFERENCES parts(id)
  );

  CREATE TABLE IF NOT EXISTS part_number_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT UNIQUE,
    manufacturer TEXT,
    name TEXT,
    category TEXT,
    compatible_json TEXT,
    source TEXT, -- 'ai' | 'dealer_confirmed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_part_compat_make_model ON part_compatibility(make, model);
  CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
  CREATE INDEX IF NOT EXISTS idx_parts_dealer ON parts(dealer_id);
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

// Dealer categories / auto-parts marketplace columns (additive; every existing dealer
// defaults to business_type='car_dealer', dealer_category='single' - today's behavior).
try { db.exec("ALTER TABLE dealers ADD COLUMN business_type TEXT DEFAULT 'car_dealer'"); } catch (e) {}
try { db.exec("ALTER TABLE dealers ADD COLUMN dealer_category TEXT DEFAULT 'single'"); } catch (e) {}
try { db.exec("ALTER TABLE dealers ADD COLUMN parts_specialties TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE dealers ADD COLUMN delivery_supported INTEGER DEFAULT 0"); } catch (e) {}

try { db.exec("ALTER TABLE dealer_branches ADD COLUMN manager_user_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE dealer_branches ADD COLUMN is_headquarters INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE dealer_branches ADD COLUMN region TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE cars ADD COLUMN branch_id INTEGER"); } catch (e) {}

try { db.exec("ALTER TABLE conversations ADD COLUMN part_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE conversations ADD COLUMN item_type TEXT DEFAULT 'car'"); } catch (e) {}

// OTP verification tables (registration, forgot-password, change-email)
initOtpService(db);
setInterval(clearExpiredOtps, 15 * 60 * 1000);

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

  // Gemini client stays server-side only - never expose the key to the browser.
  // GEMINI_API_KEY is the canonical name; the others are accepted for backward
  // compatibility with how the key may have been named in an existing deployment
  // (e.g. a Railway variable set up before this name was settled on).
  const GEMINI_KEY =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env["souq-cars-ai"];
  const genAI = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;
  console.log("[AI] Gemini key resolved:", !!GEMINI_KEY, "-> genAI client:", !!genAI);

  console.log(`Configuring server on port ${PORT}...`);

  // Multer configuration for video uploads
  const uploadDir = path.join(process.cwd(), "uploads", "reels");
  const carImagesDir = path.join(process.cwd(), "uploads", "cars");
  const partImagesDir = path.join(process.cwd(), "uploads", "parts");

  [uploadDir, carImagesDir, partImagesDir].forEach(dir => {
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

  // Dealer-category routers (multi-branch/chain/importer/official-agent dashboards).
  // Ship dark behind DEALER_CATEGORIES_ENABLED - mounting them has zero effect on any
  // existing route, since these paths don't overlap with anything already registered.
  if (DEALER_CATEGORIES_ENABLED) {
    app.use("/api/dealer", createDealerCategoryRouter({ db, authenticate }));
    app.use("/api/importer", createImporterRouter({ db, authenticate }));
    app.use("/api/official", createOfficialAgentRouter({ db, authenticate }));
  }

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

  // Auto-parts marketplace routers. Ship dark behind PARTS_MARKETPLACE_ENABLED.
  // partsOrders is mounted BEFORE parts: parts.ts declares a catch-all GET /:id
  // (public part detail) that would otherwise shadow partsOrders' GET /orders and
  // GET /my-orders single-segment routes at this same /api/parts base path - Express
  // resolves routers in mount order, so the more specific router must come first.
  if (PARTS_MARKETPLACE_ENABLED) {
    app.use("/api/parts", createPartsOrdersRouter({ db, authenticate }));
    app.use("/api/parts", createPartsRouter({ db, authenticate, genAI, cooldownMiddleware }));
  }

  // Shared helper: fetch all active-dealer cars with images parsed (used by /api/cars and /api/search)
  const getActiveCars = (): any[] => {
    const cars = db.prepare(`
      SELECT
        cars.*,
        dealers.name as dealer_name,
        dealers.logo as dealer_logo,
        dealers.location as dealer_location,
        dealers.user_id as dealer_user_id,
        dealers.rating as dealer_rating,
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

  // ---------- Conversational AI agent: intent classification + entity memory ----------

  interface ChatSlots {
    make?: string;
    model?: string;
    generation?: string;
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    bodyType?: string;
    condition?: string;
    fuelType?: string;
    seats?: number;
    transmission?: string;
    countryOfOrigin?: string;
  }

  const CHAT_INTENTS = ["direct_search", "consultant", "comparison", "price_inquiry", "reliability_inquiry", "fuel_economy_inquiry"] as const;
  type ChatIntent = typeof CHAT_INTENTS[number];
  const CURRENT_YEAR = new Date().getFullYear();

  // Merge new (possibly partial/null) slots over the previously known ones. A field the
  // model omits or returns null must never erase a value the user already gave earlier.
  // Numeric fields are bound-checked so an implausible model output (e.g. minPrice: 0)
  // can't silently corrupt the conversation's memory.
  function mergeSlots(prev: ChatSlots, next: any): ChatSlots {
    const merged: ChatSlots = { ...prev };
    if (!next || typeof next !== "object") return merged;

    const setStr = (key: keyof ChatSlots) => {
      const v = next[key];
      if (typeof v === "string" && v.trim()) (merged as any)[key] = v.trim();
    };
    const setNum = (key: keyof ChatSlots, min: number, max: number) => {
      const v = Number(next[key]);
      if (!isNaN(v) && v >= min && v <= max) (merged as any)[key] = v;
    };

    setStr("make"); setStr("model"); setStr("generation"); setStr("city");
    setStr("bodyType"); setStr("condition"); setStr("fuelType"); setStr("transmission");
    setStr("countryOfOrigin");
    setNum("year", 1980, CURRENT_YEAR + 1);
    setNum("minPrice", 1, 500_000_000);
    setNum("maxPrice", 1, 500_000_000);
    setNum("seats", 2, 9);

    return merged;
  }

  // Explicit allowlist mapping (never a blind spread) - slot keys with no real DB
  // backing (generation/condition/seats) are intentionally NOT copied into the filter,
  // they stay in conversation memory only.
  function slotsToSearchParsed(slots: ChatSlots): SearchParsed {
    const parsed: SearchParsed = {};
    if (slots.make) parsed.make = slots.make;
    if (slots.model) parsed.model = slots.model;
    if (slots.city) parsed.city = slots.city;
    if (slots.minPrice !== undefined) parsed.minPrice = slots.minPrice;
    if (slots.maxPrice !== undefined) parsed.maxPrice = slots.maxPrice;
    if (slots.transmission) parsed.transmission = slots.transmission;
    if (slots.fuelType) parsed.fuel = slots.fuelType;
    if (slots.bodyType) parsed.bodyType = slots.bodyType;
    if (slots.year !== undefined) parsed.year = slots.year;
    if (slots.countryOfOrigin) parsed.countryOfOrigin = slots.countryOfOrigin;
    return parsed;
  }

  const carContextOf = (candidates: any[]) => candidates.map((c: any) => ({
    id: c.id, make: c.make, model: c.model, year: c.year, price: c.price,
    mileage: c.mileage, location: c.location, fuel_type: c.fuel_type,
    transmission: c.transmission, status: c.status,
  }));

  const UNDERSTAND_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      intent: { type: Type.STRING, enum: CHAT_INTENTS as unknown as string[] },
      confidence: { type: Type.INTEGER },
      slots: {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING },
          model: { type: Type.STRING },
          generation: { type: Type.STRING },
          year: { type: Type.INTEGER },
          minPrice: { type: Type.NUMBER },
          maxPrice: { type: Type.NUMBER },
          city: { type: Type.STRING },
          bodyType: { type: Type.STRING },
          condition: { type: Type.STRING },
          fuelType: { type: Type.STRING },
          seats: { type: Type.INTEGER },
          transmission: { type: Type.STRING },
          countryOfOrigin: { type: Type.STRING },
        },
      },
      comparisonTargets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { make: { type: Type.STRING }, model: { type: Type.STRING } },
          required: ["make", "model"],
        },
      },
      followUpQuestion: { type: Type.STRING },
    },
    required: ["intent", "confidence", "slots"],
  };

  function buildUnderstandPrompt(message: string, history: { role: string; content: string }[], knownSlots: ChatSlots): string {
    const countryList = Object.entries(BRAND_COUNTRY_MAP).map(([make, country]) => `${make}=${country}`).join(", ");
    return `
انت محرك فهم نوايا لمساعد سيارات ذكي محترف. مهمتك تصنيف رسالة المستخدم إلى فئة واحدة بالظبط من 6، واستخراج كل المعلومات الممكنة، وتقييم مدى ثقتك.

الفئات الست:
- direct_search: طلب واضح ومحدد (ماركة/موديل/سنة/سعر واضحين).
- consultant: طلب غير مكتمل يحتاج أسئلة توضيحية (مثلاً "عايز عربية عيلة" من غير تفاصيل كافية).
- comparison: مقارنة بين سيارتين محددتين بالاسم.
- price_inquiry: سؤال عن سعر سيارة محددة.
- reliability_inquiry: سؤال عن موثوقية/أعطال سيارة محددة.
- fuel_economy_inquiry: سؤال عن استهلاك الوقود لسيارة محددة.

معلومات معروفة بالفعل من المحادثة (لا تسأل عنها تاني، واحتفظ بيها كاملة في ردك): ${JSON.stringify(knownSlots)}
آخر رسائل من المحادثة: ${JSON.stringify(history)}
رسالة المستخدم الجديدة: "${message}"
خريطة بلد المنشأ حسب الماركة (استخدمها لفهم عبارات زي "عربية ألمانية"): ${countryList}

التعليمات:
1. ادمج المعلومات الجديدة مع المعروفة بالفعل في حقل slots، ورجّع كل الحقول المعروفة مش بس الجديدة.
2. لو الفئة consultant والثقة أقل من 90: تصرف زي مستشار سيارات محترف حقيقي، مش استمارة أسئلة. اكتب سطر قصير برأيك الخبير بناءً على المعلومات المعروفة بالفعل (مثلاً لو الميزانية والماركة معروفين، علّق على مدى واقعية الخيارات بالميزانية دي)، ثم سطر فاضي، ثم سؤال واحد طبيعي فقط عن أهم معلومة ناقصة (الميزانية، جديدة أو مستعملة، سيدان أو SUV، السنة المفضلة، نوع الوقود، عدد المقاعد، المدينة). لا تسأل عن حاجة معروفة بالفعل. مثال على الأسلوب المطلوب: "بميزانية 300 ألف، الخيارات الألماني محدودة.\n\nتحب سيدان ولا SUV؟"
3. لو الفئة comparison: حدد السيارتين بالظبط في comparisonTargets.
4. الثقة (confidence) رقم من 0 إلى 100: كل ما المعلومات أوضح وأدق (ماركة وموديل معروفين بدقة) كل ما الثقة أعلى؛ عبارات عامة وغامضة تدّي ثقة واطية.
5. افهم الأخطاء الإملائية واللغة المختلطة (عربي/إنجليزي/عامية مصرية) بشكل طبيعي.
`;
  }

  const RESPOND_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      matchedCarIds: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    },
    required: ["text", "matchedCarIds"],
  };

  // Mode-specific instructions for the "respond" call - retrieval/grounding is already
  // done deterministically by searchCarsByFilters; this call only phrases the reply.
  function buildRespondPrompt(intent: ChatIntent, message: string, carContext: any[]): string {
    const base = `انت مساعد ذكي متخصص في السيارات لسوق سيارات مصري اسمه "سوق السيارات". رد باللهجة المصرية أو العربية الفصحى البسيطة، بشكل ودود ومختصر واحترافي، زي خبير سيارات حقيقي.
السيارات المرشحة (مرشحة مسبقًا من قاعدة البيانات الفعلية، لا تخترع سيارات غير موجودة فيها): ${JSON.stringify(carContext)}
رسالة المستخدم: "${message}"`;

    const modeInstructions: Record<ChatIntent, string> = {
      direct_search: `التعليمات: اذكر فقط سيارات من القائمة أعلاه. لو القائمة فاضية قل ذلك بوضوح واقترح تعديل الطلب (ميزانية أو موديل مختلف).`,
      consultant: `التعليمات: اذكر فقط سيارات من القائمة أعلاه بناءً على تفضيلات المستخدم اللي جمعناها.`,
      comparison: `التعليمات: قارن بين السيارتين المطلوبتين بناءً على القائمة أعلاه فقط (السعر، الحالة، المواصفات المتاحة). لو مفيش سيارة متاحة فعليًا لأحد الطرفين، وضّح ذلك بدل ما تخترع.`,
      price_inquiry: `التعليمات: ركّز ردك على نطاق السعر الفعلي الموجود في القائمة أعلاه لهذه السيارة، من غير اختراع أرقام غير موجودة.`,
      reliability_inquiry: `التعليمات: قدّم رأي عام معروف عن موثوقية هذا الموديل بصفتك خبير سيارات (معرفة عامة عن السوق، مش بيانات مقاسة من قاعدة البيانات)، ثم اذكر لو فيه سيارات متاحة فعليًا من القائمة أعلاه.`,
      fuel_economy_inquiry: `التعليمات: قدّم رأي عام معروف عن استهلاك الوقود لهذا الموديل بصفتك خبير سيارات (معرفة عامة عن السوق، مش بيانات مقاسة من قاعدة البيانات)، ثم اذكر لو فيه سيارات متاحة فعليًا من القائمة أعلاه.`,
    };

    return `${base}\n${modeInstructions[intent]}\nرجّع الرد بصيغة JSON بحقلين فقط: "text" (ردك النصي) و"matchedCarIds" (مصفوفة IDs من القائمة المرشحة فقط).`;
  }

  async function respondWithCandidates(intent: ChatIntent, message: string, candidates: any[]): Promise<{ text: string; matchedCarIds: number[] } | null> {
    if (!genAI) return null;
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: buildRespondPrompt(intent, message, carContextOf(candidates)) }] }],
        config: { responseMimeType: "application/json", responseSchema: RESPOND_SCHEMA },
      });
      const parsed = JSON.parse(response.text as string);
      if (typeof parsed.text !== "string") return null;
      return { text: parsed.text, matchedCarIds: Array.isArray(parsed.matchedCarIds) ? parsed.matchedCarIds : [] };
    } catch (e) {
      console.error("AI search respond-call error:", e);
      return null;
    }
  }

  app.post("/api/ai-search/chat", async (req, res) => {
    console.log("[AI] endpoint called. message:", req.body?.message, "| Gemini key exists:", !!genAI);
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = rawHistory
      .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
      .slice(-10)
      .map((h: any) => ({ role: h.role, content: String(h.content).slice(0, 500) }));

    const prevSlots: ChatSlots = (req.body?.slots && typeof req.body.slots === "object") ? req.body.slots : {};

    const allCars = getActiveCars();

    // Deterministic fallback path: used when no API key is configured, and on any
    // transient failure of the "understand" call below. Always echoes back slots so a
    // temporary failure never silently wipes the conversation's accumulated memory.
    const fallbackDirectSearch = () => {
      const outcome = searchCars(allCars, message);
      res.json({
        text: buildDeterministicReply(outcome),
        cars: outcome.cars.slice(0, 6),
        slots: prevSlots,
        intent: "direct_search",
        confidence: 100,
        done: true,
      });
    };

    if (!genAI) {
      console.log("[AI] no Gemini key configured - using deterministic fallback (no intent classification will run)");
      return fallbackDirectSearch();
    }

    try {
      const understandResponse = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: buildUnderstandPrompt(message, history, prevSlots) }] }],
        config: { responseMimeType: "application/json", responseSchema: UNDERSTAND_SCHEMA },
      });

      const understood = JSON.parse(understandResponse.text as string);
      const intent: ChatIntent = (CHAT_INTENTS as readonly string[]).includes(understood?.intent) ? understood.intent : "direct_search";
      const rawConfidence = Number(understood?.confidence);
      const confidence = isNaN(rawConfidence) ? 0 : Math.max(0, Math.min(100, rawConfidence));
      const mergedSlots = mergeSlots(prevSlots, understood?.slots);
      console.log("[AI] Intent:", intent, "| Confidence:", confidence, "| Entities/slots:", JSON.stringify(mergedSlots));

      // Confidence gate is intent-agnostic: a low-confidence classification into ANY
      // bucket falls back to a clarifying question instead of searching on a thin or
      // wrong slot set - guards against the model misclassifying an ambiguous message
      // into a non-consultant bucket at low confidence.
      if (confidence < 90) {
        const followUp = typeof understood?.followUpQuestion === "string" && understood.followUpQuestion.trim()
          ? understood.followUpQuestion.trim()
          : "تحب سيارة جديدة ولا مستعملة، وميزانيتك قد ايه تقريبًا؟";
        return res.json({ text: followUp, cars: [], slots: mergedSlots, intent: "consultant", confidence, done: false });
      }

      let candidates: any[];
      const comparisonTargets = Array.isArray(understood?.comparisonTargets) ? understood.comparisonTargets : [];
      if (intent === "comparison" && comparisonTargets.length >= 2) {
        const targets = comparisonTargets.slice(0, 2);
        const sideResults = targets.map((t: any) => {
          const parsed: SearchParsed = {};
          if (typeof t?.make === "string" && t.make) parsed.make = t.make;
          if (typeof t?.model === "string" && t.model) parsed.model = t.model;
          return searchCarsByFilters(allCars, parsed, {}).cars.slice(0, 5);
        });
        candidates = [
          ...sideResults[0].map((c: any) => ({ ...c, comparisonGroup: "a" })),
          ...sideResults[1].map((c: any) => ({ ...c, comparisonGroup: "b" })),
        ];
      } else {
        const parsed = slotsToSearchParsed(mergedSlots);
        const outcome = searchCarsByFilters(allCars, parsed, {
          fuelEconomyIntent: intent === "fuel_economy_inquiry",
          reliabilityIntent: intent === "reliability_inquiry",
        });
        candidates = outcome.cars.slice(0, 15);
      }

      const respondResult = await respondWithCandidates(intent, message, candidates);
      if (!respondResult) {
        return res.json({
          text: "لقيت لك بعض السيارات اللي ممكن تناسبك:",
          cars: candidates.slice(0, 6),
          slots: mergedSlots,
          intent,
          confidence,
          done: true,
        });
      }

      const candidateIds = new Set(candidates.map((c: any) => c.id));
      const matchedCars = candidates.filter((c: any) => respondResult.matchedCarIds.includes(c.id) && candidateIds.has(c.id));

      res.json({
        text: respondResult.text,
        cars: matchedCars.length > 0 ? matchedCars : candidates.slice(0, 6),
        slots: mergedSlots,
        intent,
        confidence,
        done: true,
      });
    } catch (e) {
      console.error("AI search chat error, falling back to deterministic search:", e);
      fallbackDirectSearch();
    }
  });

  // ---------- Unified smart search: silent car-vs-parts domain detection ----------
  // New endpoint, defined here (never inside the block above) so it can reuse the
  // existing car pipeline's prompts/schemas/search by reference. UNDERSTAND_SCHEMA,
  // RESPOND_SCHEMA, buildUnderstandPrompt, buildRespondPrompt, and the
  // /api/ai-search/chat handler above are never modified by this addition.

  const getActivePartsForSearch = (): any[] => {
    const parts = db.prepare(`
      SELECT parts.*, dealers.name as dealer_name, dealers.location as dealer_location
      FROM parts JOIN dealers ON dealers.id = parts.dealer_id
      WHERE parts.status = 'available' AND dealers.status = 'active'
    `).all() as any[];
    const getCompat = db.prepare("SELECT make, model, year_from, year_to FROM part_compatibility WHERE part_id = ?");
    return parts.map((p) => {
      let images: string[] = [];
      try { images = p.images ? JSON.parse(p.images) : []; } catch { images = []; }
      return { ...p, images, delivery_supported: !!p.delivery_supported, compatibility: getCompat.all(p.id) };
    });
  };

  if (PARTS_MARKETPLACE_ENABLED) {
    app.post("/api/smart-search/chat", async (req, res) => {
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

      const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
      const history = rawHistory
        .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
        .slice(-10)
        .map((h: any) => ({ role: h.role, content: String(h.content).slice(0, 500) }));

      const prevSlots: ChatSlots = (req.body?.slots && typeof req.body.slots === "object") ? req.body.slots : {};

      const classification = await classifyDomain(genAI, message, history);
      const CAR_DOMAIN_THRESHOLD = 60;

      // Ambiguous, or low-confidence either way: never ask "car or parts?" - just
      // search both deterministically and return whichever arrays have results.
      const runAmbiguous = () => {
        const carOutcome = searchCars(getActiveCars(), message);
        const partOutcome = searchParts(getActivePartsForSearch(), message);
        const cars = carOutcome.cars.slice(0, 6);
        const parts = partOutcome.parts.slice(0, 6);
        let text: string;
        if (cars.length === 0 && parts.length === 0) {
          text = "مش لاقي نتائج مطابقة. جرب توضح الماركة/الموديل لو بتدور على سيارة، أو اسم القطعة والموديل المتوافق لو بتدور على قطعة غيار.";
        } else if (cars.length > 0 && parts.length > 0) {
          text = `لقيت لك ${cars.length} سيارة و${parts.length} قطعة غيار ممكن تناسب طلبك:`;
        } else if (cars.length > 0) {
          text = buildDeterministicReply(carOutcome);
        } else {
          text = buildDeterministicPartsReply(partOutcome);
        }
        res.json({ text, cars, parts, slots: prevSlots, domain: "ambiguous", confidence: classification.confidence, done: true });
      };

      if (classification.domain === "ambiguous" || classification.confidence < CAR_DOMAIN_THRESHOLD || !genAI) {
        return runAmbiguous();
      }

      try {
        if (classification.domain === "car") {
          // Same understand -> search -> respond pipeline as /api/ai-search/chat,
          // calling the exact same functions by reference (never re-implemented).
          const understandResponse = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: buildUnderstandPrompt(classification.carQuery || message, history, prevSlots) }] }],
            config: { responseMimeType: "application/json", responseSchema: UNDERSTAND_SCHEMA },
          });
          const understood = JSON.parse(understandResponse.text as string);
          const intent: ChatIntent = (CHAT_INTENTS as readonly string[]).includes(understood?.intent) ? understood.intent : "direct_search";
          const rawConfidence = Number(understood?.confidence);
          const confidence = isNaN(rawConfidence) ? 0 : Math.max(0, Math.min(100, rawConfidence));
          const mergedSlots = mergeSlots(prevSlots, understood?.slots);

          if (confidence < 90) {
            const followUp = typeof understood?.followUpQuestion === "string" && understood.followUpQuestion.trim()
              ? understood.followUpQuestion.trim()
              : "تحب سيارة جديدة ولا مستعملة، وميزانيتك قد ايه تقريبًا؟";
            return res.json({ text: followUp, cars: [], parts: [], slots: mergedSlots, domain: "car", intent: "consultant", confidence, done: false });
          }

          const parsed = slotsToSearchParsed(mergedSlots);
          const outcome = searchCarsByFilters(getActiveCars(), parsed, {
            fuelEconomyIntent: intent === "fuel_economy_inquiry",
            reliabilityIntent: intent === "reliability_inquiry",
          });
          const candidates = outcome.cars.slice(0, 15);
          const respondResult = await respondWithCandidates(intent, message, candidates);
          const cars = respondResult
            ? (candidates.filter((c: any) => respondResult.matchedCarIds.includes(c.id)).length > 0
                ? candidates.filter((c: any) => respondResult.matchedCarIds.includes(c.id))
                : candidates.slice(0, 6))
            : candidates.slice(0, 6);

          return res.json({
            text: respondResult?.text || "لقيت لك بعض السيارات اللي ممكن تناسبك:",
            cars, parts: [], slots: mergedSlots, domain: "car", intent, confidence, done: true,
          });
        }

        // domain === "parts"
        const partParsed = parsePartQuery(classification.partsQuery || message);
        const partOutcome = searchPartsByFilters(getActivePartsForSearch(), partParsed);
        const partCandidates = partOutcome.parts.slice(0, 15);
        const partsRespond = await respondWithPartsCandidates(genAI, message, partCandidates);
        const parts = partsRespond
          ? (partCandidates.filter((p: any) => partsRespond.matchedPartIds.includes(p.id)).length > 0
              ? partCandidates.filter((p: any) => partsRespond.matchedPartIds.includes(p.id))
              : partCandidates.slice(0, 6))
          : partCandidates.slice(0, 6);

        res.json({
          text: partsRespond?.text || buildDeterministicPartsReply(partOutcome),
          cars: [], parts, slots: prevSlots, domain: "parts", confidence: classification.confidence, done: true,
        });
      } catch (e) {
        console.error("[SmartSearch] chat error, falling back to ambiguous dual search:", e);
        runAmbiguous();
      }
    });
  }

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

    if (!isValidEgyptE164(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }
    if (whatsapp_number && !isValidEgyptE164(whatsapp_number)) {
      return res.status(400).json({ error: "Invalid WhatsApp number format" });
    }
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        if (branch.phone && !isValidEgyptE164(branch.phone)) {
          return res.status(400).json({ error: "Invalid branch phone number format" });
        }
      }
    }

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
  // Allowed values for the optional dealer-category picker (only shown in the UI
  // behind DEALER_CATEGORIES_ENABLED/PARTS_MARKETPLACE_ENABLED). Omitting either field
  // falls back to the dealers table's own column defaults ('car_dealer'/'single'),
  // which is byte-identical to registration behavior before this addition.
  const VALID_BUSINESS_TYPES = ["car_dealer", "parts_dealer"];
  const VALID_DEALER_CATEGORIES = ["single", "multi_branch", "chain", "importer", "official_agent"];

  app.post("/api/auth/register", authLimiter, async (req, res) => {
    let { email, password, name, role, phone, whatsapp_number, branches_count, address, latitude, longitude, logo, captchaToken, business_type, dealer_category } = req.body;
    email = validator.normalizeEmail(email);

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
    if (role === 'dealer' && (!isValidEgyptE164(phone) || !isValidEgyptE164(whatsapp_number))) {
      return res.status(400).json({ error: "Phone and WhatsApp numbers must be a valid Egyptian mobile number (e.g. +201012345678)" });
    }
    if (business_type !== undefined && !VALID_BUSINESS_TYPES.includes(business_type)) {
      return res.status(400).json({ error: "Invalid business type" });
    }
    if (dealer_category !== undefined && !VALID_DEALER_CATEGORIES.includes(dealer_category)) {
      return res.status(400).json({ error: "Invalid dealer category" });
    }

    // reCAPTCHA verification
    if (process.env.RECAPTCHA_SECRET && !(await verifyRecaptcha(captchaToken))) {
      return res.status(400).json({ error: "reCAPTCHA verification failed" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const escapedName = validator.escape(name);

    try {
      // A pending (unverified) registration for this email is not a conflict — refresh
      // its details and resend the OTP instead of blocking the user with a dead-end error.
      const existingUser = db.prepare("SELECT id, is_verified FROM users WHERE email = ?").get(email) as any;
      if (existingUser && existingUser.is_verified) {
        return res.status(400).json({ error: "Email already exists" });
      }

      let userId: number;
      if (existingUser) {
        userId = existingUser.id;
        db.prepare("UPDATE users SET password = ?, name = ?, role = ? WHERE id = ?").run(
          hashedPassword,
          escapedName,
          role || 'user',
          userId
        );
      } else {
        const result = db.prepare("INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, 0)").run(
          email,
          hashedPassword,
          escapedName,
          role || 'user'
        );
        userId = result.lastInsertRowid as number;
      }

      if (role === 'dealer') {
        // Falls back to the same values as the dealers table's own column defaults
        // when omitted, so a request that never sends these fields (e.g. before the
        // registration UI added the picker) behaves exactly as it did before.
        const resolvedBusinessType = business_type || 'car_dealer';
        const resolvedDealerCategory = dealer_category || 'single';

        const existingDealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(userId) as any;
        if (existingDealer) {
          db.prepare(`
            UPDATE dealers SET name = ?, logo = ?, phone = ?, whatsapp_number = ?, branches_count = ?, address = ?, latitude = ?, longitude = ?, business_type = ?, dealer_category = ?
            WHERE id = ?
          `).run(
            escapedName,
            logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(escapedName)}`,
            validator.escape(phone || ''),
            validator.escape(whatsapp_number || ''),
            branches_count || 1,
            validator.escape(address || ''),
            latitude || null,
            longitude || null,
            resolvedBusinessType,
            resolvedDealerCategory,
            existingDealer.id
          );
        } else {
          db.prepare(`
            INSERT INTO dealers (user_id, name, logo, phone, whatsapp_number, branches_count, address, latitude, longitude, rating, business_type, dealer_category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            userId,
            escapedName,
            logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(escapedName)}`,
            validator.escape(phone || ''),
            validator.escape(whatsapp_number || ''),
            branches_count || 1,
            validator.escape(address || ''),
            latitude || null,
            longitude || null,
            5.0,
            resolvedBusinessType,
            resolvedDealerCategory
          );
        }
      }

      const otpResult = await sendOtp(email, "register", req.ip, escapedName);
      if (!otpResult.success) {
        return res.status(429).json({ error: otpResult.error });
      }

      res.json({
        success: true,
        email,
        requiresOtpVerification: true
      });
    } catch (e) {
      console.error("Registration error:", e);
      res.status(400).json({ error: "Email already exists" });
    }
  });

  // Send/resend an OTP for registration, forgot-password, or change-email.
  // Resend uses the exact same underlying logic — there is only one send path.
  const handleSendOtp = async (req: any, res: any) => {
    let { email, purpose } = req.body;
    email = validator.normalizeEmail(email);
    const allowedPurposes = ["register", "forgot_password", "change_email"];

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!allowedPurposes.includes(purpose)) {
      return res.status(400).json({ error: "Invalid purpose" });
    }

    const user = db.prepare("SELECT id, name, is_verified FROM users WHERE email = ?").get(email) as any;

    if (purpose === "forgot_password" && !user) {
      return res.json({ success: true }); // Don't reveal if the account exists
    }
    if (purpose === "register" && user?.is_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const result = await sendOtp(email, purpose, req.ip, user?.name);
    if (!result.success) {
      return res.status(429).json(result);
    }
    res.json({ success: true });
  };

  app.post("/api/auth/send-otp", authLimiter, handleSendOtp);
  app.post("/api/auth/resend-otp", authLimiter, handleSendOtp);

  app.post("/api/auth/verify-otp", authLimiter, async (req: any, res) => {
    let { email, otp, purpose } = req.body;
    email = validator.normalizeEmail(email);

    if (!email || !otp || !purpose) {
      return res.status(400).json({ error: "Email, code, and purpose are required" });
    }

    const result = await verifyOtp(email, purpose, String(otp));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    if (purpose === "register") {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(404).json({ error: "Account not found" });
      }
      db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(user.id);

      let dealerId = null;
      if (user.role === 'dealer') {
        const dealer = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(user.id) as any;
        dealerId = dealer?.id;
      }

      logActivity("Email verified", user.id, `User ${user.id} verified their email via OTP`);
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, dealerId }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, dealerId }
      });
    }

    res.json({ success: true });
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    let { email } = req.body;
    email = validator.normalizeEmail(email);
    const user = db.prepare("SELECT id, name FROM users WHERE email = ?").get(email) as any;

    if (!user) {
      return res.json({ success: true }); // Don't reveal if user exists
    }

    const result = await sendOtp(email, "forgot_password", req.ip, user.name);
    if (!result.success) {
      return res.status(429).json(result);
    }

    res.json({ success: true });
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    let { email, otp, password } = req.body;
    email = validator.normalizeEmail(email);

    if (!email || !otp || !password) {
      return res.status(400).json({ error: "Email, code, and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const result = await verifyOtp(email, "forgot_password", String(otp));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
    if (!user) {
      return res.status(404).json({ error: "Account not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);

    res.json({ success: true });
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    let { email, password, captchaToken } = req.body;
    email = validator.normalizeEmail(email);

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

    if (!user.is_verified) {
      logActivity("Failed login attempt", user.id, `Unverified login attempt: ${email}`);
      return res.status(403).json({
        error: "Please verify your email first.",
        requiresOtpVerification: true,
        email: user.email
      });
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
