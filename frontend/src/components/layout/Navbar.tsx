import Link from "next/link";
import { useRouter } from "next/router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LayoutGrid, CircleUser, Trophy, Activity } from "lucide-react";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutGrid },
  { href: "/profile",     label: "Profile",     icon: CircleUser },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/activity",    label: "Activity",    icon: Activity },
];

export default function Navbar() {
  const { pathname } = useRouter();
  const onLanding = pathname === "/";

  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(5,15,15,0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 1.5rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2rem",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: 6,
              background: "var(--accent)", color: "#050f0f",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "0.75rem",
            }}
          >
            R
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>
            OPNLend{!onLanding && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> </span>}
          </span>
        </Link>

        {!onLanding && (
          <div style={{ display: "flex", gap: "0.25rem", flex: 1, justifyContent: "center" }}>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}>
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
    </nav>
  );
}
