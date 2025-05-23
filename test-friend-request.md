# Friend Request Button State Implementation

## Overview
This implementation adds proper state management for friend request buttons to show when a request has been sent.

## Features Added

### 1. Store State Management
- Added `sentRequests: string[]` to track user IDs of pending sent requests
- Added `refreshSentRequests()` method to fetch current sent requests from database
- Updated auth subscription to refresh sent requests on login

### 2. UI State Changes
- **Before sending request**: Shows "Add Friend" with `UserPlus` icon and `outline` variant
- **After sending request**: Shows "Request Sent" with `UserCheck` icon and `secondary` variant
- Button becomes disabled when request is sent

### 3. Real-time Updates
- Updates sent request state when requests are accepted/declined
- Refreshes state on friendship status changes via real-time subscriptions

## How to Test

1. **Search for a user**: Go to Friends tab → Add Friends → Search for a username
2. **Send request**: Click "Add Friend" button
3. **Verify state change**: Button should change to "Request Sent" with checkmark icon
4. **Verify persistence**: Refresh page or navigate away and come back - state should persist
5. **Test acceptance**: Have the other user accept the request - button should disappear from search results

## Database Queries
- Sent requests are fetched from `friendships` table where `user_id = current_user_id` and `status = 'pending'`
- State updates automatically via real-time subscriptions and manual refresh calls

## Files Modified
1. `src/stores/friendsStore.ts` - Added state management and methods
2. `src/pages/Friends.tsx` - Updated UI logic for button states 