
describe('Map View Page (E2E)', () => {
    beforeEach(() => {
        cy.visit('/map');
    });

    it('uses OSM as the default base map and reserves a top raster pane for site diagrams', () => {
        cy.contains('.leaflet-control-layers-base label', 'OSM', {timeout: 20000})
            .find('input.leaflet-control-layers-selector')
            .should('be.checked');

        cy.get('.leaflet-tile-pane img.leaflet-tile', {timeout: 20000})
            .should(($tiles) => {
                const loadedOsmTile = [...$tiles].some((tile: HTMLImageElement) =>
                    /^https:\/\/tile\.openstreetmap\.org\//.test(tile.src) &&
                    tile.complete && tile.naturalWidth > 0);
                expect(loadedOsmTile, 'at least one rendered OSM tile').to.equal(true);
            });

        cy.get('.leaflet-site-diagram-pane')
            .should('have.css', 'z-index', '450');
        cy.get('.leaflet-lane-markers-pane')
            .should('have.css', 'z-index', '650');
    });

    it.skip('selecting point marker displays popup with lanename, status, and button', () => {
        //todo
        cy.get('[id="mapcontainer"]')
            .should('be.visible');

        // find the pointmarker and click

        // cy.get('').should('exist') //lane name
        // lane status
        // view button
    });

    it.skip('navigate to laneview from pointmarker', () => {
        //todo

        // click the pointmarker and click view lane button

        // click pointmarker
        cy.get('[""]').click();

        // check if popup menu is visible

        // find button to view lane and click it

        // check url to see if navigation occured to lane view
    });
});
