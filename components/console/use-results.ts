'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RunResult } from '@/lib/types'
import sampleRaw from '@/data/fixtures/results.sample.json'

// One-line switch to go live: NEXT_PUBLIC_MOCK=0 (or unset MOCK=1).
const IS_MOCK = process.env.NEXT_PUBLIC_MOCK !== '0'

// The fixture may be thin or partially malformed — never trust a field.
function asRunResult(raw: unknown): RunResult {
  const obj = (raw ?? {}) as Partial<RunResult>
  return {
    results: Array.isArray(obj.results) ? obj.results : [],
    stats: {
      count: obj.stats?.count ?? (Array.isArray(obj.results) ? obj.results.length : 0),
      ms: obj.stats?.ms ?? 0,
      costUsd: obj.stats?.costUsd ?? 0,
      decisions: obj.stats?.decisions ?? 0,
    },
  }
}

export const SAMPLE_RESULT: RunResult = asRunResult(sampleRaw)

export type ResultsSource = 'sample' | 'live'
export type RunMode = 'all' | 'unclassified'
/** A DM export Maya has dropped in. There is no Instagram API here. */
export type Upload = { name: string; csv: string }

export function useResults() {
  const [data, setData] = useState<RunResult | null>(IS_MOCK ? SAMPLE_RESULT : null)
  const [source, setSource] = useState<ResultsSource>(IS_MOCK ? 'sample' : 'live')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inboxName, setInboxName] = useState<string | null>(null)
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)
  const loading = !IS_MOCK && data === null

  const refresh = useCallback(async () => {
    if (IS_MOCK) {
      setData(SAMPLE_RESULT)
      setSource('sample')
      return
    }
    try {
      const res = await fetch('/api/results')
      if (!res.ok) throw new Error(`results ${res.status}`)
      setData(asRunResult(await res.json()))
      setSource('live')
      setError(null)
    } catch (e) {
      // Offline / API not up yet — the fixture keeps the console usable.
      setData(SAMPLE_RESULT)
      setSource('sample')
      setError(e instanceof Error ? e.message : 'fetch failed')
    }
  }, [])

  useEffect(() => {
    if (IS_MOCK) {
      return () => {
        if (ticker.current) clearInterval(ticker.current)
      }
    }
    let dead = false
    void (async () => {
      try {
        const res = await fetch('/api/results')
        if (!res.ok) throw new Error(`results ${res.status}`)
        const json = asRunResult(await res.json())
        if (dead) return
        setData(json)
        setSource('live')
      } catch (e) {
        if (dead) return
        setData(SAMPLE_RESULT)
        setSource('sample')
        setError(e instanceof Error ? e.message : 'fetch failed')
      }
    })()
    return () => {
      dead = true
      if (ticker.current) clearInterval(ticker.current)
    }
  }, [])

  const run = useCallback(async (mode: RunMode, upload?: Upload) => {
    if (running) return
    setRunning(true)
    setProgress(0)
    setError(null)

    // An uploaded file always goes to the reader. Sample mode has nothing to
    // say about messages it has never seen, and pretending otherwise would be
    // the one thing this product must not do.
    if (IS_MOCK && !upload) {
      // Fake a run so the bar, timer and stats move like the real thing.
      const started = Date.now()
      const total = 2600
      await new Promise<void>((resolve) => {
        ticker.current = setInterval(() => {
          const p = Math.min(1, (Date.now() - started) / total)
          setProgress(p)
          if (p >= 1) {
            if (ticker.current) clearInterval(ticker.current)
            resolve()
          }
        }, 80)
      })
      setData({
        results: SAMPLE_RESULT.results,
        stats: {
          ...SAMPLE_RESULT.stats,
          ms: Date.now() - started,
        },
      })
      setSource('sample')
    } else {
      try {
        const res = await fetch('/api/classify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(upload ? { mode: 'all', csv: upload.csv } : { mode }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error ?? `The reader stopped (${res.status}).`)
        setData(asRunResult(json))
        setSource('live')
        setProgress(1)
        if (upload) setInboxName(upload.name)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'run failed')
      }
    }

    setRunning(false)
    setTimeout(() => setProgress(null), 600)
  }, [running])

  return { data, source, isMock: IS_MOCK, loading, running, progress, error, inboxName, refresh, run }
}
