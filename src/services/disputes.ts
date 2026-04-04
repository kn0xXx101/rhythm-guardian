import { supabase } from '@/lib/supabase';
import { Dispute, DisputeMessage, DisputeEvidence } from '@/types/features';

export const disputesService = {
  async createDispute(dispute: Omit<Dispute, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('disputes').insert(dispute).select().single();

    if (error) throw error;
    return data;
  },

  async getDispute(id: string) {
    const { data, error } = await supabase
      .from('disputes')
      .select('*, bookings(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getUserDisputes(userId: string) {
    const { data, error } = await supabase
      .from('disputes')
      .select('*, bookings(*)')
      .or(`filed_by.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateDisputeStatus(id: string, status: string, resolution?: string) {
    const updates: any = { status };
    if (resolution) {
      updates.resolution = resolution;
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('disputes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async sendDisputeMessage(message: Omit<DisputeMessage, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('dispute_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDisputeMessages(disputeId: string) {
    const { data, error } = await supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async uploadEvidence(evidence: Omit<DisputeEvidence, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('dispute_evidence')
      .insert(evidence)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDisputeEvidence(disputeId: string) {
    const { data, error } = await supabase
      .from('dispute_evidence')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  subscribeToDisputeMessages(disputeId: string, callback: (message: DisputeMessage) => void) {
    const channel = supabase
      .channel(`dispute_messages:${disputeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${disputeId}`,
        },
        (payload) => {
          callback(payload.new as DisputeMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
