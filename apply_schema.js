import fs from 'fs';
import path from 'path';
import readline from 'readline';
import pg from 'pg';

// Manually parse .env file
const envPath = './.env';
let supabaseUrl = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      if (match[1] === 'VITE_SUPABASE_URL') {
        supabaseUrl = value.trim();
      }
    }
  });
}

// Extract project reference from supabase URL (e.g. https://ref.supabase.co)
let projectRef = '';
if (supabaseUrl) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    projectRef = match[1];
  }
}

if (!projectRef) {
  console.error("Error: Could not determine Supabase Project Reference from VITE_SUPABASE_URL in .env");
  process.exit(1);
}

const dbHost = `aws-1-eu-central-1.pooler.supabase.com`;
const dbUser = `postgres.${projectRef}`;
const dbPort = 5432;

console.log(`Database Host: ${dbHost}`);
console.log(`Database User: ${dbUser}`);
console.log(`Database Name: postgres`);
console.log(`Database Port: ${dbPort}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Please enter your Supabase Database Password: ', (password) => {
  rl.close();
  
  if (!password) {
    console.error("Error: Password cannot be empty.");
    process.exit(1);
  }

  // Load the SQL schema
  const schemaPath = './supabase_schema.sql';
  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  console.log("Reading schema file...");
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Configure pg connection
  const client = new pg.Client({
    host: dbHost,
    port: dbPort,
    database: 'postgres',
    user: dbUser,
    password: password,
    ssl: {
      rejectUnauthorized: false // Required for Supabase SSL connection
    }
  });

  console.log("Connecting to database...");
  client.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err.message);
      process.exit(1);
    }

    console.log("Connected successfully. Applying SQL schema (this might take a few seconds)...");
    client.query(sql, (queryErr, res) => {
      if (queryErr) {
        console.error("Error executing SQL schema:", queryErr.message);
        if (queryErr.position) {
          console.error(`Error position in SQL: ${queryErr.position}`);
        }
      } else {
        console.log("SQL Schema successfully applied! All tables, indexes, RLS policies, and triggers are created.");
      }
      client.end();
    });
  });
});
