// DD-FinServe Production Environment Configuration
export const environment = {
  production: true,
  environmentName: 'production',
  // Replace with your actual Production backend URL when deployed (e.g., https://api.ddfinserve.com/api)
  apiUrl: (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? (localStorage.getItem('DD_FINSERVE_API_URL') || 'https://api.ddfinserve.com/api')
    : 'http://localhost:5000/api',
};
