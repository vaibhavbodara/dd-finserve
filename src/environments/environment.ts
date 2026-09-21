// DD-FinServe Application Environment Configuration
export const environment = {
  production: false,
  // Automatically switches to production backend URL when hosted live, or localhost when developing
  apiUrl: (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? (localStorage.getItem('DD_FINSERVE_API_URL') || 'https://dd-finserve-api.onrender.com/api')
    : 'http://localhost:5000/api',
};
