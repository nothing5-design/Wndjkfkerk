import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import MediaPreview from "@/components/MediaPreview";

interface ButtonForm {
  label: string;
  callback_data: string;
  message_text: string;
  media_url: string;
  media_type: string;
  link_url: string;
  row_order: number;
  position_order: number;
  is_active: boolean;
}

const emptyForm: ButtonForm = {
  label: "",
  callback_data: "",
  message_text: "",
  media_url: "",
  media_type: "photo",
  link_url: "",
  row_order: 0,
  position_order: 0,
  is_active: true,
};

const ButtonManager = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ButtonForm>(emptyForm);

  const { data: buttons, isLoading } = useQuery({
    queryKey: ["bot-buttons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_buttons")
        .select("*")
        .order("row_order")
        .order("position_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: ButtonForm & { id?: string }) => {
      const payload = {
        label: form.label,
        callback_data: form.callback_data || form.label.toLowerCase().replace(/\s+/g, "_"),
        message_text: form.message_text || null,
        media_url: form.media_url || null,
        media_type: form.media_type,
        link_url: form.link_url || null,
        row_order: form.row_order,
        position_order: form.position_order,
        is_active: form.is_active,
      };

      if (form.id) {
        const { error } = await supabase.from("bot_buttons").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bot_buttons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-buttons"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? "Button updated" : "Button created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bot_buttons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-buttons"] });
      toast.success("Button deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (btn: any) => {
    setEditingId(btn.id);
    setForm({
      label: btn.label,
      callback_data: btn.callback_data,
      message_text: btn.message_text || "",
      media_url: btn.media_url || "",
      media_type: btn.media_type || "photo",
      link_url: btn.link_url || "",
      row_order: btn.row_order,
      position_order: btn.position_order,
      is_active: btn.is_active,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    const nextRow = buttons ? Math.max(0, ...buttons.map((b) => b.row_order)) : 0;
    setForm({ ...emptyForm, row_order: nextRow });
    setDialogOpen(false);
    setTimeout(() => setDialogOpen(true), 10);
  };

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
            <h1 className="text-lg font-bold text-foreground">Button Manager</h1>
          </div>
          <Button onClick={openNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Button
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 pt-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : !buttons?.length ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground mb-4">No buttons yet. Create your first inline button.</p>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Add Button
            </Button>
          </div>
        ) : (
          buttons.map((btn) => (
            <div key={btn.id} className="glass-card p-4 flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
              {(btn.media_url || btn.link_url) && (
                <MediaPreview
                  url={btn.media_url || btn.link_url || ""}
                  mediaType={btn.media_type || "photo"}
                  compact
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{btn.label}</span>
                  {!btn.is_active && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Inactive</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Row {btn.row_order} · Pos {btn.position_order}
                  {btn.link_url && ` · 🔗 ${btn.link_url}`}
                  {btn.message_text && ` · 💬 ${btn.message_text.slice(0, 40)}...`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(btn)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(btn.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Button" : "New Button"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Button Label *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. 📹 Tutorial Video"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Callback Data</Label>
              <Input
                value={form.callback_data}
                onChange={(e) => setForm({ ...form, callback_data: e.target.value })}
                placeholder="auto-generated from label"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Response Message</Label>
              <Textarea
                value={form.message_text}
                onChange={(e) => setForm({ ...form, message_text: e.target.value })}
                placeholder="Message sent when button is clicked (supports HTML)"
                className="bg-muted/50 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Media URL</Label>
                <Input
                  value={form.media_url}
                  onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                  placeholder="https://... or YouTube link"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select value={form.media_type} onValueChange={(v) => setForm({ ...form, media_type: v })}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="animation">GIF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.media_url && (
              <MediaPreview url={form.media_url} mediaType={form.media_type} />
            )}
            <div className="space-y-2">
              <Label>Link URL (opens in browser)</Label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://example.com or YouTube link"
                className="bg-muted/50"
              />
            </div>
            {form.link_url && (
              <MediaPreview url={form.link_url} mediaType="video" />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Row</Label>
                <Input
                  type="number"
                  value={form.row_order}
                  onChange={(e) => setForm({ ...form, row_order: parseInt(e.target.value) || 0 })}
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Position in Row</Label>
                <Input
                  type="number"
                  value={form.position_order}
                  onChange={(e) => setForm({ ...form, position_order: parseInt(e.target.value) || 0 })}
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.label || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ButtonManager;
