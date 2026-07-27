import TypeIt from 'typeit'

/* Constants */

const PAUSE_TIME = 0;
const TYPE_SPEED = 10;
const DELETE_SPEED = 10;

/* ====== Typing Carousel ====== */

// Get the common prefix amongst strings
function commonPrefixLength(a, b) {
  const maxLen = Math.min(a.length, b.length);
  let i = 0;
  while (i < maxLen && a[i] === b[i]) i++;
  return i;
}

// Shuffle array randomly
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build string array in correct order based on specified options
function buildStringOrder({ starters, base, shuffle, useAllStarters }) {
  if (!shuffle) {
    return [...starters, ...base];
  }
  if (useAllStarters || starters.length === 0) {
    return [...shuffleArray(starters), ...shuffleArray(base)];
  }
  // Only guarantee the first starter leads; the rest join the base pool
  const [first, ...restStarters] = starters;
  const pool = shuffleArray([...restStarters, ...base]);
  return [first, ...pool];
}

// Queue up the strings in the TypeIt instance
function queueStrings(instance, strings, previousString = null) {
  strings.forEach((string, index) => {
    const prev = index === 0 ? previousString : strings[index - 1];
    if (prev == null) {
      instance = instance.type(string);
    } else {
      const prefixLen = commonPrefixLength(prev, string);
      const deleteCount = prev.length - prefixLen;
      const suffix = string.slice(prefixLen);
      if (deleteCount > 0) instance = instance.delete(deleteCount);
      if (suffix.length > 0) instance = instance.type(suffix);
    }
    instance = instance.pause(PAUSE_TIME);
  })
  return instance;
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('typing-carousel-data');
  if (!container) return;

  // Get string lists. If legacy format (just summary) then all will be base.
  const starters = Array.from(container.querySelectorAll('.starters li')).map(el => el.textContent);
  const base = Array.from(container.querySelectorAll('.base li')).map(el => el.textContent);
  if (starters.length === 0 && base.length === 0) return;

  const config = {
    starters,
    base,
    shuffle: container.dataset.shuffle === 'true',
    useAllStarters: container.dataset.useAllStarters !== 'false',
  };

  let currentOrder = buildStringOrder(config);

  const typeItInstance = new TypeIt('#typed', {
    speed: TYPE_SPEED,
    deleteSpeed: DELETE_SPEED,
    lifeLike: true,
    breakLines: false,
    cursorChar: '|',
    waitUntilVisible: true,
    html: false,
    loop: true,
    afterComplete: (instance) => {
      return new Promise((resolve) => {
        const lastString = currentOrder[currentOrder.length - 1]
        currentOrder = buildStringOrder(config) // re-shuffle for next loop
        instance.empty()
        queueStrings(instance, currentOrder, lastString)
        resolve()
      })
    },
  });

  queueStrings(typeItInstance, currentOrder);
  typeItInstance.go();
});
