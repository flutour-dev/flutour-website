exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let d;
  try {
    d = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const required = ['ref', 'clientEmail', 'agentEmail', 'rideType', 'date', 'slot', 'pick', 'total', 'cur'];
  if (required.some(function (k) { return !d[k]; })) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is not set');
    return { statusCode: 500, body: 'Email service not configured' };
  }

  const fmt = function (v, cur) {
    return cur === 'EGP'
      ? 'EGP ' + Math.round(v).toLocaleString('en-US')
      : '$' + Math.round(v).toLocaleString('en-US');
  };

  const rows = [
    ['Ride type',  d.rideType],
    ['Date',       d.date],
    ['Time',       d.slot],
    ['Guests',     String(d.guests || '')],
    ['Pick-up',    d.pick],
    ['Drop-off',   d.drop || d.pick],
    ['Total',      fmt(d.total, d.cur)],
    ['Booked by',  d.agency || 'Direct'],
  ];

  const tableRows = rows.map(function (r, i) {
    return (
      '<tr style="background:' + (i % 2 === 0 ? '#ffffff' : '#F8FAFD') + '">' +
      '<td style="padding:10px 16px;font-size:14px;color:#4B5F82;width:40%">' + r[0] + '</td>' +
      '<td style="padding:10px 16px;font-size:14px;font-weight:600;color:#0A1E45">' + r[1] + '</td>' +
      '</tr>'
    );
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F6FC;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F6FC;padding:32px 0">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(5,42,104,.1)">
      <tr>
        <td style="background:#043A8B;padding:28px 32px">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-.01em">
            Flu<span style="color:#08A9E9">Tour</span>
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4B5F82">Booking confirmed</p>
          <h2 style="margin:0 0 20px;font-size:28px;font-weight:800;color:#0A1E45">${d.ref}</h2>
          <p style="margin:0 0 24px;color:#4B5F82;font-size:15px">
            Hi ${d.clientName || 'there'}, your ride in Luxor is all set.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D3DFF0;border-radius:10px;overflow:hidden;margin-bottom:24px">
            <tr style="background:#E6EEF9">
              <td colspan="2" style="padding:10px 16px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#4B5F82">
                Ride details
              </td>
            </tr>
            ${tableRows}
          </table>
          <p style="margin:0;font-size:13px;color:#0B7A55;background:#DDF4EA;border-radius:8px;padding:12px 16px">
            &#10003; Free cancellation up to 24 hours before the ride.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#E6EEF9;padding:18px 32px;font-size:12px;color:#4B5F82;text-align:center">
          FluTour &mdash; Luxor, Egypt &mdash;
          <a href="https://flutour.com" style="color:#043A8B;text-decoration:none">flutour.com</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const adminRows = [
    ['Ref',        d.ref],
    ['Ride',       d.rideType],
    ['Date',       d.date + ' at ' + d.slot],
    ['Client',     d.clientName || '—'],
    ['Email',      d.clientEmail],
    ['Phone',      d.clientPhone || '—'],
    ['Company',    d.company || '—'],
    ['Guests',     String(d.guests || '')],
    ['Hours',      String(d.hours || '')],
    ['Pick-up',    d.pick],
    ['Drop-off',   d.drop || d.pick],
    ['Payment',    d.pay || '—'],
    ['Agent',      d.agency ? d.agency + ' · ' + d.agentEmail : 'Direct'],
    ['Total',      fmt(d.total, d.cur)],
  ];

  const adminTableRows = adminRows.map(function (r, i) {
    const isTotal = r[0] === 'Total';
    return (
      '<tr style="background:' + (isTotal ? '#DDF4EA' : i % 2 === 0 ? '#ffffff' : '#F8FAFD') + '">' +
      '<td style="padding:8px 14px;font-size:13px;color:#4B5F82;width:38%' + (isTotal ? ';font-weight:700;color:#0B7A55' : '') + '">' + r[0] + '</td>' +
      '<td style="padding:8px 14px;font-size:13px;font-weight:600;color:' + (isTotal ? '#0B7A55' : '#0A1E45') + '">' + r[1] + '</td>' +
      '</tr>'
    );
  }).join('');

  const adminHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F6FC;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F6FC;padding:32px 0">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(5,42,104,.1)">
      <tr><td style="background:#043A8B;padding:22px 28px">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800">Flu<span style="color:#08A9E9">Tour</span> — New Booking</h1>
      </td></tr>
      <tr><td style="padding:24px 28px">
        <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A1E45;font-family:monospace">${d.ref}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D3DFF0;border-radius:10px;overflow:hidden">
          ${adminTableRows}
        </table>
      </td></tr>
      <tr><td style="background:#E6EEF9;padding:14px 28px;font-size:12px;color:#4B5F82;text-align:center">
        FluTour Admin — <a href="https://flutour.com" style="color:#043A8B">flutour.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    // Send client confirmation and admin notification in parallel
    const [clientRes, adminRes] = await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FluTour <bookings@flutour.com>',
          to: [d.clientEmail],
          cc: [d.agentEmail],
          subject: 'Your FluTour booking ' + d.ref + ' is confirmed',
          html: html,
        }),
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FluTour <bookings@flutour.com>',
          to: ['admin@app.flutour.com'],
          subject: 'New Booking — ' + d.ref + ' (' + (d.clientName || d.clientEmail) + ')',
          html: adminHtml,
        }),
      }),
    ]);

    if (!clientRes.ok) {
      const body = await clientRes.text();
      console.error('Resend client error:', clientRes.status, body);
      return { statusCode: 502, body: 'Email delivery failed' };
    }

    if (!adminRes.ok) {
      const body = await adminRes.text();
      console.error('Resend admin error:', adminRes.status, body);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('send-email error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
