(() => {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');

  function closeMenu() {
    nav?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  menuToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (event) => {
      document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
    }, { passive: true });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const videoCards = Array.from(document.querySelectorAll('[data-video-card]'));

  videoCards.forEach((card) => {
    const video = card.querySelector('video');
    const toggle = card.querySelector('.play-toggle');
    if (!video) return;

    // Видео не запускается автоматически. Загружаем только кадр-превью.
    video.autoplay = false;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.removeAttribute('autoplay');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const markReady = () => {
      if (video.readyState >= 2 || video.currentTime > 0) {
        card.classList.add('is-ready');
      }
    };

    const updateToggle = () => {
      if (!toggle) return;
      const isPaused = video.paused;
      toggle.textContent = isPaused ? 'PLAY' : 'PAUSE';
      toggle.setAttribute(
        'aria-label',
        isPaused ? 'Воспроизвести видео' : 'Поставить видео на паузу'
      );
      card.classList.toggle('is-playing', !isPaused);
    };

    const showPreviewFrame = () => {
      try {
        if (Number.isFinite(video.duration) && video.duration > 0.1 && video.currentTime < 0.04) {
          video.currentTime = 0.05;
        } else {
          markReady();
        }
      } catch {
        markReady();
      }
    };

    video.addEventListener('loadedmetadata', showPreviewFrame, { once: true });
    video.addEventListener('loadeddata', markReady, { passive: true });
    video.addEventListener('canplay', markReady, { passive: true });
    video.addEventListener('seeked', markReady, { passive: true });

    video.addEventListener('error', () => {
      card.classList.add('has-video-error');
      card.classList.remove('is-ready');
      if (toggle) toggle.hidden = true;
    });

    toggle?.addEventListener('click', async () => {
      if (video.paused) {
        // Одновременно воспроизводится только один ролик.
        videoCards.forEach((otherCard) => {
          const otherVideo = otherCard.querySelector('video');
          if (otherVideo && otherVideo !== video) otherVideo.pause();
        });

        try {
          await video.play();
          markReady();
        } catch {
          setTimeout(markReady, 100);
        }
      } else {
        video.pause();
      }
      updateToggle();
    });

    video.addEventListener('play', updateToggle);
    video.addEventListener('pause', updateToggle);
    video.addEventListener('ended', updateToggle);

    if (video.readyState >= 1) showPreviewFrame();
    else video.load();

    updateToggle();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      videoCards.forEach((card) => card.querySelector('video')?.pause());
    }
  });

  const form = document.querySelector('#lead-form');
  const status = document.querySelector('#form-status');
  const submit = form?.querySelector('button[type="submit"]');

  function setStatus(message, type = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('Проверьте обязательные поля.', 'error');
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const buttonText = submit?.querySelector('span');
    if (submit) submit.disabled = true;
    if (buttonText) buttonText.textContent = 'СИГНАЛ ОТПРАВЛЯЕТСЯ...';

    try {
      const endpoint = window.SITE_CONFIG?.formEndpoint;
      if (!endpoint || endpoint.includes('PASTE-WORKER-URL')) {
        throw new Error('Не указан адрес обработчика формы в config.js.');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          contact: data.contact,
          company: data.company,
          projectType: data.projectType,
          message: data.message,
          website: data.website,
          page: window.location.href
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Не удалось отправить заявку.');

      form.reset();
      setStatus('СИГНАЛ ПРИНЯТ. Заявка отправлена менеджеру в Telegram.', 'success');
    } catch (error) {
      setStatus(error.message || 'Ошибка отправки. Попробуйте ещё раз.', 'error');
    } finally {
      if (submit) submit.disabled = false;
      if (buttonText) buttonText.textContent = 'ОТПРАВИТЬ СИГНАЛ';
    }
  });

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
