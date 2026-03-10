import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { checkWhatsappNumber, sendText } from '../config/evolution.js';
import { applyTemplate } from '../utils/templateEngine.js';
import { normalizePhone } from '../utils/phoneNormalizer.js';

export function startCartAbandonmentJob() {
  // Run every minute; send WA message to carts abandoned 3+ minutes ago
  cron.schedule('* * * * *', async () => {
    try {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      const carts = await prisma.abandonedCart.findMany({
        where: {
          recoveryStatus: 'pending',
          messageSentAt: null,
          createdAt: { lte: threeMinutesAgo },
          customerPhone: { not: '' },
        },
        include: { form: { select: { slug: true } } },
      });

      if (carts.length === 0) return;

      // Get first connected WhatsApp account
      const account = await prisma.whatsappAccount.findFirst({
        where: { status: 'CONNECTED' },
      });
      if (!account) return;

      // Get cart abandonment template (if any)
      const template = await prisma.whatsappTemplate.findFirst({
        where: { messageType: 'cart_abandonment' },
      });

      for (const cart of carts) {
        try {
          const phone = normalizePhone(cart.customerPhone);

          // Only send if number is on WhatsApp
          const isOnWhatsApp = await checkWhatsappNumber(account.instanceName, phone);
          if (!isOnWhatsApp) {
            await prisma.abandonedCart.update({
              where: { id: cart.id },
              data: { recoveryStatus: 'ignored', messageSentAt: new Date() },
            });
            continue;
          }

          const siteUrl = process.env.SITE_URL ?? 'https://crm.hulliz.com';
          const formLink = cart.form?.slug ? `${siteUrl}/form/${cart.form.slug}` : '';

          const msg = template
            ? applyTemplate(template.content, {
                customerName: cart.customerName,
                customerPhone: phone,
                productName: cart.productData?.productName ?? '',
                price: cart.productData?.price ?? '',
                orderNumber: '',
                state: '',
                brandName: '',
                brandPhone: '',
                assignedStaffName: '',
                formlink: formLink,
              })
            : `Hi ${cart.customerName}! 👋 You left something in your cart.\n\nYou were about to order *${cart.productData?.productName ?? 'a product'}*.\n\nComplete your order now before it's gone! 🛒${formLink ? `\n\n👉 ${formLink}` : ''}`;

          await sendText(account.instanceName, phone, msg);

          await prisma.abandonedCart.update({
            where: { id: cart.id },
            data: { recoveryStatus: 'messaged', messageSentAt: new Date() },
          });

          console.log(`[CartAbandonment] Sent WA to ${phone} (cart ${cart.id})`);

          // 2-second delay between sends
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error(`[CartAbandonment] Failed for cart ${cart.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[CartAbandonment] Job error:', err.message);
    }
  });

  console.log('[Scheduler] Cart abandonment job started (checks every minute, triggers at 3min)');
}
