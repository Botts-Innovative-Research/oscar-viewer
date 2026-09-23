const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceTargets = [
    'package.json',
    'package-lock.json',
    'next.config.js',
    'src',
];
const generatedTargets = [
    path.join('web', '_next'),
];
const forbiddenPatterns = [
    /@sentry\//i,
    /sentry\.io/i,
    /withSentryConfig/i,
    /Sentry\.(?:init|capture)/,
    /SENTRY_DSN/,
];
const violations = [];

function inspect(targetPath) {
    if (!fs.existsSync(targetPath)) {
        return;
    }

    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(targetPath)) {
            inspect(path.join(targetPath, entry));
        }
        return;
    }

    const content = fs.readFileSync(targetPath, 'utf8');
    for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
            violations.push(`${path.relative(projectRoot, targetPath)} (${pattern})`);
        }
    }
}

for (const target of [...sourceTargets, ...generatedTargets]) {
    inspect(path.join(projectRoot, target));
}

if (violations.length > 0) {
    throw new Error(`Sentry must remain disabled by default:\n${violations.join('\n')}`);
}

console.log('Verified Sentry is absent from application sources, dependencies, and generated bundles.');
