import { Twitter, Compass, Droplet } from "lucide-react";

const LINKS = [
  { label: "X", href: "https://x.com/OPNLend", icon: Twitter },
  { label: "Explorer",    href: "https://testnet.iopn.tech", icon: Compass },
  { label: "Faucet",      href: "https://faucet.iopn.tech", icon: Droplet },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: "3rem", padding: "1.5rem 1rem" }}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          © 2026 OPNLend · Built on OPN Chain
        </span>

        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text-secondary)", textDecoration: "none" }}>
                <Icon size={14} />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}