export const DV360_BASE_URL = "https://displayvideo.googleapis.com/v4";
export const BID_MANAGER_BASE_URL = "https://doubleclickbidmanager.googleapis.com/v2";
export const CHARACTER_LIMIT = 25_000;
export const REQUEST_TIMEOUT_MS = 30_000;

export const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/display-video",
  "https://www.googleapis.com/auth/doubleclickbidmanager"
];

// Report files are served from Google Cloud Storage signed URLs
export const REPORT_HOSTS = ["storage.googleapis.com", "storage.cloud.google.com"];
