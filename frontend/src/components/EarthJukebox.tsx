'use client'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { loginUser, logoutUser, registerUser } from '@/app/(frontend)/actions'
import type { AppUser } from '@/lib/app-auth'
import {
  getClimateAudio,
  getClimateData,
  getHaptics,
  getSeaIceData,
  getSeaIceAudio,
  type ClimateResponse,
  type SeaIceResponse,
} from '@/lib/earth-jukebox-api'
import { useGeminiLive } from '@/lib/useGeminiLive'

type Screen =
  | 'welcome'
  | 'register'
  | 'onboarding'
  | 'home'
  | 'player'
  | 'voice'
  | 'settings'
  | 'learn'
type Theme = 'dark' | 'light' | 'contrast'

const accessNeedOptions = [
  {
    id: 'vision',
    title: 'Blind or low vision',
    description: 'Voice-first navigation, detailed descriptions, and strong contrast.',
    icon: 'learn',
  },
  {
    id: 'hearing',
    title: 'Deaf or hard of hearing',
    description: 'Live captions, visual sound meters, and vibration confirmations.',
    icon: 'vibration',
  },
  {
    id: 'motor',
    title: 'Motor or mobility disability',
    description: 'Hands-free controls, larger targets, and extra response time.',
    icon: 'mic',
  },
  {
    id: 'cognitive',
    title: 'Cognitive or learning disability',
    description: 'Plain language, paced guidance, and one clear action at a time.',
    icon: 'learn',
  },
  {
    id: 'sensory',
    title: 'Sensory sensitivity',
    description: 'Calmer sounds, reduced motion, and safe-volume protection.',
    icon: 'waves',
  },
  {
    id: 'speech',
    title: 'Speech disability',
    description: 'Command chips, keyboard alternatives, and yes or no responses.',
    icon: 'mic',
  },
]

const earthImage =
  'https://images.unsplash.com/photo-1777047023536-8e47688b77f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400'

const datasets = [
  {
    id: 'temperature',
    name: 'Temperature',
    value: '+1.2Â°C',
    description: 'Rising pitch means warmer temperatures.',
    color: 'red',
    icon: 'temperature',
  },
  {
    id: 'ice',
    name: 'Sea Ice',
    value: 'âˆ’12.6%',
    description: 'A thinning chord means melting ice.',
    color: 'cyan',
    icon: 'ice',
  },
  {
    id: 'forests',
    name: 'Forests',
    value: 'âˆ’4.7M ha',
    description: 'Fading birdsong signals forest loss.',
    color: 'green',
    icon: 'forest',
  },
  {
    id: 'sea',
    name: 'Sea Level',
    value: '+9.1 cm',
    description: 'A deepening drone means rising seas.',
    color: 'blue',
    icon: 'waves',
  },
  {
    id: 'rain',
    name: 'Rainfall',
    value: '+8.4%',
    description: 'Faster rhythm means heavier rain.',
    color: 'amber',
    icon: 'rain',
  },
]

const navItems = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'player', label: 'Player', icon: 'play' },
  { id: 'voice', label: 'Voice', icon: 'mic' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'learn', label: 'Learn', icon: 'learn' },
] as const

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  const paths: Record<string, React.ReactNode> = {
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4Z" />
      </>
    ),
    pause: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 9v6M14 9v6" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19 13.5v-3l-2-.6a7 7 0 0 0-.8-1.8l1-1.9-2.1-2.1-1.9 1a7 7 0 0 0-1.8-.8L10.5 2h-3l-.6 2.3a7 7 0 0 0-1.8.8l-1.9-1-2.1 2.1 1 1.9a7 7 0 0 0-.8 1.8L-1 10.5v3l2.3.6a7 7 0 0 0 .8 1.8l-1 1.9 2.1 2.1 1.9-1a7 7 0 0 0 1.8.8l.6 2.3h3l.6-2.3a7 7 0 0 0 1.8-.8l1.9 1 2.1-2.1-1-1.9a7 7 0 0 0 .8-1.8Z"
          transform="translate(2)"
        />
      </>
    ),
    learn: (
      <>
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z" />
        <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z" />
      </>
    ),
    temperature: (
      <>
        <path d="M10 14.8V5a3 3 0 0 1 6 0v9.8a5 5 0 1 1-6 0Z" />
        <path d="M13 6v10" />
      </>
    ),
    ice: (
      <>
        <path d="m12 2 2.2 3.8h4.4l-2.2 3.8 2.2 3.8h-4.4L12 17.2l-2.2-3.8H5.4l2.2-3.8-2.2-3.8h4.4Z" />
        <path d="M12 17v5" />
      </>
    ),
    forest: (
      <>
        <path d="m12 2-5 7h3l-5 7h14l-5-7h3Z" />
        <path d="M12 16v6" />
      </>
    ),
    waves: (
      <>
        <path d="M2 7c3-3 5 3 8 0s5 3 8 0 4 0 4 0M2 12c3-3 5 3 8 0s5 3 8 0 4 0 4 0M2 17c3-3 5 3 8 0s5 3 8 0 4 0 4 0" />
      </>
    ),
    rain: (
      <>
        <path d="M7 16a5 5 0 1 1 1-9.9A7 7 0 0 1 21 10a6 6 0 0 1-1 3.3" />
        <path d="m8 18-1 3m6-3-1 3m6-3-1 3" />
      </>
    ),
    volume: (
      <>
        <path d="M11 5 6 9H2v6h4l5 4Z" />
        <path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12" />
      </>
    ),
    vibration: (
      <>
        <rect x="7" y="4" width="10" height="16" rx="2" />
        <path d="M3 8v8M21 8v8" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    back: <path d="m15 18-6-6 6-6" />,
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
      </>
    ),
    stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4" />
        <path d="M4 19h16" />
      </>
    ),
    wifiOff: (
      <>
        <path d="m3 3 18 18M8.5 8.5A9 9 0 0 1 21 10M3 10a15 15 0 0 1 2.2-1.6M7.5 14a7 7 0 0 1 5.5-1M12 19h.01" />
      </>
    ),
    undo: (
      <>
        <path d="m9 7-5 5 5 5" />
        <path d="M5 12h8a6 6 0 0 1 6 6" />
      </>
    ),
  }
  return <svg {...common}>{paths[name] ?? paths.globe}</svg>
}

function Button({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: string
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {icon && <Icon name={icon} size={22} />}
      <span>{children}</span>
    </button>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </div>
      <button
        className="toggle"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  )
}

