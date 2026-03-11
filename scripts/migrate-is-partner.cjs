/**
 * Migration: Add is_partner column to hospitals table
 * 
 * Since we cannot run DDL via Supabase REST API directly,
 * this script tests if the column exists and provides instructions.
 * 
 * Run the following SQL in Supabase SQL Editor:
 * 
 * ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false;
 * UPDATE hospitals SET is_partner = true WHERE tags @> ARRAY['partner'];
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Test if column exists
  const { data, error } = await supabase
    .from("hospitals")
    .select("is_partner")
    .limit(1);

  if (error && error.message.includes("does not exist")) {
    console.log("❌ is_partner column does not exist yet.");
    console.log("");
    console.log("Please run this SQL in Supabase SQL Editor:");
    console.log("--------------------------------------------");
    console.log("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false;");
    console.log("UPDATE hospitals SET is_partner = true WHERE tags @> ARRAY['partner'];");
    console.log("--------------------------------------------");
    process.exit(1);
  } else if (error) {
    console.log("Error:", error.message);
    process.exit(1);
  } else {
    console.log("✅ is_partner column exists. Current data:", JSON.stringify(data));

    // Check how many partners exist
    const { count } = await supabase
      .from("hospitals")
      .select("id", { count: "exact", head: true })
      .eq("is_partner", true);
    console.log(`   Partner hospitals: ${count || 0}`);
  }
}

main();
