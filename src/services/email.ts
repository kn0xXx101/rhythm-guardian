import { supabase } from '@/lib/supabase';
import { emailTemplates } from '@/lib/email-templates';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  type: 'payment' | 'payout' | 'booking' | 'confirmation' | 'reminder';
}

export const emailService = {
  async sendEmail({ to, subject, html, type }: SendEmailParams) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, html, type },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }
  },

  async sendPaymentReceivedEmail(params: {
    hirerEmail: string;
    hirerName: string;
    musicianName: string;
    amount: number;
    eventType: string;
    eventDate: string;
    bookingId: string;
  }) {
    const template = emailTemplates.paymentReceived({
      hirerName: params.hirerName,
      musicianName: params.musicianName,
      amount: params.amount,
      eventType: params.eventType,
      eventDate: params.eventDate,
      bookingId: params.bookingId,
    });

    return this.sendEmail({
      to: params.hirerEmail,
      subject: template.subject,
      html: template.html,
      type: 'payment',
    });
  },

  async sendPayoutInitiatedEmail(params: {
    musicianEmail: string;
    musicianName: string;
    amount: number;
    eventType: string;
    hirerName: string;
    accountNumber: string;
    transferReference: string;
  }) {
    const template = emailTemplates.payoutInitiated({
      musicianName: params.musicianName,
      amount: params.amount,
      eventType: params.eventType,
      hirerName: params.hirerName,
      accountNumber: params.accountNumber,
      transferReference: params.transferReference,
    });

    return this.sendEmail({
      to: params.musicianEmail,
      subject: template.subject,
      html: template.html,
      type: 'payout',
    });
  },

  async sendServiceConfirmationReminder(params: {
    userEmail: string;
    userName: string;
    userRole: 'hirer' | 'musician';
    eventType: string;
    eventDate: string;
    otherPartyName: string;
    bookingId: string;
  }) {
    const template = emailTemplates.serviceConfirmationReminder({
      userName: params.userName,
      userRole: params.userRole,
      eventType: params.eventType,
      eventDate: params.eventDate,
      otherPartyName: params.otherPartyName,
      bookingId: params.bookingId,
    });

    return this.sendEmail({
      to: params.userEmail,
      subject: template.subject,
      html: template.html,
      type: 'reminder',
    });
  },

  async sendBookingConfirmationEmail(params: {
    hirerEmail: string;
    hirerName: string;
    musicianName: string;
    eventType: string;
    eventDate: string;
    location: string;
    amount: number;
    bookingId: string;
  }) {
    const template = emailTemplates.bookingConfirmation({
      hirerName: params.hirerName,
      musicianName: params.musicianName,
      eventType: params.eventType,
      eventDate: params.eventDate,
      location: params.location,
      amount: params.amount,
      bookingId: params.bookingId,
    });

    return this.sendEmail({
      to: params.hirerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking',
    });
  },
};
