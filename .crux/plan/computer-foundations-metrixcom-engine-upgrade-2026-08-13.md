# Computer Foundations & Metrixcom Engine Upgrade

This plan establishes the foundation for the "Computer" system inside Metrixcom. It focuses on architecture, secure pairing flows, permission management, and the "Metrixcom Engine" integration.

## Proposed Changes

### 1. Database Schema (Supabase)
- Create `user_devices` table to track paired computers (Local/Cloud).
- Create `computer_audit_logs` table for tracking actions.
- Create `computer_permissions` table for granular user-granted access.

### 2. Computer Hub UI
- Implement `src/routes/computer.tsx` (and update navigation).
- **Local Computer**: 
  - Connection states: Download, Pair, Connected, Disconnected.
  - Secure Pairing Flow: UI for generating short-lived pairing tokens.
  - Permission Management: Granular toggles (Read/Write/Terminal) with risk levels.
- **Cloud Computer**:
  - Provisioning UI (Start/Stop/Reset).
  - Persistence and isolated workspace management.

### 3. Desktop Companion Architecture
- Specification for the external application.
- Secure WebSocket/Realtime interface for command execution.
- Local validation of backend-signed permission tokens.

### 4. Metrixcom Engine Integration
- Update `src/lib/app-store.ts` to include Computer as a capability.
- Auto-routing: The engine detects if a task requires "Computer" access and prompts for permissions if missing.
- Execution Status: Real-time progress updates for terminal commands and file ops.

### 5. Security Layer
- Explicit user consent screens for sensitive operations.
- Audit trail for every command executed.
- Revocation system to instantly kill active sessions.

## Technical Details

- **Pairing**: Uses Supabase Realtime/Presence for handshake. Pairing code is a short-lived HMAC-signed challenge.
- **Commands**: Sent as signed payloads. Desktop Companion verifies the signature and checks local permission cache.
- **Audit**: Every action maps to an `execution_id` for traceability.

## Required from Athul

1. **Supabase Migration**: I will provide the SQL to create the required tables. You will need to run them in the SQL Editor.
2. **Desktop Companion**: This requires a separate Electron/Rust/Go application. I will provide the architecture spec, but the binary itself cannot be "built" and "shipped" entirely within the Lovable browser sandbox.
3. **Cloud Infrastructure**: Requires a compute provider (AWS/GCP/Fly.io). Lovable can manage the orchestration logic, but the instance hosting needs external configuration.
