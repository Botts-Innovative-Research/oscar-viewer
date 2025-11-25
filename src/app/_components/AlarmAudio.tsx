import { selectTriggeredAlarm, setAlarmTrigger } from "@/lib/state/EventDataSlice";
import { RootState } from "@/lib/state/Store";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import {Alert} from "@mui/material";
import { selectAlarmAudioVolume } from "@/lib/state/OSCARClientSlice";

let alarmAudio: HTMLAudioElement | null = null;

export function getAlarmAudio() {
    if (!alarmAudio) {
        alarmAudio = new Audio("/alarm_sound.wav");
        alarmAudio.preload = "auto";  // preload for faster start
    }
    return alarmAudio;
}

export default function AlarmAudio() {
    const dispatch = useDispatch();
    const savedVolume = useSelector(selectAlarmAudioVolume);
    const triggerAlarm = useSelector((state: RootState) => selectTriggeredAlarm(state));
    const [soundLocked, setSoundLocked] = useState(true);


    useEffect(() => {
        const unlockAudio = () => {
            const audio = getAlarmAudio();
            audio.volume = savedVolume / 100;

            // attempt to play/pause immediately to unlock browser autoplay
            audio.play()
                .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    setSoundLocked(false);

                })
                .finally(() => {
                    document.removeEventListener("click", unlockAudio);
                });
        };

        document.addEventListener("click", unlockAudio);
        return () => document.removeEventListener("click", unlockAudio);
    }, [savedVolume]);



    useEffect(() => {
        if (triggerAlarm) {
            const audio = getAlarmAudio();
            audio.volume = savedVolume / 100;
            audio.play();
            dispatch(setAlarmTrigger(false));
        }
    }, [triggerAlarm, savedVolume, soundLocked]);

    return (
        <Box sx={{ width: 200, padding: 1 }}>

            {soundLocked && (
                <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
                    Click anywhere to enable alarm sound
                </Alert>
            )}

        </Box>
    );
}