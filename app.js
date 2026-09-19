(() => {
  "use strict";

  const C = window.BIRTHDAY_CONFIG;

  if (!C || !C.SUPABASE_URL || !C.SUPABASE_PUBLISHABLE_KEY ||
      C.SUPABASE_URL.includes("PASTE_") || C.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")) {
    document.body.innerHTML = `
      <div style="font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:auto">
        <h1>Supabase setup needed ❤️</h1>
        <p>Open <b>config.js</b> and paste your Supabase Project URL and Publishable key.</p>
        <p>Do not paste a service_role or secret key into this website.</p>
      </div>`;
    return;
  }

  const supabase = window.supabase.createClient(
    C.SUPABASE_URL,
    C.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  const $ = (id) => document.getElementById(id);
  const loginScreen = $("loginScreen");
  const birthdayApp = $("birthdayApp");
  const loginForm = $("loginForm");
  const loginMessage = $("loginMessage");
  const forgotPasswordBtn = $("forgotPasswordBtn");
  const resetForm = $("resetForm");
  const resetMessage = $("resetMessage");
  const gallery = $("gallery");
  const musicPlayer = $("musicPlayer");
  const songStatus = $("songStatus");

  let initialized = false;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function showLoginError(message) {
    loginMessage.textContent = message;
    loginMessage.className = "form-message error";
  }

  function setUserText() {
    $("heroName").textContent = C.HUSBAND_NAME + " ❤️";
    $("songTitle").textContent = C.SONG_TITLE;
    $("signature").innerHTML = `Forever yours,<br>❤️ ${escapeHtml(C.YOUR_NAME)}`;
    $("finalTitle").textContent = `Happy Birthday, ${C.HUSBAND_NAME}!`;
    $("finalMessage").textContent = C.FINAL_MESSAGE;
    $("footerNames").textContent = `${C.YOUR_NAME } ❤️ ${C.HUSBAND_NAME}`;
  }

  function renderLetter() {
    $("loveLetter").innerHTML = C.LOVE_LETTER
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
  }

  function renderQuotes() {
    $("quotes").innerHTML = C.QUOTES
      .map((quote) => `<article class="quote-card"><span>“</span><p>${escapeHtml(quote)}</p></article>`)
      .join("");
  }

 async function renderTimeline() {
  const timeline = $("timeline");

  const timelinePhotos = [
    "photos/first_photo.jpeg",
    "photos/special_day.jpeg",
    "photos/trip.jpeg",
    "photos/together.jpeg",
    "photos/favorite-photo.jpeg"
  ];

  const photoUrls = [];

  for (const path of timelinePhotos) {
    try {
      const { data, error } = await supabase
        .storage
        .from(C.BUCKET)
        .createSignedUrl(path, 7200);

      if (error) {
        console.error("Timeline photo error:", path, error);
        photoUrls.push("");
      } else {
        photoUrls.push(data?.signedUrl || "");
      }
    } catch (error) {
      console.error("Timeline photo error:", path, error);
      photoUrls.push("");
    }
  }

  timeline.innerHTML = C.TIMELINE
    .map((item, index) => {
      const imageUrl = photoUrls[index] || "";

      return `
        <article class="timeline-item reveal">

          <div class="timeline-dot">
            ${escapeHtml(item.icon)}
          </div>

          <div class="timeline-card">

            ${
              imageUrl
                ? `
                  <div class="timeline-photo">
                    <img
                      src="${escapeHtml(imageUrl)}"
                      alt="${escapeHtml(item.title)}"
                      loading="lazy"
                    >
                  </div>
                `
                : ""
            }

            <span class="timeline-number">
              0${index + 1}
            </span>

            <h3>
              ${escapeHtml(item.title)}
            </h3>

            <p>
              ${escapeHtml(item.text)}
            </p>

          </div>

        </article>
      `;
    })
    .join("");
}

  async function signedUrlsFor(paths, expiresIn = 7200) {
    if (!paths.length) return [];

    const { data, error } = await supabase
      .storage
      .from(C.BUCKET)
      .createSignedUrls(paths, expiresIn);

    if (error) throw error;

    return (data || []).map((item) => ({
      path: item.path,
      signedUrl: item.signedUrl
    }));
  }

    async function loadPhotos() {
    gallery.innerHTML = `
      <div class="loading-card">
        Preparing our beautiful memories… 💕
      </div>
    `;

    const { data, error } = await supabase
      .storage
      .from(C.BUCKET)
      .list("photos", {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" }
      });

    if (error) throw error;

    const files = (data || []).filter((item) => item.id !== null);

    if (!files.length) {
      gallery.innerHTML = `
        <div class="loading-card">
          No photos were found in the private <b>photos</b> folder yet. ❤️
        </div>
      `;
      return;
    }

    const paths = files.map((file) => `photos/${file.name}`);

    const signed = await signedUrlsFor(paths, 7200);

    const urlByPath = new Map(
      signed.map((item) => [item.path, item.signedUrl])
    );

    gallery.innerHTML = files.map((file, index) => {

      const path = `photos/${file.name}`;
      const url = urlByPath.get(path);

      if (!url) return "";

      const caption =
        C.MEMORY_CAPTIONS?.[file.name] ||
        `A memory I will always treasure ${["❤️", "✨", "🌸", "💕"][index % 4]}`;

      return `
        <article
          class="memory-flip-card reveal"
          tabindex="0"
          role="button"
          aria-label="Click to reveal memory ${index + 1}"
        >

          <div class="memory-flip-inner">

            <!-- FRONT -->
            <div class="memory-flip-front">

              <div class="memory-front-heart">
                💕
              </div>

              <div class="memory-front-number">
                MEMORY ${String(index + 1).padStart(2, "0")}
              </div>

              <h3>
                Our Beautiful Moment
              </h3>

              <p>
                A beautiful memory is waiting for you…
              </p>

              <div class="memory-click">
                Click to reveal ❤️
              </div>

            </div>


            <!-- BACK -->
            <div class="memory-flip-back">

              <div class="memory-photo-wrap">
                <img
                  src="${escapeHtml(url)}"
                  alt="${escapeHtml(caption)}"
                  loading="${index < 3 ? "eager" : "lazy"}"
                >
              </div>

              <div class="memory-back-caption">
                ${escapeHtml(caption)}
              </div>

              <div class="memory-flip-hint">
                Click to flip back ↩
              </div>

            </div>

          </div>

        </article>
      `;

    }).join("");

    activateReveal();
  }

  async function loadMusic() {
    songStatus.textContent = "Finding our private song… 🎵";

    const { data, error } = await supabase
      .storage
      .from(C.BUCKET)
      .list("music", {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" }
      });

    if (error) throw error;

    const files = (data || []).filter((item) => item.id !== null);

    const audioFile = files.find((file) =>
  /\.(mp3|mpeg|mpga|wav|m4a|aac|ogg)$/i.test(file.name)
);

    if (!audioFile) {
      songStatus.textContent = "Upload an MP3, M4A, WAV or OGG into the private music folder.";
      return;
    }

    const [signed] = await signedUrlsFor([`music/${audioFile.name}`], 7200);

    if (!signed?.signedUrl) {
      throw new Error("Could not create a temporary music URL.");
    }

    musicPlayer.src = signed.signedUrl;
    musicPlayer.load();
    songStatus.textContent = `Private song loaded: ${audioFile.name}`;
  }

  async function loadPrivateContent() {
    try {
      await Promise.all([loadPhotos(), loadMusic()]);
    } catch (error) {
      console.error(error);
      showToast("I couldn't open some private memories. Please check your Storage policy.");
      gallery.innerHTML = `
        <div class="loading-card error-card">
          The private memories could not be loaded. Please check the Supabase Storage policy.
        </div>`;
    }
  }

  function startBirthday() {
    $("cake-section")?.scrollIntoView({ behavior: "smooth" });
  }
  function playBirthdayOpeningSound() {
  const AudioContext =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) return;

  const audio = new AudioContext();

  if (audio.state === "suspended") {
    audio.resume();
  }

  const now = audio.currentTime;

  // 💥 BOOM
  const boomOsc = audio.createOscillator();
  const boomGain = audio.createGain();

  boomOsc.type = "sine";
  boomOsc.frequency.setValueAtTime(120, now);
  boomOsc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

  boomGain.gain.setValueAtTime(0.001, now);
  boomGain.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  boomOsc.connect(boomGain);
  boomGain.connect(audio.destination);

  boomOsc.start(now);
  boomOsc.stop(now + 0.55);

  // ✨ Birthday sparkle notes
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, index) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    const start = now + 0.35 + index * 0.12;

    osc.type = "triangle";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      start + 0.45
    );

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(start);
    osc.stop(start + 0.5);
  });
}
  function birthdayOpeningCelebration() {

  // 🎵 Play your uploaded birthday sound
  const birthdaySound = new Audio("birthday-boom.mp3");
  birthdaySound.volume = 1.0;

  // 🎉 Start sound + visual celebration together
  birthdaySound.currentTime = 0;
  birthdaySound.play().catch(() => {});

  const corners = ["left", "right"];

  corners.forEach((side) => {
    const burst = document.createElement("div");

    burst.className = `birthday-burst ${side}`;

    burst.innerHTML = `
      <span>🎉</span>
      <span>✨</span>
      <span>🎊</span>
      <span>💖</span>
      <span>🌟</span>
      <span>💕</span>
    `;

    document.body.appendChild(burst);

    setTimeout(() => burst.remove(), 2200);
  });

  // 💖 Happy Birthday message
  const message = document.createElement("div");

  message.className = "birthday-opening-message";

  message.innerHTML = `
    <div class="birthday-opening-small">🎉 A little surprise for you 🎉</div>
    <div class="birthday-opening-big">HAPPY BIRTHDAY ❤️</div>
    <div class="birthday-opening-sub">Sunu ✨</div>
  `;

  document.body.appendChild(message);

  setTimeout(() => message.remove(), 3000);

  // 💕 Extra hearts
  createHearts(25);
}
  function createHearts(amount = 14) {
    const symbols = ["❤️", "💕", "💗", "💖", "💓", "✨", "🌸"];
    for (let i = 0; i < amount; i++) {
      const heart = document.createElement("span");
      heart.className = "floating-heart";
      heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDuration = `${5 + Math.random() * 5}s`;
      heart.style.fontSize = `${14 + Math.random() * 18}px`;
      document.body.appendChild(heart);
      window.setTimeout(() => heart.remove(), 10000);
    }
  }  
  function candleSparkles() {
    const candle = $("candle");

    if (!candle) return;

    const rect = candle.getBoundingClientRect();

    const symbols = ["✨", "✦", "✧", "💖", "⭐", "🌟"];

    for (let i = 0; i < 45; i++) {
      const sparkle = document.createElement("span");

      sparkle.className = "candle-sparkle";

      sparkle.textContent =
        symbols[Math.floor(Math.random() * symbols.length)];

      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 150;

      sparkle.style.left =
        `${rect.left + rect.width / 2}px`;

      sparkle.style.top =
        `${rect.top + rect.height / 2}px`;

      sparkle.style.setProperty(
        "--spark-x",
        `${Math.cos(angle) * distance}px`
      );

      sparkle.style.setProperty(
        "--spark-y",
        `${Math.sin(angle) * distance}px`
      );

      sparkle.style.fontSize =
        `${10 + Math.random() * 18}px`;

      document.body.appendChild(sparkle);

      window.setTimeout(() => sparkle.remove(), 1400);
    }
  }
     function playCandleSounds() {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const audio = new AudioContext();

    // ✨ Sparkle / magical chime
    const sparkleNotes = [880, 1174.66, 1396.91, 1760];

    sparkleNotes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      oscillator.connect(gain);
      gain.connect(audio.destination);

      const start = audio.currentTime + index * 0.09;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

      oscillator.start(start);
      oscillator.stop(start + 0.55);
    });


    // 👏 Applause / clap sound
    setTimeout(() => {

      const bufferSize = audio.sampleRate * 0.8;
      const buffer = audio.createBuffer(
        1,
        bufferSize,
        audio.sampleRate
      );

      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.8;
      }

      const noise = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();

      noise.buffer = buffer;

      filter.type = "highpass";
      filter.frequency.value = 900;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);

      const now = audio.currentTime;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      noise.start(now);
      noise.stop(now + 0.8);

    }, 350);
  }
   $("candle").addEventListener("click", () => {
    

    $("candleMessage").textContent =
      "Wish made! May it find its way to you. ✨❤️";

    candleSparkles();
    playCandleSounds();
    confetti();
    createHearts(20);
  });
  function confetti() {
    const symbols = ["❤️", "💖", "✨", "🌸", "🎉", "💫"];
    for (let i = 0; i < 70; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      piece.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = `${Math.random() * 15}%`;
      piece.style.animationDuration = `${1.8 + Math.random() * 2.2}s`;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      document.body.appendChild(piece);
      window.setTimeout(() => piece.remove(), 5000);
    }
  }

  function activateReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    elements.forEach((el) => observer.observe(el));
  }

  function setupInteractions() {
        $("candle").addEventListener("click", () => {
      

      $("candleMessage").textContent =
        "Wish made! May it find its way to you. ✨❤️";

      candleSparkles();
      confetti();
      createHearts(20);
    });    
    gallery.addEventListener("click", (event) => {
      const card = event.target.closest(".memory-flip-card");

      if (!card) return;

      card.classList.toggle("flipped");
    });

    gallery.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const card = event.target.closest(".memory-flip-card");

      if (!card) return;

      event.preventDefault();
      card.classList.toggle("flipped");
    });

    $("surpriseBtn").addEventListener("click", () => {
      confetti();
      createHearts(35);
      showToast("I love you. More than this little website can say. ❤️");
    });

    setInterval(() => createHearts(2), 3500);
  }

  function showResetForm() {
    loginScreen.classList.remove("hidden");
    birthdayApp.classList.add("hidden");
    loginForm.classList.add("hidden");
    forgotPasswordBtn.classList.add("hidden");
    loginMessage.textContent = "";
    resetForm.classList.remove("hidden");
    resetMessage.textContent = "";
    $("newPassword").focus();
  }

  function showLoginForm() {
    resetForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    forgotPasswordBtn.classList.remove("hidden");
  }

  forgotPasswordBtn.addEventListener("click", async () => {
    const email = $("email").value.trim();

    if (!email) {
      showLoginError("Please enter your email address first. ❤️");
      $("email").focus();
      return;
    }

    forgotPasswordBtn.disabled = true;
    forgotPasswordBtn.textContent = "Sending reset link…";

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    forgotPasswordBtn.disabled = false;
    forgotPasswordBtn.textContent = "Forgot Password?";

    if (error) {
      console.error(error);
      showLoginError(error.message || "Could not send the reset email.");
      return;
    }

    loginMessage.className = "form-message success";
    loginMessage.textContent =
      "Password reset email sent. Open the newest email and click the link. ❤️";
  });

  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = $("newPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (password.length < 6) {
      resetMessage.className = "form-message error";
      resetMessage.textContent = "Password must be at least 6 characters.";
      return;
    }

    if (password !== confirmPassword) {
      resetMessage.className = "form-message error";
      resetMessage.textContent = "The two passwords do not match. ❤️";
      return;
    }

    const button = resetForm.querySelector("button");
    button.disabled = true;
    button.textContent = "Saving password…";

    const { error } = await supabase.auth.updateUser({ password });

    button.disabled = false;
    button.textContent = "Save New Password ❤️";

    if (error) {
      console.error(error);
      resetMessage.className = "form-message error";
      resetMessage.textContent = error.message || "Could not update the password.";
      return;
    }

    resetMessage.className = "form-message success";
    resetMessage.textContent = "Password updated successfully! Opening your surprise… ❤️";

    window.setTimeout(() => enterBirthdayWorld(), 500);
  });

  async function enterBirthdayWorld() {
    if (initialized) return;
    initialized = true;

    setUserText();
    renderLetter();
    renderQuotes();
    await renderTimeline();
    setupInteractions();
    activateReveal();

    loginScreen.classList.add("hidden");
    birthdayApp.classList.remove("hidden");

    await loadPrivateContent();

    // 🎉 Birthday opening celebration first
birthdayOpeningCelebration();

// Wait for the birthday celebration before starting the song
setTimeout(async () => {
  try {
    await musicPlayer.play();
    songStatus.textContent = "Our song is playing… 🎵❤️";
  } catch {
    songStatus.textContent =
      "Tap “Play Our Song” when you're ready. 🎵";
  }
}, 2800);
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) return;

    const button = loginForm.querySelector("button");
    button.disabled = true;
    button.innerHTML = "Opening your surprise… ✨";
    loginMessage.textContent = "";

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    button.disabled = false;
    button.innerHTML = `Enter My Surprise <span>❤️</span>`;

    if (error) {
      console.error(error);
      showLoginError("That email or password doesn't match. Please try again. ❤️");
      return;
    }

    await enterBirthdayWorld();
  });

  let recoveryMode = false;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryMode = true;
      showResetForm();
      return;
    }

    if (event === "SIGNED_IN" && session && !recoveryMode) {
      enterBirthdayWorld();
    }
  });

  supabase.auth.getSession().then(async ({ data }) => {
    if (data?.session && !recoveryMode) {
      await enterBirthdayWorld();
    }
  });
  
})();
