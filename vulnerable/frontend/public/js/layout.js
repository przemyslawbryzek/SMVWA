async function loadProfile() {
  try {
    const response = await axios.get(`${API_URL}/users/profile`, {
      withCredentials: true
    });
    
    const user = response.data.user;
    
  const profileImg = document.querySelector('#profile-img-sidebar');
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
async function loadWhoToFollow() {
  try {
    const response = await axios.get(`${API_URL}/users/suggestions`, {
      withCredentials: true
    });
    
    const suggestions = response.data.suggestions || [];
    const container = document.getElementById('who-to-follow-list');
    
    if (!container) {
      console.error('who-to-follow-list element not found');
      return;
    }
    
    container.innerHTML = '';
    
    if (suggestions.length === 0) {
      container.innerHTML = '<div class="text-gray-500 text-sm mt-2">No suggestions available</div>';
      return;
    }
    
    suggestions.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.className = 'flex items-center justify-between mb-4';
      userDiv.innerHTML = `
        <div class="flex items-center">
          <img src="${user.profile_image || 'https://via.placeholder.com/40'}" alt="Profile Image" class="size-10 rounded-full mr-2">
          <div>
            <div class="font-bold">${user.username}</div>
            <div class="text-sm text-gray-500">${user.email}</div>
          </div>
        </div>
        <button class="bg-white text-black px-3 py-1 rounded-full" data-user-id="${user.id}">Follow</button>
      `;
      const followBtn = userDiv.querySelector('button');
      followBtn.onclick = async () => {
        try {
          await axios.post(`${API_URL}/users/${user.id}/follow`, {}, {
            withCredentials: true
          });
          followBtn.textContent = 'Following';
          followBtn.disabled = true;
        } catch (error) {
          alert(error.response?.data?.error || 'Failed to follow user');
        }
      };
      container.appendChild(userDiv);
    });
  } catch (error) {
    console.error('Failed to load who to follow:', error);
    const container = document.getElementById('who-to-follow-list');
    if (container) {
      container.innerHTML = '<div class="text-gray-500 text-sm mt-2">Failed to load suggestions</div>';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadWhoToFollow();
});