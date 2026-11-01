import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import {
  deleteImage,
  fetchState,
  moveImage,
  updateInterval,
  uploadImages,
  useLiveUpdates,
  type AppState,
  type SlideImage,
} from '../lib/api'
import './admin.css'

const EMPTY_STATE: AppState = { settings: { intervalSeconds: 5 }, images: [] }
const QUICK_INTERVALS = [3, 5, 8, 10, 15]

export default function Admin() {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [intervalDraft, setIntervalDraft] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalValue = intervalDraft ?? String(state.settings.intervalSeconds)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState()
      setState(next)
      setError('')
    } catch {
      setError('No se pudo conectar con el servidor.')
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchState()
      .then((next) => {
        if (!active) return
        setState(next)
      })
      .catch(() => {
        if (active) setError('No se pudo conectar con el servidor.')
      })
    return () => {
      active = false
    }
  }, [])

  useLiveUpdates(refresh)

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    setUploading(true)
    setError('')
    setNotice('')

    try {
      const next = await uploadImages(Array.from(fileList))
      setState(next)
      setNotice(fileList.length === 1 ? 'Imagen subida correctamente.' : `${fileList.length} imágenes subidas correctamente.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron subir las imágenes.')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void handleFiles(event.dataTransfer.files)
  }

  const saveInterval = async (event: FormEvent) => {
    event.preventDefault()
    const seconds = Number(intervalValue)

    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 300) {
      setError('El tiempo debe estar entre 1 y 300 segundos.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const next = await updateInterval(seconds)
      setState(next)
      setIntervalDraft(null)
      setNotice(`La cartelera cambiará cada ${next.settings.intervalSeconds} segundos.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el tiempo.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (image: SlideImage) => {
    if (!window.confirm(`¿Eliminar esta imagen?\n${image.filename}`)) return

    setBusyId(image.id)
    setError('')
    setNotice('')

    try {
      const next = await deleteImage(image.id)
      setState(next)
      setNotice('Imagen eliminada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la imagen.')
    } finally {
      setBusyId('')
    }
  }

  const reorder = async (id: string, direction: 'up' | 'down') => {
    setBusyId(id)
    setError('')

    try {
      const next = await moveImage(id, direction)
      setState(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el orden.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="admin">
      <header className="admin__header">
        <a className="admin__brand" href="#/">
          <span className="admin__logo">
            <Icon name="image" size={22} />
          </span>
          <span>
            <strong>Cartelera</strong>
            <small>Panel de administración</small>
          </span>
        </a>
        <a className="button button--ghost" href="#/" target="_blank" rel="noreferrer">
          <Icon name="expand" size={18} />
          Ver pantalla
        </a>
      </header>

      <main className="admin__main">
        <section className="panel panel--upload">
          <h2>Subir imágenes</h2>
          <p className="muted">JPG, PNG, WEBP, GIF o AVIF. Hasta 20 MB por imagen.</p>

          <div
            className={`dropzone${dragging ? ' is-dragging' : ''}${uploading ? ' is-busy' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <span className="dropzone__icon">
              <Icon name={uploading ? 'image' : 'upload'} size={28} />
            </span>
            <strong>{uploading ? 'Subiendo imágenes…' : 'Arrastra tus imágenes aquí'}</strong>
            <span className="muted">o haz clic para elegirlas</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            hidden
            onChange={(event) => {
              void handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </section>

        <form className="panel panel--settings" onSubmit={saveInterval}>
          <h2>Tiempo entre imágenes</h2>
          <p className="muted">La pantalla se actualiza al instante cuando guardas.</p>

          <div className="interval">
            <input
              type="number"
              min={1}
              max={300}
              step={1}
              value={intervalValue}
              onChange={(event) => setIntervalDraft(event.target.value)}
              aria-label="Segundos entre imágenes"
            />
            <span className="interval__unit">segundos</span>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          <div className="quick">
            {QUICK_INTERVALS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                className={`chip${Number(intervalValue) === seconds ? ' is-active' : ''}`}
                onClick={() => setIntervalDraft(String(seconds))}
              >
                {seconds} s
              </button>
            ))}
          </div>
        </form>

        <section className="panel panel--gallery">
          <div className="gallery__head">
            <h2>
              Imágenes <span className="count">{state.images.length}</span>
            </h2>
            <span className="muted">El orden de la lista es el orden en pantalla.</span>
          </div>

          {state.images.length === 0 ? (
            <div className="gallery__empty">
              <Icon name="image" size={34} strokeWidth={1.6} />
              <p>Todavía no hay imágenes. Sube la primera para comenzar.</p>
            </div>
          ) : (
            <ul className="gallery">
              {state.images.map((image, position) => (
                <li key={image.id} className={`card${busyId === image.id ? ' is-busy' : ''}`}>
                  <div className="card__thumb">
                    <img src={image.url} alt={image.filename} loading="lazy" />
                  </div>
                  <div className="card__body">
                    <span className="card__name" title={image.filename}>
                      {image.filename}
                    </span>
                    <span className="card__pos">Posición {position + 1}</span>
                  </div>
                  <div className="card__actions">
                    <button
                      type="button"
                      aria-label="Mover antes"
                      title="Mover antes"
                      disabled={position === 0 || busyId === image.id}
                      onClick={() => void reorder(image.id, 'up')}
                    >
                      <Icon name="up" size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover después"
                      title="Mover después"
                      disabled={position === state.images.length - 1 || busyId === image.id}
                      onClick={() => void reorder(image.id, 'down')}
                    >
                      <Icon name="down" size={17} />
                    </button>
                    <button
                      type="button"
                      className="danger"
                      aria-label="Eliminar imagen"
                      title="Eliminar imagen"
                      disabled={busyId === image.id}
                      onClick={() => void remove(image)}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {(error || notice) && (
        <div className={`toast${error ? ' toast--error' : ''}`} role="status">
          <span>{error || notice}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => {
              setError('')
              setNotice('')
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
