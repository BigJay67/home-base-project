const PDFDocument = require('pdfkit');

class PDFService {
    static generateReceipt(paymentData, template = 'standard') {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    margin: 50,
                    size: 'A4',
                    info: {
                        Title: `Receipt - ${paymentData.payment.paymentReference}`,
                        Author: 'Home Base',
                        Subject: 'Payment Receipt',
                        Creator: 'Home Base Booking System',
                        CreationDate: new Date()
                    }
                });
                
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                switch(template) {
                    case 'minimal':
                        this.addMinimalReceiptContent(doc, paymentData);
                        break;
                    case 'corporate':
                        this.addCorporateReceiptContent(doc, paymentData);
                        break;
                    case 'detailed':
                        this.addDetailedReceiptContent(doc, paymentData);
                        break;
                    default:
                        this.addStandardReceiptContent(doc, paymentData);
                }
                
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    static addStandardReceiptContent(doc, data) {
        const { payment, company } = data;
        
        doc.rect(0, 0, doc.page.width, 100)
           .fill('#f8f9fa');
        
        doc.fontSize(24).font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('HOME BASE', 50, 40, { align: 'center' });
        
        doc.fontSize(12).font('Helvetica')
           .fillColor('#666')
           .text('Accommodation Booking Platform', 50, 70, { align: 'center' });
        
        doc.fontSize(18).font('Helvetica-Bold')
           .fillColor('#000')
           .text('OFFICIAL RECEIPT', 50, 130, { align: 'center' });
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#666')
           .text(`Receipt #: ${data.receiptId}`, 50, 155, { align: 'center' });
        
        const paidDate = new Date(payment.paidAt || payment.createdAt);
        doc.fontSize(10)
           .text(`Date: ${paidDate.toLocaleDateString('en-NG')}`, 50, 180)
           .text(`Time: ${paidDate.toLocaleTimeString('en-NG')}`, 50, 195)
           .text(`Reference: ${payment.paymentReference}`, 300, 180, { align: 'right' })
           .text(`Status: ${payment.status.toUpperCase()}`, 300, 195, { align: 'right' });
        
        doc.fontSize(12).font('Helvetica-Bold')
           .text('BILL TO:', 50, 230);
        
        doc.fontSize(10).font('Helvetica')
           .text(payment.userEmail, 50, 250);
        
        if (payment.userId) {
            doc.text(`User ID: ${payment.userId}`, 50, 265);
        }
        
        doc.fontSize(12).font('Helvetica-Bold')
           .text('SERVICE DETAILS:', 50, 300);
        
        const tableTop = 320;
        doc.fontSize(10).font('Helvetica-Bold')
           .text('Description', 50, tableTop)
           .text('Amount', 450, tableTop, { align: 'right' });
        
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .lineWidth(1)
           .strokeColor('#ddd')
           .stroke();
        
        const itemTop = tableTop + 25;
        doc.fontSize(10).font('Helvetica')
           .text(payment.listingId?.name || 'Accommodation Booking', 50, itemTop, {
               width: 350,
               align: 'left'
           });
        
        doc.text(this.formatCurrency(payment.amount, payment.currency), 450, itemTop, {
            align: 'right'
        });
        
        if (payment.listingId?.location) {
            doc.fontSize(8).fillColor('#666')
               .text(`Location: ${payment.listingId.location}`, 50, itemTop + 15);
        }
        
        if (payment.listingId?.type) {
            doc.fontSize(8).fillColor('#666')
               .text(`Type: ${payment.listingId.type}`, 50, itemTop + 30);
        }
        
        const totalTop = itemTop + 60;
        doc.moveTo(50, totalTop)
           .lineTo(550, totalTop)
           .lineWidth(2)
           .strokeColor('#2c5aa0')
           .stroke();
        
        doc.fontSize(14).font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('TOTAL PAID', 50, totalTop + 15)
           .text(this.formatCurrency(payment.amount, payment.currency), 450, totalTop + 15, {
               align: 'right'
           });
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#000')
           .text('Payment Method:', 50, totalTop + 45)
           .text(payment.paymentMethod?.toUpperCase() || 'CARD', 150, totalTop + 45);
        
        if (payment.receiptData?.channel) {
            doc.text('Channel:', 50, totalTop + 60)
               .text(payment.receiptData.channel.toUpperCase(), 150, totalTop + 60);
        }
        
        const footerTop = 700;
        doc.rect(0, footerTop, doc.page.width, doc.page.height - footerTop)
           .fill('#f8f9fa');
        
        doc.fontSize(9).font('Helvetica')
           .fillColor('#666')
           .text('Thank you for choosing Home Base!', 50, footerTop + 20, { align: 'center' })
           .text('This is an official receipt for your records.', 50, footerTop + 35, { align: 'center' })
           .text('Please keep this receipt for your accounting purposes.', 50, footerTop + 50, { align: 'center' });
        
        doc.fontSize(8)
           .text(`For inquiries: ${company.email} | ${company.phone}`, 50, footerTop + 70, { align: 'center' })
           .text(company.address, 50, footerTop + 82, { align: 'center' });
        
        doc.text(`Page 1 of 1`, 50, footerTop + 100, { align: 'center' });
    }

    static addMinimalReceiptContent(doc, data) {
        const { payment, company } = data;
        const paidDate = new Date(payment.paidAt || payment.createdAt);

        doc.fontSize(16).font('Helvetica-Bold')
           .text('HOME BASE', 50, 50)
           .fontSize(10)
           .text('Payment Receipt', 50, 70);

        doc.fontSize(9)
           .text(`Receipt: ${data.receiptId}`, 50, 100)
           .text(`Date: ${paidDate.toLocaleDateString()}`, 300, 100, { align: 'right' })
           .text(`Reference: ${payment.paymentReference}`, 50, 115)
           .text(`Amount: ${this.formatCurrency(payment.amount, payment.currency)}`, 300, 115, { align: 'right' });

        doc.moveTo(50, 140).lineTo(550, 140).stroke();
        
        doc.fontSize(10)
           .text('Service', 50, 150)
           .text('Amount', 450, 150, { align: 'right' });

        doc.moveTo(50, 165).lineTo(550, 165).stroke();

        doc.text(payment.listingId?.name || 'Accommodation Booking', 50, 175, { width: 350 })
           .text(this.formatCurrency(payment.amount, payment.currency), 450, 175, { align: 'right' });

        doc.moveTo(50, 220).lineTo(550, 220).stroke();
        doc.fontSize(12).font('Helvetica-Bold')
           .text('TOTAL', 50, 230)
           .text(this.formatCurrency(payment.amount, payment.currency), 450, 230, { align: 'right' });

        doc.fontSize(8)
           .text('Thank you for your business!', 50, 280, { align: 'center' });
    }

    static addCorporateReceiptContent(doc, data) {
        const { payment, company } = data;
        const paidDate = new Date(payment.paidAt || payment.createdAt);

        doc.rect(0, 0, doc.page.width, 120)
           .fill('#1e3a8a');
        
        doc.fontSize(28).font('Helvetica-Bold')
           .fillColor('white')
           .text('HOME BASE', 50, 50, { align: 'center' })
           .fontSize(12)
           .text('CORPORATE RECEIPT', 50, 85, { align: 'center' });

        doc.fillColor('black')
           .fontSize(8)
           .text(company.address, 50, 140, { align: 'center' })
           .text(`${company.phone} | ${company.email}`, 50, 152, { align: 'center' });

        const infoTop = 180;
        doc.fontSize(9)
           .text('BILL TO:', 50, infoTop)
           .text(payment.userEmail, 50, infoTop + 15)
           .text(`User ID: ${payment.userId}`, 50, infoTop + 30)

           .text('RECEIPT DETAILS:', 300, infoTop)
           .text(`Number: ${data.receiptId}`, 300, infoTop + 15)
           .text(`Date: ${paidDate.toLocaleDateString()}`, 300, infoTop + 30)
           .text(`Time: ${paidDate.toLocaleTimeString()}`, 300, infoTop + 45);

        const tableTop = 250;
        this.addCorporateTable(doc, payment, tableTop);

        doc.fontSize(7)
           .text('TERMS & CONDITIONS: Payment is due upon receipt. Late payments may be subject to fees.', 50, 500, { align: 'center' })
           .text('This is an official tax invoice.', 50, 510, { align: 'center' });

        doc.moveTo(400, 550).lineTo(550, 550).stroke();
        doc.text('Authorized Signature', 400, 555, { align: 'center' });
    }

    static addCorporateTable(doc, payment, startY) {
        doc.rect(50, startY, 500, 20).fill('#e5e7eb');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('black')
           .text('Description', 60, startY + 7)
           .text('Quantity', 350, startY + 7)
           .text('Unit Price', 420, startY + 7)
           .text('Amount', 490, startY + 7, { align: 'right' });

        doc.rect(50, startY + 20, 500, 25).fill('#f8f9fa');
        doc.fontSize(9).font('Helvetica')
           .text(payment.listingId?.name || 'Accommodation Booking', 60, startY + 28, { width: 250 })
           .text('1', 350, startY + 28)
           .text(this.formatCurrency(payment.amount, payment.currency), 420, startY + 28)
           .text(this.formatCurrency(payment.amount, payment.currency), 490, startY + 28, { align: 'right' });

        if (payment.listingId?.location) {
            doc.fontSize(7).fillColor('#666')
               .text(`Location: ${payment.listingId.location}`, 60, startY + 40);
        }

        const totalY = startY + 60;
        doc.rect(50, totalY, 500, 25).fill('#1e3a8a');
        doc.fontSize(11).font('Helvetica-Bold').fillColor('white')
           .text('TOTAL DUE', 60, totalY + 8)
           .text(this.formatCurrency(payment.amount, payment.currency), 490, totalY + 8, { align: 'right' });
    }

    static addDetailedReceiptContent(doc, data) {
        const { payment, company } = data;
        const paidDate = new Date(payment.paidAt || payment.createdAt);

        doc.fontSize(20).font('Helvetica-Bold')
           .text('DETAILED PAYMENT RECEIPT', 50, 50, { align: 'center' });

        this.addCustomerSection(doc, payment, 90);
        this.addPaymentDetailsSection(doc, payment, data.receiptId, paidDate, 160);
        this.addServiceBreakdownSection(doc, payment, 240);
        this.addTaxSection(doc, payment, 350);
        this.addFooterSection(doc, company, 450);
    }

    static addCustomerSection(doc, payment, startY) {
        doc.fontSize(10).font('Helvetica-Bold')
           .text('CUSTOMER INFORMATION', 50, startY)
           .font('Helvetica')
           .text(`Email: ${payment.userEmail}`, 50, startY + 15)
           .text(`Customer ID: ${payment.userId}`, 50, startY + 30)
           .text(`Payment Method: ${payment.paymentMethod || 'Card'}`, 50, startY + 45);
    }

    static addPaymentDetailsSection(doc, payment, receiptId, paidDate, startY) {
        doc.fontSize(10).font('Helvetica-Bold')
           .text('PAYMENT DETAILS', 50, startY)
           .font('Helvetica')
           .text(`Receipt Number: ${receiptId}`, 50, startY + 15)
           .text(`Transaction Date: ${paidDate.toLocaleDateString()}`, 50, startY + 30)
           .text(`Transaction Time: ${paidDate.toLocaleTimeString()}`, 50, startY + 45)
           .text(`Reference: ${payment.paymentReference}`, 50, startY + 60)
           .text(`Status: ${payment.status.toUpperCase()}`, 50, startY + 75);

        if (payment.receiptData) {
            doc.text(`Channel: ${payment.receiptData.channel || 'N/A'}`, 300, startY + 15)
               .text(`Gateway: ${payment.receiptData.gatewayResponse || 'N/A'}`, 300, startY + 30);
        }
    }

    static addServiceBreakdownSection(doc, payment, startY) {
        doc.fontSize(10).font('Helvetica-Bold')
           .text('SERVICE BREAKDOWN', 50, startY);

        const breakdown = [
            { description: 'Accommodation Booking', amount: payment.amount * 0.8 },
            { description: 'Service Fee', amount: payment.amount * 0.15 },
            { description: 'Platform Fee', amount: payment.amount * 0.05 }
        ];

        let currentY = startY + 20;
        breakdown.forEach(item => {
            doc.font('Helvetica')
               .text(item.description, 50, currentY, { width: 350 })
               .text(this.formatCurrency(item.amount, payment.currency), 450, currentY, { align: 'right' });
            currentY += 15;
        });

        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        currentY += 10;

        doc.font('Helvetica-Bold')
           .text('SUBTOTAL', 50, currentY)
           .text(this.formatCurrency(payment.amount, payment.currency), 450, currentY, { align: 'right' });
    }

    static addTaxSection(doc, payment, startY) {
        doc.fontSize(10).font('Helvetica-Bold')
           .text('TAX INFORMATION', 50, startY)
           .font('Helvetica')
           .text('VAT: Included in total amount', 50, startY + 15)
           .text('Tax Identification: N/A', 50, startY + 30);
    }

    static addFooterSection(doc, company, startY) {
        doc.fontSize(8)
           .text('Thank you for your business!', 50, startY, { align: 'center' })
           .text(`For inquiries: ${company.email} | ${company.phone}`, 50, startY + 12, { align: 'center' })
           .text(company.address, 50, startY + 24, { align: 'center' })
           .text('This receipt is computer generated and does not require a physical signature.', 50, startY + 40, { align: 'center' });
    }

    static getTemplateForPayment(payment) {
        if (payment.amount > 100000) return 'corporate';
        if (payment.amount < 10000) return 'minimal';
        return 'standard';
    }

    static formatCurrency(amount, currency = 'NGN') {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    }

    static generateReceiptForEmail(paymentData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    margin: 30,
                    size: 'A4'
                });
                
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                this.addEmailReceiptContent(doc, paymentData);
                
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    static addEmailReceiptContent(doc, data) {
        const { payment, company } = data;
        
        doc.fontSize(20).font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('HOME BASE', 50, 50, { align: 'center' });
        
        doc.fontSize(14).font('Helvetica-Bold')
           .fillColor('#000')
           .text('PAYMENT RECEIPT', 50, 80, { align: 'center' });
        
        doc.fontSize(10)
           .text(`Receipt #: ${data.receiptId}`, 50, 120)
           .text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}`, 50, 135)
           .text(`Amount: ${this.formatCurrency(payment.amount, payment.currency)}`, 50, 150);
        
        doc.text(`Service: ${payment.listingId?.name || 'Accommodation Booking'}`, 50, 170);
        
        if (payment.listingId?.location) {
            doc.text(`Location: ${payment.listingId.location}`, 50, 185);
        }
        
        doc.text('Thank you for your business!', 50, 220, { align: 'center' });
    }
}

module.exports = PDFService;