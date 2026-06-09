import Link from "next/link";
import { MuhrLogo } from "@/components/ui/MuhrLogo";
import { cx } from "@/lib/cx";

type LandingHeaderProps = {
  activeNav?: "home" | "how-it-works" | "for-brands";
};

export function LandingHeader({ activeNav }: LandingHeaderProps) {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link className="brand" href="/">
          <MuhrLogo size={30} className="brand-logo" priority />
          <span>Muhr</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link
            href="/"
            className={cx("link", activeNav === "home" && "active")}
            aria-current={activeNav === "home" ? "page" : undefined}
          >
            For creators
          </Link>
          <Link
            href="/for-brands"
            className={cx("link", activeNav === "for-brands" && "active")}
            aria-current={activeNav === "for-brands" ? "page" : undefined}
          >
            For brands
          </Link>
          <Link
            href="/how-it-works"
            className={cx("link", activeNav === "how-it-works" && "active")}
            aria-current={activeNav === "how-it-works" ? "page" : undefined}
          >
            How it works
          </Link>
          <Link href="/#legal" className="link">
            Protection
          </Link>
          <Link href="/#faq" className="link">
            FAQ
          </Link>
        </nav>
        <div className="nav-cta">
          <Link href="/login" className="sign-in">
            Sign in
          </Link>
          <Link
            href={activeNav === "for-brands" ? "/for-brands#waitlist" : "/#waitlist"}
            className="btn btn-primary btn-sm"
          >
            {activeNav === "for-brands" ? "Get early access" : "Join the waitlist"}
          </Link>
        </div>
      </div>
    </header>
  );
}
