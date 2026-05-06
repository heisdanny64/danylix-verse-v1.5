import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { X, Eye, EyeOff } from "lucide-react";

type Tab = "login" | "signup";

const Field = ({
  label, value, onChange, type = "text", autoComplete, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; autoComplete?: string; placeholder?: string;
}) => (
  <div className="space-y-2">
    <label className="block text-base text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="w-full bg-transparent border-0 border-b-2 border-border focus:border-primary outline-none py-2 text-foreground text-lg transition-colors placeholder:text-muted-foreground/60"
    />
  </div>
);

const AuthPage = () => {
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const switchTab = (t: Tab) => { setTab(t); setError(null); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginId || !loginPass) { setError("All fields are required"); return; }
    setLoading(true);
    const { error } = await signIn(loginId, loginPass);
    setLoading(false);
    if (error) { setError(error); return; }
    navigate("/", { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username || !email || !password) { setError("All fields are required"); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError("Username can only contain letters, numbers, and underscores"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError("Enter a valid email address"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    const { error } = await signUp(username, email, password);
    setLoading(false);
    if (error) { setError(error); return; }
    navigate("/", { replace: true });
  };

  const isLogin = tab === "login";

  return (
    <div className="min-h-screen flex flex-col bg-background pt-safe">
      <header className="flex items-center px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted">
          <X className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-center font-extrabold text-xl pr-9" style={{ textTransform: "none" }}>
          <span className="text-foreground">D.</span>
          <span className="text-primary"> Verse</span>
        </h1>
      </header>

      <div className="flex-1 px-6 pt-10">
        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-center text-3xl font-semibold text-foreground mb-10">
            {isLogin ? "Log In" : "Create Account"}
          </h2>

          {error && (
            <div className="mb-5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-7">
              <Field label="Email or Username" value={loginId} onChange={setLoginId} autoComplete="username" />
              <div className="space-y-2 relative">
                <label className="block text-base text-muted-foreground">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-transparent border-0 border-b-2 border-border focus:border-primary outline-none py-2 pr-10 text-foreground text-lg transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-0 bottom-2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 rounded-full border-2 border-border text-foreground font-bold tracking-widest text-sm uppercase disabled:opacity-50 hover:border-primary hover:text-primary transition-colors"
              >
                {loading ? "Logging In…" : "Log In"}
              </button>

              <div className="text-center text-sm space-x-2 pt-2">
                <button type="button" onClick={() => {/* future */}} className="text-primary font-bold tracking-wide uppercase">Forgot Password?</button>
                <span className="text-muted-foreground">|</span>
                <button type="button" onClick={() => switchTab("signup")} className="text-primary font-bold tracking-wide uppercase">Create Account</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-7">
              <Field
                label="Username"
                value={username}
                onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                autoComplete="username"
                placeholder="Choose a unique username"
              />
              <Field label="Email Address" value={email} onChange={setEmail} type="email" autoComplete="email" />
              <div className="space-y-2 relative">
                <label className="block text-base text-muted-foreground">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-transparent border-0 border-b-2 border-border focus:border-primary outline-none py-2 pr-10 text-foreground text-lg transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-0 bottom-2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <p className="text-xs text-muted-foreground pt-1">Use at least 6 characters, do not use empty spaces</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-4 rounded-full border-2 border-border text-foreground font-bold tracking-widest text-sm uppercase disabled:opacity-50 hover:border-primary hover:text-primary transition-colors"
              >
                {loading ? "Creating Account…" : "Create Account"}
              </button>

              <p className="text-center text-sm text-foreground pt-2">
                Already have an account?{" "}
                <button type="button" onClick={() => switchTab("login")} className="text-primary font-bold tracking-wide uppercase">Log In</button>
              </p>

              <p className="text-center text-xs text-muted-foreground leading-relaxed pt-4">
                By creating an account you're agreeing to our{" "}
                <a href="/terms" className="text-primary underline">Terms of Use</a> &{" "}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;