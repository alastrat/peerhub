export * from "./roles";
export * from "./cycle-status";
export * from "./rating-scales";

export const APP_NAME = "Kultiva";
export const APP_DESCRIPTION = "360° Performance Feedback Platform for Modern Teams";

export const DEFAULT_ANONYMITY_THRESHOLD = 3;
export const DEFAULT_MIN_PEERS = 3;
export const DEFAULT_MAX_PEERS = 8;
export const DEFAULT_TOKEN_EXPIRY_DAYS = 14;
export const DEFAULT_INVITATION_EXPIRY_DAYS = 7;

export const PAGINATION_DEFAULT_PAGE_SIZE = 20;
export const PAGINATION_MAX_PAGE_SIZE = 100;

export const CSV_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const CSV_REQUIRED_COLUMNS = ["email", "name"];
export const CSV_OPTIONAL_COLUMNS = [
  "title",
  "department",
  "managerEmail",
  "employeeId",
  "role",
  "startDate",
];
