import "./landing.css";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="landing min-h-screen">{children}</div>;
}
