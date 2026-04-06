import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, User, LogOut, ChevronRight, Lock, Edit2, Check, X,
  Settings, Info, FileText, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ProfilePage = () => {
  const { user, profile, signOut, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [view, setView] = useState<"settings" | "edit">("settings");
  const [editName, setEditName] = useState(profile?.name ?? "");
  const [editUsername, setEditUsername] = useState(profile?.username ?? "");
  const [editLoading, setEditLoading] = useState(false);

  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  if (!user || !profile) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleSaveProfile = async () => {
    setEditLoading(true);
    const { error } = await updateProfile({ name: editName, username: editUsername });
    setEditLoading(false);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
    setView("settings");
  };

  const handleChangePassword = async () => {
    if (newPw.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    const { error } = await updatePassword(newPw);
    setPwLoading(false);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Password changed" });
    setChangingPw(false);
    setNewPw("");
    setConfirmPw("");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  // ---------- Edit Profile View ----------
  if (view === "edit") {
    return (
      <div className="min-h-screen pb-24 bg-background">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button
            onClick={() => setView("settings")}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Edit Profile</h1>
        </header>

        {/* Avatar */}
        <div className="flex flex-col items-center px-4 pb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Full name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              className="bg-card border-border"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input
              value={profile.email}
              readOnly
              className="bg-card border-border text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <Input
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="username"
              className="bg-card border-border"
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={editLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
          >
            {editLoading ? "Saving..." : "Save Changes"}
          </Button>

          <button className="w-full text-center text-sm text-destructive pt-4">
            Delete Account
          </button>
        </div>
      </div>
    );
  }

  // ---------- Settings View (Default) ----------
  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </header>

      {/* User Card */}
      <button
        onClick={() => {
          setView("edit");
          setEditName(profile.name);
          setEditUsername(profile.username);
        }}
        className="w-full flex items-center gap-4 px-4 py-4 mb-6"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="flex-1 text-left">
          <h2 className="text-base font-bold text-foreground">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Settings Rows */}
      <section className="px-4 space-y-2">
        <SettingsRow icon={Settings} label="General Settings" onClick={() => {}} />
        <SettingsRow
          icon={Lock}
          label="Change Password"
          onClick={() => setChangingPw(!changingPw)}
        />
        {changingPw && (
          <div className="px-4 py-3 rounded-lg bg-card border border-border space-y-3">
            <Input
              type="password"
              placeholder="New password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="bg-background"
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="bg-background"
            />
            <Button size="sm" onClick={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? "Saving..." : "Update Password"}
            </Button>
          </div>
        )}
        <SettingsRow icon={Info} label="About" onClick={() => {}} />
        <SettingsRow icon={FileText} label="Terms of Service" onClick={() => {}} />
        <SettingsRow icon={Shield} label="Privacy Policy" onClick={() => {}} />
      </section>

      {/* Sign Out */}
      <div className="px-4 mt-8">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
};

// Reusable settings row
function SettingsRow({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3.5 px-4 rounded-lg bg-card border border-border"
    >
      <span className="flex items-center gap-3 text-sm text-foreground">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

export default ProfilePage;
