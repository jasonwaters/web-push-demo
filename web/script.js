(function (win) {
  const urlB64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }

  function getDeviceId() {
    return localforage.getItem("deviceId").then((deviceId) => {
      if (!deviceId) {
        deviceId = uuidv4();
        localforage.setItem("deviceId", deviceId);
      }

      const browserName = new UAParser().getBrowser().name;
      return `${browserName}-${deviceId}`;
    });
  }
  function getVapidPublicKey(keyValue) {
    return fetch("/api/key", { method: "get" })
      .then((res) => res.json())
      .then((json) => {
        const { key } = json;
        localStorage.setItem("pushPublicKey", key);
        return key;
      });
  }

  let vapidPublicKey = "";

  const hasServiceWorkerSupport = () =>
    "serviceWorker" in navigator && "PushManager" in window;

  const registerServiceWorker = () => {
    return navigator.serviceWorker.register("service.js");
  };

  function registerPushNotifications() {
    return navigator.serviceWorker.ready.then((registration) => {
      return registration.pushManager
        .getSubscription()
        .then((subscription) => {
          if (subscription) {
            return subscription;
          }

          if (!vapidPublicKey || vapidPublicKey.length === 0) {
            return Promise.reject("Missing vapidPublicKey!");
          }

          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
          });
        })
        .then((subscription) => {
          getDeviceId().then((deviceId) => {
            return fetch("/api/save-subscription", {
              method: "post",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                deviceId,
                subscription,
              }),
            });
          });

          return subscription;
        });
    });
  }

  const hasNotifyPermissionAlready = () => {
    if (!("Notification" in window)) {
      return false;
    }

    return Notification.permission === "granted";
  };

  const obtainNotifyPermission = () => {
    if (!("Notification" in window)) {
      return Promise.reject("Notifications not supported");
    }

    //previously granted
    if (Notification.permission === "granted") {
      return Promise.resolve("granted");
    }

    //previously denied, don't ask again
    if (Notification.permission === "denied") {
      return Promise.reject("denied");
    }

    //ask permission
    return window.Notification.requestPermission();
  };

  function showLocalNotification(title, body, options = {}, registration) {
    registration.showNotification(title, {
      ...options,
      body,
    });
  }

  function noop() {
    return undefined;
  }

  function noopPromise() {
    return Promise.resolve();
  }

  function unregisterServiceWorkers() {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then((unregistered) => {
          console.log(unregistered);
        });
      });
    });
  }

  async function init() {
    if (hasServiceWorkerSupport()) {
      return registerServiceWorker().then((registration) => {
        navigator.serviceWorker.addEventListener("message", (evt) => {
          console.log(
            `service worker send page a message: ${evt.data.message}`
          );
        });

        registerPushNotifications();
        win.alloyMessaging.notify = (title, body, options = {}) =>
          showLocalNotification(title, body, options, registration);
      });
    }

    return Promise.reject("Service worker unsupported");
  }

  win.alloyMessaging = {
    hasNotifyPermissionAlready: hasNotifyPermissionAlready,
    obtainNotifyPermission: () => {
      return obtainNotifyPermission()
        .then((permission) => {
          if (permission === "granted") {
            return init();
          }
        })
        .catch((err) => {
          console.log(`obtainNotifyPermission Error`, err);
        });
    },
    notify: noop,
    configure,
  };

  function configure(options) {
    return getVapidPublicKey(options.vapidPublicKey)
      .then((key) => {
        vapidPublicKey = key;
      })
      .then(() => {
        if (hasNotifyPermissionAlready()) {
          return init();
        }
      });
  }
})(window);
