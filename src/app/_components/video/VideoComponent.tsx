// "use client"
//
// import { useEffect, useRef, useState } from "react"
// import VideoView from 'osh-js/source/core/ui/view/video/VideoView';
// import VideoDataLayer from 'osh-js/source/core/ui/layer/VideoDataLayer';
// import Box from "@mui/material/Box/Box";
// import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
//
//
// interface OSHVideoProps {
//     currentPage: number,
//     id: string
//     videoSources: typeof SweApi[]
// }
//
// export default function VideoComponent(props: OSHVideoProps) {
//
//     const hasRendered = useRef(false);
//     const [videoView, setVideoView] = useState(null);
//     const [videoDataSource, setVideoDataSource] = useState(props.videoSources[0]);
//
//     useEffect(() => {
//         setVideoDataSource(props.videoSources[props.currentPage]);
//     }, [props.currentPage]);
//
//     useEffect(() => {
//         if(hasRendered.current) return;
//
//         if(videoView == null && videoDataSource != null) {
//
//             const view = new VideoView({
//                 container: props.id,
//                 showTime: false,
//                 showStats: false,
//                 layers: [new VideoDataLayer({
//                     dataSourceId: [videoDataSource.getId()],
//                     getFrameData: (rec: any) => rec.img,
//                     getTimestamp: (rec: any) => rec.timestamp,
//                 })]
//             });
//             console.log('Video View created', view)
//             setVideoView(view);
//             hasRendered.current = true;
//         }
//
//         return () => {
//             if (videoView) {
//                 videoView.destroy();
//             }
//         };
//
//     }, [videoDataSource]);
//
//     useEffect(() => {
//         console.log('video in component', videoDataSource)
//     }, []);
//
//     return (
//         <Box id={props.id} style={{ width: "100%", height: '100%'}}/>
//     )
// }