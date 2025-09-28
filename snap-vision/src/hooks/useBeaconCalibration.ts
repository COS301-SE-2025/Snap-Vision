import { useCallback, useEffect, useRef, useState } from 'react';
import type { BeaconScanner, IBeaconReading, IBeaconKey } from '../utils/indoor/BeaconScanner';

export function useBeaconCalibration(scanner: BeaconScanner) {
  const [active, setActive] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [count, setCount] = useState(0);
  const [avg, setAvg] = useState<number | null>(null);
  const [p95, setP95] = useState<number | null>(null);
  const [lastRssi, setLastRssi] = useState<number | null>(null);

  const targetRef = useRef<IBeaconKey | null>(null);
  const samplesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(15000);

  const tickerRef = useRef<NodeJS.Timeout | null>(null);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null); // just for clarity

  const clearTimers = () => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  const computeStats = (arr: number[]) => {
    if (!arr.length) return { mean: null as number | null, p95: null as number | null, n: 0 };
    const n = arr.length;
    const mean = arr.reduce((s, x) => s + x, 0) / n;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(n - 1, Math.floor(0.95 * n));
    return { mean: Number(mean.toFixed(1)), p95: sorted[idx], n };
  };

  const stop = useCallback(async () => {
    if (!active) return;
    //console.log('🔄 Manually stopping calibration');
    setActive(false);
    clearTimers();
    try {
      await scanner.stop();
    } catch {}
  }, [active, scanner]);

  const start = useCallback(
    async (target: IBeaconKey, durationMs = 15000) => {
      if (active) return; // prevent double start

      //console.log(`🔄 Starting calibration for ${durationMs}ms for beacon:`, target);

      // reset state
      targetRef.current = { ...target, uuid: target.uuid.toLowerCase() };
      samplesRef.current = [];
      startTimeRef.current = Date.now();
      durationRef.current = durationMs;

      setElapsedMs(0);
      setCount(0);
      setAvg(null);
      setP95(null);
      setLastRssi(null);
      setActive(true);

      await scanner.start((batch: IBeaconReading[]) => {
        const t = targetRef.current!;
        for (const r of batch) {
          if (r.uuid.toLowerCase() === t.uuid && r.major === t.major && r.minor === t.minor) {
            samplesRef.current.push(r.rssi);
            setLastRssi(r.rssi);
          }
        }
      });

      // Ticker: update UI + enforce auto-stop by time
      tickerRef.current = setInterval(async () => {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedMs(elapsed);

        const { mean, p95, n } = computeStats(samplesRef.current);
        if (n) {
          setCount(n);
          setAvg(mean);
          setP95(p95);
        }

        // Auto-stop after duration
        if (elapsed >= durationRef.current) {
          //console.log(
            `🔄 Auto-stopping calibration after ${elapsed}ms (target: ${durationRef.current}ms)`,
          );
          // Clear the timer first to prevent multiple calls
          clearTimers();
          setActive(false);
          try {
            await scanner.stop();
          } catch {}
        }
      }, 250);
    },
    [scanner, stop, active],
  );

  // Ensure we stop scanning if the component unmounts
  useEffect(() => {
    return () => {
      clearTimers();
      scanner.stop?.().catch(() => {});
    };
  }, [scanner]);

  const finalize = () => {
    const { mean } = computeStats(samplesRef.current);
    return mean;
  };

  return {
    active,
    elapsedMs,
    count,
    avg,
    p95,
    lastRssi,
    start,
    stop,
    finalize,
  };
}
