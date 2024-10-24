import { selectEventTableDataArray } from "@/lib/state/EventDataSlice";
import { RootState } from "@/lib/state/Store";
import { PropsWithChildren, useEffect, useRef } from "react";
import { useSelector } from "react-redux";

let alarmAudio: HTMLAudioElement = null;

export function getAlarmAudio() {
    if(alarmAudio == undefined || alarmAudio == null) {
        alarmAudio = new Audio('/alarm_sound.wav');
    }
    return alarmAudio;
}

export async function playAudio(audio: HTMLAudioElement) {
    audio.play();
}

export default function AlarmAudio(props: PropsWithChildren) {

    useEffect(() => {
        document.body.addEventListener("click", function() {
            if(alarmAudio == undefined || alarmAudio == null) {
                console.info("Alarm audio has been loaded.");
                console.info(getAlarmAudio());
            }
        });
    }, []);

    const tableData = useSelector((state: RootState) => selectEventTableDataArray(state))
    const isLoaded = useRef(false);

    useEffect(() => {
        if(tableData != undefined && tableData.length > 0) {
            isLoaded.current = true;
        }
        if(isLoaded.current) {
            const audio = getAlarmAudio();
            if(tableData[tableData.length-1].status != 'None') {
                console.log("Playing alarm audio")
                audio.play();
            }
        }
    }, [tableData]);
    
    return (<>
    {props.children}
    </>);
}