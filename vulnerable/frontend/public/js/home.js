const API_URL = 'http://localhost:3001/api';

document.getElementById('post-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const content = e.target.elements.content.value;

  try {
    await axios.post(`${API_URL}/posts`, { content }, {
      withCredentials: true
    });
    e.target.reset();
    loadPosts();
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to create post');
  }
});
async function loadPosts() {
  const token = document.cookie.split('; ').find(row => row.startsWith('auth='));
  
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const response = await axios.get(`${API_URL}/posts`, {
      withCredentials: true
    });
    const posts = response.data.posts || [];
    
    const postsContainer = document.getElementById("posts-container");
    postsContainer.innerHTML = "";
    
    if (posts.length > 0) {
      posts.forEach(post => {
        const postDiv = document.createElement("div");
        postDiv.className = "p-4 border-stone-700 border-b-1 hover:bg-stone-900 w-full";
        postDiv.innerHTML = `
          <div class="flex flex-row w-full">
            <img class="size-10 rounded-full mr-2" src="${post.author.profile_image || 'https://via.placeholder.com/40'}" alt="Profile Image">
            <div class="flex flex-col w-full">
              <div class="flex flex-row w-full items-center">
                <p class="font-bold">${post.author.username}</p>
                <p class="text-gray-500 ml-2">@${post.author.email}</p>
                <p class="text-gray-500 ml-2">· ${new Date(post.created_at).toLocaleString()}</p>
                <img class="size-5 ml-auto rounded-full cursor-pointer hover:bg-blue-800" src="https://img.icons8.com/?size=100&id=12620&format=png&color=FFFFFF" alt="More Options">
              </div>
              <p class="mt-2 text-wrap break-all text-clip w-full">${post.content}</p>
              <div class="flex flex-row mt-2 gap-4 text-gray-500 justify-between w-2/3">
                <div class="flex flex-row items-center gap-1 group cursor-pointer">
                  <img class="size-5 group-hover:hidden" src="https://img.icons8.com/?size=100&id=143&format=png&color=FFFFFF">
                  <img class="size-5 hidden group-hover:block" src="https://img.icons8.com/?size=100&id=143&format=png&color=3B82F6">
                  <span class="group-hover:text-blue-500">${post.comments_count || 0}</span>
                </div>
                <div class="flex flex-row items-center gap-1 group hover:text-green-500 cursor-pointer" onclick="repostPost(${post.id})">
                  <img class="size-5 group-hover:hidden" src="https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=FFFFFF">
                  <img class="size-5 hidden group-hover:block" src="https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=00FF00">
                  <span>${post.reposts_count || 0}</span>
                </div>
                <div class="flex flex-row items-center gap-1 group hover:text-red-500 cursor-pointer" onclick="likePost(${post.id})">
                  <img class="size-5 group-hover:hidden" src="https://img.icons8.com/?size=100&id=85038&format=png&color=FFFFFF">
                  <img class="size-5 hidden group-hover:block" src="https://img.icons8.com/?size=100&id=85038&format=png&color=FF0000">
                  <span>${post.likes_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        `;
        postsContainer.appendChild(postDiv);
      });
    } else {
      postsContainer.innerHTML = "<div class=\"p-4 text-center text-gray-500\">No posts yet</div>";
    }
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}
async function likePost(postId) {
  try {
    await axios.get(`${API_URL}/posts/${postId}/like`, {
      withCredentials: true
    });
    loadPosts();
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to like post');
  }
}
async function repostPost(postId) {
  try {
    await axios.get(`${API_URL}/posts/${postId}/repost`, {
      withCredentials: true
    });
    loadPosts();
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to repost post');
  }
}
loadPosts();