const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext
  return AudioContext ? new AudioContext() : null
}

export function playBeep() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  const playNote = (startTime: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, startTime) // A5
    
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(startTime)
    osc.stop(startTime + 0.3)
  }

  // Play 3 short beeps
  playNote(now)
  playNote(now + 0.4)
  playNote(now + 0.8)
}

export function playSuccess() {
  const ctx = getAudioContext()
  if (!ctx) return
  
  const playNote = (freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, startTime)
    
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(startTime)
    osc.stop(startTime + duration)
  }

  const now = ctx.currentTime
  // A major chord arpeggio for success
  playNote(440, now, 0.2) // A4
  playNote(554.37, now + 0.15, 0.2) // C#5
  playNote(659.25, now + 0.3, 0.6) // E5
}

let activeOsc: OscillatorNode | null = null
let activeGain: GainNode | null = null
let activeLfo: OscillatorNode | null = null

export function playBuzzer() {
  stopBuzzer()
  const ctx = getAudioContext()
  if (!ctx) return
  
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const lfo = ctx.createOscillator()
  
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(300, ctx.currentTime)
  
  lfo.type = 'square'
  lfo.frequency.setValueAtTime(4, ctx.currentTime)
  
  const lfoGain = ctx.createGain()
  lfoGain.gain.setValueAtTime(0.5, ctx.currentTime)
  lfo.connect(lfoGain)
  lfoGain.connect(gain.gain)
  
  gain.gain.setValueAtTime(0.5, ctx.currentTime)
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.start()
  lfo.start()
  
  activeOsc = osc
  activeGain = gain
  activeLfo = lfo
}

export function stopBuzzer() {
  if (activeOsc) {
    try { activeOsc.stop() } catch(e) {}
    activeOsc.disconnect()
    activeOsc = null
  }
  if (activeLfo) {
    try { activeLfo.stop() } catch(e) {}
    activeLfo.disconnect()
    activeLfo = null
  }
  if (activeGain) {
    activeGain.disconnect()
    activeGain = null
  }
}
