# Shirt Design Tool - Project Manifest

## Architecture Overview
- **Framework:** React with Tailwind CSS
- **Canvas Engine:** Fabric.js
- **State Management:** React Context (`DesignProvider`)

## Shared State Schema (`DesignProvider`)
The standard single source of truth for the application state. Both agents will read from and write to this state using provided React Context hooks, but will not modify the provider's definition file itself after its initial creation.

```typescript
// /src/context/DesignContext.tsx

export type QuoteStatus = 'draft' | 'pending' | 'sent';
export type ShirtType = 't-shirt' | 'hoodie' | 'long-sleeve';

export interface ShirtDetails {
  color: string;
  type: ShirtType;
  dimensions: { 
    width: number; 
    height: number; 
  }; // Defines the physical constraints of the printable area
}

export interface UserSession {
  email: string | null;
  quoteStatus: QuoteStatus;
}

export interface SharedState {
  currentShirt: ShirtDetails;
  canvasObjects: Record<string, any>[]; // Fabric.js serialized JSON objects
  userSession: UserSession;
}
```

---

## Agent Responsibilities & Write Boundaries
To ensure clean collaboration, each agent is restricted to specific file paths. They have zero overlapping write permissions.

### Agent A: UI/Canvas Specialist
**Allowed Write Directories:** 
- `/src/components/canvas/*`

**Responsibilities:**
- Build the interactive workspace canvas using Fabric.js.
- Implement UI controls for image uploads, drag/drop features, resizing, and rotation.
- **Constraints Implementation:** Enforce boundary checks so that designs strictly remain within the defined "printable area" overlay (based on `currentShirt.dimensions`).

### Agent B: Export/Logic Specialist
**Allowed Write Directories:** 
- `/src/utils/export/*`
- `/src/api/quote/*`

**Responsibilities:**
- Create the high-resolution export utility.
- **Image Generation Logic:** Convert the HTML5/Fabric.js canvas state into a high-quality 300 DPI PNG, packaging it alongside the user's session metadata.
- **Save Feature Engine:** Implement the export state serialization to save the current progress as a non-renderable `.json` file that users can download and securely re-upload later to restore their canvas session.
- **Mock Backend Route:** Set up the `/api/quote` endpoint.

---

## Backend Route / API Endpoints

### `POST /api/quote`
- **Location:** `/src/api/quote/route.ts` (or equivalent depending on specific routing framework like Next.js API routes)
- **Purpose:** Serve as a mock backend endpoint to trigger SendGrid emails containing the user's quote request.
- **Payload Expectation:**
  ```json
  {
    "userEmail": "user@example.com",
    "designImage": "data:image/png;base64,...",
    "designMetadata": {
      "shirtType": "t-shirt",
      "shirtColor": "#ffffff",
      "designJson": "[...]"
    }
  }
  ```
- **Response:** `200 OK` on successful mock trigger, updating the `quoteStatus` in the user's session to `'sent'`.
