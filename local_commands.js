/**
 * Local Offline Command Engine
 * Handles instant offline intents (Time, Date, Math calculations, Greetings, System controls)
 * in natural Hinglish without requiring internet connection or API calls.
 */

class LocalCommandEngine {
  constructor() {
    this.hindiDays = {
      0: 'Ravivar (Sunday)',
      1: 'Somvar (Monday)',
      2: 'Mangalvar (Tuesday)',
      3: 'Budhvar (Wednesday)',
      4: 'Guruvar (Thursday)',
      5: 'Shukravar (Friday)',
      6: 'Shanivar (Saturday)'
    };

    this.hindiMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }

  /**
   * Evaluates text for offline local intents
   * @param {string} rawText 
   * @returns {Object|null} result object or null if not a local command
   */
  process(rawText) {
    if (!rawText) return null;

    // Clean and normalize text: strip "alexa", "hey alexa", punctuation
    const cleanText = rawText
      .toLowerCase()
      .replace(/^(alexa|hey alexa|suno alexa|hello alexa|ok alexa)[,\s]*/i, '')
      .replace(/[?!.]/g, '')
      .trim();

    if (!cleanText) {
      return {
        matched: true,
        type: 'wake_only',
        spokenResponse: 'Haanji, kahiye, main sun rahi hoon.',
        displayResponse: 'Haanji, kahiye, main sun rahi hoon.',
        isLocal: true
      };
    }

    // 1. Check System Controls (Stop / Silence / Clear)
    const systemResult = this.checkSystemCommands(cleanText);
    if (systemResult) return systemResult;

    // 2. Check Time Intent
    const timeResult = this.checkTimeIntent(cleanText);
    if (timeResult) return timeResult;

    // 3. Check Date Intent
    const dateResult = this.checkDateIntent(cleanText);
    if (dateResult) return dateResult;

    // 4. Check Math Calculations
    const mathResult = this.checkMathIntent(cleanText);
    if (mathResult) return mathResult;

    // 5. Check Greetings & Persona
    const greetingResult = this.checkGreetingIntent(cleanText);
    if (greetingResult) return greetingResult;

    // Not a local command -> will be routed to Online AI
    return null;
  }

  /**
   * System stop/mute commands
   */
  checkSystemCommands(text) {
    const stopTriggers = ['stop', 'chup', 'chup raho', 'shant', 'shant ho jao', 'quiet', 'cancel', 'band karo', 'pause'];
    for (const trig of stopTriggers) {
      if (text === trig || text.startsWith(trig + ' ')) {
        return {
          matched: true,
          type: 'system_stop',
          spokenResponse: '',
          displayResponse: 'Assistant stopped.',
          isLocal: true,
          action: 'stop_speech'
        };
      }
    }

    if (text.includes('clear screen') || text.includes('saaf karo') || text.includes('clear')) {
      return {
        matched: true,
        type: 'system_clear',
        spokenResponse: 'Screen clear kar di gayi hai.',
        displayResponse: 'Screen cleared.',
        isLocal: true,
        action: 'clear_screen'
      };
    }

    return null;
  }

  /**
   * Time intent
   */
  checkTimeIntent(text) {
    const timeTriggers = [
      'time kya hua', 'kitna time hua', 'kya time hai', 'what time', 'what is the time',
      'current time', 'kitne baje', 'kya samay hua', 'samay batao', 'time batao', 'time please'
    ];

    const isMatch = timeTriggers.some(trigger => text.includes(trigger));
    if (isMatch) {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

      const spokenTime = `Abhi ${hours12} bajkar ${formattedMinutes} minute ${period} ho rahe hain.`;
      const displayTime = `Abhi samay hai: ${hours12}:${formattedMinutes} ${period}`;

      return {
        matched: true,
        type: 'time',
        spokenResponse: spokenTime,
        displayResponse: displayTime,
        card: {
          title: 'CURRENT TIME',
          value: `${hours12}:${formattedMinutes} ${period}`
        },
        isLocal: true
      };
    }
    return null;
  }