function RangeControl({
  label,
  value,
  unit = '%',
  min = 0,
  max = 100,
  onChange,
}: {
  label: string
  value: number
  unit?: string
  min?: number
  max?: number
  onChange: (n: number) => void
}) {
  return (
    <label className="range-control">
      <span>
        <strong>{label}</strong>
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Header({
  theme,
  setTheme,
  offline,
  setOffline,
  user,
  onRegister,
  onLogout,
}: {
  theme: Theme
  setTheme: (theme: Theme) => void
  offline: boolean
  setOffline: (value: boolean) => void
  user: AppUser | null
  onRegister: () => void
  onLogout: () => void
}) {
  return (
    <>
      {offline && (
        <div className="offline-banner" role="status">
          <Icon name="wifiOff" size={20} />
          <span>
            <strong>Youâ€™re offline.</strong> Saved sounds are still available.
          </span>
          <button onClick={() => setOffline(false)}>Reconnect</button>
        </div>
      )}
      <header className="topbar">
        <button
          className="brand"
          onClick={() => window.location.reload()}
          aria-label="Earth Jukebox, restart app"
        >
          <span className="brand-mark">
            <Icon name="globe" size={26} />
          </span>
          <span>Earth Jukebox</span>
        </button>
        <div className="topbar-actions">
          <button
            className="icon-button connectivity"
            onClick={() => setOffline(!offline)}
            aria-label={offline ? 'Reconnect to data' : 'Simulate offline mode'}
            title="Connection status"
          >
            <span className={`status-dot ${offline ? 'is-offline' : ''}`} />
            <span className="desktop-only">{offline ? 'Offline' : 'Live data'}</span>
          </button>
          <div className="theme-switcher" aria-label="Color theme">
            {(['dark', 'light', 'contrast'] as Theme[]).map((mode) => (
              <button
                key={mode}
                className={theme === mode ? 'active' : ''}
                onClick={() => setTheme(mode)}
                aria-pressed={theme === mode}
              >
                {mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'High contrast'}
              </button>
            ))}
          </div>
          {user ? (
            <div className="account-menu">
              <span className="account-avatar" aria-hidden="true">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="desktop-only">{user.name}</span>
              <button onClick={onLogout}>Sign out</button>
            </div>
          ) : (
            <button className="account-button" onClick={onRegister}>
              Register
            </button>
          )}
        </div>
      </header>
    </>
  )
}

function Navigation({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={screen === item.id ? 'active' : ''}
          onClick={() => setScreen(item.id)}
          aria-current={screen === item.id ? 'page' : undefined}
        >
          <Icon name={item.icon} size={23} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

function Welcome({
  onStart,
  onVoice,
  onRegister,
}: {
  onStart: () => void
  onVoice: () => void
  onRegister: () => void
}) {
  return (
    <main className="welcome-page" id="main-content">
      <div className="stars" aria-hidden="true" />
      <section className="welcome-copy">
        <div className="eyebrow">
          <span className="pulse-dot" /> NASA Earth data, translated
        </div>
        <div className="hero-logo" aria-hidden="true">
          <Icon name="globe" size={64} />
        </div>
        <h1>Earth Jukebox</h1>
        <p className="tagline">
          Donâ€™t just see how our planet is changing. <em>Hear it.</em>
        </p>
        <p className="intro">
          Explore our changing world through sound, music, vibration, and clear spoken descriptions.
        </p>
        <div className="welcome-actions">
          <Button onClick={onStart} icon="play">
            Start listening
          </Button>
          <Button onClick={onVoice} icon="mic" variant="secondary">
            Talk to Earth Jukebox
          </Button>
          <Button onClick={onRegister} icon="settings" variant="ghost">
            Register & personalize
          </Button>
        </div>
        <p className="privacy-note">
          Nothing plays until you choose. Registration is optional and lets your accessibility
          preferences follow you across devices.
        </p>
      </section>
      <aside className="earth-visual" aria-label="Earth seen from space">
        <Image
          src={earthImage}
          alt="Earth seen from space, with blue oceans and swirling white clouds"
          width={680}
          height={680}
          priority
        />
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="data-callout data-callout-one">
          <span>Pitch</span>
          <strong>+12%</strong>
        </div>
        <div className="data-callout data-callout-two">
          <span>Rhythm</span>
          <strong>68 BPM</strong>
        </div>
        <p>NASA Earth observation data</p>
      </aside>
    </main>
  )
}

function AccountSetup({
  onBack,
  onAuthenticated,
}: {
  onBack: () => void
  onAuthenticated: (user: AppUser) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accessNeeds, setAccessNeeds] = useState<string[]>([])
  const [interactionMode, setInteractionMode] = useState('voice-and-touch')
  const [responseDetail, setResponseDetail] = useState('balanced')
  const [confirmationStyle, setConfirmationStyle] = useState('spoken-and-visual')
  const [extraResponseTime, setExtraResponseTime] = useState(false)

  const toggleNeed = (id: string) => {
    setAccessNeeds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const chooseRecommendedPreferences = () => {
    if (accessNeeds.includes('vision')) {
      setInteractionMode('voice-first')
      setResponseDetail('detailed')
      setConfirmationStyle('spoken')
    } else if (accessNeeds.includes('hearing')) {
      setInteractionMode('touch-first')
      setConfirmationStyle('vibration-and-visual')
    } else if (accessNeeds.includes('motor')) {
      setInteractionMode('voice-first')
      setExtraResponseTime(true)
    } else if (accessNeeds.includes('cognitive')) {
      setResponseDetail('brief')
      setExtraResponseTime(true)
    } else if (accessNeeds.includes('speech')) {
      setInteractionMode('touch-first')
      setConfirmationStyle('visual')
    }
    setStep(2)
  }

  const submit = () => {
    setMessage('')
    startTransition(async () => {
      const result =
        mode === 'login'
          ? await loginUser({ email, password })
          : await registerUser({
              name,
              email,
              password,
              accessNeeds,
              interactionMode,
              responseDetail,
              confirmationStyle,
              extraResponseTime,
            })
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      onAuthenticated(result.user)
      router.refresh()
    })
  }

  if (mode === 'login') {
    return (
      <main className="account-page" id="main-content">
        <div className="account-topbar">
          <button className="icon-button" onClick={onBack} aria-label="Back">
            <Icon name="back" />
          </button>
          <span className="brand">
            <span className="brand-mark">
              <Icon name="globe" size={25} />
            </span>
            Earth Jukebox
          </span>
        </div>
        <section className="account-card account-card--compact">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in to your account</h1>
          <p>Your saved comfort and voice-assistant preferences will be restored.</p>
          <div className="form-fields">
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>
          {message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
          <Button onClick={submit} disabled={isPending}>
            {isPending ? 'Signing inâ€¦' : 'Sign in'}
          </Button>
          <button
            className="text-button"
            onClick={() => {
              setMode('register')
              setMessage('')
            }}
          >
            New here? Create an account
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="account-page" id="main-content">
      <div className="account-topbar">
        <button
          className="icon-button"
          onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
          aria-label="Back"
        >
          <Icon name="back" />
        </button>
        <div className="step-progress" aria-label={`Registration step ${step + 1} of 3`}>
          {[0, 1, 2].map((item) => (
            <span key={item} className={item <= step ? 'active' : ''} />
          ))}
        </div>
        <span>Step {step + 1} of 3</span>
      </div>
      <section className={`account-card ${step === 1 ? 'account-card--wide' : ''}`}>
        {step === 0 && (
          <>
            <div className="step-icon">
              <Icon name="settings" size={36} />
            </div>
            <p className="eyebrow">Optional account</p>
            <h1>Create your Earth Jukebox account</h1>
            <p>Save your comfort settings securely and use them on any device.</p>
            <div className="form-fields">
              <label>
                Name
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby="password-hint"
                />
                <small id="password-hint">At least 8 characters</small>
              </label>
            </div>
            <div className="account-actions">
              <Button
                onClick={() => {
                  if (!name.trim() || !email.trim() || password.length < 8) {
                    setMessage('Enter your name, a valid email, and a password of 8 characters.')
                    return
                  }
                  setMessage('')
                  setStep(1)
                }}
              >
                Continue <Icon name="arrow" size={20} />
              </Button>
            </div>
            {message && (
              <p className="form-error" role="alert">
                {message}
              </p>
            )}
            <button className="text-button" onClick={() => setMode('login')}>
              Already registered? Sign in
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <p className="eyebrow">Your access needs</p>
            <h1>How can we make this work better for you?</h1>
            <p>
              Choose any that apply, or skip this step. These are access preferences, not a medical
              diagnosis, and they remain private.
            </p>
            <div className="access-needs-grid">
              {accessNeedOptions.map((option) => {
                const selected = accessNeeds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    className={selected ? 'selected' : ''}
                    onClick={() => toggleNeed(option.id)}
                    aria-pressed={selected}
                  >
                    <span className="need-icon">
                      <Icon name={option.icon} />
                    </span>
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="need-check">
                      {selected && <Icon name="check" size={18} />}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="privacy-callout">
              <Icon name="check" />
              <p>
                <strong>You control this information.</strong> It is used only to personalize Earth
                Jukebox and is never shown publicly.
              </p>
            </div>
            <div className="account-actions">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Skip for now
              </Button>
              <Button onClick={chooseRecommendedPreferences}>
                Continue <Icon name="arrow" size={20} />
              </Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="step-icon">
              <Icon name="mic" size={38} />
            </div>
            <p className="eyebrow">Voice assistant setup</p>
            <h1>Choose how the assistant responds</h1>
            <p>We have suggested settings based on your access needs. You can change them.</p>
            <div className="preference-fields">
              <label>
                Main interaction style
                <select
                  value={interactionMode}
                  onChange={(event) => setInteractionMode(event.target.value)}
                >
                  <option value="voice-first">Voice first</option>
                  <option value="voice-and-touch">Voice and touch</option>
                  <option value="touch-first">Touch and keyboard first</option>
                </select>
              </label>
              <label>
                Response detail
                <select
                  value={responseDetail}
                  onChange={(event) => setResponseDetail(event.target.value)}
                >
                  <option value="brief">Short and simple</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed descriptions</option>
                </select>
              </label>
              <label>
                Confirmation style
                <select
                  value={confirmationStyle}
                  onChange={(event) => setConfirmationStyle(event.target.value)}
                >
                  <option value="spoken">Spoken confirmation</option>
                  <option value="visual">Visual confirmation</option>
                  <option value="spoken-and-visual">Spoken and visual</option>
                  <option value="vibration-and-visual">Vibration and visual</option>
                </select>
              </label>
              <Toggle
                checked={extraResponseTime}
                onChange={setExtraResponseTime}
                label="Extra response time"
                hint="Wait longer before the assistant stops listening"
              />
            </div>
            {message && (
              <p className="form-error" role="alert">
                {message}
              </p>
            )}
            <div className="account-actions">
              <Button onClick={submit} disabled={isPending}>
                {isPending ? 'Creating accountâ€¦' : 'Create account'}
              </Button>
            </div>
            <p className="account-terms">
              By creating an account, you agree to save these preferences securely.
            </p>
          </>
        )}
      </section>
    </main>
  )
}


function Onboarding({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(35)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [mode, setMode] = useState('Both')
  const [voice, setVoice] = useState('Warm and clear')
  const [speed, setSpeed] = useState(0.9)

  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  const titles = [
    "Let's check your sound",
    'How would you like to experience data?',
    'Choose your narration',
  ]

  function stopTone() {
    try {
      oscillatorRef.current?.stop()
    } catch {
      // The oscillator may already have stopped.
    }

    oscillatorRef.current?.disconnect()
    oscillatorRef.current = null
    gainNodeRef.current = null

    const context = audioContextRef.current
    audioContextRef.current = null

    if (context && context.state !== 'closed') {
      void context.close()
    }

    setPlaying(false)
  }

  async function toggleTone() {
    if (playing) {
      stopTone()
      return
    }

    try {
      setAudioError(null)

      const context = new AudioContext()
      audioContextRef.current = context

      await context.resume()

      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = 261.63

      const targetVolume = (volume / 100) * 0.15

      gain.gain.setValueAtTime(0, context.currentTime)
      gain.gain.linearRampToValueAtTime(
        targetVolume,
        context.currentTime + 0.15,
      )

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.start()

      oscillatorRef.current = oscillator
      gainNodeRef.current = gain

      setPlaying(true)
    } catch (error) {
      console.error('Comfort sound playback failed:', error)
      stopTone()
      setAudioError('Audio could not start. Check your browser sound settings and try again.')
    }
  }

  function changeVolume(nextVolume: number) {
    setVolume(nextVolume)

    const context = audioContextRef.current
    const gain = gainNodeRef.current

    if (context && gain) {
      gain.gain.setTargetAtTime(
        (nextVolume / 100) * 0.15,
        context.currentTime,
        0.03,
      )
    }
  }

  useEffect(() => {
    return () => {
      const oscillator = oscillatorRef.current
      const context = audioContextRef.current

      try {
        oscillator?.stop()
      } catch {
        // Already stopped.
      }

      oscillator?.disconnect()

      if (context && context.state !== 'closed') {
        void context.close()
      }

      oscillatorRef.current = null
      gainNodeRef.current = null
      audioContextRef.current = null
    }
  }, [])

  return (
    <main className="onboarding-page" id="main-content">
      <div className="onboarding-header">
        <button className="icon-button" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>

        <div className="step-progress" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((item) => (
            <span key={item} className={item <= step ? 'active' : ''} />
          ))}
        </div>

        <span>Step {step + 1} of 3</span>
      </div>

      <section className="onboarding-card">
        <div className="step-icon">
          <Icon
            name={step === 0 ? 'volume' : step === 1 ? 'vibration' : 'mic'}
            size={38}
          />
        </div>

        <p className="eyebrow">Comfort setup</p>
        <h1>{titles[step]}</h1>

        {step === 0 && (
          <>
            <p>
              Play a gentle tone, then set it to a comfortable level.
              It will never start automatically.
            </p>

            <button
              className={`sound-test ${playing ? 'playing' : ''}`}
              onClick={toggleTone}
              aria-pressed={playing}
            >
              <span className="wave-bars" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <i key={n} />
                ))}
              </span>

              <strong>
                {playing ? 'Stop gentle tone' : 'Play gentle tone'}
              </strong>

              <span>
                {playing ? 'A soft, steady C note is playing' : 'Nothing is playing'}
              </span>
            </button>

            {audioError && (
              <p className="form-error" role="alert">
                {audioError}
              </p>
            )}

            <RangeControl
              label="Test volume"
              value={volume}
              onChange={changeVolume}
            />
          </>
        )}

        {step === 1 && (
          <div className="choice-grid" role="radiogroup" aria-label="Output preference">
            {[
              ['Audio', 'volume', 'Hear musical data'],
              ['Vibration', 'vibration', 'Feel patterns'],
              ['Both', 'waves', 'Hear and feel together'],
            ].map(([label, icon, description]) => (
              <button
                key={label}
                role="radio"
                aria-checked={mode === label}
                className={mode === label ? 'selected' : ''}
                onClick={() => setMode(label)}
              >
                <Icon name={icon} size={30} />
                <strong>{label}</strong>
                <span>{description}</span>

                {mode === label && (
                  <span className="choice-check">
                    <Icon name="check" size={18} />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <>
            <div className="voice-options" role="radiogroup" aria-label="Narration voice">
              {['Warm and clear', 'Low and steady', 'Bright and expressive'].map((item) => (
                <button
                  key={item}
                  role="radio"
                  aria-checked={voice === item}
                  className={voice === item ? 'selected' : ''}
                  onClick={() => setVoice(item)}
                >
                  <span>
                    <strong>{item}</strong>
                    <small>Preview voice</small>
                  </span>
                  <span className="radio-dot" />
                </button>
              ))}
            </div>

            <label className="select-label">
              Narration speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                <option value={0.75}>Slower — 0.75×</option>
                <option value={0.9}>Gentle — 0.9×</option>
                <option value={1}>Standard — 1×</option>
                <option value={1.25}>Faster — 1.25×</option>
              </select>
            </label>
          </>
        )}

        <div className="onboarding-actions">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}

          <Button
            onClick={() => {
              if (step < 2) {
                setStep(step + 1)
              } else {
                stopTone()
                onComplete()
              }
            }}
          >
            {step < 2 ? 'Continue' : 'Finish setup'} <Icon name="arrow" size={20} />
          </Button>
        </div>
      </section>

      <p className="setup-note">
        You can change any of these choices later in Comfort settings.
      </p>
    </main>
  )
}
function Home({
  setScreen,
  showInstall,
  dismissInstall,
}: {
  setScreen: (s: Screen) => void
  showInstall: boolean
  dismissInstall: () => void
}) {
  const [previewing, setPreviewing] = useState<string | null>(null)

const previewAudioRef = useRef<HTMLAudioElement | null>(null)

const togglePreview = async (datasetId: string) => {if (datasetId !== 'temperature' && datasetId !== 'rain') {
  return
}
  if (previewing === datasetId) {
    previewAudioRef.current?.pause()
    previewAudioRef.current = null
    setPreviewing(null)
    return
  }

  previewAudioRef.current?.pause()

 const startDate = datasetId === 'rain' ? '2025-07-01' : '2025-01-01'
const endDate = datasetId === 'rain' ? '2025-07-10' : '2025-01-05'

const audio = new Audio(
  `/api/nasa/sonify/audio?latitude=28.6139&longitude=77.2090&start_date=${startDate}&end_date=${endDate}&dataset=${datasetId}`
)

  previewAudioRef.current = audio
  setPreviewing(datasetId)

  audio.onended = () => setPreviewing(null)
  audio.onerror = () => setPreviewing(null)

  try {
    await audio.play()
  } catch (error) {
    console.error('Preview playback failed:', error)
    setPreviewing(null)
  }
}

  const [climate, setClimate] = useState<ClimateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadClimate() {
      try {
        setLoading(true)
        setError(null)

        const today = new Date()
        const end = new Date(today)
        end.setDate(today.getDate() - 2)

        const start = new Date(end)
        start.setDate(end.getDate() - 6)

        const formatDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        const result = await getClimateData({
          latitude: 28.6139,
          longitude: 77.209,
          startDate: formatDate(start),
          endDate: formatDate(end),
        })

        if (!cancelled) setClimate(result)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load NASA data.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadClimate()

    return () => {
      cancelled = true
    }
  }, [])

  const validRecords =
    climate?.records.filter(
      (record) =>
        record.temperature_celsius !== null &&
        record.rainfall_mm !== null,
    ) ?? []

  const latestRecord = validRecords[validRecords.length - 1]

  const temperatureValue =
    latestRecord?.temperature_celsius != null
      ? `${latestRecord.temperature_celsius.toFixed(1)}°C`
      : '—'

  const rainfallValue =
    latestRecord?.rainfall_mm != null
      ? `${latestRecord.rainfall_mm.toFixed(1)} mm`
      : '—'

  const displayDatasets = datasets.map((dataset) => {
    if (dataset.id === 'temperature') {
      return {
        ...dataset,
        value: loading ? 'Loading...' : error ? 'Unavailable' : temperatureValue,
        description: 'Latest NASA POWER daily temperature reading',
        live: true,
      }
    }

    if (dataset.id === 'rain') {
      return {
        ...dataset,
        value: loading ? 'Loading...' : error ? 'Unavailable' : rainfallValue,
        description: 'Latest NASA POWER daily rainfall reading',
        live: true,
      }
    }

    return {
      ...dataset,
      value: 'Coming soon',
      description: 'This dataset is not connected yet.',
      live: false,
    }
  })

return (
    <main className="content" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Live Earth signals</p>
          <h1>What would you like to hear?</h1>
          <p>Each dataset has its own sound language. Choose one to begin.</p>
        </div>
        <Button variant="secondary" icon="mic" onClick={() => setScreen('voice')}>
          Ask by voice
        </Button>
      </div>

      {showInstall && (
        <div className="install-prompt" role="region" aria-label="Install Earth Jukebox">
          <span className="install-icon">
            <Icon name="download" />
          </span>
          <div>
            <strong>Take Earth Jukebox with you</strong>
            <p>Install for faster access and saved sounds offline.</p>
          </div>
          <Button onClick={dismissInstall}>Install app</Button>
          <button
            className="icon-button"
            onClick={dismissInstall}
            aria-label="Dismiss install prompt"
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      <section aria-labelledby="datasets-title">
        <div className="section-title">
          <h2 id="datasets-title">Explore Earth data</h2>
          <span>
            {loading ? 'Fetching NASA data...' : error ? 'Data unavailable' : 'NASA POWER · Delhi'}
          </span>
        </div>

        {error && (
          <div role="alert" className="install-prompt">
            <p>Could not load climate data: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        )}

        <div className="dataset-grid">
          {displayDatasets.map((dataset) => (
            <article className={`dataset-card accent-${dataset.color}`} key={dataset.id}>
              <div className="dataset-top">
                <span className="dataset-icon">
                  <Icon name={dataset.icon} size={30} />
                </span>
                <span className="data-value">
                  {dataset.value}
                  {dataset.live && <small> latest reading</small>}
                </span>
              </div>

              <h3>{dataset.name}</h3>
              <p>{dataset.description}</p>

              <div className="dataset-actions">
                {dataset.id === 'temperature' || dataset.id === 'rain' ? (
                  <Button
                    variant="ghost"
                    icon={previewing === dataset.id ? 'pause' : 'volume'}
                    onClick={() => void togglePreview(dataset.id)}
                    aria-pressed={previewing === dataset.id}
                  >
                    {previewing === dataset.id ? 'Stop preview' : 'Preview sound'}
                  </Button>
                ) : (
                  <span className="text-sm text-gray-500">
                    Real data coming soon
                  </span>
                )}
<button
                  className="round-arrow"
                  onClick={() => setScreen('player')}
                  aria-label={`Open ${dataset.name} player`}
                  disabled={!dataset.live || loading || !!error || !latestRecord}
                >
                  <Icon name="arrow" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {latestRecord && (
          <p className="eyebrow">
            Latest available reading: {latestRecord.date}
          </p>
        )}
      </section>

      <section className="featured">
        <div className="featured-image">
          <Image
            src={earthImage}
            alt="The Amazon rainforest region seen from Earth orbit"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <span>Featured story</span>
        </div>

        <div className="featured-copy">
          <p className="eyebrow">Earth stories</p>
          <h2>Hear the Amazon change</h2>
          <p>
            Explore how Earth observation data can be transformed into sound.
            Forest change data integration is coming soon.
          </p>
          <Button onClick={() => setScreen('player')} icon="play">
            Explore Earth sounds
          </Button>
        </div>
      </section>
    </main>
  )
}



function Player({ goVoice }: { goVoice: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(35)
  const [vibration, setVibration] = useState(true)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState('1')
  const [climate, setClimate] = useState<ClimateResponse | null>(null)
  const [seaIce, setSeaIce] = useState<SeaIceResponse | null>(null)
  const [dataset, setDataset] = useState<'temperature' | 'rain' | 'sea_ice'>('temperature')
  const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
useEffect(() => {
  if (audioRef.current) {
    audioRef.current.volume = volume / 100
  }
}, [volume, audioUrl])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hapticMessage, setHapticMessage] = useState('')

  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
  let cancelled = false
  let createdUrl: string | null = null

  async function loadPlayerData() {
    try {
      setLoading(true)
      setError(null)
      setPlaying(false)
      audioRef.current?.pause()
      setPosition(0)
      setDuration(0)
      setAudioUrl(null)
      setClimate(null)
      setSeaIce(null)

      let audioBlob: Blob

      if (dataset === 'sea_ice') {
        const end = new Date()
        end.setDate(end.getDate() - 2)

        const start = new Date(end)
        start.setDate(end.getDate() - 6)

        const formatDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        const startDate = formatDate(start)
        const endDate = formatDate(end)

        const [seaIceResult, blob] = await Promise.all([
          getSeaIceData(hemisphere, startDate, endDate),
          getSeaIceAudio(hemisphere, startDate, endDate),
        ])

        if (cancelled) return

        setSeaIce(seaIceResult)
        audioBlob = blob
      } else {
        const today = new Date()
        const end = new Date(today)
        end.setDate(today.getDate() - 2)

        const start = new Date(end)
        start.setDate(end.getDate() - 6)

        const formatDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }

        const params = {
          latitude: 28.6139,
          longitude: 77.209,
          startDate: formatDate(start),
          endDate: formatDate(end),
        }

        const [climateResult, blob] = await Promise.all([
          getClimateData(params),
          getClimateAudio(params),
        ])

        if (cancelled) return

        setClimate(climateResult)
        audioBlob = blob
      }

      if (cancelled) return

      createdUrl = URL.createObjectURL(audioBlob)
      setAudioUrl(createdUrl)
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load Earth data or generate audio.',
        )
      }
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  loadPlayerData()

  return () => {
    cancelled = true

    if (createdUrl) {
      URL.revokeObjectURL(createdUrl)
    }
  }
}, [retryKey, dataset, hemisphere])
  const latestSeaIceRecord =
  seaIce?.records?.[seaIce.records.length - 1]

const latestSeaIceDate = latestSeaIceRecord?.date ?? 'Waiting for data'
  const validRecords =
    climate?.records.filter(
      (record) =>
        record.temperature_celsius !== null &&
        record.rainfall_mm !== null,
    ) ?? []

  const latestRecord = validRecords[validRecords.length - 1]

  const firstTemperature = validRecords[0]?.temperature_celsius
  const lastTemperature = latestRecord?.temperature_celsius

  const eventType =
    firstTemperature != null && lastTemperature != null
      ? lastTemperature > firstTemperature
        ? 'temperature_increase'
        : lastTemperature < firstTemperature
          ? 'temperature_decrease'
          : 'stable'
      : 'stable'

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return '0:00'

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }
  const latestDate =
  dataset === 'sea_ice'
    ? latestSeaIceDate
    : latestRecord
      ? `${latestRecord.date.slice(0, 4)}-${latestRecord.date.slice(4, 6)}-${latestRecord.date.slice(6, 8)}`
      : 'Waiting for data'

  async function triggerHaptics() {
    if (!vibration) return

    if (typeof navigator === 'undefined') return

    const vibrationNavigator = navigator as Navigator & {
      vibrate?: (pattern: number | number[]) => boolean
    }

    if (typeof vibrationNavigator.vibrate !== 'function') {
      setHapticMessage(
        'This browser or device does not support vibration.',
      )
      return
    }

    try {
      const result = await getHaptics(eventType)

      const supported = vibrationNavigator.vibrate(
        result.haptics.pattern_ms,
      )

      setHapticMessage(
        supported
          ? result.haptics.label
          : 'Vibration is unavailable on this device.',
      )
    } catch {
      setHapticMessage('Could not load the vibration pattern.')
    }
  }

  async function handlePlay() {
    if (!audioRef.current || !audioUrl || loading) return

    try {
      await audioRef.current.play()
      triggerHaptics()
    } catch {
      setError('Audio could not start. Please try again.')
    }
  }

  function handlePause() {
    audioRef.current?.pause()
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    setPosition(0)
    setPlaying(false)
  }

  function handleSpeedChange(value: string) {
    setSpeed(value)

    if (audioRef.current) {
      audioRef.current.playbackRate = Number(value)
    }
  }

  function handleSeek(value: number) {
    setPosition(value)

    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = (value / 100) * duration
    }
  }

  return (
    <main className="content player-content" id="main-content">
      <div className="dataset-controls">
  <label>
    Dataset
    <select
      value={dataset}
      onChange={(event) =>
        setDataset(event.target.value as 'temperature' | 'rain' | 'sea_ice')
      }
    >
      <option value="temperature">Temperature</option>
      <option value="rain">Rainfall</option>
      <option value="sea_ice">Sea Ice</option>
    </select>
  </label>

  {dataset === 'sea_ice' && (
    <label>
      Hemisphere
      <select
        value={hemisphere}
        onChange={(event) =>
          setHemisphere(event.target.value as 'north' | 'south')
        }
      >
        <option value="north">Northern</option>
        <option value="south">Southern</option>
      </select>
    </label>
  )}
</div>
      <div className="player-heading">
        <div>
         <p className="eyebrow">
  {dataset === 'sea_ice'
    ? `NSIDC SEA ICE · ${hemisphere.toUpperCase()}`
    : 'NASA POWER · Delhi'}
</p> 
          <h1>Our changing Earth</h1>
        </div>

        <div className="shortcut-hints">
          <kbd>Space</kbd> Play / pause <kbd>Esc</kbd> Stop
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>!</span>

          <div>
            <strong>Player connection interrupted</strong>
            <p>{error}</p>
          </div>

          <Button
            variant="secondary"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Retry connection
          </Button>
        </div>
      )}

      <div className="player-grid">
        <section className="visual-panel" aria-label="Earth data visualization">
          <div className="visual-image">
            <Image
              src={earthImage}
              alt="Illustrative view of Earth from space"
              fill
              sizes="(max-width: 1050px) 100vw, 55vw"
            />

            <div className="image-overlay">
              <span className="date-badge">{latestDate}</span>
              <span className="source-badge">
                {dataset === 'sea_ice' ? 'NSIDC Sea Ice Index' : 'NASA POWER'}
              </span>
            </div>

            <Icon name="learn" size={20} />
            <span>
              {dataset === 'sea_ice'
                ? latestSeaIceRecord
                  ? `Sea Ice Extent: ${latestSeaIceRecord.extent_million_sq_km.toFixed(3)} million km²`
                  : loading
                    ? 'Fetching Sea Ice readings...'
                    : 'No Sea Ice readings available.'
                : latestRecord
                  ? `Temperature: ${latestRecord.temperature_celsius?.toFixed(1)}°C · Rainfall: ${latestRecord.rainfall_mm?.toFixed(1)} mm`
                  : loading
                    ? 'Fetching climate readings...'
                    : 'No climate readings available.'}
            </span>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl ?? undefined}
            preload="metadata"
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration || 0)
              event.currentTarget.volume = volume / 100
              event.currentTarget.playbackRate = Number(speed)
            }}
            onTimeUpdate={(event) => {
              const audio = event.currentTarget
              setPosition(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0)
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false)
              setPosition(0)
            }}
            onError={() => {
              if (audioUrl && !loading) setError('The generated audio could not be loaded. Please retry.')
            }}
          />

          <RangeControl label="Volume" value={volume} onChange={setVolume} />

          <label className="timeline">
            <span>
              <strong>Audio timeline</strong>
              <output>
                {formatTime(
                  audioRef.current?.currentTime ?? 0,
                )} / {formatTime(duration)}
              </output>
            </span>

            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={position}
              onChange={(event) =>
                handleSeek(Number(event.target.value))
              }
              disabled={!audioUrl || loading}
              aria-label="Audio playback position"
            />

            <small>
              <span>Start</span>
              <span>End</span>
            </small>
          </label>

          <div className="transport">
            <button
              className="play-button"
              onClick={playing ? handlePause : handlePlay}
              aria-label={playing ? 'Pause sound' : 'Play sound'}
              disabled={!audioUrl || loading}
            >
              <Icon
                name={playing ? 'pause' : 'play'}
                size={34}
              />
            </button>

            <label>
              Speed

              <select
                value={speed}
                onChange={(event) =>
                  handleSpeedChange(event.target.value)
                }
              >
                <option value="0.5">0.5×</option>
                <option value="0.75">0.75×</option>
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
            </label>

            <button className="mic-shortcut" onClick={goVoice}>
              <Icon name="mic" />
              <span>Adjust by voice</span>
            </button>
          </div>

          <Toggle
            checked={vibration}
            onChange={setVibration}
            label="Vibration patterns"
            hint={dataset === 'sea_ice' ? 'Feel changes in sea ice data' : 'Feel changes in the climate readings'}
          />

          {hapticMessage && (
            <p role="status" className="eyebrow">
              {hapticMessage}
            </p>
          )}

          <Button
            variant="danger"
            icon="stop"
            className="stop-button"
            onClick={handleStop}
          >
            Stop sound
          </Button>
        </section>
      </div>
    </main>
  )
}

function VoicePanel({ user }: { user: AppUser | null }) {
  const {
    state,
    transcript,
    response,
    error,
    start,
    stop,
    sendText,
  } = useGeminiLive()

  const preferences = user?.assistantPreferences
  const needs = user?.accessNeeds ?? []
  const interactionMode = preferences?.interactionMode ?? 'voice-and-touch'
  const responseDetail = preferences?.responseDetail ?? 'balanced'
  const confirmationStyle = preferences?.confirmationStyle ?? 'spoken-and-visual'
  const isSpeechAlternative = needs.includes('speech') || interactionMode === 'touch-first'

  const stateCopy = {
    idle: [
      user ? `Ready for you, ${user.name.split(' ')[0]}` : 'Ready when you are',
      isSpeechAlternative
        ? 'Connect the microphone or choose a command below.'
        : preferences?.extraResponseTime
          ? 'Tap the microphone when you are ready. You can speak at your own pace.'
          : 'Tap the microphone, then speak naturally.',
    ],
    listening: ['I’m listening', 'Speak naturally. Tap the microphone again to stop.'],
    processing: ['Gemini is thinking', 'Preparing a response.'],
    speaking: [
      confirmationStyle === 'visual' ? 'Gemini responded' : 'Speaking',
      response || 'Here is my response.',
    ],
  }

  const startVoice = () => {
    if (state === 'idle') {
      void start()
    } else {
      stop()
    }
  }

  return (
    <main className="content voice-page" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Voice assistant</p>
          <h1>Talk to Earth Jukebox</h1>
          <p>You can speak naturally and stay in control of your voice session.</p>
        </div>
      </div>

      {user && (
        <section className="personalization-banner" aria-label="Active accessibility profile">
          <span>
            <Icon name="check" />
          </span>
          <div>
            <strong>Personalized for your access needs</strong>
            <p>
              {interactionMode === 'voice-first'
                ? 'Voice-first controls'
                : interactionMode === 'touch-first'
                  ? 'Touch, keyboard, and command-chip controls'
                  : 'Voice and touch controls'}
              {' · '}
              {responseDetail === 'detailed'
                ? 'Detailed descriptions'
                : responseDetail === 'brief'
                  ? 'Short responses'
                  : 'Balanced responses'}
            </p>
          </div>
        </section>
      )}

      <section className={`voice-console voice-${state}`}>
        <div className="voice-rings" aria-hidden="true">
          <span />
          <span />
        </div>

        <button
          className="big-mic"
          onClick={startVoice}
          aria-label={state === 'idle' ? 'Start listening' : 'Stop listening'}
          aria-pressed={state !== 'idle'}
          disabled={state === 'processing'}
        >
          {state === 'processing' ? (
            <span className="processing-dots">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <Icon name={state === 'speaking' ? 'volume' : 'mic'} size={48} />
          )}
        </button>

        <h2 aria-live="polite">{stateCopy[state][0]}</h2>
        <p>{stateCopy[state][1]}</p>

        <div className="transcript" aria-live="polite">
          <span>Live transcript</span>
          <p>{transcript || 'Your words will appear here…'}</p>
        </div>

        {response && (
          <div className="transcript" aria-live="polite">
            <span>Gemini response</span>
            <p>{response}</p>
          </div>
        )}

        {error && (
          <p className="voice-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="commands">
        <h2>Try saying</h2>
        <div>
          {['Lower the pitch', 'Make it softer', 'Switch to vibration', 'Describe the change'].map(
            (item) => (
              <button key={item} onClick={() => sendText(item)}>
                <Icon name="mic" size={18} /> “{item}”
              </button>
            ),
          )}
        </div>
        <p>
          Connect the microphone before using command chips. Audio is streamed to
          Gemini while your voice session is active. Tap the microphone again to stop.
          {isSpeechAlternative && ' Command chips also provide a touch or keyboard alternative.'}
        </p>
      </section>
    </main>
  )
}
function Settings({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  const [volume, setVolume] = useState(45)
  const [pitch, setPitch] = useState(60)
  const [tempo, setTempo] = useState(70)
  const [vibration, setVibration] = useState(55)
  const [narration, setNarration] = useState(90)
  const [textSize, setTextSize] = useState(18)
  const [reduced, setReduced] = useState(false)
  const [safe, setSafe] = useState(true)
  const [style, setStyle] = useState('Ambient')
  const [preset, setPreset] = useState('Standard')

  const selectPreset = (item: string) => {
    setPreset(item)
    if (item === 'Calm') {
      setVolume(30)
      setPitch(35)
      setTempo(40)
      setVibration(25)
    }
    if (item === 'Standard') {
      setVolume(45)
      setPitch(60)
      setTempo(70)
      setVibration(55)
    }
    if (item === 'Vibration only') {
      setVolume(0)
      setVibration(75)
    }
  }
  return (
    <main className="content settings-page" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Personalize your experience</p>
          <h1>Comfort settings</h1>
          <p>Every adjustment applies immediately. Your choices stay on this device.</p>
        </div>
        <span className="saved-state">
          <Icon name="check" size={18} /> Saved
        </span>
      </div>
      <section className="presets">
        <h2>Quick comfort presets</h2>
        <div>
          {['Calm', 'Standard', 'Vibration only'].map((item) => (
            <button
              className={preset === item ? 'selected' : ''}
              onClick={() => selectPreset(item)}
              key={item}
            >
              <Icon
                name={
                  item === 'Vibration only' ? 'vibration' : item === 'Calm' ? 'waves' : 'volume'
                }
              />
              <span>
                <strong>{item}</strong>
                <small>
                  {item === 'Calm'
                    ? 'Softer and slower'
                    : item === 'Standard'
                      ? 'Balanced sound and feel'
                      : 'No audio output'}
                </small>
              </span>
              {preset === item && <Icon name="check" size={20} />}
            </button>
          ))}
        </div>
      </section>
      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-title">
            <span>
              <Icon name="volume" />
            </span>
            <div>
              <h2>Sound & vibration</h2>
              <p>Tune how data feels and sounds.</p>
            </div>
          </div>
          <RangeControl label="Overall volume" value={volume} onChange={setVolume} />
          <RangeControl label="Pitch range" value={pitch} onChange={setPitch} />
          <RangeControl
            label="Tempo"
            value={tempo}
            unit=" BPM"
            min={40}
            max={140}
            onChange={setTempo}
          />
          <label className="select-label">
            Sound style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option>Ambient</option>
              <option>Musical</option>
              <option>Natural sounds</option>
              <option>Simple tones</option>
            </select>
          </label>
          <RangeControl label="Vibration strength" value={vibration} onChange={setVibration} />
        </section>
        <section className="settings-card">
          <div className="settings-title">
            <span>
              <Icon name="learn" />
            </span>
            <div>
              <h2>Narration & display</h2>
              <p>Make information easier to follow.</p>
            </div>
          </div>
          <RangeControl
            label="Narration speed"
            value={narration}
            unit="%"
            min={50}
            max={150}
            onChange={setNarration}
          />
          <RangeControl
            label="Text size"
            value={textSize}
            unit=" px"
            min={18}
            max={28}
            onChange={setTextSize}
          />
          <div className="segmented-setting">
            <strong>Color mode</strong>
            <div>
              {(['dark', 'light', 'contrast'] as Theme[]).map((item) => (
                <button
                  key={item}
                  className={theme === item ? 'active' : ''}
                  onClick={() => setTheme(item)}
                >
                  {item === 'contrast' ? 'High contrast' : item}
                </button>
              ))}
            </div>
          </div>
          <Toggle
            checked={reduced}
            onChange={setReduced}
            label="Reduced motion"
            hint="Minimize animation and transitions"
          />
          <Toggle
            checked={safe}
            onChange={setSafe}
            label="Safe-volume limit"
            hint="Prevent sounds above 75 dB"
          />
        </section>
      </div>
      <div className="settings-footer">
        <Button variant="secondary">Reset to defaults</Button>
        <p>Settings meet WCAG 2.2 AA guidance.</p>
      </div>
    </main>
  )
}

function Learn() {
  const [playing, setPlaying] = useState<string | null>(null)
  return (
    <main className="content learn-page" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Understand the language</p>
          <h1>How to hear Earthâ€™s changes</h1>
          <p>Every sound follows a clear, consistent rule. Play an example to learn it.</p>
        </div>
      </div>
      <section>
        <div className="section-title">
          <h2>Sound legend</h2>
          <span>5 data signals</span>
        </div>
        <div className="legend-list">
          {datasets.map((item) => (
            <article key={item.id}>
              <span className={`dataset-icon accent-${item.color}`}>
                <Icon name={item.icon} />
              </span>
              <div>
                <h3>{item.description.split(' means ')[0]}</h3>
                <p>{item.description}</p>
              </div>
              <span className="sound-symbol" aria-hidden="true">
                {item.id === 'temperature'
                  ? 'â†—  Â·  â†—'
                  : item.id === 'ice'
                    ? 'â‰‹  â‰ˆ  ~'
                    : item.id === 'forests'
                      ? 'â—  â—  â—‹'
                      : item.id === 'sea'
                        ? 'â€”  â–¬  â–°'
                        : 'Â· Â·  Â· Â· Â·  Â· Â· Â· Â·'}
              </span>
              <Button
                variant="ghost"
                icon={playing === item.id ? 'pause' : 'play'}
                onClick={() => setPlaying(playing === item.id ? null : item.id)}
              >
                {playing === item.id ? 'Stop' : 'Play example'}
              </Button>
            </article>
          ))}
        </div>
      </section>
      <section className="sources">
        <div>
          <p className="eyebrow">Trusted information</p>
          <h2>Data sources & credits</h2>
          <p>
            Earth Jukebox translates open Earth science data into sound without changing the
            underlying values.
          </p>
        </div>
        <ul>
          <li>
            <span>NASA</span>
            <div>
              <strong>Goddard Institute for Space Studies</strong>
              <small>Global surface temperature analysis</small>
            </div>
          </li>
          <li>
            <span>NSIDC</span>
            <div>
              <strong>National Snow and Ice Data Center</strong>
              <small>Sea ice extent and change</small>
            </div>
          </li>
          <li>
            <span>GEDI</span>
            <div>
              <strong>Global Ecosystem Dynamics Investigation</strong>
              <small>Forest structure and biomass</small>
            </div>
          </li>
        </ul>
      </section>
    </main>
  )
}

export default function EarthJukebox({ initialUser }: { initialUser: AppUser | null }) {
  const router = useRouter()
  const [isSigningOut, startSignOut] = useTransition()
  const [user, setUser] = useState<AppUser | null>(initialUser)
  const [screen, setScreen] = useState<Screen>(initialUser ? 'home' : 'welcome')
  const [theme, setTheme] = useState<Theme>('dark')
  const [offline, setOffline] = useState(false)
  const [showInstall, setShowInstall] = useState(true)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Earth Jukebox service worker registration failed:', error)
    })
  }, [])
  const inApp = !['welcome', 'register', 'onboarding'].includes(screen)
  const currentContent = useMemo(() => {
    if (screen === 'home')
      return (
        <Home
          setScreen={setScreen}
          showInstall={showInstall}
          dismissInstall={() => setShowInstall(false)}
        />
      )
    if (screen === 'player') return <Player goVoice={() => setScreen('voice')} />
    if (screen === 'voice') return <VoicePanel user={user} />
    if (screen === 'settings') return <Settings theme={theme} setTheme={setTheme} />
    if (screen === 'learn') return <Learn />
    return null
  }, [screen, showInstall, theme, user])

  const signOut = () => {
    if (isSigningOut) return
    startSignOut(async () => {
      await logoutUser()
      setUser(null)
      setScreen('welcome')
      router.refresh()
    })
  }

  return (
    <div className="app" data-theme={theme}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {screen === 'welcome' && (
        <Welcome
          onStart={() => setScreen('onboarding')}
          onVoice={() => setScreen('voice')}
          onRegister={() => setScreen('register')}
        />
      )}
      {screen === 'register' && (
        <AccountSetup
          onBack={() => setScreen('welcome')}
          onAuthenticated={(authenticatedUser) => {
            setUser(authenticatedUser)
            setScreen('home')
          }}
        />
      )}
      {screen === 'onboarding' && (
        <Onboarding onBack={() => setScreen('welcome')} onComplete={() => setScreen('home')} />
      )}
      {inApp && (
        <div className="app-shell">
          <Header
            theme={theme}
            setTheme={setTheme}
            offline={offline}
            setOffline={setOffline}
            user={user}
            onRegister={() => setScreen('register')}
            onLogout={signOut}
          />
          <Navigation screen={screen} setScreen={setScreen} />
          <div className="main-area">{currentContent}</div>
        </div>
      )}
    </div>
  )
}
