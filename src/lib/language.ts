export const appLanguages = ['en', 'zh-CN'] as const
export const defaultLanguage = 'en'
export const languageStorageKey = 'maptalks-toolbox.language'

export type AppLanguage = (typeof appLanguages)[number]

export function resolveLanguage(value: unknown): AppLanguage {
  return appLanguages.includes(value as AppLanguage) ? value as AppLanguage : defaultLanguage
}
