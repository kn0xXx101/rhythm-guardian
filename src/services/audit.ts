import { supabase } from '@/lib/supabase';

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

class AuditService {
  async logEvent(input: AuditLogInput): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const actorUserId = userData?.user?.id ?? null;
      const metadata = (userData?.user?.user_metadata || userData?.user?.app_metadata) as any;
      const actorRole = metadata?.role ?? null;

      const payload: any = {
        actor_user_id: actorUserId,
        actor_role: actorRole,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        ip_address: null,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      };

      const supabaseAny = supabase as any;
      const { error } = await supabaseAny.from('audit_logs').insert(payload);
      if (error) {
        // If table is missing or schema cache is stale, log to console but don't crash
        if (error.code === 'PGRST205' || error.message?.includes('audit_logs')) {
          console.warn('Audit logs table not found or schema cache stale. Event logged to console:', payload);
        } else {
          console.error('Failed to write audit log', error);
        }
      }
    } catch (error) {
      console.error('Failed to prepare audit log', error);
    }
  }

  async getLogs(params?: { limit?: number; search?: string; action?: string }): Promise<AuditLog[]> {
    const supabaseAny = supabase as any;
    let query = supabaseAny
      .from('audit_logs')
      .select(
        'id, actor_user_id, actor_role, action, entity_type, entity_id, description, metadata, ip_address, user_agent, created_at'
      )
      .order('created_at', { ascending: false });

    if (params?.action) {
      query = query.eq('action', params.action);
    }

    if (params?.search) {
      const term = `%${params.search}%`;
      query = query.or(
        `description.ilike.${term},entity_type.ilike.${term},action.ilike.${term}`
      );
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch audit logs', error);
      throw error;
    }

    return (data || []).map(
      (row: any): AuditLog => ({
        id: row.id,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        description: row.description,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      })
    );
  }
}

export const auditService = new AuditService();
