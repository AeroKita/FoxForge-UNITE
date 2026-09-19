export type ShareResult = "shared" | "copied" | "failed";

export type ShareNav = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, "writeText">;
};

/** Web Share API first, clipboard second. */
export async function shareLink(
  url: string,
  title: string,
  nav: ShareNav = navigator,
): Promise<ShareResult> {
  try {
    if (nav.share) {
      await nav.share({ url, title });
      return "shared";
    }
  } catch {
    /* canceled or unsupported — fall back to clipboard */
  }
  try {
    if (nav.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    /* clipboard blocked */
  }
  return "failed";
}
