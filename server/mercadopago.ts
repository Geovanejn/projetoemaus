import { MercadoPagoConfig, Payment } from "mercadopago";

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const PIX_EXPIRATION_MINUTES = 15;
const PIX_FEE_PERCENTAGE = 0.99;

// Webhook URL can be configured via env var, or falls back to apex domain
// IMPORTANT: Use apex domain (without www) to avoid 307 redirects on Render
const WEBHOOK_URL = process.env.MERCADO_PAGO_WEBHOOK_URL || 
  (process.env.NODE_ENV === "production" ? "https://umpemaus.com.br/api/pix/webhook" : null);

if (WEBHOOK_URL) {
  console.log("[MercadoPago] Webhook URL configured:", WEBHOOK_URL);
} else {
  console.log("[MercadoPago] No webhook URL configured - webhooks will use Mercado Pago dashboard settings");
}

let client: MercadoPagoConfig | null = null;
let paymentAPI: Payment | null = null;

function initClient() {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    console.log("[MercadoPago] Not configured - MERCADO_PAGO_ACCESS_TOKEN required");
    return false;
  }
  
  if (!client) {
    client = new MercadoPagoConfig({
      accessToken: MERCADO_PAGO_ACCESS_TOKEN,
    });
    paymentAPI = new Payment(client);
    console.log("[MercadoPago] Client initialized successfully");
  }
  return true;
}

initClient();

export function isMercadoPagoConfigured(): boolean {
  return !!MERCADO_PAGO_ACCESS_TOKEN;
}

export function calculatePixFee(amountCentavos: number): number {
  return Math.ceil(amountCentavos * (PIX_FEE_PERCENTAGE / 100));
}

export interface CreatePixPaymentParams {
  amountCentavos: number;
  description: string;
  payerEmail: string;
  payerName?: string;
  externalReference?: string;
}

export interface PixPaymentResult {
  success: boolean;
  paymentId?: number;
  status?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: Date;
  error?: string;
}

export async function createPixPayment(params: CreatePixPaymentParams): Promise<PixPaymentResult> {
  if (!initClient() || !paymentAPI) {
    return { success: false, error: "Mercado Pago não configurado" };
  }

  try {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + PIX_EXPIRATION_MINUTES);

    const transactionAmount = params.amountCentavos / 100;
    
    console.log(`[MercadoPago] Creating PIX payment:`, {
      amountCentavos: params.amountCentavos,
      transactionAmountReais: transactionAmount,
      description: params.description,
      externalReference: params.externalReference,
    });

    const paymentBody: any = {
      transaction_amount: transactionAmount,
      description: params.description,
      payment_method_id: "pix",
      date_of_expiration: expirationDate.toISOString(),
      payer: {
        email: params.payerEmail,
        first_name: params.payerName?.split(" ")[0],
        last_name: params.payerName?.split(" ").slice(1).join(" ") || undefined,
      },
      external_reference: params.externalReference,
    };
    
    // Add notification URL for webhook (uses apex domain to avoid 307 redirects)
    if (WEBHOOK_URL) {
      paymentBody.notification_url = WEBHOOK_URL;
      console.log("[MercadoPago] Using notification_url:", WEBHOOK_URL);
    }

    const payment = await paymentAPI.create({
      body: paymentBody,
      requestOptions: {
        idempotencyKey: `${params.externalReference || Date.now()}-${params.payerEmail}`,
      },
    });

    const transactionData = payment.point_of_interaction?.transaction_data;

    // Log warning if QR code data is missing
    if (!transactionData?.qr_code_base64) {
      console.warn(`[MercadoPago] Warning: QR code base64 not returned for payment ${payment.id}. Has qr_code: ${!!transactionData?.qr_code}, has ticketUrl: ${!!transactionData?.ticket_url}`);
    }

    console.log(`[MercadoPago] PIX created successfully:`, {
      paymentId: payment.id,
      status: payment.status,
      hasQrCode: !!transactionData?.qr_code,
      hasQrCodeBase64: !!transactionData?.qr_code_base64,
      hasTicketUrl: !!transactionData?.ticket_url,
    });

    return {
      success: true,
      paymentId: payment.id,
      status: payment.status || "pending",
      qrCode: transactionData?.qr_code,
      qrCodeBase64: transactionData?.qr_code_base64,
      ticketUrl: transactionData?.ticket_url,
      expiresAt: expirationDate,
    };
  } catch (error: any) {
    console.error("[MercadoPago] Error creating PIX payment:", error);
    
    // Parse specific Mercado Pago errors to provide helpful messages
    let userFriendlyError = "Erro ao criar pagamento PIX";
    
    if (error.message?.includes("Collector user without key enabled")) {
      userFriendlyError = "A conta Mercado Pago não tem chave PIX cadastrada. O administrador precisa cadastrar uma chave PIX no painel do Mercado Pago.";
    } else if (error.cause && Array.isArray(error.cause)) {
      const causeCode = error.cause[0]?.code;
      if (causeCode === 13253) {
        userFriendlyError = "Cadastro do Mercado Pago incompleto. Complete todas as etapas de verificação no painel do Mercado Pago e cadastre uma chave PIX.";
      }
    } else if (error.message) {
      userFriendlyError = error.message;
    }
    
    return {
      success: false,
      error: userFriendlyError,
    };
  }
}

export interface PaymentStatusResult {
  success: boolean;
  paymentId?: number;
  status?: string;
  statusDetail?: string;
  approved?: boolean;
  error?: string;
}

export async function getPaymentStatus(paymentId: number): Promise<PaymentStatusResult> {
  if (!initClient() || !paymentAPI) {
    return { success: false, error: "Mercado Pago não configurado" };
  }

  try {
    const payment = await paymentAPI.get({ id: paymentId });

    return {
      success: true,
      paymentId: payment.id,
      status: payment.status || undefined,
      statusDetail: payment.status_detail || undefined,
      approved: payment.status === "approved",
    };
  } catch (error: any) {
    console.error("[MercadoPago] Error getting payment status:", error);
    return {
      success: false,
      error: error.message || "Erro ao verificar pagamento",
    };
  }
}

export type WebhookPaymentType = "payment" | "payment.created" | "payment.updated";

export interface WebhookData {
  type: string;
  data: {
    id: string | number;
  };
  action?: string;
}

export function isValidWebhookPayload(body: any): body is WebhookData {
  return (
    body &&
    typeof body === "object" &&
    body.data &&
    (body.data.id !== undefined)
  );
}
