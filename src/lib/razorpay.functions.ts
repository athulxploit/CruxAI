import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Razorpay from "razorpay";

const getRazorpay = () => {
  const keyId = process.env['RAZORPAY_KEY_ID'];
  const keySecret = process.env['RAZORPAY_KEY_SECRET'];
  
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .validator((data: { amount: number; currency?: string; receipt?: string }) => 
    z.object({
      amount: z.number(), // in paise (INR)
      currency: z.string().default("INR"),
      receipt: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const razorpay = getRazorpay();
    const options = {
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt || `receipt_${Date.now()}`,
    };
    
    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error: any) {
      console.error("Razorpay order creation failed:", error);
      throw new Error(error.message || "Failed to create Razorpay order");
    }
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .validator((data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { validatePaymentVerification } = await import("razorpay/dist/utils/razorpay-utils");
    const keySecret = process.env['RAZORPAY_KEY_SECRET']!;
    
    const isValid = validatePaymentVerification(
      { order_id: data.razorpay_order_id, payment_id: data.razorpay_payment_id },
      data.razorpay_signature,
      keySecret
    );
    
    return { isValid };
  });
