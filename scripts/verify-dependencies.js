const lockfile = require('../package-lock.json');

const deprecatedPackages = Object.entries(lockfile.packages ?? {})
    .filter(([, metadata]) => typeof metadata.deprecated === 'string')
    .map(([packagePath, metadata]) => ({
        packagePath: packagePath || '(root)',
        reason: metadata.deprecated,
    }));

if (deprecatedPackages.length > 0) {
    console.error('Deprecated packages are present in package-lock.json:');
    for (const {packagePath, reason} of deprecatedPackages) {
        console.error(`- ${packagePath}: ${reason}`);
    }
    process.exit(1);
}

console.log(
    `Dependency deprecation check passed (${Object.keys(lockfile.packages ?? {}).length} locked packages).`,
);
