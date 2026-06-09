import type { IconName } from "@/components/ui/icon";

export const whatYouGet = [
  {
    title: "Verified vault",
    body: "ID check, face match, documented consent.",
    icon: "shield" as IconName,
  },
  {
    title: "License inbox",
    body: "Review briefs. Set rates. You approve.",
    icon: "file-text" as IconName,
  },
  {
    title: "Direct payouts",
    body: "Paid when approved use goes live.",
    icon: "check" as IconName,
  },
] as const;

export const landingPillars = [
  {
    idx: "01",
    title: "Verified vault",
    body: "ID check, face match, and documented consent — encrypted and access-controlled.",
  },
  {
    idx: "02",
    title: "License inbox",
    body: "Review briefs, set your rates, and approve every use.",
  },
  {
    idx: "03",
    title: "Direct payouts",
    body: "Paid under signed terms when approved use goes live.",
  },
] as const;

export const hybridPillars = [
  {
    idx: "01",
    title: "Verified vault",
    body: "Creators verify their identity once — ID, face match, and documented consent, sealed in encrypted storage. Brands only ever see talent that is real and cleared.",
  },
  {
    idx: "02",
    title: "License inbox",
    body: "Brands send a brief, scope, and rate. The creator reviews and approves on their own time. Nothing moves forward until both sides sign — and either can decline.",
  },
  {
    idx: "03",
    title: "Signed & paid",
    body: "An attorney-drafted license defines exactly what is permitted. The creator is paid under those terms, and the brand gets a clean, enforceable chain of rights.",
  },
] as const;

export const brandHeroFloatLicense = [
  {
    name: "Shruti Sharma",
    initial: "P",
    avatarTone: "fall-blue" as BrandAvatarTone,
    detail: "Face + voice · 90 days",
    action: "Licensed",
    amount: null,
  },
  {
    name: "Right-of-publicity",
    initial: "R",
    avatarTone: "fall-gold" as BrandAvatarTone,
    detail: "Scope · US · paid social",
    action: null,
    amount: "Cleared",
  },
] as const;

export const brandTalentProfiles = [
  {
    name: "Shruti Sharma",
    tags: "Lifestyle · Face + voice",
    rate: "$2,400",
    image: "/landing-talent-priya-sharma.png",
    imageAlt: "Priya Sharma portrait",
  },
  {
    name: "Malik Johnson",
    tags: "Tech · Face",
    rate: "$1,800",
    image: "/landing-talent-malik-johnson.png",
    imageAlt: "Malik Johnson portrait",
  },
  {
    name: "Mei Tanaka",
    tags: "Voice · Narration",
    rate: "$950",
    image: "/landing-talent-mei-tanaka.png",
    imageAlt: "Mei Tanaka portrait",
  },
  {
    name: "Arjun Mehta",
    tags: "Lifestyle · Face + voice",
    rate: "$3,100",
    image: "/landing-talent-arjun-mehta.png",
    imageAlt: "Arjun Mehta portrait",
  },
] as const;

export type BrandValuePropIcon = "shield" | "people" | "list";

export const brandValueProps = [
  {
    title: "Rights-cleared by default",
    body: "Every profile carries verified consent and an attorney-drafted license. No grey areas, no takedown risk.",
    icon: "shield" as BrandValuePropIcon,
  },
  {
    title: "Real, relatable talent",
    body: "Browse verified creators across looks, voices, and audiences — authentic people your viewers trust, not synthetic stock.",
    icon: "people" as BrandValuePropIcon,
  },
  {
    title: "Built to scale",
    body: "Standardized licenses with defined scope and duration, plus a clear paper trail for every use — from one film to a full campaign.",
    icon: "list" as BrandValuePropIcon,
  },
] as const;

export const legalItems = [
  {
    num: "01",
    title: "Right-of-publicity counsel",
    body: "Drafted by attorneys who practice likeness law.",
  },
  {
    num: "02",
    title: "Defined scope & duration",
    body: "Clear scope, duration, and permitted use.",
  },
  {
    num: "03",
    title: "Enforceable paper trail",
    body: "Signed records aligned with what you approved.",
  },
] as const;

export type BrandAvatarTone = "fall-red" | "fall-gold" | "fall-blue";

