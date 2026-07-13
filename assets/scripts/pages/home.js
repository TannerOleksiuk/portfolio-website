import TypeIt from 'typeit'

// =========== Typing Carousel ================

function commonPrefixLength(a, b) {
  const maxLen = Math.min(a.length, b.length)
  let i = 0
  while (i < maxLen && a[i] == b[i]) i++
  return i
}

// get data from hidden ul and set as typing data
document.addEventListener('DOMContentLoaded', () => {
  const $ul = document.getElementById('typing-carousel-data')?.children
  if ($ul == null || $ul.length === 0) return

  const strings = Array.from($ul).map($el => $el.textContent)

  let typeItInstance = new TypeIt('#typed', {
    speed: 100,
    deleteSpeed: 100,
    lifeLike: false,
    breakLines: false,
    cursorChar: "|",
    waitUntilVisible: true,
    html: false,
    loop: true
  })

  // Add strings to TypeIt instance. Only delete up to common prefix. 
  strings.forEach((string, index) => {
    if (index === 0) {
      // First string: just type it in full
      typeItInstance = typeItInstance.type(string)
      return
    }

    const prev = strings[index - 1]
    const prefixLen = commonPrefixLength(prev, string)
    const deleteCount = prev.length - prefixLen
    const suffix = string.slice(prefixLen)

    if (deleteCount > 0) {
      typeItInstance = typeItInstance.delete(deleteCount)
    }
    if (suffix.length > 0) {
      typeItInstance = typeItInstance.type(suffix)
    }
  })

  typeItInstance.go()
})
