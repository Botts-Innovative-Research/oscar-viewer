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

// @ts-ignore
import {SensorHubServer,} from "../data/Models";
import {Service} from "../data/Constants";

export async function fetchObservables(server: SensorHubServer, withCredentials: boolean, observableRules: string) {

    const supportingClause: string = "/discover?supporting="

    let request: string = server.address + Service.DISCOVERY + supportingClause + observableRules;

    let options: RequestInit = {};
    options.method = "GET";
    if (withCredentials) {

        options.credentials = "include";
        options.headers = new Headers({
            "Authorization": "Basic " + server.authToken,
            "Content-Type": "application/json",
        });
    }

    let response = await fetch(request, options).catch(reason => {
        console.error("Discovery request failed on :" + server.name + " for observable rules: " + observableRules);
        return new Response(JSON.stringify({resultSet: []}));
    });

    return response.json();
}