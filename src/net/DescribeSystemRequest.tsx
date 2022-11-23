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

import {IPhysicalSystem, ISensorHubServer} from "../data/Models";
import {Service} from "../data/Constants";

export function describeSystem(server: ISensorHubServer, system: IPhysicalSystem) {

    const systemRequestClause = "/systems/" + system.systemId;

    window.open(server.address + Service.API + systemRequestClause, null, null);
}