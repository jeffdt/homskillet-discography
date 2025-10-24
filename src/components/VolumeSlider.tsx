import React, { memo } from "react";

interface VolumeSliderProps {
  value: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleReset: (event: React.MouseEvent<HTMLInputElement>) => void;
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({ value, onChange, handleReset }) => {
  return (
    <div className="VolumeSlider">
      <input
        type='range'
        title={"Volume"}
        min={0}
        max={150}
        step={1}
        onChange={onChange}
        onDoubleClick={handleReset}
        onContextMenu={handleReset}
        value={value}
      />
      <div className="VolumeSlider-labels">
        <div>Volume</div>
        <div>{value}%</div>
      </div>
    </div>
  );
}

export default memo(VolumeSlider);
