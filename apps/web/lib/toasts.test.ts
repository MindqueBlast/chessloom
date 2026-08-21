import { describe, expect, it } from "vitest";

import { toastCopy } from "./toasts";

describe("toastCopy", () => {
  it("covers the design toast events with restrained copy", () => {
    expect(toastCopy.studyImported).toBe("Study imported.");
    expect(toastCopy.pgnParseFailed).toMatch(/PGN/i);
    expect(toastCopy.studyDeleted).toBe("Study deleted.");
    expect(toastCopy.studyDeletedStorageWarning).toMatch(/stored PGN/i);
    expect(toastCopy.settingsSaved).toBe("Settings saved.");
    expect(toastCopy.sessionCompleted).toBe("Session complete.");
    expect(toastCopy.reviewCompleted).toBe("Review complete.");
    expect(toastCopy.serverError).toMatch(/try again/i);
    expect(toastCopy.auth.login).toBe("Welcome back.");
    expect(toastCopy.auth.signup).toBe("Your account is ready.");
    expect(toastCopy.auth["signed-out"]).toBe("You have been signed out.");
    expect(toastCopy.auth["callback-error"]).toMatch(/invalid or has expired/i);
  });
});
