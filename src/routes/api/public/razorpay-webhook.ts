import { createFileRoute } from '@tanstack/react-router';
import { createHmac, timingSafeEqual } from 'crypto';

export const Route = createFileRoute('/api/public/razorpay-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('x-razorpay-signature');
        const secret = process.env['RAZORPAY_WEBHOOK_SECRET'];
        
        if (!secret) {
          console.error("RAZORPAY_WEBHOOK_SECRET not configured");
          return new Response('Webhook secret not configured', { status: 500 });
        }

        const body = await request.text();
        const expectedSignature = createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        if (!signature || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
          return new Response('Invalid signature', { status: 401 });
        }

        const payload = JSON.parse(body);
        console.log("Razorpay Webhook received:", payload.event);

        // Handle specific events
        if (payload.event === 'payment.captured') {
          // Update user subscription status in database
          // Note: Real implementation would need to correlate order/payment to a user
        }

        return new Response('ok');
      }
    }
  }
});