  /**
   * Date intent
   */
  checkDateIntent(text) {
    const dateTriggers = [
      'aaj konsi date hai', 'aaj kya date hai', 'aaj kya tarikh hai', 'what is today date',
      'what date is today', 'today date', 'aaj ka din', 'which day is today', 'tarikh batao', 'date batao'
    ];

    const isMatch = dateTriggers.some(trigger => text.includes(trigger));
    if (isMatch) {
      const now = new Date();
      const dayName = this.hindiDays[now.getDay()];
      const dayNum = now.getDate();
      const month = this.hindiMonths[now.getMonth()];
      const year = now.getFullYear();

      const spokenDate = `Aaj ${dayName.split(' ')[0]}, ${dayNum} ${month} ${year} hai.`;
      const displayDate = `Aaj ki taarikh hai: ${dayName}, ${dayNum} ${month} ${year}`;

      return {
        matched: true,
        type: 'date',
        spokenResponse: spokenDate,
        displayResponse: displayDate,
        card: {
          title: "TODAY'S DATE",
          value: `${dayNum} ${month} ${year}`
        },
        isLocal: true
      };
    }
    return null;
  }

  /**
   * Safe Math parser (supports English & Hinglish words)
   */
  checkMathIntent(text) {
    // Normalize math words
    let expr = text
      .replace(/calculate|solve|hisaab karo|kitna hota hai|kitna hoga/g, '')
      .replace(/plus|jod|add/g, '+')
      .replace(/minus|ghatana|kam/g, '-')
      .replace(/into|guna|times|multiply by|multiplied by/g, '*')
      .replace(/divided by|bhag|divide by/g, '/')
      .replace(/x/g, '*')
      .trim();

    // Check for percentage: "15 percent of 200" or "200 ka 15 percent"
    const percentMatch1 = text.match(/(\d+(?:\.\d+)?)\s*(?:percent|%)\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/);
    if (percentMatch1) {
      const rate = parseFloat(percentMatch1[1]);
      const total = parseFloat(percentMatch1[2]);
      const ans = (rate / 100) * total;
      return {
        matched: true,
        type: 'math',
        spokenResponse: `${total} ka ${rate} percent hota hai ${ans}.`,
        displayResponse: `${rate}% of ${total} = ${ans}`,
        card: {
          title: 'PERCENTAGE CALCULATION',
          value: `${ans}`
        },
        isLocal: true
      };
    }

    const percentMatch2 = text.match(/(\d+(?:\.\d+)?)\s*(?:ka)\s*(\d+(?:\.\d+)?)\s*(?:percent|%)/);
    if (percentMatch2) {
      const total = parseFloat(percentMatch2[1]);
      const rate = parseFloat(percentMatch2[2]);
      const ans = (rate / 100) * total;
      return {
        matched: true,
        type: 'math',
        spokenResponse: `${total} ka ${rate} percent hota hai ${ans}.`,
        displayResponse: `${rate}% of ${total} = ${ans}`,
        card: {
          title: 'PERCENTAGE CALCULATION',
          value: `${ans}`
        },
        isLocal: true
      };
    }

    // Standard arithmetic expression pattern: number [+-*/] number
    const arithmeticMatch = expr.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
    if (arithmeticMatch) {
      const num1 = parseFloat(arithmeticMatch[1]);
      const op = arithmeticMatch[2];
      const num2 = parseFloat(arithmeticMatch[3]);
      let result = 0;
      let opName = '';

      switch (op) {
        case '+':
          result = num1 + num2;
          opName = 'plus';
          break;
        case '-':
          result = num1 - num2;
          opName = 'minus';
          break;
        case '*':
          result = num1 * num2;
          opName = 'guna';
          break;
        case '/':
          if (num2 === 0) {
            return {
              matched: true,
              type: 'math_error',
              spokenResponse: 'Zero se divide nahi kiya ja sakta.',
              displayResponse: 'Error: Division by zero',
              isLocal: true
            };
          }
          result = Math.round((num1 / num2) * 1000) / 1000;
          opName = 'divided by';
          break;
      }

      // Format round if decimal has long fractions
      const formattedResult = Number.isInteger(result) ? result : result.toFixed(2);

      return {
        matched: true,
        type: 'math',
        spokenResponse: `${num1} ${opName} ${num2} ka jawab hai ${formattedResult}.`,
        displayResponse: `${num1} ${op} ${num2} = ${formattedResult}`,
        card: {
          title: 'MATH CALCULATION',
          value: `${formattedResult}`
        },
        isLocal: true
      };
    }

    return null;
  }

