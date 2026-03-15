import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { checkWhatsappNumber, sendText } from '../config/evolution.js';
import { applyTemplate } from '../utils/templateEngine.js';
import { normalizePhone } from '../utils/phoneNormalizer.js';

export function startCartAbandonmentJob() {
  cron.schedule('* * * * *', async () => {
    try {
      // Find the ABANDONED_CART automation rule (if any)
      const rule = await prisma.whatsappAutomation.findFirst({
        where: { triggerStatus: 'ABANDONED_CART', enabled: true },
        include: { account: true },
      });

      // No rule configured — skip silently
      if (!rule || rule.account?.status !== 'CONNECTED') return;

      const delayMs  = (rule.delayMinutes ?? 5) * 60 * 1000;
      const cutoff   = new Date(Date.now() - delayMs);

      const carts = await prisma.abandonedCart.findMany({
        where: {
          recoveryStatus: 'pending',
          messageSentAt:  null,
          createdAt:      { lte: cutoff },
          customerPhone:  { not: '' },
        },
        include: { form: { select: { slug: true } } },
      });

      if (carts.length === 0) return;

      // Fetch brand info and the message template
      const settings = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
      const brandName  = settings?.storeName  ?? '';
      const brandPhone = settings?.whatsappNumber ?? settings?.phoneNumber ?? '';

      const template = rule.templateId
        ? await prisma.whatsappTemplate.findUnique({ where: { id: rule.templateId } })
        : null;
      const msgTemplate = template?.content ?? rule.customMessage ?? '';

      for (const cart of carts) {
        // If the customer already placed an order from this same form after abandoning,
        // they recovered on their own — mark skipped, do not send a message
        if (cart.formId) {
          const selfRecovered = await prisma.order.findFirst({
            where: { customerPhone: cart.customerPhone, formId: cart.formId, createdAt: { gte: cart.createdAt } },
            select: { id: true },
          });
          if (selfRecovered) {
            await prisma.abandonedCart.update({
              where: { id: cart.id },
              data: { recoveryStatus: 'skipped', messageSentAt: new Date() },
            });
            continue;
          }
        }

        try {
          const phone = normalizePhone(cart.customerPhone);

          const isOnWhatsApp = await checkWhatsappNumber(rule.account.instanceName, phone);
          if (!isOnWhatsApp) {
            await prisma.abandonedCart.update({
              where: { id: cart.id },
              data: { recoveryStatus: 'ignored', messageSentAt: new Date() },
            });
            continue;
          }

          const siteUrl  = process.env.SITE_URL ?? 'https://crm.hulliz.com';
          const formLink = cart.form?.slug ? `${siteUrl}/form/${cart.form.slug}` : '';

          const msg = msgTemplate
            ? applyTemplate(msgTemplate, {
                customerName:      cart.customerName,
                customerPhone:     phone,
                productName:       cart.productData?.productName ?? '',
                price:             cart.productData?.price ?? '',
                orderNumber:       '',
                state:             '',
                brandName,
                brandPhone,
                assignedStaffName: '',
                formlink:          formLink,
              })
            : `Hi ${cart.customerName}! 👋 You left something in your cart.\n\nYou were about to order *${cart.productData?.productName ?? 'a product'}*.\n\nComplete your order now before it's gone! 🛒${formLink ? `\n\n👉 ${formLink}` : ''}`;

          await sendText(rule.account.instanceName, phone, msg);

          await prisma.abandonedCart.update({
            where: { id: cart.id },
            data: { recoveryStatus: 'messaged', messageSentAt: new Date() },
          });

          await prisma.whatsappAutomation.update({
            where: { id: rule.id },
            data: { sentCount: { increment: 1 } },
          });

          console.log(`[CartAbandonment] Sent to ${phone} (cart ${cart.id})`);

          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error(`[CartAbandonment] Failed for cart ${cart.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[CartAbandonment] Job error:', err.message);
    }
  });

  console.log('[Scheduler] Cart abandonment job started (checks every minute, uses ABANDONED_CART automation rule)');
}
