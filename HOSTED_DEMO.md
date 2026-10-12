# Full-workflow hosted demonstration

This is a separate disposable demonstration, not the live restaurant service.
It runs the current frontend and API together, allowing phones, kitchen and cashier
screens to share orders. Use fictitious information and simulated payments only.
No CLYO system is contacted. No local database is uploaded.

## Deployment settings

Use a host supporting long-running Docker containers, with Node 24 supplied by
`Dockerfile.demo`. Build from the repository root. Select a free instance manually;
do not apply the existing `render.yaml`, which requests paid hosting and a disk.

Set private environment variables in the hosting dashboard:

- `APP_ORIGIN`: exact public HTTPS origin, without `/mida-restaurant/`.
  On Render this can be omitted because `RENDER_EXTERNAL_URL` is supplied.
- `MIDA_DEMO_OWNER_EMAIL`: your demonstration login email.
- `MIDA_DEMO_OWNER_PASSWORD`: a unique random password of at least 16 characters.
- `TRUST_PROXY_HOPS`: the host's documented number of reverse proxies (Render: 1).

Do not put the password in Git or share it publicly. The demo seeds the owner only
when that email does not exist; subsequent password changes use the app.
The SQLite demo database lives in the container's temporary directory. Restarts,
redeployments or free-host shutdowns may erase it. Never rely on this for real sales.

## First presentation setup

1. Open `https://YOUR-HOST/mida-restaurant/?surface=register&restaurant=braise-burger`.
2. Sign in with your configured demo account. Activate the pilot in Configuration
   using fictitious restaurant details, then open a cash session in Ma session.
3. Open the customer menu in a private browser or another phone:
   `https://YOUR-HOST/mida-restaurant/?restaurant=braise-burger`.
4. Place a sample pickup order, accept it in staff Commandes, prepare it in Cuisine,
   mark it ready, and record the simulated payment in Caisse.
5. In Documents, open the paid receipt and wait for its loyalty QR before printing.
   A kitchen preparation slip has no loyalty QR.
6. For separate staff devices, create demo staff accounts in Equipe with the
   appropriate roles. Customer and staff sessions should use separate browsers.

Deployment is not complete until the public health endpoint, login, order flow,
payment and loyalty receipt have been checked. Free hosting may need a warm-up
before presenting. Do not promise persistent data or uninterrupted availability.
