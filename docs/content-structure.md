# Kairos Content Structure Reference

This document serves as a comprehensive reference for AI assistants and developers to understand how content is structured, stored, and edited in the Kairos application.

## Database Schema

### Tables Overview

#### 1. `content_sections`
Stores all editable content for landing page sections.

**Columns:**
- `id` (uuid, primary key)
- `section_name` (text, unique) - Identifier for the section
- `content` (jsonb) - JSON structure containing the section data
- `updated_at` (timestamptz) - Last update timestamp
- `updated_by` (uuid, nullable) - User who last updated

**Sections:**
- `hero` - Hero section headline and description
- `social_proof` - Array of proof badges
- `problem_before` - List of problems before using Kairos
- `problem_after` - List of benefits after using Kairos
- `value_benefits` - Array of value proposition items
- `how_it_works` - Steps explaining the process
- `testimonial` - Customer testimonial content
- `pricing` - Pricing tier information and FAQ items
- `footer` - Footer text and copyright

#### 2. `button_mappings`
Controls button text, routes, and visibility.

**Columns:**
- `id` (uuid, primary key)
- `button_id` (text, unique) - Identifier for the button
- `text` (text) - Display text
- `hover_text` (text, nullable) - Text on hover
- `route` (text, nullable) - Navigation route
- `enabled` (boolean) - Whether button is active
- `updated_at` (timestamptz)

**Button IDs:**
- `hero_cta` - Main hero call-to-action button
- Additional buttons as needed

#### 3. `animation_settings`
Controls animation timing and behavior.

**Columns:**
- `id` (uuid, primary key)
- `setting_name` (text, unique)
- `value` (jsonb) - Setting value
- `updated_at` (timestamptz)

**Settings:**
- `fade_in_duration` - Fade-in animation duration
- `intro_display_duration` - Splash screen display time

#### 4. `early_access_signups`
Stores waitlist signups with full user details.

**Columns:**
- `id` (uuid, primary key)
- `email` (text, required)
- `full_name` (text, nullable)
- `phone_number` (text, nullable)
- `university` (text, nullable)
- `graduation_year` (text, nullable)
- `interest_level` (text, default: 'casual') - Options: 'casual', 'serious', 'urgent'
- `created_at` (timestamptz)
- `notified` (boolean, default: false)

#### 5. `contact_submissions`
Stores contact form submissions.

**Columns:**
- `id` (uuid, primary key)
- `name` (text, required)
- `email` (text, required)
- `subject` (text, nullable)
- `message` (text, required)
- `created_at` (timestamptz)
- `resolved` (boolean, default: false)

#### 6. `user_roles`
Manages user permissions.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `role` (app_role enum) - 'admin' or 'user'
- `created_at` (timestamptz)

---

## Content Structure by Section

### Hero Section
**DB Location:** `content_sections.hero`
**Component:** `src/components/landing/HeroSection.tsx`

```json
{
  "headline": "Transform Your Academic Planning with AI",
  "description": "Smart scheduling, intelligent notes, and seamless collaboration"
}
```

**Editable via Admin Panel:** ✅ (Content tab)

---

### Social Proof Section
**DB Location:** `content_sections.social_proof`
**Component:** `src/components/landing/SocialProofSection.tsx`

```json
{
  "proofs": [
    "Trusted by IBA students",
    "Rapidly expanding network",
    "AI-powered scheduling",
    "Smart note-taking",
    "Collaborative learning"
  ]
}
```

**Editable via Admin Panel:** ✅ (Social Proof tab)

---

### Problem Section
**DB Location:** `content_sections.problem_before` and `content_sections.problem_after`
**Component:** `src/components/landing/ProblemSection.tsx`

```json
// problem_before
{
  "items": [
    "Spreadsheet overwhelm",
    "Manual conflict checking",
    "Last-minute schedule changes",
    "Scattered notes across apps",
    "Missing instructor insights"
  ]
}

// problem_after
{
  "items": [
    "AI-generated optimal schedules",
    "Automatic conflict resolution",
    "Instant schedule adjustments",
    "Smart unified note system",
    "Instructor intelligence insights"
  ]
}
```

**Editable via Admin Panel:** ✅ (Problem Section tab)

---

### Value Section
**DB Location:** `content_sections.value_benefits`
**Component:** `src/components/landing/ValueSection.tsx`

```json
{
  "benefits": [
    {
      "icon": "Calendar",
      "title": "Smart Scheduling",
      "description": "AI-generated conflict-free schedules ranked by best fit"
    },
    {
      "icon": "Brain",
      "title": "AI Notes",
      "description": "Smart formatting, canvas mode, and semantic search"
    }
    // ... more benefits
  ]
}
```

**Icons Available:** Calendar, Brain, Target, Users, Sparkles (from lucide-react)

**Editable via Admin Panel:** ✅ (Value Section tab)

---

### How It Works Section
**DB Location:** `content_sections.how_it_works`
**Component:** `src/components/landing/HowItWorksSection.tsx`

