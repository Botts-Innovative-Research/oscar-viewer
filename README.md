# OSCAR Viewer

OSCAR Viewer is Web App for OpenSensorHub enabling interaction and visualization with sensors and observations 
served by OpenSensorHub server instances.

## Development

Use Node.js 22.12 or newer on an even-numbered release line (22, 24, or 26+). The release and test toolchain does not support odd-numbered Node.js releases.

```sh
npm ci
npm run audit:dependencies
npm run lint
npm run test:component
npm run build
```

The production static export continues to use Next.js Webpack mode because the pinned `osh-js` source package still loads web workers through `worker-loader`. Cypress component tests use Vite and Chrome. The `osh-js` dependency is pinned by commit and integrity hash so clean installs reproduce the MQTT MessagePort implementation tracked in [osh-js PR #6](https://github.com/earocorn/osh-js/pull/6).
