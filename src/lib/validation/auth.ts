import { z } from "zod";

export const signUpSchema = z.object({
  email: z.email().max(320),
  displayName: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(72),
});
