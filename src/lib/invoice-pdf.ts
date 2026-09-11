import PDFDocument from 'pdfkit';
import { ResolvedOrder } from './order-resolver';

/**
 * Formats Indian Currency cleanly for PDF (using Rs. prefix to ensure universal font glyph compatibility)
 */
function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  return 'Rs. ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates a luxury, production-grade PDF invoice for an AD(R)IZO order.
 * Returns a Promise that resolves with a Buffer containing the complete PDF binary.
 */
export async function generateInvoicePdf(order: ResolvedOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `AD(R)IZO Invoice - #${order.orderNumber}`,
          Author: 'AD(R)IZO Luxury Apparel',
          Subject: `Tax Invoice for Order #${order.orderNumber}`,
          Keywords: 'Invoice, ADRIZO, Apparel, Receipt',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const isCod = order.paymentMethod === 'COD';
      const isPaid = (order.paymentStatus || '').toUpperCase() === 'PAID';
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const pageWidth = 595.28;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2; // 515.28

      // ==========================================
      // 1. BRAND HEADER & TAX INVOICE BADGE
      // ==========================================
      let currentY = 40;

      // Brand Title
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#09090B')
        .text('AD(R)IZO', margin, currentY, { characterSpacing: 2 });

      // Brand Subtitle
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#71717A')
        .text('PREMIUM GARMENTS & APPAREL', margin, currentY + 26, { characterSpacing: 1 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#A1A1AA')
        .text('Email: care.adrizo@gmail.com  |  Web: www.adrizo.com', margin, currentY + 38);

      // Top Right: Tax Invoice Metadata
      const rightX = margin + 300;
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#09090B')
        .text('TAX INVOICE', rightX, currentY, { align: 'right', width: contentWidth - 300 });

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#2563EB')
        .text(`#${order.orderNumber}`, rightX, currentY + 20, { align: 'right', width: contentWidth - 300 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#71717A')
        .text(`Date: ${orderDate}`, rightX, currentY + 34, { align: 'right', width: contentWidth - 300 });

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#A1A1AA')
        .text(`Ref UUID: ${order.id.slice(0, 18)}...`, rightX, currentY + 46, { align: 'right', width: contentWidth - 300 });

      // Horizontal Divider
      currentY += 62;
      doc
        .strokeColor('#E4E4E7')
        .lineWidth(1)
        .moveTo(margin, currentY)
        .lineTo(pageWidth - margin, currentY)
        .stroke();

      currentY += 14;

      // ==========================================
      // 2. CUSTOMER & DELIVERY ADDRESS CARDS
      // ==========================================
      const cardWidth = (contentWidth - 14) / 2; // ~250 each
      const cardHeight = 100;

      // Left Card: Customer Details
      doc
        .rect(margin, currentY, cardWidth, cardHeight)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#4338CA')
        .text('CUSTOMER DETAILS', margin + 12, currentY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#09090B')
        .text('Name:', margin + 12, currentY + 26);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#334155')
        .text(order.customerName, margin + 55, currentY + 26, { width: cardWidth - 65 });

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#09090B')
        .text('Email:', margin + 12, currentY + 40);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#334155')
        .text(order.customerEmail, margin + 55, currentY + 40, { width: cardWidth - 65 });

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#09090B')
        .text('Phone:', margin + 12, currentY + 54);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#334155')
        .text(`+91 ${order.customerPhone || '—'}`, margin + 55, currentY + 54);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#09090B')
        .text('Customer ID:', margin + 12, currentY + 68);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64748B')
        .text(order.customerId || 'Guest Checkout', margin + 68, currentY + 69, { width: cardWidth - 78 });

      // Right Card: Delivery Address
      const rightCardX = margin + cardWidth + 14;
      doc
        .rect(rightCardX, currentY, cardWidth, cardHeight)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#1D4ED8')
        .text('DELIVERY ADDRESS', rightCardX + 12, currentY + 10);

      const addressLines: string[] = [];
      if (order.houseFlat || order.areaStreet) {
        if (order.houseFlat) addressLines.push(order.houseFlat);
        if (order.areaStreet) addressLines.push(order.areaStreet);
        if (order.landmark) addressLines.push(`Near ${order.landmark.replace(/^(near|landmark:?)\s*/i, '')}`);
      } else if (order.shippingAddress) {
        addressLines.push(order.shippingAddress);
      }

      const cityStatePin = [
        order.city,
        order.state ? `${order.state} - ${order.pincode || ''}` : order.pincode,
        'India'
      ].filter(Boolean).join(', ');

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#334155')
        .text(addressLines.join(', '), rightCardX + 12, currentY + 26, {
          width: cardWidth - 24,
          height: 38,
          lineGap: 2,
        });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#09090B')
        .text('Destination:', rightCardX + 12, currentY + 70);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#1E293B')
        .text(cityStatePin, rightCardX + 68, currentY + 70, { width: cardWidth - 78 });

      currentY += cardHeight + 16;

      // ==========================================
      // 3. ORDER ITEMS TABLE
      // ==========================================
      const tableHeaders = [
        { label: '#', x: margin + 6, width: 20, align: 'center' },
        { label: 'ITEM DESCRIPTION', x: margin + 28, width: 175, align: 'left' },
        { label: 'SKU', x: margin + 205, width: 68, align: 'left' },
        { label: 'SIZE/COLOR', x: margin + 275, width: 65, align: 'center' },
        { label: 'QTY', x: margin + 342, width: 28, align: 'center' },
        { label: 'MRP', x: margin + 372, width: 45, align: 'right' },
        { label: 'UNIT PRICE', x: margin + 419, width: 45, align: 'right' },
        { label: 'TOTAL', x: margin + 466, width: 44, align: 'right' },
      ];

      // Table Header Background
      const tableHeaderHeight = 22;
      doc
        .rect(margin, currentY, contentWidth, tableHeaderHeight)
        .fill('#09090B');

      tableHeaders.forEach((h) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#FFFFFF')
          .text(h.label, h.x, currentY + 6, {
            width: h.width,
            align: h.align as any,
          });
      });

      currentY += tableHeaderHeight;

      // Table Item Rows
      const rowHeight = 26;
      order.items.forEach((item, idx) => {
        const isZebra = idx % 2 === 1;
        const rowBg = isZebra ? '#F8FAFC' : '#FFFFFF';

        doc
          .rect(margin, currentY, contentWidth, rowHeight)
          .fillAndStroke(rowBg, '#F1F5F9');

        // Column values
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#64748B')
          .text(String(idx + 1), tableHeaders[0].x, currentY + 8, {
            width: tableHeaders[0].width,
            align: 'center',
          });

        const isFree = item.unitPrice === 0 || item.productName.startsWith('[FREE]');
        const cleanName = item.productName.replace(/^\[FREE\]\s*/, '');

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#09090B')
          .text(cleanName, tableHeaders[1].x, currentY + 5, {
            width: tableHeaders[1].width,
            height: 10,
            ellipsis: true,
          });

        if (isFree) {
          doc
            .font('Helvetica-Bold')
            .fontSize(6.5)
            .fillColor('#16A34A')
            .text('PROMOTIONAL FREE ITEM', tableHeaders[1].x, currentY + 16);
        }

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#64748B')
          .text(item.sku || 'TSH-ADR', tableHeaders[2].x, currentY + 8, {
            width: tableHeaders[2].width,
            ellipsis: true,
          });

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(`${item.size} / ${item.color}`, tableHeaders[3].x, currentY + 8, {
            width: tableHeaders[3].width,
            align: 'center',
          });

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#09090B')
          .text(String(item.quantity), tableHeaders[4].x, currentY + 8, {
            width: tableHeaders[4].width,
            align: 'center',
          });

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#94A3B8')
          .text(formatCurrency(item.mrp), tableHeaders[5].x, currentY + 8, {
            width: tableHeaders[5].width,
            align: 'right',
          });

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(isFree ? 'FREE' : formatCurrency(item.unitPrice), tableHeaders[6].x, currentY + 8, {
            width: tableHeaders[6].width,
            align: 'right',
          });

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(isFree ? '#16A34A' : '#09090B')
          .text(isFree ? 'FREE' : formatCurrency(item.totalPrice), tableHeaders[7].x, currentY + 8, {
            width: tableHeaders[7].width,
            align: 'right',
          });

        currentY += rowHeight;
      });

      currentY += 14;

      // ==========================================
      // 4. SUMMARY & PAYMENT BOXES (Side by Side)
      // ==========================================
      const summaryBoxWidth = 230;
      const summaryBoxX = pageWidth - margin - summaryBoxWidth;
      const paymentBoxWidth = contentWidth - summaryBoxWidth - 14;
      const paymentBoxX = margin;

      // Summary Card
      const summaryHeight = 120;
      doc
        .rect(summaryBoxX, currentY, summaryBoxWidth, summaryHeight)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      let summaryTextY = currentY + 10;
      const lineSpacing = 16;

      // Subtotal
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#475569')
        .text('Item Subtotal:', summaryBoxX + 12, summaryTextY);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#09090B')
        .text(formatCurrency(order.subtotal), summaryBoxX + 100, summaryTextY, {
          width: summaryBoxWidth - 112,
          align: 'right',
        });
      summaryTextY += lineSpacing;

      // Shipping
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#475569')
        .text('Shipping Charge:', summaryBoxX + 12, summaryTextY);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(order.shippingCharge === 0 ? '#16A34A' : '#09090B')
        .text(order.shippingCharge === 0 ? 'FREE' : formatCurrency(order.shippingCharge), summaryBoxX + 100, summaryTextY, {
          width: summaryBoxWidth - 112,
          align: 'right',
        });
      summaryTextY += lineSpacing;

      // COD Handling Fee (ONLY if COD or codCharge > 0)
      if (isCod || order.codCharge > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#B91C1C')
          .text('COD Handling Fee:', summaryBoxX + 12, summaryTextY);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#B91C1C')
          .text(formatCurrency(order.codCharge || 99), summaryBoxX + 100, summaryTextY, {
            width: summaryBoxWidth - 112,
            align: 'right',
          });
        summaryTextY += lineSpacing;
      }

      // Discount
      if (order.discount > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#16A34A')
          .text(`Discount (${order.couponCode || 'Promo'}):`, summaryBoxX + 12, summaryTextY);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#16A34A')
          .text(`- ${formatCurrency(order.discount)}`, summaryBoxX + 100, summaryTextY, {
            width: summaryBoxWidth - 112,
            align: 'right',
          });
        summaryTextY += lineSpacing;
      }

      // Total Amount Row (Bold Divider)
      doc
        .strokeColor('#09090B')
        .lineWidth(1.5)
        .moveTo(summaryBoxX + 10, summaryTextY + 2)
        .lineTo(summaryBoxX + summaryBoxWidth - 10, summaryTextY + 2)
        .stroke();

      summaryTextY += 8;

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#09090B')
        .text('Total Payable:', summaryBoxX + 12, summaryTextY);
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#09090B')
        .text(formatCurrency(order.total), summaryBoxX + 100, summaryTextY, {
          width: summaryBoxWidth - 112,
          align: 'right',
        });

      // Left Box: Payment & Dispatch Information
      doc
        .rect(paymentBoxX, currentY, paymentBoxWidth, summaryHeight)
        .fillAndStroke(isPaid ? '#F0FDF4' : '#FEF2F2', isPaid ? '#BBF7D0' : '#FECACA');

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(isPaid ? '#166534' : '#991B1B')
        .text('PAYMENT & TRANSACTION DETAILS', paymentBoxX + 12, currentY + 12);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#09090B')
        .text('Payment Method:', paymentBoxX + 12, currentY + 30);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#1E293B')
        .text(isCod ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)', paymentBoxX + 100, currentY + 30);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#09090B')
        .text('Payment Status:', paymentBoxX + 12, currentY + 46);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(isPaid ? '#166534' : '#DC2626')
        .text(order.paymentStatus, paymentBoxX + 100, currentY + 46);

      if (order.razorpayPaymentId) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#09090B')
          .text('Payment Ref ID:', paymentBoxX + 12, currentY + 62);
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#475569')
          .text(order.razorpayPaymentId, paymentBoxX + 100, currentY + 62);
      }

      // Notice line at bottom of payment card
      const codPaidOnline = 99;
      const codRemaining = Math.max(0, order.total - codPaidOnline);
      const instructionText = isPaid
        ? 'Payment has been successfully received and verified.'
        : isCod
        ? `Collect remaining ${formatCurrency(codRemaining)} on delivery (${formatCurrency(codPaidOnline)} confirmation paid online).`
        : 'Payment is awaiting gateway confirmation.';

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(isPaid ? '#166534' : '#B91C1C')
        .text(instructionText, paymentBoxX + 12, currentY + 84, {
          width: paymentBoxWidth - 24,
        });

      currentY += summaryHeight + 24;

      // ==========================================
      // 5. PROFESSIONAL FOOTER
      // ==========================================
      doc
        .strokeColor('#E4E4E7')
        .lineWidth(0.75)
        .moveTo(margin, currentY)
        .lineTo(pageWidth - margin, currentY)
        .stroke();

      currentY += 10;

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#71717A')
        .text(
          'Thank you for shopping with AD(R)IZO Luxury Apparel. This is a computer-generated tax invoice and requires no physical signature.',
          margin,
          currentY,
          { align: 'center', width: contentWidth }
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#09090B')
        .text('Need help with your order or returns? Email care.adrizo@gmail.com or visit www.adrizo.com', margin, currentY + 12, {
          align: 'center',
          width: contentWidth,
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
