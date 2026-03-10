/**
 * Replaces WhatsApp template variables with actual customer/order data.
 * Supported variables match SniperCRM conventions.
 */
export function applyTemplate(template, data = {}) {
  if (!template) return '';

  const formatNGN = (amount) =>
    amount != null ? `NGN ${Number(amount).toLocaleString('en-NG')}` : '';

  const vars = {
    '[customername]': data.customerName ?? '',
    '[customerphone]': data.customerPhone ?? '',
    '[productname]': data.productName ?? '',
    '[productprice]': formatNGN(data.price),
    '[ordernumber]': data.orderNumber ?? '',
    '[brandphone]': data.brandPhone ?? '',
    '[brandname]': data.brandName ?? '',
    '[individualname]': data.assignedStaffName ?? '',
    '[individual_state]': data.state ?? '',
    '[customername_state]': data.customerName && data.state
      ? `${data.customerName} from ${data.state}`
      : (data.customerName ?? ''),
    '[formlink]': data.formlink ?? '',
  };

  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replaceAll(key, val),
    template
  );
}
