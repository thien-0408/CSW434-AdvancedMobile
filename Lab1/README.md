# CSW434 ? Lab 1: Real-Time Group Chat

Student: **Nguy?n ??nh Thi?n** (`nguyendinhthien`).
Repository: https://github.com/thien-0408/CSW434-AdvancedMobile/tree/main/Lab1

## Contents

- `ChatApplication/`: React Native client, native Android/iOS projects and tests.
- `chat-server/`: Express / Socket.IO server and real-socket integration tests.
- `Lab1.pdf`: assignment requirements.
- `AdvancedMobile-Lab1.docx`: answer sheet, review, setup and verification results.
- The two PNG files: **provided requirement/reference images**, not execution screenshots from this submission.

## Run locally

Requires Node.js >=22.11, npm and an Android SDK/emulator (or macOS with Xcode for iOS). The Android project requests SDK 37 / Build Tools 37.0.0 and NDK 27.1.12297006. Retain the included Gradle wrapper.

Terminal 1, from `Lab1/chat-server`:

```powershell
npm ci
npm start
```

Terminal 2, from `Lab1/ChatApplication`:

```powershell
npm ci
npm start
```

Terminal 3, from `Lab1/ChatApplication`:

```powershell
npm run android
```

Launch a second emulator and run `npm run android -- --deviceId <adb-device-id>` for each device as needed. Use `adb devices` to find IDs. Both clients must reach the same backend. Android emulators use `http://10.0.2.2:3000`; configure `src/config.js` with the computer's LAN IP for physical devices on the same Wi-Fi. Permit local TCP port 3000 through the firewall if needed. The server supports `PORT`, but the client URL must match.

For iOS on macOS: run `bundle install` in `ChatApplication`, then `bundle exec pod install` in `ios`, then `npm run ios` from the app directory.

## Automated verification

From `ChatApplication`:

```powershell
npm test -- --runInBand
npm run lint
npx tsc --noEmit
```

From `chat-server`: `npm test` (Node test runner; actual local Socket.IO connections, not socket mocks).

## Review against Lab1.pdf

The sample already has both screens, blank-input checks, navigation, client message events, and server broadcasting to multiple clients. The copied submission keeps that scope and corrects the following:

1. **Join payload mismatch:** the sample sends `{userName}` but logs the whole object as a string. The server now validates, stores and logs the actual name.
2. **Socket lifecycle:** replace the module-level connection with a screen-owned socket; attach listeners before connecting, rejoin on reconnect and disconnect on leaving the group.
3. **Local name:** persist and restore the trimmed display name with AsyncStorage, rather than retaining it only in component state/navigation params.
4. **Message identity:** the server supplies sender, unique ID and timestamp. Distinguish senders by connection ID, even if display names match.
5. **UI reliability:** scroll to new messages, protect the composer with safe-area/keyboard handling, show connection errors and prevent blank/offline sends.
6. **Identity/assets:** use `nguyendinhthien` in app metadata and local storage; replace external portraits with participant initials. Keep generic framework/package identifiers and upstream license notices.

## Two-device acceptance checklist

1. Start the backend and two emulator instances.
2. Enter `nguyendinhthien` on A and a different name on B. Blank names must not navigate.
3. Send a message from A: both devices receive it once; it appears on A's right in teal and B's left in gray with sender and timestamp.
4. Reply from B and verify the inverse. Blank messages must not send.
5. Restart the app and verify the saved name is restored.
6. Restart the backend; verify status feedback, automatic rejoin and delivery of newly sent messages after reconnect.
7. Go back to Home and join again; check that messages are not duplicated. Test a long conversation and keyboard visibility.

## Limits and evidence

The automated checks run on this workstation. Android SDK/emulator is unavailable, so native build, keyboard behavior and two-emulator appearance still need the manual checklist above. The reference PNGs are preserved and clearly labeled in the answer sheet. They do not prove execution of the modified source.

Messages are in memory on connected clients only; the lab does not require persistent history, authentication, attachments or cloud deployment. Messages sent while a client is disconnected are not replayed. The open CORS / HTTP setup is for local lab development.