export const licenseBriefs = [
  {
    brand: "Northwind Studios",
    initial: "N",
    avatarTone: "fall-red" as BrandAvatarTone,
    detail: "AI campaign · 30s likeness · paid social",
    pay: "$2,400",
    status: "review" as const,
  },
  {
    brand: "Velvet Labs",
    initial: "V",
    avatarTone: "fall-gold" as BrandAvatarTone,
    detail: "Voice + face · product launch film",
    pay: "$5,000",
    status: "review" as const,
  },
  {
    brand: "Lyra AI",
    initial: "L",
    avatarTone: "fall-blue" as BrandAvatarTone,
    detail: "Synthetic media library · 12-month",
    pay: "$850",
    status: "approved" as const,
  },
] as const;

export const heroFloatBriefs = [
  {
    brand: "Northwind Studios",
    initial: "N",
    avatarTone: "fall-red" as BrandAvatarTone,
    detail: "AI campaign · 30s",
    pay: "$2,400",
    showReview: false,
  },
  {
    brand: "Velvet Labs",
    initial: "V",
    avatarTone: "fall-gold" as BrandAvatarTone,
    detail: "Voice + face",
    pay: "$5,000",
    showReview: true,
  },
] as const;

export const controlChecks = [
  {
    sections: [
      {
        title: "Approve the deal",
        body: "Review scope, duration, and rate. It only proceeds when you sign.",
      },
      {
        title: "Decline, anytime",
        body: "Walk away at either checkpoint. No reason needed, no penalty.",
      },
    ],
  },
] as const;

export const securityBadges = [
  { label: "Encrypted storage", icon: "lock" as const },
  { label: "No model training", icon: "x" as const },
  { label: "Never sold", icon: "shield" as const },
] as const;

export const processSteps = [
  {
    title: "Verify",
    hint: "ID + face match",
    body: "Prove it's you once. Buyers trust your vault.",
    icon: "shield" as IconName,
  },
  {
    title: "Vault",
    hint: "Face & voice refs",
    body: "Encrypted storage. Nothing ships without you.",
    icon: "key" as IconName,
  },
  {
    title: "Review",
    hint: "Briefs & rates",
    body: "Accept, counter, or decline every request.",
    icon: "file-text" as IconName,
  },
  {
    title: "Earn",
    hint: "Live use → payout",
    body: "Get paid. Paperwork matches what you signed.",
    icon: "sparkles" as IconName,
  },
] as const;

export type FaqItem = {
  question: string;
  answer: string;
};

/** Edit these six entries — placeholders based on the Muhr creator workflow. */
export const faqItems: FaqItem[] = [
  {
    question: "What is Muhr?",
    answer:
      "Muhr is a licensing marketplace where you earn money when brands use your likeness in AI-generated video ads. You set the terms, approve every use, and get paid. Think of it like stock licensing — but for your face, voice, and presence.",
  },
  {
    question: "Do I need a big social following?",
    answer:
      "No. Muhr is built for most creators and on-camera talent — roughly 5K to 500k followers. Brands are not only looking for celebrities. They want real, relatable people their audiences trust.",
  },
  {
    question: "Is this going to replace me?",
    answer:
      "No. Nothing gets made without your approval. Think of it as a new income stream that runs in the background while you do everything you already do. Your likeness has value — Muhr helps you get paid for it on your terms.",
  },
  {
    question: "How does Muhr help me get more work and compensation?",
    answer:
      "Brands license your likeness to create AI video ads — you approve the use, they pay a license fee, and you earn your cut. You set your own rates. This is passive income that compounds alongside your existing work.",
  },
  {
    question: "Can I say no to a deal?",
    answer:
      "Always. You approve every transaction before anything is created. You also approve the final video before it's delivered to the buyer. Two checkpoints, every time. No explanation required to decline.Payouts are triggered when approved use goes live under the terms you signed. Muhr aligns contracts and delivery records with what you approved so payment matches the deal.",
  },
  {
    question: "What do you do with my data?",
    answer:
      "Your photos and audio are stored in encrypted, access-controlled storage. They're only used to generate a specific, approved video for an active license. We never use your likeness to train AI models or sell your data to third parties.",
  },
  {
    question: "Is there legal protection?",
    answer:
      "Yes. Every agreement can be drafted by entertainment IP attorneys who specialize in right of publicity law. Every transaction is backed by a signed license with clear scope, duration, and permitted uses. If a buyer breaches the agreement, there are legal consequences — and you have the paper trail.",
  },
  {
    question: "Does it cost anything to join?",
    answer:
      "No. It's free to create a profile. We only take a platform fee when you complete a paid transaction — you never pay to be listed or to receive license requests.",
  },

];
