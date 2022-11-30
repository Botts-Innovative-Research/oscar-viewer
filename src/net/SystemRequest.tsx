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

import {IPhysicalSystem, ISensorHubServer, PhysicalSystem, PhysicalSystemTime} from "../data/Models";
import {Service} from "../data/Constants";
import {fetchFromObject} from "../utils/Utils";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";

export async function fetchPhysicalSystems(server: ISensorHubServer, withCredentials: boolean): Promise<IPhysicalSystem[]> {

    let request: string = server.address + Service.API + '/systems?f=application/json&validTime=../..';

    let options: RequestInit = {};
    options.method = "GET";
    if (withCredentials) {

        options.credentials = "include";
        options.headers = new Headers({
            "Authorization": "Basic " + server.authToken,
            "Content-Type": "application/json",
        });
    }
    options.mode = "cors";

    let response = await fetch(request, options).catch(reason => {
        console.error("Physical systems request failed on :" + server.name);
        // return new Response(JSON.stringify({ items: []}));
        throw new Error(reason);
    });

    return await response.json().then(
        data => {
            let physicalSystems: IPhysicalSystem[] = [];

            let systemsData: any[] = fetchFromObject(data, "items");

            for (let system of systemsData) {

                let systemId = fetchFromObject(system, "id");

                let uid = fetchFromObject(system, "properties.uid");

                let name = fetchFromObject(system, "properties.name")

                let physicalSystem: IPhysicalSystem = new PhysicalSystem({
                    name: name,
                    serverUid: uid,
                    systemId: systemId,
                    uuid: randomUUID(),
                    physicalSystemTime: new PhysicalSystemTime(),
                    server: server,
                    observables: []
                });

                server.systems.push(physicalSystem);

                physicalSystems.push(physicalSystem);
            }

            return physicalSystems;
        });
}