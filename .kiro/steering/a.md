---
inclusion: always
---
# HomeHeroes – Product Design & UX Specification  
**Version:** 1.0  
**Purpose:**  
Guide Kiro to design and build the HomeHeroes app UI/UX with strict adherence to the design principles, color palette, structure, and flow described below.  
Kiro must **not invent**, improvise, or add features that are not explicitly listed.

---

## 1. Brand Identity  
The visual identity of HomeHeroes must feel:
- clean  
- premium  
- calm  
- simple  
- inspired by Yango’s clarity and spacing discipline  

This means:
- generous white space  
- one strong brand color  
- smooth soft animations  
- zero decorative clutter  
- consistent iconography  
- clear hierarchy  

---

## 2. Color Palette (STRICT)  

### Primary Brand Color  
- **Royal Deep Blue**: `#0052FF`  
Used only for major actions, highlights, and identity anchors.

### Primary Dark Color  
- **Night Navy**: `#0A0F1F`  
Used for headers, bottom sheets, and high-contrast areas.

### Canvas Background  
- **Soft Cool White**: `#F7F9FC`  
Used for all main screens.

### System Greys  
- Text High: `#1C1C1E`  
- Text Medium: `#3A3A3C`  
- Text Low: `#8E8E93`  
- Border Grey: `#D7D9DD`  

### Signals  
- Success: `#20C77B`  
- Warning: `#FFB018`  
- Danger: `#FF4A4A`  

Kiro must use **only these colors** and maintain strict consistency.

---

## 3. Core UX Principles  

Kiro must apply these principles to every component:

### Principle 1 — Focus  
There must always be **one clear main action** on every screen.

### Principle 2 — Space  
Large white space is not optional — it is part of the brand’s identity.

### Principle 3 — Smoothness  
All transitions must be:
- soft  
- gentle  
- non-bouncy  
- minimal  

### Principle 4 — Legibility  
Typography must be large, breathable, and readable.

### Principle 5 — Confidence  
Every screen should visually feel “simple but expensive.”  
No unnecessary lines, gradients, textures, or crowds.

---

# 4. Application Flow  
This is the **full civilian & hero experience**.  
Kiro must follow it screen by screen.

---

## CIVILIAN SIDE

### **4.1 Onboarding Flow**
1. **Welcome Screen**  
   - Brand blue logo centered  
   - Button: “Get Started”  
   - Minimal, white background  

2. **Login / Register**  
   - Email + Password  
   - “Continue with Google”  
   - Minimal layout, no distractions  

3. **Profile Setup**  
   - Name  
   - Address  
   - Contact number  
   - Avatar upload  
   - Clean form spacing

---

## **4.2 Civilian Home Screen (Main Screen)**  
This screen must feel like Yango’s main booking screen.

**Top Bar:**  
- Left: Chat icon  
- Center: “HomeHeroes”  
- Right: Profile avatar  

**Main Component:**  
Large, rounded search bar:  
- Placeholder: “What do you need done?”  
When tapped → bottom-sheet opens.

**Bottom Sheet:**  
Service categories list, each with:  
- Icon  
- Title  
- One-line subtitle  
- Arrow or chevron to indicate continuation  

Categories:  
- Plumbing  
- Cleaning  
- Electrical  
- Gardening  
- Specialist Jobs  

The spacing, typography, and card feel must strictly mimic Yango’s simplicity.

---

## **4.3 Describe Problem Screen**  
After selecting a category:

**Header:** Back button + title “Describe the problem”  
**Main Area:**  
- Large rounded input box  
- Placeholder: “Tell us what needs to be done…”  

**Bottom Button:**  
Full-width, brand blue: “Continue”

---

## **4.4 Choose a Hero Screen**  
Hero list screen must feel like Uber’s “Find drivers” screen.

Each hero card includes:  
- Avatar  
- Hero name  
- Rating  
- Price estimate  
- Skills/subtitle  
- Distance badge  
- Availability badge

Vertical scrolling only.  
Cards lift slightly on scroll.

---

## **4.5 Job Confirmation Screen**  
Shows:  
- Selected Hero  
- Service details  
- Time & date selection  
- Price estimate  
- Confirm button (blue)

---

## **4.6 Live Job Tracking Screen**  
Similar to Yango ride tracking.  
Must include:  
- Status timeline  
- Hero location (if needed)  
- Chat button  
- Cancel policy button  
- Arrival ETA  

---

## **4.7 Chat Screen**  
Simple messenger layout:  
- Blue bubbles for civilian  
- White bubbles for hero  
- Small header with hero avatar + name  

---

## **4.8 Payment Screen**  
Billing summary:  
- Service cost  
- Fees  
- Total  
- Pay now button  
Clean spacing, no decorative elements.

---

## **4.9 Receipt Screen**  
After payment:  
- Summary  
- Timestamp  
- Download PDF  
- Rate Hero  

---

## **4.10 Civilian Profile Screen**  
Sections:  
- Personal info  
- Address  
- Payment method  
- Past jobs  
- Logout  

White, clean, spacious screen design.

---

# HERO SIDE

## **5.1 Hero Dashboard (Home)**  
Top bar with avatar + earnings summary.  
Main items:  
- “Available / Not Available” toggle  
- Incoming jobs  
- Today’s schedule  
- Quick stats  

Dark navy sections used for contrast.

---

## **5.2 Incoming Job Request Screen**  
Like Yango’s incoming ride pop-up.

Shows:  
- Job title  
- Distance  
- Price  
- Description summary  
- Accept (blue)  
- Decline (grey)  

Large, bold, time-sensitive UI.

---

## **5.3 Active Job Screen**  
Shows:  
- Customer details  
- Chat  
- Task progress slider  
- Finish job button  

---

## **5.4 Earnings Screen**  
Shows graphs and summaries, dark theme by default.

---

## **5.5 Hero Profile**  
- Skills  
- Rates  
- Experience  
- Documents (ID, certs)  
- Bank payout info  

---

# 6. Component Rules (Kiro Must Follow Exactly)

### Buttons  
- Rounded 14–16px  
- Primary button always brand blue  
- Secondary always grey  
- Text always medium bold  

### Cards  
- Rounded corners  
- Soft shadow  
- No heavy borders  

### Icons  
- Minimal  
- Line-based  
- Consistent stroke widths  

### Typography  
- Large headings  
- Medium-weight subheadings  
- Clean body text  
- Never cramped  

---

# 7. Motion Rules  
All transitions must be subtle:
- 150–250ms  
- EaseInOut curves  
- No bounce  
- No elastic motion  

---

# 8. What Kiro Must Not Do  
Kiro must **not**:  
- invent new screens  
- change colors  
- modify flow  
- alter the design direction  
- add animation experiments  
- change typography system  
- introduce extra features  
- create complicated layouts  

Kiro must follow the spec **strictly**.

---

# 9. Output Format  
Kiro should deliver:  
- UI layouts for every screen  
- Component library according to palette  
- UX flow diagrams  
- A consistent design system  
- Developer-ready screen breakdowns  

---

# 10. Purpose of This Document  
This document defines the exact UI/UX structure, behavior, and style of the HomeHeroes application.  
Kiro’s job is to execute this vision precisely and consistently.

