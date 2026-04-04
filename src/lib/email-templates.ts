import { formatGHSWithSymbol } from './currency';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export const emailTemplates = {
  paymentReceived: (data: {
    hirerName: string;
    musicianName: string;
    amount: number;
    eventType: string;
    eventDate: string;
    bookingId: string;
  }): EmailTemplate => ({
    subject: `Payment Received - ${data.eventType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 32px; font-weight: bold; color: #8B5CF6; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .button { background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Payment Received!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.hirerName},</p>
              <p>Great news! Your payment has been successfully received and processed.</p>
              
              <div class="amount">${formatGHSWithSymbol(data.amount)}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span><strong>Musician:</strong></span>
                  <span>${data.musicianName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Event:</strong></span>
                  <span>${data.eventType}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date:</strong></span>
                  <span>${data.eventDate}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Booking ID:</strong></span>
                  <span>${data.bookingId}</span>
                </div>
              </div>
              
              <p>Your funds are now held securely in escrow and will be released to the musician after the service is completed and confirmed by both parties.</p>
              
              <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/hirer/bookings" class="button">View Booking</a>
              
              <p>Thank you for using Rhythm Guardian!</p>
            </div>
            <div class="footer">
              <p>© 2026 Rhythm Guardian. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  payoutInitiated: (data: {
    musicianName: string;
    amount: number;
    eventType: string;
    hirerName: string;
    accountNumber: string;
    transferReference: string;
  }): EmailTemplate => ({
    subject: `Payout Initiated - ${formatGHSWithSymbol(data.amount)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 32px; font-weight: bold; color: #10B981; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .alert { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .button { background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Payout Initiated!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.musicianName},</p>
              <p>Excellent news! Your payment has been initiated and is being transferred to your account.</p>
              
              <div class="amount">${formatGHSWithSymbol(data.amount)}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span><strong>Event:</strong></span>
                  <span>${data.eventType}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Client:</strong></span>
                  <span>${data.hirerName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Account:</strong></span>
                  <span>****${data.accountNumber.slice(-4)}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Reference:</strong></span>
                  <span>${data.transferReference}</span>
                </div>
              </div>
              
              <div class="alert">
                <strong>⏱️ Expected Arrival:</strong> Your payment should arrive within 24 hours. Bank transfers may take 1-2 business days.
              </div>
              
              <p>You'll receive another email once the payment is completed.</p>
              
              <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/musician/payouts" class="button">View Payout History</a>
              
              <p>Thank you for being part of Rhythm Guardian!</p>
            </div>
            <div class="footer">
              <p>© 2026 Rhythm Guardian. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  serviceConfirmationReminder: (data: {
    userName: string;
    userRole: 'hirer' | 'musician';
    eventType: string;
    eventDate: string;
    otherPartyName: string;
    bookingId: string;
  }): EmailTemplate => ({
    subject: `Reminder: Confirm Service Completion - ${data.eventType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Service Confirmation Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>This is a friendly reminder to confirm the completion of your recent booking.</p>
              
              <div class="details">
                <p><strong>Event:</strong> ${data.eventType}</p>
                <p><strong>Date:</strong> ${data.eventDate}</p>
                <p><strong>${data.userRole === 'hirer' ? 'Musician' : 'Client'}:</strong> ${data.otherPartyName}</p>
              </div>
              
              <p>Please confirm that the service was ${data.userRole === 'hirer' ? 'successfully rendered' : 'completed as agreed'}. This helps us release payment ${data.userRole === 'hirer' ? 'to the musician' : 'faster'}.</p>
              
              <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/${data.userRole}/bookings" class="button">Confirm Service</a>
              
              <p>If there were any issues, please contact support before confirming.</p>
            </div>
            <div class="footer">
              <p>© 2026 Rhythm Guardian. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  bookingConfirmation: (data: {
    hirerName: string;
    musicianName: string;
    eventType: string;
    eventDate: string;
    location: string;
    amount: number;
    bookingId: string;
  }): EmailTemplate => ({
    subject: `Booking Confirmed - ${data.eventType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .button { background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.hirerName},</p>
              <p>Your booking has been confirmed! Here are the details:</p>
              
              <div class="details">
                <div class="detail-row">
                  <span><strong>Musician:</strong></span>
                  <span>${data.musicianName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Event:</strong></span>
                  <span>${data.eventType}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date:</strong></span>
                  <span>${data.eventDate}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Location:</strong></span>
                  <span>${data.location}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Amount:</strong></span>
                  <span>${formatGHSWithSymbol(data.amount)}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Booking ID:</strong></span>
                  <span>${data.bookingId}</span>
                </div>
              </div>
              
              <p>The musician has been notified and will prepare for your event.</p>
              
              <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/hirer/bookings" class="button">View Booking</a>
              
              <p>We'll send you reminders as the event date approaches.</p>
            </div>
            <div class="footer">
              <p>© 2026 Rhythm Guardian. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};
