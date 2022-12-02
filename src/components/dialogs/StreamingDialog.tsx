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

import React, {useEffect, useState} from "react";
import DraggableDialog from "../decorators/DraggableDialog";
import {IObservable} from "../../data/Models";
import {ObservableType} from "../../data/Constants";
import {useAppDispatch} from "../../state/Hooks";
import {disconnectObservable} from "../../state/Slice";

// @ts-ignore
import VideoView from "osh-js/source/core/ui/view/video/VideoView"
// @ts-ignore
import Layer from "osh-js/source/core/ui/layer/Layer"
// @ts-ignore
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer"

import "../../Styles.css"

interface IStreamingDialogProps {
    observable: IObservable
}

const StreamingDialog = (props: IStreamingDialogProps) => {

    let dispatch = useAppDispatch();

    useEffect(() => {

        console.log("StreamingDialog called " + new Date().toISOString());

        let videoDataLayer: VideoDataLayer = props.observable.layers.filter((layer: Layer) => layer instanceof VideoDataLayer);

        let videoView = new VideoView({
            container: props.observable.uuid,
            css: "video-stream",
            name: props.observable.physicalSystem.name + " Video",
            framerate: 30,
            showTime: false,
            showStats: false,
            layers: videoDataLayer
        });

        return () => {
            // componentWillUnmount equivalent in functional component.
            // Anything in here is fired on component unmount.
            if (videoView) {

                videoView.destroy();
            }
        }

    }, [])

    const disconnectAndClose = () => {

        dispatch(disconnectObservable(props.observable));
    }

    return (
        <DraggableDialog title={props.observable.physicalSystem.name} onClose={disconnectAndClose}
                         style={{
                             display: props.observable.type == ObservableType.DRAPING ? "none" : "block"
                         }}>
            <div id={props.observable.uuid}/>
        </DraggableDialog>
    );
}

export default StreamingDialog;