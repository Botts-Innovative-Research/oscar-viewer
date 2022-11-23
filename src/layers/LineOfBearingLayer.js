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

import Layer from "osh-js/source/core/ui/layer/Layer";
import {hasValue, isDefined, randomUUID} from "osh-js/source/core/utils/Utils";

/**
 Creates a line of bearing Styler
 */
class LineOfBearingLayer extends Layer {

    /**
     *
     @param properties
     */
    constructor(properties) {
        super(properties);
        this.type = 'polyline';
        this.properties = properties;
        this.props.locations = {};
        this.props.color = 'red';
        this.props.weight = 1;
        this.props.opacity = 1;
        this.props.smoothFactor = 1;
        this.props.maxPoints = 10;
        this.props.polylineId = 'bearingLine';
        this.props.clampToGround = false;

        if(isDefined(properties.color)){
            this.props.color = properties.color;
        }

        if(isDefined(properties.weight)){
            this.props.weight = properties.weight;
        }

        if(isDefined(properties.opacity)){
            this.props.opacity = properties.opacity;
        }

        if(isDefined(properties.smoothFactor)){
            this.props.smoothFactor = properties.smoothFactor;
        }

        if(isDefined(properties.maxPoints)){
            this.props.maxPoints = properties.maxPoints;
        }

        if(isDefined(properties.clampToGround)){
            this.props.clampToGround = properties.clampToGround;
        }

        let that = this;
        // must be first to assign correctly the first location to the right id if it is defined
        if(isDefined(properties.getPolylineId)) {
            let fn = function(rec) {
                that.props.polylineId = that.getFunc('getPolylineId')(rec);

            };
            this.addFn(that.getDataSourcesIdsByProperty('getPolylineId'),fn);
        }


        if(isDefined(properties.getLocation)) {
            let fn = function(rec) {
                let loc = that.getFunc('getLocation')(rec);
                // that.props.polylineId = that.getFunc('getAPolylineId')(rec);
                if(!(that.props.polylineId in that.props.locations)) {
                    that.props.locations[that.props.polylineId] = [];
                }

                that.props.locations[that.props.polylineId] = [];
                that.props.locations[that.props.polylineId].push(...loc);
            };
            this.addFn(that.getDataSourcesIdsByProperty('getLocation'),fn);
        }

        if(isDefined(properties.getColor)) {
            let fn = function(rec) {
                that.props.color = that.getFunc('getColor')(rec);
            };
            this.addFn(that.getDataSourcesIdsByProperty('getColor'),fn);
        }

        if(isDefined(properties.getWeight)) {
            let fn = function(rec) {
                that.props.weight = that.getFunc('getWeight')(rec);
            };
            this.addFn(that.getDataSourcesIdsByProperty('getWeight'),fn);
        }

        if(isDefined(properties.getOpacity)) {
            let fn = function(rec) {
                that.props.opacity = that.getFunc('getOpacity')(rec);
            };
            this.addFn(that.getDataSourcesIdsByProperty('getOpacity'),fn);
        }

        if(isDefined(properties.getSmoothFactor)) {
            let fn = function(rec) {
                that.props.smoothFactor = that.getFunc('getSmoothFactor')(rec);
            };
            this.addFn(that.getDataSourcesIdsByProperty('getSmoothFactor'),fn);
        }

        this.saveState();
    }

    /**
     *
     */
    clear() {
        this.props.locations[this.props.polylineId] = [];
    }
}

export default LineOfBearingLayer;
