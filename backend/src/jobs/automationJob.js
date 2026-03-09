import { triggerAutomationForOrder } from '../modules/whatsapp/whatsapp.service.js';

export async function triggerAutomation(order, newStatus) {
  try {
    await triggerAutomationForOrder(order, newStatus);
  } catch (err) {
    console.error(`[Automation] Failed for order ${order.orderNumber}:`, err.message);
  }
}
