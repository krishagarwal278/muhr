import Link from "next/link";
import { MuhrLogo } from "@/components/ui/MuhrLogo";

export function LandingFooter() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-top">
          <div>
            <Link className="brand" href="/">
              <MuhrLogo size={30} className="brand-logo" />
              <span>Muhr</span>
            </Link>
            <p className="ft-tag">Vault, license, and earn from your likeness — on your terms.</p>
          </div>
          <div className="ft-links">
            <div className="ft-col">
              <h5>Product</h5>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/for-brands">For brands</Link>
              <Link href="/#legal">Protection</Link>
              <Link href="/#waitlist">Join waitlist</Link>
            </div>
            <div className="ft-col">
              <h5>Company</h5>
              <Link href="/login">Sign in</Link>
            </div>
            <div className="ft-col">
              <h5>Legal</h5>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/cookies">Cookies</Link>
            </div>
          </div>
        </div>
        <div className="ft-bottom">
          <span>© {new Date().getFullYear()} Muhr. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
