import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Archive, ArchiveRestore, Trash2, Mail, MailOpen, Send, Loader2, Inbox, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import ComposeMessageDialog from '@/components/messaging/ComposeMessageDialog';

type Folder = 'inbox' | 'unread' | 'sent' | 'archived';

interface PersonRef {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface MessageRow {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  thread_id: string | null;
  parent_message_id: string | null;
  sender_id: string;
  sender: PersonRef | null;
}

interface ListItem {
  key: string;
  messageId: string;
  threadId: string;
  subject: string;
  preview: string;
  createdAt: string;
  counterparty: string;
  counterpartyRole: string;
  isRead: boolean;
  isArchived: boolean;
  recipientRowId?: string;
  outgoing: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  principal: 'Principal',
  head_teacher: 'Head Teacher',
  teacher: 'Teacher',
  bursar: 'Bursar',
  librarian: 'Librarian',
  student: 'Student',
  parent: 'Parent',
};

const fullName = (p?: PersonRef | null) => (p ? `${p.first_name} ${p.last_name}`.trim() : 'Unknown user');
const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const CommunicationPage: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [folder, setFolder] = useState<Folder>('inbox');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState<ListItem[]>([]);
  const [sent, setSent] = useState<ListItem[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageRow[]>([]);
  const [threadRecipients, setThreadRecipients] = useState<Record<string, PersonRef[]>>({});
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const deepLinkHandled = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    const [{ data: recv }, { data: outbox }] = await Promise.all([
      supabase
        .from('message_recipients')
        .select(
          'id,is_read,is_archived,created_at,message:messages!message_recipients_message_id_fkey(id,subject,body,created_at,thread_id,parent_message_id,sender_id,sender:profiles!messages_sender_id_fkey(id,first_name,last_name,role))',
        )
        .eq('recipient_id', profile.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select(
          'id,subject,body,created_at,thread_id,parent_message_id,sender_id,recipients:message_recipients!message_recipients_message_id_fkey(recipient:profiles!message_recipients_recipient_id_fkey(id,first_name,last_name,role))',
        )
        .eq('sender_id', profile.id)
        .eq('sender_deleted', false)
        .order('created_at', { ascending: false }),
    ]);

    setInbox(
      ((recv || []) as any[])
        .filter((r) => r.message)
        .map((r) => ({
          key: r.id,
          recipientRowId: r.id,
          messageId: r.message.id,
          threadId: r.message.thread_id || r.message.id,
          subject: r.message.subject || '(No subject)',
          preview: r.message.body,
          createdAt: r.message.created_at,
          counterparty: fullName(r.message.sender),
          counterpartyRole: r.message.sender?.role || '',
          isRead: r.is_read,
          isArchived: r.is_archived,
          outgoing: false,
        })),
    );

    setSent(
      ((outbox || []) as any[]).map((m) => {
        const names = (m.recipients || []).map((x: any) => fullName(x.recipient));
        return {
          key: m.id,
          messageId: m.id,
          threadId: m.thread_id || m.id,
          subject: m.subject || '(No subject)',
          preview: m.body,
          createdAt: m.created_at,
          counterparty: names.length ? `To: ${names.join(', ')}` : 'To: —',
          counterpartyRole: '',
          isRead: true,
          isArchived: false,
          outgoing: true,
        } as ListItem;
      }),
    );

    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // realtime
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`messaging-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_recipients' }, () => fetchMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMessages())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchMessages]);

  const openThread = useCallback(
    async (item: ListItem) => {
      setActiveThread(item.threadId);
      setReply('');
      const { data } = await supabase
        .from('messages')
        .select(
          'id,subject,body,created_at,thread_id,parent_message_id,sender_id,sender:profiles!messages_sender_id_fkey(id,first_name,last_name,role),recipients:message_recipients!message_recipients_message_id_fkey(recipient:profiles!message_recipients_recipient_id_fkey(id,first_name,last_name,role))',
        )
        .eq('thread_id', item.threadId)
        .order('created_at', { ascending: true });

      const rows = (data || []) as any[];
      setThreadMessages(rows.map(({ recipients, ...m }) => m as MessageRow));
      const map: Record<string, PersonRef[]> = {};
      rows.forEach((m) => {
        map[m.id] = (m.recipients || []).map((r: any) => r.recipient).filter(Boolean);
      });
      setThreadRecipients(map);

      if (item.recipientRowId && !item.isRead) {
        await supabase
          .from('message_recipients')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', item.recipientRowId);
        fetchMessages();
      }
    },
    [fetchMessages],
  );

  // deep link from notification
  useEffect(() => {
    const target = searchParams.get('message');
    if (!target || deepLinkHandled.current || loading) return;
    const item = [...inbox, ...sent].find((i) => i.messageId === target);
    if (item) {
      deepLinkHandled.current = true;
      setFolder(item.outgoing ? 'sent' : 'inbox');
      openThread(item);
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, inbox, sent, loading, openThread, setSearchParams]);

  const items = useMemo(() => {
    let list: ListItem[];
    if (folder === 'sent') list = sent;
    else if (folder === 'unread') list = inbox.filter((i) => !i.isRead && !i.isArchived);
    else if (folder === 'archived') list = inbox.filter((i) => i.isArchived);
    else list = inbox.filter((i) => !i.isArchived);

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => `${i.subject} ${i.preview} ${i.counterparty}`.toLowerCase().includes(q));
  }, [folder, inbox, sent, search]);

  const unreadCount = inbox.filter((i) => !i.isRead && !i.isArchived).length;

  const toggleRead = async (item: ListItem) => {
    if (!item.recipientRowId) return;
    await supabase
      .from('message_recipients')
      .update({ is_read: !item.isRead, read_at: !item.isRead ? new Date().toISOString() : null })
      .eq('id', item.recipientRowId);
    fetchMessages();
  };

  const toggleArchive = async (item: ListItem) => {
    if (!item.recipientRowId) return;
    await supabase.from('message_recipients').update({ is_archived: !item.isArchived }).eq('id', item.recipientRowId);
    fetchMessages();
    toast({ title: item.isArchived ? 'Message restored' : 'Message archived' });
  };

  const remove = async (item: ListItem) => {
    if (item.outgoing) {
      await supabase.from('messages').update({ sender_deleted: true }).eq('id', item.messageId);
    } else if (item.recipientRowId) {
      await supabase.from('message_recipients').update({ is_deleted: true }).eq('id', item.recipientRowId);
    }
    if (activeThread === item.threadId) setActiveThread(null);
    fetchMessages();
    toast({ title: 'Message deleted' });
  };

  const sendReply = async () => {
    if (!profile?.id || !profile.school_id || !activeThread || !reply.trim()) return;
    const last = threadMessages[threadMessages.length - 1];
    if (!last) return;

    const participants = new Set<string>();
    threadMessages.forEach((m) => {
      if (m.sender_id !== profile.id) participants.add(m.sender_id);
      (threadRecipients[m.id] || []).forEach((r) => {
        if (r.id !== profile.id) participants.add(r.id);
      });
    });
    if (participants.size === 0) return;

    setSending(true);
    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        school_id: profile.school_id,
        sender_id: profile.id,
        thread_id: activeThread,
        parent_message_id: last.id,
        subject: last.subject || '',
        body: reply.trim(),
      })
      .select('id')
      .single();

    if (error || !msg) {
      setSending(false);
      toast({ title: 'Reply failed', description: error?.message, variant: 'destructive' });
      return;
    }

    const { error: rErr } = await supabase.from('message_recipients').insert(
      Array.from(participants).map((rid) => ({ message_id: msg.id, recipient_id: rid, school_id: profile.school_id! })),
    );
    setSending(false);
    if (rErr) {
      toast({ title: 'Reply not delivered', description: rErr.message, variant: 'destructive' });
      return;
    }
    setReply('');
    const current = [...inbox, ...sent].find((i) => i.threadId === activeThread);
    if (current) openThread(current);
    fetchMessages();
    toast({ title: 'Reply sent' });
  };

  const activeItem = [...inbox, ...sent].find((i) => i.threadId === activeThread);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Communication</h1>
          <p className="text-muted-foreground">Secure internal messaging with authorized staff in your school</p>
        </div>
        <ComposeMessageDialog onSent={fetchMessages} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* List panel */}
        <Card className={cn('flex flex-col overflow-hidden', activeThread && 'hidden lg:flex')}>
          <div className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search messages" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Tabs value={folder} onValueChange={(v) => setFolder(v as Folder)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="archived">Archive</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Separator />
          <ScrollArea className="h-[520px]">
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages here.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className={cn(
                      'p-3 cursor-pointer hover:bg-accent/60 transition-colors',
                      activeThread === item.threadId && 'bg-accent',
                      !item.isRead && 'bg-primary/5',
                    )}
                    onClick={() => openThread(item)}
                  >
                    <div className="flex items-start gap-2">
                      {!item.isRead && <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('text-sm truncate', !item.isRead && 'font-semibold')}>{item.counterparty}</p>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-sm truncate">{item.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.preview}</p>
                        <div className="flex items-center gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          {item.counterpartyRole && (
                            <Badge variant="outline" className="text-[10px] mr-1">
                              {ROLE_LABELS[item.counterpartyRole] || item.counterpartyRole}
                            </Badge>
                          )}
                          {!item.outgoing && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRead(item)} title={item.isRead ? 'Mark as unread' : 'Mark as read'}>
                                {item.isRead ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleArchive(item)} title={item.isArchived ? 'Restore' : 'Archive'}>
                                {item.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(item)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </Card>

        {/* Conversation panel */}
        <Card className={cn('flex flex-col overflow-hidden', !activeThread && 'hidden lg:flex')}>
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10">
              <Mail className="h-10 w-10 mb-3 opacity-50" />
              <p>Select a conversation to read it</p>
            </div>
          ) : (
            <>
              <div className="p-4 flex items-start gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setActiveThread(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{activeItem?.subject || '(No subject)'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {threadMessages.length} message{threadMessages.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <Separator />
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {threadMessages.map((m) => {
                    const mine = m.sender_id === profile?.id;
                    return (
                      <div key={m.id} className={cn('rounded-lg border p-3', mine ? 'bg-primary/5 ml-6' : 'bg-muted/40 mr-6')}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{mine ? 'You' : fullName(m.sender)}</span>
                            {m.sender?.role && (
                              <Badge variant="outline" className="text-[10px]">
                                {ROLE_LABELS[m.sender.role] || m.sender.role}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">{stamp(m.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          To: {(threadRecipients[m.id] || []).map((r) => fullName(r)).join(', ') || '—'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <Separator />
              <div className="p-4 space-y-2">
                <Textarea rows={3} placeholder="Write a reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CommunicationPage;
