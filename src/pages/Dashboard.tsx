import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Grid3X3, Settings, LogOut, MessageSquare, Gift, Users, Zap, ZapOff, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Dashboard = () => {
  const { signOut } = useAuth();
  const [webhookLoading, setWebhookLoading] = useState(false);

  const { data: buttons } = useQuery({
    queryKey: ["bot-buttons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bot_buttons").select("*").order("row_order").order("position_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["bot-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bot_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["bot-users-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bot_users").select("id");
      if (error) throw error;
      return data;
    },
  });

  const { data: codes } = useQuery({
    queryKey: ["redemption-codes-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("redemption_codes").select("id, is_claimed");
      if (error) throw error;
      return data;
    },
  });

  const activeButtons = buttons?.filter((b) => b.is_active).length ?? 0;
  const totalButtons = buttons?.length ?? 0;
  const totalUsers = users?.length ?? 0;
  const unclaimedCodes = codes?.filter((c) => !c.is_claimed).length ?? 0;

  const handleWebhook = async (action: 'set' | 'delete') => {
    setWebhookLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('set-webhook', {
        body: { action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(action === 'set' ? '✅ Bot webhook activated!' : '✅ Bot webhook removed!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWebhookLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{settings?.bot_name || "Bot Admin"}</h1>
              <p className="text-xs text-muted-foreground">Telegram Bot Manager</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 pt-8 space-y-8">
        {/* Webhook Controls */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">🤖 Bot Status</h3>
              <p className="text-sm text-muted-foreground">Activate or deactivate the Telegram bot webhook</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleWebhook('set')} disabled={webhookLoading} className="gap-2" size="sm">
                <Zap className="h-4 w-4" />
                {webhookLoading ? 'Working...' : 'Activate Bot'}
              </Button>
              <Button onClick={() => handleWebhook('delete')} disabled={webhookLoading} variant="outline" size="sm" className="gap-2">
                <ZapOff className="h-4 w-4" />
                Stop Bot
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="glass-card p-5">
            <p className="text-2xl font-bold text-foreground">{totalButtons}</p>
            <p className="text-xs text-muted-foreground">Buttons ({activeButtons} active)</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Bot Users</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-2xl font-bold text-foreground">{unclaimedCodes}</p>
            <p className="text-xs text-muted-foreground">Codes Available</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-2xl font-bold text-foreground truncate">
              {settings?.welcome_message ? "✅" : "❌"}
            </p>
            <p className="text-xs text-muted-foreground">Welcome Msg</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link to="/buttons" className="glass-card p-6 hover:border-primary/30 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Grid3X3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Manage Buttons</h3>
                <p className="text-sm text-muted-foreground">Inline keyboard buttons</p>
              </div>
            </div>
          </Link>
          <Link to="/settings" className="glass-card p-6 hover:border-accent/30 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Settings className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Bot Settings</h3>
                <p className="text-sm text-muted-foreground">Welcome message & config</p>
              </div>
            </div>
          </Link>
          <Link to="/codes" className="glass-card p-6 hover:border-primary/30 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Redemption Codes</h3>
                <p className="text-sm text-muted-foreground">Manage ₹100 VIN91 reward codes</p>
              </div>
            </div>
          </Link>
          <Link to="/users" className="glass-card p-6 hover:border-accent/30 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Bot Users</h3>
                <p className="text-sm text-muted-foreground">View users & coin balances</p>
              </div>
            </div>
          </Link>
          <Link to="/force-join" className="glass-card p-6 hover:border-primary/30 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Force Join</h3>
                <p className="text-sm text-muted-foreground">Require channel membership</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
