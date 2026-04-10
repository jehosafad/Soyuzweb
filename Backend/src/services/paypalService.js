/**
 * paypalService.js
 * Integración con PayPal REST API v2.
 * Soporta sandbox y producción según PAYPAL_MODE.
 */

const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || "";

const BASE_URLS = {
    sandbox: "https://api-m.sandbox.paypal.com",
    production: "https://api-m.paypal.com",
};

function getBaseUrl() {
    return BASE_URLS[PAYPAL_MODE] || BASE_URLS.sandbox;
}

/**
 * Obtiene un access token de PayPal (OAuth2 client credentials).
 */
async function getAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
        throw new Error("PayPal no está configurado. Agrega PAYPAL_CLIENT_ID y PAYPAL_SECRET en tu .env");
    }

    const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");

    const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PayPal auth failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Crea una orden de PayPal.
 * @param {object} params
 * @param {number} params.amountUsd - Monto en USD (ej: 150.00)
 * @param {string} params.description - Descripción del pago
 * @param {string} params.referenceId - ID interno de referencia (quote_id, etc)
 * @returns {object} { id: paypal_order_id, approveUrl: link para el cliente }
 */
async function createOrder({ amountUsd, description, referenceId }) {
    const accessToken = await getAccessToken();

    const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
            {
                reference_id: String(referenceId || "soyuz-payment"),
                description: String(description || "Pago Soyuz").slice(0, 127),
                amount: {
                    currency_code: "USD",
                    value: Number(amountUsd).toFixed(2),
                },
            },
        ],
        application_context: {
            brand_name: "Agencia Soyuz",
            landing_page: "NO_PREFERENCE",
            user_action: "PAY_NOW",
            return_url: `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/client/portal?payment=success`,
            cancel_url: `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/client/portal?payment=cancelled`,
        },
    };

    const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PayPal create order failed (${response.status}): ${text}`);
    }

    const order = await response.json();

    const approveLink = order.links?.find((l) => l.rel === "approve");

    return {
        id: order.id,
        status: order.status,
        approveUrl: approveLink?.href || null,
    };
}

/**
 * Captura (cobra) una orden de PayPal aprobada por el cliente.
 * @param {string} orderId - El ID de la orden de PayPal
 * @returns {object} { captureId, status, amount }
 */
async function captureOrder(orderId) {
    const accessToken = await getAccessToken();

    const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PayPal capture failed (${response.status}): ${text}`);
    }

    const capture = await response.json();

    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];

    return {
        captureId: captureUnit?.id || null,
        status: capture.status,
        amount: captureUnit?.amount?.value || "0.00",
        currency: captureUnit?.amount?.currency_code || "USD",
    };
}

/**
 * Verifica si PayPal está configurado.
 */
function isPayPalConfigured() {
    return Boolean(PAYPAL_CLIENT_ID && PAYPAL_SECRET);
}

module.exports = {
    createOrder,
    captureOrder,
    getAccessToken,
    isPayPalConfigured,
};
