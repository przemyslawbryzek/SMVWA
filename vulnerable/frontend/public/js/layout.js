async function loadProfile() {
  try {
    const response = await axios.get(`${API_URL}/users/profile`, {
      withCredentials: true
    });
    
    const user = response.data.user;
    
    const profileImg = document.querySelector('#profile-img');
    if (profileImg) {
      profileImg.src = user.profile_image || 'https://via.placeholder.com/40';
    }
    
    const usernameEl = document.querySelector('#username');
    if (usernameEl) {
      usernameEl.textContent = user.username;
    }
    const emailEl = document.querySelector('#email');
    if (emailEl) {
      emailEl.textContent = user.email;
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
  }
}

loadProfile();