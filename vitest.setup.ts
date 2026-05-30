import { createElement } from "react";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/image", () => ({
  default: function MockImage({
    src,
    alt,
  }: {
    src?: string;
    alt?: string;
  }) {
    return createElement("img", {
      src: typeof src === "string" ? src : "",
      alt: alt ?? "",
    });
  },
}));

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
  }: {
    href: string;
    children?: React.ReactNode;
  }) {
    return createElement("a", { href }, children);
  },
}));
