export interface PenSample {
  x: number
  y: number
  pen: number
}

const MASTER_GAIN = 0.16
const HUM_BASE_HZ = 56
const HUM_SPEED_HZ = 34
const HUM_MAX_GAIN = 0.1
const SCRATCH_MAX_GAIN = 0.2
const TRAVEL_JUMP = 0.035
const SPEED_SMOOTHING = 0.25

interface MotorVoice {
  oscillator: OscillatorNode
  gain: GainNode
}

interface ScratchVoice {
  source: AudioBufferSourceNode
  gain: GainNode
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1
  return buffer
}

export class PlotterSound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private motors: MotorVoice[] = []
  private scratch: ScratchVoice | null = null
  private noise: AudioBuffer | null = null
  private previous: PenSample | null = null
  private previousTime = 0
  private smoothedSpeed = { x: 0, y: 0 }

  get enabled(): boolean {
    return this.context !== null && this.context.state === "running"
  }

  async enable(): Promise<void> {
    if (!this.context) this.build()
    if (this.context && this.context.state !== "running") await this.context.resume()
  }

  async disable(): Promise<void> {
    if (!this.context) return
    await this.context.suspend()
    this.previous = null
  }

  update(sample: PenSample | null, time: number): void {
    if (!this.enabled || !this.context || !this.master) return
    const elapsed = clamp((time - this.previousTime) / 1000, 0.004, 0.1)
    this.previousTime = time

    if (!sample) {
      this.settle()
      this.previous = null
      return
    }

    if (this.previous && this.previous.pen !== sample.pen) this.penChange()
    const travelled = this.previous
      ? Math.hypot(sample.x - this.previous.x, sample.y - this.previous.y)
      : Infinity
    if (travelled > TRAVEL_JUMP) this.penDown()

    const velocity = this.previous
      ? {
          x: Math.abs(sample.x - this.previous.x) / elapsed,
          y: Math.abs(sample.y - this.previous.y) / elapsed,
        }
      : { x: 0, y: 0 }
    if (travelled > TRAVEL_JUMP) {
      velocity.x = 0
      velocity.y = 0
    }
    this.smoothedSpeed.x += (velocity.x - this.smoothedSpeed.x) * SPEED_SMOOTHING
    this.smoothedSpeed.y += (velocity.y - this.smoothedSpeed.y) * SPEED_SMOOTHING
    this.driveMotor(0, this.smoothedSpeed.x)
    this.driveMotor(1, this.smoothedSpeed.y)
    this.driveScratch(Math.hypot(this.smoothedSpeed.x, this.smoothedSpeed.y))
    this.previous = sample
  }

  private build(): void {
    const context = new AudioContext()
    const master = context.createGain()
    master.gain.value = MASTER_GAIN
    const lowpass = context.createBiquadFilter()
    lowpass.type = "lowpass"
    lowpass.frequency.value = 1400
    master.connect(lowpass)
    lowpass.connect(context.destination)

    this.context = context
    this.master = master
    this.noise = createNoiseBuffer(context)
    this.motors = [this.createMotor("sine"), this.createMotor("sine")]
    this.scratch = this.createScratch()
  }

  private createScratch(): ScratchVoice {
    if (!this.context || !this.master || !this.noise) throw new Error("audio graph not built")
    const source = this.context.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    const highpass = this.context.createBiquadFilter()
    highpass.type = "highpass"
    highpass.frequency.value = 320
    const lowpass = this.context.createBiquadFilter()
    lowpass.type = "lowpass"
    lowpass.frequency.value = 900
    const gain = this.context.createGain()
    gain.gain.value = 0
    source.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(gain)
    gain.connect(this.master)
    source.start()
    return { source, gain }
  }

  private driveScratch(speed: number): void {
    if (!this.context || !this.scratch) return
    const normalised = clamp(speed / 1.4, 0, 1)
    this.scratch.gain.gain.setTargetAtTime(
      Math.sqrt(normalised) * SCRATCH_MAX_GAIN,
      this.context.currentTime,
      0.04
    )
  }

  private createMotor(type: OscillatorType): MotorVoice {
    if (!this.context || !this.master) throw new Error("audio graph not built")
    const oscillator = this.context.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = HUM_BASE_HZ
    const gain = this.context.createGain()
    gain.gain.value = 0
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start()
    return { oscillator, gain }
  }

  private driveMotor(index: number, speed: number): void {
    if (!this.context) return
    const motor = this.motors[index]
    const normalised = clamp(speed / 1.6, 0, 1)
    const now = this.context.currentTime
    motor.oscillator.frequency.setTargetAtTime(
      (HUM_BASE_HZ + normalised * HUM_SPEED_HZ) * (index === 0 ? 1 : 1.5),
      now,
      0.02
    )
    motor.gain.gain.setTargetAtTime(Math.sqrt(normalised) * HUM_MAX_GAIN, now, 0.03)
  }

  private settle(): void {
    if (!this.context) return
    const now = this.context.currentTime
    for (const motor of this.motors) motor.gain.gain.setTargetAtTime(0, now, 0.08)
    this.scratch?.gain.gain.setTargetAtTime(0, now, 0.06)
    this.smoothedSpeed = { x: 0, y: 0 }
  }

  private burst(frequency: number, q: number, duration: number, level: number): void {
    if (!this.context || !this.master || !this.noise) return
    const source = this.context.createBufferSource()
    source.buffer = this.noise
    const filter = this.context.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = frequency
    filter.Q.value = q
    const gain = this.context.createGain()
    const now = this.context.currentTime
    gain.gain.setValueAtTime(level, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start(now)
    source.stop(now + duration)
  }

  private thump(frequency: number, duration: number, level: number): void {
    if (!this.context || !this.master) return
    const oscillator = this.context.createOscillator()
    oscillator.type = "sine"
    const gain = this.context.createGain()
    const now = this.context.currentTime
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + duration)
    gain.gain.setValueAtTime(level, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  private penDown(): void {
    this.burst(1800, 8, 0.018, 0.16)
  }

  private penChange(): void {
    this.thump(80, 0.16, 0.4)
    this.burst(600, 3, 0.09, 0.2)
  }
}

export const plotterSound = new PlotterSound()
