/**
 * Measures how loud each voice of each catalog track really is, through the app's own renderer and
 * taps, and optionally draws spectrum sheets per coloring. Objective numbers for tuning visuals.
 *
 * bun run analyze-tracks [track ...] [--match text] [--seconds N] [--timeline] [--json file]
 *                        [--png dir] [--start S] [--png-seconds N] [--palette id] [--gradient id]
 *
 * Tracks are paths under public/music (default: the whole catalog). Samples are taps: 1 is a voice
 * at int16 full scale on both stereo outputs.
 */
import fs from 'fs';
import path from 'path';
import {
  LEVEL_PROFILE_VERSION,
  LevelProfileFile,
  TrackLevelProfile,
  analyzeTrack,
} from '../src/analysis/analyzeTrack';
import { quantile } from '../src/analysis/levelStats';
import { loadChipCoreFromDisk, readCatalog, readMusicFile } from '../src/analysis/nodeChipCore';
import { encodePng } from '../src/analysis/png';
import { ANALYSIS_TAP_RATE } from '../src/analysis/renderTaps';
import { renderSpectrumSheet } from '../src/analysis/spectrumSheet';

interface Args {
  tracks: string[];
  match?: string;
  seconds?: number;
  timeline: boolean;
  json?: string;
  png?: string;
  start: number;
  pngSeconds: number;
  palette: string;
  gradient: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    tracks: [],
    timeline: false,
    start: 20,
    pngSeconds: 8,
    palette: 'chromatic',
    gradient: 'mw-red',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    if (arg === '--match') args.match = next();
    else if (arg === '--seconds') args.seconds = Number(next());
    else if (arg === '--timeline') args.timeline = true;
    else if (arg === '--json') args.json = next();
    else if (arg === '--png') args.png = next();
    else if (arg === '--start') args.start = Number(next());
    else if (arg === '--png-seconds') args.pngSeconds = Number(next());
    else if (arg === '--palette') args.palette = next();
    else if (arg === '--gradient') args.gradient = next();
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else args.tracks.push(arg);
  }
  return args;
}

const f3 = (x: number) => x.toFixed(3);

function printTrack(track: string, profile: TrackLevelProfile): void {
  console.log(`\n${track}  (${(profile.analyzedMs / 1000).toFixed(1)} s)`);
  console.log(
    'voice'.padEnd(10),
    'peak  ',
    'rms   ',
    'p95   ',
    'silent%',
    'winPeak p10/p50/p90/p99   ',
    'level p95'
  );
  for (const v of profile.voices) {
    const w = v.windowPeak;
    console.log(
      v.name.padEnd(10),
      f3(v.peak),
      f3(v.rms),
      f3(v.p95Abs),
      v.silentPct.toFixed(1).padStart(7),
      [w.p10, w.p50, w.p90, w.p99].map(f3).join('/').padEnd(26),
      f3(v.level.p95)
    );
  }
}

function printSummary(profiles: Record<string, TrackLevelProfile>): void {
  const byName = new Map<
    string,
    { peaks: number[]; p50: number[]; p99: number[]; level99: number[] }
  >();
  for (const profile of Object.values(profiles)) {
    for (const v of profile.voices) {
      if (v.silentPct >= 100) continue;
      const entry = byName.get(v.name) || { peaks: [], p50: [], p99: [], level99: [] };
      entry.peaks.push(v.peak);
      entry.p50.push(v.windowPeak.p50);
      entry.p99.push(v.windowPeak.p99);
      entry.level99.push(v.level.p99);
      byName.set(v.name, entry);
    }
  }
  const median = (values: number[]) => quantile(Float64Array.from(values).sort(), 0.5);
  console.log('\nAcross tracks (medians of per-track values, voices that ever sound)');
  console.log('voice'.padEnd(10), 'tracks', 'peak  ', 'winP50', 'winP99', 'level p99');
  for (const [name, e] of byName) {
    console.log(
      name.padEnd(10),
      String(e.peaks.length).padStart(6),
      f3(median(e.peaks)),
      f3(median(e.p50)),
      f3(median(e.p99)),
      f3(median(e.level99))
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const catalog = readCatalog();
  let tracks = args.tracks.length ? args.tracks : catalog;
  if (args.match) tracks = tracks.filter((t) => t.includes(args.match as string));
  if (tracks.length === 0) throw new Error('no tracks match');
  const core = await loadChipCoreFromDisk();
  const profiles: Record<string, TrackLevelProfile> = {};
  for (const track of tracks) {
    const bytes = readMusicFile(track);
    profiles[track] = analyzeTrack(core, bytes, track, {
      maxSeconds: args.seconds,
      timeline: args.timeline,
    });
    printTrack(track, profiles[track]);
    if (args.png) {
      const sheet = renderSpectrumSheet(core, bytes, track, {
        startSeconds: args.start,
        seconds: args.pngSeconds,
        paletteId: args.palette,
        gradientId: args.gradient,
      });
      fs.mkdirSync(args.png, { recursive: true });
      const file = path.join(args.png, track.replace(/[/\\]/g, '-').replace(/\.\w+$/, '.png'));
      fs.writeFileSync(file, encodePng(sheet.width, sheet.height, sheet.rgb));
      console.log(`  sheet ${file} (left to right: ${sheet.panels.map((p) => p.id).join(', ')})`);
      for (const { id, stats } of sheet.panels) {
        console.log(
          `  ${id.padEnd(9)} chroma p50/p90 ${stats.chromaP50}/${stats.chromaP90}`,
          `value p50/p90 ${stats.valueP50}/${stats.valueP90}`,
          `pastel ${stats.pastelPct}% dark ${stats.darkPct}%`
        );
      }
    }
  }
  if (tracks.length > 1) printSummary(profiles);
  if (args.json) {
    const file: LevelProfileFile = {
      version: LEVEL_PROFILE_VERSION,
      tapRate: ANALYSIS_TAP_RATE,
      fullScale: '1 = the voice at int16 full scale on both stereo outputs',
      tracks: profiles,
    };
    fs.writeFileSync(args.json, JSON.stringify(file, null, 1) + '\n');
    console.log(`\nwrote ${args.json}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
