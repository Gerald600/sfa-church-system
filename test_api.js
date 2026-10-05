import https from 'https';

const url = 'https://onnppgvisqenmpgwkeom.supabase.co/rest/v1/profiles?select=*';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubnBwZ3Zpc3Flbm1wZ3drZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjc0MzEsImV4cCI6MjA5Njc0MzQzMX0.pQMeYqXfXYz_8m3saR6x5po8PMZNw3347XR2rZLJfEY';

const options = {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
};

console.log("Sending request to Supabase REST API...");
https.get(url, options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log("Headers:", res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log("Response Body:", data);
  });
}).on('error', (err) => {
  console.error("API request failed:", err.message);
});
