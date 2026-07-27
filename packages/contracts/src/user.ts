import { z } from "zod";

export const unitPreferenceSchema = z.enum(["KG", "LB"]);
export const localePreferenceSchema = z.enum(["vi", "en"]);
export const themePreferenceSchema = z.enum(["LIGHT", "DARK", "SYSTEM"]);

export const userPreferencesSchema = z.strictObject({
  locale: localePreferenceSchema,
  theme: themePreferenceSchema,
  unit: unitPreferenceSchema,
});

export const preferencesPatchRequestSchema = userPreferencesSchema
  .partial()
  .refine((preferences) => Object.keys(preferences).length > 0, {
    error: "At least one preference is required",
  });

export const publicUserSchema = z.strictObject({
  id: z.string().regex(/^[\da-f]{24}$/),
  email: z.email().max(254),
  preferences: userPreferencesSchema,
});

export const meResponseSchema = z.strictObject({
  data: z.strictObject({
    user: publicUserSchema,
  }),
});

export const preferencesResponseSchema = meResponseSchema;

export type UnitPreference = z.infer<typeof unitPreferenceSchema>;
export type LocalePreference = z.infer<typeof localePreferenceSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type PreferencesPatchRequest = z.infer<typeof preferencesPatchRequestSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type PreferencesResponse = z.infer<typeof preferencesResponseSchema>;
