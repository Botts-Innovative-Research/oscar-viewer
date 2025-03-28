import { selectEventTableDataArray } from "@/lib/state/EventDataSlice";
import { RootState } from "@/lib/state/Store";
import { useEffect, useRef, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {Slider, Stack} from "@mui/material";
import {VolumeDown, VolumeUp} from "@mui/icons-material";
import * as React from "react";
import {selectAlarmAudioVolume, setAlarmAudioVolume} from "@/lib/state/OSCARClientSlice";


let alarmAudio: HTMLAudioElement = null;

export function getAlarmAudio() {
    if(alarmAudio === null) {
        alarmAudio = new Audio('/alarm_sound.wav');
    }
    return alarmAudio;
}

export async function playAudio(audio: HTMLAudioElement) {
    audio.play();
}

export default function AlarmAudio() {
    const dispatch = useDispatch();
    const savedVolume = useSelector(selectAlarmAudioVolume);
    const tableData = useSelector((state: RootState) => selectEventTableDataArray(state))
    const isLoaded = useRef(false);
    const [volumeValue, setVolumeValue] = useState(savedVolume)


    console.log("alarm audio", volumeValue, savedVolume);

    useEffect(() => {
        document.body.addEventListener("click", function() {
            if(alarmAudio == undefined || alarmAudio == null) {
                console.info("Alarm audio has been loaded.");
                console.info(getAlarmAudio());

                const audio = getAlarmAudio();
                audio.volume = savedVolume/100;
            }
        });
    }, [savedVolume]);


    const handleVolumeChange =(event: Event, newValue: number| number[]) =>{
        const volume = newValue as number;
        setVolumeValue(volume);
        dispatch(setAlarmAudioVolume(volume));
    }

    useEffect(() => {
        if(tableData != undefined && tableData.length > 0) {
            isLoaded.current = true;
        }
        if(isLoaded.current) {
            const audio = getAlarmAudio();
            if(tableData.length > 0 && tableData[tableData.length-1].status != 'None') {
                console.log("Playing alarm audio")
                audio.play();

            }
            audio.volume = volumeValue/100;

        }
    }, [tableData, volumeValue]);

    return (
        <Box sx={{width: 200, padding: 1}}>
            <Typography variant="body2" gutterBottom>
                Alarm Volume
            </Typography>

            <Stack spacing={2} direction="row" sx={{alignItems: 'center', mb: 1}}>
                <VolumeDown/>
                <Slider
                    aria-label="Volume"
                    value={volumeValue}
                    onChange={handleVolumeChange}
                    valueLabelDisplay="auto"
                    min={0}
                    max={100}/>
                <VolumeUp/>
            </Stack>
        </Box>
    );
}