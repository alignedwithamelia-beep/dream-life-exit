import { supabase } from './supabase';

// Local prototype: uploaded files live only for this browser visit.
const sessionFiles = new Map<string, string>();

export const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_BYTES = 10 * 1024 * 1024;

export function checkFile(f: File): string | null {
  if (!ALLOWED.includes(f.type)) return 'Please choose a PDF, JPG or PNG file.';
  if (f.size > MAX_BYTES) return 'That file is over 10 MB.';
  return null;
}

export const fileType = (f: File) => (f.type === 'application/pdf' ? 'PDF' : f.type === 'image/png' ? 'PNG' : 'JPG');

/** Stores a file. Returns the storage path when saved to the private bucket. */
export async function storeFile(docId: string, f: File, userId?: string): Promise<string | undefined> {
  if (supabase && userId) {
    const path = `${userId}/${docId}-${f.name.replace(/[^\w.-]+/g, '_')}`;
    const { error } = await supabase.storage.from('vault').upload(path, f, { contentType: f.type });
    if (error) throw error;
    return path;
  }
  sessionFiles.set(docId, URL.createObjectURL(f));
  return undefined;
}

export async function fileUrl(docId: string, path?: string, download?: string): Promise<string | null> {
  if (path && supabase) {
    const { data } = await supabase.storage.from('vault').createSignedUrl(path, 60, download ? { download } : undefined);
    return data?.signedUrl ?? null;
  }
  return sessionFiles.get(docId) ?? null;
}

export async function removeStoredFile(path: string) {
  if (supabase) await supabase.storage.from('vault').remove([path]);
}

export function forgetSessionFile(docId: string) {
  const url = sessionFiles.get(docId);
  if (url) URL.revokeObjectURL(url);
  sessionFiles.delete(docId);
}
