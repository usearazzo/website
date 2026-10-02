// Mobile menu toggle
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', function() {
  // Lightbox for images
  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button class="lightbox-close">&times;</button><div class="lightbox-content"><img src="" alt=""></div>';
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('img');
  const lightboxClose = lightbox.querySelector('.lightbox-close');

  // Make images with .lightbox-trigger clickable
  document.querySelectorAll('.lightbox-trigger').forEach(function(img) {
    img.style.cursor = 'pointer';
    img.addEventListener('click', function(e) {
      e.stopPropagation();
      lightboxImg.src = this.currentSrc || this.src;
      lightboxImg.alt = this.alt;
      lightbox.classList.add('active');
      document.documentElement.style.overflow = 'hidden';
    });
  });

  // Close lightbox
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.documentElement.style.overflow = '';
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox-content').addEventListener('click', function(e) {
    e.stopPropagation();
  });
  document.addEventListener('click', function() {
    if (lightbox.classList.contains('active')) closeLightbox();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Add anchor links to headings with IDs or first heading in sections with IDs
  document.querySelectorAll('main h1[id], main h2[id], main h3[id], main h4[id]').forEach(function(heading) {
    if (heading.querySelector('.heading-anchor')) return;
    addAnchor(heading, heading.id);
  });

  document.querySelectorAll('main section[id]').forEach(function(section) {
    const heading = section.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > div > h1, :scope > div > h2');
    if (heading && !heading.querySelector('.heading-anchor')) {
      addAnchor(heading, section.id);
    }
  });

  // Page sidebar: on mobile it collapses into a toggleable bar under the header
  document.querySelectorAll('.page-sidebar').forEach(function(sidebar) {
    const toggle = sidebar.querySelector('.page-sidebar-toggle');
    if (!toggle) return;

    function setOpen(open) {
      sidebar.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      setOpen(!sidebar.classList.contains('open'));
    });
    sidebar.querySelectorAll('.page-sidebar-nav a').forEach(function(link) {
      link.addEventListener('click', function() { setOpen(false); });
    });
    document.addEventListener('click', function(e) {
      if (!sidebar.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Bar height feeds the CSS that keeps anchors and the open menu clear of it
    function measureBar() {
      if (toggle.offsetHeight) {
        document.documentElement.style.setProperty('--page-sidebar-bar', (toggle.offsetHeight + 1) + 'px');
      }
    }
    measureBar();
    window.addEventListener('resize', measureBar);

    // The bar names the section in view (in-page sidebars) or the current page (ApiDOM)
    const current = sidebar.querySelector('.page-sidebar-current');
    function showCurrent(link) {
      if (!current) return;
      current.textContent = link ? link.textContent.trim() : '';
      current.hidden = !link;
    }

    const sections = Array.prototype.slice.call(sidebar.querySelectorAll('.page-sidebar-nav a[href^="#"]'))
      .map(function(link) {
        return { link: link, target: document.getElementById(link.getAttribute('href').slice(1)) };
      })
      .filter(function(section) { return section.target; });

    if (!sections.length) {
      showCurrent(sidebar.querySelector('.page-sidebar-nav a[aria-current="page"]'));
      return;
    }

    let active = null;
    function updateActive() {
      const offset = 82 + (toggle.offsetHeight ? toggle.offsetHeight + 1 : 0) + 8;
      let next = null;
      sections.forEach(function(section) {
        if (section.target.getBoundingClientRect().top <= offset) next = section.link;
      });
      // Short last sections never reach the offset; at the page bottom, the last one is in view
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        next = sections[sections.length - 1].link;
      }
      if (next === active) return;
      if (active) active.removeAttribute('aria-current');
      if (next) next.setAttribute('aria-current', 'location');
      active = next;
      showCurrent(next);
    }

    let ticking = false;
    window.addEventListener('scroll', function() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() { ticking = false; updateActive(); });
    }, { passive: true });
    window.addEventListener('resize', updateActive);
    updateActive();
  });

  // Collapsible FAQ: <dt><button aria-controls> toggles the matching <dd>.
  // Without JS every answer stays visible.
  document.querySelectorAll('.faq-toggle[aria-controls]').forEach(function(button) {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    if (!answer) return;
    answer.hidden = true;
    button.addEventListener('click', function() {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      answer.hidden = open;
    });
  });

  // Line numbers for code blocks marked {: .numbered} in Markdown (an excerpt adds
  // data-start="27" to begin at its real line): a gutter element beside
  // the <code>, so Prism (which only rewrites the <code>) leaves it alone and a copy of the
  // code does not pick the numbers up. Without JS the block just has no numbers.
  document.querySelectorAll('pre.numbered').forEach(function(pre) {
    const code = pre.querySelector('code');
    if (!code) return;
    const count = code.textContent.replace(/\n$/, '').split('\n').length;
    const gutter = document.createElement('span');
    gutter.className = 'line-gutter';
    gutter.setAttribute('aria-hidden', 'true');
    const start = parseInt(pre.getAttribute('data-start'), 10) || 1;
    gutter.textContent = Array.from({ length: count }, function(_, i) { return i + start; }).join('\n');
    pre.insertBefore(gutter, code);
  });

  function addAnchor(heading, id) {
    const anchor = document.createElement('a');
    anchor.href = '#' + id;
    anchor.className = 'heading-anchor';
    anchor.setAttribute('aria-label', 'Link to this section');
    anchor.textContent = '#';
    heading.appendChild(anchor);
  }

});
