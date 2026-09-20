'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Speaking instead of typing, using the recognition the browser already ships.
 * No key, no dependency, no upload of ours — but it is not everywhere, so
 * `supported` is false on Firefox and the caller must not render a microphone
 * it cannot use.
 *
 * Words arrive twice: `interim` is the running guess, which the browser
 * rewrites as it hears more, and `onFinal` is the sentence it has settled on.
 * Only the settled text is worth keeping.
 */

type RecognitionAlternative = { transcript: string }
type RecognitionResult = { readonly length: number; isFinal: boolean; 0: RecognitionAlternative }
type RecognitionEvent = { resultIndex: number; results: { length: number; [i: number]: RecognitionResult } }
type RecognitionErrorEvent = { error: string }

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type RecognitionCtor = new () => Recognition

const ctor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Her words, in her terms — never the browser's error codes. */
const MESSAGES: Record<string, string> = {
  'not-allowed': 'Your browser is blocking the microphone. Allow it in the address bar, or just type.',
  'service-not-allowed': 'Your browser is blocking the microphone. Allow it in the address bar, or just type.',
  'audio-capture': 'No microphone found. Type it instead.',
  network: 'Could not reach the speech service. Type it instead.',
}

export function useDictation({ onFinal }: { onFinal: (text: string) => void }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<Recognition | null>(null)
  // Kept in a ref so a re-render of the page does not tear down a live session.
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  // Checked after mount, never during render: the server has no window, and a
  // microphone that appears on hydration is better than a markup mismatch.
  useEffect(() => setSupported(ctor() !== null), [])

  const stop = useCallback(() => ref.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = ctor()
    if (!Ctor || ref.current) return
    const rec = new Ctor()
    rec.lang = 'en-GB'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let settled = ''
      let pending = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) settled += r[0].transcript
        else pending += r[0].transcript
      }
      setInterim(pending)
      if (settled.trim()) onFinalRef.current(settled.trim())
    }

    rec.onerror = (e) => {
      // Silence is not a failure — it is someone thinking about the question.
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setError(MESSAGES[e.error] ?? 'The microphone stopped. Type it instead.')
    }

    rec.onend = () => {
      ref.current = null
      setListening(false)
      setInterim('')
    }

    setError(null)
    setInterim('')
    try {
      rec.start()
      ref.current = rec
      setListening(true)
    } catch {
      setError('Could not start the microphone. Type it instead.')
    }
  }, [])

  // Leaving the page with the microphone open would keep the light on.
  useEffect(() => () => ref.current?.abort(), [])

  return { supported, listening, interim, error, start, stop }
}
