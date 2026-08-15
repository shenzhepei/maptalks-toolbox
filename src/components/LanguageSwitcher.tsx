import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppLanguage } from '../lib/language'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return (
    <label className="language-switcher" title={t('language.label')}>
      <Languages size={16} aria-hidden="true" />
      <select
        aria-label={t('language.label')}
        value={i18n.language}
        onChange={(event) => void i18n.changeLanguage(event.target.value as AppLanguage)}
      >
        <option value="en">{t('language.english')}</option>
        <option value="zh-CN">{t('language.chinese')}</option>
      </select>
    </label>
  )
}
