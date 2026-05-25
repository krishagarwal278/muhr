import Image, { type ImageProps } from "next/image";

/**
 * Renders a Supabase signed storage URL directly. Skips `/_next/image` so dev/prod
 * does not time out re-fetching short-lived, user-scoped signed URLs.
 */ 
export function SignedStorageImage({ alt = "", ...props }: ImageProps) {
  return <Image alt={alt} {...props} unoptimized />;
}
