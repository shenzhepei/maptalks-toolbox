import { ExternalLink, KeyRound, ShieldCheck, Trash2, X } from 'lucide-react'
import { type FormEvent, type MouseEvent, useEffect, useState } from 'react'
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
      setError('Enter both values to continue.')
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
            <h2 id="credentials-title">Optional AMap services</h2>
            <p>Maptalks works without a key</p>
          </div>
          {canClose && (
            <button className="icon-button" type="button" title="Close" onClick={onClose}><X size={18} /></button>
          )}
        </header>

        <form onSubmit={submit}>
          <div className="credential-privacy" role="note">
            <ShieldCheck size={18} />
            <div>
              <strong>Your service credentials stay local</strong>
              <span>
                This site never receives or uploads your key. It remains in this browser&apos;s local storage until you clear it,
                and is sent directly to AMap only when its services are loaded.
              </span>
            </div>
          </div>
          <label>
            <span>Web JS API key</span>
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} name="api-key" autoComplete="off" placeholder="Enter your key" />
          </label>
          <label>
            <span>Security code</span>
            <input value={securityCode} onChange={(event) => setSecurityCode(event.target.value)} name="security-code" type="password" autoComplete="off" placeholder="Enter your security code" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-links">
            <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noreferrer">AMap console <ExternalLink size={14} /></a>
            <a href="https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare" target="_blank" rel="noreferrer">Setup guide <ExternalLink size={14} /></a>
          </div>
          <footer className="dialog-actions">
            {initial && <button className="button danger" type="button" onClick={onClear}><Trash2 size={16} /> Clear</button>}
            <span className="action-spacer" />
            {canClose && <button className="button secondary" type="button" onClick={onClose}>Cancel</button>}
            <button className="button primary" type="submit">Save services</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
