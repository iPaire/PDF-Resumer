/**
 * Simple Node.js script to manage translations
 * Run with: node messages/translation-manager.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'es', 'ro', 'de', 'fr'];
const MESSAGES_DIR = __dirname;

// Function to read all translation files
function loadTranslations() {
  const translations = {};
  LOCALES.forEach(locale => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    if (fs.existsSync(filePath)) {
      translations[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  });
  return translations;
}

// Function to save translations
function saveTranslations(translations) {
  LOCALES.forEach(locale => {
    if (translations[locale]) {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      fs.writeFileSync(filePath, JSON.stringify(translations[locale], null, 2), 'utf8');
      console.log(`✓ Saved ${locale}.json`);
    }
  });
}

// Function to add a new translation key
function addTranslationKey(keyPath, values) {
  const translations = loadTranslations();
  
  LOCALES.forEach(locale => {
    if (!translations[locale]) {
      translations[locale] = {};
    }
    
    const keys = keyPath.split('.');
    let current = translations[locale];
    
    // Navigate to the correct nested object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // Set the value
    const finalKey = keys[keys.length - 1];
    current[finalKey] = values[locale] || values['en'] || keyPath;
  });
  
  saveTranslations(translations);
  console.log(`✓ Added translation key: ${keyPath}`);
}

// Function to update a translation key
function updateTranslationKey(keyPath, values) {
  addTranslationKey(keyPath, values); // Same logic for adding/updating
}

// Function to remove a translation key
function removeTranslationKey(keyPath) {
  const translations = loadTranslations();
  
  LOCALES.forEach(locale => {
    if (translations[locale]) {
      const keys = keyPath.split('.');
      let current = translations[locale];
      
      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          return; // Key doesn't exist
        }
        current = current[keys[i]];
      }
      
      // Remove the key
      const finalKey = keys[keys.length - 1];
      delete current[finalKey];
    }
  });
  
  saveTranslations(translations);
  console.log(`✓ Removed translation key: ${keyPath}`);
}

// Function to check for missing translations
function checkMissingTranslations() {
  const translations = loadTranslations();
  const enKeys = getAllKeys(translations.en || {});
  
  console.log('\n=== Missing Translations Check ===');
  LOCALES.forEach(locale => {
    if (locale === 'en') return;
    
    const localeKeys = getAllKeys(translations[locale] || {});
    const missing = enKeys.filter(key => !localeKeys.includes(key));
    
    if (missing.length > 0) {
      console.log(`\n${locale.toUpperCase()} missing keys:`);
      missing.forEach(key => console.log(`  - ${key}`));
    } else {
      console.log(`✓ ${locale.toUpperCase()} - all keys present`);
    }
  });
}

// Helper function to get all nested keys
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// CLI interface
const command = process.argv[2];
const keyPath = process.argv[3];

switch (command) {
  case 'add':
  case 'update':
    if (!keyPath) {
      console.error('Usage: node translation-manager.js add/update <key.path> <en_value> [es_value] [ro_value] [de_value] [fr_value]');
      process.exit(1);
    }
    const values = {};
    values.en = process.argv[4] || '';
    values.es = process.argv[5] || values.en;
    values.ro = process.argv[6] || values.en;
    values.de = process.argv[7] || values.en;
    values.fr = process.argv[8] || values.en;
    
    if (command === 'add') {
      addTranslationKey(keyPath, values);
    } else {
      updateTranslationKey(keyPath, values);
    }
    break;
    
  case 'remove':
    if (!keyPath) {
      console.error('Usage: node translation-manager.js remove <key.path>');
      process.exit(1);
    }
    removeTranslationKey(keyPath);
    break;
    
  case 'check':
    checkMissingTranslations();
    break;
    
  default:
    console.log('Translation Manager');
    console.log('==================');
    console.log('Usage:');
    console.log('  node translation-manager.js add <key.path> <en_value> [es_value] [ro_value] [de_value] [fr_value]');
    console.log('  node translation-manager.js update <key.path> <en_value> [es_value] [ro_value] [de_value] [fr_value]');
    console.log('  node translation-manager.js remove <key.path>');
    console.log('  node translation-manager.js check');
    console.log('');
    console.log('Examples:');
    console.log('  node translation-manager.js add "common.submit" "Submit" "Enviar" "Trimite" "Einreichen" "Soumettre"');
    console.log('  node translation-manager.js update "common.welcome" "Welcome!" "¡Bienvenido!" "Bun venit!" "Willkommen!" "Bienvenue!"');
    console.log('  node translation-manager.js remove "common.oldKey"');
    console.log('  node translation-manager.js check');
}