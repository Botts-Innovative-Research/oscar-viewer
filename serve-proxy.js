/*
 * Same-origin verification proxy for running Cypress against the local OSCAR node.
 *
 * Serves the static Next.js export (STATIC_ROOT, default ./web) and tunnels
 * everything under /sensorhub — REST API, buckets, and the MQTT-over-WebSocket
 * upgrade — to the node (NODE_HOST:NODE_PORT, default localhost:8282). The
 * point is a single origin: the viewer auto-derives its node from
 * window.location (or the spec seeds osh_nodes pointing at this port), so app,
 * API and websocket all ride localhost:PORT with no CORS or mixed-origin
 * surprises.
 *
 *   STATIC_ROOT=web PORT=8090 node serve-proxy.js
 *   npx cypress run --spec cypress/e2e/<Spec>.cy.tsx \
 *     --config baseUrl=http://localhost:8090 --env OSCAR_PORT=8090
 *
 * Plain Node, no dependencies: upgrades are tunneled as raw TCP once the
 * handshake headers are re-sent, which is all MQTT-over-WS needs.
 */

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8090);
const NODE_HOST = process.env.NODE_HOST || 'localhost';
const NODE_PORT = Number(process.env.NODE_PORT || 8282);
const STATIC_ROOT = path.resolve(process.env.STATIC_ROOT || 'web');

const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
    '.woff': 'font/woff', '.map': 'application/json', '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json',
};

// no-store: the browser profile outlives builds (cypress reuses its Electron
// profile), and a cached index.html referencing torn-down hashed chunks makes
// the SPA-fallback serve HTML as JS ("Uncaught SyntaxError: Unexpected token
// '<'") — a half-loaded app with REST alive but realtime dead.
const NO_CACHE = {'Cache-Control': 'no-store'};

function serveStatic(req, res) {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(STATIC_ROOT, urlPath);
    if (!filePath.startsWith(STATIC_ROOT)) {
        res.writeHead(403); res.end(); return;
    }
    fs.stat(filePath, (err, stat) => {
        if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
        fs.readFile(filePath, (err2, data) => {
            if (err2) {
                // A missing hashed asset is always a bug (stale client state
                // or torn-down build) — log it with the initiator, and answer
                // with a real 404 rather than SPA-falling-back HTML into a
                // <script> tag, where it dies as "Unexpected token '<'".
                if (/\.(js|css|map|woff2?)$/.test(urlPath)) {
                    console.warn(`[static-miss] ${urlPath} referer=${req.headers.referer || '-'}`);
                    res.writeHead(404, {'Content-Type': 'text/plain', ...NO_CACHE});
                    res.end('Not found');
                    return;
                }
                // Static export: /foo -> /foo.html, then SPA-fallback to the
                // 404 page Next exports (client router takes over from there).
                const htmlPath = filePath + '.html';
                fs.readFile(htmlPath, (err3, data2) => {
                    if (!err3) {
                        res.writeHead(200, {'Content-Type': 'text/html', ...NO_CACHE});
                        res.end(data2);
                        return;
                    }
                    fs.readFile(path.join(STATIC_ROOT, '404.html'), (err4, data3) => {
                        res.writeHead(err4 ? 404 : 200, {'Content-Type': 'text/html', ...NO_CACHE});
                        res.end(err4 ? 'Not found' : data3);
                    });
                });
                return;
            }
            res.writeHead(200, {'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', ...NO_CACHE});
            res.end(data);
        });
    });
}

function proxyHttp(req, res) {
    const upstream = http.request({
        host: NODE_HOST, port: NODE_PORT, method: req.method,
        path: req.url, headers: {...req.headers, host: `${NODE_HOST}:${NODE_PORT}`},
    }, (upRes) => {
        res.writeHead(upRes.statusCode, upRes.headers);
        upRes.pipe(res);
    });
    upstream.on('error', (err) => {
        console.error(`[proxy] ${req.method} ${req.url} -> ${err.message}`);
        if (!res.headersSent) res.writeHead(502);
        res.end();
    });
    req.pipe(upstream);
}

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/sensorhub')) proxyHttp(req, res);
    else serveStatic(req, res);
});

// WebSocket (MQTT et al.): replay the handshake to the node, then splice the
// sockets into a raw TCP tunnel — but only once the node commits with a 101.
//
// Two hard-won rules live here (the "stale document" flake, 2026-08-08):
//
//  - Browsers cannot attach Authorization to a WebSocket handshake, so the
//    page's first MQTT attempt reaches the node bare and Jetty answers 401.
//    Inject basic auth (NODE_AUTH, default admin:oscar) so the first attempt
//    succeeds instead of manufacturing a non-101 response.
//
//  - Never splice before seeing the node's status line. A spliced socket that
//    carried a non-101 (e.g. that 401) looks to the client's HTTP agent like a
//    healthy keep-alive socket to THIS server — Cypress pools it, and every
//    later request that reuses it flows raw into Jetty, which happily serves
//    the DEPLOYED app's index.html/chunks for it. That is how second boots
//    loaded a different build's document while this proxy logged nothing.
const AUTH = process.env.NODE_AUTH || 'admin:oscar';

server.on('upgrade', (req, clientSocket, head) => {
    const upSocket = net.connect(NODE_PORT, NODE_HOST, () => {
        let handshake = `${req.method} ${req.url} HTTP/1.1\r\n`;
        let sawAuth = false;
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const name = req.rawHeaders[i];
            const value = /^host$/i.test(name) ? `${NODE_HOST}:${NODE_PORT}` : req.rawHeaders[i + 1];
            if (/^authorization$/i.test(name)) sawAuth = true;
            handshake += `${name}: ${value}\r\n`;
        }
        if (!sawAuth && AUTH) {
            handshake += `Authorization: Basic ${Buffer.from(AUTH).toString('base64')}\r\n`;
        }
        upSocket.write(handshake + '\r\n');
        if (head && head.length) upSocket.write(head);
    });

    let preface = Buffer.alloc(0);
    const onUpstreamData = (chunk) => {
        preface = Buffer.concat([preface, chunk]);
        const headerEnd = preface.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
            if (preface.length > 16384) kill();
            return;
        }
        upSocket.removeListener('data', onUpstreamData);
        const statusLine = preface.slice(0, preface.indexOf('\r\n')).toString();
        if (/^HTTP\/1\.\d 101 /.test(statusLine)) {
            clientSocket.write(preface);
            upSocket.pipe(clientSocket);
            clientSocket.pipe(upSocket);
            return;
        }
        // Refused handshake: answer with a closed one-shot error so neither
        // side can mistake this socket for a reusable HTTP connection.
        console.warn(`[ws-refused] ${req.url} -> ${statusLine}`);
        clientSocket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
        upSocket.destroy();
    };
    upSocket.on('data', onUpstreamData);

    const kill = () => { clientSocket.destroy(); upSocket.destroy(); };
    upSocket.on('error', kill);
    clientSocket.on('error', kill);
});

server.listen(PORT, () => {
    console.log(`serve-proxy: http://localhost:${PORT} -> static ${STATIC_ROOT}, /sensorhub -> ${NODE_HOST}:${NODE_PORT}`);
});
