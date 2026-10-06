import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { Spark, SparkSystem } from '../visuals/sparks';

interface SliderParticlesProps {
  /** Element the sparks fly from (the slider's chisel). */
  anchor: React.RefObject<HTMLElement>;
  /** Spawn while true; false clears every spark. */
  shouldSpawn: boolean;
  spawnRate?: number;
  lifespan?: number;
  baseAngle?: number;
  angleSpread?: number;
  speed?: number;
  speedVariance?: number;
  gravity?: number;
  fadeMode?: string;
}

const SPARKS_LOOP_ID = 'slider-sparks';

/** Center of an element in viewport coordinates, or null without one. */
function centerOf(element: HTMLElement | null): { x: number; y: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Matches the container's pooled divs to the sparks: position and opacity, extras hidden. */
function renderSparks(container: HTMLDivElement | null, sparks: readonly Spark[]): void {
  if (!container) return;
  while (container.childElementCount < sparks.length) {
    const element = document.createElement('div');
    element.className = 'SliderParticle';
    container.appendChild(element);
  }
  const children = container.children;
  for (let i = 0; i < children.length; i++) {
    const element = children[i] as HTMLElement;
    const spark = sparks[i];
    if (!spark) {
      if (element.style.display !== 'none') element.style.display = 'none';
      continue;
    }
    element.style.display = '';
    element.style.transform = `translate(${spark.x}px, ${spark.y}px)`;
    element.style.opacity = String(spark.opacity);
  }
}

/**
 * Sparks that fly off the progress knob while playing. A FrameLoop consumer steps the particles and
 * moves a pool of plain divs, so sparks never re-render React. Portaled to body: a transformed or
 * backdrop-filtered ancestor (the Dock) would otherwise offset these fixed-position elements.
 */
export default function SliderParticles(props: SliderParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<SparkSystem | null>(null);
  if (!systemRef.current) systemRef.current = new SparkSystem();
  const system = systemRef.current;
  system.configure({
    spawnRate: props.spawnRate,
    lifespan: props.lifespan,
    baseAngle: props.baseAngle,
    angleSpread: props.angleSpread,
    speed: props.speed,
    speedVariance: props.speedVariance,
    gravity: props.gravity,
    fadeMode: props.fadeMode === 'instant' ? 'instant' : 'fade',
  });

  useFrameLoop(
    SPARKS_LOOP_ID,
    (_frame, dtMs) => {
      system.step(dtMs, () => centerOf(props.anchor.current));
      renderSparks(containerRef.current, system.sparks);
    },
    { enabled: props.shouldSpawn }
  );

  useEffect(() => {
    if (props.shouldSpawn) return;
    system.clear();
    renderSparks(containerRef.current, system.sparks);
  }, [props.shouldSpawn, system]);

  return ReactDOM.createPortal(
    <div className="SliderParticles" ref={containerRef} />,
    document.body
  );
}
