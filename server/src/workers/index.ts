import { config } from "@/config";

let requestToken = config.queue.maxRequestToken;

function scheduleTokenRegeneration() {
    setInterval(
        () => {
            requestToken = Math.min(
                requestToken + config.queue.regenerationSpeed,
                config.queue.maxRequestToken
            );
        },
        config.queue.regenerationInterval
    )
}

