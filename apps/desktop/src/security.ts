import { shell } from "electron";
import { isSafeExternalUrl } from "./urls";

export function openExternalSafely(raw: string): void {
  if (!isSafeExternalUrl(raw)) {
    return;
  }

  setImmediate(() => {
    void shell.openExternal(raw).catch(() => undefined);
  });
}
