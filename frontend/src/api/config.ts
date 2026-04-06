// Shared config server URL — used by settings, session, and task stores
// Uses the current page hostname so it works on any domain (localhost, Nosana, Docker, etc.)
export const CONFIG_SERVER = `${window.location.protocol}//${window.location.hostname}:3001`;
