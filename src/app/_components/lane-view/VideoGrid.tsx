// // "use client";
// //
// // import {Box, IconButton, Stack } from '@mui/material';
// // import {useEffect, useState} from 'react';
// // import "../../style/cameragrid.css";
// //
// // import VideoComponent from '../video/VideoComponent';
// // import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource"
// // import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
// // import NavigateNextIcon from '@mui/icons-material/NavigateNext';
// // import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
// // import {useSelector} from "react-redux";
// // import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
// // import {RootState} from "@/lib/state/Store";
// //
// // export default function VideoGrid(props: {videoSources: any}) {
// //
// //     const [currentPage, setCurrentPage] = useState(0);
// //     const [maxPages, setMaxPages] = useState(0)
// //     const [videoSources, setVideoSources] = useState([]);
// //
// //
// //     useEffect(() => {
// //         if (Array.isArray(props.videoSources)) {
// //             setVideoSources(props.videoSources);
// //         } else if (props.videoSources) {
// //             setVideoSources([props.videoSources]);
// //         } else {
// //             setVideoSources([]);
// //         }
// //     }, [props.videoSources]);
// //
// //
// //     useEffect(() => {
// //         if(videoSources.length > 0 && !videoSources){
// //             setMaxPages(videoSources.length);
// //         }
// //
// //         console.log('videosources',videoSources)
// //     }, [videoSources]);
// //
// //     useEffect(() => {
// //
// //         async function tryConnection(){
// //             if(videoSources && videoSources.length > 0 && currentPage <= maxPages){
// //                 const currentVideo = videoSources[currentPage];
// //
// //                 const isConnected = await currentVideo.isConnected();
// //                 if(isConnected){
// //                     currentVideo.disconnect()
// //                 }
// //                 console.log('Connecting to current video', currentVideo.name)
// //                 currentVideo.connect();
// //             }
// //         }
// //
// //         tryConnection();
// //
// //     }, [videoSources, currentPage]);
// //
// //
// //     const handleNextPage = () =>{
// //         setCurrentPage((prevPage)=> {
// //             let nextPage = prevPage + 1
// //             if(videoSources && videoSources[0] && nextPage <= maxPages-1){
// //                 checkConnection(prevPage);
// //                 return nextPage;
// //             }else{
// //                 return prevPage;
// //             }
// //         })
// //     }
// //
// //     const handlePrevPage = () =>{
// //         setCurrentPage((prevPage) => {
// //             let currpage = prevPage - 1;
// //             checkConnection(prevPage);
// //             return currpage;
// //
// //         })
// //
// //     }
// //
// //     //next page -> disconnect from the previous page and connect to the next page if its not connected we can connect it
// //     async function checkConnection (prevPage: number){
// //         if(prevPage >= 0){
// //             for (const video of videoSources) {
// //                 const isConnected = await video.isConnected();
// //                 if(isConnected){
// //                     console.log('disconnecting', video.videoDS[prevPage].name)
// //                     video.videoDS[prevPage].disconnect();
// //                 }
// //
// //             }
// //         }
// //     }
// //
// //     useEffect(() => {
// //         console.log('video list in video grid', videoSources)
// //     }, [videoSources]);
// //
// //     return (
// //         <>
// //             {videoSources != null && videoSources.length > 0 && (
// //                 <Box sx={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
// //                     <IconButton onClick={handlePrevPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === 0}>
// //                         <NavigateBeforeIcon/>
// //                     </IconButton>
// //
// //                     <Stack
// //                         margin={0}
// //                         spacing={2}
// //                         direction="row"
// //                         alignContent="center"
// //                         justifyContent={"center"}
// //                         sx={{ padding: 2, width: '50%', height: '50', border: "solid", borderWidth: '1px', borderColor: "rgba(0, 0, 0, 0.12)"}}
// //                     >
// //                         <VideoComponent
// //                             key={videoSources[currentPage].name}
// //                             id={videoSources.laneName}
// //                             currentPage={currentPage}
// //                             videoSources={[videoSources[currentPage]]}
// //                         />
// //                     </Stack>
// //
// //                     <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === maxPages-1}>
// //                         <NavigateNextIcon/>
// //                     </IconButton>
// //                 </Box>
// //             )}
// //
// //
// //         </>
// //     );
// // }
//
//
// "use client";
//
// import {Box, IconButton, Stack } from '@mui/material';
// import {useCallback, useContext, useEffect, useState} from 'react';
// import "../../style/cameragrid.css";
// import { useSelector } from 'react-redux';
// import { LaneDSColl, LaneMapEntry } from '@/lib/data/oscar/LaneCollection';
// import { selectLaneMap } from '@/lib/state/OSCARLaneSlice';
// import { RootState } from '@/lib/state/Store';
// import VideoComponent from '../video/VideoComponent';
// import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource"
// import {DataSourceContext} from '../../contexts/DataSourceContext';
// import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
// import NavigateNextIcon from '@mui/icons-material/NavigateNext';
//
//
// interface LaneVideoProps{
//     laneName: string
// }
// interface LaneWithVideo {
//     laneName: string,
//     videoSources: typeof ConSysApi[]
// }
// export default function VideoGrid(props: LaneVideoProps) {
//
//     const {laneMapRef} = useContext(DataSourceContext);
//
//     const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);
//     const [currentPage, setCurrentPage] = useState(0);
//
//     const [maxPages, setMaxPages] = useState(0)
//     const laneMap = useSelector((state: RootState) => selectLaneMap(state));
//     const [dsVideo, setDsVideo] = useState([]);
//
//
//     const datasourceSetup = useCallback(async () => {
//
//         let laneDSMap = new Map<string, LaneDSColl>();
//         let videoDs: any[] = [];
//
//         for (let [laneid, lane] of laneMap.entries()) {
//             laneDSMap.set(laneid, new LaneDSColl());
//             for (let ds of lane.datastreams) {
//
//                 let idx: number = lane.datastreams.indexOf(ds);
//                 let rtDS = lane.datasourcesRealtime[idx];
//                 let laneDSColl = laneDSMap.get(laneid);
//
//                 if(ds.properties.observedProperties[0].definition.includes("http://sensorml.com/ont/swe/property/RasterImage") || ds.properties.observedProperties[0].definition.includes("http://sensorml.com/ont/swe/property/VideoFrame")){
//                     console.log("Video DS Found",ds);
//                     videoDs.push(rtDS);
//                 }
//             }
//             setDsVideo(videoDs);
//         }
//     }, [laneMapRef.current]);
//
//     useEffect(() => {
//         datasourceSetup();
//     }, [laneMapRef.current]);
//
//     // Create and connect videostreams
//     useEffect(() => {
//         if(videoList == null || videoList.length == 0 && laneMap.size > 0) {
//             let updatedVideos: LaneWithVideo[] = []
//
//             laneMap.forEach((value, key) => {
//                 if (key === props.laneName) {
//                     let ds: LaneMapEntry = laneMap.get(key);
//
//                     dsVideo.forEach((dss) =>{
//                         const videoSources = ds.datasourcesRealtime.filter((item) => item.properties.resource === (dss.properties.resource));
//                         if(videoSources.length > 0){
//                             let existingLane = updatedVideos.find((lane) => lane.laneName === key);
//                             if (existingLane) {
//
//                                 existingLane.videoSources.push(...videoSources.filter((source) => !existingLane.videoSources.some((existingSource) => existingSource === source)));
//                             } else {
//
//                                 updatedVideos.push({ laneName: key, videoSources });
//                             }
//
//                         }
//                     })
//
//                     // const videoSources = ds.datasourcesRealtime.filter((item) =>
//                     //     item.name.includes('Video') && item.name.includes('Lane')
//                     // );
//                     //
//                     // if (videoSources.length > 0) {
//                     //     videos.push({laneName: key, videoSources});
//                     // }
//                 }
//             });
//             setVideoList(updatedVideos);
//
//         }
//     }, [laneMap, props.laneName, dsVideo]);
//
//     console.log(videoList)
//
//     useEffect(() => {
//         if(videoList && videoList.length> 0){
//             setMaxPages(videoList[0].videoSources.length);
//         }
//     }, [videoList]);
//
//
//     useEffect(() => {
//
//         if(videoList && videoList.length > 0 && currentPage <= maxPages){
//             const currentVideo = videoList[0].videoSources[currentPage];
//             if(currentVideo.isConnected()){
//                 currentVideo.disconnect()
//             }
//             currentVideo.connect();
//         }
//     }, [videoList, currentPage, maxPages]);
//
//
//     const handleNextPage = () =>{
//         setCurrentPage((prevPage)=> {
//             let nextPage = prevPage + 1
//             if(videoList && videoList[0] && nextPage <= maxPages-1){
//                 checkConnection(prevPage);
//                 return nextPage;
//             }else{
//                 return prevPage;
//             }
//         })
//     }
//
//     const handlePrevPage = () =>{
//         setCurrentPage((prevPage) => {
//             let currpage = prevPage - 1;
//             checkConnection(prevPage);
//             return currpage;
//
//         })
//
//     }
//
//     //next page -> disconnect from the previous page and connect to the next page if its not connected we can connect it
//     async function checkConnection (prevPage: number){
//         if(prevPage >= 0){
//             for (const video of videoList) {
//                 const isConnected = await video.videoSources[prevPage].isConnected();
//                 if(isConnected){
//                     console.log('disconnecting', video.videoSources[prevPage].name)
//                     video.videoSources[prevPage].disconnect();
//                 }
//
//             }
//         }
//     }
//
//     return (
//         <>
//             {videoList != null && videoList.length > 0 && (
//                 <Box sx={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
//                     <IconButton onClick={handlePrevPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === 0}>
//                         <NavigateBeforeIcon/>
//                     </IconButton>
//
//                     <Stack
//                         margin={0}
//                         spacing={2}
//                         direction="row"
//                         alignContent="center"
//                         justifyContent={"center"}
//                         sx={{ padding: 2, width: '50%', height: '50', border: "solid", borderWidth: '1px', borderColor: "rgba(0, 0, 0, 0.12)"}}
//                     >
//                         <VideoComponent
//                             key={videoList[0].videoSources[currentPage].name}
//                             id={videoList[0].laneName}
//                             currentPage={currentPage}
//                             videoSources={[videoList[0].videoSources[currentPage]]}
//                         />
//                     </Stack>
//
//                     <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === maxPages-1}>
//                         <NavigateNextIcon/>
//                     </IconButton>
//                 </Box>
//             )}
//
//
//         </>
//     );
// }


