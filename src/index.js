require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const https = require("https");
const webpush = require("web-push");
const path = require("path");

const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PORT } =
  process.env;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const subscriptions = {};
function sendNotification(deviceId, subscription, dataToSend = "") {
  return webpush
    .sendNotification(subscription, dataToSend)
    .then((res) => ({ deviceId, success: true }))
    .catch((err) => ({ deviceId, success: false }));
}

function storeSubscription(deviceId, subscription) {
  subscriptions[deviceId] = subscription;
}

function removeDeadSubscriptions(deviceIDs) {
  deviceIDs.forEach((deviceId) => delete subscriptions[deviceId]);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "../web")));

app.get("/", function (req, res) {
  res.send("Hello World");
});

app.post("/api/save-subscription", async (req, res) => {
  const { deviceId, subscription } = req.body;
  await storeSubscription(deviceId, subscription);
  res.json({ message: "success", deviceId, subscription });
});

app.post("/api/send-notification", async (req, res) => {
  const deviceIds = Object.keys(subscriptions);

  if (deviceIds.length === 0) {
    res.json({ message: "no subscriptions!" });
    return;
  }

  Promise.all(
    deviceIds.map((deviceId) =>
      sendNotification(
        deviceId,
        subscriptions[deviceId],
        JSON.stringify(req.body)
      )
    )
  ).then((results) => {
    const success = results.filter((result) => result.success === true).length;

    removeDeadSubscriptions(
      results
        .filter((result) => result.success === false)
        .map((result) => result.deviceId)
    );

    res.json({
      message: `message sent to ${success} of ${deviceIds.length} devices.`,
      results,
    });
  });
});

app.get("/api/subscriptions", (req, res) => {
  res.json({ subscriptions });
});

app.get("/api/key", (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

const httpsOptions = {
  key: fs.readFileSync("./ssl/key.pem"),
  cert: fs.readFileSync("./ssl/cert.pem"),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`https server running at port ${PORT}`);
});
