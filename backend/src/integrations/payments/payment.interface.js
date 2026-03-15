/**
 * Payment Provider Interface
 * Every provider module must export these three functions.
 *
 * createPaymentLink(order, settings)
 *   → Promise<{ url: string, reference: string }>
 *   - order: full Prisma Order object
 *   - settings: StoreSettings row
 *   - returns: checkout URL to redirect customer + gateway transaction reference
 *
 * verifyPayment(reference, settings)
 *   → Promise<{ paid: boolean, amount: number, reference: string }>
 *   - reference: gateway transaction reference string
 *
 * parseWebhook(body, headers, settings)
 *   → { reference: string, paid: boolean, amount: number } | null
 *   - body: parsed JSON body (or raw Buffer for providers needing HMAC on raw bytes)
 *   - headers: request headers (used for signature verification)
 *   - returns null if signature invalid or event is not actionable
 */
