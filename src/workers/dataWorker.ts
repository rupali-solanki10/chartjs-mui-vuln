/* eslint-disable no-restricted-globals */
// Worker with streaming, progress tracking, and timeout support

self.addEventListener("message", async (ev) => {
    const { url, timeout = 30000 } = ev.data;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "Accept-Encoding": "gzip, deflate, br",
            },
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const contentLength = res.headers.get("content-length");

        if (contentLength && res.body) {
            // Stream with progress tracking
            const total = parseInt(contentLength, 10);
            let loaded = 0;
            const reader = res.body.getReader();
            const chunks: Uint8Array[] = [];
            let lastProgress = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;

                // Report progress (throttle to every 5%)
                const progress = Math.min(Math.round((loaded / total) * 100), 99);
                if (progress - lastProgress >= 5) {
                    (self as unknown as Worker).postMessage({
                        type: "progress",
                        progress,
                    });
                    lastProgress = progress;
                }
            }

            // Combine chunks
            const combined = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                combined.set(chunk, position);
                position += chunk.length;
            }

            // Parse JSON
            const text = new TextDecoder("utf-8").decode(combined);
            const json = JSON.parse(text);

            (self as unknown as Worker).postMessage({
                success: true,
                data: json,
            });
        } else {
            // Fallback: no streaming
            const json = await res.json();
            (self as unknown as Worker).postMessage({
                success: true,
                data: json,
            });
        }
    } catch (err) {
        clearTimeout(timeoutId);
        const errorMsg = err instanceof Error ? err.message : String(err);
        (self as unknown as Worker).postMessage({
            success: false,
            error: errorMsg,
        });
    }
});

export { };
