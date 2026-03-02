function parseContent(text) {
  if (!text) return '';
  text = text.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline break-all">$1</a>'
  );
  text = text.replace(
    /(?<![="])#([a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/g,
    '<a href="/explore?q=%23$1" class="text-blue-400 hover:underline">#$1</a>'
  );
  text = text.replace(
    /(?<![="])@([a-zA-Z0-9_]+)/g,
    '<a href="/explore?q=$1&type=people" class="text-blue-400 hover:underline">@$1</a>'
  );

  return text;
}

module.exports = { parseContent };
