/*
 * Copyright (c) 2022-2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 *
 * opensensorhub/osh-viewer is licensed under the
 *
 * Mozilla Public License 2.0
 * Permissions of this weak copyleft license are conditioned on making available source code of licensed
 * files and modifications of those files under the same license (or in certain cases, one of the GNU licenses).
 * Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
 * However, a larger work using the licensed work may be distributed under different terms and without
 * source code for files added in the larger work.
 *
 */

import React, {useEffect} from "react";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {selectUseBuildingModels, setMapView, updateContextMenuState} from "../../state/Slice";
import {
    defined,
    createOsmBuildingsAsync,
    Cartesian3,
    Ion,
    SceneMode,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    Terrain
} from "@cesium/engine";
import "@cesium/engine/Source/Widget/CesiumWidget.css";
// @ts-ignore
import CesiumView from "osh-js/source/core/ui/view/map/CesiumView.js"

let buildingTileset: any = null;
let viewer: any = null;

const CesiumMap = () => {

    const dispatch = useAppDispatch();
    let showBuildings = useAppSelector(selectUseBuildingModels);

    useEffect(() => {

        Ion.defaultAccessToken = '';

        let cesiumView = new CesiumView({
            container: 'CesiumMap',
            layers: [],
            options: {
                viewerProps: {
                    // terrainProvider: Cesium.createWorldTerrain(),
                    terrain: Terrain.fromWorldTerrain(),
                    // imageryProvider: new Cesium.IonImageryProvider({assetId: 3954}),
                    sceneMode: SceneMode.SCENE3D,
                    // infoBox: false,
                    // geocoder: false,
                    timeline: false,
                    animation: false,
                    homeButton: false,
                    scene3DOnly: true,
                    // baseLayerPicker: false,
                    // sceneModePicker: false,
                    fullscreenButton: false,
                    // projectionPicker: false,
                    // selectionIndicator: false,
                    navigationHelpButton: true,
                    navigationInstructionsInitiallyVisible: true
                }
            }
        });

        let baseLayerPicker: any = cesiumView.viewer.baseLayerPicker;

        let imageryProviders: any = baseLayerPicker.viewModel.imageryProviderViewModels;

        baseLayerPicker.viewModel.selectedImagery =
            imageryProviders.find((imageProviders: any) => imageProviders.name === "Bing Maps Aerial");

        let terrainProviders: any = baseLayerPicker.viewModel.terrainProviderViewModels;

        baseLayerPicker.viewModel.selectedTerrain =
            terrainProviders.find((terrainProviders: any) => terrainProviders.name === "Cesium World Terrain");

        viewer = cesiumView.viewer;

        dispatch(setMapView(cesiumView));

        // Disable autocomplete - uncomment if geocoder is enabled
        // viewer.geocoder.viewModel.autoComplete = false;

        // Add Cesium OSM Buildings, a global 3D buildings layer.

        let createBuildingTileSet = async () => {

            const osmBuildingsTileset = await createOsmBuildingsAsync();

            buildingTileset = viewer.scene.primitives.add(osmBuildingsTileset);
        };

        createBuildingTileSet().then();

        // By default, load into a view of Washington Monument from above
        viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(-77.03512734712851, 38.88943991307860, 800),
        });

        const handler = new ScreenSpaceEventHandler(viewer.canvas);

        handler.setInputAction(function (event: { position: any; }) {

            // We use `viewer.scene.pickPosition` here instead of `viewer.camera.pickEllipsoid` so that
            // we get the correct point when mousing over terrain.
            const earthPosition = viewer.scene.pickPosition(event.position);

            // `earthPosition` will be undefined if our mouse is not over the globe.
            if (defined(earthPosition)) {

                dispatch(updateContextMenuState({showMenu: false}));
            }

        }, ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction(function (movement: { position: any; }) {

            dispatch(updateContextMenuState({

                showMenu: true, top: movement.position.y, left: movement.position.x
            }));

        }, ScreenSpaceEventType.RIGHT_CLICK);

        handler.setInputAction(function (event: { position: any; }) {

            // We use `viewer.scene.pickPosition` here instead of `viewer.camera.pickEllipsoid` so that
            // we get the correct point when mousing over terrain.
            const earthPosition = viewer.scene.pickPosition(event.position);

            // `earthPosition` will be undefined if our mouse is not over the globe.
            if (defined(earthPosition)) {

                console.log("Click Pos: " + earthPosition); // position of click
            }

        }, ScreenSpaceEventType.RIGHT_UP);

    }, [])

    if (viewer != null && buildingTileset != null) {

        buildingTileset.show = showBuildings;

        viewer.scene.requestRender();
    }

    return (<div id={'CesiumMap'} style={{height: '90vh', position: 'relative'}}/>);
}

export default CesiumMap;