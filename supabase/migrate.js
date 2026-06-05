const https = require('https');

const sql = [
  "UPDATE orders SET status = 'in_transit' WHERE status = 'transit';",
  "ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;",
  "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','assigned','picked_up','in_transit','delivered','cancelled'));"
].join('\n');

const data = JSON.stringify({ query: sql });

const opt = {
  hostname: 'tjgutznerztvegoyitex.supabase.co',
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': '<SECRET_3fe96639>',
    'Authorization': 'Bearer <SECRET_3fe96639>'
  }
};

const req = https.request(opt, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
