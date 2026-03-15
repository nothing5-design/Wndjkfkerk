import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Coins } from "lucide-react";
import { Link } from "react-router-dom";

const BotUsers = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ["bot-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_users")
        .select("*")
        .order("coins", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: gameStats } = useQuery({
    queryKey: ["game-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_history")
        .select("game_type, coins_won");
      if (error) throw error;
      return data;
    },
  });

  const totalUsers = users?.length ?? 0;
  const totalCoins = gameStats?.reduce((s, g) => s + g.coins_won, 0) ?? 0;

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
            <h1 className="text-lg font-bold text-foreground">Bot Users</h1>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">👥 {totalUsers} users</span>
            <span className="bg-muted px-2 py-1 rounded">💰 {totalCoins} coins given</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 pt-6 space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : !users?.length ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            No users yet. Start the bot and send /start!
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="glass-card p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">
                  {user.first_name || 'Unknown'} 
                  {user.username && <span className="text-muted-foreground font-normal"> @{user.username}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  TG#{user.telegram_id} · {user.language?.toUpperCase() || 'EN'} · Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground">{user.coins}</span>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default BotUsers;
