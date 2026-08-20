export const toastCopy = {
  studyImported: "Study imported.",
  pgnParseFailed: "That PGN could not be parsed.",
  studyDeleted: "Study deleted.",
  studyDeletedStorageWarning:
    "Study deleted. The stored PGN file could not be removed.",
  studyRenamed: "Study renamed.",
  studyReimported: "Study reimported. Matching progress was preserved.",
  settingsSaved: "Settings saved.",
  sessionCompleted: "Session complete.",
  reviewCompleted: "Review complete.",
  serverError: "Something went wrong. Please try again.",
  auth: {
    login: "Welcome back.",
    signup: "Your account is ready.",
    confirmed: "Your email has been confirmed.",
    oauth: "Signed in with Google.",
    recovery: "Recovery link verified.",
    "password-updated": "Your password has been updated.",
    "signed-out": "You have been signed out.",
    "callback-error": "The sign-in link is invalid or has expired.",
  },
} as const;
