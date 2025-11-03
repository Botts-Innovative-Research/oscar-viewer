export class LiveVideoError extends Error {
    constructor(message: string | undefined) {
        super(message);
        this.name = "LiveVideoError";
    }
}

export class DataStreamError extends Error {
    constructor(message: string | undefined) {
        super(message);
        this.name = "DataStreamError";
    }
}