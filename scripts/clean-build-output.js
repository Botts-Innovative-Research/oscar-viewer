const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const generatedDirectories = ['web', '.next'];

for (const directory of generatedDirectories) {
    const buildOutput = path.resolve(projectRoot, directory);
    if (path.dirname(buildOutput) !== projectRoot || path.basename(buildOutput) !== directory) {
        throw new Error(`Refusing to remove unexpected build output: ${buildOutput}`);
    }

    fs.rmSync(buildOutput, {recursive: true, force: true});
    console.log(`Removed stale viewer build output: ${buildOutput}`);
}
