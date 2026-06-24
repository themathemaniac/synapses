/* --- Scroll Reveal --- */
const revealEls = document.querySelectorAll('.reveal');
const ro = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, { threshold: 0.1 });
revealEls.forEach(el => ro.observe(el));

/* --- Hamburger Menu (Mobile) --- */
(function () {
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('nav-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu when a nav link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu on outside click
  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* --- Input sanitizer (XSS) --- */
function sanitize(s) {
  return s.replace(/[<>"'&\/]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;', '/': '&#x2F;' }[c]));
}
function validEmail(e) {
  return /^[^\s@<>'"]{1,64}@[^\s@<>'"]{1,255}\.[a-zA-Z]{2,}$/.test(e);
}

/* --- Keyboard accessibility --- */
document.querySelectorAll('.course-tile').forEach(el => {
  el.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.click(); }
  });
});

/* --- Lab video poster overlays: click/Enter hides poster & plays video --- */
(function () {
  // Works for <video> elements only (self-hosted).
  // For iframes (YouTube/Vimeo), the poster is hidden and the iframe takes over.
  const pairs = [
    { poster: 'labPoster1', video: 'labVideo1' },
    { poster: 'labPoster2', video: 'labVideo2' },
    { poster: 'labPoster3', video: 'labVideo3' },
  ];

  pairs.forEach(({ poster: posterId, video: videoId }) => {
    const poster = document.getElementById(posterId);
    const video = document.getElementById(videoId);
    if (!poster) return;

    function activate() {
      poster.classList.add('hidden');
      // If it's a real <video> with a src, play it
      if (video && video.tagName === 'VIDEO' && video.src && video.src !== window.location.href) {
        video.play().catch(() => { });
      }
      // If it's an iframe (YouTube/Vimeo), autoplay is handled by ?autoplay=1 in src
    }

    poster.addEventListener('click', activate);
    poster.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });

    // If video has no src, keep poster visible but non-interactive (shows "coming soon")
    if (video && video.tagName === 'VIDEO' && (!video.src || video.src === window.location.href)) {
      poster.style.cursor = 'default';
      // Hide the spin animation so it doesn't suggest interactivity
      const outer = poster.querySelector('.pr-outer');
      if (outer) outer.style.animationPlayState = 'paused';
    }
  });
})();

/* --- Swipeable Card Stack --- */
(function () {
  const deck = document.getElementById('cardDeck');
  const dotsEl = document.getElementById('cardDots');
  if (!deck || !dotsEl) return;

  const cards = Array.from(deck.querySelectorAll('.photo-card'));
  const dots = Array.from(dotsEl.querySelectorAll('.card-dot'));
  const total = cards.length;
  let current = 0;
  let animating = false;

  function getState(idx) {
    const diff = ((idx - current) % total + total) % total;
    if (diff === 0) return 'state-active';
    if (diff === total - 1) return 'state-prev';
    if (diff === 1) return 'state-next';
    return 'state-hidden';
  }

  function applyStates() {
    cards.forEach((c, i) => {
      c.className = 'photo-card ' + getState(i);
    });
    dots.forEach((d, i) => {
      const active = i === current;
      d.classList.toggle('active', active);
      d.setAttribute('aria-selected', String(active));
    });
    deck.setAttribute('aria-label', 'Institute photos — ' + (current + 1) + ' of ' + total);
  }

  function goTo(idx, dir) {
    if (animating) return;
    animating = true;
    const prev = current;
    current = ((idx % total) + total) % total;
    const outClass = dir === 'left' ? 'swipe-left-out' : 'swipe-right-out';
    const prevCard = cards[prev];
    prevCard.classList.add(outClass);
    setTimeout(() => {
      prevCard.classList.remove(outClass);
      applyStates();
      animating = false;
    }, 430);
    applyStates();
  }

  function next() { goTo(current + 1, 'left'); }
  function prev() { goTo(current - 1, 'right'); }

  document.getElementById('stackNext').addEventListener('click', next);
  document.getElementById('stackPrev').addEventListener('click', prev);

  dots.forEach(d => {
    d.addEventListener('click', () => {
      const target = parseInt(d.dataset.dot, 10);
      if (target === current) return;
      goTo(target, target > current ? 'left' : 'right');
    });
  });

  // Drag / swipe
  let dragStart = null, dragX = 0;
  const THRESHOLD = 52;

  function onDragStart(clientX) {
    if (animating) return;
    dragStart = clientX; dragX = 0;
    cards[current].classList.add('is-dragging');
  }
  function onDragMove(clientX) {
    if (dragStart === null) return;
    dragX = clientX - dragStart;
    cards[current].style.transform = 'translateX(' + dragX + 'px) rotate(' + (dragX * 0.04) + 'deg)';
  }
  function onDragEnd() {
    if (dragStart === null) return;
    cards[current].classList.remove('is-dragging');
    cards[current].style.transform = '';
    if (dragX < -THRESHOLD) next();
    else if (dragX > THRESHOLD) prev();
    dragStart = null; dragX = 0;
  }

  deck.addEventListener('mousedown', e => onDragStart(e.clientX));
  window.addEventListener('mousemove', e => onDragMove(e.clientX));
  window.addEventListener('mouseup', onDragEnd);
  deck.addEventListener('touchstart', e => onDragStart(e.touches[0].clientX), { passive: true });
  deck.addEventListener('touchmove', e => { e.preventDefault(); onDragMove(e.touches[0].clientX); }, { passive: false });
  deck.addEventListener('touchend', onDragEnd);

  // Keyboard
  deck.setAttribute('tabindex', '0');
  deck.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  });

  // Auto-advance every 5 seconds, pause on hover/touch
  let autoTimer = setInterval(next, 5000);
  const pauseAuto = () => clearInterval(autoTimer);
  const resumeAuto = () => { autoTimer = setInterval(next, 5000); };
  deck.addEventListener('mouseenter', pauseAuto);
  deck.addEventListener('mouseleave', resumeAuto);
  deck.addEventListener('touchstart', pauseAuto, { passive: true });

  applyStates();
})();

