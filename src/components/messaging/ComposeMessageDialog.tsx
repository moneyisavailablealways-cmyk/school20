import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PenSquare, Loader2, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTerminology } from '@/hooks/useTerminology';
import { useMessageRecipients } from '@/hooks/useMessageRecipients';

interface Props {
  onSent?: () => void;
}

const ComposeMessageDialog: React.FC<Props> = ({ onSent }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const t = useTerminology();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const { people, groups, loading } = useMessageRecipients(open);

  const roleLabels: Record<string, string> = useMemo(
    () => ({
      admin: 'Administrator',
      principal: 'Principal',
      head_teacher: 'Head Teacher',
      teacher: 'Teacher',
      bursar: 'Bursar',
      librarian: 'Librarian',
      student: t.Student,
      parent: 'Parent',
    }),
    [t.Student],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.email} ${p.context || ''} ${roleLabels[p.role] || p.role}`
        .toLowerCase()
        .includes(q),
    );
  }, [people, search, roleLabels]);

  const reset = () => {
    setSelected([]);
    setSubject('');
    setBody('');
    setSearch('');
  };

  const toggleGroup = (memberIds: string[]) => {
    const allSelected = memberIds.every((id) => selected.includes(id));
    setSelected((prev) =>
      allSelected ? prev.filter((id) => !memberIds.includes(id)) : Array.from(new Set([...prev, ...memberIds])),
    );
  };

  const handleSend = async () => {
    if (!profile?.id || !profile.school_id) return;
    if (!selected.length) {
      toast({ title: 'Select recipients', description: 'Choose at least one recipient.', variant: 'destructive' });
      return;
    }
    if (!body.trim()) {
      toast({ title: 'Message required', description: 'Please write a message.', variant: 'destructive' });
      return;
    }
    setSending(true);
    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        school_id: profile.school_id,
        sender_id: profile.id,
        subject: subject.trim(),
        body: body.trim(),
      })
      .select('id')
      .single();

    if (error || !msg) {
      setSending(false);
      toast({ title: 'Could not send message', description: error?.message, variant: 'destructive' });
      return;
    }

    const { error: rErr } = await supabase.from('message_recipients').insert(
      selected.map((rid) => ({ message_id: msg.id, recipient_id: rid, school_id: profile.school_id! })),
    );
    setSending(false);
    if (rErr) {
      toast({
        title: 'Could not deliver message',
        description: rErr.message.includes('row-level security')
          ? 'You are not permitted to message one or more of the selected recipients.'
          : rErr.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Message sent', description: `Delivered to ${selected.length} recipient(s).` });
    reset();
    setOpen(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <PenSquare className="h-4 w-4 mr-2" /> New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={`Search by name, class, role or email`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const active = g.memberIds.every((id) => selected.includes(id));
                  return (
                    <Button
                      key={g.id}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => toggleGroup(g.memberIds)}
                    >
                      <Users className="h-3.5 w-3.5 mr-1" />
                      {g.name} ({g.memberIds.length})
                    </Button>
                  );
                })}
              </div>
            )}

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.map((id) => {
                  const p = people.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <Badge key={id} variant="secondary">
                      {p.first_name} {p.last_name}
                    </Badge>
                  );
                })}
              </div>
            )}

            <ScrollArea className="h-48 rounded-md border">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading recipients…</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No authorized recipients found.</p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        id={`rec-${p.id}`}
                        checked={selected.includes(p.id)}
                        onCheckedChange={(c) =>
                          setSelected((prev) => (c ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
                        }
                      />
                      <Label htmlFor={`rec-${p.id}`} className="flex-1 cursor-pointer font-normal">
                        <span className="font-medium">{p.first_name} {p.last_name}</span>
                        <span className="text-muted-foreground text-xs block">
                          {p.context ? `${p.context} • ${p.email}` : p.email}
                        </span>
                      </Label>
                      <Badge variant="outline" className="text-[10px]">{roleLabels[p.role] || p.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComposeMessageDialog;
