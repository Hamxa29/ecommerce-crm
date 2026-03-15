import { getSettings } from '../modules/settings/settings.service.js';

/**
 * Syncs one order row to Google Sheets via an Apps Script web app URL.
 * action: 'append' (new order) | 'update' (status change)
 */
export async function syncOrderToSheets(order, action = 'append') {
  try {
    const settings = await getSettings();
    if (!settings.googleSheetsEnabled || !settings.googleSheetsWebhookUrl) return;

    const productNames = (order.items ?? [])
      .map(i => i.product?.name)
      .filter(Boolean)
      .join(', ');

    const row = [
      order.orderNumber,
      order.customerName,
      order.customerPhone,
      order.customerPhone2 ?? '',
      order.state,
      order.city ?? '',
      order.address,
      productNames,
      Number(order.totalAmount),
      order.deliveryFee != null ? Number(order.deliveryFee) : 0,
      order.status,
      order.paymentMethod,
      order.paymentStatus,
      order.agent?.name ?? '',
      order.assignedStaff?.name ?? '',
      order.source ?? '',
      order.notes ?? '',
      order.comment ?? '',
      new Date(order.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
    ];

    await fetch(settings.googleSheetsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        orderNumber: order.orderNumber,
        sheetName: settings.googleSheetsSheetName || 'Orders',
        row,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    // Non-fatal — never block order operations
    console.error('[GoogleSheets] Sync failed:', err.message);
  }
}
