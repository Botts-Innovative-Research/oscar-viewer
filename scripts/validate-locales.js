const fs = require('fs');
const path = require('path');

const localeDirectory = path.join(__dirname, '..', 'src', 'locales');
const localeNames = ['en', 'es', 'fr', 'el'];
const catalogs = Object.fromEntries(localeNames.map((locale) => {
    const filename = path.join(localeDirectory, `${locale}.json`);
    return [locale, JSON.parse(fs.readFileSync(filename, 'utf8'))];
}));

const errors = [];
const englishKeys = Object.keys(catalogs.en);
const englishKeySet = new Set(englishKeys);

function placeholders(value) {
    return [...value.matchAll(/\{([^}]+)\}/g)]
        .map((match) => match[1])
        .sort()
        .join(',');
}

for (const locale of localeNames) {
    for (const [key, value] of Object.entries(catalogs[locale])) {
        if (!englishKeySet.has(key)) {
            errors.push(`${locale}: unexpected key "${key}"`);
        }
        if (typeof value !== 'string' || !value.trim()) {
            errors.push(`${locale}: "${key}" must be a non-empty string`);
        }
        if (key in catalogs.en && placeholders(value) !== placeholders(catalogs.en[key])) {
            errors.push(`${locale}: placeholders for "${key}" do not match English`);
        }
    }
}

for (const locale of localeNames.filter((locale) => locale !== 'en')) {
    const localeKeys = new Set(Object.keys(catalogs[locale]));
    for (const key of englishKeys) {
        if (!localeKeys.has(key)) {
            errors.push(`${locale}: missing key "${key}"`);
        }
    }
}

if (errors.length) {
    console.error(`Locale validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    process.exit(1);
}

console.log(`Validated complete ${englishKeys.length}-key catalogs and placeholders for ${localeNames.join(', ')}.`);
