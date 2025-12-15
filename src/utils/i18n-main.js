const i18next = require('i18next');
const Backend = require('i18next-electron-fs-backend');
const path = require('path');

const i18nextOptions = {
  backend: {
    loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    addPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.missing.json'),
    ipcRenderer: false
  },
  interpolation: {
    escapeValue: false
  },
  saveMissing: false,
  saveMissingTo: 'current',
  namespace: 'translation',
  defaultNS: 'translation',
  fallbackLng: 'en',
  supportedLngs: ['en', 'zh-CN', 'zh-TW', 'ja-JP'],
  react: {
    wait: false
  }
};

i18next.use(Backend);

// In the main process
if (!i18next.isInitialized) {
  i18next.init(i18nextOptions);
}

module.exports = i18next;
