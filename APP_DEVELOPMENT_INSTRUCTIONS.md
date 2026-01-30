# TaskBuddy - Complete Build Instructions for Claude Opus 4.5

## Document Purpose
This document provides comprehensive instructions for Claude Opus 4.5 to assist in designing, architecting, and building TaskBuddy - a family task management PWA with gamification features for children ages 10-16.

---

## Table of Contents
1. [System Context & Requirements](#system-context--requirements)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Database Design](#database-design)
4. [Backend API Design](#backend-api-design)
5. [Frontend Architecture](#frontend-architecture)
6. [Gamification System](#gamification-system)
7. [PWA Implementation](#pwa-implementation)
8. [Security & Privacy](#security--privacy)
9. [Testing Strategy](#testing-strategy)
10. [Deployment & DevOps](#deployment--devops)
11. [Guidance for Claude Opus 4.5](#guidance-for-claude-opus-45)

---

## System Context & Requirements

### Project Overview
TaskBuddy is a web-based Progressive Web App (PWA) that helps families manage household tasks while teaching children responsibility through gamification.

### Core User Roles
1. **Parent/Guardian** - Creates tasks, approves completions, manages rewards
2. **Child (10-16 years)** - Completes tasks, earns points, redeems rewards
3. **System Admin** (optional) - Platform-level management

### Key Requirements
- **Family Isolation**: Each family's data must be completely isolated
- **Child Safety**: Age-appropriate interfaces, no cross-family interaction
- **Offline-First**: Must work without internet connection
- **Mobile-First**: Optimized for smartphone usage
- **Installable**: Full PWA capabilities
- **Scalable**: Architecture supports future SaaS model

### Critical Success Factors
1. **Engagement**: Children must find the system fun and motivating
2. **Simplicity**: Parents must find it easy to set up and maintain
3. **Reliability**: Offline functionality must be seamless
4. **Performance**: Fast loading, smooth animations, responsive UI
5. **Safety**: COPPA compliance, secure data handling

---

## Architecture & Technology Stack

### Recommended Technology Stack

#### Frontend
```
Framework: Next.js 14+ (App Router)
- Reasoning: Built-in PWA support, excellent performance, SEO capabilities
- Alternative: Vite + React 18 (if simpler SPA is preferred)

UI Library: React 18+
Styling: Tailwind CSS 3+
State Management: Zustand or Jotai
- Reasoning: Lightweight, perfect for PWA offline sync
- Avoid Redux if possible (too heavy for this use case)

Animations: Framer Motion
- Reasoning: Smooth gamification animations, gesture support

Forms: React Hook Form + Zod
- Reasoning: Performance, TypeScript validation

Data Fetching: TanStack Query (React Query)
- Reasoning: Caching, offline support, optimistic updates

Offline Storage: Dexie.js (IndexedDB wrapper)
- Reasoning: Structured offline data, sync queue management
```

#### Backend
```
Runtime: Node.js 20+ LTS
Framework: Express.js or Nest.js
- Express: Simpler, more flexible
- Nest.js: Better structure, TypeScript-first, recommended for larger teams

Language: TypeScript (mandatory)
- Reasoning: Type safety, better maintainability

Database: PostgreSQL 15+
- Reasoning: ACID compliance, JSON support, scalability
- Alternative: MySQL 8+ (if preferred)

ORM: Prisma or Drizzle ORM
- Prisma: More features, better DX
- Drizzle: Lighter, more control

Caching: Redis 7+
- Reasoning: Session storage, real-time features, rate limiting

Real-time: Socket.io or Server-Sent Events
- Reasoning: Live dashboard updates, notifications

Authentication: JWT + HTTP-only cookies
- Reasoning: Secure, stateless, refresh token support
```

#### Infrastructure & DevOps
```
Frontend Hosting: Vercel or Netlify
Backend Hosting: Railway, Render, or fly.io
Database: Railway PostgreSQL, Supabase, or Neon
Object Storage: Cloudflare R2 (for task photos)
CDN: Cloudflare
Monitoring: Sentry (errors), Plausible/Umami (analytics)
```

### Architecture Pattern

**Three-Tier Architecture**:

```
┌─────────────────────────────────────────┐
│         CLIENT LAYER (PWA)              │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Parent App   │  │  Child App   │    │
│  │ (Dashboard)  │  │ (Gamified)   │    │
│  └──────────────┘  └──────────────┘    │
│         │                  │            │
│    ┌────▼──────────────────▼────┐      │
│    │   Service Worker (PWA)     │      │
│    │   + IndexedDB Cache        │      │
│    └────────────────────────────┘      │
└─────────────────────────────────────────┘
                   │
                   │ REST/GraphQL API
                   │ WebSocket (real-time)
                   ▼
┌─────────────────────────────────────────┐
│      APPLICATION LAYER (Backend)        │
│  ┌──────────────────────────────────┐  │
│  │     API Gateway / Router         │  │
│  └──────────────────────────────────┘  │
│         │           │           │       │
│    ┌────▼───┐  ┌───▼────┐  ┌───▼────┐ │
│    │  Auth  │  │  Task  │  │ Points │ │
│    │Service │  │Service │  │ Engine │ │
│    └────────┘  └────────┘  └────────┘ │
│         │           │           │       │
│    ┌────▼───┐  ┌───▼────┐  ┌───▼────┐ │
│    │Notif.  │  │Rewards │  │Reports │ │
│    │Service │  │Service │  │Service │ │
│    └────────┘  └────────┘  └────────┘ │
└─────────────────────────────────────────┘
                   │
                   │ Database Queries
                   ▼
┌─────────────────────────────────────────┐
│         DATA LAYER                      │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ PostgreSQL   │  │    Redis     │    │
│  │ (Primary DB) │  │   (Cache)    │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
```

---

## Database Design

### Schema Design Principles
1. **Normalization**: Follow 3NF to reduce redundancy
2. **Soft Deletes**: Use `deleted_at` instead of hard deletes
3. **Audit Trails**: Track `created_at`, `updated_at` for all tables
4. **UUIDs**: Use UUIDs for primary keys (better for distributed systems)
5. **Indexing**: Index foreign keys, frequently queried fields

### Complete Database Schema

```sql
-- ============================================
-- CORE TABLES
-- ============================================

-- Families table (tenant isolation)
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Users table (both parents and children)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,  -- NULL for children using PIN auth
    username VARCHAR(50),       -- Optional username for children
    password_hash VARCHAR(255), -- NULL for PIN-only children
    role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'child', 'admin')),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    locked_until TIMESTAMP NULL, -- Account lockout for failed attempts
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Indexes for users table (PostgreSQL syntax)
CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;

-- Child profiles (extended info for children)
CREATE TABLE child_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE NOT NULL,
    age_group VARCHAR(20) CHECK (age_group IN ('10-12', '13-16')),
    pin_hash VARCHAR(255),  -- For PIN-based authentication
    points_balance INT DEFAULT 0 CHECK (points_balance >= 0),
    total_points_earned INT DEFAULT 0,
    total_tasks_completed INT DEFAULT 0,
    current_streak_days INT DEFAULT 0,
    longest_streak_days INT DEFAULT 0,
    last_streak_date DATE,  -- Track last day streak was updated
    level INT DEFAULT 1,
    experience_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_child_profiles_user_id ON child_profiles(user_id);

-- ============================================
-- TASK MANAGEMENT
-- ============================================

-- Task templates (reusable task definitions)
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., 'cleaning', 'homework', 'outdoor'
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    suggested_points INT DEFAULT 10,
    estimated_minutes INT,
    age_range VARCHAR(20), -- e.g., '10-12', '13-16', 'all'
    requires_photo_evidence BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false, -- Pre-built templates
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_templates_family_id ON task_templates(family_id);
CREATE INDEX idx_task_templates_category ON task_templates(category);

-- Tasks (actual task instances)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points_value INT NOT NULL DEFAULT 10,
    due_date TIMESTAMP,
    requires_photo_evidence BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'custom'
    recurrence_config JSONB, -- {days: [1,3,5], time: '18:00'}
    auto_approve BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_tasks_family_id ON tasks(family_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);

-- Task assignments (which child is assigned which task)
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instance_date DATE NOT NULL, -- For recurring tasks
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'in_progress', 'completed', 'approved', 'rejected')
    ),
    completed_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    points_awarded INT,
    xp_awarded INT,  -- Separate XP tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(task_id, child_id, instance_date)
);

CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_child_id ON task_assignments(child_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_task_assignments_instance_date ON task_assignments(instance_date);

-- Task completion evidence (photos, notes)
CREATE TABLE task_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
    evidence_type VARCHAR(20) CHECK (evidence_type IN ('photo', 'note', 'video')),
    file_url TEXT,
    file_key TEXT,           -- Storage key for deletion
    file_size_bytes INT,     -- Track file sizes
    mime_type VARCHAR(100),
    thumbnail_url TEXT,      -- For image/video previews
    note TEXT,
    moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (
        moderation_status IN ('pending', 'approved', 'flagged', 'rejected')
    ),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_evidence_assignment_id ON task_evidence(assignment_id);

-- ============================================
-- POINTS & REWARDS
-- ============================================

-- Points ledger (track all point transactions)
CREATE TABLE points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) CHECK (
        transaction_type IN ('earned', 'redeemed', 'bonus', 'penalty', 'adjustment')
    ),
    points_amount INT NOT NULL,
    balance_after INT NOT NULL,
    reference_type VARCHAR(50), -- 'task_completion', 'reward_redemption', 'achievement'
    reference_id UUID,
    description TEXT,
    breakdown JSONB, -- Store breakdown: {base: 20, streak: 5, early: 3}
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_ledger_child_id ON points_ledger(child_id);
CREATE INDEX idx_points_ledger_created_at ON points_ledger(created_at);
CREATE INDEX idx_points_ledger_transaction_type ON points_ledger(transaction_type);

-- Rewards (things children can redeem)
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    points_cost INT NOT NULL CHECK (points_cost > 0),
    tier VARCHAR(20) CHECK (tier IN ('small', 'medium', 'large')),
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    max_redemptions_per_child INT, -- NULL = unlimited
    expires_at TIMESTAMP,
    is_collaborative BOOLEAN DEFAULT false, -- Can siblings pool points?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_rewards_family_id ON rewards(family_id);
CREATE INDEX idx_rewards_is_active ON rewards(is_active);
CREATE INDEX idx_rewards_tier ON rewards(tier);

-- Reward redemptions
CREATE TABLE reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_spent INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'fulfilled', 'cancelled')
    ),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    fulfilled_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX idx_reward_redemptions_child_id ON reward_redemptions(child_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);

-- ============================================
-- GAMIFICATION
-- ============================================

-- Achievements (badges, milestones)
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    category VARCHAR(50), -- 'streak', 'task_count', 'points', 'special'
    unlock_criteria_type VARCHAR(50), -- 'streak_days', 'tasks_completed', 'points_earned'
    unlock_criteria_value INT,
    unlock_criteria_config JSONB, -- Additional criteria
    tier VARCHAR(20) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    is_system_achievement BOOLEAN DEFAULT true,
    points_reward INT DEFAULT 0,
    xp_reward INT DEFAULT 0,  -- XP reward for achievement
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_tier ON achievements(tier);

-- Child achievements (unlocked badges)
CREATE TABLE child_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_value INT, -- Track progress toward achievement

    UNIQUE(child_id, achievement_id)
);

CREATE INDEX idx_child_achievements_child_id ON child_achievements(child_id);
CREATE INDEX idx_child_achievements_unlocked_at ON child_achievements(unlocked_at);

-- Daily challenges (bonus point opportunities)
CREATE TABLE daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50), -- 'speed_bonus', 'quantity', 'quality'
    criteria JSONB, -- e.g., {task_count: 3, before_time: '12:00'}
    bonus_points INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(family_id, challenge_date)
);

CREATE INDEX idx_daily_challenges_family_id ON daily_challenges(family_id);
CREATE INDEX idx_daily_challenges_challenge_date ON daily_challenges(challenge_date);

-- Challenge completions
CREATE TABLE challenge_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bonus_points_awarded INT,

    UNIQUE(challenge_id, child_id)
);

CREATE INDEX idx_challenge_completions_challenge_id ON challenge_completions(challenge_id);
CREATE INDEX idx_challenge_completions_child_id ON challenge_completions(child_id);

-- ============================================
-- NOTIFICATIONS & SETTINGS
-- ============================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Family settings
CREATE TABLE family_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
    auto_approve_recurring_tasks BOOLEAN DEFAULT false,
    enable_daily_challenges BOOLEAN DEFAULT true,
    enable_leaderboard BOOLEAN DEFAULT false,
    streak_grace_period_hours INT DEFAULT 4, -- Hours after midnight for streak grace
    notification_preferences JSONB DEFAULT '{
        "task_assigned": true,
        "task_due_soon": true,
        "task_completed": true,
        "reward_unlocked": true,
        "achievement_unlocked": true,
        "streak_at_risk": true
    }'::jsonb,
    theme VARCHAR(20) DEFAULT 'default',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_family_settings_family_id ON family_settings(family_id);

-- ============================================
-- ANALYTICS & REPORTING
-- ============================================

-- Task completion analytics (materialized view or table)
CREATE TABLE task_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analytics_date DATE NOT NULL,
    tasks_assigned INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_approved INT DEFAULT 0,
    tasks_rejected INT DEFAULT 0,
    points_earned INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    completion_rate DECIMAL(5,2),
    avg_completion_time_hours DECIMAL(6,2),
    streak_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(family_id, child_id, analytics_date)
);

CREATE INDEX idx_task_analytics_family_id ON task_analytics(family_id);
CREATE INDEX idx_task_analytics_child_id ON task_analytics(child_id);
CREATE INDEX idx_task_analytics_analytics_date ON task_analytics(analytics_date);

-- ============================================
-- DEVICE MANAGEMENT (for shared device support)
-- ============================================

-- Authorized devices for family
CREATE TABLE authorized_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(100) NOT NULL,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    device_name VARCHAR(100),
    authorized_by UUID NOT NULL REFERENCES users(id),
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(device_id, family_id)
);

CREATE INDEX idx_authorized_devices_device_id ON authorized_devices(device_id);
CREATE INDEX idx_authorized_devices_family_id ON authorized_devices(family_id);

-- ============================================
-- MODERATION QUEUE (for content moderation)
-- ============================================

CREATE TABLE moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    file_key TEXT,
    thumbnail_key TEXT,
    evidence_id UUID REFERENCES task_evidence(id) ON DELETE CASCADE,
    flagged_reasons TEXT[],
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected')
    ),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_created_at ON moderation_queue(created_at);
```

### Database Indexes Strategy

```sql
-- Performance-critical indexes
CREATE INDEX idx_task_assignments_child_status ON task_assignments(child_id, status);
CREATE INDEX idx_task_assignments_pending_today ON task_assignments(status, instance_date) 
    WHERE status = 'pending' AND instance_date >= CURRENT_DATE;
CREATE INDEX idx_points_ledger_child_recent ON points_ledger(child_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) 
    WHERE is_read = false;
```

### Sample Data Constraints

```sql
-- Ensure child age group matches date of birth
CREATE OR REPLACE FUNCTION update_age_group()
RETURNS TRIGGER AS $$
BEGIN
    NEW.age_group := CASE
        WHEN EXTRACT(YEAR FROM AGE(NEW.date_of_birth)) BETWEEN 10 AND 12 THEN '10-12'
        WHEN EXTRACT(YEAR FROM AGE(NEW.date_of_birth)) BETWEEN 13 AND 16 THEN '13-16'
        ELSE NULL
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_age_group
    BEFORE INSERT OR UPDATE ON child_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_age_group();

-- Scheduled job to refresh age groups daily (run via pg_cron or application scheduler)
-- This handles children aging into new groups
CREATE OR REPLACE FUNCTION refresh_all_age_groups()
RETURNS void AS $$
BEGIN
    UPDATE child_profiles
    SET age_group = CASE
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 10 AND 12 THEN '10-12'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 13 AND 16 THEN '13-16'
        ELSE NULL
    END
    WHERE age_group != CASE
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 10 AND 12 THEN '10-12'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 13 AND 16 THEN '13-16'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available):
-- SELECT cron.schedule('refresh-age-groups', '0 0 * * *', 'SELECT refresh_all_age_groups()');

-- Ensure points balance matches ledger
CREATE OR REPLACE FUNCTION validate_points_balance()
RETURNS TRIGGER AS $$
DECLARE
    calculated_balance INT;
BEGIN
    SELECT COALESCE(SUM(points_amount), 0) INTO calculated_balance
    FROM points_ledger
    WHERE child_id = NEW.child_id;
    
    IF NEW.balance_after != calculated_balance THEN
        RAISE EXCEPTION 'Points balance mismatch';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_points_balance
    BEFORE INSERT ON points_ledger
    FOR EACH ROW
    EXECUTE FUNCTION validate_points_balance();
```

---

## Redis Schema & Caching Strategy

Redis serves multiple purposes in TaskBuddy: session storage, caching, rate limiting, real-time features, and leaderboard calculations.

### Redis Key Naming Convention

```
prefix:entity:identifier:subkey
```

Examples:
- `session:user:abc123` - User session
- `cache:family:xyz:tasks` - Cached task list
- `rl:auth:192.168.1.1` - Rate limit for IP
- `lb:family:xyz:weekly` - Weekly leaderboard

### Redis Data Structures

```typescript
// backend/src/lib/redis/schema.ts

/**
 * Redis Key Patterns and Data Types
 */
export const REDIS_KEYS = {
  // ========== SESSIONS ==========
  // Store: Hash
  // TTL: 7 days for refresh tokens, 1 hour for access tokens
  session: {
    user: (userId: string) => `session:user:${userId}`,
    refresh: (tokenId: string) => `session:refresh:${tokenId}`,
    device: (deviceId: string) => `session:device:${deviceId}`
  },

  // ========== CACHING ==========
  // Store: String (JSON) or Hash
  // TTL: Varies by data type
  cache: {
    // User profile cache (5 minutes)
    userProfile: (userId: string) => `cache:user:${userId}:profile`,

    // Family members list (5 minutes)
    familyMembers: (familyId: string) => `cache:family:${familyId}:members`,

    // Tasks for today (2 minutes - changes frequently)
    todaysTasks: (familyId: string, childId: string) =>
      `cache:family:${familyId}:child:${childId}:today`,

    // Rewards list (10 minutes)
    rewards: (familyId: string) => `cache:family:${familyId}:rewards`,

    // Achievement definitions (1 hour - rarely changes)
    achievements: () => `cache:achievements:all`,

    // Child achievements (5 minutes)
    childAchievements: (childId: string) => `cache:child:${childId}:achievements`
  },

  // ========== RATE LIMITING ==========
  // Store: String (counter)
  // TTL: Window duration
  rateLimit: {
    api: (identifier: string) => `rl:api:${identifier}`,
    auth: (identifier: string) => `rl:auth:${identifier}`,
    upload: (userId: string) => `rl:upload:${userId}`
  },

  // ========== LEADERBOARDS ==========
  // Store: Sorted Set
  // TTL: Varies by period
  leaderboard: {
    familyDaily: (familyId: string, date: string) =>
      `lb:family:${familyId}:daily:${date}`,
    familyWeekly: (familyId: string, weekStart: string) =>
      `lb:family:${familyId}:weekly:${weekStart}`,
    familyMonthly: (familyId: string, month: string) =>
      `lb:family:${familyId}:monthly:${month}`,
    familyAllTime: (familyId: string) =>
      `lb:family:${familyId}:alltime`
  },

  // ========== REAL-TIME ==========
  // Store: Various
  realtime: {
    // Online users in family (Set)
    onlineUsers: (familyId: string) => `rt:family:${familyId}:online`,

    // User's socket connections (Set of socket IDs)
    userSockets: (userId: string) => `rt:user:${userId}:sockets`,

    // Typing indicators (String with TTL)
    typing: (familyId: string, userId: string) =>
      `rt:family:${familyId}:typing:${userId}`
  },

  // ========== SECURITY ==========
  // Store: String (counter or timestamp)
  security: {
    // Failed login attempts
    failedLogins: (identifier: string) => `sec:failed:${identifier}`,

    // Account lockout
    accountLock: (userId: string) => `sec:lock:${userId}`,

    // Password reset tokens
    resetToken: (token: string) => `sec:reset:${token}`,

    // Email verification tokens
    verifyToken: (token: string) => `sec:verify:${token}`
  },

  // ========== STREAKS ==========
  // Store: Hash
  streak: {
    // Child's streak data
    childStreak: (childId: string) => `streak:child:${childId}`,

    // Daily completion tracking
    dailyCompletion: (childId: string, date: string) =>
      `streak:child:${childId}:date:${date}`
  },

  // ========== NOTIFICATIONS ==========
  // Store: List (for queue) or Pub/Sub
  notifications: {
    // Pending push notifications queue
    pushQueue: () => `notif:push:queue`,

    // User's unread count
    unreadCount: (userId: string) => `notif:user:${userId}:unread`
  }
};
```

### Redis Service Implementation

```typescript
// backend/src/services/redisService.ts
import Redis from 'ioredis';
import { REDIS_KEYS } from '@/lib/redis/schema';

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL!, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    });
  }

  // ========== SESSION MANAGEMENT ==========

  async setUserSession(userId: string, sessionData: UserSession): Promise<void> {
    const key = REDIS_KEYS.session.user(userId);
    await this.client.hset(key, {
      ...sessionData,
      lastActivity: Date.now()
    });
    await this.client.expire(key, 7 * 24 * 60 * 60); // 7 days
  }

  async getUserSession(userId: string): Promise<UserSession | null> {
    const key = REDIS_KEYS.session.user(userId);
    const data = await this.client.hgetall(key);
    return Object.keys(data).length > 0 ? data as UserSession : null;
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    const key = REDIS_KEYS.session.user(userId);
    await this.client.del(key);
  }

  // ========== CACHING ==========

  async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
  }

  async cacheDelete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async cacheTodaysTasks(familyId: string, childId: string, tasks: Task[]): Promise<void> {
    const key = REDIS_KEYS.cache.todaysTasks(familyId, childId);
    await this.cacheSet(key, tasks, 120); // 2 minutes
  }

  async getCachedTodaysTasks(familyId: string, childId: string): Promise<Task[] | null> {
    const key = REDIS_KEYS.cache.todaysTasks(familyId, childId);
    return this.cacheGet<Task[]>(key);
  }

  // Invalidate cache when tasks change
  async invalidateTaskCache(familyId: string, childIds?: string[]): Promise<void> {
    if (childIds) {
      const keys = childIds.map(id => REDIS_KEYS.cache.todaysTasks(familyId, id));
      await this.client.del(...keys);
    } else {
      // Invalidate all task caches for family
      const pattern = `cache:family:${familyId}:child:*:today`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    }
  }

  // ========== LEADERBOARDS ==========

  async updateLeaderboard(
    familyId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'alltime',
    childId: string,
    score: number
  ): Promise<void> {
    const now = new Date();
    let key: string;

    switch (period) {
      case 'daily':
        key = REDIS_KEYS.leaderboard.familyDaily(familyId, now.toISOString().split('T')[0]);
        break;
      case 'weekly':
        const weekStart = this.getWeekStart(now);
        key = REDIS_KEYS.leaderboard.familyWeekly(familyId, weekStart);
        break;
      case 'monthly':
        key = REDIS_KEYS.leaderboard.familyMonthly(familyId, `${now.getFullYear()}-${now.getMonth() + 1}`);
        break;
      case 'alltime':
        key = REDIS_KEYS.leaderboard.familyAllTime(familyId);
        break;
    }

    // Increment score (ZINCRBY)
    await this.client.zincrby(key, score, childId);

    // Set TTL for time-bound leaderboards
    if (period === 'daily') {
      await this.client.expire(key, 2 * 24 * 60 * 60); // 2 days
    } else if (period === 'weekly') {
      await this.client.expire(key, 14 * 24 * 60 * 60); // 14 days
    } else if (period === 'monthly') {
      await this.client.expire(key, 60 * 24 * 60 * 60); // 60 days
    }
  }

  async getLeaderboard(
    familyId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'alltime'
  ): Promise<LeaderboardEntry[]> {
    const now = new Date();
    let key: string;

    switch (period) {
      case 'daily':
        key = REDIS_KEYS.leaderboard.familyDaily(familyId, now.toISOString().split('T')[0]);
        break;
      case 'weekly':
        key = REDIS_KEYS.leaderboard.familyWeekly(familyId, this.getWeekStart(now));
        break;
      case 'monthly':
        key = REDIS_KEYS.leaderboard.familyMonthly(familyId, `${now.getFullYear()}-${now.getMonth() + 1}`);
        break;
      case 'alltime':
        key = REDIS_KEYS.leaderboard.familyAllTime(familyId);
        break;
    }

    // Get top scores with ZREVRANGE
    const results = await this.client.zrevrange(key, 0, -1, 'WITHSCORES');

    // Parse results
    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        childId: results[i],
        score: parseInt(results[i + 1], 10),
        rank: Math.floor(i / 2) + 1
      });
    }

    return entries;
  }

  private getWeekStart(date: Date): string {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  }

  // ========== REAL-TIME PRESENCE ==========

  async setUserOnline(familyId: string, userId: string, socketId: string): Promise<void> {
    const onlineKey = REDIS_KEYS.realtime.onlineUsers(familyId);
    const socketsKey = REDIS_KEYS.realtime.userSockets(userId);

    await this.client.multi()
      .sadd(onlineKey, userId)
      .sadd(socketsKey, socketId)
      .expire(socketsKey, 3600) // 1 hour
      .exec();
  }

  async setUserOffline(familyId: string, userId: string, socketId: string): Promise<boolean> {
    const onlineKey = REDIS_KEYS.realtime.onlineUsers(familyId);
    const socketsKey = REDIS_KEYS.realtime.userSockets(userId);

    // Remove this socket
    await this.client.srem(socketsKey, socketId);

    // Check if user has other active sockets
    const remainingSockets = await this.client.scard(socketsKey);

    if (remainingSockets === 0) {
      // User is fully offline
      await this.client.srem(onlineKey, userId);
      return true;
    }

    return false;
  }

  async getOnlineUsers(familyId: string): Promise<string[]> {
    const key = REDIS_KEYS.realtime.onlineUsers(familyId);
    return this.client.smembers(key);
  }

  // ========== STREAK TRACKING ==========

  async recordDailyCompletion(childId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = REDIS_KEYS.streak.dailyCompletion(childId, today);

    // Mark today as completed
    await this.client.set(key, '1');
    await this.client.expire(key, 90 * 24 * 60 * 60); // 90 days retention
  }

  async getStreakData(childId: string, days: number = 30): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const today = new Date();

    // Check each day
    const keys: string[] = [];
    const dates: string[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
      keys.push(REDIS_KEYS.streak.dailyCompletion(childId, dateStr));
    }

    // Batch get
    const values = await this.client.mget(...keys);

    dates.forEach((date, i) => {
      result.set(date, values[i] === '1');
    });

    return result;
  }

  // ========== RATE LIMITING ==========

  async checkRateLimit(
    type: 'api' | 'auth' | 'upload',
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const keyMap = {
      api: REDIS_KEYS.rateLimit.api,
      auth: REDIS_KEYS.rateLimit.auth,
      upload: REDIS_KEYS.rateLimit.upload
    };

    const key = keyMap[type](identifier);

    // Increment counter
    const count = await this.client.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    // Get TTL
    const ttl = await this.client.ttl(key);

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetIn: ttl > 0 ? ttl : windowSeconds
    };
  }

  // ========== SECURITY ==========

  async trackFailedLogin(identifier: string): Promise<number> {
    const key = REDIS_KEYS.security.failedLogins(identifier);
    const count = await this.client.incr(key);
    await this.client.expire(key, 15 * 60); // 15 minutes
    return count;
  }

  async clearFailedLogins(identifier: string): Promise<void> {
    const key = REDIS_KEYS.security.failedLogins(identifier);
    await this.client.del(key);
  }

  async lockAccount(userId: string, durationSeconds: number): Promise<void> {
    const key = REDIS_KEYS.security.accountLock(userId);
    await this.client.setex(key, durationSeconds, '1');
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    const key = REDIS_KEYS.security.accountLock(userId);
    const locked = await this.client.exists(key);
    return locked === 1;
  }

  async storePasswordResetToken(
    token: string,
    userId: string,
    expirySeconds: number = 3600
  ): Promise<void> {
    const key = REDIS_KEYS.security.resetToken(token);
    await this.client.setex(key, expirySeconds, userId);
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const key = REDIS_KEYS.security.resetToken(token);
    return this.client.get(key);
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    const key = REDIS_KEYS.security.resetToken(token);
    await this.client.del(key);
  }
}

interface LeaderboardEntry {
  childId: string;
  score: number;
  rank: number;
}
```

### Cache Invalidation Patterns

```typescript
// backend/src/lib/redis/cacheInvalidation.ts

/**
 * Cache invalidation strategies for TaskBuddy
 */
export class CacheInvalidator {
  constructor(private redis: RedisService) {}

  /**
   * Called when a task is created, updated, or deleted
   */
  async onTaskChange(familyId: string, affectedChildIds: string[]): Promise<void> {
    await this.redis.invalidateTaskCache(familyId, affectedChildIds);
  }

  /**
   * Called when points are awarded
   */
  async onPointsChange(familyId: string, childId: string): Promise<void> {
    // Invalidate child profile cache
    await this.redis.cacheDelete(REDIS_KEYS.cache.userProfile(childId));

    // Leaderboards update automatically via ZINCRBY, no invalidation needed
  }

  /**
   * Called when achievements are unlocked
   */
  async onAchievementUnlock(childId: string): Promise<void> {
    await this.redis.cacheDelete(REDIS_KEYS.cache.childAchievements(childId));
  }

  /**
   * Called when rewards are modified
   */
  async onRewardChange(familyId: string): Promise<void> {
    await this.redis.cacheDelete(REDIS_KEYS.cache.rewards(familyId));
  }

  /**
   * Called when family membership changes
   */
  async onFamilyMemberChange(familyId: string): Promise<void> {
    await this.redis.cacheDelete(REDIS_KEYS.cache.familyMembers(familyId));
  }
}
```

---

## Backend API Design

### API Architecture

**RESTful API Structure**:
```
Base URL: https://api.taskbuddy.com/v1

Authentication: JWT Bearer Token
Format: JSON
Versioning: URL-based (/v1/)
```

### Authentication Endpoints

```
POST   /auth/register                 # Register new family
POST   /auth/login                    # Login (parent or child)
POST   /auth/logout                   # Logout
POST   /auth/refresh                  # Refresh JWT token
POST   /auth/forgot-password          # Request password reset
POST   /auth/reset-password           # Reset password
GET    /auth/me                       # Get current user info

# Child-specific authentication
POST   /auth/child/login              # Child login (PIN or password)
POST   /auth/child/pin/setup          # Set up PIN for child
PUT    /auth/child/pin/change         # Change child PIN
POST   /auth/child/switch             # Quick switch between children (same device)
```

### Child Authentication System

Children ages 10-16 have different authentication needs than adults. TaskBuddy implements a dual-mode authentication system:

#### Authentication Modes

**1. PIN-Based Login (Ages 10-12)**
- 4-6 digit PIN for quick access
- Parent sets initial PIN during child account creation
- Optional: Require parent password to change PIN
- Auto-logout after 30 minutes of inactivity

**2. Password-Based Login (Ages 13-16)**
- Standard password with relaxed requirements (min 6 chars)
- Optional 2FA via parent's email
- Remember device for 7 days

#### Shared Device Support

```typescript
// lib/auth/deviceSession.ts
interface DeviceSession {
  deviceId: string;
  familyId: string;
  activeUserId: string | null;
  authorizedUsers: string[]; // User IDs that can use this device
  lastActivity: Date;
}

export class SharedDeviceManager {
  private deviceId: string;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('taskbuddy_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('taskbuddy_device_id', deviceId);
    }
    return deviceId;
  }

  async registerDevice(familyId: string, parentToken: string): Promise<void> {
    // Parent authorizes this device for family use
    await api.post('/devices/register', {
      deviceId: this.deviceId,
      familyId,
    }, {
      headers: { Authorization: `Bearer ${parentToken}` }
    });
  }

  async quickSwitch(userId: string, pin: string): Promise<AuthTokens> {
    // Switch to another authorized user on same device
    const response = await api.post('/auth/child/switch', {
      deviceId: this.deviceId,
      userId,
      pin,
    });
    return response.data.tokens;
  }

  async getAuthorizedUsers(): Promise<User[]> {
    const response = await api.get(`/devices/${this.deviceId}/users`);
    return response.data.users;
  }
}
```

#### Child Login Implementation

```typescript
// Backend: Child authentication service
export class ChildAuthService {
  async loginWithPin(
    familyId: string,
    childIdentifier: string, // Could be first name or username
    pin: string,
    deviceId?: string
  ): Promise<AuthResult> {
    // Find child in family
    const child = await db.users.findOne({
      family_id: familyId,
      role: 'child',
      $or: [
        { first_name: { $ilike: childIdentifier } },
        { username: childIdentifier }
      ]
    });

    if (!child) {
      throw new NotFoundError('Child not found');
    }

    // Verify PIN
    const profile = await db.childProfiles.findOne({ user_id: child.id });
    if (!profile || !(await bcrypt.compare(pin, profile.pin_hash))) {
      // Track failed attempts
      await this.trackFailedAttempt(child.id);
      throw new UnauthorizedError('Invalid PIN');
    }

    // Check if device is authorized (if deviceId provided)
    if (deviceId) {
      const isAuthorized = await this.isDeviceAuthorized(deviceId, familyId);
      if (!isAuthorized) {
        throw new ForbiddenError('Device not authorized for this family');
      }
    }

    // Generate tokens with limited scope for children
    const accessToken = jwt.sign(
      {
        userId: child.id,
        familyId: child.family_id,
        role: 'child',
        ageGroup: profile.age_group
      },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' } // Shorter expiry for children
    );

    return { accessToken, user: child };
  }

  async setupPin(childId: string, pin: string, parentId: string): Promise<void> {
    // Verify parent owns this child's family
    const [child, parent] = await Promise.all([
      db.users.findById(childId),
      db.users.findById(parentId)
    ]);

    if (child.family_id !== parent.family_id || parent.role !== 'parent') {
      throw new ForbiddenError('Not authorized to set PIN for this child');
    }

    // Validate PIN
    if (!/^\d{4,6}$/.test(pin)) {
      throw new ValidationError('PIN must be 4-6 digits');
    }

    // Hash and store PIN
    const pinHash = await bcrypt.hash(pin, 10);
    await db.childProfiles.update(
      { user_id: childId },
      { pin_hash: pinHash }
    );
  }

  private async trackFailedAttempt(userId: string): Promise<void> {
    const key = `failed_attempts:${userId}`;
    const attempts = await redis.incr(key);
    await redis.expire(key, 900); // 15 minutes

    if (attempts >= 5) {
      // Lock account temporarily
      await db.users.update(userId, {
        locked_until: new Date(Date.now() + 15 * 60 * 1000)
      });

      // Notify parent
      const child = await db.users.findById(userId);
      await notificationService.notifyParents(child.family_id, {
        type: 'security_alert',
        title: 'Too Many Failed Login Attempts',
        message: `${child.first_name}'s account has been temporarily locked due to multiple failed login attempts.`
      });
    }
  }
}
```

#### Child Session UI Component

```typescript
// components/auth/ChildSwitcher.tsx
export function ChildSwitcher() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const deviceManager = useDeviceManager();

  useEffect(() => {
    deviceManager.getAuthorizedUsers().then(setUsers);
  }, []);

  const handleSwitch = async () => {
    if (!selectedUser || !pin) return;

    try {
      const tokens = await deviceManager.quickSwitch(selectedUser.id, pin);
      // Update auth state
      useAuthStore.getState().setTokens(tokens);
      // Redirect to dashboard
      router.push(`/${selectedUser.role}/dashboard`);
    } catch (error) {
      toast.error('Invalid PIN');
      setPin('');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Who's using TaskBuddy?</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {users.map(user => (
          <button
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className={cn(
              'p-4 rounded-lg border-2 transition-all',
              selectedUser?.id === user.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            )}
          >
            <Avatar user={user} size="lg" />
            <p className="mt-2 font-medium">{user.firstName}</p>
          </button>
        ))}
      </div>

      {selectedUser && (
        <div className="space-y-4">
          <PinInput
            length={selectedUser.role === 'child' ? 4 : 6}
            value={pin}
            onChange={setPin}
            onComplete={handleSwitch}
          />
          <p className="text-sm text-gray-500 text-center">
            Enter your PIN to continue
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Example: Register Family

**Request**:
```json
POST /v1/auth/register
Content-Type: application/json

{
  "familyName": "The Smiths",
  "parent": {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "family": {
      "id": "uuid-here",
      "name": "The Smiths"
    },
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "role": "parent"
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "refresh-token-here",
      "expiresIn": 3600
    }
  }
}
```

### Family Management Endpoints

```
GET    /families/me                   # Get current family
PUT    /families/me                   # Update family settings
GET    /families/me/settings          # Get family settings
PUT    /families/me/settings          # Update family settings
GET    /families/me/members           # List all family members
POST   /families/me/children          # Add child
PUT    /families/me/children/:id      # Update child
DELETE /families/me/children/:id      # Deactivate child
```

### Task Management Endpoints

```
# Task Templates
GET    /task-templates                # List templates (system + family)
POST   /task-templates                # Create custom template
GET    /task-templates/:id            # Get template details
PUT    /task-templates/:id            # Update template
DELETE /task-templates/:id            # Delete template

# Tasks
GET    /tasks                         # List tasks (with filters)
POST   /tasks                         # Create task
GET    /tasks/:id                     # Get task details
PUT    /tasks/:id                     # Update task
DELETE /tasks/:id                     # Delete task
POST   /tasks/:id/assign              # Assign to children
POST   /tasks/:id/pause               # Pause task
POST   /tasks/:id/archive             # Archive task

# Task Assignments
GET    /assignments                   # List assignments (filtered)
GET    /assignments/:id               # Get assignment details
PUT    /assignments/:id/complete      # Mark as complete
PUT    /assignments/:id/approve       # Approve completion
PUT    /assignments/:id/reject        # Reject completion
POST   /assignments/:id/evidence      # Upload evidence
```

#### Example: Create Task

**Request**:
```json
POST /v1/tasks
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Clean your room",
  "description": "Vacuum, make bed, organize desk",
  "category": "cleaning",
  "difficulty": "medium",
  "pointsValue": 25,
  "dueDate": "2026-01-27T18:00:00Z",
  "requiresPhotoEvidence": true,
  "isRecurring": true,
  "recurrencePattern": "weekly",
  "recurrenceConfig": {
    "days": [6], // Saturday
    "time": "18:00"
  },
  "assignedTo": ["child-uuid-1", "child-uuid-2"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "task-uuid",
      "title": "Clean your room",
      "pointsValue": 25,
      "isRecurring": true,
      "createdAt": "2026-01-26T10:00:00Z"
    },
    "assignments": [
      {
        "id": "assignment-uuid-1",
        "childId": "child-uuid-1",
        "taskId": "task-uuid",
        "instanceDate": "2026-02-01",
        "status": "pending"
      },
      {
        "id": "assignment-uuid-2",
        "childId": "child-uuid-2",
        "taskId": "task-uuid",
        "instanceDate": "2026-02-01",
        "status": "pending"
      }
    ]
  }
}
```

### Points & Rewards Endpoints

```
# Points
GET    /children/:id/points           # Get child's point balance
GET    /children/:id/points/history   # Get points transaction history

# Rewards
GET    /rewards                       # List available rewards
POST   /rewards                       # Create reward
GET    /rewards/:id                   # Get reward details
PUT    /rewards/:id                   # Update reward
DELETE /rewards/:id                   # Delete reward

# Redemptions
POST   /rewards/:id/redeem            # Redeem reward
GET    /redemptions                   # List redemptions
PUT    /redemptions/:id/approve       # Approve redemption
PUT    /redemptions/:id/fulfill       # Mark as fulfilled
PUT    /redemptions/:id/cancel        # Cancel redemption
```

### Gamification Endpoints

```
# Achievements
GET    /achievements                  # List all achievements
GET    /children/:id/achievements     # Get child's unlocked achievements
POST   /achievements/check            # Check for new unlocks (background job)

# Daily Challenges
GET    /challenges/today              # Get today's challenge
POST   /challenges                    # Create challenge (parent)
GET    /children/:id/challenges       # Get child's challenge history

# Leaderboard
GET    /families/me/leaderboard       # Family leaderboard
GET    /families/me/leaderboard/weekly # Weekly stats
```

### Dashboard & Analytics Endpoints

```
# Parent Dashboard
GET    /dashboard/parent              # Parent overview
GET    /dashboard/parent/pending      # Pending approvals
GET    /dashboard/parent/insights     # Weekly/monthly insights

# Child Dashboard
GET    /dashboard/child               # Child overview
GET    /dashboard/child/tasks/today   # Today's tasks
GET    /dashboard/child/progress      # Progress tracking

# Reports
GET    /reports/completion            # Task completion report
GET    /reports/child/:id             # Individual child report
GET    /reports/export                # Export data (CSV/PDF)
```

### Notification Endpoints

```
GET    /notifications                 # List notifications
PUT    /notifications/:id/read        # Mark as read
PUT    /notifications/read-all        # Mark all as read
DELETE /notifications/:id             # Delete notification
POST   /notifications/subscribe       # Subscribe to push (PWA)
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "pointsValue",
        "message": "Must be a positive integer"
      }
    ]
  }
}
```

### Standard HTTP Status Codes

```
200 OK                  # Successful GET, PUT
201 Created             # Successful POST
204 No Content          # Successful DELETE
400 Bad Request         # Validation error
401 Unauthorized        # Missing/invalid token
403 Forbidden           # Insufficient permissions
404 Not Found           # Resource not found
409 Conflict            # Business logic conflict
422 Unprocessable       # Semantic errors
429 Too Many Requests   # Rate limiting
500 Internal Error      # Server error
```

### API Middleware Stack

```typescript
// Example Express middleware pipeline
app.use(helmet());                    // Security headers
app.use(cors(corsOptions));           // CORS
app.use(express.json());              // JSON parsing
app.use(morgan('combined'));          // Logging
app.use(rateLimiter);                 // Rate limiting
app.use(authenticate);                // JWT validation
app.use(familyIsolation);             // Tenant isolation
app.use(roleAuthorization);           // Role-based access
```

---

## Frontend Architecture

### Component Structure

```
src/
├── app/                           # Next.js app directory
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (parent)/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   │   ├── page.tsx
│   │   │   ├── create/
│   │   │   └── [id]/
│   │   ├── rewards/
│   │   ├── children/
│   │   ├── reports/
│   │   └── layout.tsx            # Parent layout with nav
│   ├── (child)/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── rewards/
│   │   ├── achievements/
│   │   └── layout.tsx            # Child layout (gamified)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── api/                      # API routes (if using Next.js API)
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   └── Badge.tsx
│   ├── parent/                   # Parent-specific components
│   │   ├── TaskForm.tsx
│   │   ├── ApprovalQueue.tsx
│   │   ├── ChildPerformanceCard.tsx
│   │   └── RewardManager.tsx
│   ├── child/                    # Child-specific components
│   │   ├── TaskCard.tsx
│   │   ├── PointsDisplay.tsx
│   │   ├── AchievementBadge.tsx
│   │   ├── ProgressBar.tsx
│   │   └── RewardShop.tsx
│   ├── shared/                   # Shared components
│   │   ├── Navigation.tsx
│   │   ├── NotificationBell.tsx
│   │   └── Avatar.tsx
│   └── animations/               # Gamification animations
│       ├── ConfettiAnimation.tsx
│       ├── PointsCountUp.tsx
│       └── LevelUpModal.tsx
├── lib/
│   ├── api/                      # API client
│   │   ├── client.ts
│   │   ├── tasks.ts
│   │   ├── rewards.ts
│   │   └── auth.ts
│   ├── db/                       # IndexedDB (offline)
│   │   ├── schema.ts
│   │   ├── sync.ts
│   │   └── queue.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   ├── useOfflineSync.ts
│   │   └── useNotifications.ts
│   ├── store/                    # Zustand stores
│   │   ├── authStore.ts
│   │   ├── taskStore.ts
│   │   └── offlineStore.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   └── types/
│       ├── api.ts
│       ├── models.ts
│       └── enums.ts
├── public/
│   ├── icons/                    # PWA icons
│   ├── images/
│   ├── manifest.json
│   └── sw.js                     # Service worker (if custom)
└── styles/
    └── globals.css
```

### Key Frontend Patterns

#### 1. Offline-First Architecture

```typescript
// lib/db/schema.ts - IndexedDB Schema
import Dexie, { Table } from 'dexie';

export interface OfflineTask {
  id: string;
  title: string;
  status: string;
  pointsValue: number;
  dueDate: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  lastModified: Date;
}

export interface SyncQueue {
  id?: number;
  action: 'create' | 'update' | 'delete';
  entity: 'task' | 'assignment' | 'reward';
  entityId: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
}

export class TaskBuddyDB extends Dexie {
  tasks!: Table<OfflineTask>;
  assignments!: Table<any>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('TaskBuddyDB');
    this.version(1).stores({
      tasks: 'id, status, dueDate, syncStatus',
      assignments: 'id, childId, status, instanceDate',
      syncQueue: '++id, timestamp, entity',
    });
  }
}

export const db = new TaskBuddyDB();
```

```typescript
// lib/db/sync.ts - Sync Manager
export class SyncManager {
  private isOnline = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  async handleOnline() {
    this.isOnline = true;
    await this.processSyncQueue();
    this.startPeriodicSync();
  }

  handleOffline() {
    this.isOnline = false;
    this.stopPeriodicSync();
  }

  async processSyncQueue() {
    const queue = await db.syncQueue.orderBy('timestamp').toArray();
    
    for (const item of queue) {
      try {
        await this.syncItem(item);
        await db.syncQueue.delete(item.id!);
      } catch (error) {
        // Increment retry count, handle conflicts
        await db.syncQueue.update(item.id!, {
          retryCount: item.retryCount + 1
        });
      }
    }
  }

  async syncItem(item: SyncQueue) {
    // Implement sync logic based on action and entity
    switch (item.action) {
      case 'create':
        return await api.post(`/${item.entity}s`, item.payload);
      case 'update':
        return await api.put(`/${item.entity}s/${item.entityId}`, item.payload);
      case 'delete':
        return await api.delete(`/${item.entity}s/${item.entityId}`);
    }
  }

  startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 30000); // Sync every 30 seconds
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
```

#### 2. State Management with Zustand

```typescript
// lib/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: 'parent' | 'child';
  firstName: string;
  familyId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        set({
          user: response.data.user,
          accessToken: response.data.tokens.accessToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        // Clear IndexedDB
        db.delete();
      },

      refreshToken: async () => {
        const response = await api.post('/auth/refresh');
        set({ accessToken: response.data.accessToken });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

#### 3. Custom Hooks

```typescript
// lib/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db/schema';

export function useTasks(filters?: TaskFilters) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  // Fetch from server or IndexedDB
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      if (isOnline) {
        const response = await api.get('/tasks', { params: filters });
        // Cache in IndexedDB
        await db.tasks.bulkPut(response.data);
        return response.data;
      } else {
        return await db.tasks.toArray();
      }
    },
  });

  // Complete task mutation
  const completeTask = useMutation({
    mutationFn: async (assignmentId: string) => {
      const payload = { status: 'completed', completedAt: new Date() };
      
      if (isOnline) {
        return await api.put(`/assignments/${assignmentId}/complete`, payload);
      } else {
        // Queue for sync
        await db.syncQueue.add({
          action: 'update',
          entity: 'assignment',
          entityId: assignmentId,
          payload,
          timestamp: new Date(),
          retryCount: 0,
        });
        
        // Optimistic update
        await db.assignments.update(assignmentId, payload);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return { tasks: data, isLoading, error, completeTask };
}
```

#### 4. Age-Appropriate UI Components

```typescript
// components/child/TaskCard.tsx
interface TaskCardProps {
  task: Task;
  ageGroup: '10-12' | '13-16';
  onComplete: () => void;
}

export function TaskCard({ task, ageGroup, onComplete }: TaskCardProps) {
  const isYounger = ageGroup === '10-12';

  return (
    <motion.div
      className={cn(
        'rounded-lg p-4',
        isYounger ? 'bg-gradient-to-r from-blue-400 to-purple-500' : 'bg-white border'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Younger kids: More visual, playful */}
      {isYounger ? (
        <div className="text-white">
          <div className="flex items-center gap-2 mb-2">
            {task.category === 'cleaning' && <Sparkles className="w-6 h-6" />}
            <h3 className="text-xl font-bold">{task.title}</h3>
          </div>
          <p className="text-sm opacity-90">{task.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-yellow-300" />
              <span className="text-2xl font-bold">{task.pointsValue}</span>
            </div>
            <Button onClick={onComplete} className="bg-green-500 hover:bg-green-600">
              ✓ Done!
            </Button>
          </div>
        </div>
      ) : (
        // Older kids: Cleaner, more mature
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <Badge variant={task.difficulty}>{task.difficulty}</Badge>
          </div>
          <p className="text-gray-600 text-sm mb-3">{task.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Due: {format(task.dueDate, 'MMM d, h:mm a')}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{task.pointsValue} pts</span>
              <Button onClick={onComplete} size="sm">
                Complete
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
```

#### 5. Gamification Components

```typescript
// components/animations/PointsCountUp.tsx
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function PointsCountUp({ points, onComplete }: { points: number; onComplete?: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1000; // 1 second
    const steps = 50;
    const increment = points / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= points) {
        setCount(points);
        clearInterval(interval);
        onComplete?.();
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [points, onComplete]);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      className="text-6xl font-bold text-yellow-500"
    >
      +{count}
    </motion.div>
  );
}
```

```typescript
// components/animations/LevelUpModal.tsx
export function LevelUpModal({ newLevel, onClose }: { newLevel: number; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0, y: 50 }}
          className="bg-white rounded-2xl p-8 max-w-md"
        >
          <Confetti />
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <Trophy className="w-24 h-24 mx-auto text-yellow-500" />
            </motion.div>
            <h2 className="text-4xl font-bold mt-4">Level Up!</h2>
            <p className="text-6xl font-bold text-blue-600 mt-2">{newLevel}</p>
            <p className="text-gray-600 mt-4">You're becoming a task master!</p>
            <Button onClick={onClose} className="mt-6">
              Awesome!
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Gamification System

### Gamification Elements

1. **Points System**
   - Task completion points
   - Bonus points for early completion
   - Streak bonuses
   - Challenge completion bonuses

2. **Levels & Experience**
   - XP earned alongside points
   - Level progression (1-50+)
   - Visual level badges
   - Unlock new features at higher levels

3. **Achievements/Badges**
   - Task-based: "Complete 10 cleaning tasks"
   - Streak-based: "7-day streak"
   - Time-based: "Early bird" (tasks before 8am)
   - Quality-based: "Perfectionist" (no rejections in a month)

4. **Daily Challenges**
   - Rotating challenges
   - Time-limited bonus opportunities
   - Family-wide participation

5. **Rewards Shop**
   - Tiered rewards (small/medium/large)
   - Visual reward catalog
   - Unlock animations

### Gamification Formulas & Calculations

#### Level Progression System

```typescript
// lib/gamification/levelSystem.ts

/**
 * Level Progression Formula:
 * XP required for level N = BASE_XP * N^GROWTH_FACTOR
 *
 * With BASE_XP = 100 and GROWTH_FACTOR = 1.5:
 * Level 1:  100 XP
 * Level 2:  283 XP (cumulative: 383)
 * Level 5:  1,118 XP
 * Level 10: 3,162 XP
 * Level 20: 8,944 XP
 * Level 50: 35,355 XP
 */

const BASE_XP = 100;
const GROWTH_FACTOR = 1.5;
const MAX_LEVEL = 100;

export function xpRequiredForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(BASE_XP * Math.pow(level, GROWTH_FACTOR));
}

export function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpRequiredForLevel(i);
  }
  return total;
}

export function levelFromXp(totalXp: number): { level: number; currentXp: number; xpToNext: number; progress: number } {
  let level = 1;
  let remainingXp = totalXp;

  while (level < MAX_LEVEL) {
    const required = xpRequiredForLevel(level);
    if (remainingXp < required) {
      break;
    }
    remainingXp -= required;
    level++;
  }

  const xpToNext = xpRequiredForLevel(level);
  const progress = Math.min((remainingXp / xpToNext) * 100, 100);

  return {
    level,
    currentXp: remainingXp,
    xpToNext,
    progress: Math.round(progress)
  };
}

// XP earned from tasks (separate from points)
export function calculateTaskXp(task: Task): number {
  const baseXp = {
    easy: 10,
    medium: 20,
    hard: 35
  };

  let xp = baseXp[task.difficulty] || 15;

  // Bonus for completing before deadline
  if (task.dueDate && new Date() < new Date(task.dueDate)) {
    const hoursEarly = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursEarly > 24) xp *= 1.25; // 25% bonus for >24 hours early
    else if (hoursEarly > 6) xp *= 1.1; // 10% bonus for >6 hours early
  }

  return Math.round(xp);
}
```

#### Streak Calculation System

```typescript
// lib/gamification/streakSystem.ts

interface StreakConfig {
  gracePeriodHours: number;     // Hours after midnight to still count previous day
  timezoneOffset: number;        // User's timezone offset in minutes
  minimumTasksPerDay: number;    // Tasks required to maintain streak
}

const DEFAULT_CONFIG: StreakConfig = {
  gracePeriodHours: 4,           // Until 4 AM counts as previous day
  timezoneOffset: 0,
  minimumTasksPerDay: 1
};

export class StreakCalculator {
  private config: StreakConfig;

  constructor(config: Partial<StreakConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the "streak day" for a given timestamp
   * Accounts for grace period (e.g., completing at 2 AM counts for previous day)
   */
  getStreakDay(timestamp: Date): string {
    const adjusted = new Date(timestamp.getTime() - this.config.gracePeriodHours * 60 * 60 * 1000);
    return adjusted.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Calculate current streak from completion history
   */
  async calculateStreak(childId: string): Promise<StreakResult> {
    // Get last 90 days of completions
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const completions = await db.taskAssignments.find({
      child_id: childId,
      status: 'approved',
      approved_at: { $gte: ninetyDaysAgo }
    }).sort({ approved_at: -1 });

    // Group by streak day
    const completionsByDay = new Map<string, number>();
    for (const completion of completions) {
      const day = this.getStreakDay(completion.approved_at);
      completionsByDay.set(day, (completionsByDay.get(day) || 0) + 1);
    }

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date();

    // Start from today (or yesterday if before grace period)
    let checkDay = this.getStreakDay(checkDate);

    while (true) {
      const tasksOnDay = completionsByDay.get(checkDay) || 0;

      if (tasksOnDay >= this.config.minimumTasksPerDay) {
        currentStreak++;
        // Move to previous day
        checkDate.setDate(checkDate.getDate() - 1);
        checkDay = this.getStreakDay(checkDate);
      } else if (currentStreak === 0 && this.isToday(checkDay)) {
        // Today has no completions yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        checkDay = this.getStreakDay(checkDate);
      } else {
        // Streak broken
        break;
      }
    }

    // Check if streak is at risk (no completion today yet)
    const todayCount = completionsByDay.get(this.getStreakDay(new Date())) || 0;
    const streakAtRisk = currentStreak > 0 && todayCount < this.config.minimumTasksPerDay;

    return {
      currentStreak,
      streakAtRisk,
      completedToday: todayCount,
      requiredDaily: this.config.minimumTasksPerDay
    };
  }

  private isToday(day: string): boolean {
    return day === this.getStreakDay(new Date());
  }
}

interface StreakResult {
  currentStreak: number;
  streakAtRisk: boolean;
  completedToday: number;
  requiredDaily: number;
}
```

#### Streak Bonus Calculation

```typescript
// lib/gamification/bonusCalculator.ts

/**
 * Streak Bonus Formula:
 * bonus_multiplier = 1 + (streak_days * STREAK_MULTIPLIER)
 *
 * With STREAK_MULTIPLIER = 0.05:
 * Day 1:  No bonus (1.0x)
 * Day 3:  1.15x bonus
 * Day 7:  1.35x bonus (capped at this for weekly)
 * Day 14: 1.70x bonus
 * Day 30: 2.50x bonus (max cap)
 */

const STREAK_MULTIPLIER = 0.05;
const MAX_STREAK_BONUS = 2.5; // 150% max bonus
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export function calculateStreakBonus(basePoints: number, streakDays: number): PointsBreakdown {
  const multiplier = Math.min(1 + (streakDays * STREAK_MULTIPLIER), MAX_STREAK_BONUS);
  const bonusPoints = Math.round(basePoints * (multiplier - 1));
  const totalPoints = basePoints + bonusPoints;

  // Check for milestone bonus
  let milestoneBonus = 0;
  if (STREAK_MILESTONES.includes(streakDays)) {
    milestoneBonus = streakDays * 5; // 5 points per milestone day
  }

  return {
    basePoints,
    streakMultiplier: multiplier,
    streakBonus: bonusPoints,
    milestoneBonus,
    totalPoints: totalPoints + milestoneBonus,
    breakdown: {
      base: basePoints,
      streak: bonusPoints,
      milestone: milestoneBonus
    }
  };
}

interface PointsBreakdown {
  basePoints: number;
  streakMultiplier: number;
  streakBonus: number;
  milestoneBonus: number;
  totalPoints: number;
  breakdown: {
    base: number;
    streak: number;
    milestone: number;
  };
}

// Early completion bonus
export function calculateEarlyCompletionBonus(
  basePoints: number,
  dueDate: Date,
  completedAt: Date
): number {
  if (completedAt >= dueDate) return 0;

  const hoursEarly = (dueDate.getTime() - completedAt.getTime()) / (1000 * 60 * 60);

  if (hoursEarly >= 48) return Math.round(basePoints * 0.25); // 25% bonus
  if (hoursEarly >= 24) return Math.round(basePoints * 0.15); // 15% bonus
  if (hoursEarly >= 12) return Math.round(basePoints * 0.10); // 10% bonus
  if (hoursEarly >= 6) return Math.round(basePoints * 0.05);  // 5% bonus

  return 0;
}
```

#### Leaderboard Ranking Algorithm

```typescript
// lib/gamification/leaderboard.ts

interface LeaderboardEntry {
  childId: string;
  childName: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  weeklyPoints: number;
  weeklyTasks: number;
  currentStreak: number;
  achievements: number;
}

interface LeaderboardWeights {
  weeklyPoints: number;    // Weight for points earned this week
  weeklyTasks: number;     // Weight for tasks completed this week
  streakBonus: number;     // Weight for current streak
  achievementBonus: number; // Weight for total achievements
}

const DEFAULT_WEIGHTS: LeaderboardWeights = {
  weeklyPoints: 1.0,
  weeklyTasks: 5.0,      // Each task worth 5 points in ranking
  streakBonus: 2.0,      // Each streak day worth 2 points
  achievementBonus: 10.0  // Each achievement worth 10 points
};

export class LeaderboardService {
  private weights: LeaderboardWeights;

  constructor(weights: Partial<LeaderboardWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  async getFamilyLeaderboard(
    familyId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly'
  ): Promise<LeaderboardEntry[]> {
    const dateRange = this.getDateRange(period);

    // Get all children in family
    const children = await db.users.find({
      family_id: familyId,
      role: 'child',
      is_active: true
    });

    const entries: LeaderboardEntry[] = [];

    for (const child of children) {
      // Get points for period
      const pointsResult = await db.pointsLedger.aggregate([
        {
          $match: {
            child_id: child.id,
            transaction_type: 'earned',
            created_at: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        { $group: { _id: null, total: { $sum: '$points_amount' } } }
      ]);
      const weeklyPoints = pointsResult[0]?.total || 0;

      // Get tasks completed for period
      const tasksResult = await db.taskAssignments.count({
        child_id: child.id,
        status: 'approved',
        approved_at: { $gte: dateRange.start, $lte: dateRange.end }
      });
      const weeklyTasks = tasksResult;

      // Get profile for streak
      const profile = await db.childProfiles.findOne({ user_id: child.id });
      const currentStreak = profile?.current_streak_days || 0;

      // Get achievement count
      const achievements = await db.childAchievements.count({ child_id: child.id });

      // Calculate composite score
      const score = this.calculateScore({
        weeklyPoints,
        weeklyTasks,
        currentStreak,
        achievements
      });

      entries.push({
        childId: child.id,
        childName: child.first_name,
        avatarUrl: child.avatar_url,
        score: Math.round(score),
        rank: 0, // Will be set after sorting
        weeklyPoints,
        weeklyTasks,
        currentStreak,
        achievements
      });
    }

    // Sort by score and assign ranks
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }

  private calculateScore(data: {
    weeklyPoints: number;
    weeklyTasks: number;
    currentStreak: number;
    achievements: number;
  }): number {
    return (
      data.weeklyPoints * this.weights.weeklyPoints +
      data.weeklyTasks * this.weights.weeklyTasks +
      data.currentStreak * this.weights.streakBonus +
      data.achievements * this.weights.achievementBonus
    );
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'all-time':
        start.setFullYear(2020); // App launch date
        break;
    }

    return { start, end };
  }
}

// Leaderboard display component
export function LeaderboardCard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <motion.div
          key={entry.childId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            'flex items-center gap-4 p-3 rounded-lg',
            entry.rank === 1 && 'bg-yellow-50 border-2 border-yellow-400',
            entry.rank === 2 && 'bg-gray-100 border-2 border-gray-300',
            entry.rank === 3 && 'bg-orange-50 border-2 border-orange-300',
            entry.rank > 3 && 'bg-white border border-gray-200'
          )}
        >
          <div className="text-2xl font-bold w-8 text-center">
            {entry.rank === 1 && '🥇'}
            {entry.rank === 2 && '🥈'}
            {entry.rank === 3 && '🥉'}
            {entry.rank > 3 && entry.rank}
          </div>

          <Avatar user={{ firstName: entry.childName, avatarUrl: entry.avatarUrl }} />

          <div className="flex-1">
            <p className="font-semibold">{entry.childName}</p>
            <p className="text-sm text-gray-500">
              {entry.weeklyTasks} tasks · {entry.currentStreak} day streak
            </p>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-blue-600">{entry.score}</p>
            <p className="text-xs text-gray-500">points</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

### Achievement System Logic

```typescript
// Achievement checker service
export class AchievementEngine {
  async checkAchievements(childId: string, event: AchievementEvent) {
    const child = await db.childProfiles.findOne({ user_id: childId });
    const achievements = await db.achievements.find({ is_system_achievement: true });

    for (const achievement of achievements) {
      const unlocked = await this.checkUnlockCriteria(child, achievement, event);
      
      if (unlocked) {
        await this.unlockAchievement(childId, achievement.id);
      }
    }
  }

  private async checkUnlockCriteria(
    child: ChildProfile,
    achievement: Achievement,
    event: AchievementEvent
  ): Promise<boolean> {
    switch (achievement.unlock_criteria_type) {
      case 'streak_days':
        return child.current_streak_days >= achievement.unlock_criteria_value;
      
      case 'tasks_completed':
        return child.total_tasks_completed >= achievement.unlock_criteria_value;
      
      case 'points_earned':
        return child.total_points_earned >= achievement.unlock_criteria_value;
      
      case 'category_master':
        const categoryCount = await db.taskAssignments.count({
          child_id: child.user_id,
          status: 'approved',
          'task.category': achievement.unlock_criteria_config.category
        });
        return categoryCount >= achievement.unlock_criteria_value;
      
      default:
        return false;
    }
  }

  private async unlockAchievement(childId: string, achievementId: string) {
    // Check if already unlocked
    const existing = await db.childAchievements.findOne({
      child_id: childId,
      achievement_id: achievementId
    });

    if (existing) return;

    // Unlock achievement
    await db.childAchievements.insert({
      child_id: childId,
      achievement_id: achievementId,
      unlocked_at: new Date()
    });

    // Award bonus points if configured
    const achievement = await db.achievements.findById(achievementId);
    if (achievement.points_reward > 0) {
      await this.awardPoints(childId, achievement.points_reward, 'achievement_unlock');
    }

    // Send notification
    await this.notificationService.send({
      user_id: childId,
      type: 'achievement_unlocked',
      title: `🏆 Achievement Unlocked!`,
      message: `You earned "${achievement.name}"!`
    });
  }
}
```

### Pre-Built Achievements

```typescript
const SYSTEM_ACHIEVEMENTS = [
  {
    name: "First Steps",
    description: "Complete your first task",
    category: "milestone",
    unlock_criteria_type: "tasks_completed",
    unlock_criteria_value: 1,
    tier: "bronze",
    points_reward: 10
  },
  {
    name: "Task Warrior",
    description: "Complete 100 tasks",
    category: "milestone",
    unlock_criteria_type: "tasks_completed",
    unlock_criteria_value: 100,
    tier: "gold",
    points_reward: 100
  },
  {
    name: "Week Strong",
    description: "Maintain a 7-day streak",
    category: "streak",
    unlock_criteria_type: "streak_days",
    unlock_criteria_value: 7,
    tier: "silver",
    points_reward: 50
  },
  {
    name: "Cleaning Champion",
    description: "Complete 25 cleaning tasks",
    category: "task_type",
    unlock_criteria_type: "category_master",
    unlock_criteria_value: 25,
    unlock_criteria_config: { category: "cleaning" },
    tier: "silver",
    points_reward: 50
  },
  {
    name: "Early Bird",
    description: "Complete 10 tasks before 8 AM",
    category: "special",
    unlock_criteria_type: "time_based",
    unlock_criteria_value: 10,
    unlock_criteria_config: { before_time: "08:00" },
    tier: "gold",
    points_reward: 75
  }
];
```

---

## PWA Implementation

### manifest.json

```json
{
  "name": "TaskBuddy - Family Task Manager",
  "short_name": "TaskBuddy",
  "description": "Gamified task management for families",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/parent-dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/child-tasks.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity", "lifestyle"],
  "shortcuts": [
    {
      "name": "View Tasks",
      "short_name": "Tasks",
      "description": "View today's tasks",
      "url": "/tasks",
      "icons": [{ "src": "/icons/tasks-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Rewards",
      "short_name": "Rewards",
      "description": "Browse rewards",
      "url": "/rewards",
      "icons": [{ "src": "/icons/rewards-icon.png", "sizes": "96x96" }]
    }
  ]
}
```

### Service Worker Strategy (Next.js with Workbox)

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.taskbuddy\.com\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    }
  ]
});

module.exports = withPWA({
  // Your Next.js config
});
```

### Push Notifications

```typescript
// lib/notifications/push.ts
export class PushNotificationManager {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe() {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });

    // Send subscription to backend
    await api.post('/notifications/subscribe', {
      subscription: subscription.toJSON()
    });

    return subscription;
  }

  async sendNotification(title: string, options: NotificationOptions) {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    }
  }
}
```

### Offline UI Indicator

```typescript
// components/shared/OfflineIndicator.tsx
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
    } else {
      // Hide after 2 seconds when back online
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 p-3 text-center text-sm font-medium',
        isOnline ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'
      )}
    >
      {isOnline ? (
        <>✓ Back online - Syncing data...</>
      ) : (
        <>⚠️ You're offline - Changes will sync when connected</>
      )}
    </motion.div>
  );
}
```

---

## Real-time Architecture

TaskBuddy requires real-time updates for a responsive user experience. This section covers Socket.io implementation for live features.

### Socket.io Server Setup

```typescript
// backend/src/socket/socketServer.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { verifyToken } from '@/lib/auth';

const pubClient = new Redis(process.env.REDIS_URL!);
const subClient = pubClient.duplicate();

export function initializeSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    },
    adapter: createAdapter(pubClient, subClient)
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = await verifyToken(token);
      socket.data.user = payload;
      socket.data.familyId = payload.familyId;

      // Join family room for isolation
      socket.join(`family:${payload.familyId}`);

      // Join user-specific room
      socket.join(`user:${payload.userId}`);

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User ${socket.data.user.userId} connected`);

    // Handle client events
    socket.on('task:start', (data) => handleTaskStart(io, socket, data));
    socket.on('task:complete', (data) => handleTaskComplete(io, socket, data));
    socket.on('typing:start', (data) => handleTypingStart(io, socket, data));
    socket.on('typing:stop', (data) => handleTypingStop(io, socket, data));

    // Presence tracking
    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.userId} disconnected`);
      io.to(`family:${socket.data.familyId}`).emit('user:offline', {
        userId: socket.data.user.userId
      });
    });

    // Notify family of online status
    socket.to(`family:${socket.data.familyId}`).emit('user:online', {
      userId: socket.data.user.userId,
      role: socket.data.user.role
    });
  });

  return io;
}

// Event handlers
async function handleTaskStart(io: Server, socket: any, data: { assignmentId: string }) {
  const { familyId, userId } = socket.data;

  // Notify family that child started a task
  socket.to(`family:${familyId}`).emit('task:started', {
    assignmentId: data.assignmentId,
    childId: userId,
    startedAt: new Date()
  });
}

async function handleTaskComplete(io: Server, socket: any, data: { assignmentId: string }) {
  const { familyId, userId } = socket.data;

  // Notify parents immediately
  socket.to(`family:${familyId}`).emit('task:completed', {
    assignmentId: data.assignmentId,
    childId: userId,
    completedAt: new Date()
  });
}

async function handleTypingStart(io: Server, socket: any, data: { context: string }) {
  socket.to(`family:${socket.data.familyId}`).emit('user:typing', {
    userId: socket.data.user.userId,
    context: data.context
  });
}

async function handleTypingStop(io: Server, socket: any, data: { context: string }) {
  socket.to(`family:${socket.data.familyId}`).emit('user:stopped_typing', {
    userId: socket.data.user.userId,
    context: data.context
  });
}
```

### Socket Event Types

```typescript
// shared/types/socketEvents.ts

// Server -> Client events
export interface ServerToClientEvents {
  // Task events
  'task:created': (data: TaskCreatedEvent) => void;
  'task:updated': (data: TaskUpdatedEvent) => void;
  'task:deleted': (data: { taskId: string }) => void;
  'task:started': (data: TaskStartedEvent) => void;
  'task:completed': (data: TaskCompletedEvent) => void;
  'task:approved': (data: TaskApprovedEvent) => void;
  'task:rejected': (data: TaskRejectedEvent) => void;

  // Points events
  'points:earned': (data: PointsEarnedEvent) => void;
  'points:spent': (data: PointsSpentEvent) => void;

  // Achievement events
  'achievement:unlocked': (data: AchievementUnlockedEvent) => void;
  'level:up': (data: LevelUpEvent) => void;
  'streak:updated': (data: StreakUpdatedEvent) => void;

  // Presence events
  'user:online': (data: { userId: string; role: string }) => void;
  'user:offline': (data: { userId: string }) => void;
  'user:typing': (data: { userId: string; context: string }) => void;
  'user:stopped_typing': (data: { userId: string; context: string }) => void;

  // Notification events
  'notification:new': (data: NotificationEvent) => void;

  // Dashboard refresh
  'dashboard:refresh': (data: { reason: string }) => void;
}

// Client -> Server events
export interface ClientToServerEvents {
  'task:start': (data: { assignmentId: string }) => void;
  'task:complete': (data: { assignmentId: string }) => void;
  'typing:start': (data: { context: string }) => void;
  'typing:stop': (data: { context: string }) => void;
  'dashboard:subscribe': () => void;
  'dashboard:unsubscribe': () => void;
}

// Event data types
interface TaskCreatedEvent {
  task: {
    id: string;
    title: string;
    pointsValue: number;
    dueDate?: string;
  };
  assignments: Array<{
    id: string;
    childId: string;
  }>;
}

interface TaskApprovedEvent {
  assignmentId: string;
  childId: string;
  pointsAwarded: number;
  xpAwarded: number;
  newBalance: number;
  newLevel?: number;
  achievementsUnlocked?: string[];
}

interface PointsEarnedEvent {
  childId: string;
  points: number;
  newBalance: number;
  breakdown: {
    base: number;
    streak: number;
    early: number;
    milestone: number;
  };
  reason: string;
}

interface LevelUpEvent {
  childId: string;
  newLevel: number;
  previousLevel: number;
  totalXp: number;
}

interface StreakUpdatedEvent {
  childId: string;
  currentStreak: number;
  isNewRecord: boolean;
  streakAtRisk: boolean;
}
```

### Client Socket Hook

```typescript
// frontend/lib/hooks/useSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/authStore';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types/socketEvents';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    // Initialize socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, accessToken]);

  const emit = useCallback(<T extends keyof ClientToServerEvents>(
    event: T,
    data: Parameters<ClientToServerEvents[T]>[0]
  ) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    callback: ServerToClientEvents[T]
  ) => {
    socketRef.current?.on(event, callback as any);
    return () => {
      socketRef.current?.off(event, callback as any);
    };
  }, []);

  return { socket: socketRef.current, emit, on };
}
```

### Real-time Dashboard Updates

```typescript
// frontend/components/parent/LiveDashboard.tsx
import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';

export function LiveDashboard() {
  const { on, emit } = useSocket();
  const queryClient = useQueryClient();
  const [onlineChildren, setOnlineChildren] = useState<Set<string>>(new Set());
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    // Subscribe to dashboard updates
    emit('dashboard:subscribe', undefined);

    // Handle real-time events
    const unsubscribers = [
      on('task:completed', (data) => {
        // Add to activity feed
        setRecentActivity(prev => [{
          type: 'task_completed',
          childId: data.childId,
          timestamp: new Date(),
          data
        }, ...prev.slice(0, 9)]);

        // Invalidate pending approvals query
        queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });

        // Show toast notification
        toast.info(`Task completed - awaiting approval`);
      }),

      on('task:approved', (data) => {
        setRecentActivity(prev => [{
          type: 'task_approved',
          childId: data.childId,
          timestamp: new Date(),
          data
        }, ...prev.slice(0, 9)]);

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['children'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      }),

      on('achievement:unlocked', (data) => {
        // Show celebration notification
        toast.success(`🏆 Achievement unlocked!`, {
          description: data.achievementName
        });
      }),

      on('level:up', (data) => {
        // Show level up celebration
        showLevelUpModal(data.childId, data.newLevel);
      }),

      on('user:online', (data) => {
        setOnlineChildren(prev => new Set([...prev, data.userId]));
      }),

      on('user:offline', (data) => {
        setOnlineChildren(prev => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }),

      on('streak:updated', (data) => {
        if (data.isNewRecord) {
          toast.success(`🔥 New streak record: ${data.currentStreak} days!`);
        }
      })
    ];

    return () => {
      emit('dashboard:unsubscribe', undefined);
      unsubscribers.forEach(unsub => unsub());
    };
  }, [on, emit, queryClient]);

  return (
    <div className="space-y-6">
      {/* Online status indicators */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Online now:</span>
        {/* Render online children avatars */}
      </div>

      {/* Real-time activity feed */}
      <ActivityFeed activities={recentActivity} />

      {/* Rest of dashboard */}
    </div>
  );
}
```

### Emitting Events from Backend Services

```typescript
// backend/src/services/taskService.ts
import { getIO } from '@/socket/socketServer';

export class TaskService {
  async approveTask(assignmentId: string, parentId: string): Promise<TaskAssignment> {
    const assignment = await db.taskAssignments.findById(assignmentId);
    const task = await db.tasks.findById(assignment.task_id);

    // Calculate points and XP
    const pointsResult = await this.pointsEngine.calculateTaskPoints(assignment);
    const xpResult = await this.xpEngine.calculateTaskXp(task);

    // Update assignment
    const updated = await db.taskAssignments.update(assignmentId, {
      status: 'approved',
      approved_at: new Date(),
      approved_by: parentId,
      points_awarded: pointsResult.totalPoints,
      xp_awarded: xpResult.xp
    });

    // Award points
    await this.pointsService.awardPoints(assignment.child_id, pointsResult);

    // Award XP and check level up
    const levelResult = await this.xpService.awardXp(assignment.child_id, xpResult.xp);

    // Check achievements
    const newAchievements = await this.achievementEngine.checkAchievements(
      assignment.child_id,
      { type: 'task_approved', taskCategory: task.category }
    );

    // Update streak
    const streakResult = await this.streakService.updateStreak(assignment.child_id);

    // Emit real-time events
    const io = getIO();
    const familyRoom = `family:${task.family_id}`;

    // Notify family of approval
    io.to(familyRoom).emit('task:approved', {
      assignmentId,
      childId: assignment.child_id,
      pointsAwarded: pointsResult.totalPoints,
      xpAwarded: xpResult.xp,
      newBalance: pointsResult.newBalance,
      newLevel: levelResult.leveledUp ? levelResult.newLevel : undefined,
      achievementsUnlocked: newAchievements.map(a => a.id)
    });

    // If leveled up, emit separate event for celebration
    if (levelResult.leveledUp) {
      io.to(`user:${assignment.child_id}`).emit('level:up', {
        childId: assignment.child_id,
        newLevel: levelResult.newLevel,
        previousLevel: levelResult.previousLevel,
        totalXp: levelResult.totalXp
      });
    }

    // Emit achievement events
    for (const achievement of newAchievements) {
      io.to(`user:${assignment.child_id}`).emit('achievement:unlocked', {
        childId: assignment.child_id,
        achievementId: achievement.id,
        achievementName: achievement.name,
        tier: achievement.tier,
        pointsReward: achievement.points_reward
      });
    }

    // Emit streak update
    io.to(familyRoom).emit('streak:updated', {
      childId: assignment.child_id,
      currentStreak: streakResult.currentStreak,
      isNewRecord: streakResult.isNewRecord,
      streakAtRisk: false
    });

    return updated;
  }
}
```

### Scaling Socket.io with Redis

```typescript
// backend/src/socket/scaling.ts

/**
 * For horizontal scaling, Socket.io uses Redis adapter.
 * This ensures events are broadcast across all server instances.
 *
 * Architecture:
 * ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
 * │  Server 1   │     │  Server 2   │     │  Server 3   │
 * │  Socket.io  │     │  Socket.io  │     │  Socket.io  │
 * └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
 *        │                   │                   │
 *        └───────────────────┼───────────────────┘
 *                            │
 *                     ┌──────▼──────┐
 *                     │    Redis    │
 *                     │   Pub/Sub   │
 *                     └─────────────┘
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

export function createRedisAdapter() {
  const pubClient = new Redis(process.env.REDIS_URL!, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  });

  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
  subClient.on('error', (err) => console.error('Redis Sub Error:', err));

  return createAdapter(pubClient, subClient);
}

// Usage in socket server initialization:
// io.adapter(createRedisAdapter());
```

---

## Error Recovery & Conflict Resolution

Offline-first apps must handle sync failures and data conflicts gracefully. This section covers comprehensive error recovery strategies.

### Sync Failure Handling

```typescript
// lib/sync/syncManager.ts

interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
  conflictResolution?: 'client_wins' | 'server_wins' | 'manual';
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 15000, 30000]; // Exponential backoff

export class SyncManager {
  private isProcessing = false;
  private syncQueue: SyncQueueItem[] = [];

  async processSyncQueue(): Promise<SyncResult> {
    if (this.isProcessing) {
      return { status: 'already_processing' };
    }

    this.isProcessing = true;
    const results: SyncItemResult[] = [];

    try {
      // Get pending items from IndexedDB
      const items = await db.syncQueue
        .orderBy('timestamp')
        .filter(item => item.retryCount < MAX_RETRIES)
        .toArray();

      for (const item of items) {
        const result = await this.syncItem(item);
        results.push(result);

        if (result.status === 'conflict') {
          // Handle conflict based on resolution strategy
          await this.handleConflict(item, result);
        } else if (result.status === 'failed') {
          // Update retry count
          await this.handleFailure(item, result.error);
        } else if (result.status === 'success') {
          // Remove from queue
          await db.syncQueue.delete(item.id);
        }
      }

      return { status: 'completed', results };
    } finally {
      this.isProcessing = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<SyncItemResult> {
    try {
      const response = await this.makeRequest(item);

      // Check for conflict (409 status)
      if (response.status === 409) {
        return {
          status: 'conflict',
          item,
          serverData: response.data.serverVersion,
          clientData: item.payload
        };
      }

      // Success
      return {
        status: 'success',
        item,
        serverData: response.data
      };

    } catch (error: any) {
      // Network error or server error
      return {
        status: 'failed',
        item,
        error: error.message || 'Unknown error'
      };
    }
  }

  private async makeRequest(item: SyncQueueItem): Promise<any> {
    const endpoints: Record<string, Record<string, string>> = {
      task: {
        create: '/tasks',
        update: '/tasks/:id',
        delete: '/tasks/:id'
      },
      assignment: {
        create: '/assignments',
        update: '/assignments/:id',
        delete: '/assignments/:id'
      }
    };

    const endpoint = endpoints[item.entity][item.action].replace(':id', item.entityId);

    switch (item.action) {
      case 'create':
        return api.post(endpoint, item.payload);
      case 'update':
        return api.put(endpoint, item.payload);
      case 'delete':
        return api.delete(endpoint);
    }
  }

  private async handleFailure(item: SyncQueueItem, error: string): Promise<void> {
    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= MAX_RETRIES) {
      // Move to dead letter queue
      await db.syncDeadLetter.add({
        ...item,
        failedAt: new Date(),
        lastError: error
      });

      await db.syncQueue.delete(item.id);

      // Notify user of permanent failure
      this.notifyPermanentFailure(item);
    } else {
      // Update retry count and schedule next attempt
      await db.syncQueue.update(item.id, {
        retryCount: newRetryCount,
        lastError: error,
        nextRetryAt: new Date(Date.now() + RETRY_DELAYS[newRetryCount - 1])
      });
    }
  }

  private notifyPermanentFailure(item: SyncQueueItem): void {
    toast.error('Sync Failed', {
      description: `Could not sync ${item.entity}. The change has been saved locally.`,
      action: {
        label: 'Retry',
        onClick: () => this.retrySingleItem(item.id)
      }
    });
  }

  async retrySingleItem(itemId: string): Promise<void> {
    // Move from dead letter back to queue
    const item = await db.syncDeadLetter.get(itemId);
    if (item) {
      await db.syncQueue.add({ ...item, retryCount: 0 });
      await db.syncDeadLetter.delete(itemId);
      await this.processSyncQueue();
    }
  }
}
```

### Conflict Resolution Strategies

```typescript
// lib/sync/conflictResolver.ts

interface ConflictData<T> {
  clientVersion: T;
  serverVersion: T;
  baseVersion?: T; // Original version before changes
  clientTimestamp: Date;
  serverTimestamp: Date;
}

type ResolutionStrategy = 'client_wins' | 'server_wins' | 'latest_wins' | 'merge' | 'manual';

export class ConflictResolver {
  /**
   * Default resolution strategies by entity type
   */
  private defaultStrategies: Record<string, ResolutionStrategy> = {
    task: 'server_wins',        // Parent's task changes take precedence
    assignment: 'latest_wins',  // Most recent completion wins
    points: 'server_wins',      // Server is source of truth for points
    reward: 'server_wins'       // Parent controls rewards
  };

  async resolve<T>(
    entity: string,
    conflict: ConflictData<T>,
    strategy?: ResolutionStrategy
  ): Promise<ResolvedConflict<T>> {
    const resolveStrategy = strategy || this.defaultStrategies[entity] || 'server_wins';

    switch (resolveStrategy) {
      case 'client_wins':
        return this.resolveClientWins(conflict);

      case 'server_wins':
        return this.resolveServerWins(conflict);

      case 'latest_wins':
        return this.resolveLatestWins(conflict);

      case 'merge':
        return this.resolveMerge(entity, conflict);

      case 'manual':
        return this.resolveManual(conflict);

      default:
        return this.resolveServerWins(conflict);
    }
  }

  private resolveClientWins<T>(conflict: ConflictData<T>): ResolvedConflict<T> {
    return {
      resolvedData: conflict.clientVersion,
      resolution: 'client_wins',
      requiresServerUpdate: true
    };
  }

  private resolveServerWins<T>(conflict: ConflictData<T>): ResolvedConflict<T> {
    return {
      resolvedData: conflict.serverVersion,
      resolution: 'server_wins',
      requiresLocalUpdate: true
    };
  }

  private resolveLatestWins<T>(conflict: ConflictData<T>): ResolvedConflict<T> {
    const clientIsNewer = conflict.clientTimestamp > conflict.serverTimestamp;

    return {
      resolvedData: clientIsNewer ? conflict.clientVersion : conflict.serverVersion,
      resolution: clientIsNewer ? 'client_wins' : 'server_wins',
      requiresServerUpdate: clientIsNewer,
      requiresLocalUpdate: !clientIsNewer
    };
  }

  private resolveMerge<T>(entity: string, conflict: ConflictData<T>): ResolvedConflict<T> {
    // Entity-specific merge logic
    const mergers: Record<string, (c: ConflictData<any>) => any> = {
      task: this.mergeTask.bind(this),
      assignment: this.mergeAssignment.bind(this)
    };

    const merger = mergers[entity];
    if (!merger) {
      // Fall back to server wins if no merger defined
      return this.resolveServerWins(conflict);
    }

    const mergedData = merger(conflict);
    return {
      resolvedData: mergedData,
      resolution: 'merged',
      requiresServerUpdate: true,
      requiresLocalUpdate: true
    };
  }

  private mergeTask(conflict: ConflictData<Task>): Task {
    const { clientVersion, serverVersion } = conflict;

    // Merge non-conflicting fields
    return {
      ...serverVersion,
      // Client changes to description are preserved if server didn't change it
      description: serverVersion.description === conflict.baseVersion?.description
        ? clientVersion.description
        : serverVersion.description,
      // Same for other text fields
      // Server always wins on: points, due_date, status (controlled by parent)
    };
  }

  private mergeAssignment(conflict: ConflictData<TaskAssignment>): TaskAssignment {
    const { clientVersion, serverVersion } = conflict;

    // For assignments, prefer the most "advanced" status
    const statusPriority = ['pending', 'in_progress', 'completed', 'approved', 'rejected'];
    const clientPriority = statusPriority.indexOf(clientVersion.status);
    const serverPriority = statusPriority.indexOf(serverVersion.status);

    return {
      ...serverVersion,
      status: clientPriority > serverPriority ? clientVersion.status : serverVersion.status,
      completed_at: clientVersion.completed_at || serverVersion.completed_at
    };
  }

  private resolveManual<T>(conflict: ConflictData<T>): ResolvedConflict<T> {
    // Flag for manual resolution - UI will prompt user
    return {
      resolvedData: conflict.serverVersion, // Temporary
      resolution: 'pending_manual',
      requiresUserInput: true,
      conflictDetails: conflict
    };
  }
}

interface ResolvedConflict<T> {
  resolvedData: T;
  resolution: string;
  requiresServerUpdate?: boolean;
  requiresLocalUpdate?: boolean;
  requiresUserInput?: boolean;
  conflictDetails?: ConflictData<T>;
}
```

### Manual Conflict Resolution UI

```typescript
// components/sync/ConflictResolutionModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConflictResolutionModalProps {
  conflict: {
    entity: string;
    clientVersion: any;
    serverVersion: any;
    fieldDiffs: FieldDiff[];
  };
  onResolve: (resolution: 'client' | 'server' | 'merged', mergedData?: any) => void;
  onCancel: () => void;
}

interface FieldDiff {
  field: string;
  label: string;
  clientValue: any;
  serverValue: any;
}

export function ConflictResolutionModal({
  conflict,
  onResolve,
  onCancel
}: ConflictResolutionModalProps) {
  const [selections, setSelections] = useState<Record<string, 'client' | 'server'>>({});

  const handleFieldSelect = (field: string, source: 'client' | 'server') => {
    setSelections(prev => ({ ...prev, [field]: source }));
  };

  const handleMergeResolve = () => {
    const mergedData = { ...conflict.serverVersion };

    for (const diff of conflict.fieldDiffs) {
      const source = selections[diff.field] || 'server';
      mergedData[diff.field] = source === 'client'
        ? conflict.clientVersion[diff.field]
        : conflict.serverVersion[diff.field];
    }

    onResolve('merged', mergedData);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Resolve Sync Conflict</h2>
            <p className="text-gray-600 mt-1">
              This {conflict.entity} was modified both on this device and on another device.
              Choose which version to keep for each field.
            </p>
          </div>

          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <div className="space-y-4">
              {conflict.fieldDiffs.map(diff => (
                <div key={diff.field} className="border rounded-lg p-4">
                  <p className="font-medium mb-3">{diff.label}</p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Client version */}
                    <button
                      onClick={() => handleFieldSelect(diff.field, 'client')}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        selections[diff.field] === 'client'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <p className="text-xs text-gray-500 mb-1">Your version (this device)</p>
                      <p className="font-medium">{formatValue(diff.clientValue)}</p>
                    </button>

                    {/* Server version */}
                    <button
                      onClick={() => handleFieldSelect(diff.field, 'server')}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        selections[diff.field] === 'server' || !selections[diff.field]
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <p className="text-xs text-gray-500 mb-1">Server version</p>
                      <p className="font-medium">{formatValue(diff.serverValue)}</p>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => onResolve('server')}>
              Keep Server Version
            </Button>
            <Button variant="secondary" onClick={() => onResolve('client')}>
              Keep My Version
            </Button>
            <Button onClick={handleMergeResolve}>
              Apply Merged Version
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '(empty)';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
```

### Sync Status Indicator

```typescript
// components/sync/SyncStatusIndicator.tsx
export function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status.status);
      setPendingCount(status.pendingCount);
      setFailedCount(status.failedCount);
    });

    return unsubscribe;
  }, []);

  const statusConfig = {
    synced: { icon: CheckCircle, color: 'text-green-500', label: 'Synced' },
    syncing: { icon: RefreshCw, color: 'text-blue-500', label: 'Syncing...', animate: true },
    pending: { icon: Clock, color: 'text-yellow-500', label: `${pendingCount} pending` },
    error: { icon: AlertTriangle, color: 'text-red-500', label: `${failedCount} failed` },
    offline: { icon: WifiOff, color: 'text-gray-500', label: 'Offline' }
  };

  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon
        className={cn(
          'w-4 h-4',
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      <span className={config.color}>{config.label}</span>

      {failedCount > 0 && (
        <button
          onClick={() => syncManager.retryFailed()}
          className="text-xs text-blue-600 hover:underline"
        >
          Retry all
        </button>
      )}
    </div>
  );
}
```

---

## Security & Privacy

### Authentication Best Practices

```typescript
// Backend: Token generation
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class AuthService {
  async login(email: string, password: string) {
    const user = await db.users.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const accessToken = jwt.sign(
      { userId: user.id, familyId: user.family_id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Store refresh token hash in database
    await db.refreshTokens.create({
      user_id: user.id,
      token_hash: await bcrypt.hash(refreshToken, 10),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return { accessToken, refreshToken, user };
  }

  async verifyToken(token: string) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
```

### Family Isolation Middleware

```typescript
// Backend: Ensure users can only access their family's data
export async function familyIsolationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user; // Set by authentication middleware
  
  // Extract family_id from request (query, params, or body)
  const requestedFamilyId = req.params.familyId || req.body.familyId;
  
  if (requestedFamilyId && requestedFamilyId !== user.familyId) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access to other families is forbidden' }
    });
  }

  // Auto-inject family_id into queries
  req.familyId = user.familyId;
  next();
}
```

### Role-Based Access Control

```typescript
// Backend: RBAC middleware
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }
    
    next();
  };
}

// Usage:
router.post('/tasks', requireRole('parent'), createTask);
router.put('/assignments/:id/approve', requireRole('parent'), approveTask);
router.put('/assignments/:id/complete', requireRole('child', 'parent'), completeTask);
```

### Input Validation

```typescript
// Backend: Zod validation
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['cleaning', 'homework', 'outdoor', 'other']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  pointsValue: z.number().int().min(1).max(1000),
  dueDate: z.string().datetime().optional(),
  requiresPhotoEvidence: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  assignedTo: z.array(z.string().uuid()).min(1)
});

// Middleware
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            details: error.errors
          }
        });
      }
      next(error);
    }
  };
}

// Usage:
router.post('/tasks', validate(createTaskSchema), createTask);
```

### Data Privacy & COPPA Compliance

```typescript
// 1. Parental consent required for children
export async function createChildAccount(parentId: string, childData: ChildData) {
  // Verify parent owns this family
  const parent = await db.users.findById(parentId);
  
  // Create child account with parent_consent flag
  const child = await db.users.create({
    ...childData,
    family_id: parent.family_id,
    role: 'child',
    parent_consent: true,
    parent_consent_date: new Date()
  });

  return child;
}

// 2. Minimal data collection
// Only collect: first name, age, avatar (optional)
// No email/phone for children

// 3. Parent can export/delete all child data
export async function exportFamilyData(familyId: string) {
  const data = {
    family: await db.families.findById(familyId),
    members: await db.users.find({ family_id: familyId }),
    tasks: await db.tasks.find({ family_id: familyId }),
    // ... all related data
  };

  return generateCSV(data);
}

export async function deleteFamilyData(familyId: string) {
  // Soft delete all family data
  await db.transaction(async (trx) => {
    await trx.families.update(familyId, { deleted_at: new Date() });
    await trx.users.updateMany({ family_id: familyId }, { deleted_at: new Date() });
    await trx.tasks.updateMany({ family_id: familyId }, { deleted_at: new Date() });
    // ... cascade to all related tables
  });
}
```

---

## Photo Evidence Handling

Task evidence photos require careful handling for security, storage efficiency, and child safety.

### Image Upload Configuration

```typescript
// lib/upload/config.ts

export const UPLOAD_CONFIG = {
  // File size limits
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB original
  maxCompressedSizeBytes: 2 * 1024 * 1024, // 2MB after compression

  // Image dimensions
  maxDimension: 2048, // Max width or height
  thumbnailSize: 300,

  // Allowed types
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic', // iOS
    'image/heif'  // iOS
  ],

  // Compression settings
  compression: {
    quality: 0.8,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  },

  // Storage paths
  storagePaths: {
    evidence: 'evidence/{familyId}/{assignmentId}/{filename}',
    thumbnails: 'thumbnails/{familyId}/{assignmentId}/{filename}'
  }
};
```

### Client-Side Image Processing

```typescript
// lib/upload/imageProcessor.ts
import imageCompression from 'browser-image-compression';

interface ProcessedImage {
  file: File;
  thumbnail: Blob;
  dimensions: { width: number; height: number };
  originalSize: number;
  compressedSize: number;
}

export class ImageProcessor {
  private config = UPLOAD_CONFIG;

  async processImage(file: File): Promise<ProcessedImage> {
    // Validate file type
    if (!this.config.allowedMimeTypes.includes(file.type)) {
      throw new ValidationError(`File type ${file.type} not allowed. Please use JPEG, PNG, or WebP.`);
    }

    // Validate file size
    if (file.size > this.config.maxFileSizeBytes) {
      throw new ValidationError(`File too large. Maximum size is ${this.config.maxFileSizeBytes / 1024 / 1024}MB.`);
    }

    // Get original dimensions
    const originalDimensions = await this.getImageDimensions(file);

    // Compress image
    const compressedFile = await imageCompression(file, {
      maxSizeMB: this.config.maxCompressedSizeBytes / 1024 / 1024,
      maxWidthOrHeight: this.config.compression.maxWidthOrHeight,
      useWebWorker: this.config.compression.useWebWorker,
      fileType: 'image/jpeg' // Convert all to JPEG for consistency
    });

    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(compressedFile);

    return {
      file: compressedFile,
      thumbnail,
      dimensions: originalDimensions,
      originalSize: file.size,
      compressedSize: compressedFile.size
    };
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateThumbnail(file: File): Promise<Blob> {
    const thumbnail = await imageCompression(file, {
      maxSizeMB: 0.1, // 100KB max for thumbnails
      maxWidthOrHeight: this.config.thumbnailSize,
      useWebWorker: true,
      fileType: 'image/jpeg'
    });
    return thumbnail;
  }

  /**
   * Strip EXIF data for privacy (location, device info, etc.)
   */
  async stripExifData(file: File): Promise<File> {
    // Use canvas to re-encode image without EXIF
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    });
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}
```

### Upload to Cloudflare R2

```typescript
// backend/src/services/storageService.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    });
    this.bucketName = process.env.R2_BUCKET_NAME!;
    this.publicUrl = process.env.R2_PUBLIC_URL!;
  }

  async uploadEvidence(
    familyId: string,
    assignmentId: string,
    file: Buffer,
    mimeType: string
  ): Promise<UploadResult> {
    const filename = `${Date.now()}-${crypto.randomUUID()}.jpg`;
    const key = `evidence/${familyId}/${assignmentId}/${filename}`;
    const thumbnailKey = `thumbnails/${familyId}/${assignmentId}/${filename}`;

    // Process image with sharp (server-side validation)
    const processed = await this.processImageServer(file);

    // Upload main image
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: processed.image,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000' // 1 year cache
    }));

    // Upload thumbnail
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: thumbnailKey,
      Body: processed.thumbnail,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000'
    }));

    return {
      key,
      thumbnailKey,
      url: `${this.publicUrl}/${key}`,
      thumbnailUrl: `${this.publicUrl}/${thumbnailKey}`,
      size: processed.image.length,
      dimensions: processed.dimensions
    };
  }

  private async processImageServer(buffer: Buffer): Promise<{
    image: Buffer;
    thumbnail: Buffer;
    dimensions: { width: number; height: number };
  }> {
    // Validate it's actually an image
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new ValidationError('Invalid image file');
    }

    // Strip EXIF and resize if needed
    const image = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate thumbnail
    const thumbnail = await sharp(buffer)
      .rotate()
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const processedMeta = await sharp(image).metadata();

    return {
      image,
      thumbnail,
      dimensions: {
        width: processedMeta.width!,
        height: processedMeta.height!
      }
    };
  }

  async deleteEvidence(key: string, thumbnailKey: string): Promise<void> {
    await Promise.all([
      this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })),
      this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey
      }))
    ]);
  }

  /**
   * Generate presigned URL for direct upload (optional, for larger files)
   */
  async getPresignedUploadUrl(
    familyId: string,
    assignmentId: string
  ): Promise<{ uploadUrl: string; key: string }> {
    const filename = `${Date.now()}-${crypto.randomUUID()}.jpg`;
    const key = `evidence/${familyId}/${assignmentId}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: 'image/jpeg'
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600 // 1 hour
    });

    return { uploadUrl, key };
  }
}

interface UploadResult {
  key: string;
  thumbnailKey: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  dimensions: { width: number; height: number };
}
```

### Content Moderation

```typescript
// backend/src/services/moderationService.ts

/**
 * Content moderation for uploaded images.
 * Uses a combination of automated checks and manual review queue.
 */
export class ModerationService {
  /**
   * Automated moderation checks
   */
  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    // Option 1: Use cloud service (AWS Rekognition, Google Vision, etc.)
    const automatedResult = await this.runAutomatedChecks(imageUrl);

    if (automatedResult.flagged) {
      // Queue for manual review
      await this.queueForReview(imageUrl, automatedResult.reasons);

      return {
        status: 'flagged',
        reasons: automatedResult.reasons,
        requiresReview: true
      };
    }

    return {
      status: 'approved',
      reasons: [],
      requiresReview: false
    };
  }

  private async runAutomatedChecks(imageUrl: string): Promise<{
    flagged: boolean;
    reasons: string[];
  }> {
    // Example using AWS Rekognition (pseudo-code)
    // In production, implement actual API calls

    try {
      // Check for inappropriate content
      // const rekognition = new AWS.Rekognition();
      // const result = await rekognition.detectModerationLabels({
      //   Image: { S3Object: { Bucket, Name } }
      // }).promise();

      // For now, return safe default
      return { flagged: false, reasons: [] };

    } catch (error) {
      // If moderation fails, flag for manual review
      console.error('Moderation check failed:', error);
      return {
        flagged: true,
        reasons: ['Automated check failed - requires manual review']
      };
    }
  }

  private async queueForReview(
    imageUrl: string,
    reasons: string[]
  ): Promise<void> {
    await db.moderationQueue.create({
      image_url: imageUrl,
      flagged_reasons: reasons,
      status: 'pending',
      created_at: new Date()
    });

    // Notify admin (optional)
    // await this.notifyAdmins('New image flagged for review');
  }

  /**
   * Manual review actions
   */
  async approveImage(moderationId: string, reviewerId: string): Promise<void> {
    await db.moderationQueue.update(moderationId, {
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date()
    });

    // Update the evidence record
    const moderation = await db.moderationQueue.findById(moderationId);
    await db.taskEvidence.update(
      { file_url: moderation.image_url },
      { moderation_status: 'approved' }
    );
  }

  async rejectImage(
    moderationId: string,
    reviewerId: string,
    reason: string
  ): Promise<void> {
    const moderation = await db.moderationQueue.findById(moderationId);

    await db.moderationQueue.update(moderationId, {
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: reviewerId,
      reviewed_at: new Date()
    });

    // Delete the image from storage
    await storageService.deleteEvidence(
      moderation.file_key,
      moderation.thumbnail_key
    );

    // Update evidence record
    await db.taskEvidence.update(
      { file_url: moderation.image_url },
      { moderation_status: 'rejected' }
    );

    // Notify parent
    const evidence = await db.taskEvidence.findOne({ file_url: moderation.image_url });
    const assignment = await db.taskAssignments.findById(evidence.assignment_id);

    await notificationService.notifyParents(assignment.family_id, {
      type: 'moderation_rejected',
      title: 'Task Evidence Rejected',
      message: `An uploaded photo was removed: ${reason}`
    });
  }
}

interface ModerationResult {
  status: 'approved' | 'flagged' | 'rejected';
  reasons: string[];
  requiresReview: boolean;
}
```

### Evidence Upload Component

```typescript
// components/child/EvidenceUpload.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface EvidenceUploadProps {
  assignmentId: string;
  onUploadComplete: (evidence: TaskEvidence) => void;
}

export function EvidenceUpload({ assignmentId, onUploadComplete }: EvidenceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const imageProcessor = new ImageProcessor();

  const processAndUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      // Process image client-side
      setProgress(10);
      const processed = await imageProcessor.processImage(file);

      // Strip EXIF for privacy
      setProgress(30);
      const sanitized = await imageProcessor.stripExifData(processed.file);

      // Create preview
      const previewUrl = URL.createObjectURL(sanitized);
      setPreview(previewUrl);

      // Upload to server
      setProgress(50);
      const formData = new FormData();
      formData.append('image', sanitized);
      formData.append('thumbnail', processed.thumbnail);
      formData.append('assignmentId', assignmentId);

      const response = await api.post('/assignments/evidence', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded / (e.total || 1)) * 50) + 50;
          setProgress(percent);
        }
      });

      setProgress(100);
      onUploadComplete(response.data);

      toast.success('Photo uploaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif']
    },
    maxFiles: 1,
    disabled: uploading,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await processAndUpload(acceptedFiles[0]);
      }
    }
  });

  const handleCameraCapture = async () => {
    // Open camera for mobile devices
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await processAndUpload(file);
      }
    };

    input.click();
  };

  const clearPreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    setError(null);
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Evidence preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          {!uploading && (
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Uploading... {progress}%</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            uploading && 'pointer-events-none opacity-50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">
            {isDragActive
              ? 'Drop your photo here...'
              : 'Drag and drop a photo, or click to select'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPEG, PNG, or WebP up to 10MB
          </p>
        </div>
      )}

      {/* Camera button for mobile */}
      <Button
        onClick={handleCameraCapture}
        disabled={uploading}
        variant="outline"
        className="w-full"
      >
        <Camera className="w-4 h-4 mr-2" />
        Take a Photo
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Rate Limiting

```typescript
// Backend: Rate limiting with Redis
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per window
  skipSuccessfulRequests: true
});

// Usage:
app.use('/api', apiLimiter);
app.use('/auth/login', authLimiter);
```

---

## Accessibility Implementation

TaskBuddy must be accessible to all users, including those with disabilities. This section provides practical WCAG 2.1 AA implementation guidance.

### Accessibility Principles

```typescript
// lib/accessibility/constants.ts

/**
 * WCAG 2.1 AA Requirements for TaskBuddy:
 *
 * 1. PERCEIVABLE
 *    - Text alternatives for images
 *    - Captions for video content
 *    - Color contrast ratios (4.5:1 for normal text, 3:1 for large text)
 *    - Text resizable up to 200%
 *
 * 2. OPERABLE
 *    - All functionality keyboard accessible
 *    - No keyboard traps
 *    - Skip navigation links
 *    - Focus management
 *    - Sufficient time for timed actions
 *
 * 3. UNDERSTANDABLE
 *    - Readable text (appropriate reading level for age group)
 *    - Predictable navigation
 *    - Input assistance and error handling
 *
 * 4. ROBUST
 *    - Valid HTML
 *    - Compatible with assistive technologies
 */

export const A11Y_CONFIG = {
  // Minimum contrast ratios
  contrast: {
    normalText: 4.5,
    largeText: 3.0,
    uiComponents: 3.0
  },

  // Focus visible styles
  focusStyles: {
    outline: '2px solid #2563eb',
    outlineOffset: '2px'
  },

  // Animation preferences
  reducedMotion: {
    respectPreference: true,
    fallbackDuration: 0
  },

  // Touch targets
  minTouchTarget: 44 // pixels
};
```

### Accessible Component Patterns

#### Accessible Button

```typescript
// components/ui/AccessibleButton.tsx
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          // Minimum touch target (44x44px)
          'min-h-[44px] min-w-[44px]',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Size variants
          size === 'sm' && 'px-3 py-1.5 text-sm rounded-md',
          size === 'md' && 'px-4 py-2 text-base rounded-lg',
          size === 'lg' && 'px-6 py-3 text-lg rounded-xl',
          // Color variants with proper contrast
          variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
          variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
          variant === 'outline' && 'border-2 border-gray-300 hover:border-gray-400',
          variant === 'ghost' && 'hover:bg-gray-100',
          className
        )}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="mr-2" aria-hidden="true">
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
        )}
        {children}
        {loading && <span className="sr-only">Loading...</span>}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
```

#### Accessible Task Card

```typescript
// components/child/AccessibleTaskCard.tsx
import { useId } from 'react';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onDetails: () => void;
}

export function TaskCard({ task, onComplete, onDetails }: TaskCardProps) {
  const titleId = useId();
  const descId = useId();
  const statusId = useId();

  // Format due date for screen readers
  const dueDateText = task.dueDate
    ? `Due ${formatRelativeDate(task.dueDate)}`
    : 'No due date';

  return (
    <article
      className="bg-white rounded-lg border p-4 focus-within:ring-2 focus-within:ring-blue-500"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* Visual difficulty badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded',
            task.difficulty === 'easy' && 'bg-green-100 text-green-800',
            task.difficulty === 'medium' && 'bg-yellow-100 text-yellow-800',
            task.difficulty === 'hard' && 'bg-red-100 text-red-800'
          )}
          // Announce difficulty level to screen readers
          aria-label={`Difficulty: ${task.difficulty}`}
        >
          {task.difficulty}
        </span>

        {/* Points display */}
        <span
          className="font-bold text-blue-600"
          aria-label={`${task.pointsValue} points reward`}
        >
          {task.pointsValue} pts
        </span>
      </div>

      {/* Task title - clickable for details */}
      <h3 id={titleId} className="text-lg font-semibold mb-1">
        <button
          onClick={onDetails}
          className="text-left hover:text-blue-600 focus:outline-none focus:underline"
        >
          {task.title}
        </button>
      </h3>

      {/* Description */}
      <p id={descId} className="text-gray-600 text-sm mb-3">
        {task.description}
      </p>

      {/* Due date - visually hidden text for context */}
      <p className="text-sm text-gray-500 mb-3">
        <time dateTime={task.dueDate?.toISOString()}>
          {dueDateText}
        </time>
      </p>

      {/* Status for screen readers */}
      <span id={statusId} className="sr-only">
        Task status: {task.status}
      </span>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onComplete}
          variant="primary"
          aria-describedby={titleId}
        >
          <Check className="w-4 h-4 mr-1" aria-hidden="true" />
          Mark Complete
        </Button>

        <Button
          onClick={onDetails}
          variant="outline"
          aria-label={`View details for ${task.title}`}
        >
          Details
        </Button>
      </div>
    </article>
  );
}
```

### Screen Reader Announcements

```typescript
// lib/accessibility/announcer.ts
import { useEffect, useRef } from 'react';

/**
 * Live region announcer for dynamic content updates
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region element
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only'; // Visually hidden
    document.body.appendChild(announcer);
    announcerRef.current = announcer;

    return () => {
      document.body.removeChild(announcer);
    };
  }, []);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      // Clear and set to trigger announcement
      announcerRef.current.textContent = '';
      requestAnimationFrame(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
        }
      });
    }
  };

  return announce;
}

// Usage in components
export function PointsEarnedAnimation({ points, onComplete }: { points: number; onComplete: () => void }) {
  const announce = useAnnouncer();

  useEffect(() => {
    // Announce to screen readers
    announce(`You earned ${points} points!`, 'assertive');
  }, [points, announce]);

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      onAnimationComplete={onComplete}
      // Hide decorative animation from screen readers
      aria-hidden="true"
    >
      +{points}
    </motion.div>
  );
}
```

### Accessible Animations

```typescript
// components/animations/AccessibleConfetti.tsx
import { useReducedMotion } from 'framer-motion';

export function ConfettiAnimation({ show, onComplete }: { show: boolean; onComplete: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const announce = useAnnouncer();

  useEffect(() => {
    if (show) {
      announce('Celebration! Great job completing your task!');

      // Skip animation for reduced motion preference
      if (prefersReducedMotion) {
        onComplete();
      }
    }
  }, [show, prefersReducedMotion, announce, onComplete]);

  // Don't render confetti if user prefers reduced motion
  if (prefersReducedMotion || !show) {
    return null;
  }

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-50">
      {/* Confetti particles */}
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: '50vw',
            y: '50vh',
            scale: 0
          }}
          animate={{
            x: `${Math.random() * 100}vw`,
            y: `${Math.random() * 100}vh`,
            scale: [0, 1, 0],
            rotate: Math.random() * 720
          }}
          transition={{
            duration: 2,
            delay: Math.random() * 0.5,
            ease: 'easeOut'
          }}
          onAnimationComplete={i === 0 ? onComplete : undefined}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'][
              Math.floor(Math.random() * 5)
            ]
          }}
        />
      ))}
    </div>
  );
}
```

### Focus Management

```typescript
// lib/accessibility/focusManagement.ts

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}

/**
 * Return focus to trigger element when modal closes
 */
export function useReturnFocus(isOpen: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      triggerRef.current = document.activeElement as HTMLElement;
    } else if (triggerRef.current) {
      // Return focus when closing
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);
}
```

### Skip Navigation

```typescript
// components/layout/SkipNavigation.tsx
export function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only focus:not-sr-only',
        'fixed top-4 left-4 z-[100]',
        'bg-blue-600 text-white px-4 py-2 rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-white'
      )}
    >
      Skip to main content
    </a>
  );
}

// In layout
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipNavigation />
      <header>
        <Navigation />
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
```

### Color Contrast Utilities

```typescript
// lib/accessibility/colorContrast.ts

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG requirements
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 }
  };

  const required = isLargeText
    ? requirements[level].large
    : requirements[level].normal;

  return ratio >= required;
}

// Color palette with accessible combinations
export const accessibleColors = {
  // Primary text on white background (passes AA)
  text: {
    primary: '#1f2937',   // gray-800 - 12.6:1 ratio
    secondary: '#4b5563', // gray-600 - 5.9:1 ratio
    muted: '#6b7280'      // gray-500 - 4.6:1 ratio
  },

  // Status colors with sufficient contrast
  status: {
    success: {
      bg: '#dcfce7',      // green-100
      text: '#166534'     // green-800 - 7.1:1 ratio
    },
    warning: {
      bg: '#fef3c7',      // amber-100
      text: '#92400e'     // amber-800 - 5.4:1 ratio
    },
    error: {
      bg: '#fee2e2',      // red-100
      text: '#991b1b'     // red-800 - 6.4:1 ratio
    },
    info: {
      bg: '#dbeafe',      // blue-100
      text: '#1e40af'     // blue-800 - 6.9:1 ratio
    }
  }
};
```

### Accessible Form Inputs

```typescript
// components/ui/AccessibleInput.tsx
import { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [
      error && errorId,
      hint && hintId
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>

        {hint && (
          <p id={hintId} className="text-sm text-gray-500">
            {hint}
          </p>
        )}

        <input
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            error
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300',
            className
          )}
          {...props}
        />

        {error && (
          <p id={errorId} className="text-sm text-red-600" role="alert">
            <span className="sr-only">Error: </span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

---

## Testing Strategy

### Testing Pyramid

```
                 ┌─────────────┐
                 │   E2E Tests │
                 │   (5-10%)   │
                 └─────────────┘
              ┌──────────────────┐
              │ Integration Tests│
              │     (20-30%)     │
              └──────────────────┘
          ┌────────────────────────┐
          │      Unit Tests        │
          │       (60-70%)         │
          └────────────────────────┘
```

### Unit Tests (Backend)

```typescript
// tests/services/taskService.test.ts
import { TaskService } from '@/services/taskService';
import { db } from '@/lib/db';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
  });

  afterEach(async () => {
    await db.tasks.deleteMany({});
  });

  describe('createTask', () => {
    it('should create a task with valid data', async () => {
      const taskData = {
        title: 'Clean room',
        familyId: 'family-123',
        createdBy: 'parent-123',
        pointsValue: 25,
      };

      const task = await taskService.createTask(taskData);

      expect(task).toBeDefined();
      expect(task.title).toBe('Clean room');
      expect(task.pointsValue).toBe(25);
    });

    it('should reject task with invalid points', async () => {
      const taskData = {
        title: 'Clean room',
        familyId: 'family-123',
        createdBy: 'parent-123',
        pointsValue: -10, // Invalid
      };

      await expect(taskService.createTask(taskData)).rejects.toThrow();
    });
  });

  describe('assignTask', () => {
    it('should create assignments for all children', async () => {
      const task = await taskService.createTask({
        title: 'Clean room',
        familyId: 'family-123',
        createdBy: 'parent-123',
        pointsValue: 25,
      });

      const assignments = await taskService.assignTask(task.id, [
        'child-1',
        'child-2',
      ]);

      expect(assignments).toHaveLength(2);
      expect(assignments[0].taskId).toBe(task.id);
    });
  });
});
```

### Integration Tests (API)

```typescript
// tests/api/tasks.integration.test.ts
import request from 'supertest';
import { app } from '@/app';
import { generateAuthToken } from '@/tests/helpers';

