/**
 * Replaces WhatsApp template variables with actual customer/order data.
 * Supports both {{var}} (new) and [var] (legacy) formats.
 */
export function applyTemplate(template, data = {}) {
  if (!template) return '';

  const formatNGN = (amount) =>
    amount != null ? `NGN ${Number(amount).toLocaleString('en-NG')}` : '';

  const varValues = {
    'customername':       data.customerName ?? '',
    'customerphone':      data.customerPhone ?? '',
    'productname':        data.productName ?? '',
    'productprice':       formatNGN(data.price),
    'ordernumber':        data.orderNumber ?? '',
    'brandphone':         data.brandPhone ?? '',
    'brandname':          data.brandName ?? '',
    'individualname':     data.assignedStaffName ?? '',
    'individual_state':   data.state ?? '',
    'customername_state': data.customerName && data.state
      ? `${data.customerName} from ${data.state}`
      : (data.customerName ?? ''),
    'formlink':           data.formlink ?? '',
  };

  // Support both {{var}} (new) and [var] (legacy)
  return Object.entries(varValues).reduce(
    (msg, [key, val]) => msg.replaceAll(`{{${key}}}`, val).replaceAll(`[${key}]`, val),
    template
  );
}
