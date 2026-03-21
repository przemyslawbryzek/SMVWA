// Formats all <time data-date="..."> elements within `root` (or the whole document).
function formatDates(root) {
  (root || document).querySelectorAll('time[data-date]').forEach(el => {
    try {
      el.textContent = new Date(el.dataset.date).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch (err) {
      console.warn('formatDates: could not parse date', el.dataset.date, err);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => formatDates());
window.formatDates = formatDates;
