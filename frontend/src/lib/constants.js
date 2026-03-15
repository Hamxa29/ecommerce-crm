export const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'AWAITING', label: 'Awaiting', color: 'bg-purple-100 text-purple-800' },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
  { value: 'COMMITMENT_FEE_REQUESTED', label: 'Commitment Fee Requested', color: 'bg-orange-100 text-orange-800' },
  { value: 'NOT_PICKING_CALLS', label: 'Not Picking Calls', color: 'bg-red-100 text-red-700' },
  { value: 'SWITCHED_OFF', label: 'Switched Off', color: 'bg-red-100 text-red-800' },
  { value: 'FAILED', label: 'Failed', color: 'bg-red-200 text-red-900' },
  { value: 'DELETED', label: 'Deleted', color: 'bg-gray-200 text-gray-500' },
  { value: 'BANNED', label: 'Banned', color: 'bg-black text-white' },
  { value: 'SHIPPED', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'OPEN_RECORD', label: 'Open Record', color: 'bg-teal-100 text-teal-800' },
  { value: 'CUSTOM', label: 'Custom', color: 'bg-pink-100 text-pink-800' },
  { value: 'ABANDONED_CART', label: 'Abandoned Cart', color: 'bg-amber-100 text-amber-800' },
];

export const USER_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'CUSTOMER_SUPPORT', label: 'Customer Support' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
];

export const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const TEMPLATE_VARIABLES = [
  { key: '{{customername}}', label: 'Customer Name' },
  { key: '{{customerphone}}', label: 'Customer Phone' },
  { key: '{{productname}}', label: 'Product Name' },
  { key: '{{productprice}}', label: 'Product Price' },
  { key: '{{ordernumber}}', label: 'Order Number' },
  { key: '{{brandphone}}', label: 'Brand Phone' },
  { key: '{{brandname}}', label: 'Brand Name' },
  { key: '{{individualname}}', label: 'Staff Name' },
  { key: '{{individual_state}}', label: 'State' },
  { key: '{{customername_state}}', label: 'Name + State' },
  { key: '{{formlink}}', label: 'Form Link' },
];

export const PAYMENT_METHODS = [
  { value: 'COD', label: 'Cash on Delivery', color: 'bg-gray-100 text-gray-600' },
  { value: 'PBD', label: 'Pay Before Delivery', color: 'bg-blue-100 text-blue-700' },
];

export const PRODUCT_PAYMENT_METHODS = [
  { value: 'COD',  label: 'COD Only' },
  { value: 'PBD',  label: 'PBD Only' },
  { value: 'BOTH', label: 'Both' },
];
