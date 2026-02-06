export const shortenUrl = (longUrl) => {
    // is.gd and other shorteners reject localhost. Return original for dev.
    if (longUrl.includes('localhost') || longUrl.includes('127.0.0.1')) {
        console.info('Skipping URL shortening for localhost');
        return Promise.resolve(longUrl);
    }
    return new Promise((resolve) => {
        let settled = false;
        let timeoutId;
        const callbackName = `isgd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const script = document.createElement('script');

        const cleanup = () => {
            delete window[callbackName];
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };

        const resolveOnce = (value) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(value);
        };

        try {
            // Define global callback
            window[callbackName] = (response) => {
                if (response && typeof response.shorturl === 'string' && response.shorturl.startsWith('http')) {
                    resolveOnce(response.shorturl);
                } else {
                    console.warn("Shortening failed", response);
                    resolveOnce(longUrl); // Fallback
                }
            };

            // Error handling for script load
            script.onerror = () => {
                console.warn("Script load error for is.gd");
                resolveOnce(longUrl);
            };

            timeoutId = window.setTimeout(() => {
                console.warn("is.gd timeout, fallback to original URL");
                resolveOnce(longUrl);
            }, 4000);

            script.async = true;
            // is.gd supports JSONP with callback
            script.src = `https://is.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(longUrl)}`;
            document.body.appendChild(script);

        } catch (e) {
            console.warn("Shortening setup failed", e);
            resolveOnce(longUrl);
        }
    });
};
