const API_URL = 'http://localhost:3001/api';

document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    email: document.querySelector('[name="email"]').value,
    password: document.querySelector('[name="password"]').value
  };

  try {
    const response = await axios.post(`${API_URL}/auth/login`, formData, {
      withCredentials: true
    });
    window.location.href = '/';
  } catch (error) {
    alert(error.response?.data?.error || 'Login failed');
  }
});
