/*
 * Copyright (c) 2022.  Botts Innovative Research, Inc.
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

import {DBSchema, IDBPDatabase, openDB} from "idb";
import {ISensorHubServer, SensorHubServer} from "../data/Models";
import {ObservableType} from "../data/Constants";

interface SensorHubConnectDB extends DBSchema {
    sensorHubServer: {
        value: {
            address: string,
            name: string,
            uniqueId: string,
            sosEndpoint: string,
            spsEndpoint: string,
            apiEndpoint: string,
            authToken: string,
            secure: boolean,
        };
        key: string;
        indexes: { 'by-uuid': string };
    };
    settings: {
        value: {
            uuid: string,
            name: string,
            allowPlayback: boolean,
            hideSystemsWithNoStreams: boolean,
            visualizationFilter: Map<ObservableType, boolean>,
            hideDataLayerControls: boolean
        };
        key: string;
        indexes: { 'by-uuid': string };
    }
}

// Create a db instance using idb
let appDatabase: IDBPDatabase<SensorHubConnectDB> = null;

export const initDb = async function () {
    appDatabase = await openDB<SensorHubConnectDB>('wt-plugin-sensorhub-connect', 1.0, {
        upgrade(db: IDBPDatabase<SensorHubConnectDB>) {
            const sensorHubServerStore = db.createObjectStore('sensorHubServer', {
                keyPath: 'uniqueId',
                autoIncrement: false,
            });
            sensorHubServerStore.createIndex('by-uuid', 'uniqueId');

            // const settingsStore = db.createObjectStore('settings', {
            //     keyPath: 'uuid',
            //     autoIncrement: false,
            // });
            // settingsStore.createIndex('by-uuid', 'uuid');
        },
        blocked() {
        },
        blocking() {
        },
        terminated() {
        },
    });
}

// export const storeSettings = async function (settings: ISettings) {
//
//     const tx = appDatabase.transaction('settings', 'readwrite');
//
//     let existingSettings = await tx.store.get(settings.uuid);
//
//     if ((existingSettings === undefined || existingSettings === null)) {
//
//         let settingsData = {
//             uuid: settings.uuid,
//             name: settings.name,
//             allowPlayback: settings.allowPlayback,
//             hideSystemsWithNoStreams: settings.hideSystemsWithNoStreams,
//             visualizationFilter: settings.visualizationFilter,
//             hideDataLayerControls: settings.hideDataLayerControls
//         }
//
//         await tx.store.add(settingsData);
//
//     } else {
//
//         await tx.store.put(settings);
//     }
//
//     await tx.done;
// }

// export const readSettings = async function (): Promise<ISettings[]> {
//
//     let settings: ISettings[] = [];
//
//     const tx = appDatabase.transaction('settings', 'readwrite');
//
//     let data = await tx.store.getAllKeys()
//
//     for (let item of data) {
//
//         let settingsData = await tx.store.get(item);
//
//         let currentSettings: ISettings = new Settings({
//             uuid: settingsData.uuid,
//             name: settingsData.name,
//             allowPlayback: settingsData.allowPlayback,
//             hideSystemsWithNoStreams: settingsData.hideSystemsWithNoStreams,
//             visualizationFilter: settingsData.visualizationFilter,
//             hideDataLayerControls: settingsData.hideDataLayerControls
//         });
//
//         settings.push(currentSettings);
//     }
//
//     await tx.done;
//
//     return settings;
// }

// export const deleteSettings = async function (uniqueId: string): Promise<void> {
//
//     const tx = appDatabase.transaction('settings', 'readwrite');
//
//     await tx.store.delete(uniqueId);
//
//     await tx.done;
// }

export const storeSensorHubServer = async function (sensorHubServer: ISensorHubServer) {

    const tx = appDatabase.transaction('sensorHubServer', 'readwrite');

    let existingServer = await tx.store.get(sensorHubServer.uniqueId);

    if ((existingServer === undefined || existingServer === null)) {

        let serverData = {
            address: sensorHubServer.address,
            name: sensorHubServer.name,
            uniqueId: sensorHubServer.uniqueId,
            sosEndpoint: sensorHubServer.sosEndpoint,
            spsEndpoint: sensorHubServer.spsEndpoint,
            apiEndpoint: sensorHubServer.apiEndpoint,
            authToken: sensorHubServer.authToken,
            secure: sensorHubServer.secure,
        }

        await tx.store.add(serverData);
    }

    await tx.done;
}

export const deleteSensorHubServer = async function (uniqueId: string) {

    const tx = appDatabase.transaction('sensorHubServer', 'readwrite');

    await tx.store.delete(uniqueId);

    await tx.done;
}

export const readSensorHubServers = async function (): Promise<ISensorHubServer[]> {

    let sensorHubServer: ISensorHubServer[] = [];

    const tx = appDatabase.transaction('sensorHubServer', 'readwrite');

    let data = await tx.store.getAllKeys()

    for (let item of data) {

        let existingServer = await tx.store.get(item);

        let server: ISensorHubServer = new SensorHubServer({
            address: existingServer.address,
            name: existingServer.name,
            uniqueId: existingServer.uniqueId,
            sosEndpoint: existingServer.sosEndpoint,
            spsEndpoint: existingServer.spsEndpoint,
            apiEndpoint: existingServer.apiEndpoint,
            authToken: existingServer.authToken,
            secure: existingServer.secure,
            systems: [],
        });

        sensorHubServer.push(server);
    }

    await tx.done;

    return sensorHubServer;
}
