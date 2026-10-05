import pg from 'pg';

const projectRef = 'onnppgvisqenmpgwkeom';
const password = 'Lwangagerald006@';

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ap-southeast-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'sa-east-1'
];

async function testRegion(region) {
  const dbHost = `aws-0-${region}.pooler.supabase.com`;
  const dbUser = `postgres.${projectRef}`;
  
  const client = new pg.Client({
    host: dbHost,
    port: 6543,
    database: 'postgres',
    user: dbUser,
    password: password,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log(`\u2705 SUCCESS connecting to ${region} (${dbHost})!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Region ${region}: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log(`Testing all pooler regions for project ${projectRef}...`);
  for (const region of regions) {
    await testRegion(region);
  }
  console.log("Finished testing.");
}

run();
