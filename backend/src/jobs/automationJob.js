/**
 * WhatsApp automation trigger — fires when an order status changes.
 * Full implementation in Phase 3.
 */
export async function triggerAutomation(order, newStatus) {
  // Phase 3: query WhatsappAutomation rules matching triggerStatus,
  // then call sendPersonalizedBroadcast for each matching rule.
  console.log(`[Automation] Status changed → ${newStatus} for order ${order.orderNumber}`);
}
