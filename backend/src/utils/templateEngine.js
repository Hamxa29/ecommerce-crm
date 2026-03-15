/**
 * Replaces WhatsApp template variables with actual customer/order data.
 * Supports: [var], {{var}}, {var} — all case-insensitive.
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

  // Replace all supported formats case-insensitively:
  // [varname], {{varname}}, {varname}
  return Object.entries(varValues).reduce((msg, [key, val]) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return msg
      .replace(new RegExp(`\\[${escaped}\\]`, 'gi'), val)
      .replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'gi'), val)
      .replace(new RegExp(`\\{${escaped}\\}`, 'gi'), val);
  }, template);
}
