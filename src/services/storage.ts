import { supabase } from '@/lib/supabase';

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

export const storageService = {
  async uploadDocument(file: File, userId: string, documentType: string) {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new Error('File is too large. Maximum size is 10MB.');
    }

    if (
      !file.type.startsWith('image/') &&
      !ALLOWED_DOCUMENT_TYPES.includes(file.type)
    ) {
      throw new Error('Invalid file type. Only images and PDF files are allowed.');
    }

    const fileExt = file.name.split('.').pop();
    const safeType = documentType || 'document';
    const fileName = `${userId}/${safeType}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return {
      path: data.path,
    };
  },

  async deleteDocument(path: string) {
    if (!path) return;

    const { error } = await supabase.storage.from('documents').remove([path]);

    if (error) {
      throw error;
    }
  },
};

