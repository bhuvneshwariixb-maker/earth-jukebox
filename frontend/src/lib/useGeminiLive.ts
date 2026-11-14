'use client'

import { useEffect, useRef, useState } from 'react'
import { GoogleGenAI, Modality } from '@google/genai'

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export function useGeminiLive() {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')

  const sessionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const nextPlayTimeRef = useRef(0)

  const stop = () => {
    sessionRef.current?.close()
    sessionRef.current = null

    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    gainRef.current?.disconnect()

    processorRef.current = null
    sourceRef.current = null
    gainRef.current = null

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    const context = audioContextRef.current
    audioContextRef.current = null

    if (context && context.state !== 'closed') {
      void context.close()
    }

    nextPlayTimeRef.current = 0
    setState('idle')
  }

  const start = async () => {
    if (sessionRef.current) {
      stop()
      return
    }

    try {
      setError('')
      setTranscript('')
      setResponse('')
      setState('processing')

      const tokenResponse = await fetch('/api/gemini/live-token', {
        method: 'POST',
      })

      if (!tokenResponse.ok) {
        throw new Error('Could not create a Gemini voice session.')
      }

      const tokenData = await tokenResponse.json()

      if (!tokenData.token || !tokenData.model) {
        throw new Error('The backend returned an incomplete voice token.')
      }

      const ai = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: 'v1alpha' },
      })

      const session = await ai.live.connect({
        model: tokenData.model,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message) => {
            const content = message.serverContent

            if (content?.inputTranscription?.text) {
              setTranscript((previous) =>
                previous + content.inputTranscription!.text!,
              )
            }

            if (content?.outputTranscription?.text) {
              setResponse((previous) =>
                previous + content.outputTranscription!.text!,
              )
            }

            const context = audioContextRef.current

            if (context && content?.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                const audio = part.inlineData

                if (!audio?.data) continue

                const binary = atob(audio.data)
                const bytes = new Uint8Array(binary.length)

                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i)
                }

                const view = new DataView(bytes.buffer)
                const sampleCount = Math.floor(bytes.length / 2)
                const sampleRate =
                  Number(audio.mimeType?.match(/rate=(\d+)/)?.[1]) || 24000

                const audioBuffer = context.createBuffer(
                  1,
                  sampleCount,
                  sampleRate,
                )

                const channel = audioBuffer.getChannelData(0)

                for (let i = 0; i < sampleCount; i++) {
                  channel[i] = view.getInt16(i * 2, true) / 32768
                }

                const player = context.createBufferSource()
                player.buffer = audioBuffer
                player.connect(context.destination)

                const playAt = Math.max(
                  context.currentTime,
                  nextPlayTimeRef.current,
                )

                player.start(playAt)
                nextPlayTimeRef.current = playAt + audioBuffer.duration

                setState('speaking')

                player.onended = () => {
                  if (sessionRef.current) setState('listening')
                }
              }
            }

            if (content?.turnComplete && sessionRef.current) {
              const remainingAudio = context
                ? Math.max(0, nextPlayTimeRef.current - context.currentTime)
                : 0

              window.setTimeout(() => {
                if (sessionRef.current) stop()
              }, remainingAudio * 1000 + 300)
            }
          },
          onerror: (event) => {
            setError(event.message || 'Gemini voice connection error.')
            setState('idle')
          },
          onclose: () => {
            setState('idle')
          },
        },
      })

      sessionRef.current = session

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      const context = new AudioContext()
      audioContextRef.current = context
      await context.resume()

      const source = context.createMediaStreamSource(stream)
      const processor = context.createScriptProcessor(4096, 1, 1)
      const gain = context.createGain()

      gain.gain.value = 0

      processor.onaudioprocess = (event) => {
        if (!sessionRef.current) return

        const input = event.inputBuffer.getChannelData(0)
        const ratio = context.sampleRate / 16000
        const outputLength = Math.floor(input.length / ratio)
        const pcm = new Int16Array(outputLength)

        for (let i = 0; i < outputLength; i++) {
          const startIndex = Math.floor(i * ratio)
          const endIndex = Math.min(
            Math.floor((i + 1) * ratio),
            input.length,
          )

          let total = 0

          for (let j = startIndex; j < endIndex; j++) {
            total += input[j]
          }

          const sample = total / Math.max(1, endIndex - startIndex)
          const clamped = Math.max(-1, Math.min(1, sample))

          pcm[i] = clamped < 0
            ? clamped * 32768
            : clamped * 32767
        }

        const bytes = new Uint8Array(pcm.buffer)
        let binary = ''

        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }

        session.sendRealtimeInput({
          audio: {
            data: btoa(binary),
            mimeType: 'audio/pcm;rate=16000',
          },
        })
      }

      source.connect(processor)
      processor.connect(gain)
      gain.connect(context.destination)

      sourceRef.current = source
      processorRef.current = processor
      gainRef.current = gain

      setState('listening')
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Unable to start voice.'

      stop()
      setError(message)
    }
  }

  const sendText = (text: string) => {
    if (!sessionRef.current) {
      setError('Start the microphone before sending a command.')
      return
    }

    setTranscript(text)
    setResponse('')
    setState('processing')

    sessionRef.current.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    })
  }

  useEffect(() => {
    return () => {
      sessionRef.current?.close()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      processorRef.current?.disconnect()
      sourceRef.current?.disconnect()
      gainRef.current?.disconnect()

      if (audioContextRef.current?.state !== 'closed') {
        void audioContextRef.current?.close()
      }
    }
  }, [])

  return { state, transcript, response, error, start, stop, sendText }
}
