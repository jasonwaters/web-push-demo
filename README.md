Web Push Demo
====================
This repository contains a basic demo for web push.

## Running the code
1. Clone the repo
2. `npm install`
3. Install mkcert so https works (see [Help](#help) section below)
4. Create the environment 
   1. Copy `.env.template` to `.env`
   2. [Generate VAPID keys](#generate-vapid-keys) and set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in the `.env` file
   3. Set `VAPID_SUBJECT` to `mailto:` your email address
5. `npm run start`
6. Point your browser to https://localhost
7. Grant permission for notifications
8. Send a notification (see [APIs](#apis) below)


## APIs

### Get the VAPID public key

```bash
curl --location 'https://localhost/api/key'
```

### View subscription objects

```bash
curl --location 'https://localhost/api/subscriptions'
```

### Send a notification
```bash
curl --location 'https://localhost/api/send-notification' \
--header 'Content-Type: application/json' \
--data '{
    "title": "Flash sale",
    "message": "Don'\''t miss out!",
    "url": "/"
}'
```

## Help

### Install mkcert

1. Follow the readme to install [mkcert](https://github.com/FiloSottile/mkcert#mkcert) on your computer.
2. Once installed, run `mkcert -install` to install the mkcert root certificate.

### Generate VAPID keys

1. Install the web-push cli `npm i -g web-push`
2. Generate keys `web-push generate-vapid-keys`
