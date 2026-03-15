import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const TUTORIAL_KEYS = [
  { key: 'colour_prediction', label: '🎨 Colour Prediction / WinGo' },
  { key: 'aviator', label: '🚀 Aviator' },
  { key: 'chicken_road', label: '🐔 Chicken Road 2' },
  { key: 'mines', label: '💣 Mines' },
  { key: 'k3', label: '🎲 K3' },
  { key: '5d', label: '🔢 5D' },
  { key: 'slot_games', label: '🎰 Slot Games' },
  { key: 'casino_games', label: '🎲 Casino Games' },
  { key: 'card_games', label: '🃏 Card Games' },
  { key: 'crash_game', label: '🎯 Crash Game' },
];

const BotSettings = () => {
  const queryClient = useQueryClient();
  const [botName, setBotName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [welcomeMediaUrl, setWelcomeMediaUrl] = useState("");
  const [welcomeMediaType, setWelcomeMediaType] = useState("photo");
  const [officialSiteUrl, setOfficialSiteUrl] = useState("");
  const [tutorialLinks, setTutorialLinks] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["bot-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setBotName(settings.bot_name || "");
      setBotToken((settings as any).bot_token || "");
      setWelcomeMessage(settings.welcome_message || "");
      setWelcomeMediaUrl(settings.welcome_media_url || "");
      setWelcomeMediaType(settings.welcome_media_type || "photo");
      setOfficialSiteUrl((settings as any).official_site_url || "");
      setTutorialLinks((settings as any).tutorial_links || {});
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bot_settings")
        .update({
          bot_name: botName,
          welcome_message: welcomeMessage,
          welcome_media_url: welcomeMediaUrl || null,
          welcome_media_type: welcomeMediaType,
          bot_token: botToken || null,
          official_site_url: officialSiteUrl || null,
          tutorial_links: tutorialLinks,
        } as any)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-settings"] });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTutorialLink = (key: string, value: string) => {
    setTutorialLinks(prev => ({ ...prev, [key]: value }));
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
            <h1 className="text-lg font-bold text-foreground">Bot Settings</h1>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 pt-6 space-y-6">
        {/* General */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">General</h2>
          <div className="space-y-2">
            <Label>Bot Name</Label>
            <Input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="My Awesome Bot" className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <div className="flex gap-2">
              <Input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                className="bg-muted/50 font-mono text-sm"
              />
              <Button variant="ghost" size="icon" onClick={() => setShowToken(!showToken)}>
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Get from @BotFather on Telegram. Used for webhook setup.</p>
          </div>
          <div className="space-y-2">
            <Label>Official Site URL</Label>
            <Input value={officialSiteUrl} onChange={(e) => setOfficialSiteUrl(e.target.value)} placeholder="https://win91.com" className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Shown in "WIN91 Official Site" menu button</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">Welcome Message (/start)</h2>
          <div className="space-y-2">
            <Label>Message Text</Label>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome! Choose an option below:"
              className="bg-muted/50 min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">Supports Telegram HTML: &lt;b&gt;, &lt;i&gt;, &lt;a href=&quot;&quot;&gt;, &lt;code&gt;</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Welcome Media URL</Label>
              <Input value={welcomeMediaUrl} onChange={(e) => setWelcomeMediaUrl(e.target.value)} placeholder="https://example.com/welcome.jpg" className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select value={welcomeMediaType} onValueChange={setWelcomeMediaType}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="animation">GIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {welcomeMediaUrl && (
            <div className="rounded-lg overflow-hidden border border-border max-w-sm">
              <img src={welcomeMediaUrl} alt="Welcome media preview" className="w-full h-auto" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
          )}
        </div>

        {/* Tutorial Video Links */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">🎬 Tutorial Video Links</h2>
          <p className="text-sm text-muted-foreground">Add YouTube or other video links for each game tutorial. Leave empty for "Coming Soon".</p>
          <div className="space-y-3">
            {TUTORIAL_KEYS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm">{label}</Label>
                <Input
                  value={tutorialLinks[key] || ""}
                  onChange={(e) => updateTutorialLink(key, e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-muted/50 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BotSettings;
