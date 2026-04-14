// ===== script.js =====
// Әзірлеушіге арналған ЖИ-құралдары веб-бетінің интерактивті функционалы

// ==========================================
// 1. DOM ЭЛЕМЕНТТЕРІН АЛУ
// ==========================================

// Чат элементтері
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const apiStatus = document.getElementById('apiStatus');

// Сұраныс санауышы
const requestCounter = document.getElementById('requestCounter');

// Тақырып ауыстыру батырмасы
const themeToggle = document.getElementById('themeToggle');

// Карточкалар (Intersection Observer үшін)
const cards = document.querySelectorAll('.card');

// ==========================================
// 2. ГЛОБАЛДЫ АЙНЫМАЛЫЛАР
// ==========================================

// API конфигурациясы
// НАЗАР АУДАРЫҢЫЗ: Бұл жерге ӨЗ API КІЛТІҢІЗДІ енгізуіңіз керек
const API_CONFIG = {
    // Claude API немесе OpenAI API таңдаңыз
    provider: 'openai', // 'claude' немесе 'openai'
    
    // OpenAI API
    openai: {
        apiKey: 'YOUR_OPENAI_API_KEY_HERE', // ← platform.openai.com сайтынан алыңыз
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo'
    },
    
    // Claude API
    claude: {
        apiKey: 'YOUR_CLAUDE_API_KEY_HERE', // ← console.anthropic.com сайтынан алыңыз
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-haiku-20240307'
    }
};

// Сұраныс санауышы
let requestCount = 0;

// Чат тарихы (контекст үшін)
let chatHistory = [];

// ==========================================
// 3. ТАҚЫРЫП АУЫСТЫРУ ФУНКЦИЯСЫ
// ==========================================

/**
 * Қараңғы және ашық тақырыпты ауыстырады
 * data-theme атрибутын қолданады
 */
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const themeButton = themeToggle;
    
    if (currentTheme === 'dark') {
        // Ашық тақырыпқа ауысу
        body.removeAttribute('data-theme');
        themeButton.innerHTML = '🌙 Қараңғы тақырып';
        localStorage.setItem('theme', 'light');
    } else {
        // Қараңғы тақырыпқа ауысу
        body.setAttribute('data-theme', 'dark');
        themeButton.innerHTML = '☀️ Ашық тақырып';
        localStorage.setItem('theme', 'dark');
    }
}

/**
 * Сақталған тақырыпты жүктеу
 * localStorage-тан соңғы таңдалған тақырыпты алады
 */
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '☀️ Ашық тақырып';
    }
}

// ==========================================
// 4. СҰРАНЫС САНАУЫШЫ ФУНКЦИЯЛАРЫ
// ==========================================

/**
 * Сұраныс санын арттыру және жаңарту
 */
function incrementRequestCounter() {
    requestCount++;
    requestCounter.textContent = requestCount;
}

/**
 * Сұраныс санын қалпына келтіру (қажет болса)
 */
function resetRequestCounter() {
    requestCount = 0;
    requestCounter.textContent = '0';
}

// ==========================================
// 5. ЧАТ ФУНКЦИЯЛАРЫ
// ==========================================

/**
 * Чат терезесіне жаңа хабарлама қосу
 * @param {string} content - Хабарлама мәтіні
 * @param {string} sender - Жіберуші ('user' немесе 'bot')
 */
function addMessageToChat(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.textContent = content;
    
    chatMessages.appendChild(messageDiv);
    
    // Автоматты түрде төменге жылжыту
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Жүктелу индикаторын көрсету
 * @returns {HTMLElement} Жүктелу индикаторының элементі
 */
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
    typingDiv.id = 'typingIndicator';
    
    // Үш нүкте анимациясы
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingDiv.appendChild(dot);
    }
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingDiv;
}

/**
 * Жүктелу индикаторын жасыру
 */
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

/**
 * API күйін жаңарту
 * @param {string} status - Күй мәтіні
 * @param {string} type - Күй түрі ('success', 'error', 'info')
 */
function updateApiStatus(status, type = 'info') {
    apiStatus.textContent = status;
    apiStatus.style.color = type === 'error' ? 'var(--error-color)' : 
                            type === 'success' ? 'var(--success-color)' : 
                            'var(--text-secondary)';
}

// ==========================================
// 6. API ИНТЕГРАЦИЯСЫ
// ==========================================

/**
 * OpenAI API-ге сұраныс жіберу
 * @param {string} userMessage - Пайдаланушының сұрағы
 * @returns {Promise<string>} ЖИ жауабы
 */
