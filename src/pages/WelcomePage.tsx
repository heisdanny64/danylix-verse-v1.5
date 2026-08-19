import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const WelcomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      navigate("/home", { replace: true });
    }, 3000);

    return () => window.clearTimeout(redirectTimer);
  }, [navigate]);

  return (
    <main className="welcome-shell">
      <div className="welcome-glow welcome-glow-primary" aria-hidden="true" />
      <div className="welcome-glow welcome-glow-secondary" aria-hidden="true" />
      <div className="welcome-content">
        <p className="welcome-kicker">Danylix Verse</p>
        <h1 className="welcome-title">Welcome Back! It&apos;s been a while...</h1>
        <p className="welcome-subtitle">Enjoy premium streaming for free on D. Verse</p>
        <div className="welcome-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </main>
  );
};

export default WelcomePage;
