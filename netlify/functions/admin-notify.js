// netlify/functions/admin-notify.js
// Receives POST from Flutter driver/passenger apps and sends admin emails via Resend.
// types: driver_registration | trip_request | trip_complete

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

  if (!d.type) {
    return { statusCode: 400, body: 'Missing type' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    return { statusCode: 500, body: 'Email service not configured' };
  }

  const row = function (label, value, bg) {
    return '<tr style="background:' + (bg ? '#F8FAFD' : '#ffffff') + '">' +
      '<td style="padding:8px 14px;font-size:13px;color:#4B5F82;width:40%">' + label + '</td>' +
      '<td style="padding:8px 14px;font-size:13px;font-weight:600;color:#0A1E45">' + (value || '—') + '</td>' +
      '</tr>';
  };

  const wrap = function (title, body) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="margin:0;padding:0;background:#F1F6FC;font-family:\'Segoe UI\',Arial,sans-serif">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F6FC;padding:32px 0">' +
      '<tr><td align="center">' +
      '<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(5,42,104,.1)">' +
      '<tr><td style="background:#043A8B;padding:22px 28px">' +
      '<h1 style="margin:0;color:#fff;font-size:20px;font-weight:800">Flu<span style="color:#08A9E9">Tour</span> — ' + title + '</h1>' +
      '</td></tr>' +
      '<tr><td style="padding:24px 28px">' + body + '</td></tr>' +
      '<tr><td style="background:#E6EEF9;padding:14px 28px;font-size:12px;color:#4B5F82;text-align:center">' +
      'FluTour Admin — <a href="https://flutour.com" style="color:#043A8B">flutour.com</a>' +
      '</td></tr></table></td></tr></table></body></html>';
  };

  let subject, html;

  if (d.type === 'driver_registration') {
    subject = 'New Driver Registration — ' + (d.name || 'Unknown') + ' (Pending Approval)';
    const rows =
      row('Name',         d.name,        false) +
      row('Phone',        d.phone,       true)  +
      row('Vehicle Type', d.vehicleType, false) +
      row('Vehicle ID',   d.vehicleId,   true)  +
      row('InstaPay',     d.instapayPhone, false);
    html = wrap('New Driver Registration',
      '<p style="margin:0 0 16px;font-size:15px;color:#4B5F82">A new driver has registered and is awaiting approval.</p>' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D3DFF0;border-radius:10px;overflow:hidden">' +
      rows + '</table>' +
      '<p style="margin:16px 0 0;font-size:13px;color:#0B7A55;background:#DDF4EA;border-radius:8px;padding:12px 16px">' +
      '&#9432; Review and approve this driver in the Admin Dashboard.</p>'
    );

  } else if (d.type === 'trip_request') {
    subject = 'New Trip Request — ' + (d.passengerName || d.passengerId);
    const rows =
      row('Passenger',  d.passengerName, false) +
      row('Vehicle',    d.vehicleType,   true)  +
      row('From',       d.pickup,        false) +
      row('To',         d.dropoff,       true)  +
      row('Fare',       d.fare + ' EGP', false) +
      row('Payment',    d.paymentMethod, true)  +
      row('Passengers', d.passengerCount, false) +
      row('Trip ID',    d.tripId,        true);
    html = wrap('New Trip Request',
      '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D3DFF0;border-radius:10px;overflow:hidden">' +
      rows + '</table>'
    );

  } else if (d.type === 'trip_complete') {
    subject = 'Trip Completed — Receipt #' + (d.tripId || '').substring(0, 8).toUpperCase();
    const driverEarning = Math.round((d.fare || 0) * 0.85);
    const platformFee   = Math.round((d.fare || 0) * 0.15);
    const rows =
      row('Trip ID',          '#' + (d.tripId || '').substring(0, 8).toUpperCase(), false) +
      row('Passenger',        d.passengerName,  true)  +
      row('Driver',           d.driverName,     false) +
      row('Vehicle',          d.vehicleType,    true)  +
      row('From',             d.pickup,         false) +
      row('To',               d.dropoff,        true)  +
      row('Payment',          d.paymentMethod,  false) +
      '<tr style="background:#fff"><td style="padding:8px 14px;font-size:13px;color:#4B5F82">Total Fare</td>' +
      '<td style="padding:8px 14px;font-size:13px;font-weight:700;color:#0A1E45">' + Math.round(d.fare || 0) + ' EGP</td></tr>' +
      '<tr style="background:#F8FAFD"><td style="padding:8px 14px;font-size:13px;color:#4B5F82">Driver (85%)</td>' +
      '<td style="padding:8px 14px;font-size:13px;font-weight:600;color:#0A1E45">' + driverEarning + ' EGP</td></tr>' +
      '<tr style="background:#DDF4EA"><td style="padding:8px 14px;font-size:13px;color:#0B7A55;font-weight:700">Platform (15%)</td>' +
      '<td style="padding:8px 14px;font-size:13px;font-weight:700;color:#0B7A55">' + platformFee + ' EGP</td></tr>';
    html = wrap('Trip Receipt',
      '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D3DFF0;border-radius:10px;overflow:hidden">' +
      rows + '</table>'
    );

  } else {
    return { statusCode: 400, body: 'Unknown type' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FluTour <bookings@flutour.com>',
        to: ['admin@app.flutour.com'],
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Resend error:', res.status, body);
      return { statusCode: 502, body: 'Email delivery failed' };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('admin-notify error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
