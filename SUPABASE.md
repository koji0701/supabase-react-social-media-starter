# Supabase Setup

This document details the database structure and policies required for SupaSocial.

## Setup Database

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    weekly_count INTEGER DEFAULT 0 NOT NULL,
    streak_days INTEGER DEFAULT 0 NOT NULL,
    last_relapse TIMESTAMPTZ,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    friend_id UUID REFERENCES profiles(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
```

## Configure Security Policies

```sql
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable profile search for authenticated users" ON profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view friends' profiles" ON profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM friendships 
        WHERE ((user_id = auth.uid() AND friend_id = profiles.id AND status = 'accepted') 
            OR (user_id = profiles.id AND friend_id = auth.uid() AND status = 'accepted'))
    )
);

CREATE POLICY "Users can view own friendships" ON friendships FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Users can create friendship requests" ON friendships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update received friendship requests" ON friendships FOR UPDATE USING (friend_id = auth.uid());
CREATE POLICY "Users can delete friendships" ON friendships FOR DELETE USING (user_id = auth.uid() OR friend_id = auth.uid());
```

## Set Database Triggers

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
