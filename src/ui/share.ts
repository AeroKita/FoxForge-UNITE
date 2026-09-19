export type ShareResult = "shared" | "copied" | "failed" | "canceled";

export type ShareNav = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, "writeText">;
};

function isAbortError(err: unknown): boolean {
  return typeof err === "object" && err != null && "name" in err && err.name === "AbortError";
}

/** Web Share API first, clipboard second. Dismissing the share sheet is cancel, not copy. */
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
  } catch (err) {
    if (isAbortError(err)) return "canceled";
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
