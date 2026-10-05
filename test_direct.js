import pg from 'pg';

const projectRef = 'onnppgvisqenmpgwkeom';
const password = 'Lwangagerald006@';

const client = new pg.Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: password,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  console.log("Testing direct connection...");
  try {
    await client.connect();
    console.log("✅ SUCCESS connecting directly!");
    await client.end();
  } catch (err) {
    console.log(`❌ Connection error: ${err.message}`);
  }
}

run();
