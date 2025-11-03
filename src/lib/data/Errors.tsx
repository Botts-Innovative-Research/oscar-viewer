export class LiveVideoError extends Error {
    constructor(message: string | undefined) {
        super(message);
        this.name = "LiveVideoError";
    }
}