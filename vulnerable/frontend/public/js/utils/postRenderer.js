function renderPostHTML(post, options = {}) {
  const { isClickable = true, maxImageWidth = 'max-h-60' } = options; 
  return `
    <a href="/post/${post.id}" class="flex flex-row hover:bg-stone-900 w-full">
      <img class="size-10 rounded-full mr-2" src="${post.author.profile_image || 'https://via.placeholder.com/40'}" alt="Profile Image">
      <div class="flex flex-col w-full">
        <div class="flex flex-row w-full items-center">
          <p class="font-bold">${post.author.username}</p>
          <p class="text-gray-500 ml-2">@${post.author.email}</p>
          <p class="text-gray-500 ml-2">· ${new Date(post.created_at).toLocaleString()}</p>
          <div class="group cursor-pointer ml-auto z-10" data-action="more" data-post-id="${post.id}">
            <img class="size-5 rounded-full hover:bg-cyan-900 group-hover:hidden" src="https://img.icons8.com/?size=100&id=12620&format=png&color=FFFFFF" alt="More Options">
            <img class="size-5 ml-auto rounded-full  hover:bg-cyan-900 hidden group-hover:block" src="https://img.icons8.com/?size=100&id=12620&format=png&color=00FFFF" alt="More Options">
          </div>
        </div>
        <p class="mt-2 text-wrap break-all text-clip w-full">${post.content}</p>
        ${post.attachments && post.attachments.length > 0 ? post.attachments.map(url => `<img class="mt-2 rounded ${maxImageWidth}" src="${url}" alt="">`).join('') : ''}
        <div class="flex flex-row mt-2 gap-4 text-gray-500 justify-between w-2/3">
          <div class="flex flex-row items-center gap-1 group cursor-pointer" data-action="comment" data-post-id="${post.id}">
            <img class="size-5 group-hover:hidden" src="https://img.icons8.com/?size=100&id=143&format=png&color=FFFFFF">
            <img class="size-5 hidden group-hover:block" src="https://img.icons8.com/?size=100&id=143&format=png&color=3B82F6">
            <span class="group-hover:text-blue-500">${post.comments_count || 0}</span>
          </div>
          <div class="flex flex-row items-center gap-1 group hover:text-green-500 cursor-pointer" data-action="repost" data-post-id="${post.id}">
            <img class="size-5 group-hover:hidden" src="https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=FFFFFF">
            <img class="size-5 hidden group-hover:block" src="https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=00FF00">
            <span>${post.reposts_count || 0}</span>
          </div>
          <div class="flex flex-row items-center gap-1 group hover:text-red-500 cursor-pointer" data-action="like" data-post-id="${post.id}">
            <img class="size-5 group-hover:hidden" src="https://img.icons8.com/?size=100&id=85038&format=png&color=FFFFFF">
            <img class="size-5 hidden group-hover:block" src="https://img.icons8.com/?size=100&id=85038&format=png&color=FF0000">
            <span>${post.likes_count || 0}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

function renderPost(post, options = {}) {
  const postDiv = document.createElement('div');
  postDiv.className = 'p-4 border-stone-700 border-b-1 hover:bg-stone-900 w-full';
  postDiv.innerHTML = renderPostHTML(post, options);
  return postDiv;
}
