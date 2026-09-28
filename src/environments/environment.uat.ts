// DD-FinServe UAT (User Acceptance Testing) Environment Configuration
export const environment = {
  production: false,
  environmentName: 'uat',
  // Replace with your actual UAT backend URL when hosted (e.g., https://uat-api.ddfinserve.com/api)
  apiUrl: (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? (localStorage.getItem('DD_FINSERVE_API_URL') || 'https://uat-api.ddfinserve.com/api')
    : 'http://localhost:5000/api',
};
