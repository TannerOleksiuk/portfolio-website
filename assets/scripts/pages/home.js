// Returns the length of the shared prefix between two strings.
// Used to figure out how many characters we can leave in place
// when transitioning from one string to the next, instead of
// deleting the whole thing and retyping from scratch.
function commonPrefixLength(a, b) {
  const maxLen = Math.min(a.length, b.length);
  let i = 0;
  while (i < maxLen && a[i] === b[i]) {
    i++;
  }
  return i;
}

// Returns a shuffled copy of an array (Fisher-Yates shuffle).
// Does not mutate the original array.
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Adds random variance to a base delay, to make typing/deleting
// speed feel more human instead of perfectly robotic.
function jitter(base, spread) {
  return Math.max(5, base + (Math.random() * spread * 2 - spread))
}

// requestAnimationFrame-based delay. Unlike chained setTimeout calls,
// this checks real elapsed time each frame, which avoids the small
// timing drift that causes visible jitter over long animations.
// Returns a cancel function in case we ever need to abort mid-delay.
function raFDelay(ms, cb) {
  const start = performance.now();
  let frameId;
  function tick(now) {
    if (now - start >= ms) {
      cb();
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }
  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

// Lazily yields one string at a time, forever.
// - If useAllStarters is true, all starters play once, in order
//   (shuffled amongst themselves first if shuffle is true).
// - If useAllStarters is false, only the first starter plays once,
//   and the rest of the starters get folded permanently into the
//   base rotation pool.
// - After starters are exhausted, loops over `base` forever,
//   reshuffling each full pass through if shuffle is true.
function* createStringGenerator({ starters, base, shuffle, useAllStarters }) {
  const starterList = shuffle ? shuffleArray(starters) : starters.slice();
  let pool = base.slice();

  if (useAllStarters) {
    for (const s of starterList) {
      yield s;
    }
  } else if (starterList.length > 0) {
    yield starterList[0];
    pool = pool.concat(starterList.slice(1)); // leftover starters join the base pool
  }

  if (pool.length === 0) {
    return; // nothing left to show, stop cleanly
  }

  while (true) {
    const round = shuffle ? shuffleArray(pool) : pool;
    for (const s of round) {
      yield s;
    }
  }
}

// Drives the typewriter animation: typing forward, deleting back to
// a common prefix when switching strings, pausing between strings,
// and optionally waiting until the element is visible before starting.
function startTypewriter(
  textEl,
  cursorEl,
  generator,
  {
    typeSpeed = 65,
    deleteSpeed = 35,
    pauseMs = 1000,
    lifeLike = true,
    jitterSpread = 20,
    waitUntilVisible = true,
  } = {}
) {
  let current = '';
  let stopped = false;
  let visible = !waitUntilVisible;
  let running = false;

  // Toggles the cursor's blinking animation on/off via CSS class.
  // Solid (non-blinking) while actively typing/deleting, blinking while idle.
  function setTyping(isTyping) {
    if (cursorEl) {
      cursorEl.classList.toggle('is-typing', isTyping);
    }
  }

  function typeTo(target, onDone) {
    const prefixLen = commonPrefixLength(current, target);

    function deleteStep() {
      if (stopped) return;
      if (!visible) {
        raFDelay(100, deleteStep); // poll until visible again
        return;
      }
      if (current.length > prefixLen) {
        current = current.slice(0, -1);
        textEl.textContent = current;
        const delay = lifeLike ? jitter(deleteSpeed, jitterSpread) : deleteSpeed;
        raFDelay(delay, deleteStep);
      } else {
        typeStep();
      }
    }

    function typeStep() {
      if (stopped) return;
      if (!visible) {
        raFDelay(100, typeStep); // poll until visible again
        return;
      }
      if (current.length < target.length) {
        current = target.slice(0, current.length + 1);
        textEl.textContent = current;
        const delay = lifeLike ? jitter(typeSpeed, jitterSpread) : typeSpeed;
        raFDelay(delay, typeStep);
      } else {
        setTyping(false);
        onDone();
      }
    }

    setTyping(true);
    deleteStep();
  }

  function loop() {
    if (stopped) return;
    const { value, done } = generator.next();
    if (done) return;
    typeTo(value, () => raFDelay(pauseMs, loop));
  }

  function start() {
    if (running) return;
    running = true;
    loop();
  }

  if (visible) {
    start();
  } else if (waitUntilVisible) {
    // Only start once the element scrolls into view; pause again if it
    // scrolls back out (handled by the `visible` checks above).
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visible = true;
          start();
        } else {
          visible = false;
        }
      }
    });
    observer.observe(textEl);
  }

  // Returns a cancel function, e.g. to stop the animation on page
  // navigation in an SPA context.
  return () => {
    stopped = true;
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const textEl = document.getElementById('typed-text');
  const cursorEl = document.getElementById('typed-cursor');
  const container = document.getElementById('typing-carousel-data');

  if (!textEl || !container) return;

  const starters = Array.from(container.querySelectorAll('.starters li')).map(
    (li) => li.textContent
  );
  const base = Array.from(container.querySelectorAll('.base li')).map(
    (li) => li.textContent
  );

  if (starters.length === 0 && base.length === 0) return;

  const config = {
    starters,
    base,
    shuffle: container.dataset.shuffle === 'true',
    useAllStarters: container.dataset.useAllStarters !== 'false',
  };

  startTypewriter(textEl, cursorEl, createStringGenerator(config), {
    typeSpeed: 75,
    deleteSpeed: 40,
    pauseMs: 1500,
    lifeLike: true,
    jitterSpread: 25,
    waitUntilVisible: true,
  });
});
