// i18n for renderer process
class I18n {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || this.detectLanguage();
    this.translations = {};
    this.loadTranslations();
  }

  detectLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    
    // Map browser language to supported languages
    if (lang.startsWith('zh-CN') || lang === 'zh' || lang === 'zh-Hans') {
      return 'zh-CN';
    } else if (lang.startsWith('zh-TW') || lang === 'zh-Hant') {
      return 'zh-TW';
    } else if (lang.startsWith('ja')) {
      return 'ja-JP';
    }
    
    return 'en';
  }

  async loadTranslations() {
    try {
      const response = await fetch(`../locales/${this.currentLanguage}/translation.json`);
      this.translations = await response.json();
      this.updateUI();
    } catch (error) {
      console.error('Failed to load translations:', error);
      // Fallback to English
      if (this.currentLanguage !== 'en') {
        this.currentLanguage = 'en';
        await this.loadTranslations();
      }
    }
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    if (typeof value === 'string') {
      // Replace placeholders
      return value.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
        return params[placeholder] !== undefined ? params[placeholder] : match;
      });
    }
    
    return key;
  }

  async setLanguage(lang) {
    if (['en', 'zh-CN', 'zh-TW', 'ja-JP'].includes(lang)) {
      this.currentLanguage = lang;
      localStorage.setItem('language', lang);
      await this.loadTranslations();
    }
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'zh-CN', name: '简体中文' },
      { code: 'zh-TW', name: '繁體中文' },
      { code: 'ja-JP', name: '日本語' }
    ];
  }

  updateUI() {
    // Update document title
    document.title = this.t('app.title');
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });
    
    // Update all placeholders with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });
    
    // Trigger custom event for manual updates
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: this.currentLanguage } 
    }));
  }
}

// Create global instance
const i18n = new I18n();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}
