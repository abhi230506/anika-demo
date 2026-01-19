import { NextRequest } from 'next/server'

/**
 * Server-side TTS proxy using ElevenLabs Flash v2.5
 * Never exposes API keys to the client.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID

  // Validate environment variables
  if (!apiKey || !voiceId) {
    console.error('[TTS] Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID')
    return new Response('TTS not configured', { status: 500 })
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const text = (body.text || '').trim()

    if (!text) {
      return new Response('Empty text', { status: 400 })
    }

    // Limit text length to ~500 chars per request to avoid long synthesis delays
    if (text.length > 500) {
      return new Response('Text too long', { status: 400 })
    }

    // Call ElevenLabs Flash v2.5 API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.9,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TTS] ElevenLabs error:', response.status, errorText)
      return new Response('TTS service error', { status: response.status })
    }

    // Stream the audio back to client
    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[TTS] Request error:', error)
    return new Response('TTS request failed', { status: 500 })
  }
}

