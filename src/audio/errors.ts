/** Rejects an AudioEngine.load() promise that a newer load() or stop() replaced. */
export class LoadSupersededError extends Error {
  constructor() {
    super('Load superseded by a newer request');
    this.name = 'LoadSupersededError';
  }
}