"use client";

import {Box, IconButton, Stack } from '@mui/material';
import { useEffect, useRef, useState} from 'react';
import "../../style/cameragrid.css";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource"
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";


export default function VideoGrid({videoDataSources}: {videoDataSources: typeof ConSysApi[]}) {

    const [dataSources, setDatasources] = useState<typeof ConSysApi[]>([]);

    const videoViewRef = useRef<typeof VideoView>();
    const [selVideoIdx, setSelVidIdx] = useState<number>(0);
    const [maxPages, setMaxPages] = useState(0)

    const [videoWidth, setVideoWidth] = useState("450px");
    const [videoHeight, setVideoHeight] = useState("500px");


    useEffect(() => {
        if(videoDataSources.length > 0 && videoDataSources){
            setDatasources(videoDataSources);
            setMaxPages(videoDataSources.length);
        }
    }, [videoDataSources]);


    useEffect(() => {
        if(dataSources.length > 0){
            videoViewRef.current = new VideoView({
                container: "lane-view-video",
                showTime: false,
                showStats: false,
                layers: [new VideoDataLayer({
                    dataSourceId: dataSources[selVideoIdx].id,
                    getFrameData: (rec: any) => rec.img,
                    getTimestamp: (rec: any) => rec.timestamp,
                })]
            });
        }

        return () => {
            if (videoViewRef.current) {
                videoViewRef.current.destroy();
                videoViewRef.current = undefined;
            }
        }

    }, [dataSources, selVideoIdx]);



    useEffect(() => {
        async function tryConnection(){
            if(dataSources && dataSources.length > 0 && selVideoIdx <= dataSources.length){
                const currentVideo = dataSources[selVideoIdx];

                const isConnected = await currentVideo.isConnected();
                if(isConnected){
                    await currentVideo.disconnect()
                }
                await currentVideo.connect();
                console.log('Videostream Connected: ', currentVideo.name)
            }
        }

        tryConnection().then(r => console.log("Connecting....."));

    }, [dataSources, selVideoIdx]);

    const handleNextPage = () =>{

        setSelVidIdx((prevPage)=> {
            if (videoDataSources.length === 0) return 0;

            let nextPage = prevPage + 1

            disconnectLastVideo(prevPage)
            return nextPage < maxPages ? nextPage : prevPage;
        })
    }

    const handlePrevPage = () =>{
        setSelVidIdx((prevPage) => {
            disconnectLastVideo(prevPage)
            return prevPage > 0 ? prevPage -1 : prevPage;
        })

    }

    //next page -> disconnect from the previous page and connect to the next page if its not connected we can connect it
    async function disconnectLastVideo (prevPage: number){
        if(prevPage >= 0){
            const isConnected = await dataSources[prevPage].isConnected();
            if(isConnected){
                console.log('disconnecting', dataSources[prevPage].name)
                await dataSources[prevPage].disconnect();
            }
        }
    }


    return (
        <>
            {dataSources != null && dataSources.length > 0 && (
                <Box sx={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
                    <IconButton onClick={handlePrevPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === 0}>
                        <NavigateBeforeIcon/>
                    </IconButton>

                   <Stack
                       margin={0}
                       spacing={2}
                       direction="row"
                       alignContent="center"
                       justifyContent="center"
                       sx={{
                           height: videoHeight,
                           width: videoWidth,
                           alignItems: "center",
                           border: "1px solid rgba(0,0,0,0.12)",
                           padding: 1,
                           display: "flex"
                       }}
                       >
                        <Box
                            key={dataSources[selVideoIdx].id}
                            id="lane-view-video"
                            sx={{
                                width: "100%",
                                height: "100%",
                            }}
                        />
                    </Stack>

                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === maxPages-1}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            )}


        </>
    );
}