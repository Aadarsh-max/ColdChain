import { useEffect, useRef, useState } from 'react';
import { useLive } from '../context/LiveDataContext.jsx';

export const useThrottledValue = (value, ms) => {
  const [output, setOutput] = useState(value);
  const last = useRef(0);

  useEffect(() => {
    const wait = Math.max(0, ms - (Date.now() - last.current));
    const timer = setTimeout(() => {
      last.current = Date.now();
      setOutput(value);
    }, wait);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return output;
};

export const useLiveRefresh = (ms = 3000) => {
  const { ticks } = useLive();
  return useThrottledValue(ticks.telemetry + ticks.alerts + ticks.shipments, ms);
};