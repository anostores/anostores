/* ==========================================
   ANO Store - Supabase Configuration
   ========================================== */

// ⚠️ تأكد أن الرابط بالشكل الصحيح ده وبدون أي / في الآخر
const SUPABASE_URL = "https://ackwytgwmlwsdnkvnoxd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFja3d5dGd3bWx3c2Rua3Zub3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1ODM4OTAsImV4cCI6MjEwMTE1OTg5MH0.C6-eiXGruLNqpTz8Tiihk0u0tj5YQw3DcUhX9ivcFP8";

// إنشاء العميل
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);