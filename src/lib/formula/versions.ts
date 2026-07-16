export const FORMULA_VERSION = "ww-2.0.0";

export const BUILD_GRADE = ["standard", "good", "excellent"] as const;

export type BuildGrade = (typeof BUILD_GRADE)[number];
