/**
 * A minimal one-song NSF: INIT starts a 440 Hz square on pulse 1, and PLAY counts frames and
 * silences the APU ($4015 = 0) after 120 frames (2 s). GME's silence detection then ends the track.
 */
export function buildToneThenSilenceNsf(): Uint8Array {
  const header = new Uint8Array(0x80);
  header.set([0x4e, 0x45, 0x53, 0x4d, 0x1a, 0x01, 0x01, 0x01], 0x00); // "NESM", v1, 1 song, start 1
  header.set([0x00, 0x80, 0x00, 0x80, 0x20, 0x80], 0x08); // load $8000, init $8000, play $8020
  header.set([0x1a, 0x41], 0x6e); // NTSC speed 16666 us
  header.set([0x20, 0x4e], 0x78); // PAL speed 20000 us
  // prettier-ignore
  const init = [
    0xa9, 0x01, 0x8d, 0x15, 0x40, // LDA #$01; STA $4015  enable pulse 1
    0xa9, 0xbf, 0x8d, 0x00, 0x40, // LDA #$BF; STA $4000  duty 50%, halt, constant volume 15
    0xa9, 0x08, 0x8d, 0x01, 0x40, // LDA #$08; STA $4001  sweep off
    0xa9, 0xfd, 0x8d, 0x02, 0x40, // LDA #$FD; STA $4002  timer low (440 Hz)
    0xa9, 0x00, 0x8d, 0x03, 0x40, // LDA #$00; STA $4003  timer high, start
    0xa9, 0x00, 0x85, 0x00, //       LDA #$00; STA $00    frame counter
    0x60, //                         RTS
  ];
  // prettier-ignore
  const play = [
    0xe6, 0x00, //       INC $00
    0xa5, 0x00, //       LDA $00
    0xc9, 0x78, //       CMP #120
    0xd0, 0x05, //       BNE done
    0xa9, 0x00, //       LDA #$00
    0x8d, 0x15, 0x40, // STA $4015  silence
    0x60, //             done: RTS
  ];
  const code = new Uint8Array(0x20 + play.length);
  code.set(init, 0);
  code.fill(0xea, init.length, 0x20); // NOP padding up to $8020
  code.set(play, 0x20);
  const nsf = new Uint8Array(header.length + code.length);
  nsf.set(header, 0);
  nsf.set(code, header.length);
  return nsf;
}
