import {
    buildSiteDiagramUrl,
    LANE_MARKER_PANE_Z_INDEX,
    OSM_TILE_URL,
    SITE_DIAGRAM_FIT_OPTIONS,
    SITE_DIAGRAM_PANE_Z_INDEX,
    toLaneMapLocation,
    toLaneMapLocationFromSystem,
    toLeafletSiteDiagramBounds,
} from "../../src/app/_components/maps/MapUtils";
import {isLocationDataStream} from "../../src/lib/data/oscar/Utilities";

describe("map configuration", () => {
    const node = {
        address: "oscar.example",
        port: 8443,
        isSecure: true,
        oshPathRoot: "/sensorhub/",
        bucketsEndpoint: "/files/",
    };

    it("uses the standard HTTPS OpenStreetMap tile service by default", () => {
        expect(OSM_TILE_URL).to.equal("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
        expect(OSM_TILE_URL).not.to.include("{s}");
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
        expect(SITE_DIAGRAM_PANE_Z_INDEX).to.be.lessThan(LANE_MARKER_PANE_Z_INDEX);
    });

    it("reads the latest lane location record used by the dashboard marker", () => {
        expect(toLaneMapLocation({location: {lat: 35.8855, lon: -84.2115, alt: 12}}))
            .to.deep.equal({lat: 35.8855, lon: -84.2115, alt: 12});
        expect(toLaneMapLocation({location: {lat: 95, lon: -84.2115, alt: 12}}))
            .to.equal(null);
        expect(toLaneMapLocation({location: {lat: 35.8855, lon: undefined}}))
            .to.equal(null);
    });

    it("recognizes the canonical fixed-position output when property metadata is incomplete", () => {
        expect(isLocationDataStream({
            properties: {outputName: "sensorLocation", observedProperties: []},
        } as any)).to.equal(true);
        expect(isLocationDataStream({
            properties: {name: "Sensor Location", observedProperties: []},
        } as any)).to.equal(true);
    });

    it("uses the lane system GeoJSON point when no location observation is available", () => {
        expect(toLaneMapLocationFromSystem({
            properties: {
                geometry: {
                    type: "Point",
                    coordinates: [-84.2115, 35.8855, 12],
                },
            },
        })).to.deep.equal({lat: 35.8855, lon: -84.2115, alt: 12});
        expect(toLaneMapLocationFromSystem({
            properties: {geometry: {type: "LineString", coordinates: []}},
        })).to.equal(null);
    });

    it("fits the initial map viewport tightly to the uploaded diagram extent", () => {
        expect(SITE_DIAGRAM_FIT_OPTIONS).to.deep.equal({
            animate: false,
            padding: [0, 0],
        });
    });
});
