# Sealed Backend

## Start development API

1. Copy `.env.example` to `.env`
2. Install packages:
   - `npm install`
3. Run backend:
   - `npm run dev`

Default API: `http://localhost:4601`

## Hardhat local chain (real on-chain anchoring)

1. Start local chain:
   - `npm run chain`
2. Deploy contract (new terminal):
   - `npm run chain:deploy`
3. Copy deployed address into `.env`:
   - `HARDHAT_CONTRACT_ADDRESS=<deployed_address>`
4. Set chain mode:
   - `SEALED_CHAIN_MODE=hardhat`
5. Use one funded Hardhat account private key:
   - `HARDHAT_PRIVATE_KEY=<hardhat_node_account_private_key>`
6. Start backend:
   - `npm run dev`

## Implemented endpoints (Part 2 foundation)

- `POST /api/events/warranty` (signed ingest from Snovia)
- `POST /api/portal/otp/request`
- `POST /api/portal/otp/verify`
- `GET /api/portal/warranties` (Bearer session token)
- `GET /api/portal/warranties/:warrantyId/verify` (Bearer session token)

## Sealed Problems (auto-captured errors)

Use this while building Sealed:

1. Start problems server:
   - `npm run problems`
2. Open dashboard:
   - [http://localhost:4600](http://localhost:4600)
3. Auto-log API:
   - `POST /api/problems`

