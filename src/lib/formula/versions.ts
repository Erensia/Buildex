// This version identifies the server-side formula bundle, not a client claim.
export const FORMULA_VERSION = "ww-3.5.0";

export const BUILD_GRADE = ["standard", "good", "excellent"] as const;

export type BuildGrade = (typeof BUILD_GRADE)[number];
