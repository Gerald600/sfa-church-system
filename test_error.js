import pg from 'pg';

const projectRef = 'onnppgvisqenmpgwkeom';
const password = 'Lwangagerald006@';
const dbHost = `aws-1-eu-central-1.pooler.supabase.com`;
const dbUser = `postgres.${projectRef}`;

const client = new pg.Client({
  host: dbHost,
  port: 5432,
  database: 'postgres',
  user: dbUser,
  password: password,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  console.log("Connecting to pooler...");
  try {
    await client.connect();
    console.log("✅ SUCCESS!");
    await client.end();
  } catch (err) {
    console.log("--- ERROR DETECTED ---");
    console.log("Message:", err.message);
    console.log("Code:", err.code);
    console.log("Severity:", err.severity);
    console.log("Detail:", err.detail);
    console.log("Stack:", err.stack);
    console.log("Keys:", Object.keys(err));
    console.log("JSON:", JSON.stringify(err, null, 2));
  }
}

run();
