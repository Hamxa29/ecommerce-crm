import { createTransporter, FROM_ADDRESS } from '../config/mailer.js';
import { prisma } from '../config/database.js';

export async function sendNewOrderNotification(order) {
  try {
    // Get notification emails from settings
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
    const emailsRaw = settings?.orderNotificationEmails ?? '';
    const recipients = emailsRaw.split(',').map(e => e.trim()).filter(Boolean);

    if (recipients.length === 0) return; // No emails configured

    const transporter = createTransporter();
    if (!transporter) {
      console.warn('[Email] SMTP not configured — skipping order notification');
      return;
    }

    const storeName = settings?.storeName ?? 'E-Commerce CRM';
    const items = order.items ?? [];
    const itemsHtml = items.map(i =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${i.product?.name ?? 'Product'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${i.pricingTier ?? '-'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${i.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right">₦${Number(i.unitPrice).toLocaleString()}</td>
      </tr>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
          <div style="background:#1d4ed8;padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">🎉 New Order Received!</h1>
            <p style="color:#bfdbfe;margin:6px 0 0">${storeName}</p>
          </div>
          <div style="padding:24px">
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">Order Number</td>
                <td style="padding:8px 0;font-weight:bold;color:#1d4ed8;font-size:16px">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">Customer</td>
                <td style="padding:8px 0;font-weight:600">${order.customerName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">Phone</td>
                <td style="padding:8px 0">${order.customerPhone}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">State</td>
                <td style="padding:8px 0">${order.state}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">Address</td>
                <td style="padding:8px 0">${order.address}</td>
              </tr>
            </table>

            ${items.length > 0 ? `
            <h3 style="font-size:14px;color:#374151;margin-bottom:8px">Order Items</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
              <thead>
                <tr style="background:#f3f4f6">
                  <th style="padding:8px 12px;text-align:left;color:#6b7280">Product</th>
                  <th style="padding:8px 12px;text-align:left;color:#6b7280">Package</th>
                  <th style="padding:8px 12px;text-align:center;color:#6b7280">Qty</th>
                  <th style="padding:8px 12px;text-align:right;color:#6b7280">Price</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            ` : ''}

            <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center">
              <p style="margin:0;color:#166534;font-size:13px">Delivery Fee</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#166534">₦${Number(order.deliveryFee ?? 0).toLocaleString()}</p>
              <p style="margin:8px 0 0;color:#166534;font-size:13px">Total Amount</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#166534">₦${Number(order.totalAmount).toLocaleString()}</p>
            </div>

            ${order.notes ? `<div style="margin-top:16px;padding:12px;background:#fefce8;border-radius:8px;font-size:13px;color:#713f12"><strong>Notes:</strong> ${order.notes}</div>` : ''}
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af">
            This notification was sent automatically by ${storeName} CRM
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${storeName}" <${FROM_ADDRESS}>`,
      to: recipients.join(', '),
      subject: `🛍️ New Order: ${order.orderNumber} — ${order.customerName} (${order.state})`,
      html,
    });

    console.log(`[Email] Order notification sent to: ${recipients.join(', ')}`);
  } catch (err) {
    // Non-fatal — log but don't break order creation
    console.error('[Email] Failed to send order notification:', err.message);
  }
}
