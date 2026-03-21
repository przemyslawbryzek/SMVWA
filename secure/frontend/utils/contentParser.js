function decodeKnownHtmlEntities(input) {
  let decoded = input;

  // Decode in a few passes to handle strings like "&amp;#39;" or "&amp;lt;".
  for (let i = 0; i < 3; i += 1) {
    const next = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    if (next === decoded) {
      break;
    }
    decoded = next;
  }

  return decoded;
}

function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseContent(text) {
  if (!text) {return '';}

  const normalizedText = decodeKnownHtmlEntities(String(text).replace(/<-/g, '<='));
  let safeText = escapeHtml(normalizedText);

  safeText = safeText.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline break-all">$1</a>'
  );

  safeText = safeText.replace(/(<a\b[^>]*>.*?<\/a>)|([^<]+)/g, (match, anchorTag, textNode) => {
    if (anchorTag) {return anchorTag;}
    if (!textNode) {return match;}

    let updatedTextNode = textNode.replace(
      /(^|[^\w&])#([a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/g,
      '$1<a href="/explore?q=%23$2" class="text-blue-400 hover:underline">#$2</a>'
    );
    updatedTextNode = updatedTextNode.replace(
      /(^|[^\w&])@([a-zA-Z0-9_]+)/g,
      '$1<a href="/explore?q=$2&type=people" class="text-blue-400 hover:underline">@$2</a>'
    );
    return updatedTextNode;
  });

  return safeText;
}

module.exports = { parseContent };