  /**
   * Greetings & Identity intents
   */
  checkGreetingIntent(text) {
    // Who are you / About
    if (text.includes('tum kaun ho') || text.includes('who are you') || text.includes('aapka naam kya hai') || text.includes('what is your name')) {
      return {
        matched: true,
        type: 'identity',
        spokenResponse: 'Main aapka custom Alexa Smart Display hoon, jo Samsung Galaxy J6 par smoothly run kar raha hai.',
        displayResponse: 'Main aapka custom Alexa Smart Display hoon, jo Samsung Galaxy J6 par smoothly run kar raha hai. Main offline aur online dono modes mein kaam kar sakta hoon!',
        isLocal: true
      };
    }

    // Who made you
    if (text.includes('kisne banaya') || text.includes('who made you') || text.includes('creator')) {
      return {
        matched: true,
        type: 'creator',
        spokenResponse: 'Mujhe mere brilliant developer ne banaya hai, purane Samsung phone ko ek powerful smart display banane ke liye!',
        displayResponse: 'Mujhe mere brilliant developer ne banaya hai, purane Samsung phone ko ek powerful smart display banane ke liye!',
        isLocal: true
      };
    }

    // How are you
    if (text.includes('kaise ho') || text.includes('kya haal') || text.includes('how are you')) {
      return {
        matched: true,
        type: 'how_are_you',
        spokenResponse: 'Main ekdum badiya hoon! Aap bataiye, aaj main aapki kya madad karoon?',
        displayResponse: 'Main ekdum badiya hoon! Aap bataiye, aaj main aapki kya madad karoon?',
        isLocal: true
      };
    }

    // Good Morning
    if (text.includes('good morning') || text.includes('shubh prabhat')) {
      return {
        matched: true,
        type: 'morning',
        spokenResponse: 'Shubh Prabhat! Aapka din shubh aur productive ho.',
        displayResponse: 'Shubh Prabhat! ☀️ Have a wonderful and productive day ahead!',
        isLocal: true
      };
    }

    // Good Night
    if (text.includes('good night') || text.includes('shubh ratri')) {
      return {
        matched: true,
        type: 'night',
        spokenResponse: 'Shubh Ratri! Aaram se soiye, sweet dreams.',
        displayResponse: 'Shubh Ratri! 🌙 Aaram se soiye, sweet dreams.',
        isLocal: true
      };
    }

    // Simple Hello / Namaste
    if (text === 'hello' || text === 'hi' || text === 'namaste' || text === 'kem cho' || text === 'pranam') {
      return {
        matched: true,
        type: 'hello',
        spokenResponse: 'Namaste! Kahiye, main aapki kya madad kar sakti hoon?',
        displayResponse: 'Namaste! Kahiye, main aapki kya madad kar sakti hoon?',
        isLocal: true
      };
    }

    // Joke request (offline fallbacks!)
    if (text.includes('joke') || text.includes('chutkula') || text.includes('hasao')) {
      const jokes = [
        {
          spoken: 'Teacher ne pucha: Batata aur Aalu mein kya antar hai? Pappu bola: Mam, batata katora bhar ke hota hai aur aalu plate bhar ke!',
          display: 'Teacher: Batata aur Aalu mein kya farq hai?\nPappu: Mam, Batata katora bhar ke hota hai aur aalu plate bhar ke! 😂'
        },
        {
          spoken: 'Doctor ne mariz se pucha: Roz kitne kilometer chalte ho? Mariz bola: 5 kilometer. Doctor bola: Bohot badhiya! Mariz bola: Lekin doctor sahab, main battery rickshaw mein chalta hoon!',
          display: 'Doctor: Roz kitna chalte ho?\nMariz: 5 km.\nDoctor: Great!\nMariz: Rickshaw se doctor sahab! 🤣'
        },
        {
          spoken: 'Ek baar phone ne charger se pucha: Tum mujhe roz energy kyu dete ho? Charger bola: Kyuki bina mere tum display kaise dikhaoge!',
          display: 'Phone: Tum mujhe energy kyu dete ho?\nCharger: Taaki tum Galaxy J6 par Alexa display chala sako! ⚡'
        }
      ];
      const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
      return {
        matched: true,
        type: 'joke',
        spokenResponse: randomJoke.spoken,
        displayResponse: randomJoke.display,
        card: {
          title: 'DESI JOKE',
          value: 'Hahaha! 😂'
        },
        isLocal: true
      };
    }

    return null;
  }
}

// Global instance
window.localCommands = new LocalCommandEngine();
