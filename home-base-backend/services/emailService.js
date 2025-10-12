const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Check if email is configured
        this.isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
        
        if (this.isConfigured) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                // Better error handling
                logger: true,
                debug: true // include SMTP traffic in the logs
            });
        } else {
            console.warn('⚠️ Email service not configured - SMTP_USER and SMTP_PASS required');
        }
    }

    async sendReceiptEmail(userEmail, paymentData, pdfBuffer) {
        // Check if email is configured
        if (!this.isConfigured) {
            throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
        }

        try {
            const mailOptions = {
                from: `"Home Base" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: userEmail,
                subject: `Your Payment Receipt - ${paymentData.receiptId}`,
                html: this.generateReceiptEmailHTML(paymentData),
                attachments: [
                    {
                        filename: `receipt-${paymentData.payment.paymentReference}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ],
                // Add headers for better email client compatibility
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'high'
                }
            };

            console.log('Attempting to send email to:', userEmail);
            const result = await this.transporter.sendMail(mailOptions);
            
            console.log('✅ Receipt email sent successfully:', {
                messageId: result.messageId,
                to: userEmail,
                receiptId: paymentData.receiptId
            });
            
            return result;
        } catch (error) {
            console.error('❌ Error sending receipt email:', {
                error: error.message,
                to: userEmail,
                receiptId: paymentData.receiptId
            });
            
            // Provide more helpful error messages
            if (error.code === 'EAUTH') {
                throw new Error('Email authentication failed. Check your SMTP credentials and app password.');
            } else if (error.code === 'ECONNECTION') {
                throw new Error('Cannot connect to email server. Check your SMTP host and port.');
            } else {
                throw error;
            }
        }
    }

    // Test email configuration
    async testEmailConfig() {
        if (!this.isConfigured) {
            console.log('❌ Email not configured - missing SMTP_USER or SMTP_PASS');
            return false;
        }

        try {
            await this.transporter.verify();
            console.log('✅ Email server is ready to take our messages');
            return true;
        } catch (error) {
            console.error('❌ Email server configuration error:', error.message);
            
            // Detailed error analysis
            if (error.code === 'EAUTH') {
                console.log('💡 Tip: For Gmail, make sure:');
                console.log('   1. 2-factor authentication is enabled');
                console.log('   2. You\'re using an App Password, not your regular password');
                console.log('   3. The App Password is for "Mail"');
            } else if (error.code === 'ECONNECTION') {
                console.log('💡 Tip: Check your SMTP host and port settings');
            }
            
            return false;
        }
    }

    generateReceiptEmailHTML(paymentData) {
        const { payment, company } = paymentData;
        const amount = this.formatCurrency(payment.amount, payment.currency);
        const date = new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background: #f4f4f4;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
        }
        .header { 
            background: linear-gradient(135deg, #2c5aa0, #1e3a8a); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
        }
        .content { 
            padding: 30px; 
        }
        .receipt-details { 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 10px; 
            margin: 25px 0; 
            border-left: 4px solid #2c5aa0;
        }
        .footer { 
            text-align: center; 
            padding: 25px; 
            color: #666; 
            font-size: 12px; 
            background: #f8f9fa;
            border-top: 1px solid #ddd;
        }
        .amount { 
            font-size: 24px; 
            color: #2c5aa0; 
            font-weight: bold; 
        }
        .btn { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #2c5aa0; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold;
            margin: 10px 5px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
        }
        .info-label {
            font-weight: bold;
            color: #555;
        }
        .info-value {
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>HOME BASE</h1>
            <p>Accommodation Booking Platform</p>
        </div>
        
        <div class="content">
            <h2>Payment Confirmation ✅</h2>
            <p>Dear Valued Customer,</p>
            <p>Thank you for your payment! Your transaction has been completed successfully and your booking is confirmed.</p>
            
            <div class="receipt-details">
                <h3 style="margin-top: 0; color: #2c5aa0;">Payment Receipt</h3>
                
                <div class="info-row">
                    <span class="info-label">Receipt Number:</span>
                    <span class="info-value">${paymentData.receiptId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date Paid:</span>
                    <span class="info-value">${date}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Amount Paid:</span>
                    <span class="amount">${amount}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Service:</span>
                    <span class="info-value">${payment.listingId?.name || 'Accommodation Booking'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Reference ID:</span>
                    <span class="info-value">${payment.paymentReference}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                    <span class="info-label">Status:</span>
                    <span class="info-value" style="color: #28a745; font-weight: bold;">COMPLETED</span>
                </div>
            </div>
            
            <p>Your detailed receipt is attached to this email as a PDF document. Please keep it for your records.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/payment-history" class="btn">View Payment History</a>
                <a href="${process.env.FRONTEND_URL}/bookings" class="btn" style="background: #28a745;">View My Bookings</a>
            </div>
            
            <p>If you have any questions about your booking or this receipt, please don't hesitate to contact our support team.</p>
        </div>
        
        <div class="footer">
            <p><strong>Home Base Support</strong></p>
            <p>📧 ${company.email} | 📞 ${company.phone}</p>
            <p>📍 ${company.address}</p>
            <p style="margin-top: 20px; color: #999;">
                &copy; ${new Date().getFullYear()} Home Base. All rights reserved.<br>
                This is an automated message, please do not reply directly to this email.
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    formatCurrency(amount, currency = 'NGN') {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    }
}

module.exports = EmailService;
