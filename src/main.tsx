import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './i18n'
import './styles.scss'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) throw new Error('Application root was not found.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