describe('POST /api/v1/tasks', () => {
  let parentToken: string;

  beforeEach(async () => {
    parentToken = await generateAuthToken({ role: 'parent' });
  });

  it('should create a task with authentication', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        title: 'Clean room',
        pointsValue: 25,
        assignedTo: ['child-123'],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.task.title).toBe('Clean room');
  });

  it('should reject request without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .send({
        title: 'Clean room',
        pointsValue: 25,
      });

    expect(response.status).toBe(401);
  });

  it('should reject child creating tasks', async () => {
    const childToken = await generateAuthToken({ role: 'child' });

    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        title: 'Clean room',
        pointsValue: 25,
      });

    expect(response.status).toBe(403);
  });
});
```

### Component Tests (Frontend)

```typescript
// tests/components/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '@/components/child/TaskCard';

describe('TaskCard', () => {
  const mockTask = {
    id: 'task-123',
    title: 'Clean room',
    description: 'Vacuum and organize',
    pointsValue: 25,
    dueDate: new Date('2026-01-27'),
    category: 'cleaning',
    difficulty: 'medium',
  };

  it('renders task information correctly', () => {
    render(
      <TaskCard task={mockTask} ageGroup="10-12" onComplete={() => {}} />
    );

    expect(screen.getByText('Clean room')).toBeInTheDocument();
    expect(screen.getByText('Vacuum and organize')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('calls onComplete when button is clicked', () => {
    const handleComplete = jest.fn();

    render(
      <TaskCard task={mockTask} ageGroup="10-12" onComplete={handleComplete} />
    );

    fireEvent.click(screen.getByText('Done!'));
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it('renders age-appropriate UI for younger kids', () => {
    render(
      <TaskCard task={mockTask} ageGroup="10-12" onComplete={() => {}} />
    );

    // Should have more colorful, playful design
    expect(screen.getByText('Done!')).toBeInTheDocument();
  });

  it('renders mature UI for older kids', () => {
    render(
      <TaskCard task={mockTask} ageGroup="13-16" onComplete={() => {}} />
    );

    // Should have cleaner design
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument(); // Difficulty badge
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/task-completion-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Completion Flow', () => {
  test('child can complete a task and earn points', async ({ page }) => {
    // Login as child
    await page.goto('/login');
    await page.fill('[name=email]', 'child@test.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');

    // Navigate to tasks
    await page.waitForURL('/child/dashboard');
    await page.click('text=View Tasks');

    // Find and complete task
    const taskCard = page.locator('[data-testid=task-card]').first();
    const pointsBefore = await page
      .locator('[data-testid=points-balance]')
      .textContent();

    await taskCard.locator('button:has-text("Done!")').click();

    // Upload photo evidence
    await page.setInputFiles(
      '[data-testid=photo-upload]',
      'tests/fixtures/room-clean.jpg'
    );
    await page.click('button:has-text("Submit")');

    // Verify task marked as completed
    await expect(taskCard).toContainText('Waiting for approval');

    // Switch to parent account
    await page.click('[data-testid=user-menu]');
    await page.click('text=Logout');

    // Login as parent
    await page.fill('[name=email]', 'parent@test.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');

    // Approve task
    await page.click('text=Pending Approvals');
    await page.click('[data-testid=approve-button]').first();

    // Verify approval notification
    await expect(page.locator('.notification')).toContainText(
      'Task approved!'
    );

    // Switch back to child and verify points
    // ... (continue test flow)
  });
});
```

### Offline Mode Tests

```typescript
// tests/e2e/offline-mode.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Offline Mode', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create a context with service worker enabled
    const context = await browser.newContext({
      serviceWorkers: 'allow'
    });
    page = await context.newPage();

    // Login first while online
    await page.goto('/login');
    await page.fill('[name=email]', 'child@test.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');
    await page.waitForURL('/child/dashboard');

    // Wait for service worker to be ready
    await page.waitForFunction(() => {
      return navigator.serviceWorker?.controller != null;
    });
  });

  test('should show offline indicator when disconnected', async () => {
    // Go offline
    await page.context().setOffline(true);

    // Wait for offline indicator to appear
    await expect(page.locator('[data-testid=offline-indicator]')).toBeVisible();
    await expect(page.locator('[data-testid=offline-indicator]')).toContainText('offline');
  });

  test('should display cached tasks when offline', async () => {
    // Load tasks while online
    await page.click('text=View Tasks');
    await page.waitForSelector('[data-testid=task-card]');

    const onlineTaskCount = await page.locator('[data-testid=task-card]').count();
    expect(onlineTaskCount).toBeGreaterThan(0);

    // Go offline
    await page.context().setOffline(true);

    // Refresh page
    await page.reload();

    // Tasks should still be visible
    const offlineTaskCount = await page.locator('[data-testid=task-card]').count();
    expect(offlineTaskCount).toBe(onlineTaskCount);
  });

  test('should queue task completion when offline', async () => {
    await page.click('text=View Tasks');
    await page.waitForSelector('[data-testid=task-card]');

    // Go offline
    await page.context().setOffline(true);

    // Complete a task
    await page.locator('[data-testid=task-card]').first().locator('button:has-text("Done")').click();

    // Should show pending sync indicator
    await expect(page.locator('[data-testid=sync-status]')).toContainText('pending');

    // Task should show as completed locally
    await expect(page.locator('[data-testid=task-card]').first()).toContainText('Pending sync');
  });

  test('should sync queued changes when coming back online', async () => {
    await page.click('text=View Tasks');
    await page.waitForSelector('[data-testid=task-card]');

    // Go offline and complete task
    await page.context().setOffline(true);
    await page.locator('[data-testid=task-card]').first().locator('button:has-text("Done")').click();

    // Come back online
    await page.context().setOffline(false);

    // Wait for sync
    await expect(page.locator('[data-testid=sync-status]')).toContainText('Synced', {
      timeout: 10000
    });

    // Task should show as completed (waiting for approval)
    await expect(page.locator('[data-testid=task-card]').first()).toContainText('Waiting for approval');
  });

  test('should handle sync conflicts gracefully', async () => {
    await page.click('text=View Tasks');
    await page.waitForSelector('[data-testid=task-card]');

    // Go offline
    await page.context().setOffline(true);

    // Complete a task
    await page.locator('[data-testid=task-card]').first().locator('button:has-text("Done")').click();

    // Simulate server-side change (would need API mock)
    // For now, just verify conflict handling UI exists
    await page.context().setOffline(false);

    // If there's a conflict, modal should appear
    // await expect(page.locator('[data-testid=conflict-modal]')).toBeVisible();
  });

  test('should preserve form data when offline', async () => {
    // Navigate to task creation (as parent)
    await page.goto('/parent/tasks/create');

    // Fill form
    await page.fill('[name=title]', 'Offline Task');
    await page.fill('[name=description]', 'Created while offline');

    // Go offline
    await page.context().setOffline(true);

    // Submit form
    await page.click('button[type=submit]');

    // Should show queued message
    await expect(page.locator('.toast')).toContainText('saved locally');

    // Navigate away and back
    await page.click('text=Dashboard');
    await page.click('text=Tasks');

    // Task should appear in list with pending status
    await expect(page.locator('[data-testid=task-card]:has-text("Offline Task")')).toBeVisible();
  });
});

// tests/unit/offlineSync.test.ts
import { SyncManager } from '@/lib/sync/syncManager';
import { db } from '@/lib/db/schema';

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(async () => {
    syncManager = new SyncManager();
    // Clear IndexedDB
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('queue management', () => {
    it('should add items to sync queue', async () => {
      await syncManager.queueChange({
        action: 'create',
        entity: 'task',
        entityId: 'new-task-id',
        payload: { title: 'Test Task' }
      });

      const queue = await db.syncQueue.toArray();
      expect(queue).toHaveLength(1);
      expect(queue[0].action).toBe('create');
    });

    it('should process queue in order', async () => {
      // Add multiple items
      await syncManager.queueChange({
        action: 'create',
        entity: 'task',
        entityId: 'task-1',
        payload: { title: 'First' }
      });

      await syncManager.queueChange({
        action: 'update',
        entity: 'task',
        entityId: 'task-1',
        payload: { title: 'Updated' }
      });

      const queue = await db.syncQueue.orderBy('timestamp').toArray();
      expect(queue[0].action).toBe('create');
      expect(queue[1].action).toBe('update');
    });

    it('should retry failed items with exponential backoff', async () => {
      const item = await syncManager.queueChange({
        action: 'create',
        entity: 'task',
        entityId: 'task-1',
        payload: { title: 'Test' }
      });

      // Simulate failure
      await syncManager.handleFailure(item.id!, 'Network error');

      const updated = await db.syncQueue.get(item.id!);
      expect(updated?.retryCount).toBe(1);
      expect(updated?.nextRetryAt).toBeDefined();
    });

    it('should move to dead letter queue after max retries', async () => {
      const item = await syncManager.queueChange({
        action: 'create',
        entity: 'task',
        entityId: 'task-1',
        payload: { title: 'Test' }
      });

      // Simulate max retries
      for (let i = 0; i < 5; i++) {
        await syncManager.handleFailure(item.id!, 'Network error');
      }

      const queueItem = await db.syncQueue.get(item.id!);
      expect(queueItem).toBeUndefined();

      const deadLetter = await db.syncDeadLetter.toArray();
      expect(deadLetter).toHaveLength(1);
    });
  });

  describe('conflict resolution', () => {
    it('should detect version conflicts', async () => {
      const result = await syncManager.syncItem({
        id: '1',
        action: 'update',
        entity: 'task',
        entityId: 'task-1',
        payload: { title: 'Client version', version: 1 },
        timestamp: new Date(),
        retryCount: 0
      });

      // Mock API returns 409 conflict
      // expect(result.status).toBe('conflict');
    });

    it('should apply server-wins resolution', async () => {
      const resolver = new ConflictResolver();
      const result = await resolver.resolve('task', {
        clientVersion: { title: 'Client' },
        serverVersion: { title: 'Server' },
        clientTimestamp: new Date(),
        serverTimestamp: new Date()
      }, 'server_wins');

      expect(result.resolvedData.title).toBe('Server');
    });

    it('should apply latest-wins resolution', async () => {
      const resolver = new ConflictResolver();
      const clientTime = new Date('2024-01-01T12:00:00Z');
      const serverTime = new Date('2024-01-01T11:00:00Z');

      const result = await resolver.resolve('assignment', {
        clientVersion: { status: 'completed' },
        serverVersion: { status: 'pending' },
        clientTimestamp: clientTime,
        serverTimestamp: serverTime
      }, 'latest_wins');

      expect(result.resolvedData.status).toBe('completed'); // Client is newer
    });
  });
});
```

### Performance Tests

```typescript
// tests/performance/api.perf.test.ts
import { test, expect } from '@playwright/test';
import autocannon from 'autocannon';

describe('API Performance', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';

  test('GET /tasks should respond under 200ms (p95)', async () => {
    const result = await autocannon({
      url: `${API_URL}/api/v1/tasks`,
      connections: 10,
      duration: 10,
      headers: {
        Authorization: `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    expect(result.latency.p95).toBeLessThan(200);
    expect(result.errors).toBe(0);
  });

  test('POST /tasks should handle 50 concurrent requests', async () => {
    const result = await autocannon({
      url: `${API_URL}/api/v1/tasks`,
      method: 'POST',
      connections: 50,
      duration: 5,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TEST_TOKEN}`
      },
      body: JSON.stringify({
        title: 'Load test task',
        pointsValue: 10,
        assignedTo: ['child-1']
      })
    });

    expect(result.non2xx).toBe(0);
    expect(result.latency.p99).toBeLessThan(500);
  });

  test('Dashboard endpoint should aggregate efficiently', async () => {
    const start = Date.now();

    const response = await fetch(`${API_URL}/api/v1/dashboard/parent`, {
      headers: {
        Authorization: `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    const duration = Date.now() - start;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(300); // Complex aggregation under 300ms
  });
});

// tests/performance/frontend.perf.test.ts
import { test, expect } from '@playwright/test';

test.describe('Frontend Performance', () => {
  test('should achieve good Core Web Vitals', async ({ page }) => {
    await page.goto('/');

    // Measure LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    // LCP should be under 2.5s for "good"
    expect(lcp).toBeLessThan(2500);
  });

  test('should load dashboard under 3 seconds on 3G', async ({ page }) => {
    // Simulate slow 3G
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (750 * 1024) / 8, // 750 kbps
      uploadThroughput: (250 * 1024) / 8,   // 250 kbps
      latency: 100
    });

    const start = Date.now();
    await page.goto('/child/dashboard');
    await page.waitForSelector('[data-testid=dashboard-loaded]');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should render 100 tasks without jank', async ({ page }) => {
    // Navigate to tasks page with many items
    await page.goto('/child/tasks?limit=100');

    // Measure frame rate during scroll
    const frameMetrics = await page.evaluate(async () => {
      const frames: number[] = [];
      let lastTime = performance.now();

      const measure = () => {
        const now = performance.now();
        const fps = 1000 / (now - lastTime);
        frames.push(fps);
        lastTime = now;
      };

      // Scroll and measure
      return new Promise<number[]>((resolve) => {
        let frameCount = 0;
        const observer = () => {
          measure();
          frameCount++;
          if (frameCount < 60) {
            requestAnimationFrame(observer);
          } else {
            resolve(frames);
          }
        };

        // Start scrolling
        window.scrollBy({ top: 1000, behavior: 'smooth' });
        requestAnimationFrame(observer);
      });
    });

    // Calculate average FPS
    const avgFps = frameMetrics.reduce((a, b) => a + b, 0) / frameMetrics.length;
    expect(avgFps).toBeGreaterThan(30); // At least 30fps during scroll
  });

  test('animations should run at 60fps', async ({ page }) => {
    await page.goto('/child/dashboard');

    // Trigger a point animation
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test:triggerAnimation'));
    });

    // Measure animation performance
    const animationMetrics = await page.evaluate(() => {
      return new Promise<{ avgFps: number; droppedFrames: number }>((resolve) => {
        const frames: number[] = [];
        let lastTime = performance.now();
        let droppedFrames = 0;

        const measure = () => {
          const now = performance.now();
          const delta = now - lastTime;
          const fps = 1000 / delta;

          if (fps < 50) droppedFrames++;
          frames.push(fps);
          lastTime = now;
        };

        let frameCount = 0;
        const observer = () => {
          measure();
          frameCount++;
          if (frameCount < 60) {
            requestAnimationFrame(observer);
          } else {
            const avgFps = frames.reduce((a, b) => a + b, 0) / frames.length;
            resolve({ avgFps, droppedFrames });
          }
        };

        requestAnimationFrame(observer);
      });
    });

    expect(animationMetrics.avgFps).toBeGreaterThan(55);
    expect(animationMetrics.droppedFrames).toBeLessThan(5);
  });
});
```

### Load Testing

```typescript
// tests/load/load-test.ts
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const taskCompletionTime = new Trend('task_completion_time');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.01'],             // Error rate under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';

export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'loadtest123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  return { token: loginRes.json('data.tokens.accessToken') };
}

export default function(data: { token: string }) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`
  };

  // Simulate realistic user journey

  // 1. Load dashboard
  const dashboardRes = http.get(`${BASE_URL}/dashboard/child`, { headers });
  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard fast': (r) => r.timings.duration < 300
  });
  errorRate.add(dashboardRes.status !== 200);

  sleep(1);

  // 2. Get today's tasks
  const tasksRes = http.get(`${BASE_URL}/assignments?status=pending`, { headers });
  check(tasksRes, {
    'tasks loaded': (r) => r.status === 200
  });
  errorRate.add(tasksRes.status !== 200);

  sleep(2);

  // 3. Complete a task (randomly)
  if (Math.random() > 0.7) {
    const tasks = tasksRes.json('data');
    if (tasks && tasks.length > 0) {
      const taskId = tasks[0].id;

      const startTime = Date.now();
      const completeRes = http.put(
        `${BASE_URL}/assignments/${taskId}/complete`,
        JSON.stringify({ completedAt: new Date().toISOString() }),
        { headers }
      );

      taskCompletionTime.add(Date.now() - startTime);

      check(completeRes, {
        'task completed': (r) => r.status === 200
      });
      errorRate.add(completeRes.status !== 200);
    }
  }

  sleep(1);

  // 4. Check points
  const pointsRes = http.get(`${BASE_URL}/children/me/points`, { headers });
  check(pointsRes, {
    'points loaded': (r) => r.status === 200
  });
  errorRate.add(pointsRes.status !== 200);

  sleep(3);

  // 5. View achievements
  const achievementsRes = http.get(`${BASE_URL}/children/me/achievements`, { headers });
  check(achievementsRes, {
    'achievements loaded': (r) => r.status === 200
  });
  errorRate.add(achievementsRes.status !== 200);

  sleep(2);
}

export function teardown(data: { token: string }) {
  // Cleanup if needed
}
```

### Accessibility Tests

```typescript
// tests/a11y/accessibility.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .include('form')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('child dashboard should be accessible', async ({ page }) => {
    // Login as child
    await page.goto('/login');
    await page.fill('[name=email]', 'child@test.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');
    await page.waitForURL('/child/dashboard');

    const results = await new AxeBuilder({ page })
      .analyze();

    // Filter out minor issues for initial development
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('all interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/child/tasks');

    // Tab through all interactive elements
    const focusableElements = await page.locator(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    for (const element of focusableElements) {
      await element.focus();
      const isFocused = await element.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    }
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/child/dashboard');

    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('animations should respect reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/child/dashboard');

    // Trigger an animation (e.g., complete a task)
    // Then check that no animation occurred
    const hasAnimations = await page.evaluate(() => {
      const animations = document.getAnimations();
      return animations.length > 0;
    });

    expect(hasAnimations).toBe(false);
  });
});
```

---

## Deployment & DevOps

### Environment Variables

```bash
# .env.example

# App
NODE_ENV=production
APP_URL=https://taskbuddy.com
API_URL=https://api.taskbuddy.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/taskbuddy
DIRECT_URL=postgresql://user:pass@host:5432/taskbuddy

# Redis
REDIS_URL=redis://:password@host:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret
SESSION_SECRET=your-session-secret

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=taskbuddy-uploads
R2_PUBLIC_URL=https://uploads.taskbuddy.com

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Email (for password reset, etc.)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@taskbuddy.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Docker Setup

```dockerfile
# Dockerfile (Backend)
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Builder
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/taskbuddy
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    networks:
      - taskbuddy-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - '3001:3000'
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000/api/v1
    depends_on:
      - backend
    networks:
      - taskbuddy-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=taskbuddy
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - '5432:5432'
    networks:
      - taskbuddy-network

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    networks:
      - taskbuddy-network

volumes:
  postgres-data:
  redis-data:

networks:
  taskbuddy-network:
    driver: bridge
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy TaskBuddy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
        working-directory: ./backend
      - run: npm run lint
        working-directory: ./backend
      - run: npm test
        working-directory: ./backend

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
        working-directory: ./frontend
      - run: npm run lint
        working-directory: ./frontend
      - run: npm test
        working-directory: ./frontend
      - run: npm run build
        working-directory: ./frontend

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npx playwright install --with-deps
      - run: npm ci
      - run: npm run test:e2e

  deploy-backend:
    runs-on: ubuntu-latest
    needs: [test-backend, e2e-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: taskbuddy-backend

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: [test-frontend, e2e-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Database Migrations

```typescript
// Use Prisma migrations or raw SQL
// migrations/001_initial_schema.sql
-- Run with: npm run migrate:up

-- Create families table
CREATE TABLE families (...);

-- Create users table
CREATE TABLE users (...);

-- ... (all other tables)
```

```json
// package.json scripts
{
  "scripts": {
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "db:seed": "node scripts/seed.js"
  }
}
```

### Monitoring & Logging

```typescript
// Backend: Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Error handler middleware
app.use(Sentry.Handlers.errorHandler());

// Frontend: Sentry integration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

## Guidance for Claude Opus 4.5

### Your Role
You are assisting Mr. Anlimah in building TaskBuddy from scratch. Your responsibilities include:

1. **Architecture Guidance**: Help design scalable, maintainable architecture
2. **Code Generation**: Provide production-ready code examples
3. **Best Practices**: Recommend industry best practices
4. **Problem Solving**: Help debug and optimize implementations
5. **Documentation**: Explain complex concepts clearly

### Interaction Guidelines

#### When User Asks for Architecture Decisions:
1. Present 2-3 viable options with pros/cons
2. Recommend the best option based on requirements
3. Explain trade-offs clearly
4. Consider future scalability

**Example**:
```
User: "Should I use REST or GraphQL for the API?"

Claude: "For TaskBuddy, I recommend REST API. Here's why:

REST API (Recommended):
✓ Simpler to implement and debug
✓ Better browser caching
✓ Easier offline-first with service workers
✓ Standard HTTP status codes
✓ Lighter client bundle size

GraphQL:
✓ Flexible queries (less important for fixed UI)
✗ More complex setup
✗ Harder to cache
✗ Larger client bundle

Given TaskBuddy's predictable data patterns and offline-first requirements, REST is the better choice."
```

#### When User Asks for Code:
1. Provide complete, runnable code
2. Include TypeScript types
3. Add inline comments for complex logic
4. Follow the tech stack specified in this document
5. Include error handling
6. Write production-ready code, not tutorials

**Example**:
```typescript
// ✓ GOOD: Complete, production-ready
export async function completeTask(assignmentId: string, userId: string) {
  try {
    // Verify user owns this assignment
    const assignment = await db.taskAssignments.findOne({
      id: assignmentId,
      child_id: userId
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (assignment.status !== 'pending') {
      throw new ConflictError('Task already completed');
    }

    // Update assignment
    const updated = await db.taskAssignments.update(assignmentId, {
      status: 'completed',
      completed_at: new Date()
    });

    // Send notification to parent
    await notificationService.notify({
      user_id: assignment.task.created_by,
      type: 'task_completed',
      title: 'Task Completed',
      message: `${assignment.child.first_name} completed "${assignment.task.title}"`
    });

    return updated;
  } catch (error) {
    logger.error('Error completing task:', error);
    throw error;
  }
}

// ✗ BAD: Incomplete, tutorial-style
function completeTask(id) {
  // TODO: Add your logic here
  db.update(id, { status: 'completed' });
}
```

#### When User Needs Debugging Help:
1. Ask for error messages/logs
2. Review their code carefully
3. Identify root cause
4. Provide fix with explanation
5. Suggest preventive measures

#### When User Asks About Best Practices:
1. Reference this document first
2. Provide concrete examples
3. Explain the "why" behind each practice
4. Link to official documentation when relevant

### Development Workflow Recommendations

#### Phase 1: Foundation (Weeks 1-2)
1. Set up project structure (frontend + backend)
2. Configure TypeScript, ESLint, Prettier
3. Set up database (PostgreSQL + Prisma/Drizzle)
4. Implement authentication system
5. Create basic API structure
6. Set up CI/CD pipeline

**What to build**:
- User registration/login
- Family creation
- Parent/child account creation
- Basic dashboard layouts

#### Phase 2: Core Features (Weeks 3-5)
1. Task management (CRUD)
2. Task assignment system
3. Task completion flow
4. Basic points system
5. Parent approval workflow

**What to build**:
- Task creation form
- Task list views
- Complete task button
- Approval queue
- Points ledger

#### Phase 3: Gamification (Weeks 6-7)
1. Achievement system
2. Daily challenges
3. Reward shop
4. Animations and celebrations

**What to build**:
- Achievement badges
- Level system
- Reward redemption
- Confetti animations
- Point counters

#### Phase 4: PWA & Offline (Week 8)
1. Service worker setup
2. IndexedDB implementation
3. Sync queue
4. Offline UI indicators
5. Push notifications

#### Phase 5: Polish & Testing (Weeks 9-10)
1. Comprehensive testing
2. Performance optimization
3. Accessibility improvements
4. Documentation
5. Beta testing

### Code Quality Standards

Always ensure:
- ✅ TypeScript with strict mode
- ✅ Proper error handling
- ✅ Input validation
- ✅ Security best practices
- ✅ Performance considerations
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Mobile responsiveness
- ✅ Clean, readable code
- ✅ Meaningful variable/function names
- ✅ DRY principle

### Key Architectural Principles

1. **Offline-First**: Every feature must work offline
2. **Family Isolation**: Zero data leakage between families
3. **Child Safety**: Age-appropriate content, no tracking
4. **Scalability**: Design for 100K+ families
5. **Performance**: Fast loading (<3s), smooth animations (60fps)

### Common Pitfalls to Avoid

1. ❌ Hard-coding family/user IDs
2. ❌ Exposing sensitive data in API responses
3. ❌ Not handling offline scenarios
4. ❌ Forgetting to sync IndexedDB
5. ❌ Not validating user permissions
6. ❌ Weak password requirements
7. ❌ Missing error boundaries
8. ❌ Not rate-limiting APIs
9. ❌ Ignoring accessibility
10. ❌ Poor mobile UX

### When to Push Back

If the user requests something that conflicts with:
- Security best practices
- Child safety
- Scalability requirements
- Offline-first architecture
- Family isolation

Politely explain the concern and suggest alternatives.

**Example**:
```
User: "Let's store the JWT token in localStorage"

Claude: "I'd recommend against storing JWT in localStorage due to XSS vulnerability risks. Instead, let's use:

1. HTTP-only cookies for the refresh token (secure, not accessible to JS)
2. Memory storage for short-lived access token
3. Silent refresh mechanism

This approach is more secure, especially important for a family app with children's data."
```

### Resources to Reference

When answering questions, prefer referencing:
- Official documentation (React, Next.js, PostgreSQL, etc.)
- This instruction document
- Industry standards (OWASP, WCAG, etc.)
- Established patterns (Repository, Service Layer, etc.)

### Success Metrics

Help the user achieve:
- ✅ Fully functional MVP in 8-10 weeks
- ✅ 100% offline functionality
- ✅ <3s initial load time
- ✅ 60fps animations
- ✅ Zero data breaches
- ✅ COPPA compliant
- ✅ 95%+ test coverage
- ✅ Deployable with one command

---

## Final Notes

This document is comprehensive but not exhaustive. Use your judgment to:
- Adapt recommendations to specific use cases
- Suggest improvements based on new best practices
- Simplify where appropriate for MVP
- Add complexity when scaling requires it

**Remember**: The goal is to build a production-ready, child-safe, family-focused PWA that teaches responsibility through gamification. Every decision should support this mission.

---

**Document Version**: 2.0
**Last Updated**: January 27, 2026
**Created for**: Claude Opus 4.5 assistance
**Project**: TaskBuddy - Family Task Management PWA

### Version 2.0 Changelog

**New Sections Added:**
- Child Authentication System (PIN-based login, shared device support)
- Gamification Formulas & Calculations (level progression, streak calculations, leaderboard algorithm)
- Real-time Architecture (Socket.io implementation, event types, scaling)
- Error Recovery & Conflict Resolution (sync failure handling, conflict resolution strategies)
- Photo Evidence Handling (image processing, R2 upload, content moderation)
- Accessibility Implementation (WCAG 2.1 AA compliance, accessible components)
- Redis Schema & Caching Strategy (key patterns, session management, leaderboards)
- Enhanced Testing Strategy (offline mode tests, performance tests, load testing, accessibility tests)

**Improvements:**
- Fixed PostgreSQL INDEX syntax in database schema
- Added device management table for shared device support
- Added moderation queue table for content moderation
- Enhanced child_profiles table with PIN authentication
- Added XP tracking to task_assignments
- Added streak tracking fields to family_settings
- Added age group refresh scheduled function