async function sendToOpenAI(userMessage) {
    // Чат тарихын дайындау
    const messages = [
        {
            role: 'system',
            content: 'Сіз пайдалы көмекшісіз. Қазақ тілінде қысқа әрі нақты жауап беріңіз.'
        },
        ...chatHistory,
        {
            role: 'user',
            content: userMessage
        }
    ];
    
    const response = await fetch(API_CONFIG.openai.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.openai.apiKey}`
        },
        body: JSON.stringify({
            model: API_CONFIG.openai.model,
            messages: messages,
            max_tokens: 500,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'OpenAI API қатесі');
    }
    
    const data = await response.json();
    const botResponse = data.choices[0].message.content;
    
    // Чат тарихын жаңарту
    chatHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: botResponse }
    );
    
    // Тарихты тым ұзақ болмауы үшін шектеу (соңғы 10 хабарлама)
    if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
    }
    
    return botResponse;
}

/**
 * Claude API-ге сұраныс жіберу
 * @param {string} userMessage - Пайдаланушының сұрағы
 * @returns {Promise<string>} ЖИ жауабы
 */
async function sendToClaude(userMessage) {
    // Claude API үшін хабарламалар форматы басқаша
    let prompt = '';
    
    // Алдыңғы контексті қосу
    if (chatHistory.length > 0) {
        prompt += 'Алдыңғы диалог:\n';
        chatHistory.forEach(msg => {
            prompt += `${msg.role === 'user' ? 'Адам' : 'Claude'}: ${msg.content}\n`;
        });
        prompt += '\n';
    }
    
    prompt += `Адам: ${userMessage}\n\nClaude:`;
    
    const response = await fetch(API_CONFIG.claude.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_CONFIG.claude.apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: API_CONFIG.claude.model,
            messages: [
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Claude API қатесі');
    }
    
    const data = await response.json();
    const botResponse = data.content[0].text;
    
    // Чат тарихын жаңарту
    chatHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: botResponse }
    );
    
    // Тарихты шектеу
    if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
    }
    
    return botResponse;
}

/**
 * Негізгі API сұраныс функциясы
 * @param {string} userMessage - Пайдаланушының сұрағы
 * @returns {Promise<string>} ЖИ жауабы
 */
async function sendMessageToAI(userMessage) {
    // API кілті тексеру
    const isOpenAI = API_CONFIG.provider === 'openai';
    const apiKey = isOpenAI ? API_CONFIG.openai.apiKey : API_CONFIG.claude.apiKey;
    
    if (apiKey === 'YOUR_OPENAI_API_KEY_HERE' || apiKey === 'YOUR_CLAUDE_API_KEY_HERE') {
        // Демо режим (API кілті жоқ кезде)
        updateApiStatus('⚠️ API кілті енгізілмеген. Демо режим жұмыс істейді.', 'info');
        return await simulateAIResponse(userMessage);
    }
    
    try {
        updateApiStatus('⏳ ЖИ жауап беруде...', 'info');
        
        let response;
        if (isOpenAI) {
            response = await sendToOpenAI(userMessage);
        } else {
            response = await sendToClaude(userMessage);
        }
        
        updateApiStatus('✅ Дайын', 'success');
        return response;
        
    } catch (error) {
        console.error('API қатесі:', error);
        updateApiStatus(`❌ Қате: ${error.message}`, 'error');
        
        // Қате болғанда демо жауап беру
        return `Кешіріңіз, қате орын алды: ${error.message}\n\nБұл демо жауап. API кілтіңізді тексеріңіз.`;
    }
}

/**
 * API кілті болмаған кездегі демо жауап
 * @param {string} userMessage - Пайдаланушы сұрағы
 * @returns {Promise<string>} Демо жауап
 */
async function simulateAIResponse(userMessage) {
    // 1-2 секунд кідіріс (нақты API-ге ұқсату үшін)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const demoResponses = [
        'Бұл демо жауап. Нақты ЖИ жауабын алу үшін API кілтіңізді енгізіңіз.',
        'Сұрағыңыз: "' + userMessage + '". API интеграциясы дайын, тек кілтті енгізу керек.',
        'API кілті болмағандықтан демо режим жұмыс істеп тұр. Кілтті OpenAI немесе Claude сайтынан алуға болады.',
        'ЖИ интеграциясы сәтті жасалған! Енді API кілтіңізді script.js файлындағы API_CONFIG объектісіне енгізіңіз.'
    ];
    
    return demoResponses[Math.floor(Math.random() * demoResponses.length)];
}

/**
 * Пайдаланушы хабарламасын өңдеу
 */
async function handleUserMessage() {
    const message = userInput.value.trim();
    
    // Бос хабарламаны тексеру
    if (message === '') {
        updateApiStatus('⚠️ Сұрағыңызды жазыңыз', 'error');
        return;
    }
    
    // Интерфейсті блоктау
    userInput.disabled = true;
    sendButton.disabled = true;
    
    try {
        // Пайдаланушы хабарламасын көрсету
        addMessageToChat(message, 'user');
        
        // Сұраныс санауышын жаңарту
        incrementRequestCounter();
        
        // Енгізу өрісін тазалау
        userInput.value = '';
        
        // Жүктелу индикаторын көрсету
        showTypingIndicator();
        
        // ЖИ-ден жауап алу
        const botResponse = await sendMessageToAI(message);
        
        // Жүктелу индикаторын жасыру
        hideTypingIndicator();
        
        // Бот жауабын көрсету
        addMessageToChat(botResponse, 'bot');
        
    } catch (error) {
        console.error('Хабарлама өңдеу қатесі:', error);
        hideTypingIndicator();
        addMessageToChat('Кешіріңіз, қате орын алды. Қайталап көріңіз.', 'bot');
        updateApiStatus('❌ Қате орын алды', 'error');
    } finally {
        // Интерфейсті қалпына келтіру
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// ==========================================
// 7. INTERSECTION OBSERVER (АНИМАЦИЯ)
// ==========================================

/**
 * Карточкалардың көрінуін бақылайтын Observer
 * Элемент экранға көрінгенде visible класын қосады
 */
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Анимация бір рет қана орындалады
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // 10% көрінгенде іске қосылады
        rootMargin: '0px 0px -50px 0px' // Сәл ертерек іске қосу
    });
    
    // Барлық карточкаларды бақылауға алу
    cards.forEach(card => {
        observer.observe(card);
    });
}

// ==========================================
// 8. ҚОСЫМША ФУНКЦИЯЛАР
// ==========================================

/**
 * Enter пернесімен хабарлама жіберу
 * @param {KeyboardEvent} event - Пернетақта оқиғасы
 */
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleUserMessage();
    }
}

/**
 * Жергілікті сақтаудан сұраныс санын жүктеу
 */
function loadRequestCount() {
    const savedCount = localStorage.getItem('requestCount');
    if (savedCount) {
        requestCount = parseInt(savedCount, 10);
        requestCounter.textContent = requestCount;
    }
}

/**
 * Сұраныс санын сақтау
 */
function saveRequestCount() {
    localStorage.setItem('requestCount', requestCount.toString());
}

// Сұраныс санауышын жаңарту функциясын кеңейту
const originalIncrement = incrementRequestCounter;
incrementRequestCounter = function() {
    originalIncrement.call(this);
    saveRequestCount();
};

// ==========================================
// 9. ОҚИҒА ТЫҢДАУШЫЛАРЫН ОРНАТУ
// ==========================================

/**
 * Барлық оқиға тыңдаушыларын орнату
 */
function setupEventListeners() {
    // Жіберу батырмасы
    sendButton.addEventListener('click', handleUserMessage);
    
    // Enter пернесі
    userInput.addEventListener('keypress', handleKeyPress);
    
    // Тақырып ауыстыру
    themeToggle.addEventListener('click', toggleTheme);
    
    // Бет жүктелгенде карточкаларды тексеру
    window.addEventListener('load', () => {
        // Карточкалардың көрінуін тексеру
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                card.classList.add('visible');
            }
        });
    });
}

// ==========================================
// 10. ДЕМО ЕСКЕРТУ
// ==========================================

/**
 * API кілтінің бар-жоғын тексеру және ескерту көрсету
 */
function checkAPIKey() {
    const isOpenAI = API_CONFIG.provider === 'openai';
    const apiKey = isOpenAI ? API_CONFIG.openai.apiKey : API_CONFIG.claude.apiKey;
    
    if (apiKey === 'YOUR_OPENAI_API_KEY_HERE' || apiKey === 'YOUR_CLAUDE_API_KEY_HERE') {
        console.warn('⚠️ API кілті енгізілмеген! Демо режим жұмыс істейді.');
        console.info('📝 API кілтін алу үшін:');
        console.info('   - OpenAI: https://platform.openai.com/api-keys');
        console.info('   - Claude: https://console.anthropic.com/');
        
        // Бет жүктелгенде статусқа ескерту қою
        setTimeout(() => {
            updateApiStatus('ℹ️ API кілті енгізілмеген. Демо режим.', 'info');
        }, 1000);
    }
}

// ==========================================
// 11. ИНИЦИАЛИЗАЦИЯ
// ==========================================

/**
 * Қосымшаны инициализациялау
 */
function init() {
    // Тақырыпты жүктеу
    loadSavedTheme();
    
    // Сұраныс санауышын жүктеу
    loadRequestCount();
    
    // Intersection Observer орнату
    setupIntersectionObserver();
    
    // Оқиға тыңдаушыларын орнату
    setupEventListeners();
    
    // API кілтін тексеру
    checkAPIKey();
    
    // Консольге хабарлама
    console.log('🚀 ЖИ чат қосымшасы сәтті жүктелді!');
    console.log('📁 script.js — барлық функциялар түсіндірмелермен жазылған.');
}

// Қосымшаны іске қосу
init();

// ==========================================
// 12. ЭКСПОРТ (ҚАЖЕТ БОЛСА)
// ==========================================

// Функцияларды консоль арқылы тексеру үшін экспорттау (тек әзірлеу кезінде)
if (typeof window !== 'undefined') {
    window.debugTools = {
        resetCounter: resetRequestCounter,
        clearHistory: () => { chatHistory = []; },
        getConfig: () => API_CONFIG
    };
}