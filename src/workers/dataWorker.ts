/* eslint-disable no-restricted-globals */
// Worker: fetch and parse a large JSON off the main thread.
// Expects to receive a message with the URL to fetch (string).

self.addEventListener("message", async (ev) => {
    const url = ev.data;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

        // Parse JSON in the worker (off main thread)
        const json = await res.json();

        // Post result back to main thread. We send a small wrapper to indicate success.
        // Note: Transferable objects could be used for ArrayBuffers, but not needed here.
        // Keep the shape simple: { success: true, data }
        (self as unknown as Worker).postMessage({ success: true, data: json });
    } catch (err) {
        (self as unknown as Worker).postMessage({ success: false, error: String(err) });
    }
});

export { };
