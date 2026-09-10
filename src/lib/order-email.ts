import nodemailer from 'nodemailer';
import { ResolvedOrder } from './order-resolver';
import { generateInvoicePdf } from './invoice-pdf';

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mock?: boolean;
  message?: string;
}

/**
 * Returns a configured Nodemailer transporter reading securely from environment variables.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER || 'care.adrizo@gmail.com';
  const pass = process.env.SMTP_PASS?.trim() || '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    }),
    configured: Boolean(user && pass),
    sender: process.env.MAIL_FROM || `AD(R)IZO <${user}>`,
    user,
  };
}

/**
 * Formats Indian Currency with standard Rs. prefix for broad email client compatibility.
 */
function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  return 'Rs. ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates responsive luxury HTML for order confirmation & invoice emails.
 */
function buildOrderEmailHtml(order: ResolvedOrder, isConfirmation = true): string {
  const isCod = order.paymentMethod === 'COD';
  const isPaid = (order.paymentStatus || '').toUpperCase() === 'PAID';
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const fullAddress = [
    order.houseFlat,
    order.areaStreet,
    order.landmark ? `Near ${order.landmark.replace(/^(near|landmark:?)\s*/i, '')}` : null,
    order.city,
    order.state ? `${order.state} - ${order.pincode || ''}` : order.pincode,
    'India'
  ].filter(Boolean).join(', ') || order.shippingAddress || 'Address on file';

  const itemsHtml = (order.items || []).map(it => `
    <tr>
      <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
        <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 4px;">
          ${it.productName}
        </div>
        <div style="font-size: 12px; color: #64748b;">
          ${it.size ? `Size: <strong>${it.size}</strong> &nbsp;|&nbsp; ` : ''}
          ${it.color ? `Color: <strong>${it.color}</strong> &nbsp;|&nbsp; ` : ''}
          SKU: ${it.sku || 'ADR-SKU'}
        </div>
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155; font-size: 13px; font-weight: 600;">
        ${it.quantity}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155; font-size: 13px;">
        ${it.mrp && it.mrp > it.unitPrice ? `<span style="text-decoration: line-through; color: #94a3b8; font-size: 11px; margin-right: 4px;">${formatCurrency(it.mrp)}</span>` : ''}
        ${formatCurrency(it.unitPrice)}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-size: 14px; font-weight: 700;">
        ${formatCurrency(it.totalPrice)}
      </td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isConfirmation ? 'Order Confirmation' : 'Tax Invoice'} #${order.orderNumber}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 640px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
      
      <!-- Brand Header -->
      <div style="background-color: #09090b; padding: 32px 28px; text-align: left;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: 2px;">
                AD<span style="color: #c9a86a;">(R)</span>IZO
              </h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;">
                Luxury Atelier &amp; Couture
              </p>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="display: inline-block; background: #27272a; color: #c9a86a; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: 1px solid #3f3f46;">
                ${isConfirmation ? 'Order Confirmed' : 'Official Invoice'}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 28px;">
        
        <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 20px; font-weight: 800;">
          ${isConfirmation ? 'Thank you for your order!' : `Tax Invoice #${order.orderNumber}`}
        </h2>
        <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          Dear <strong>${order.customerName || 'Valued Client'}</strong>,<br>
          ${isConfirmation 
            ? `Your order <strong>#${order.orderNumber}</strong> has been successfully placed on <strong>${orderDate}</strong>. We are preparing it for dispatch.`
            : `Please find attached the official Tax Invoice for Order <strong>#${order.orderNumber}</strong>.`}
        </p>

        <!-- Order Snapshot Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 1.8;">
            <tr>
              <td style="color: #64748b; width: 45%;">Order Number:</td>
              <td style="color: #0f172a; font-weight: 700; font-family: monospace; font-size: 14px;">#${order.orderNumber}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Order Date:</td>
              <td style="color: #0f172a; font-weight: 600;">${orderDate}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Payment Method:</td>
              <td style="color: #0f172a; font-weight: 600;">
                ${isCod ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}
              </td>
            </tr>
            <tr>
              <td style="color: #64748b;">Payment Status:</td>
              <td style="color: ${isPaid ? '#166534' : '#b45309'}; font-weight: 700;">
                ${isPaid ? 'PAID' : (isCod ? 'PENDING (Pay on Delivery)' : 'PENDING')}
              </td>
            </tr>
            <tr>
              <td style="color: #64748b;">Order Status:</td>
              <td style="color: #0f172a; font-weight: 700; text-transform: uppercase;">${order.orderStatus || 'PLACED'}</td>
            </tr>
          </table>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 28px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                <th style="padding: 10px 14px; font-weight: 700;">Item</th>
                <th style="padding: 10px 14px; font-weight: 700; text-align: center;">Qty</th>
                <th style="padding: 10px 14px; font-weight: 700; text-align: right;">Price</th>
                <th style="padding: 10px 14px; font-weight: 700; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Financial Summary -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; font-size: 14px;">
          <tr>
            <td style="width: 55%;"></td>
            <td style="width: 45%;">
              <table width="100%" cellpadding="0" cellspacing="0" style="line-height: 2;">
                <tr>
                  <td style="color: #64748b;">Subtotal:</td>
                  <td style="text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(order.subtotal)}</td>
                </tr>
                ${order.discount > 0 ? `
                <tr>
                  <td style="color: #16a34a;">Discount:</td>
                  <td style="text-align: right; color: #16a34a; font-weight: 600;">-${formatCurrency(order.discount)}</td>
                </tr>` : ''}
                <tr>
                  <td style="color: #64748b;">Shipping:</td>
                  <td style="text-align: right; color: #0f172a; font-weight: 600;">
                    ${order.shippingCharge === 0 ? '<span style="color: #16a34a;">FREE</span>' : formatCurrency(order.shippingCharge)}
                  </td>
                </tr>
                ${isCod ? `
                <tr>
                  <td style="color: #64748b;">COD Handling Fee:</td>
                  <td style="text-align: right; color: #0f172a; font-weight: 600;">${formatCurrency(order.codCharge || 99)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding-top: 10px; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 800; color: #0f172a;">
                    Total Payable:
                  </td>
                  <td style="padding-top: 10px; border-top: 2px solid #0f172a; text-align: right; font-size: 18px; font-weight: 900; color: #0f172a;">
                    ${formatCurrency(order.total)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Delivery Address -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 28px;">
          <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Delivery Address
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            ${order.customerName}
          </div>
          <div style="font-size: 13px; color: #334155; line-height: 1.6;">
            ${fullAddress}
          </div>
          ${order.customerPhone ? `<div style="font-size: 13px; color: #64748b; margin-top: 4px;">Contact: +91 ${order.customerPhone}</div>` : ''}
        </div>

        <!-- Attachment Note -->
        <div style="border-left: 3px solid #c9a86a; background: #fefce8; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 28px; font-size: 13px; color: #713f12;">
          <strong>Official Invoice Attached:</strong> Your complete Tax Invoice PDF is attached to this email for your records and warranty validation.
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; color: #94a3b8; font-size: 12px; line-height: 1.6;">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">
            AD(R)IZO Luxury Couture &amp; Atelier
          </p>
          <p style="margin: 0 0 6px 0;">
            Support: <a href="mailto:care.adrizo@gmail.com" style="color: #0f172a; text-decoration: none; font-weight: 600;">care.adrizo@gmail.com</a> | Visit: <a href="https://www.adrizo.in" style="color: #0f172a; text-decoration: none; font-weight: 600;">www.adrizo.in</a>
          </p>
          <p style="margin: 0; font-size: 11px;">
            This is an automated transactional notification regarding Order #${order.orderNumber}.
          </p>
        </div>

      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends an Order Confirmation Email to the customer with their Tax Invoice PDF attached.
 */
export async function sendOrderConfirmationEmail(order: ResolvedOrder): Promise<EmailSendResult> {
  const customerEmail = order.customerEmail?.trim();
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    console.warn('[sendOrderConfirmationEmail] Invalid or missing customer email:', customerEmail);
    return { success: false, error: 'Invalid customer email address' };
  }

  const { transporter, configured, sender } = getTransporter();

  // Generate PDF Invoice
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateInvoicePdf(order);
  } catch (pdfErr: any) {
    console.error('[sendOrderConfirmationEmail] PDF Generation failed:', pdfErr);
    return { success: false, error: 'PDF generation failed' };
  }

  if (!configured) {
    console.info(`[sendOrderConfirmationEmail Mock] SMTP_PASS not set in .env. Confirmation email prepared for ${customerEmail} (Order #${order.orderNumber}).`);
    return {
      success: true,
      mock: true,
      message: `Order confirmation prepared. Set SMTP_PASS in .env to deliver live emails.`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: sender,
      to: customerEmail,
      subject: `Order Confirmation #${order.orderNumber} - AD(R)IZO`,
      html: buildOrderEmailHtml(order, true),
      attachments: [
        {
          filename: `AD(R)IZO_Invoice_${order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log(`[sendOrderConfirmationEmail Success] Sent to ${customerEmail}, Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (mailErr: any) {
    console.error('[sendOrderConfirmationEmail Error]', mailErr);
    return { success: false, error: mailErr.message || 'Failed to dispatch email' };
  }
}

/**
 * Sends a Tax Invoice Email from the Admin Panel to the customer with their PDF attached.
 */
export async function sendInvoiceEmail(order: ResolvedOrder, customSubject?: string): Promise<EmailSendResult> {
  const customerEmail = order.customerEmail?.trim();
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { success: false, error: 'Customer email is not available or invalid' };
  }

  const { transporter, configured, sender } = getTransporter();

  // Generate PDF Invoice
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateInvoicePdf(order);
  } catch (pdfErr: any) {
    console.error('[sendInvoiceEmail] PDF Generation failed:', pdfErr);
    return { success: false, error: 'PDF generation failed' };
  }

  if (!configured) {
    console.info(`[sendInvoiceEmail Mock] SMTP_PASS not set. Invoice PDF generated successfully for ${customerEmail}.`);
    return {
      success: true,
      mock: true,
      message: `Invoice PDF generated successfully for ${customerEmail}. Set SMTP_PASS in .env to deliver live emails.`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: sender,
      to: customerEmail,
      subject: customSubject || `Tax Invoice for Order #${order.orderNumber} - AD(R)IZO`,
      html: buildOrderEmailHtml(order, false),
      attachments: [
        {
          filename: `AD(R)IZO_Invoice_${order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log(`[sendInvoiceEmail Success] Sent to ${customerEmail}, Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (mailErr: any) {
    console.error('[sendInvoiceEmail Error]', mailErr);
    return { success: false, error: mailErr.message || 'SMTP delivery failure' };
  }
}
