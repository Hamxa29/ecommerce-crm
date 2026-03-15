/**
 * Logistics provider interface.
 * Every provider module must export these three functions.
 *
 * @typedef {Object} ShipmentResult
 * @property {string} trackingNumber
 * @property {string} trackingUrl
 *
 * @typedef {Object} TrackingResult
 * @property {string} status
 * @property {string|null} estimatedDelivery
 *
 * @typedef {Object} CancelResult
 * @property {boolean} cancelled
 */

/**
 * Create a shipment for an order.
 * @param {object} order - Prisma Order object with items and address fields.
 * @param {object} settings - StoreSettings (logisticsApiKey, etc).
 * @returns {Promise<ShipmentResult>}
 */
export async function createShipment(order, settings) { // eslint-disable-line no-unused-vars
  throw new Error('Logistics integration not yet implemented');
}

/**
 * Track a shipment.
 * @param {string} trackingNumber
 * @param {object} settings - StoreSettings.
 * @returns {Promise<TrackingResult>}
 */
export async function trackShipment(trackingNumber, settings) { // eslint-disable-line no-unused-vars
  throw new Error('Logistics integration not yet implemented');
}

/**
 * Cancel a shipment.
 * @param {string} trackingNumber
 * @param {object} settings - StoreSettings.
 * @returns {Promise<CancelResult>}
 */
export async function cancelShipment(trackingNumber, settings) { // eslint-disable-line no-unused-vars
  throw new Error('Logistics integration not yet implemented');
}
