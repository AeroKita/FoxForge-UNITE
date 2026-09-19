export type ShareResult = "shared" | "copied" | "failed";

export type ShareNav = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, "writeText">;
};

/** Web Share API first, clipboard second. Stub until Part 4. */
export async function shareLink(
  _url: string,
  _title: string,
  _nav: ShareNav = navigator,
): Promise<ShareResult> {
  return "failed";
}
