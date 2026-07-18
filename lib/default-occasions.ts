// Platform-default occasions seeded for every tenant (isDefault: true, not owner-deletable).
// Single source of truth for onboarding, the demo seed script, and any backfill.
export type DefaultOccasion = { name: string; slug: string; emoji: string; themeKey: string; sortOrder: number }

export const DEFAULT_OCCASIONS: DefaultOccasion[] = [
  { name: 'Diwali', slug: 'diwali', emoji: '🪔', themeKey: 'diwali', sortOrder: 0 },
  { name: 'Pongal', slug: 'pongal', emoji: '🌾', themeKey: 'pongal', sortOrder: 1 },
  { name: 'Puthandu', slug: 'puthandu', emoji: '🌞', themeKey: 'puthandu', sortOrder: 2 },
  { name: 'Aadi Perukku', slug: 'aadi-perukku', emoji: '🌊', themeKey: 'aadi-perukku', sortOrder: 3 },
  { name: 'Navaratri', slug: 'navaratri', emoji: '🪷', themeKey: 'navaratri', sortOrder: 4 },
  { name: 'Karthigai Deepam', slug: 'karthigai-deepam', emoji: '🕯️', themeKey: 'karthigai-deepam', sortOrder: 5 },
  { name: 'Vinayagar Chaturthi', slug: 'vinayagar-chaturthi', emoji: '🐘', themeKey: 'vinayagar-chaturthi', sortOrder: 6 },
  { name: 'Akshaya Tritiya', slug: 'akshaya-tritiya', emoji: '✨', themeKey: 'akshaya-tritiya', sortOrder: 7 },
  { name: 'Christmas & New Year', slug: 'christmas-new-year', emoji: '🎄', themeKey: 'christmas-new-year', sortOrder: 8 },
]
