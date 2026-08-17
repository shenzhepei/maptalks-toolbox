import { Code2, Menu, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

interface AppTopbarProps {
  onOpenTools: () => void
  onOpenSettings: () => void
}

export default function AppTopbar({ onOpenTools, onOpenSettings }: AppTopbarProps) {
  const { t } = useTranslation()

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" type="button" title={t('app.openTools')} onClick={onOpenTools}>
        <Menu size={19} />
      </button>
      <a className="brand" href="./" aria-label={t('app.home')}>
        <span className="brand-mark">M</span>
        <span><strong>{t('app.brand')}</strong><small>{t('app.powered')}</small></span>
      </a>
      <div className="topbar-actions">
        <a className="icon-button" href="https://github.com/shenzhepei/maptalks-toolbox" target="_blank" rel="noreferrer" title="GitHub">
          <Code2 size={19} />
        </a>
        <LanguageSwitcher />
        <button className="icon-button" type="button" title={t('app.settings')} onClick={onOpenSettings}>
          <Settings size={19} />
        </button>
      </div>
    </header>
  )
}
