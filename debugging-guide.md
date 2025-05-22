# Real-Time Friend Request Debugging Guide

## 🔍 Testing Steps

### 1. Open Browser Developer Console
- Open Chrome/Firefox Developer Tools (F12)
- Go to the Console tab
- Look for logs prefixed with `🔄 [REALTIME]` and `🔌 [SUPABASE]`

### 2. Login and Check Initial Setup
Look for these logs:
```
🔌 [SUPABASE] Auth event: INITIAL_SESSION, hasSession: true
[FriendsStore] User logged in or changed, refreshing friends data and starting realtime.
🔄 [REALTIME] Starting friend request subscriptions for user: [USER_ID] (attempt 1)
🔄 [REALTIME] Setting auth token for realtime connection
🔄 [REALTIME] Session details: { hasSession: true, hasAccessToken: true, userId: [USER_ID] }
🔄 [REALTIME] Auth token set successfully
🔄 [REALTIME] Setting up INSERT subscription with filter: friend_id=eq.[USER_ID]
🔄 [REALTIME] Subscription status changed: { status: 'SUBSCRIBED', error: null }
🔄 [REALTIME] Friend requests subscription active
🔄 [REALTIME] All subscriptions started successfully
```

### 3. Test Sending a Friend Request (From Another User)
**From User A (sender):**
1. Go to Add Friends tab
2. Search for User B's username
3. Click "Add Friend"

Look for this log:
```
🔄 [SEND_REQUEST] Inserting friend request: { user_id: "[USER_A_ID]", friend_id: "[USER_B_ID]", status: "pending" }
🔄 [SEND_REQUEST] Friend request inserted successfully: [INSERT_RESULT]
```

**On User B's side (receiver):**
Look for these logs:
```
🔄 [REALTIME] New friend request received: [PAYLOAD]
🔄 [REALTIME] Payload details: { event: "INSERT", table: "friendships", new: {...}, schema: "public" }
🔄 [REALTIME] Processing new friend request from: [USER_A_ID]
🔄 [REALTIME] Profile query result: { senderProfile: {...}, error: null, hasData: true }
🔄 [REALTIME] Adding new request to state: { id: "...", from: { id: "...", username: "..." }, status: "pending" }
🔄 [REALTIME] Updated friend requests state: { previousCount: 0, newCount: 1, newRequest: {...} }
🔄 [REALTIME] Friend request processed successfully
```

### 4. Common Issues and Solutions

#### Issue: No real-time logs at all
**Check:**
- Is the user properly logged in?
- Are there any errors in the subscription setup?
- Check the real-time status indicator in the UI

#### Issue: Subscription connects but no INSERT events received
**Check:**
- Does the filter `friend_id=eq.[USER_ID]` match the inserted data?
- Are the RLS policies allowing the user to see the data?
- Is the INSERT actually happening? (Check the send request logs)

#### Issue: INSERT event received but handleNewFriendRequest fails
**Check:**
- Profile query errors: Look for "Error fetching sender profile"
- Type assertion issues
- Duplicate request checks

#### Issue: Friend request processed but UI doesn't update
**Check:**
- State update logs: "Updated friend requests state"
- React re-rendering issues
- Component subscription to the store

### 5. Manual Testing Commands

**Test the subscription filter:**
```javascript
// In browser console
console.log("Current user ID:", useAuthStore.getState().user?.id);
console.log("Friend requests:", useFriendsStore.getState().friendRequests);
console.log("Realtime status:", useFriendsStore.getState().realtimeStatus);
```

**Force refresh friend requests:**
```javascript
// In browser console
useFriendsStore.getState().refreshFriendRequests();
```

**Test notification:**
```javascript
// In browser console
import { toast } from "@/components/ui/use-toast";
toast({ title: 'Test', description: 'Testing notifications' });
```

### 6. Database Verification

If real-time isn't working, verify the data directly:

1. Go to Supabase Dashboard → Table Editor → friendships
2. Check if the friend request row was actually inserted
3. Verify the `user_id`, `friend_id`, and `status` values
4. Check if RLS policies allow the target user to see the row

### 7. Expected Timeline

1. **Immediate**: User A sends request → INSERT log appears
2. **< 2 seconds**: User B receives real-time event → Processing logs appear
3. **< 3 seconds**: User B's UI updates → Friend request appears in Requests tab
4. **Immediate**: Toast notification shows on User B's screen

---

## 🚨 Red Flags

- **No subscription logs**: Auth or connection issues
- **Subscription never reaches SUBSCRIBED**: Network or auth token issues  
- **INSERT event not received**: Filter or RLS policy issues
- **handleNewFriendRequest errors**: Profile query or state update issues
- **UI doesn't update**: React re-rendering or store subscription issues

---

## 🎯 Success Indicators

- ✅ Real-time status shows "Real-time active" with green icon
- ✅ Complete log chain from INSERT to UI update
- ✅ Toast notification appears immediately
- ✅ Friend request count badge updates instantly
- ✅ Friend request appears in Requests tab without refresh 