# Admin ↔ AI Assistant ↔ User Communication Design

## Current Problem
Currently, when users need admin help, the system creates direct messages between users and admins. This creates contact lists and direct conversations.

## Desired Solution
All admin-user communication should flow through the AI Assistant as an intermediary:

```
User → AI Assistant → Admin (escalation notification)
User ← AI Assistant ← Admin (admin response)
```

## Implementation Plan

### 1. Message Routing System

Create a new table `admin_support_tickets` to track escalated conversations:

```sql
CREATE TABLE admin_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id),
    admin_id UUID REFERENCES profiles(user_id),
    status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT,
    original_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES admin_support_tickets(id),
    sender_type TEXT CHECK (sender_type IN ('user', 'admin', 'ai')),
    sender_id UUID REFERENCES profiles(user_id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- true for admin-only notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Message Flow

**When User Needs Help:**
1. User chats with AI Assistant (existing)
2. User says "connect to admin" or AI detects it can't help
3. System creates a support ticket
4. Admin gets notification with ticket details
5. Admin views ticket in admin panel (not in regular chat)

**When Admin Responds:**
1. Admin writes response in ticket interface
2. System stores message in `ticket_messages` with `sender_type='admin'`
3. AI Assistant receives the admin's response
4. AI Assistant relays message to user in their chat
5. User sees: "AI Assistant: [Admin Name] says: [message]"

**When User Replies:**
1. User continues chatting with AI Assistant
2. If ticket is still open, messages are added to ticket
3. Admin sees updates in ticket interface
4. Cycle continues until ticket is resolved

### 3. UI Changes Needed

**For Users:**
- No change - they always chat with AI Assistant
- AI Assistant shows when an admin is helping: "I've connected you with Admin [Name]. They'll help you through me."

**For Admins:**
- New "Support Tickets" section in admin panel
- Shows list of open tickets with user info
- Click ticket to see conversation history
- Reply interface to respond to users
- Can mark tickets as resolved
- Cannot directly message users in regular chat

### 4. Benefits

✅ Users never see admin contacts
✅ All support is centralized through AI Assistant
✅ Admins have dedicated support ticket interface
✅ Better tracking and analytics
✅ Can assign tickets to specific admins
✅ Can add internal notes admins can see but users can't
✅ Professional support workflow

## Alternative: Simpler Proxy Approach

If full ticketing system is too complex, we can use a simpler proxy approach:

1. Keep existing message system
2. All messages between users and admins have `via_ai_assistant=true` flag
3. When displaying messages:
   - User sees: "AI Assistant: Admin says: [message]"
   - Admin sees: "Support Request from [User]: [message]"
4. Messages are stored as user↔admin but displayed through AI Assistant interface

This is simpler but less feature-rich than the ticketing system.

## Recommendation

For a production system, I recommend the **full ticketing system** as it provides:
- Better organization
- Ticket status tracking
- Assignment capabilities
- Internal notes
- Analytics and reporting
- Professional support workflow

Would you like me to implement:
1. Full ticketing system (more work, better features)
2. Simple proxy approach (quick, basic features)
3. Hybrid approach (tickets for escalations, proxy for simple queries)
