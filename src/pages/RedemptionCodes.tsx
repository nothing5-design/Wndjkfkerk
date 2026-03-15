import { useState } from "react";
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
import { ArrowLeft, Plus, Trash2, Gift, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const TIERS = [
  { coins: 1000, label: '₹100 (1000 coins)' },
  { coins: 2000, label: '₹200 (2000 coins)' },
  { coins: 3000, label: '₹300 (3000 coins)' },
  { coins: 10000, label: '₹1,000 (10000 coins)' },
  { coins: 50000, label: '₹5,000 (50000 coins)' },
  { coins: 100000, label: '₹10,000 (100000 coins)' },
];

const RedemptionCodes = () => {
  const queryClient = useQueryClient();
  const [bulkCodes, setBulkCodes] = useState("");
  const [selectedTier, setSelectedTier] = useState("1000");

  const { data: codes, isLoading } = useQuery({
    queryKey: ["redemption-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redemption_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (codesList: string[]) => {
      const rows = codesList.map((code) => ({
        code: code.trim(),
        coin_cost: parseInt(selectedTier),
      }));
      const { error } = await supabase.from("redemption_codes").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redemption-codes"] });
      setBulkCodes("");
      toast.success("Codes added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("redemption_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redemption-codes"] });
      toast.success("Code deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAddCodes = () => {
    const lines = bulkCodes.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return toast.error("Enter at least one code");
    addMutation.mutate(lines);
  };

  const claimed = codes?.filter((c) => c.is_claimed).length ?? 0;
  const unclaimed = codes?.filter((c) => !c.is_claimed).length ?? 0;

  const getTierLabel = (coinCost: number) => {
    const tier = TIERS.find(t => t.coins === coinCost);
    return tier ? `${coinCost} coins` : `${coinCost} coins`;
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
            <h1 className="text-lg font-bold text-foreground">Redemption Codes</h1>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">✅ {claimed} claimed</span>
            <span className="bg-muted px-2 py-1 rounded">🎁 {unclaimed} available</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 pt-6 space-y-6">
        {/* Add codes */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Add Codes</h2>
          <p className="text-sm text-muted-foreground">Enter one code per line. Select the coin tier these codes belong to.</p>
          
          <div className="space-y-2">
            <Label>Coin Tier</Label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map(tier => (
                  <SelectItem key={tier.coins} value={tier.coins.toString()}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={bulkCodes}
            onChange={(e) => setBulkCodes(e.target.value)}
            placeholder={"WIN91-ABCD-1234\nWIN91-EFGH-5678\nWIN91-IJKL-9012"}
            className="bg-muted/50 min-h-[120px] font-mono"
          />
          <Button onClick={handleAddCodes} disabled={addMutation.isPending} className="gap-2">
            <Plus className="h-4 w-4" />
            {addMutation.isPending ? "Adding..." : "Add Codes"}
          </Button>
        </div>

        {/* Codes list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : !codes?.length ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              No codes yet. Add some above!
            </div>
          ) : (
            codes.map((code) => (
              <div key={code.id} className="glass-card p-4 flex items-center gap-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${code.is_claimed ? 'bg-muted' : 'bg-primary/10'}`}>
                  {code.is_claimed ? <Check className="h-4 w-4 text-muted-foreground" /> : <Gift className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-sm ${code.is_claimed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {code.code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getTierLabel((code as any).coin_cost || 1000)}
                    {code.is_claimed && ` · Claimed by TG#${code.claimed_by_telegram_id} · ${new Date(code.claimed_at!).toLocaleDateString()}`}
                  </p>
                </div>
                {!code.is_claimed && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(code.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default RedemptionCodes;
