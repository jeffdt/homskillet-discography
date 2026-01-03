import React from 'react';
import autoBindReact from 'auto-bind/react';
import Tooltip from './Tooltip';

interface VoiceGroup {
  name: string;
  icon?: boolean;
  voices: Array<{
    idx: number;
    name: string;
  }>;
}

interface ParamOption {
  label: string;
  value: string | number;
}

interface ParamOptionGroup {
  label: string;
  items: ParamOption[];
}

interface ParamDef {
  id: string;
  label: string;
  hint?: string;
  type: 'enum' | 'number' | 'toggle' | 'button';
  options?: ParamOptionGroup[];
  min?: number;
  max?: number;
  step?: number;
  dependsOn?: {
    param: string;
    value: any;
  };
}

interface PersistedSettings {
  [key: string]: any;
}

interface PlayerParamsProps {
  paramDefs?: ParamDef[];
  paramValues?: { [key: string]: any };
  onParamChange?: (paramId: string, value: any) => void;
  onPinParam?: (key: string, value: any) => void;
  playerKey: string;
  tempo: number;
  onTempoChange: (event: React.FormEvent<HTMLInputElement>) => void;
  ejected: boolean;
  voiceGroups: VoiceGroup[];
  numVoices: number;
  voiceMask: boolean[];
  voiceNames: string[];
  onVoiceMaskChange?: (voiceMask: boolean[]) => void;
  persistedSettings?: PersistedSettings;
}

const InfoIcon = ({ tooltip }: { tooltip: string }) => (
  <Tooltip content={tooltip} side="right">
    <span className="Settings-info-icon">?</span>
  </Tooltip>
);

interface PlayerParamsState {
  flashingSetting: string | null;
}

export default class PlayerParams extends React.PureComponent<PlayerParamsProps, PlayerParamsState> {
  private flashTimer: NodeJS.Timeout | null = null;

  constructor(props: PlayerParamsProps) {
    super(props);
    autoBindReact(this);
    this.state = {
      flashingSetting: null,
    };
  }

  componentWillUnmount() {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
  }

