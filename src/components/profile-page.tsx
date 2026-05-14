import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const initials = (name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, bio })
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated"); refreshProfile(); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-3xl font-bold">Profile</h1>
        <p className="mt-1 text-muted-foreground">Update your personal information.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" size="sm" disabled>
              <Camera className="mr-2 h-4 w-4" />
              Upload photo
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell us a bit about yourself…" />
          </div>

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
