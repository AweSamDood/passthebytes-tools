// In production, window.API_URL is replaced by envsubst at container startup.
// In development, it will be the literal string "${REACT_APP_API_URL}" or undefined.
const isProd = window.API_URL && !window.API_URL.startsWith('${');

const API_BASE_URL = isProd ? window.API_URL : 'http://localhost:8008';

export { API_BASE_URL };
