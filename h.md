 Overview                                                                                                                                                                           │
│                                                                                                                                                                                    │
│ Split the 617-line monolithic useYellow.ts into focused modules, fix token decimals (6 not 18), implement off-chain game moves via Nitrolite App Sessions (no MetaMask popup per   │
│ click), and create a GridController bridge component.                                                                                                                              │
│                                                                                                                                                                                    │
│ ---                                                                                                                                                                                │
│ File Map                                                                                                                                                                           │
│                                                                                                                                                                                    │
│ New Files                                                                                                                                                                          │
│ ┌──────────────────────────────────────────┬─────────────────────────────────────────────────────────┐                                                                             │
│ │                   File                   │                         Purpose                         │                                                                             │
│ ├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                                                                             │
│ │ src/utils/tokenUtils.ts                  │ parseUSD()/formatUSD() helpers (6 decimals)             │                                                                             │
│ ├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                                                                             │
│ │ src/hooks/useNitroliteClient.ts          │ NitroliteClient init + WalletStateSigner                │                                                                             │
│ ├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                                                                             │
│ │ src/hooks/useChannelLifecycle.ts         │ deposit, createChannel, resize, close, forceClose       │                                                                             │
│ ├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                                                                             │
│ │ src/hooks/useGameSession.ts              │ App session create, submitGameMove, closeAppSession     │                                                                             │
│ ├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                                                                             │
│ │ src/components/canvas/GridController.tsx │ Bridge: cell clicks → game moves, asu → confirmed cells │                                                                             │
│ └──────────────────────────────────────────┴─────────────────────────────────────────────────────────┘                                                                             │
│ Modified Files                                                                                                                                                                     │
│ ┌──────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐                                        │
│ │                 File                 │                                             Changes                                              │                                        │
│ ├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤                                        │
│ │ src/utils/yellowConstants.ts         │ Add app session constants, USD_TOKEN_DECIMALS                                                    │                                        │
│ ├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤                                        │
│ │ src/utils/yellowTypes.ts             │ Add GameAppSession, GameMoveData, AppSessionUpdateNotification, MessageListener types            │                                        │
│ ├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤                                        │
│ │ src/hooks/useYellowSession.ts        │ Add subscribe/onMessage for asu notifications, expose sessionSigner/sendMessage/getNextRequestId │                                        │
│ ├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤                                        │
│ │ src/hooks/useYellow.ts               │ Gut to ~120 line thin orchestrator composing sub-hooks                                           │                                        │
│ ├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤                                        │
│ │ src/app/game/page.tsx                │ Wire GridController, replace sendPayment with submitGameMove, add app session create/close       │                                        │
│ ├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤                                        │
│ │ src/components/canvas/GameEngine.tsx │ Accept confirmedCells/pendingCells props, pass to canvas                                         │                                        │
│ ├──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤                                        │
│ │ src/components/YellowPayment.tsx     │ Update balance display from /1e18 to formatUSD(), remove sendPayment usage                       │                                        │
│ └──────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘                                        │
│ ---                                                                                                                                                                                │
│ Implementation Order                                                                                                                                                               │
│                                                                                                                                                                                    │
│ Phase 1: Foundation (no behavioral changes)                                                                                                                                        │
│                                                                                                                                                                                    │
│ Step 1: src/utils/tokenUtils.ts (NEW)                                                                                                                                              │
│                                                                                                                                                                                    │
│ parseUSD(amount: string): bigint   → parseUnits(amount, 6)                                                                                                                         │
│ formatUSD(amount: bigint): string  → formatUnits(amount, 6)                                                                                                                        │
│ USD_DECIMALS = 6                                                                                                                                                                   │
│                                                                                                                                                                                    │
│ Step 2: src/utils/yellowConstants.ts (ADD)                                                                                                                                         │
│                                                                                                                                                                                    │
│ GAME_APP_NAME = 'pixel-mania'                                                                                                                                                      │
│ GAME_APP_PROTOCOL = 'NitroRPC/0.4'                                                                                                                                                 │
│ GAME_APP_CHALLENGE_DURATION = 3600                                                                                                                                                 │
│ GAME_APP_QUORUM = 2                                                                                                                                                                │
│ APP_SESSION_UPDATE_TIMEOUT = 15000                                                                                                                                                 │
│ USD_TOKEN_DECIMALS = 6                                                                                                                                                             │
│                                                                                                                                                                                    │
│ Step 3: src/utils/yellowTypes.ts (ADD)                                                                                                                                             │
│                                                                                                                                                                                    │
│ New types (additive, nothing removed):                                                                                                                                             │
│ - GameAppSession — tracks app session ID, channelId, version, participants, allocations, status                                                                                    │
│ - AppSessionAllocation — { asset, amount, participant }                                                                                                                            │
│ - AppSessionUpdateNotification — parsed asu notification with appSessionId, version, sessionData, participantAllocations                                                           │
│ - GameMoveData — { cellId, targetPrice, betAmount, multiplier, pythPriceId, timestamp }                                                                                            │
│ - MessageListener — (method: string, params: any) => void                                                                                                                          │
│                                                                                                                                                                                    │
│ Phase 2: Extract hooks                                                                                                                                                             │
│                                                                                                                                                                                    │
│ Step 4: src/hooks/useNitroliteClient.ts (NEW)                                                                                                                                      │
│                                                                                                                                                                                    │
│ Extract from useYellow.ts lines 35-56:                                                                                                                                             │
│ - useMemo creating NitroliteClient with WalletStateSigner                                                                                                                          │
│ - Returns: { nitroliteClient, walletClient, isWalletClientLoading, hasWalletClient }                                                                                               │
│                                                                                                                                                                                    │
│ Step 5: src/hooks/useChannelLifecycle.ts (NEW)                                                                                                                                     │
│                                                                                                                                                                                    │
│ Extract from useYellow.ts:                                                                                                                                                         │
│ - depositFunds (lines 96-125) — fix: parseUSD() instead of parseEther(), use BASE_MAINNET_USD_TOKEN not ETH_TOKEN_ADDRESS                                                           │
│ - createPaymentChannel (lines 128-306) — fix: parseUSD() for deposit amount                                                                                                        │
│ - closeChannel (lines 353-433) — fix: build proper FinalState with channelId + serverSignature inside it, pass stateData at top level of CloseChannelParams                        │
│ - forceCloseChannelById (lines 436-556) — same stateData fix                                                                                                                       │
│ - resetChannel (lines 558-562)                                                                                                                                                     │
│                                                                                                                                                                                    │
│ Takes as props: { nitroliteClient, yellowSession, addMessage }                                                                                                                     │
│ Returns: { channel, setChannel, isProcessing, depositFunds, createPaymentChannel, closeChannel, forceCloseChannelById, resetChannel }                                              │
│                                                                                                                                                                                    │
│ Critical closeChannel fix:                                                                                                                                                         │
│ const finalState = {                                                                                                                                                               │
│   channelId: channel.channelId,           // FinalState requires this                                                                                                              │
│   serverSignature: closeData.server_signature, // FinalState requires this                                                                                                         │
│   intent: closeData.state.intent as Hex,                                                                                                                                           │
│   version: BigInt(closeData.state.version),                                                                                                                                        │
│   data: stateData as Hex,                                                                                                                                                          │
│   allocations: [...mapped with BigInt...],                                                                                                                                         │
│ };                                                                                                                                                                                 │
│ await nitroliteClient.closeChannel({                                                                                                                                               │
│   finalState,                                                                                                                                                                      │
│   stateData: stateData as Hex,  // Also at top level                                                                                                                               │
│ });                                                                                                                                                                                │
│                                                                                                                                                                                    │
│ Step 6: src/hooks/useYellowSession.ts (MODIFY)                                                                                                                                     │
│                                                                                                                                                                                    │
│ Additive changes only:                                                                                                                                                             │
│ 1. Add messageListenersRef = useRef<Set<MessageListener>>(new Set())                                                                                                               │
│ 2. In ws.onmessage, after existing cu block, add asu handling:                                                                                                                     │
│   - Parse response, call all listeners with ('asu', params)                                                                                                                        │
│ 3. Add subscribe(listener) → returns unsubscribe function                                                                                                                          │
│ 4. Expose in return: subscribe, sessionSigner: sessionSignerRef.current, sendMessage, getNextRequestId: () => requestIdCounterRef.current++                                        │
│                                                                                                                                                                                    │
│ Step 7: src/hooks/useGameSession.ts (NEW)                                                                                                                                          │
│                                                                                                                                                                                    │
│ Core off-chain game move hook using SDK App Session API:                                                                                                                           │
│                                                                                                                                                                                    │
│ createAppSession(initialBetAmount, clearnodeAddress):                                                                                                                              │
│ - Uses createAppSessionMessage(sessionSigner, { definition, allocations }, requestId)                                                                                              │
│ - definition: { application: GAME_APP_NAME, protocol: NitroRPC_0_4, participants: [player, clearnode], weights: [1,1], quorum: 2, challenge: 3600 }                                │
│ - Allocations use parseUSD() with BASE_MAINNET_USD_TOKEN                                                                                                                            │
│ - Sends via yellowSession.sendMessage()                                                                                                                                            │
│ - Returns GameAppSession                                                                                                                                                           │
│                                                                                                                                                                                    │
│ submitGameMove(moveData, newAllocations):                                                                                                                                          │
│ - Increments version via useRef counter                                                                                                                                            │
│ - Builds SubmitAppStateRequestParamsV04: { app_session_id, intent: RPCAppStateIntent.Operate, version, allocations, session_data: JSON.stringify(moveData) }                       │
│ - moveData.session_data includes pythPriceId for price provenance                                                                                                                  │
│ - Uses createSubmitAppStateMessage(sessionSigner, params, requestId) — session key, NO MetaMask popup                                                                              │
│ - Sends via WebSocket, updates state optimistically                                                                                                                                │
│                                                                                                                                                                                    │
│ closeAppSession(finalAllocations):                                                                                                                                                 │
│ - Uses createCloseAppSessionMessage(sessionSigner, { app_session_id, allocations, session_data })                                                                                  │
│ - Sends via WebSocket                                                                                                                                                              │
│                                                                                                                                                                                    │
│ asu listener:                                                                                                                                                                      │
│ - useEffect subscribes via yellowSession.subscribe                                                                                                                                 │
│ - On matching asu notification, updates appSession version and allocations                                                                                                         │
│                                                                                                                                                                                    │
│ Takes: { yellowSession, channelId, addMessage }                                                                                                                                    │
│ Returns: { appSession, isSubmitting, createAppSession, submitGameMove, closeAppSession }                                                                                           │
│                                                                                                                                                                                    │
│ Step 8: src/hooks/useYellow.ts (REWRITE → ~120 lines)                                                                                                                              │
│                                                                                                                                                                                    │
│ Thin orchestrator composing:                                                                                                                                                       │
│ - useNitroliteClient() → nitroliteClient, wallet info                                                                                                                              │
│ - useYellowSession() → WebSocket session                                                                                                                                           │
│ - useChannelLifecycle({ nitroliteClient, yellowSession, addMessage }) → channel ops                                                                                                │
│ - useGameSession({ yellowSession, channelId, addMessage }) → game moves                                                                                                            │
│                                                                                                                                                                                    │
│ Handles: wallet state, chain switching, disconnect, error/message aggregation, log merging.                                                                                        │
│                                                                                                                                                                                    │
│ Returns same shape as before PLUS: appSession, isSubmitting, createAppSession, submitGameMove, closeAppSession. Removes: sendPayment.                                              │
│                                                                                                                                                                                    │
│ Phase 3: Wire game moves                                                                                                                                                           │
│                                                                                                                                                                                    │
│ Step 9: src/components/canvas/GridController.tsx (NEW)                                                                                                                             │
│                                                                                                                                                                                    │
│ useGridController hook:                                                                                                                                                            │
│ - Takes: { submitGameMove, appSession, yellowSession, selectedAsset, currentPrice, playerAddress }                                                                                 │
│ - Subscribes to asu notifications → marks cells as confirmed (Mint Green #B2FF9E)                                                                                                  │
│ - handleCellClick(cellId, targetPrice, betAmount, multiplier):                                                                                                                     │
│   - Builds GameMoveData with getPythId(selectedAsset) for price provenance                                                                                                         │
│   - Calculates new allocations (player - bet, clearnode + bet)                                                                                                                     │
│   - Marks cell pending, calls submitGameMove()                                                                                                                                     │
│ - Returns: { handleCellClick, confirmedCells, pendingCells, isCellConfirmed, isCellPending }                                                                                       │
│                                                                                                                                                                                    │
│ Step 10: src/app/game/page.tsx (MODIFY)                                                                                                                                            │
│                                                                                                                                                                                    │
│ - Import useGridController                                                                                                                                                         │
│ - handlePlaceBet: call gridController.handleCellClick() instead of sendPayment()                                                                                                   │
│ - startSession: after channel creation, call createAppSession() with clearnode address from channel participants                                                                   │
│ - endSession: call closeAppSession() before closeChannel()                                                                                                                         │
│ - Pass confirmedCells/pendingCells to GameEngine                                                                                                                                   │
│ - Update balance display: formatUSD() instead of / 1e18                                                                                                                            │
│                                                                                                                                                                                    │
│ Step 11: src/components/canvas/GameEngine.tsx (MODIFY)                                                                                                                             │
│                                                                                                                                                                                    │
│ - Add confirmedCells? and pendingCells? to GameEngineProps                                                                                                                         │
│ - Pass through to GameCanvas                                                                                                                                                       │
│                                                                                                                                                                                    │
│ Step 12: src/components/YellowPayment.tsx (MODIFY)                                                                                                                                 │
│                                                                                                                                                                                    │
│ - Balance display: formatUSD(channel.allocations[0]) instead of (Number(channel.allocations[0]) / 1e18).toFixed(6)                                                                 │
│ - Remove sendPayment from destructured useYellow() return                                                                                                                          │
│                                                                                                                                                                                    │
│ ---                                                                                                                                                                                │
│ Key SDK Functions Used                                                                                                                                                             │
│                                                                                                                                                                                    │
│ From @erc7824/nitrolite v0.5.3:                                                                                                                                                    │
│ ┌───────────────────────────────────────────┬────────────────────────────────┬────────────────────────────────────┐                                                                │
│ │                 Function                  │            Purpose             │               Signer               │                                                                │
│ ├───────────────────────────────────────────┼────────────────────────────────┼────────────────────────────────────┤                                                                │
│ │ createAppSessionMessage                   │ Create game session in channel │ Session key (no popup)             │                                                                │
│ ├───────────────────────────────────────────┼────────────────────────────────┼────────────────────────────────────┤                                                                │
│ │ createSubmitAppStateMessage<NitroRPC_0_4> │ Submit game move               │ Session key (no popup)             │                                                                │
│ ├───────────────────────────────────────────┼────────────────────────────────┼────────────────────────────────────┤                                                                │
│ │ createCloseAppSessionMessage              │ Close game session             │ Session key (no popup)             │                                                                │
│ ├───────────────────────────────────────────┼────────────────────────────────┼────────────────────────────────────┤                                                                │
│ │ createCreateChannelMessage                │ Create L1 channel              │ Session key (no popup)             │                                                                │
│ ├───────────────────────────────────────────┼────────────────────────────────┼────────────────────────────────────┤                                                                │
│ │ createCloseChannelMessage                 │ Request close state            │ Session key (no popup)             │                                                                │
│ ├───────────────────────────────────────────┼────────────────────────────────┼────────────────────────────────────┤                                                                │
│ │ nitroliteClient.closeChannel()            │ Submit close on-chain          │ Wallet (MetaMask popup — expected) │                                                                │
│ ├───────────────────────────────────────────┼────────────────────────────────┼────────────────────────────────────┤                                                                │
│ │ nitroliteClient.deposit()                 │ Deposit on-chain               │ Wallet (MetaMask popup — expected) │                                                                │
│ └───────────────────────────────────────────┴────────────────────────────────┴────────────────────────────────────┘                                                                │
│ Game Move Data Flow                                                                                                                                                                │
│                                                                                                                                                                                    │
│ Player clicks grid cell                                                                                                                                                            │
│   → GameEngine.handlePlaceBet()                                                                                                                                                    │
│     → GamePage.handlePlaceBet()                                                                                                                                                    │
│       → GridController.handleCellClick(cellId, targetPrice, amount, multiplier)                                                                                                    │
│         → Mark cell as pending                                                                                                                                                     │
│         → Build GameMoveData { cellId, targetPrice, betAmount, multiplier, pythPriceId, timestamp }                                                                                │
│         → useGameSession.submitGameMove(moveData, newAllocations)                                                                                                                  │
│           → version++                                                                                                                                                              │
│           → createSubmitAppStateMessage(sessionSigner, {                                                                                                                           │
│               app_session_id, intent: "operate", version,                                                                                                                          │
│               allocations: [{player: balance-bet}, {clearnode: balance+bet}],                                                                                                      │
│               session_data: JSON.stringify(moveData)  // includes pythPriceId                                                                                                      │
│             })                                                                                                                                                                     │
│           → Send over WebSocket (session key signs — no MetaMask popup)                                                                                                            │
│           → Clearnode validates & responds                                                                                                                                         │
│           → Clearnode broadcasts 'asu' notification                                                                                                                                │
│             → useYellowSession.onmessage routes to listeners                                                                                                                       │
│               → GridController marks cell as confirmed (#B2FF9E)                                                                                                                   │
│               → useGameSession updates appSession version                                                                                                                          │
│                                                                                                                                                                                    │
│ Close Session Flow                                                                                                                                                                 │
│                                                                                                                                                                                    │
│ Player clicks "End Session"                                                                                                                                                        │
│   → GamePage.endSession()                                                                                                                                                          │
│     → useGameSession.closeAppSession(finalAllocations)                                                                                                                             │
│       → createCloseAppSessionMessage(sessionSigner, { app_session_id, allocations })                                                                                               │
│       → Send over WebSocket                                                                                                                                                        │
│     → useChannelLifecycle.closeChannel()                                                                                                                                           │
│       → yellowSession.closeChannel(channelId, address)  // get signed final state                                                                                                  │
│       → nitroliteClient.closeChannel({                                                                                                                                             │
│           finalState: { channelId, serverSignature, intent, version, data: stateData, allocations },                                                                               │
│           stateData   // also at top level                                                                                                                                         │
│         })                                                                                                                                                                         │
│       → MetaMask popup for on-chain TX (expected for close)                                                                                                                        │
│     → Reset state, set sessionActive = false                                                                                                                                       │
│                                                                                                                                                                                    │
│ Verification                                                                                                                                                                       │
│                                                                                                                                                                                    │
│ 1. Build check: npm run build — no TypeScript errors                                                                                                                               │
│ 2. Token decimals: Console log in depositFunds should show $1.00 = 1000000n not 1000000000000000000n                                                                               │
│ 3. No MetaMask per click: Place a bet by clicking grid cell — should NOT trigger MetaMask popup. Only channel create/close should popup.                                           │
│ 4. Console logs:                                                                                                                                                                   │
│   - [Pyth Service] Fetching price for ID: 0xff61... (ETH)                                                                                                                          │
│   - [Pyth Hermes] Live Price Update: { asset: "ETH", price: 2320.41 }                                                                                                              │
│   - Submitting move v1: col3_row5                                                                                                                                                  │
│   - Confirmed state v1 (from asu notification)                                                                                                                                     │
│ 5. Grid visual: Confirmed cells render with Mint Green (#B2FF9E) solid fill                                                                                                        │
│ 6. Close flow: End session → app session closes → channel closes on-chain → MetaMask popup → TX confirmed                                                                          │
│                                                                                                                                                                                    │
│ Risks & Fallbacks                                                                                                                                                                  │
│                                                                                                                                                                                    │
│ 1. Clearnode may not support create_app_session: If sandbox rejects, fall back to using createApplicationMessage() for generic app-level messages, or keep game moves as local     │
│ state updates with clearnode channel-level accounting only.                                                                                                                        │
│ 2. Token decimals: Need to verify BASE_MAINNET_USD_TOKEN is actually 6 decimals. Can check via getAssets RPC call at runtime. If 18 decimals, keep using parseEther.                │
│ 3. Clearnode address: Need to extract from channel participants (second participant). If not available, use get_config RPC to discover broker address.                             │
│ 4. Rapid clicks: If clearnode rejects out-of-order versions, add a move queue that processes one at a time.  



Nitrolite client initialized
[8:16:26 PM] Wallet connected: 0xde87...Ff74
[8:16:26 PM] Chain: Sepolia (ID: 11155111)
[8:16:26 PM] Nitrolite client initialized
[8:16:26 PM] Session key generated: 0xF3a17f6b...
[8:16:33 PM] Creating payment channel via Yellow Network...
[8:16:33 PM] Participants: 0xde87...Ff74 & 0xde87...Ff74
[8:16:33 PM] Depositing $0.000001 USD to custody...
[8:17:13 PM] Channel creation failed: Contract call simulation failed for function 'Failed to execute deposit on contract'