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
