let alarmAudio: HTMLAudioElement = null;

export function getAlarmAudio() {
    if(alarmAudio == undefined || alarmAudio == null) {
        alarmAudio = new Audio('/alarm_sound.wav');
    }
    return alarmAudio;
}

export default async function playAudio(audio: HTMLAudioElement) {
    audio.play();
}