import type { LicenseHubTab } from "@/lib/license/hubTabs";

export const LICENSE_HUB_COPY = {
  title: "Your license inbox",
  subtitle: "Review briefs, manage active deals, set your rates, and keep every signed contract.",
  tabs: {
    inbox: {
      empty: {
        title: "No pending requests",
        description: "New brand briefs will show up here for you to review.",
      },
      footnote:
        "Two checkpoints before you can accept: review the brief, then approve the final cut before anything ships.",
    },
    active: {
      hint: "Accepted deals — open a workspace to review cuts and contracts.",
      empty: {
        title: "No active deals",
        description: "Accepted licenses appear here until they close.",
      },
    },
    history: {
      hint: "Declined, withdrawn, and closed requests.",
      empty: {
        title: "No past requests",
        description: "Your licensing history will appear here.",
      },
    },
    "rules-and-rates": {
      intro: "Set base prices and usage rules. Briefs that break a rule won't reach your inbox.",
    },
  } satisfies Record<
    LicenseHubTab,
    { hint?: string; intro?: string; footnote?: string; empty?: { title: string; description: string } }
  >,
  rulesAndRates: {
    rates: {
      title: "Your rates",
      description: "Starting prices brands see. You can still negotiate per brief.",
    },
    usage: {
      title: "Usage rules",
      description: "Turn on what brands can request. Off toggles are hidden from your public form.",
    },
    regions: {
      label: "User permitted regions",
      hint: "",
    },
    saveLabel: "Save rates",
    otherUsage: {
      toggleLabel: "Other",
      toggleHint: "Non-standard or uncategorized briefs.",
      notesLabel: "Other notes",
      notesHint: "Visible to you and brands on your profile and in license workspaces.",
      notesPlaceholder: "e.g. podcasts, internal training, or custom formats.",
    },
  },
} as const;
