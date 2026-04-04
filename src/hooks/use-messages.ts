import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/services/message';
import { queryKeys } from '@/lib/query-keys';
import type { Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

/**
 * React Query hook for fetching messages in a conversation
 */
export function useMessages(contactId: string | number | null) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.messages.list(contactId ? String(contactId) : undefined),
    queryFn: () => {
      if (!contactId || !userId) return [];
      return messageService.getMessages(contactId, userId);
    },
    enabled: !!contactId && !!userId,
    staleTime: 1000 * 30, // 30 seconds - messages change frequently
  });
}

/**
 * React Query hook for fetching all conversations
 */
export function useConversations() {
  const auth = useAuth();
  const userId = auth?.user?.id;

  return useQuery({
    queryKey: queryKeys.messages.conversations(),
    queryFn: () => {
      if (!userId) return [];
      return messageService.getConversations(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute - conversations change less frequently
  });
}

/**
 * React Query hook for sending a message with optimistic update
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: ({
      contactId,
      text,
      replyTo,
    }: {
      contactId: string | number;
      text: string;
      replyTo?: string;
    }) => {
      if (!userId) throw new Error('User must be logged in');
      return messageService.sendMessage(contactId, text, userId, replyTo);
    },
    onMutate: async ({ contactId, text, replyTo }) => {
      if (!userId) return { previousMessages: undefined };

      // Cancel outgoing refetches
      const contactIdStr = String(contactId);
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.list(contactIdStr) });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<Message[]>(
        queryKeys.messages.list(contactIdStr)
      );

      // Optimistically update with a temporary message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: userId,
        receiverId: typeof contactId === 'string' ? contactId : String(contactId),
        text,
        timestamp: new Date().toISOString(),
        isSender: true,
        status: 'sending',
        replyTo: replyTo || undefined,
      };

      queryClient.setQueryData<Message[]>(queryKeys.messages.list(contactIdStr), (old = []) => [
        ...old,
        optimisticMessage,
      ]);

      // Also update conversations list
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.conversations() });
      const previousConversations = queryClient.getQueryData(queryKeys.messages.conversations());

      return { previousMessages, previousConversations, contactIdStr };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          queryKeys.messages.list(context.contactIdStr),
          context.previousMessages
        );
      }
      if (context?.previousConversations !== undefined) {
        queryClient.setQueryData(queryKeys.messages.conversations(), context.previousConversations);
      }
    },
    onSuccess: (data, variables) => {
      const contactIdStr = String(variables.contactId);

      // Replace optimistic message with real one
      queryClient.setQueryData<Message[]>(queryKeys.messages.list(contactIdStr), (old = []) => {
        // Remove temporary message and add real one
        const filtered = old.filter((m) => !m.id.startsWith('temp-'));
        return [...filtered, data];
      });

      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
    },
  });
}

/**
 * React Query hook for editing a message with optimistic update
 */
export function useEditMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: ({
      messageId,
      newContent,
    }: {
      messageId: string;
      newContent: string;
      contactId: string | number;
    }) => {
      if (!userId) throw new Error('User must be logged in');
      return messageService.editMessage(messageId, newContent, userId);
    },
    onMutate: async ({ messageId, newContent, contactId }) => {
      if (!userId) return { previousMessages: undefined };

      const contactIdStr = String(contactId);
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.list(contactIdStr) });

      const previousMessages = queryClient.getQueryData<Message[]>(
        queryKeys.messages.list(contactIdStr)
      );

      // Optimistically update
      queryClient.setQueryData<Message[]>(queryKeys.messages.list(contactIdStr), (old = []) =>
        old.map((msg) =>
          msg.id === messageId
            ? { ...msg, text: newContent, isEdited: true, editedAt: new Date().toISOString() }
            : msg
        )
      );

      return { previousMessages, contactIdStr };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          queryKeys.messages.list(context.contactIdStr),
          context.previousMessages
        );
      }
    },
    onSuccess: (_data, { contactId }) => {
      const contactIdStr = String(contactId);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(contactIdStr) });
    },
  });
}

/**
 * React Query hook for deleting a message with optimistic update
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: ({ messageId }: { messageId: string; contactId: string | number }) => {
      if (!userId) throw new Error('User must be logged in');
      return messageService.deleteMessage(messageId, userId);
    },
    onMutate: async ({ messageId, contactId }) => {
      if (!userId) return { previousMessages: undefined };

      const contactIdStr = String(contactId);
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.list(contactIdStr) });

      const previousMessages = queryClient.getQueryData<Message[]>(
        queryKeys.messages.list(contactIdStr)
      );

      // Optimistically mark as deleted (soft delete - keep in list)
      queryClient.setQueryData<Message[]>(queryKeys.messages.list(contactIdStr), (old = []) =>
        old.map((msg) =>
          msg.id === messageId ? { ...msg, isDeleted: true, text: 'This message was deleted' } : msg
        )
      );

      return { previousMessages, contactIdStr };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          queryKeys.messages.list(context.contactIdStr),
          context.previousMessages
        );
      }
    },
    onSuccess: (_data, { contactId }) => {
      const contactIdStr = String(contactId);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(contactIdStr) });
    },
  });
}

/**
 * React Query hook for marking messages as read
 */
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: ({
      messageIds,
    }: {
      messageIds: string[];
      contactId: string | number;
    }) => {
      if (!userId) throw new Error('User must be logged in');
      return messageService.markAsRead(messageIds, userId);
    },
    onMutate: async ({ messageIds, contactId }) => {
      if (!userId) return { previousMessages: undefined };

      const contactIdStr = String(contactId);
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.list(contactIdStr) });

      const previousMessages = queryClient.getQueryData<Message[]>(
        queryKeys.messages.list(contactIdStr)
      );

      // Optimistically mark as read
      queryClient.setQueryData<Message[]>(queryKeys.messages.list(contactIdStr), (old = []) =>
        old.map((msg) => (messageIds.includes(msg.id) ? { ...msg, status: 'read' as const } : msg))
      );

      return { previousMessages, contactIdStr };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          queryKeys.messages.list(context.contactIdStr),
          context.previousMessages
        );
      }
    },
    onSuccess: (_data, { contactId }) => {
      const contactIdStr = String(contactId);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(contactIdStr) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
    },
  });
}

/**
 * React Query hook for searching messages by content
 */
export function useSearchMessages(query: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['messages', 'search', query],
    queryFn: () => {
      if (!userId || !query.trim()) return [];
      return messageService.searchMessages(userId, query);
    },
    enabled: !!userId && query.trim().length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
}
