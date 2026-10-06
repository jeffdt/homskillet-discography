/** A linear gain ramp applied to stereo output, for declicking and the end-of-track fade. */
export class GainRamp {
  private current = 1;
  private target = 1;
  private step = 0;

  get value(): number {
    return this.current;
  }

  /** Jumps to a gain with no ramp. */
  reset(value: number): void {
    this.current = value;
    this.target = value;
    this.step = 0;
  }

  /** Starts a linear ramp from the current gain to target over the given number of frames. */
  rampTo(target: number, frames: number): void {
    this.target = target;
    if (frames <= 0) {
      this.current = target;
      this.step = 0;
      return;
    }
    this.step = (target - this.current) / frames;
  }

  /** True once the gain has reached zero and is staying there. */
  isSilent(): boolean {
    return this.current === 0 && this.target === 0;
  }

  /** Multiplies left/right[offset .. offset + frames) by the ramped gain. */
  apply(left: Float32Array, right: Float32Array, offset: number, frames: number): void {
    if (this.step === 0 && this.current === 1) return;
    for (let i = offset; i < offset + frames; i++) {
      if (this.step !== 0) {
        this.current += this.step;
        const reached = this.step > 0 ? this.current >= this.target : this.current <= this.target;
        if (reached) {
          this.current = this.target;
          this.step = 0;
        }
      }
      // Adding 0 turns the -0 of a negative sample times a zero gain into +0.
      left[i] = left[i] * this.current + 0;
      right[i] = right[i] * this.current + 0;
    }
  }
}
