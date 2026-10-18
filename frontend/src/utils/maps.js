export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let pending = null;

export const loadGoogleMaps = () => {
  if (!MAPS_KEY) return Promise.reject(new Error('Missing Google Maps API key'));
  if (window.google && window.google.maps && window.google.maps.Map) {
    return Promise.resolve(window.google.maps);
  }
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    window.gm_authFailure = () => window.dispatchEvent(new Event('gmaps-auth-failure'));
    window.__ccgMapsReady = () => resolve(window.google.maps);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&callback=__ccgMapsReady`;
    script.async = true;
    script.onerror = () => {
      pending = null;
      reject(new Error('Could not load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return pending;
};