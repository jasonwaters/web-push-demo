// eslint-disable-next-line no-restricted-globals
importScripts("/localforage.min.js");
console.log("Hello from service worker");

/**
 * Installation takes place. An install event is always the first one sent to a service worker (this can be used to start the process of populating an IndexedDB, and caching site assets). During this step, the application is preparing to make everything available for use offline.
 * When the install handler completes, the service worker is considered installed. At this point a previous version of the service worker may be active and controlling open pages. Because we don't want two different versions of the same service worker running at the same time, the new version is not yet active.
 */
self.addEventListener("install", async () => {
  // This will be called only once when the service worker is activated.
  console.log("service worker install");
});

/**
 * Once all pages controlled by the old version of the service worker have closed, it's safe to retire the old version, and the newly installed service worker receives an activate event. The primary use of activate is to clean up resources used in previous versions of the service worker. The new service worker can call skipWaiting() to ask to be activated immediately without waiting for open pages to be closed. The new service worker will then receive activate immediately, and will take over any open pages.
 */
self.addEventListener("activate", async () => {
  console.log(`service worker activate`);
});

self.addEventListener("push", (event) => {
  return event.waitUntil(
    localforage.getItem("deviceId").then((deviceId) => {
      console.log(`the deviceId is ${deviceId}`);

      if (event.data) {
        const data = event.data.json();
        const { title = "Pushed", message = "Hello World" } = data;

        return self.registration.showNotification(title, {
          body: message,
          data,
        });
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const { url = "/" } = event.notification.data || {};
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          let client = clientList[0];

          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }

          client.postMessage({
            message: "howdy",
            data: event.notification.data,
          });
          return client.focus();
        }

        return clients.openWindow(url);
      })
  );
});

self.addEventListener("onmessage", (message) => {
  console.log(`service worker received message: ${message}`);
  self.postMessage("pong");
});
