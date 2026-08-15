import { ExternalLink, KeyRound, ShieldCheck, Trash2, X } from 'lucide-react'
import { type FormEvent, type MouseEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AMapCredentials } from '../lib/credentials'

interface CredentialsDialogProps {
  open: boolean
  initial: AMapCredentials | null
  canClose: boolean
  onClose: () => void
  onSave: (credentials: AMapCredentials) => void
  onClear: () => void
}

export default function CredentialsDialog({
  open,
  initial,
  canClose,
  onClose,
  onSave,
  onClear,
}: CredentialsDialogProps) {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '')
  const [securityCode, setSecurityCode] = useState(initial?.securityCode ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setApiKey(initial?.apiKey ?? '')
    setSecurityCode(initial?.securityCode ?? '')
    setError('')
  }, [open, initial])

  if (!open) return null

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (!apiKey.trim() || !securityCode.trim()) {
      setError(t('credentials.required'))
      return
    }
    onSave({ apiKey, securityCode })
  }

  const closeBackdrop = (event: MouseEvent<HTMLDivElement>): void => {
    if (canClose && event.target === event.currentTarget) onClose()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={closeBackdrop}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="credentials-title">
        <header className="dialog-header">
          <span className="dialog-icon"><KeyRound size={19} /></span>
          <div>
            <h2 id="credentials-title">{t('credentials.title')}</h2>
            <p>{t('credentials.subtitle')}</p>
          </div>
          {canClose && (
            <button className="icon-button" type="button" title={t('credentials.close')} onClick={onClose}><X size={18} /></button>
          )}
        </header>

        <form onSubmit={submit}>
          <div className="credential-privacy" role="note">
            <ShieldCheck size={18} />
            <div>
              <strong>{t('credentials.privacyTitle')}</strong>
              <span>{t('credentials.privacyBody')}</span>
            </div>
          </div>
          <label>
            <span>{t('credentials.apiKey')}</span>
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} name="api-key" autoComplete="off" placeholder={t('credentials.apiPlaceholder')} />
          </label>
          <label>
            <span>{t('credentials.securityCode')}</span>
            <input value={securityCode} onChange={(event) => setSecurityCode(event.target.value)} name="security-code" type="password" autoComplete="off" placeholder={t('credentials.securityPlaceholder')} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-links">
            <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noreferrer">{t('credentials.console')} <ExternalLink size={14} /></a>
            <a href="https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare" target="_blank" rel="noreferrer">{t('credentials.guide')} <ExternalLink size={14} /></a>
          </div>
          <footer className="dialog-actions">
            {initial && <button className="button danger" type="button" onClick={onClear}><Trash2 size={16} /> {t('credentials.clear')}</button>}
            <span className="action-spacer" />
            {canClose && <button className="button secondary" type="button" onClick={onClose}>{t('credentials.cancel')}</button>}
            <button className="button primary" type="submit">{t('credentials.save')}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
