/** Semantic token names for non-CSS consumers. Values live in tokens.css. */
export const colorTokenNames = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "accent",
  "destructive",
  "success",
  "warning",
  "muted",
] as const;

export type ColorTokenName = (typeof colorTokenNames)[number];
