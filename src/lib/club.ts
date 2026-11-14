// Membership, library and community data.
// Signed in: Supabase (security rules decide what each person may read) + Stripe via Netlify functions.
// Demo / try-it: the example data in state.club, with joining simulated (no payment).
import { useCallback, useEffect, useRef, useState } from 'react';
import { uid } from './defaults';
import { useHub } from './store';
import { supabase } from './supabase';
import type { LibraryContent, LibraryItem, Membership, Post, PostComment, Reaction } from './types';

type Me = { id: string; name: string; role: 'client' | 'coach' };

/** Who is using the members' area right now. */
export function useMe(): Me {
  const { mode, account, view, state } = useHub();
  if (mode === 'remote' && account) return { id: account.id, name: (account.full_name ?? 'Member').split(' ')[0], role: account.role };
  return view === 'coach' ? { id: 'demo-coach', name: 'Coach', role: 'coach' } : { id: 'demo-me', name: state.profile.name || 'You', role: 'client' };
}

async function callFn(name: string, init?: { method?: string; body?: unknown }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(`/.netlify/functions/${name}`, { method: init?.method ?? 'GET', headers, body: init?.body ? JSON.stringify(init.body) : undefined });
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) throw new Error('The payment service isn’t running. Restart the app and try again.');
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Something went wrong.');
  return body;
}

/* ---------- Membership ---------- */

export function useMembership() {
  const { mode, account, state, set, toast, refreshAccount } = useHub();
  const me = useMe();
  const remote = mode === 'remote';
  const status: Membership = remote ? (account?.membership ?? 'none') : state.club.member ? 'active' : 'none';
  const isMember = me.role === 'coach' || status === 'active' || status === 'trialing';
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!remote) { setPrice('£29/month'); return; }
    callFn('membership').then((r) => setPrice(r.configured ? r.label : null)).catch(() => setPrice(null));
  }, [remote]);

  // Back from Stripe Checkout: the webhook may take a moment, so check a few times.
  useEffect(() => {
    if (!remote || !new URLSearchParams(location.search).has('joined')) return;
    toast('Thank you! Unlocking your membership…');
    let n = 0;
    const t = setInterval(async () => { n++; await refreshAccount(); if (n >= 6) clearInterval(t); }, 2500);
    history.replaceState(null, '', location.pathname);
    return () => clearInterval(t);
  }, [remote, refreshAccount, toast]);

  async function join() {
    if (!remote) { set((d) => { d.club.member = true; }); toast('Demo: you’re now a member. No payment was taken.'); return; }
    setBusy(true);
    try { const { url } = await callFn('membership', { method: 'POST', body: { action: 'checkout' } }); window.location.href = url; }
    catch (e) { toast((e as Error).message); setBusy(false); }
  }

  async function manage() {
    if (!remote) { set((d) => { d.club.member = false; }); toast('Demo: membership cancelled.'); return; }
    setBusy(true);
    try { const { url } = await callFn('membership', { method: 'POST', body: { action: 'portal' } }); window.location.href = url; }
    catch (e) { toast((e as Error).message); setBusy(false); }
  }

  return { status, isMember, price, busy, join, manage, renewsAt: remote ? account?.membership_renews_at ?? null : null, canManage: remote ? !!account?.stripe_customer_id : state.club.member };
}

/* ---------- Library ---------- */

export function useLibrary() {
  const { mode, state, set } = useHub();
  const remote = mode === 'remote';
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(remote);

  const reload = useCallback(async () => {
    if (!remote || !supabase) return;
    const { data } = await supabase.from('library_items').select('*').order('sort').order('created_at');
    setItems((data as LibraryItem[]) ?? []);
    setLoading(false);
  }, [remote]);
  useEffect(() => { reload(); }, [reload]);

  const list = remote ? items : state.club.library.map(({ content: _c, ...i }) => i).sort((a, b) => a.sort - b.sort);

  /** The content, or null when the security rules say this person can't open it. */
  async function getContent(id: string): Promise<LibraryContent | null> {
    if (remote && supabase) {
      const { data } = await supabase.from('library_content').select('*').eq('item_id', id).maybeSingle();
      return (data as LibraryContent) ?? null;
    }
    return state.club.library.find((x) => x.id === id)?.content ?? null;
  }

  async function fileLink(content: LibraryContent): Promise<string | null> {
    if (!content.file_path || !supabase) return null;
    const { data } = await supabase.storage.from('library').createSignedUrl(content.file_path, 120, { download: content.file_name ?? true });
    return data?.signedUrl ?? null;
  }

  async function save(item: LibraryItem, content: LibraryContent, file?: File | null) {
    const id = item.id || (remote ? crypto.randomUUID() : uid());
    if (remote && supabase) {
      let { file_path, file_name } = content;
      if (file) {
        if (file_path) await supabase.storage.from('library').remove([file_path]);
        file_path = `${id}/${file.name.replace(/[^\w.-]+/g, '_')}`;
        file_name = file.name;
        const up = await supabase.storage.from('library').upload(file_path, file, { contentType: file.type, upsert: true });
        if (up.error) throw up.error;
      }
      const { created_at: _c, ...row } = { ...item, id };
      const a = await supabase.from('library_items').upsert(row);
      if (a.error) throw a.error;
      const b = await supabase.from('library_content').upsert({ item_id: id, body: content.body, video_url: content.video_url, file_path, file_name });
      if (b.error) throw b.error;
      await reload();
      return;
    }
    set((d) => {
      const next = { ...item, id, content: { ...content, file_path: null, file_name: null } };
      const i = d.club.library.findIndex((x) => x.id === id);
      if (i >= 0) d.club.library[i] = next; else d.club.library.push(next);
    });
  }

  async function remove(id: string) {
    if (remote && supabase) {
      const { data } = await supabase.from('library_content').select('file_path').eq('item_id', id).maybeSingle();
      if (data?.file_path) await supabase.storage.from('library').remove([data.file_path]);
      await supabase.from('library_items').delete().eq('id', id);
      await reload();
      return;
    }
    set((d) => { d.club.library = d.club.library.filter((x) => x.id !== id); });
  }

  return { items: list, loading, getContent, fileLink, save, remove, remote };
}

