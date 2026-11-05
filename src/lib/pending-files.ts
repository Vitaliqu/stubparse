// Holds files dropped on the marketing page while the visitor signs in.
// Lives in module memory, so it survives client-side navigation but not a full reload.

let pending: File[] = [];

export function setPendingFiles(files: File[]) {
  pending = files;
}

/** Reads without clearing (safe to call during render). */
export const peekPendingFiles = (): File[] => pending;

export function clearPendingFiles() {
  pending = [];
}
