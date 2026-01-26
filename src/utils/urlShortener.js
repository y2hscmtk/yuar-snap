export const shortenUrl = (longUrl) => {
    // is.gd and other shorteners reject localhost. Return original for dev.
    if (longUrl.includes('localhost') || longUrl.includes('127.0.0.1')) {
        console.info('Skipping URL shortening for localhost');
        return Promise.resolve(longUrl);
    }
    return new Promise((resolve) => {
        try {
            const callbackName = `isgd_${Date.now()}`;
            const script = document.createElement('script');

            // Define global callback
            window[callbackName] = (response) => {
                delete window[callbackName];
                document.body.removeChild(script);
                if (response && response.shorturl) {
                    resolve(response.shorturl);
                } else {
                    console.warn("Shortening failed", response);
                    resolve(longUrl); // Fallback
                }
            };

            // Error handling for script load
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                console.warn("Script load error for is.gd");
                resolve(longUrl);
            };

            // is.gd supports JSONP with callback
            script.src = `https://is.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(longUrl)}`;
            document.body.appendChild(script);

        } catch (e) {
            console.warn("Shortening setup failed", e);
            resolve(longUrl);
        }
    });
};
