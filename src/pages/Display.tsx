import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { fetchState, useLiveUpdates, type AppState } from '../lib/api'
import './display.css'

const EMPTY_STATE: AppState = { settings: { intervalSeconds: 5 }, images: [] }

const timeFormatter = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Display() {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [awake, setAwake] = useState(true)
  const [clock, setClock] = useState(() => new Date())

  const hideTimer = useRef<number | undefined>(undefined)
  const images = state.images
  const count = images.length
  const interval = state.settings.intervalSeconds
  const activeIndex = count > 0 ? ((index % count) + count) % count : 0
  const currentImage = images[activeIndex]

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState()
      setState(next)
      setError('')
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchState()
      .then((next) => {
        if (!active) return
        setState(next)
        setError('')
      })
      .catch(() => {
        if (active) setError('No se pudo conectar con el servidor.')
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  useLiveUpdates(refresh)

  const wake = useCallback(() => {
    setAwake(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      if (!paused) setAwake(false)
    }, 3200)
  }, [paused])

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => {
      if (!paused) setAwake(false)
    }, 3200)
    return () => window.clearTimeout(hideTimer.current)
  }, [paused])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 15000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (count === 0 || paused) return
    const timer = window.setTimeout(() => {
      setIndex((value) => value + 1)
    }, interval * 1000)
    return () => window.clearTimeout(timer)
  }, [activeIndex, count, interval, paused])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [])

  const goTo = useCallback(
    (step: number) => {
      setIndex((value) => value + step)
      wake()
    },
    [wake],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault()
        setPaused((value) => !value)
        wake()
      } else if (event.key === 'ArrowRight') {
        goTo(1)
      } else if (event.key === 'ArrowLeft') {
        goTo(-1)
      } else if (event.key.toLowerCase() === 'f') {
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, toggleFullscreen, wake])

  return (
    <main
      className={`display${awake || paused ? ' is-awake' : ''}`}
      onMouseMove={wake}
      onPointerDown={wake}
      onTouchStart={wake}
    >
      <div className="display__backdrop" aria-hidden="true">
        <span className="blob blob--one" />
        <span className="blob blob--two" />
        <span className="blob blob--three" />
      </div>

      <header className="display__top">
        <span className="display__brand">
          <span className="display__dot" aria-hidden="true" />
          Cartelera
        </span>
        <div className="display__clock">
          <time dateTime={clock.toISOString()}>{timeFormatter.format(clock)}</time>
          <small>{dateFormatter.format(clock)}</small>
        </div>
      </header>

      {!ready ? (
        <p className="display__message">Cargando cartelera…</p>
      ) : error && count === 0 ? (
        <div className="display__message">
          <p>{error}</p>
          <button type="button" className="button button--light" onClick={() => void refresh()}>
            Reintentar
          </button>
        </div>
      ) : count === 0 ? (
        <div className="display__empty">
          <div className="display__empty-icon">
            <Icon name="image" size={44} strokeWidth={1.6} />
          </div>
          <h1>¡La cartelera está lista para brillar!</h1>
          <p>Sube las primeras imágenes desde el panel de administración.</p>
          <a className="button button--sun" href="#/admin">
            Abrir panel
          </a>
        </div>
      ) : (
        <section className="stage" aria-live="polite">
          {images.map((image, position) => (
            <img
              key={image.id}
              className={`slide${position === activeIndex ? ' is-active' : ''}`}
              src={image.url}
              alt=""
              draggable={false}
            />
          ))}
        </section>
      )}

      {count > 0 && (
        <footer className="display__bottom">
          <div className="progress" aria-hidden="true">
            <span
              key={activeIndex}
              style={{
                animationDuration: `${interval}s`,
                animationPlayState: paused ? 'paused' : 'running',
              }}
            />
          </div>
          <div className="display__meta">
            <span className="display__counter">
              {String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
            <span className="display__caption">{currentImage?.filename.replace(/\.[^.]+$/, '')}</span>
          </div>
        </footer>
      )}

      <div className="controls">
        <button type="button" className="controls__button" aria-label="Imagen anterior" onClick={() => goTo(-1)}>
          <Icon name="prev" />
        </button>
        <button
          type="button"
          className="controls__button controls__button--primary"
          aria-label={paused ? 'Reanudar' : 'Pausar'}
          onClick={() => {
            setPaused((value) => !value)
            wake()
          }}
        >
          <Icon name={paused ? 'play' : 'pause'} />
        </button>
        <button type="button" className="controls__button" aria-label="Imagen siguiente" onClick={() => goTo(1)}>
          <Icon name="next" />
        </button>
        <button type="button" className="controls__button" aria-label="Pantalla completa" onClick={toggleFullscreen}>
          <Icon name="expand" />
        </button>
        <a className="controls__button controls__button--link" href="#/admin" aria-label="Panel de administración">
          <Icon name="settings" />
        </a>
      </div>

      {paused && <span className="paused-badge">En pausa</span>}
    </main>
  )
}
