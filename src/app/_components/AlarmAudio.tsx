import {selectTriggeredAlarm, setAlarmTrigger} from "@/lib/state/EventDataSlice";
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

    const triggerAlarm = useSelector((state: RootState) => selectTriggeredAlarm(state))
    const [volumeValue, setVolumeValue] = useState(savedVolume)

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
        if (triggerAlarm) {
            const audio = getAlarmAudio();
            audio.volume = savedVolume / 100;
            audio.play();
            dispatch(setAlarmTrigger(false));
        }
    }, [triggerAlarm, volumeValue]);

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