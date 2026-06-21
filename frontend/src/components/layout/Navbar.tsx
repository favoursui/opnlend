import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LayoutGrid, CircleUser, Trophy, Activity, Menu, X } from "lucide-react";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutGrid },
  { href: "/profile",     label: "Profile",     icon: CircleUser },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/activity",    label: "Activity",    icon: Activity },
];

export default function Navbar() {
  const { pathname } = useRouter();
  const onLanding = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);

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
          padding: "0 1rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <div style={{ width: 100, maxWidth: "28vw" }}>
            <Image src="/opnlend_logo_v2.svg" alt="OPNLend" width={140} height={40} style={{ width: "100%", height: "auto" }} />
          </div>
        </Link>

        {/* Desktop nav links */}
        {!onLanding && (
          <div className="nav-links-desktop" style={{ display: "flex", gap: "0.25rem", flex: 1, justifyContent: "center" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <ConnectButton chainStatus={{ smallScreen: "none", largeScreen: "icon" }} showBalance={false} />

          {/* Hamburger button — mobile only */}
          {!onLanding && (
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "0.4rem",
                color: "var(--text-primary)",
                display: "none",
                cursor: "pointer",
              }}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {!onLanding && menuOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            display: "none",
            flexDirection: "column",
            padding: "0.5rem 1rem 1rem",
            borderTop: "1px solid var(--border)",
            background: "rgba(5,15,15,0.95)",
          }}
        >
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
                style={{ padding: "0.625rem 0.75rem", width: "100%" }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}