  flashValue(settingKey: string): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
    this.setState({ flashingSetting: settingKey });
    this.flashTimer = setTimeout(() => {
      this.setState({ flashingSetting: null });
    }, 500);
  }

  formatAsPercentage(value: number): string {
    return Math.round(value * 100) + '%';
  }

  // Voicename polling implementation left here for reference.
  //
  // Polling for voice updates is only useful for MIDIPlayer
  // because MIDI Player is the only player where voice names can update
  // in the middle of a song. Polling is probably a bad pattern.
  // This forces the player to keep a copy of voices in an array.
  //
  // Instead, the player should probably emit an event when voices have updated.
  //
  // Right now the only way for players to notify the UI is to invoke the
  // 'onPlayerStateUpdate' callback, which is really coarse and brittle.
  // It will trigger a setstate on the App level.
  //
  // A better way to bridge between the player engines and the
  // React UI is probably with an Event Bus (pubsub).
  //
  // The event bus can be passed down to children at arbitrary depth,
  // and each child can subscribe to events it cares about.
  //
  // componentDidMount() {
  //   const updateVoiceNames = () => {
  //     const voiceNames = this.props.getVoiceNames();
  //     if (voiceNames !== this.state.voiceNames) {
  //       console.debug("Updated voice names.");
  //       this.setState({
  //         voiceNames,
  //       });
  //     }
  //   };
  //   updateVoiceNames();
  //   this.timer = setInterval(updateVoiceNames, UPDATE_INTERVAL_MS);
  // }
  //
  // componentWillUnmount() {
  //   clearInterval(this.timer);
  // }

  handleVoiceToggle(e: React.MouseEvent<HTMLInputElement>, index: number): void {
    const { onVoiceMaskChange } = this.props;
    if (!onVoiceMaskChange) return;

    const voiceMask = [...this.props.voiceMask];
    const nativeEvent = e.nativeEvent;
    if (nativeEvent.altKey || nativeEvent.shiftKey || nativeEvent.metaKey) {
      if (voiceMask.every((enabled, i) => (i === index) === enabled)) {
        voiceMask.fill(true);
      } else {
        voiceMask.fill(false);
        voiceMask[index] = true;
      }
    } else {
      voiceMask[index] = !voiceMask[index];
    }
    onVoiceMaskChange(voiceMask);
  }

  isPinned(persistedKey: string): boolean {
    return this.props.persistedSettings?.hasOwnProperty(persistedKey) ?? false;
  }

  render(): React.ReactNode {
    const {
      paramDefs,
      paramValues,
      onParamChange,
      onPinParam,
      playerKey,
      tempo,
      onTempoChange,
      ejected,
      voiceGroups,
      numVoices,
      voiceMask,
      voiceNames,
    } = this.props;

    const { isPinned } = this;

    return (
      <div className="PlayerParams">
        <span className="PlayerParams-param PlayerParams-group">
          <button
            className="IconButton"
            title={
              isPinned('tempo')
                ? 'Un-pin this parameter'
                : 'Pin this parameter (retains value between songs)'
            }
            onClick={() => onPinParam?.('tempo', tempo)}
          >
            <span
              className={`inline-icon ${isPinned('tempo') ? 'icon-pin-down' : 'icon-pin-up'}`}
            />
          </button>
          <label htmlFor="tempo" className="PlayerParams-label">
            Speed:{' '}
          </label>
          <input
            id="tempo"
            disabled={ejected}
            type="range"
            value={tempo}
            min="0.3"
            max="2.0"
            step="0.05"
            onInput={(e) => {
              onTempoChange(e);
              this.flashValue('tempo');
            }}
            onChange={onTempoChange}
          />{' '}
          <span className={this.state.flashingSetting === 'tempo' ? 'Settings-value-flash' : ''}>
            {this.formatAsPercentage(tempo)}
          </span>
          <InfoIcon tooltip="Playback speed multiplier (30%-200%)" />
        </span>
        {paramDefs &&
          paramValues &&
          paramDefs.map((param) => {
            const value = paramValues[param.id];
            const dependsOn = param.dependsOn;
            if (dependsOn && paramValues[dependsOn.param] !== dependsOn.value) {
              return null;
            }

            const persistedKey = `${playerKey}.${param.id}`;
            const pinButton = (
              <button
                className="IconButton"
                title={
                  isPinned(persistedKey)
                    ? 'Un-pin this parameter'
                    : 'Pin this parameter (retains value between songs)'
                }
                onClick={() => onPinParam?.(persistedKey, value)}
              >
                <span
                  className={`inline-icon ${isPinned(persistedKey) ? 'icon-pin-down' : 'icon-pin-up'}`}
                />
              </button>
            );

            switch (param.type) {
              case 'enum':
                return (
                  <span key={param.id} className="PlayerParams-param">
                    {pinButton}
                    <label htmlFor={param.id} title={param.hint} className="PlayerParams-label">
                      {param.label}:{' '}
                    </label>
                    <select
                      id={param.id}
                      onChange={(e) => {
                        // TODO: make this explicit in the param def
                        const intVal = Number(e.target.value);
                        const value = isNaN(intVal) ? e.target.value : intVal;
                        onParamChange?.(param.id, value);
                      }}
                      value={value}
                    >
                      {param.options?.map((optgroup) => (
                        <optgroup key={optgroup.label} label={optgroup.label}>
                          {optgroup.items.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {param.hint && <InfoIcon tooltip={param.hint} />}
                  </span>
                );
              case 'number':
                return (
                  <span key={param.id} className="PlayerParams-param">
                    {pinButton}
                    <label htmlFor={param.id} className="PlayerParams-label">
                      {param.label}:{' '}
                    </label>
                    <input
                      id={param.id}
                      type="range"
                      title={param.hint}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      onChange={(e) => {
                        onParamChange?.(param.id, parseFloat(e.target.value));
                        this.flashValue(param.id);
                      }}
                      value={value}
                    ></input>{' '}
                    <span className={this.state.flashingSetting === param.id ? 'Settings-value-flash' : ''}>
                      {this.formatAsPercentage(value)}
                    </span>
                    {param.hint && <InfoIcon tooltip={param.hint} />}
                  </span>
                );
              case 'toggle':
                return (
                  <span key={param.id} className="PlayerParams-param">
                    {pinButton}
                    <input
                      type="checkbox"
                      id={param.id}
                      onChange={(e) => onParamChange?.(param.id, e.target.checked)}
                      checked={value}
                    />
                    <label htmlFor={param.id} title={param.hint}>
                      {param.label}
                    </label>
                    {param.hint && <InfoIcon tooltip={param.hint} />}
                  </span>
                );
              case 'button':
                return (
                  <button
                    key={param.id}
                    title={param.hint}
                    className="box-button"
                    onClick={() => onParamChange?.(param.id, true)}
                  >
                    {param.label}
                  </button>
                );
              default:
                return null;
            }
          })}
        {voiceGroups.length > 0
          ? voiceGroups.map((voiceGroup, i) => {
              return (
                <span className="PlayerParams-param PlayerParams-group" key={voiceGroup.name}>
                  <label className="PlayerParams-group-title" title="Sound chip">
                    {voiceGroup.icon && <span className="inline-icon dim-icon icon-chip" />}{' '}
                    {voiceGroup.name}:
                  </label>
                  <div className="PlayerParams-voiceList">
                    {voiceGroup.voices.map((voice, j) => (
                      <div key={voice.idx} className="App-voice-label">
                        <input
                          title="Alt+click to solo. Alt+click again to unmute all."
                          type="checkbox"
                          id={'v_' + i + j}
                          onChange={(e) => this.handleVoiceToggle(e, voice.idx)}
                          checked={voiceMask[voice.idx]}
                        />
                        <label htmlFor={'v_' + i + j}>{voice.name}</label>
                      </div>
                    ))}
                  </div>
                </span>
              );
            })
          : numVoices > 0 && (
              <span className="PlayerParams-param PlayerParams-group">
                <label className="PlayerParams-group-title">Voices:</label>
                <div className="PlayerParams-voiceList">
                  {[...Array(numVoices)].map((_, i) => {
                    return (
                      <div key={i} className="App-voice-label">
                        <input
                          title="Alt+click to solo. Alt+click again to unmute all."
                          type="checkbox"
                          id={'v_' + i}
                          onChange={(e) => this.handleVoiceToggle(e, i)}
                          checked={voiceMask[i]}
                        />
                        <label htmlFor={'v_' + i}>{voiceNames[i]}</label>
                      </div>
                    );
                  })}
                </div>
              </span>
            )}
      </div>
    );
  }
}
