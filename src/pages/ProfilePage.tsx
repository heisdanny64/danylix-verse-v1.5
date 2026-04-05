import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchCloudDownloads } from "@/lib/supabase-library";
import { posterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, LogOut, ChevronRight, Download, Lock, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ProfilePage = () => {
  const { user, profile, signOut, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? "");
  const [editUsername, setEditUsername] = useState(profile?.username ?? "");
  const [editLoading, setEditLoading] = useState(false);

  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const downloads = useQuery({
    queryKey: ["downloads", user?.id],
    queryFn: () => fetchCloudDownloads(user!.id),
    enabled: !!user,
  });

  if (!user || !profile) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleSaveProfile = async () => {
    setEditLoading(true);
    const { error } = await updateProfile({ name: editName, username: editUsername });
    setEditLoading(false);
    if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
    toast({ title: "Profile updated" });
    setEditing(false);
  };

  const handleChangePassword = async () => {
    if (newPw.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    if (newPw !== confirmPw) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    setPwLoading(true);
    const { error } = await updatePassword(newPw);
    setPwLoading(false);
    if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
    toast({ title: "Password changed" });
    setChangingPw(false);
    setNewPw("");
    setConfirmPw("");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
      </header>

      {/* Avatar & Info */}
      <div className="flex flex-col items-center px-4 pb-6">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-3">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        {!editing ? (
          <>
            <h2 className="text-lg font-bold text-foreground">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <p className="text-xs text-muted-foreground mt-1">{profile.email}</p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => { setEditing(true); setEditName(profile.name); setEditUsername(profile.username); }}>
              <Edit2 className="w-3 h-3" /> Edit Profile
            </Button>
          </>
        ) : (
          <div className="w-full max-w-xs space-y-3 mt-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
            <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="Username" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveProfile} disabled={editLoading} className="gap-1"><Check className="w-3 h-3" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="w-3 h-3" /> Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Downloads Preview */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2"><Download className="w-4 h-4" /> Downloads</h3>
          <button onClick={() => navigate("/downloads")} className="text-xs text-primary flex items-center gap-0.5">View All <ChevronRight className="w-3 h-3" /></button>
        </div>
        {(downloads.data?.length ?? 0) > 0 ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {downloads.data!.slice(0, 10).map((d: any) => (
              <div key={d.id} className="flex-shrink-0 w-24">
                <img src={posterUrl(d.poster)} alt={d.title} className="w-full aspect-[2/3] rounded-lg object-cover bg-muted" />
                <p className="text-xs text-muted-foreground mt-1 truncate">{d.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-20 rounded-lg bg-card border border-border flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No downloads yet</p>
          </div>
        )}
      </section>

      {/* Settings */}
      <section className="px-4 space-y-2">
        {/* Change Password */}
        <button onClick={() => setChangingPw(!changingPw)} className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-card border border-border">
          <span className="flex items-center gap-2 text-sm text-foreground"><Lock className="w-4 h-4" /> Change Password</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        {changingPw && (
          <div className="px-4 py-3 rounded-lg bg-card border border-border space-y-3">
            <Input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <Input type="password" placeholder="Confirm password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            <Button size="sm" onClick={handleChangePassword} disabled={pwLoading}>{pwLoading ? "Saving..." : "Update Password"}</Button>
          </div>
        )}

        {/* Sign Out */}
        <button onClick={handleSignOut} className="w-full flex items-center gap-2 py-3 px-4 rounded-lg bg-card border border-border text-sm text-destructive">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>

        {/* Links */}
        <div className="flex gap-4 justify-center pt-4 text-xs text-muted-foreground">
          <span>About</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
