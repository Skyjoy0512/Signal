const required = [
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_ADMIN_TOKEN",
  "APP_SETTINGS_ENCRYPTION_KEY",
  "FUNDAMENTALS_SEED_TOKEN",
];

const recommended = [
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DEEPSEEK_API_KEY",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_CHANNEL_SECRET",
  "LINE_USER_ID",
];

const missingRequired = required.filter((key) => !process.env[key]?.trim());
const missingRecommended = recommended.filter((key) => !process.env[key]?.trim());

if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.APP_SETTINGS_ENCRYPTION_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) {
  missingRequired.push("APP_SETTINGS_ENCRYPTION_KEY must not equal SUPABASE_SERVICE_ROLE_KEY");
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== process.env.SUPABASE_URL) {
  missingRequired.push("NEXT_PUBLIC_SUPABASE_URL must match SUPABASE_URL");
}

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== process.env.SUPABASE_ANON_KEY) {
  missingRequired.push("NEXT_PUBLIC_SUPABASE_ANON_KEY must match SUPABASE_ANON_KEY");
}

if (missingRequired.length > 0) {
  console.error("Missing or invalid production environment values:");
  for (const key of missingRequired) console.error(`- ${key}`);
  process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn("Recommended environment values not set:");
  for (const key of missingRecommended) console.warn(`- ${key}`);
}

console.log("Production environment shape looks ready.");
