export type MediaPlaybackStatus = "started" | "blocked" | "interrupted" | "failed";

export interface MediaPlaybackResult {
    status: MediaPlaybackStatus;
    error?: unknown;
}

function getErrorName(error: unknown): string | undefined {
    if (typeof error !== "object" || error === null || !("name" in error)) {
        return undefined;
    }

    return String((error as {name?: unknown}).name);
}

/**
 * Starts media without allowing browser autoplay policy rejections to become
 * unhandled promise rejections. Callers can offer a user-initiated fallback
 * when playback is blocked and still report unexpected media failures.
 */
export async function attemptMediaPlayback(
    media: Pick<HTMLMediaElement, "play">,
): Promise<MediaPlaybackResult> {
    try {
        await media.play();
        return {status: "started"};
    } catch (error) {
        const errorName = getErrorName(error);

        if (errorName === "NotAllowedError") {
            return {status: "blocked", error};
        }

        // Browsers use AbortError when a source changes or pause() interrupts
        // an in-flight play request. This is expected during component cleanup.
        if (errorName === "AbortError") {
            return {status: "interrupted", error};
        }

        return {status: "failed", error};
    }
}