```json
{
  "steps": [
    {
      "icon": "Upload",
      "number": "1",
      "title": "Upload",
      "description": "Drop your course Excel file"
    },
    {
      "icon": "Settings",
      "number": "2",
      "title": "Preferences",
      "description": "Set your preferred days, times, and instructors"
    },
    {
      "icon": "CheckCircle",
      "number": "3",
      "title": "Get Schedule",
      "description": "Receive conflict-free schedules ranked by fit"
    }
  ]
}
```

**Icons Available:** Upload, Settings, CheckCircle (from lucide-react)

**Editable via Admin Panel:** ✅ (How It Works tab)

---

### Testimonial Section
**DB Location:** `content_sections.testimonial`
**Component:** `src/components/landing/TestimonialSection.tsx`

```json
{
  "quote": "Kairos transformed my course planning...",
  "name": "Ahmed K.",
  "title": "BBA Student, IBA",
  "avatar_gradient": "from-primary to-accent"
}
```

**Editable via Admin Panel:** ✅ (Testimonial tab)

---

### Pricing Section
**DB Location:** `content_sections.pricing`
**Component:** `src/components/landing/PricingSection.tsx`

```json
{
  "tiers": [
    {
      "name": "Free",
      "features": ["Feature 1", "Feature 2"]
    },
    {
      "name": "Pro",
      "features": ["All Free features", "Feature 3"]
    }
  ],
  "faqs": [
    {
      "question": "When will Kairos launch?",
      "answer": "We're launching soon! Join the waitlist..."
    }
  ]
}
```

**Editable via Admin Panel:** ✅ (Pricing & FAQ tab)

---

### Footer
**DB Location:** `content_sections.footer`
**Component:** `src/components/landing/PricingSection.tsx` (footer section)

```json
{
  "company": "Kairos",
  "tagline": "Your AI-Powered Academic Companion",
  "copyright": "© 2025 Kairos. All rights reserved."
}
```

**Editable via Admin Panel:** ✅ (Footer tab)

---

## Pages and Routes

### Main Pages
- `/` - Landing page (Index.tsx)
- `/scheduler` - Scheduler with waitlist form (Scheduler.tsx)
- `/privacy` - Privacy Policy (PrivacyPolicy.tsx)
- `/terms` - Terms of Service (TermsOfService.tsx)
- `/contact` - Contact form (Contact.tsx)
- `*` - 404 Not Found (NotFound.tsx)

### Footer Links
All footer links navigate to real pages:
- Privacy → `/privacy`
- Terms → `/terms`
- Contact → `/contact`

---

## Admin Panel Capabilities

**Access:** Users with `admin` role in `user_roles` table

**Location:** `src/components/EnhancedAdminPanel.tsx`

### Tabs:

1. **Content** - Edit hero section headline and description
2. **Social Proof** - Edit social proof badges array
3. **Problem Section** - Edit before/after comparison lists
4. **Value Section** - Edit all value proposition benefits
5. **How It Works** - Edit process steps
6. **Testimonial** - Edit customer testimonial
7. **Buttons** - Edit button text, hover text, routes, enabled status
8. **Animations** - Edit fade-in duration, intro display duration
9. **Pricing & FAQ** - Edit pricing tiers and FAQ items
10. **Footer** - Edit footer text and copyright

### Real-time Sync
- Changes to `content_sections` are broadcast via Supabase Realtime
- All open browser tabs update instantly when admin saves changes
- Toast notifications inform users of content updates

---

## Authentication & Authorization

### User Roles
- **Admin:** Full access to admin panel, can edit all content
- **User:** Standard access, no admin panel access

### Role Check Function
```sql
has_role(_user_id uuid, _role app_role) RETURNS boolean
```

Used in RLS policies to enforce permissions.

---

## Real-time Subscriptions

### Content Updates
```typescript
supabase
  .channel('content-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'content_sections' },
    (payload) => {
      // Handle content update
    }
  )
  .subscribe()
```

---

## Design System

### Colors (HSL)
- `--primary`: 250 85% 65% (Purple)
- `--accent`: 280 75% 68% (Violet)
- `--background`: Context-dependent
- `--foreground`: Context-dependent
- `--muted`: Context-dependent

### Animations
- `animate-scroll` - Infinite carousel scrolling (30s linear)
- `gradient-orb` - Animated gradient orbs background
- `animate-float` - Floating animation for logo

### Component Library
- **shadcn/ui** - Base component library
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

---

## Development Notes

### Adding New Content Sections
1. Insert row into `content_sections` with section_name and jsonb content
2. Create/update component to fetch from DB
3. Add tab in `EnhancedAdminPanel.tsx` for editing
4. Update this documentation

### Security
- All database tables have Row Level Security (RLS) enabled
- Admin-only actions use `has_role(auth.uid(), 'admin')` check
- Contact form and waitlist are publicly accessible (anonymous insert allowed)

### Performance
- Content is fetched once on component mount
- Real-time subscriptions minimize polling
- Gradients use CSS transforms for smooth animations

---

**Last Updated:** January 2025