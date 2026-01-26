# Design Guidelines: Emaús Vota Election Management System

## Design Approach

**System**: Streamlined utility design inspired by modern civic tech platforms (Ballotpedia, Vote.org) with Material Design principles for clarity and accessibility. Focus on trust, transparency, and ease of use for democratic processes.

**Justification**: Voting systems require absolute clarity, trust, and accessibility. The design prioritizes information hierarchy, clear CTAs, and reducing cognitive load during the voting process.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts) - clean, highly legible for UI
- **Hierarchy**:
  - Page Titles: text-3xl font-bold (36px)
  - Section Headers: text-2xl font-semibold (24px)
  - Card Titles: text-xl font-medium (20px)
  - Body Text: text-base (16px)
  - Helper Text: text-sm text-gray-600 (14px)
  - Buttons: text-base font-medium

### Color System
**Brand Colors** (UMP Emaús):
- Primary Orange: #FFA500 (buttons, accents, active states)
- Neutral Gray: #E5E5E5 (backgrounds, borders)
- White: #FFFFFF (cards, surfaces)

**Functional Colors**:
- Success: #10B981 (vote confirmation)
- Error: #EF4444 (voting restrictions)
- Warning: #F59E0B (election status)
- Info: #3B82F6 (information callouts)

**Semantic Usage**:
- Primary actions: Orange background with white text
- Secondary actions: White background with orange border and orange text
- Disabled states: Gray background with gray text
- Winner highlight: Soft gold/amber background (#FEF3C7) with orange border

### Layout System
**Spacing Units**: Tailwind scale of 4, 6, 8, 12, 16, 24 (p-4, p-6, p-8, etc.)
- Component padding: p-6
- Card spacing: gap-6 in grids
- Section margins: my-12
- Form field spacing: space-y-4
- Button padding: px-6 py-3

**Container Strategy**:
- Max-width: max-w-7xl for admin dashboard
- Max-width: max-w-2xl for voting interface (focused experience)
- Max-width: max-w-4xl for results page
- All containers: mx-auto px-4

### Component Library

#### Cards
- White background with subtle shadow (shadow-md)
- Rounded corners: rounded-lg
- Border: 1px solid #E5E5E5
- Padding: p-6
- Hover state: shadow-lg transition

#### Buttons
**Primary (Orange)**:
- Background: #FFA500
- Text: white, font-medium
- Padding: px-6 py-3
- Rounded: rounded-lg
- Icon support: Heroicons, 20px size
- Hover: Slightly darker orange (#FF8C00)

**Secondary (Outlined)**:
- Border: 2px solid #FFA500
- Text: #FFA500, font-medium
- Background: white
- Hover: Light orange background (#FFF7ED)

**Destructive (Red)**:
- Background: #EF4444
- Text: white
- For "Encerrar Eleição" button

#### Forms
- Input fields: border border-gray-300, rounded-lg, px-4 py-3
- Focus state: border-orange-500 ring-2 ring-orange-200
- Labels: text-sm font-medium text-gray-700, mb-2
- Error messages: text-sm text-red-600 mt-1

#### Tables (Admin)
- Header: bg-gray-100, font-semibold, text-left, px-6 py-3
- Rows: border-b border-gray-200, px-6 py-4
- Hover: bg-gray-50
- Alternating rows for better readability

#### Icons
- Library: Heroicons (outline style)
- Size: 20px for buttons, 24px for section headers
- Color: Inherit from parent or orange for accents
- Key icons:
  - Login: UserCircleIcon
  - Vote: CheckCircleIcon
  - Results: ChartBarIcon
  - Add Candidate: PlusCircleIcon
  - Close Election: XCircleIcon

#### Modals
- Overlay: bg-black/50 backdrop-blur-sm
- Content: bg-white rounded-xl shadow-2xl
- Max-width: max-w-md
- Padding: p-8
- Close button: top-right, gray hover state

#### Toast Notifications
- Position: Top-right corner
- Success: Green background (#10B981)
- Error: Red background (#EF4444)
- Duration: 3 seconds auto-dismiss
- Icon + message layout

### Page-Specific Layouts

#### Login/Register Page
- Centered card design: max-w-md mx-auto mt-16
- Banner: Full-width orange stripe at top (h-2 bg-[#FFA500])
- Logo/Title area: text-center, large heading
- Form: Single column, generous spacing (space-y-6)
- Toggle between login/register: text-sm links below form

#### Admin Dashboard
- Grid layout: grid-cols-1 md:grid-cols-2 gap-6
- Status cards at top: Show active election in green card
- Action buttons: Grouped in horizontal layout (flex gap-4)
- Candidates table: Full-width, scrollable on mobile
- "Add Candidate" modal: Form with position dropdown (orange accent)

#### Vote Page
- Vertical list of positions: space-y-8
- Each position: Card with candidates in grid (grid-cols-1 sm:grid-cols-2 gap-4)
- Candidate cards: White background, orange border on hover
- "Votar" button: Primary orange, full-width on mobile
- Voted state: Disabled button with checkmark icon, green text "Votado"

#### Results Page
- Position sections: Stacked vertically (space-y-12)
- Winner card: Amber background (#FEF3C7), orange left-border (border-l-4)
- Vote count: Large, bold numbers (text-2xl font-bold)
- Percentage bars: Optional visual representation using orange fills

### Responsive Behavior
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Stack grids to single column on mobile
- Full-width buttons on mobile, auto-width on desktop
- Collapsible admin tables with horizontal scroll

### Accessibility
- WCAG AA contrast ratios (4.5:1 minimum)
- Focus indicators: Orange ring (ring-2 ring-orange-500)
- Form labels always visible (no placeholder-only)
- Disabled states clearly indicated (opacity-50)
- Error messages associated with form fields

### Images
**None required** - This is a utility application where clarity and functionality take precedence over decorative imagery. The voting interface should be distraction-free to ensure democratic process integrity.

### Micro-interactions
- Button hover: Subtle scale (hover:scale-105) and shadow increase
- Card hover: Shadow elevation (hover:shadow-lg)
- Form focus: Smooth border color transition
- Vote success: Brief green checkmark animation
- No distracting animations during voting process