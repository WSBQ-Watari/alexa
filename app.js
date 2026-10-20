/**
 * Main Smart Display Application Controller (Enhanced Version)
 * Fixes:
 * - Direct Microphone activation & Wake-Word Listening
 * - Dual Speech Synthesis (Native Android Bridge + Robust Web SpeechSynthesis)
 * - Automatic Phone GPS Location request for live local weather
 * - Real-time speech display & Voice Audio feedback
 */

class SmartDisplayApp {
  constructor() {
    this.state = 'idle'; // 'idle', 'listening', 'processing', 'speaking'
    this.recognition = null;
    this.isRecognitionRunning = false;
    this.activeListenTimer = null;
    this.activeListenTimeoutMs = 7000;
    this.wakeLock = null;
    this.currentVoice = null;
    this.lastSpokenText = '';

    // Configuration
    this.config = {
      wakeWord: 'alexa',
      continuousListening: localStorage.getItem('cfg_continuous') !== 'false',
      keepAwake: localStorage.getItem('cfg_awake') !== 'false',
      weatherCity: localStorage.getItem('cfg_city') || 'Detecting Location...',
      voicePreference: localStorage.getItem('cfg_voice') || 'auto'
    };

    // DOM Elements
    this.dom = {
      body: document.body,
      clockHours: document.getElementById('clockHours'),
      clockMinutes: document.getElementById('clockMinutes'),
      clockSeconds: document.getElementById('clockSeconds'),
      clockPeriod: document.getElementById('clockPeriod'),
      dateDay: document.getElementById('dateDay'),
      dateFull: document.getElementById('dateFull'),
      weatherCard: document.getElementById('weatherCard'),
      weatherTemp: document.getElementById('weatherTemp'),
      weatherCondition: document.getElementById('weatherCondition'),
      weatherIcon: document.getElementById('weatherIcon'),
      weatherCity: document.getElementById('weatherCity'),
      weatherHigh: document.getElementById('weatherHigh'),
      weatherLow: document.getElementById('weatherLow'),
      weatherHumidity: document.getElementById('weatherHumidity'),
      tickerText: document.getElementById('tickerText'),
      statusPill: document.getElementById('statusPill'),
      statusDot: document.getElementById('statusDot'),
      statusLabel: document.getElementById('statusLabel'),
      modeBadge: document.getElementById('modeBadge'),
      alexaRing: document.getElementById('alexaRing'),
      micToggleBtn: document.getElementById('micToggleBtn'),
      userTranscript: document.getElementById('userTranscript'),
      alexaResponse: document.getElementById('alexaResponse'),
      responseSourceTag: document.getElementById('responseSourceTag'),
      dynamicResultCard: document.getElementById('dynamicResultCard'),
      resultCardHeader: document.getElementById('resultCardHeader'),
      resultCardBody: document.getElementById('resultCardBody'),
      replaySpeechBtn: document.getElementById('replaySpeechBtn'),
      stopSpeechBtn: document.getElementById('stopSpeechBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      fullscreenBtn: document.getElementById('fullscreenBtn'),
      settingsModal: document.getElementById('settingsModal'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      saveSettingsBtn: document.getElementById('saveSettingsBtn'),
      geminiApiKeyInput: document.getElementById('geminiApiKeyInput'),
      aiModelSelect: document.getElementById('aiModelSelect'),
      weatherCityInput: document.getElementById('weatherCityInput'),
      voiceSelect: document.getElementById('voiceSelect'),
      keepAwakeToggle: document.getElementById('keepAwakeToggle'),
      continuousListeningToggle: document.getElementById('continuousListeningToggle'),
      toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
      batteryText: document.getElementById('batteryText'),
      batteryLevelBar: document.getElementById('batteryLevelBar'),
      networkText: document.getElementById('networkText'),
      textInputForm: document.getElementById('textInputForm'),
      manualCommandInput: document.getElementById('manualCommandInput')
    };

    this.suggestions = [
      '"Alexa, time kya hua hai?"',
      '"Alexa, 125 plus 375 kitna hota hai?"',
      '"Alexa, aaj konsi date hai?"',
      '"Alexa, ek mazedaar joke sunao"',
      '"Alexa, chai kaise banate hain?"',
      '"Alexa, tum kaun ho?"',
      '"Alexa, 500 ka 20 percent kitna hai?"',
      '"Alexa, aaj ka mausam kaisa hai?"'
    ];
    this.suggestionIndex = 0;
  }

  /**
   * Initializes the application
   */
  async init() {
    console.log('Starting Alexa Smart Display...');

    // 1. Clock & Date Loop
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // 2. Suggestion Ticker
    this.startSuggestionTicker();

    // 3. Request Phone / Browser GPS Location & Fetch Weather
    this.requestDeviceLocation();

    // 4. Monitoring (Battery & Network)
    this.initBatteryMonitor();
    this.initNetworkMonitor();

    // 5. Speech Synthesis Voice Loading
    this.initTTS();

    // 6. Screen WakeLock
    if (this.config.keepAwake) {
      this.requestWakeLock();
    }

    // 7. Setup Event Listeners
    this.setupEventListeners();

    // 8. Initialize Speech Recognition
    this.initSpeechRecognition();

    // 9. Load Settings Form values
    this.loadSettingsForm();

    console.log('Alexa Smart Display ready.');
  }

  /**
   * Clock updates
   */
  updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;

    this.dom.clockHours.textContent = hours < 10 ? '0' + hours : hours;
    this.dom.clockMinutes.textContent = minutes < 10 ? '0' + minutes : minutes;
    this.dom.clockSeconds.textContent = seconds < 10 ? '0' + seconds : seconds;
    this.dom.clockPeriod.textContent = period;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    this.dom.dateDay.textContent = days[now.getDay()];
    this.dom.dateFull.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  startSuggestionTicker() {
    setInterval(() => {
      this.suggestionIndex = (this.suggestionIndex + 1) % this.suggestions.length;
      this.dom.tickerText.style.opacity = '0';
      setTimeout(() => {
        this.dom.tickerText.textContent = this.suggestions[this.suggestionIndex];
        this.dom.tickerText.style.opacity = '1';
      }, 300);
    }, 6000);
  }

  /**
   * Requests real GPS Location from the Phone or Browser
   */
  requestDeviceLocation() {
    this.dom.weatherCity.textContent = '📍 Locating...';

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          console.log(`GPS Location obtained: Lat ${lat}, Lon ${lon}`);
          await this.reverseGeocodeAndFetchWeather(lat, lon);
        },
        (error) => {
          console.warn('Geolocation denied or unavailable:', error.message);
          // Fallback to configured city or Delhi
          const fallback = localStorage.getItem('cfg_city') || 'Delhi';
          this.fetchWeatherByCity(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      const fallback = localStorage.getItem('cfg_city') || 'Delhi';
      this.fetchWeatherByCity(fallback);
    }
  }

  /**
   * Reverse geocodes coordinates to city name and fetches weather
   */
  async reverseGeocodeAndFetchWeather(lat, lon) {
    try {
      // Free client-side reverse geocode
      const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const res = await fetch(geoUrl);
      const data = await res.json();

      const city = data.city || data.locality || data.principalSubdivision || 'Your Location';
      const region = data.principalSubdivision || data.countryName || 'India';
      const displayName = `📍 ${city}, ${region}`;

      this.dom.weatherCity.textContent = displayName;
      this.config.weatherCity = city;

      // Fetch weather for these exact coordinates
      await this.fetchWeatherCoords(lat, lon);
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
      this.fetchWeatherCoords(lat, lon);
    }
  }

  /**
   * Fetch weather by latitude & longitude from Open-Meteo (100% Free)
   */
  async fetchWeatherCoords(lat, lon) {
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const response = await fetch(weatherUrl);
      const data = await response.json();

      if (data.current) {
        const temp = Math.round(data.current.temperature_2m);
        const humidity = data.current.relative_humidity_2m;
        const code = data.current.weather_code;
        const { label, icon } = this.mapWeatherCode(code);

        this.dom.weatherTemp.textContent = `${temp}°`;
        this.dom.weatherCondition.textContent = label;
        this.dom.weatherIcon.textContent = icon;
        this.dom.weatherHumidity.textContent = `${humidity}%`;

        if (data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max[0]) {
          this.dom.weatherHigh.textContent = `${Math.round(data.daily.temperature_2m_max[0])}°`;
          this.dom.weatherLow.textContent = `${Math.round(data.daily.temperature_2m_min[0])}°`;
        }
      }
    } catch (e) {
      console.warn('Weather fetch error:', e);
    }
  }

  /**
   * Fetch weather by City Name
   */
  async fetchWeatherByCity(cityName) {
    try {
      this.dom.weatherCity.textContent = `📍 ${cityName}`;
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude, name, country } = geoData.results[0];
        this.dom.weatherCity.textContent = `📍 ${name}, ${country || 'India'}`;
        await this.fetchWeatherCoords(latitude, longitude);
      }
    } catch (e) {
      console.warn('Weather by city failed:', e);
    }
  }

  mapWeatherCode(code) {
    if (code === 0) return { label: 'Clear Sky', icon: '☀️' };
    if (code === 1 || code === 2) return { label: 'Mainly Clear', icon: '🌤️' };
    if (code === 3) return { label: 'Overcast', icon: '☁️' };
    if (code === 45 || code === 48) return { label: 'Foggy', icon: '🌫️' };
    if ([51, 53, 55, 61, 63, 65].includes(code)) return { label: 'Rain Showers', icon: '🌧️' };
    if ([71, 73, 75].includes(code)) return { label: 'Snow Flurries', icon: '❄️' };
    if ([80, 81, 82].includes(code)) return { label: 'Heavy Rain', icon: '⛈️' };
    if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: '⚡' };
    return { label: 'Partly Cloudy', icon: '⛅' };
  }

  async initBatteryMonitor() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        const updateBattery = () => {
          const level = Math.round(battery.level * 100);
          this.dom.batteryText.textContent = `${level}%${battery.charging ? ' ⚡' : ''}`;
          const barWidth = Math.max(2, Math.round((level / 100) * 12));
          this.dom.batteryLevelBar.setAttribute('width', barWidth);
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      } catch (e) {
        // Fallback
      }
    } else {
      this.dom.batteryText.textContent = 'Power OK';
    }
  }

  initNetworkMonitor() {
    const updateNetwork = () => {
      if (navigator.onLine) {
        this.dom.networkText.textContent = 'Online';
        this.dom.networkText.style.color = 'var(--text-secondary)';
      } else {
        this.dom.networkText.textContent = 'Offline (Local Only)';
        this.dom.networkText.style.color = 'var(--alexa-amber)';
      }
    };
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    updateNetwork();
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        document.addEventListener('visibilitychange', async () => {
          if (this.wakeLock !== null && document.visibilityState === 'visible') {
            this.wakeLock = await navigator.wakeLock.request('screen');
          }
        });
      } catch (err) {
        console.warn('WakeLock unavailable:', err);
      }
    }
  }

  /**
   * Initializes Speech Recognition
   */
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition not supported in this environment.');
      this.dom.statusLabel.textContent = 'Tap to Speak / Type Command';
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-IN'; // Optimized for Indian English & Hinglish

      this.recognition.onstart = () => {
        this.isRecognitionRunning = true;
        console.log('Speech recognition engine active.');
        if (this.state === 'idle') {
          this.setUIState('idle');
        }
      };

      this.recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }

        const recognizedText = (finalText || interimText).trim();
        if (recognizedText) {
          this.handleHeardSpeech(recognizedText, !!finalText);
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          return; // Ignore normal silence
        }
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.dom.statusLabel.textContent = 'Mic Permission Needed (Tap Mic)';
        }
      };

      this.recognition.onend = () => {
        this.isRecognitionRunning = false;
        // Auto restart if continuous listening is enabled and not speaking
        if (this.config.continuousListening && this.state !== 'speaking') {
          setTimeout(() => {
            this.startListening();
          }, 350);
        }
      };

      // Try starting listening
      this.startListening();

    } catch (e) {
      console.error('Speech recognition setup error:', e);
    }
  }

  /**
   * Safely starts speech recognition engine
   */
  startListening() {
    if (!this.recognition || this.isRecognitionRunning) return;
    try {
      this.recognition.start();
    } catch (e) {
      // Ignored if already started
    }
  }

  /**
   * Handles text detected from microphone
   */
  handleHeardSpeech(rawText, isFinal) {
    const textLower = rawText.toLowerCase();

    // In Idle mode: scan for Wake Word
    if (this.state === 'idle') {
      const wakeWords = ['alexa', 'hey alexa', 'suno alexa', 'hello alexa', 'ok alexa'];
      const matched = wakeWords.find(w => textLower.includes(w));

      if (matched) {
        console.log('Wake-word detected:', matched);
        window.audioSynth.playWakeChime();

        // Extract command after wake word if spoken together
        const idx = textLower.indexOf(matched);
        const command = rawText.substring(idx + matched.length).replace(/^[,.\s]+/, '').trim();

        if (command.length > 2) {
          this.setUIState('listening');
          this.dom.userTranscript.textContent = `"${rawText}"`;
          setTimeout(() => {
            this.dispatchCommand(command);
          }, 400);
        } else {
          this.enterActiveListening();
        }
      }
    }
    // In Active Listening mode: capture command
    else if (this.state === 'listening') {
      this.dom.userTranscript.textContent = `"${rawText}"`;

      if (isFinal) {
        clearTimeout(this.activeListenTimer);
        this.dispatchCommand(rawText);
      }
    }
  }

  /**
   * Enters active listening state (e.g. after mic tap or wake word)
   */
  enterActiveListening() {
    window.audioSynth.initContext();
    this.startListening();
    this.setUIState('listening');
    this.dom.userTranscript.textContent = 'Listening to your command...';

    clearTimeout(this.activeListenTimer);
    this.activeListenTimer = setTimeout(() => {
      if (this.state === 'listening') {
        this.speakResponse('Maine koi sawal nahi suna. Jab bhi zaroorat ho, bas "Alexa" bolein.');
      }
    }, this.activeListenTimeoutMs);
  }

  /**
   * Dispatches command through Local Engine or Online AI
   */
  async dispatchCommand(userCommand) {
    const cleanedCommand = userCommand.trim();
    if (!cleanedCommand) return;

    this.dom.userTranscript.textContent = `"${cleanedCommand}"`;
    this.dom.dynamicResultCard.style.display = 'none';

    // 1. Check Local Offline Commands First
    const localResult = window.localCommands.process(cleanedCommand);

    if (localResult && localResult.matched) {
      console.log('Processed by Local Engine:', localResult.type);

      if (localResult.action === 'stop_speech') {
        this.stopSpeaking();
        this.setUIState('idle');
        return;
      }
      if (localResult.action === 'clear_screen') {
        this.dom.userTranscript.textContent = 'Screen cleared.';
        this.dom.alexaResponse.textContent = 'Namaste! Main aapka Alexa assistant hoon.';
        this.dom.dynamicResultCard.style.display = 'none';
        this.setUIState('idle');
        return;
      }

      if (localResult.card) {
        this.dom.resultCardHeader.textContent = localResult.card.title;
        this.dom.resultCardBody.textContent = localResult.card.value;
        this.dom.dynamicResultCard.style.display = 'block';
      }

      this.dom.alexaResponse.textContent = localResult.displayResponse;
      this.dom.responseSourceTag.textContent = 'Offline Engine (0ms)';
      this.dom.responseSourceTag.style.background = 'rgba(32, 226, 215, 0.15)';
      this.dom.responseSourceTag.style.color = 'var(--alexa-active)';

      // Speak response aloud!
      this.speakResponse(localResult.spokenResponse);
      return;
    }

    // 2. Route to Online AI (Free Zero-Setup Cloud AI or Gemini)
    console.log('Routing to Online AI...');
    this.setUIState('processing');

    const aiResult = await window.aiService.askAI(cleanedCommand);

    this.dom.alexaResponse.textContent = aiResult.text;
    this.dom.responseSourceTag.textContent = aiResult.source;
    this.dom.responseSourceTag.style.background = aiResult.isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 202, 255, 0.15)';
    this.dom.responseSourceTag.style.color = aiResult.isError ? 'var(--alexa-red)' : 'var(--alexa-cyan)';

    // Speak AI response aloud!
    this.speakResponse(aiResult.spokenText || aiResult.text);
  }

  /**
   * Speaks response through Bluetooth speaker or PC audio
   */
  speakResponse(textToSpeak) {
    if (!textToSpeak) {
      this.setUIState('idle');
      return;
    }

    this.lastSpokenText = textToSpeak;
    this.setUIState('speaking');

    // Priority 1: Native Android Bridge (When running inside Samsung Galaxy J6 APK)
    if (window.AndroidBridge && typeof window.AndroidBridge.speak === 'function') {
      try {
        console.log('Speaking via Native Android TTS:', textToSpeak);
        window.audioSynth.startEqualizer();
        window.AndroidBridge.speak(textToSpeak);
        return;
      } catch (e) {
        console.warn('AndroidBridge speak failed:', e);
      }
    }

    // Priority 2: Browser Web SpeechSynthesis
    if ('speechSynthesis' in window) {
      try {
        // Resume engine if paused/suspended by browser
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.volume = 1.0;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Pick voice safely without forcing mismatched language
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(v => v.lang.includes('IN') || v.name.includes('India') || v.lang.includes('hi'));

        if (this.currentVoice) {
          utterance.voice = this.currentVoice;
        } else if (indianVoice) {
          utterance.voice = indianVoice;
        } else if (voices.length > 0) {
          utterance.voice = voices[0];
        }

        utterance.onstart = () => {
          console.log('Speech synthesis started speaking:', utterance.voice?.name || 'Default Voice');
          window.audioSynth.startEqualizer();
          this.setUIState('speaking');
        };

        utterance.onend = () => {
          console.log('Speech synthesis ended successfully.');
          window.audioSynth.stopEqualizer();
          this.setUIState('idle');
          if (this.config.continuousListening) {
            this.startListening();
          }
        };

        utterance.onerror = (err) => {
          console.warn('SpeechSynthesis utterance error:', err);
          window.audioSynth.stopEqualizer();
          this.setUIState('idle');
        };

        window.speechSynthesis.speak(utterance);

      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
        window.audioSynth.stopEqualizer();
        this.setUIState('idle');
      }
    } else {
      setTimeout(() => {
        this.setUIState('idle');
      }, 2000);
    }
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.stopSpeaking === 'function') {
      window.AndroidBridge.stopSpeaking();
    }
    window.audioSynth.stopEqualizer();
    this.setUIState('idle');
  }

  setUIState(newState) {
    this.state = newState;
    const card = this.dom.assistantCard;

    card.classList.remove('state-idle', 'state-listening', 'state-processing', 'state-speaking');
    this.dom.body.classList.remove('is-active-listening', 'is-active-speaking');

    switch (newState) {
      case 'listening':
        card.classList.add('state-listening');
        this.dom.body.classList.add('is-active-listening');
        this.dom.statusLabel.textContent = 'Listening to your voice...';
        this.dom.statusDot.style.background = '#20e2d7';
        break;

      case 'processing':
        card.classList.add('state-processing');
        this.dom.statusLabel.textContent = 'Thinking...';
        this.dom.statusDot.style.background = 'var(--alexa-amber)';
        break;

      case 'speaking':
        card.classList.add('state-speaking');
        this.dom.body.classList.add('is-active-speaking');
        this.dom.statusLabel.textContent = 'Speaking...';
        this.dom.statusDot.style.background = 'var(--alexa-cyan)';
        break;

      case 'idle':
      default:
        card.classList.add('state-idle');
        this.dom.statusLabel.textContent = 'Listening for "Alexa"...';
        this.dom.statusDot.style.background = 'var(--alexa-cyan)';
        break;
    }
  }

  initTTS() {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.populateVoiceSelect(voices);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  populateVoiceSelect(voices) {
    this.dom.voiceSelect.innerHTML = '<option value="auto">✨ Auto (Best Neural Human Voice)</option>';
    
    // Sort Natural/Online voices first (Neural AI voices from Azure)
    const sorted = [...voices].sort((a, b) => {
      const aNat = a.name.includes('Natural') || a.name.includes('Online');
      const bNat = b.name.includes('Natural') || b.name.includes('Online');
      if (aNat && !bNat) return -1;
      if (!aNat && bNat) return 1;
      return a.name.localeCompare(b.name);
    });

    let bestVoice = null;

    sorted.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.name;
      const isNatural = v.name.includes('Natural') || v.name.includes('Online');
      const isIndian = v.lang.includes('IN') || v.name.includes('India') || v.lang.includes('hi');

      opt.textContent = `${isNatural ? '✨ [NATURAL HUMAN] ' : ''}${v.name} (${v.lang})`;
      this.dom.voiceSelect.appendChild(opt);

      // Best preference: Indian Natural Voice (e.g. Swara Natural or Neerja Natural)
      if (!bestVoice && isNatural && isIndian) {
        bestVoice = v;
      }
    });

    // Fallback: any Natural voice, else Indian voice, else first voice
    if (!bestVoice) {
      bestVoice = sorted.find(v => v.name.includes('Natural') || v.name.includes('Online')) ||
                  sorted.find(v => v.lang.includes('IN') || v.lang.includes('hi')) ||
                  sorted[0];
    }

    if (this.config.voicePreference !== 'auto') {
      this.currentVoice = voices.find(v => v.name === this.config.voicePreference) || bestVoice;
      this.dom.voiceSelect.value = this.config.voicePreference;
    } else {
      this.currentVoice = bestVoice;
    }
    console.log('Selected Voice:', this.currentVoice?.name);
  }

  setupEventListeners() {
    // Unlock Audio Context on first touch anywhere
    const unlockAudio = () => {
      window.audioSynth.initContext();
      this.startListening();
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    // Weather Card Click -> Re-request Location
    this.dom.weatherCard.addEventListener('click', () => {
      window.audioSynth.playSuccessChime();
      this.requestDeviceLocation();
    });

    // Mic Toggle Button
    this.dom.micToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.audioSynth.initContext();

      if (this.state === 'speaking') {
        this.stopSpeaking();
      } else if (this.state === 'listening') {
        this.setUIState('idle');
      } else {
        window.audioSynth.playWakeChime();
        this.enterActiveListening();
      }
    });

    // Replay
    this.dom.replaySpeechBtn.addEventListener('click', () => {
      if (this.lastSpokenText) {
        this.speakResponse(this.lastSpokenText);
      }
    });

    // Stop
    this.dom.stopSpeechBtn.addEventListener('click', () => {
      this.stopSpeaking();
    });

    // Quick Chips
    document.querySelectorAll('.quick-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        window.audioSynth.initContext();
        const cmd = e.currentTarget.getAttribute('data-cmd');
        if (cmd) {
          window.audioSynth.playWakeChime();
          this.dispatchCommand(cmd);
        }
      });
    });

    // Test Voice button
    const testVoiceBtn = document.getElementById('testVoiceBtn');
    if (testVoiceBtn) {
      testVoiceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.audioSynth.initContext();
        window.audioSynth.playSuccessChime();
        this.speakResponse('Namaste! Main aapka Alexa assistant hoon. Audio output bilkul sahi kaam kar raha hai.');
      });
    }

    // Manual Text Input Form
    const textForm = this.dom.textInputForm;
    const textInput = this.dom.manualCommandInput;
    if (textForm && textInput) {
      textForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = textInput.value.trim();
        if (query) {
          window.audioSynth.initContext();
          window.audioSynth.playWakeChime();
          this.dispatchCommand(query);
          textInput.value = '';
          textInput.blur();
        }
      });
    }

    // Fullscreen Toggle
    this.dom.fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Settings Modal
    this.dom.settingsBtn.addEventListener('click', () => {
      this.dom.settingsModal.style.display = 'flex';
      this.loadSettingsForm();
    });

    this.dom.closeSettingsBtn.addEventListener('click', () => {
      this.dom.settingsModal.style.display = 'none';
    });

    this.dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) {
        this.dom.settingsModal.style.display = 'none';
      }
    });

    // Toggle API Key visibility
    this.dom.toggleApiKeyVisibility.addEventListener('click', () => {
      const input = this.dom.geminiApiKeyInput;
      if (input.type === 'password') {
        input.type = 'text';
        this.dom.toggleApiKeyVisibility.textContent = 'Hide';
      } else {
        input.type = 'password';
        this.dom.toggleApiKeyVisibility.textContent = 'Show';
      }
    });

    // Save Settings
    this.dom.saveSettingsBtn.addEventListener('click', () => {
      const apiKey = this.dom.geminiApiKeyInput.value.trim();
      const model = this.dom.aiModelSelect.value;
      const city = this.dom.weatherCityInput.value.trim() || 'Delhi';
      const voice = this.dom.voiceSelect.value;
      const keepAwake = this.dom.keepAwakeToggle.checked;
      const continuous = this.dom.continuousListeningToggle.checked;

      window.aiService.setApiKey(apiKey);
      window.aiService.setModel(model);

      localStorage.setItem('cfg_city', city);
      localStorage.setItem('cfg_voice', voice);
      localStorage.setItem('cfg_awake', keepAwake);
      localStorage.setItem('cfg_continuous', continuous);

      this.config.weatherCity = city;
      this.config.voicePreference = voice;
      this.config.keepAwake = keepAwake;
      this.config.continuousListening = continuous;

      if (city) {
        this.fetchWeatherByCity(city);
      }

      if (keepAwake) {
        this.requestWakeLock();
      }

      this.dom.settingsModal.style.display = 'none';
      window.audioSynth.playSuccessChime();
    });
  }

  loadSettingsForm() {
    this.dom.geminiApiKeyInput.value = window.aiService.getApiKey();
    this.dom.aiModelSelect.value = window.aiService.getModel();
    this.dom.weatherCityInput.value = this.config.weatherCity;
    this.dom.keepAwakeToggle.checked = this.config.keepAwake;
    this.dom.continuousListeningToggle.checked = this.config.continuousListening;
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.alexaApp = new SmartDisplayApp();
  window.alexaApp.init();

  // Clear any stale Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const r of registrations) {
        r.unregister();
        console.log('Unregistered stale service worker.');
      }
    });
  }
});
