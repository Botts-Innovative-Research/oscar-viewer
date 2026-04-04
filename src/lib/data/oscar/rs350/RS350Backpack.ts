
export interface IRS350StatusData {
    time: string;
    battery: number;
    scanMode: string;
    scanTimeout: number;
    analysisEnabled: boolean;
    linearCalibration: number[];
    compressedCalibration: number[];
}

export interface IRS350ForegroundData {
    time: string;
    duration: number;
    linearSpectrumCount: number;
    compressedSpectrumCount: number;
    linearSpectrumArray: number[];
    compressedSpectrumArray: number[];
    gammaGrossCount: number;
    neutronGrossCount: number;
    doseRate: number;
}

export interface IRS350BackgroundData {
    time: string;
    duration: number;
    linearSpectrumCount: number;
    compressedSpectrumCount: number;
    linearSpectrumArray: number[];
    compressedSpectrumArray: number[];
    gammaGrossCount: number;
    neutronGrossCount: number;
}

export interface IRS350AlarmData {
    time: string;
    duration: number;
    remark: string;
    measurementClass: string;
    alarmCategory: string;
    alarmDescription: string
}