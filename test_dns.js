import dns from 'dns';

dns.resolve('db.onnppgvisqenmpgwkeom.supabase.co', 'AAAA', (err, addresses) => {
  if (err) {
    console.error("AAAA lookup failed:", err);
  } else {
    console.log("AAAA addresses:", addresses);
  }
});

dns.resolve('db.onnppgvisqenmpgwkeom.supabase.co', 'A', (err, addresses) => {
  if (err) {
    console.error("A lookup failed:", err);
  } else {
    console.log("A addresses:", addresses);
  }
});

dns.lookup('db.onnppgvisqenmpgwkeom.supabase.co', (err, address, family) => {
  if (err) {
    console.error("Lookup failed:", err);
  } else {
    console.log(`Lookup result: ${address} (family: ${family})`);
  }
});