/* ---------- Community ---------- */

export function useCommunity(enabled: boolean) {
  const { mode, state, set, toast } = useHub();
  const me = useMe();
  const remote = mode === 'remote';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(remote);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const reload = useCallback(async () => {
    if (!remote || !supabase || !enabled) { setLoading(false); return; }
    const [p, c, r] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('post_comments').select('*').order('created_at'),
      supabase.from('post_reactions').select('*'),
    ]);
    const comments = (c.data as PostComment[]) ?? [];
    const reactions = (r.data as Reaction[]) ?? [];
    setPosts(((p.data as Omit<Post, 'comments' | 'reactions'>[]) ?? []).map((x) => ({
      ...x, comments: comments.filter((k) => k.post_id === x.id), reactions: reactions.filter((k) => k.post_id === x.id),
    })));
    setLoading(false);
  }, [remote, enabled]);

  useEffect(() => { reload(); }, [reload]);

  // Live updates from other members.
  useEffect(() => {
    if (!remote || !supabase || !enabled) return;
    const again = () => { clearTimeout(timer.current); timer.current = setTimeout(reload, 300); };
    const ch = supabase.channel('community')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, again)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, again)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, again)
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [remote, enabled, reload]);

  const list = (remote ? posts : state.club.posts).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));
  const fail = (e: { message: string } | null) => { if (e) { toast('That didn’t go through. Please try again.'); return true; } return false; };

  async function addPost(body: string) {
    if (remote && supabase) { if (!fail((await supabase.from('posts').insert({ body })).error)) await reload(); return; }
    set((d) => { d.club.posts.unshift({ id: uid(), author_id: me.id, author_name: me.name, author_role: me.role, body, pinned: false, created_at: new Date().toISOString(), comments: [], reactions: [] }); });
  }
  async function deletePost(id: string) {
    if (remote && supabase) { if (!fail((await supabase.from('posts').delete().eq('id', id)).error)) await reload(); return; }
    set((d) => { d.club.posts = d.club.posts.filter((p) => p.id !== id); });
  }
  async function togglePin(post: Post) {
    if (remote && supabase) { if (!fail((await supabase.from('posts').update({ pinned: !post.pinned }).eq('id', post.id)).error)) await reload(); return; }
    set((d) => { const p = d.club.posts.find((x) => x.id === post.id); if (p) p.pinned = !p.pinned; });
  }
  async function addComment(postId: string, body: string) {
    if (remote && supabase) { if (!fail((await supabase.from('post_comments').insert({ post_id: postId, body })).error)) await reload(); return; }
    set((d) => { d.club.posts.find((p) => p.id === postId)?.comments.push({ id: uid(), post_id: postId, author_id: me.id, author_name: me.name, author_role: me.role, body, created_at: new Date().toISOString() }); });
  }
  async function deleteComment(postId: string, id: string) {
    if (remote && supabase) { if (!fail((await supabase.from('post_comments').delete().eq('id', id)).error)) await reload(); return; }
    set((d) => { const p = d.club.posts.find((x) => x.id === postId); if (p) p.comments = p.comments.filter((c) => c.id !== id); });
  }
  async function react(post: Post, emoji: Reaction['emoji']) {
    const mine = post.reactions.some((r) => r.user_id === me.id && r.emoji === emoji);
    if (remote && supabase) {
      const q = mine
        ? supabase.from('post_reactions').delete().match({ post_id: post.id, user_id: me.id, emoji })
        : supabase.from('post_reactions').insert({ post_id: post.id, emoji });
      if (!fail((await q).error)) await reload();
      return;
    }
    set((d) => {
      const p = d.club.posts.find((x) => x.id === post.id);
      if (!p) return;
      p.reactions = mine ? p.reactions.filter((r) => !(r.user_id === me.id && r.emoji === emoji)) : [...p.reactions, { post_id: p.id, user_id: me.id, emoji }];
    });
  }

  return { posts: list, loading, me, addPost, deletePost, togglePin, addComment, deleteComment, react };
}
