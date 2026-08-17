import { useTranslation } from 'react-i18next'
import { features, type FeatureId } from '../lib/features'

interface FeatureRailProps {
  activeFeatureId: FeatureId
  onSelect: (id: FeatureId) => void
}

export default function FeatureRail({ activeFeatureId, onSelect }: FeatureRailProps) {
  const { t } = useTranslation()

  return (
    <aside className="feature-rail" aria-label={t('app.toolSelection')}>
      {features.map((feature) => {
        const Icon = feature.icon
        return (
          <button
            key={feature.id}
            type="button"
            className={activeFeatureId === feature.id ? 'active' : ''}
            title={t(`features.${feature.id}.label`)}
            onClick={() => onSelect(feature.id)}
          >
            <Icon size={20} />
            <span>{t(`features.${feature.id}.label`)}</span>
          </button>
        )
      })}
    </aside>
  )
}
