const fs = require('fs');
const path = require('path');

const chunksRoot = path.resolve(__dirname, '..', 'web', '_next', 'static', 'chunks');
const mainChunks = [];
const workerChunks = [];

function collectJavaScript(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collectJavaScript(entryPath);
        } else if (entry.name.endsWith('.js')) {
            const content = fs.readFileSync(entryPath, 'utf8');
            if (entry.name.includes('.worker.js')) {
                workerChunks.push(content);
            } else {
                mainChunks.push(content);
            }
        }
    }
}

collectJavaScript(chunksRoot);

const mainBundle = mainChunks.join('\n');
const workerBundle = workerChunks.join('\n');
const requiredMainMarkers = ['registerMessagePort', 'sharedMqttConnector', 'new MessageChannel'];
const missingMainMarkers = requiredMainMarkers.filter(marker => !mainBundle.includes(marker));
const forbiddenVerboseMarkers = [
    'Stored MQTT provider into cache:',
    'Getting MQTT provider from cache:',
    'Reuse shared MqttConnector instance for',
    'MQTT SUBSCRIBE sent:',
    'MQTT SUBACK received',
    'MQTT subscription active:',
    'Unsubscribed topic:'
];
const presentVerboseMarkers = forbiddenVerboseMarkers.filter(marker => mainBundle.includes(marker));

if (missingMainMarkers.length > 0 || !workerBundle.includes('messagePort')) {
    const details = missingMainMarkers.length > 0
        ? `missing main markers: ${missingMainMarkers.join(', ')}`
        : 'worker bundle is missing the MessagePort transport';
    throw new Error(`MQTT bundle verification failed: ${details}`);
}

if (presentVerboseMarkers.length > 0) {
    throw new Error(
        `MQTT bundle verification failed: verbose production logging remains: ${presentVerboseMarkers.join(', ')}`
    );
}

console.log('Verified one-socket MQTT MessagePort multiplexing and production logging in the production bundle.');
