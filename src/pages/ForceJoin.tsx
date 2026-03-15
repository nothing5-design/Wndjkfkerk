import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Channel {
  id: string;
  button_name: string;
  channel_id: string;
  channel_link: string;
  is_active: boolean;
  position_order: number;
}

const ForceJoin = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [buttonName, setButtonName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channelLink, setChannelLink] = useState("");

  const { data: channels, isLoading } = useQuery({
    queryKey: ["force-join-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("force_join_channels")
        .select("*")
        .order("position_order");
      if (error) throw error;
      return data as Channel[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!buttonName.trim() || !channelId.trim() || !channelLink.trim()) {
        throw new Error("All fields are required");
      }
      if (editingChannel) {
        const { error } = await supabase
          .from("force_join_channels")
          .update({ button_name: buttonName, channel_id: channelId, channel_link: channelLink })
          .eq("id", editingChannel.id);
        if (error) throw error;
      } else {
        const maxOrder = channels?.length ? Math.max(...channels.map(c => c.position_order)) + 1 : 0;
        const { error } = await supabase
          .from("force_join_channels")
          .insert({ button_name: buttonName, channel_id: channelId, channel_link: channelLink, position_order: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["force-join-channels"] });
      toast.success(editingChannel ? "Channel updated" : "Channel added");
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("force_join_channels").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["force-join-channels"] }),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("force_join_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["force-join-channels"] });
      toast.success("Channel deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setButtonName("");
    setChannelId("");
    setChannelLink("");
    setEditingChannel(null);
    setDialogOpen(false);
  };

  const openEdit = (ch: Channel) => {
    setEditingChannel(ch);
    setButtonName(ch.button_name);
    setChannelId(ch.channel_id);
    setChannelLink(ch.channel_link);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">Force Join Channels</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingChannel ? "Edit Channel" : "Add Force Join Channel"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Button Name</Label>
                  <Input value={buttonName} onChange={(e) => setButtonName(e.target.value)} placeholder="📢 Join Our Channel" className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">Shown as inline button text</p>
                </div>
                <div className="space-y-2">
                  <Label>Channel ID</Label>
                  <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="-1001234567890 or @channelname" className="bg-muted/50 font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Numeric ID (e.g. -1001234567890) or @username. Bot must be admin in the channel.</p>
                </div>
                <div className="space-y-2">
                  <Label>Channel Link</Label>
                  <Input value={channelLink} onChange={(e) => setChannelLink(e.target.value)} placeholder="https://t.me/yourchannel" className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">Invite link for users to join</p>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full gap-2">
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : editingChannel ? "Update Channel" : "Add Channel"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 pt-6 space-y-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">
            Users must join <b>all active channels</b> before they can use the bot. Referral rewards are only given when the referred user has joined all channels.
          </p>
        </div>

        {!channels?.length ? (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground">No force join channels configured yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => (
              <div key={ch.id} className="glass-card p-4 flex items-center gap-4">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{ch.button_name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{ch.channel_id}</p>
                  <a href={ch.channel_link} target="_blank" rel="noopener" className="text-xs text-primary hover:underline truncate block">{ch.channel_link}</a>
                </div>
                <Switch
                  checked={ch.is_active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: ch.id, active: checked })}
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(ch)}>
                  <Settings2Icon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ch.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// Small inline icon since we already import from lucide
import { Settings2 as Settings2Icon } from "lucide-react";

export default ForceJoin;
