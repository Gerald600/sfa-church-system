import fs from 'fs';
import pg from 'pg';

const supabaseUrl = 'https://onnppgvisqenmpgwkeom.supabase.co';
const projectRef = 'onnppgvisqenmpgwkeom';
const dbHost = 'aws-1-eu-central-1.pooler.supabase.com';
const dbUser = `postgres.${projectRef}`;
const dbPort = 5432;

const password = process.argv[2];

if (!password) {
  console.log("Usage: node apply_fix.js <your_db_password>");
  console.log("Alternatively, run fix_permissions.sql in your Supabase SQL Editor.");
  process.exit(1);
}

const sql = fs.readFileSync('./fix_permissions.sql', 'utf8');

const client = new pg.Client({
  host: dbHost,
  port: dbPort,
  database: 'postgres',
  user: dbUser,
  password: password,
  ssl: { rejectUnauthorized: false }
});

client.connect((err) => {
  if (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }
  console.log("Connected. Applying permissions fix...");
  client.query(sql, (qErr) => {
    if (qErr) {
      console.error("Error applying fix:", qErr.message);
    } else {
      console.log("Successfully granted permissions and configured RLS policies on all tables!");
    }
    client.end();
  });
});
