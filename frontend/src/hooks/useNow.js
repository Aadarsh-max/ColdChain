import { useEffect, useState } from 'react';

export const useNow = (ms = 1000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(timer);
  }, [ms]);

  return now;
};