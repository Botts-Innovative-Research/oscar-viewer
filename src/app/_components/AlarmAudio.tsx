import { selectTriggeredAlarm, setAlarmTrigger } from "@/lib/state/EventDataSlice";
import { RootState } from "@/lib/state/Store";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import {Alert} from "@mui/material";
import { selectAlarmAudioVolume } from "@/lib/state/OSCARClientSlice";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {attemptMediaPlayback} from "@/lib/media/MediaPlayback";

let alarmAudio: HTMLAudioElement | null = null;

export function getAlarmAudio() {
    if (!alarmAudio) {
        alarmAudio = new Audio("/alarm_sound.wav");
        alarmAudio.preload = "auto";  // preload for faster start
    }
    return alarmAudio;
}

export default function AlarmAudio() {
    const {t} = useLanguage();
    const dispatch = useDispatch();
    const savedVolume = useSelector(selectAlarmAudioVolume);
    const triggerAlarm = useSelector((state: RootState) => selectTriggeredAlarm(state));
    const [soundLocked, setSoundLocked] = useState(true);


    useEffect(() => {
        if (!soundLocked) {
            return;
        }

        let unlockInFlight = false;

        const unlockAudio = async () => {
            if (unlockInFlight) {
                return;
            }

            unlockInFlight = true;
            const audio = getAlarmAudio();
            audio.volume = savedVolume / 100;

            const result = await attemptMediaPlayback(audio);
            if (result.status === "started") {
                audio.pause();
                audio.currentTime = 0;
                setSoundLocked(false);
                document.removeEventListener("click", unlockAudio);
            } else if (result.status === "failed") {
                console.error("Unable to initialize alarm audio", result.error);
            }

            unlockInFlight = false;
        };

        document.addEventListener("click", unlockAudio);
        return () => document.removeEventListener("click", unlockAudio);
    }, [savedVolume, soundLocked]);



    useEffect(() => {
        if (!triggerAlarm) {
            return;
        }

        if (soundLocked) {
            dispatch(setAlarmTrigger(false));
            return;
        }

        const audio = getAlarmAudio();
        audio.volume = savedVolume / 100;

        void attemptMediaPlayback(audio).then(result => {
            if (result.status === "blocked") {
                setSoundLocked(true);
            } else if (result.status === "failed") {
                console.error("Unable to play alarm audio", result.error);
            }
        }).finally(() => dispatch(setAlarmTrigger(false)));
    }, [triggerAlarm, savedVolume, soundLocked]);

    return (
        <Box sx={{ width: 200, padding: 1 }}>

            {soundLocked && (
                <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
                    {t('enableAlarmSound')}
                </Alert>
            )}

        </Box>
    );
}
