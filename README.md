# ABSK Frontend - AI Blockchain Starter Kit

A sophisticated Next.js 14 application for AI-powered blockchain interaction with mobile 2FA authentication and cross-chain operations.

## 🚀 Features

### Core Features
- **Mobile-First Authentication**: Real-time mobile 2FA verification with device information display
- **Dual-Mode Interface**: Seamless switching between AI Chat and Manual operation modes
- **Multi-Chain Wallet Management**: Support for Sepolia, Amoy, and Neon networks
- **eKYC Integration**: Complete identity verification flow with status monitoring
- **Real-Time Updates**: Live balance tracking and transaction status monitoring
- **Professional Security Design**: Enterprise-grade UI with security-focused messaging

### Architecture
- **Framework**: Next.js 14 with App Router
- **TypeScript**: Full type safety throughout the application
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API with custom hooks
- **Icons**: Lucide React for consistent iconography

## 🛠️ Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd absk-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env.local` file:
```env
NEXT_PUBLIC_BRDZ_API_BASE=https://api.brdz.link/api
NEXT_PUBLIC_BRDZ_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"..."}
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:3000`

## 📱 User Flow

### Authentication Flow
1. **Landing Page** → User sees features and clicks "Start Building"
2. **Login Step 1** → User enters email/username (no password required)
3. **Login Step 2** → Real-time mobile verification with device info display
4. **Mobile Approval** → User approves/denies on mobile device
5. **eKYC Verification** → Identity verification for new users
6. **Dashboard Access** → Full application access after approval

### Application Features
- **Dashboard**: Portfolio overview with multi-chain wallet information
- **AI Chat Mode**: Natural language blockchain operations
- **Manual Mode**: Traditional wallet management interface
- **Transaction History**: Complete audit trail of all operations

## 🏗️ Project Structure

```
app/
├── globals.css                 # Global styles and design system
├── layout.tsx                  # Root layout with providers
├── page.tsx                    # Landing page
├── auth/                       # Authentication pages
│   ├── login/page.tsx         # Email/username input
│   ├── verify/page.tsx        # Mobile verification
│   └── register/page.tsx      # User registration
├── ekyc/page.tsx              # eKYC verification
├── dashboard/page.tsx         # Main dashboard
├── chat/page.tsx              # AI chat interface
└── manual/page.tsx            # Manual operations

components/
├── landing/                   # Landing page components
├── auth/                      # Authentication components
├── ekyc/                      # eKYC verification components
├── layout/                    # Layout components (Sidebar, Header)
├── mode/                      # Mode toggle components
├── chat/                      # AI chat interface
├── manual/                    # Manual operation interface
├── wallet/                    # Wallet management components
└── ui/                        # Reusable UI components

contexts/
├── AuthContext.tsx            # Authentication state management
└── ModeContext.tsx            # Interface mode management

services/
└── absk.ts                    # API service layer with mock data

hooks/
└── useMobileVerification.ts   # Mobile verification polling hook
```

## 🎨 Design System

### Color Scheme
- **Primary**: Blue (#3B82F6) - Blockchain/security theme
- **Secondary**: Green (#10B981) - Success states and balances
- **Warning**: Amber (#F59E0B) - Pending states
- **Error**: Red (#EF4444) - Errors and denied states

### Typography
- **Font**: Inter for clean, professional appearance
- **Weights**: Regular (400), Medium (500), Bold (700)
- **Scaling**: Responsive text sizing for all devices

### Components
- **Security Glow**: Special shadow effect for security-focused elements
- **Gradient Primary**: Blue to green gradient for CTAs
- **Chat Bubbles**: WhatsApp/Discord-style message interface

## 🔐 Security Features

### Mobile 2FA Authentication
- No password required - only email/username
- Real-time device information display (IP, browser, OS, location)
- Push notification integration (Firebase)
- Session timeout and security monitoring

### eKYC Integration
- Sumsub integration preparation
- Status monitoring (PENDING/APPROVED/REJECTED)
- Progressive verification flow
- Document upload support

### Data Protection
- JWT token management
- Secure local storage handling
- API request authentication
- Input validation and sanitization

## 🌐 API Integration

### Mock Service Layer
The application includes a comprehensive mock service layer that mirrors the real BRDZ backend API structure:

```typescript
// services/absk.ts
export const ABSK = {
  auth: {
    initiateMobileLogin: async (emailOrUsername: string) => {...},
    checkMobileLoginStatus: async (sessionId: string) => {...},
    register: async (userData: RegisterData) => {...}
  },
  ekyc: {
    getStatus: async (userId: number) => {...},
    generateWebSdkLink: async (userId: string) => {...}
  },
  chat: {
    processAIIntent: async (input: string, userId: number) => {...}
  },
  manual: {
    createWallet: async (name: string, userId: number) => {...},
    getUserWallets: async (userId: number) => {...},
    addChainAddress: async (walletId: number, chainId: string) => {...}
  }
};
```

### Real Backend Integration
Ready for immediate integration with the BRDZ backend system:
- Mobile authentication endpoints (`/auth/mobile-*`)
- ABSK wallet management (`/absk/manual/*` and `/absk/agent/*`)
- eKYC integration (`/ekyc/*`)
- Firebase push notification system

## 📱 Mobile Responsiveness

- **Mobile-First Design**: Optimized for smartphones and tablets
- **Responsive Breakpoints**: Tailored layouts for different screen sizes
- **Touch-Friendly**: Large tap targets and smooth interactions
- **Progressive Enhancement**: Works on all devices and browsers

## 🚀 Production Ready

### Performance
- Next.js 13+ App Router for optimal performance
- Static generation where possible
- Optimized bundle sizes
- Lazy loading of components

### SEO & Accessibility
- Proper meta tags and OpenGraph support
- ARIA labels and keyboard navigation
- High contrast ratios for readability
- Screen reader compatibility

### Development Experience
- TypeScript for type safety
- ESLint configuration
- Hot reloading in development
- Clear error handling and logging

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 📦 Key Dependencies

- **Next.js 13.5.1**: React framework with App Router
- **React 18.2.0**: UI library
- **TypeScript 5.2.2**: Type safety
- **Tailwind CSS 3.3.3**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **next-themes**: Dark/light mode support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is private and proprietary to the ABSK team.

---

Built with ❤️ for the future of blockchain interaction