/* =============================================
   PHOTO GALLERY DATA & RENDER
============================================= */
// Replace src values below with your actual image paths, e.g. "assets/gallery/photo-01.jpg"
const photoSrcs = [
  "", "", "",
  "", "", "",
  "", "", "",
  "", "", ""
];

function buildPhotoGallery() {
  const grid = document.getElementById('photoGalleryGrid');
  grid.innerHTML = photoSrcs.map((src, i) => `
    <div class="gallery-photo-item">
      <img src="assets/images/inside/img${i + 1}.jpg" alt="Campus photo ${i + 1}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
    </div>
  `).join('');
}

/* =============================================
   VIDEO GALLERY DATA & RENDER
============================================= */
// Replace src values below with your actual video paths, e.g. "assets/videos/lab-04.mp4"
const videoSrcs = [
  "", "",
  "", "",
  "", "",
  "", ""
];

function buildVideoGallery() {
  const grid = document.getElementById('videoGalleryGrid');
  grid.innerHTML = videoSrcs.map((src, i) => `
    <div class="gallery-video-item">
      <div class="gallery-video-wrap" data-src="assets/videos/inner/in_v${i + 1}.mp4" data-label="Recorded video ${i + 1}">
        <video playsinline preload="metadata" src="assets/videos/inner/in_v${i + 1}.mp4" aria-label="Recorded video ${i + 1}"
          style="width:100%;height:100%;display:block;object-fit:cover;background:#0a0a0a;" tabindex="-1">
        </video>
        <div class="gv-poster" aria-label="Play video ${i + 1}" role="button" tabindex="0">
          <div class="gv-play-btn" aria-hidden="true">
            <div class="pr-outer"></div>
            <div class="pr-inner"></div>
            <div class="pr-tri"></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

/* =============================================
   MODAL OPEN / CLOSE LOGIC
============================================= */
/** Pauses all <video> elements on the page */
function pauseAllVideos() {
  document.querySelectorAll('video').forEach(v => v.pause());
}

/* Build flags — galleries are built once on first open to avoid eager loading */
const _galleryBuilt = { photo: false, video: false };

/** Returns all keyboard-focusable elements inside a container */
function getFocusable(container) {
  return Array.from(container.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.closest('[hidden]') && el.offsetParent !== null);
}

/** Tracks the element that triggered a modal so we can return focus on close */
let _modalOpener = null;

function openModal(id) {
  // Lazy-build galleries on first open
  if (id === 'photoGalleryModal' && !_galleryBuilt.photo) {
    buildPhotoGallery();
    _galleryBuilt.photo = true;
  }
  if (id === 'videoGalleryModal' && !_galleryBuilt.video) {
    buildVideoGallery();
    _galleryBuilt.video = true;
  }
  _modalOpener = document.activeElement;
  const m = document.getElementById(id);
  m.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Move focus to the first focusable element inside the modal
  requestAnimationFrame(() => {
    const focusable = getFocusable(m);
    if (focusable.length) focusable[0].focus();
  });

  // Trap focus inside the modal
  m._trapFocus = function (e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(m);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  m.addEventListener('keydown', m._trapFocus);
}

function closeModal(id) {
  const m = document.getElementById(id);
  m.classList.remove('open');
  document.body.style.overflow = '';
  // Stop any videos playing inside the closed modal
  const innerVideos = m.querySelectorAll('video');
  innerVideos.forEach(v => v.pause());
  // Remove focus trap
  if (m._trapFocus) {
    m.removeEventListener('keydown', m._trapFocus);
    delete m._trapFocus;
  }
  // Return focus to the element that opened the modal
  if (_modalOpener && _modalOpener.focus) {
    _modalOpener.focus();
    _modalOpener = null;
  }
}

// Photo gallery triggers
document.getElementById('openPhotoGallery').addEventListener('click', () => openModal('photoGalleryModal'));
document.getElementById('openPhotoGallery').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal('photoGalleryModal'); }
});
document.getElementById('closePhotoGallery').addEventListener('click', () => closeModal('photoGalleryModal'));

// Video gallery triggers
document.getElementById('openVideoGallery').addEventListener('click', () => openModal('videoGalleryModal'));
document.getElementById('closeVideoGallery').addEventListener('click', () => closeModal('videoGalleryModal'));

// Close on overlay click (outside modal content)
['photoGalleryModal', 'videoGalleryModal', 'pdfScheduleModal', 'pdfScheduleModal2', 'pdfScheduleModal3'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) closeModal(id);
  });
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('photoGalleryModal');
    closeModal('videoGalleryModal');
    closeModal('pdfScheduleModal');
    closeModal('pdfScheduleModal2');
    closeModal('pdfScheduleModal3');
  }
});

/* =============================================
   PDF SCHEDULE MODAL — open on card click (lazy-loads PDF src)
============================================= */
[
  { cardId: 'scheduleCard', modalId: 'pdfScheduleModal', closeId: 'closePdfSchedule', iframeId: 'scheduleIframe' },
  { cardId: 'scheduleCard2', modalId: 'pdfScheduleModal2', closeId: 'closePdfSchedule2', iframeId: 'scheduleIframe2' },
  { cardId: 'scheduleCard3', modalId: 'pdfScheduleModal3', closeId: 'closePdfSchedule3', iframeId: 'scheduleIframe3' },
].forEach(({ cardId, modalId, closeId, iframeId }) => {
  const card = document.getElementById(cardId);
  if (!card) return;

  function openSchedule() {
    // Lazy-load the PDF: set src from data-src on first open only.
    // Note: an iframe with no src attribute returns window.location.href via .src
    const iframe = document.getElementById(iframeId);
    if (iframe && iframe.dataset.src && iframe.src !== iframe.dataset.src) {
      iframe.src = iframe.dataset.src;
    }
    openModal(modalId);
  }

  card.addEventListener('click', openSchedule);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSchedule(); }
  });

  document.getElementById(closeId).addEventListener('click', () => closeModal(modalId));
});

/* =============================================
   VIDEO THEATRE — open on lab-video-wrap or gallery-video-wrap click
============================================= */
(function () {
  const overlay = document.getElementById('videoTheatre');
  const backdrop = document.getElementById('theatreBackdrop');
  const theatreVid = document.getElementById('theatreVideo');
  const theatreTitle = document.getElementById('theatreTitle');
  const closeBtn = document.getElementById('theatreClose');

  if (!overlay || !theatreVid) return;

  /** Opens the theatre modal and plays the given video src */
  function openTheatre(src, title) {
    if (!src) return;                          // empty src → nothing to show
    pauseAllVideos();                          // Stop all other videos first
    theatreTitle.textContent = title || '';
    theatreVid.src = src;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    theatreVid.play().catch(() => { });         // auto-play; browser may require interaction
  }

  /** Closes the theatre modal and stops playback */
  function closeTheatre() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    theatreVid.pause();
    theatreVid.src = '';                       // release the resource
    theatreTitle.textContent = '';
  }

  // ── Close triggers ──────────────────────────────────────────────
  closeBtn.addEventListener('click', closeTheatre);
  backdrop.addEventListener('click', closeTheatre);

  // Escape key (added alongside existing Escape handler)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeTheatre();
  });

  // ── LAB videos (lab-video-wrap / lab-poster) ─────────────────────
  // Intercept the existing poster click so theatre opens instead of inline play.
  // We query all .lab-video-wrap elements and listen on the wrapping div.
  document.querySelectorAll('.lab-video-wrap').forEach(wrap => {
    const vid = wrap.querySelector('video');
    const poster = wrap.querySelector('.lab-poster');

    const src = vid ? vid.getAttribute('src') : '';
    const label = vid ? (vid.getAttribute('aria-label') || 'Lab Video') : 'Lab Video';

    // Clicking anywhere inside the wrap (poster button OR the video element itself)
    // should open the theatre — but only if there is an actual src.
    // capture:true ensures this fires BEFORE the inner poster bubble listener.
    wrap.addEventListener('click', e => {
      if (!src || src === window.location.href) return;   // no video yet
      e.stopPropagation();
      e.preventDefault();
      openTheatre(src, label);
    }, true); // capture phase

    // If the poster has a click listener from the earlier IIFE, its 'activate'
    // would normally trigger. We suppress inline play by capturing in the
    // wrap's listener above (stopPropagation alone is enough because the poster
    // listener is on the same element tree — wrap captures first via useCapture).
    // For safety also stop the poster's default action on keydown:
    if (poster) {
      poster.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && src && src !== window.location.href) {
          e.preventDefault();
          e.stopPropagation();
          openTheatre(src, label);
        }
      }, true); // capture phase so it runs before the existing listener
    }
  });

  // ── GALLERY videos (gallery-video-wrap, generated by buildVideoGallery) ──
  // Use event delegation on the grid since tiles are injected dynamically.
  const videoGrid = document.getElementById('videoGalleryGrid');
  if (videoGrid) {
    // Click on .gv-poster or .gallery-video-wrap → open theatre
    videoGrid.addEventListener('click', e => {
      const wrap = e.target.closest('.gallery-video-wrap');
      if (!wrap) return;
      const src = wrap.dataset.src;
      const label = wrap.dataset.label || 'Gallery Video';
      if (!src) return;
      // Hide the poster overlay so the video shows underneath
      const poster = wrap.querySelector('.gv-poster');
      if (poster) poster.classList.add('hidden');
      e.stopPropagation();
      openTheatre(src, label);
    });

    // Keyboard accessibility: Enter / Space on .gv-poster
    videoGrid.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const poster = e.target.closest('.gv-poster');
      if (!poster) return;
      e.preventDefault();
      const wrap = poster.closest('.gallery-video-wrap');
      if (!wrap) return;
      const src = wrap.dataset.src;
      const label = wrap.dataset.label || 'Gallery Video';
      if (!src) return;
      poster.classList.add('hidden');
      openTheatre(src, label);
    });

    // Prevent double-play: pause all others when one plays
    videoGrid.addEventListener('play', e => {
      const playingVid = e.target;
      if (playingVid.tagName === 'VIDEO') {
        document.querySelectorAll('video').forEach(v => {
          if (v !== playingVid) v.pause();
        });
      }
    }, true); // use capture to catch event bubbles from <video>
  }
})();

/* Chat widget is handled by scripts/chatbot.js — see that file. */
/* --- Testimonial Carousel --- */
(function() {
  const cards = Array.from(document.querySelectorAll('.testi-carousel .testi-card'));
  if (cards.length === 0) return;
  
  let currentIndex = 0;
  
  function updateCarousel() {
    cards.forEach((card, index) => {
      card.classList.remove('pos-center', 'pos-left', 'pos-right', 'pos-hidden-left', 'pos-hidden-right');
      
      let diff = index - currentIndex;
      if (diff < -Math.floor(cards.length / 2)) diff += cards.length;
      if (diff > Math.floor(cards.length / 2)) diff -= cards.length;
      
      if (diff === 0) {
        card.classList.add('pos-center');
      } else if (diff === -1) {
        card.classList.add('pos-left');
      } else if (diff === 1) {
        card.classList.add('pos-right');
      } else if (diff < -1) {
        card.classList.add('pos-hidden-left');
      } else if (diff > 1) {
        card.classList.add('pos-hidden-right');
      }
    });
  }

  updateCarousel();
  
  let autoPlay = setInterval(nextSlide, 3500);

  function nextSlide() {
    currentIndex = (currentIndex + 1) % cards.length;
    updateCarousel();
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    updateCarousel();
  }

  const btnNext = document.querySelector('.carousel-next');
  const btnPrev = document.querySelector('.carousel-prev');

  if (btnNext && btnPrev) {
    btnNext.addEventListener('click', () => {
      clearInterval(autoPlay);
      nextSlide();
      autoPlay = setInterval(nextSlide, 3500);
    });

    btnPrev.addEventListener('click', () => {
      clearInterval(autoPlay);
      prevSlide();
      autoPlay = setInterval(nextSlide, 3500);
    });
  }
})();

/* ============================================================
   FEATURE MODAL LOGIC
============================================================ */
window.openFeatureModal = function(courseName, featureName, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const overlay = document.getElementById('featureModalOverlay');
  const title = document.getElementById('featureModalTitle');
  const sub = document.getElementById('featureModalSub');
  
  if (overlay && title && sub) {
    title.textContent = courseName;
    sub.textContent = featureName + ' - Detailed Information';
    overlay.classList.add('open');
    
    // Reset iframe state when opening modal
    const iframe = document.getElementById('featurePdfIframe');
    if (iframe) {
      iframe.style.display = 'none';
      iframe.src = '';
    }
  }
};

window.loadFeaturePdf = function(pdfUrl) {
  const iframe = document.getElementById('featurePdfIframe');
  if (iframe) {
    iframe.src = pdfUrl;
    iframe.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('featureModalOverlay');
  const closeBtn = document.getElementById('closeFeatureModal');
  const inner = document.getElementById('featureModalInner');

  if (overlay && closeBtn && inner) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
      const embed = document.getElementById('featurePdfEmbed');
      if (embed) { embed.src = ''; embed.style.display = 'none'; }
      const modalText = document.getElementById('featureModalText');
      if (modalText) modalText.style.display = 'block';
    });

    overlay.addEventListener('click', (e) => {
      if (!inner.contains(e.target)) {
        overlay.classList.remove('open');
        const embed = document.getElementById('featurePdfEmbed');
        if (embed) { embed.src = ''; embed.style.display = 'none'; }
        const modalText = document.getElementById('featureModalText');
        if (modalText) modalText.style.display = 'block';
      }
    });
  }
  
  });
});

window.toggleDropdown = function(element, event) {
  event.stopPropagation();
  event.preventDefault();

  const PORTAL_ID = 'featureDropdownPortal';
  let portal = document.getElementById(PORTAL_ID);

  // If portal exists and is anchored to this same element, toggle it off
  if (portal && portal._anchor === element) {
    portal.remove();
    return;
  }

  // Remove any existing portal
  if (portal) portal.remove();

  // Clone the dropdown content from the element
  const sourceDropdown = element.querySelector('.feature-dropdown');
  if (!sourceDropdown) return;

  // Create portal
  portal = document.createElement('div');
  portal.id = PORTAL_ID;
  portal._anchor = element;
  portal.innerHTML = sourceDropdown.innerHTML;

  // Style: fixed position, same look as the inline dropdown
  Object.assign(portal.style, {
    position:     'fixed',
    background:   'white',
    border:       '1px solid #eee',
    borderRadius: '10px',
    boxShadow:    '0 8px 24px rgba(0,0,0,0.14)',
    width:        '160px',
    zIndex:       '99999',
    textAlign:    'center',
    padding:      '4px 0',
  });

  // Position below the clicked box
  const rect = element.getBoundingClientRect();
  portal.style.top  = (rect.bottom + 8) + 'px';
  portal.style.left = (rect.left + rect.width / 2 - 80) + 'px';

  // Copy click listeners from cloned items
  portal.querySelectorAll('.dropdown-item').forEach((item, i) => {
    const src = sourceDropdown.querySelectorAll('.dropdown-item')[i];
    if (src) {
      const onclickAttr = src.getAttribute('onclick');
      if (onclickAttr) item.setAttribute('onclick', onclickAttr);
    }
  });

  document.body.appendChild(portal);

  // Close when clicking outside
  const onOutsideClick = (e) => {
    if (!portal.contains(e.target) && e.target !== element) {
      portal.remove();
      document.removeEventListener('click', onOutsideClick, true);
    }
  };
  setTimeout(() => document.addEventListener('click', onOutsideClick, true), 0);
};

window.openSyllabusPdf = function(pdfUrl, titleText, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Remove portal dropdown if open
  const portal = document.getElementById('featureDropdownPortal');
  if (portal) portal.remove();
  
  const overlay   = document.getElementById('featureModalOverlay');
  const title     = document.getElementById('featureModalTitle');
  const sub       = document.getElementById('featureModalSub');
  const embed     = document.getElementById('featurePdfEmbed');
  const modalText = document.getElementById('featureModalText');
  
  if (!overlay || !embed) return;

  title.textContent = 'Course Syllabus';
  sub.textContent = titleText;
  
  // Hide text, show PDF
  if (modalText) modalText.style.display = 'none';
  embed.src = pdfUrl;
  embed.style.display = 'block';
  embed.style.height = '100%';
  
  overlay.classList.add('open');
};
