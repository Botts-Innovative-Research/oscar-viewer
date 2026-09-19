import {
    buildSiteDiagramUrl,
    OSM_TILE_URL,
    SITE_DIAGRAM_FIT_OPTIONS,
    SITE_DIAGRAM_PANE_Z_INDEX,
    toLeafletSiteDiagramBounds,
} from "../../src/app/_components/maps/MapUtils";

describe("map configuration", () => {
    const node = {
        address: "oscar.example",
        port: 8443,
        isSecure: true,
        oshPathRoot: "/sensorhub/",
        bucketsEndpoint: "/files/",
    };

    it("uses the standard HTTPS OpenStreetMap tile service by default", () => {
        expect(OSM_TILE_URL).to.equal("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
    });

    it("builds site diagram URLs from the node bucket endpoint", () => {
        expect(buildSiteDiagramUrl("sitemap/site plan.png", node))
            .to.equal("https://oscar.example:8443/sensorhub/files/sitemap/site plan.png");
        expect(buildSiteDiagramUrl("files\\sitemap\\site-plan.png", node))
            .to.equal("https://oscar.example:8443/sensorhub/files/sitemap/site-plan.png");
    });

    it("preserves absolute site diagram URLs", () => {
        const absoluteUrl = "https://cdn.example/site-map.png";
        expect(buildSiteDiagramUrl(absoluteUrl, node)).to.equal(absoluteUrl);
    });

    it("converts semantic latitude and longitude to Leaflet bounds", () => {
        expect(toLeafletSiteDiagramBounds({
            lowerLeftBound: {lat: 35.9, lon: -84.4},
            upperRightBound: {lat: 36.1, lon: -84.1},
        })).to.deep.equal([
            [35.9, -84.4],
            [36.1, -84.1],
        ]);
    });

    it("rejects invalid or inverted site diagram bounds", () => {
        expect(toLeafletSiteDiagramBounds({
            lowerLeftBound: {lat: 36.1, lon: -84.4},
            upperRightBound: {lat: 35.9, lon: -84.1},
        })).to.equal(null);
        expect(toLeafletSiteDiagramBounds({
            lowerLeftBound: {lat: 35.9, lon: -184.4},
            upperRightBound: {lat: 36.1, lon: -84.1},
        })).to.equal(null);
    });

    it("keeps diagrams above base tiles while leaving markers visible", () => {
        expect(SITE_DIAGRAM_PANE_Z_INDEX).to.be.greaterThan(200);
        expect(SITE_DIAGRAM_PANE_Z_INDEX).to.be.lessThan(600);
    });

    it("fits the initial map viewport tightly to the uploaded diagram extent", () => {
        expect(SITE_DIAGRAM_FIT_OPTIONS).to.deep.equal({
            animate: false,
            padding: [0, 0],
        });
    });
});
