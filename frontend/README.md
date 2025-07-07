# GeoGPT Frontend

A modern React-based frontend interface for the GeoGPT AI system - Chain-of-Thought LLM for Complex Spatial Analysis Tasks.

## 🌟 Features

### 📁 Document Library
- **Drag & Drop File Upload** - Support for PDF, DOC, XLSX, TXT files
- **File Management** - Upload, organize, preview, and delete documents
- **Progress Tracking** - Real-time upload and processing status
- **Search & Filter** - Find documents quickly with intelligent search
- **Batch Operations** - Select multiple files for analysis

### 💬 Chat Interface  
- **Natural Language Queries** - Ask questions about your geospatial data
- **Chain-of-Thought Visualization** - See how GeoGPT reasons through problems
- **Source Attribution** - Direct links to relevant document sections
- **Code Generation & Execution** - Generate and run spatial analysis code
- **Streaming Responses** - Real-time response generation

### 🎨 Modern UI/UX
- **Dark/Light Mode** - Theme switching with system preference detection
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Accessible Components** - WCAG 2.1 compliant interface
- **Smooth Animations** - Framer Motion powered transitions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Running GeoGPT RAG APIs (ports 8810, 8811)

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your API endpoints:
   ```env
   NEXT_PUBLIC_RAG_EMBEDDING_API=http://3.234.222.18:8810
   NEXT_PUBLIC_RAG_RERANKING_API=http://3.234.222.18:8811
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js 14 app directory
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx          # Main homepage
│   └── globals.css       # Global styles and CSS variables
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui style)
│   │   ├── button.tsx    # Button component with variants
│   │   ├── input.tsx     # Input field component
│   │   ├── toast.tsx     # Toast notification system
│   │   └── toaster.tsx   # Toast manager
│   ├── geogpt-interface.tsx  # Main application layout
│   ├── header.tsx        # Top navigation header
│   ├── file-library.tsx  # Document management sidebar
│   ├── chat-interface.tsx # Chat messaging interface
│   └── theme-provider.tsx # Dark/light theme provider
├── hooks/                 # Custom React hooks
│   └── use-toast.ts      # Toast notification hook
├── lib/                   # Utility libraries
│   └── utils.ts          # Common utility functions
├── types/                 # TypeScript type definitions
│   └── index.ts          # All application types
├── package.json          # Dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── next.config.js        # Next.js configuration
```

## 🔧 Technology Stack

### Core Framework
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library
- **Framer Motion** - Animation library
- **react-dropzone** - File upload with drag & drop

### State Management
- **React Hooks** - Built-in state management
- **Local Storage** - Persistent user preferences

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **PostCSS** - CSS processing

## 🎯 Core Components

### GeoGPTInterface
Main application layout managing sidebar and chat interface.

```tsx
<GeoGPTInterface />
```

### FileLibrary
Document management component with upload, search, and organization.

```tsx
<FileLibrary 
  selectedFiles={selectedFiles}
  onFileSelect={setSelectedFiles}
/>
```

### ChatInterface
Core chat experience with thinking visualization and source attribution.

```tsx
<ChatInterface 
  selectedFiles={selectedFiles}
  onFileDeselect={handleFileDeselect}
/>
```

## 🔌 API Integration

### RAG Service Integration
The frontend integrates with your existing RAG APIs:

- **Embedding API** (Port 8810) - Document embeddings
- **Reranking API** (Port 8811) - Query-document relevance

### API Configuration
Configure API endpoints in `next.config.js`:

```javascript
env: {
  RAG_EMBEDDING_API: 'http://3.234.222.18:8810',
  RAG_RERANKING_API: 'http://3.234.222.18:8811',
}
```

## 🎨 Customization

### Theme Customization
Modify theme colors in `app/globals.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  /* ... other variables */
}
```

### Component Styling
Components use Tailwind CSS with CSS variables for theming:

```tsx
className={cn(
  "bg-background text-foreground",
  "border border-border",
  className
)}
```

## 📱 Responsive Design

The interface is fully responsive:
- **Desktop** - Full sidebar and chat interface
- **Tablet** - Collapsible sidebar
- **Mobile** - Drawer-style navigation

## ♿ Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader optimized
- High contrast mode support

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables
Required for production:
```env
NEXT_PUBLIC_RAG_EMBEDDING_API=http://your-api-server:8810
NEXT_PUBLIC_RAG_RERANKING_API=http://your-api-server:8811
```

## 🧪 Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (when added)
npm test
```

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for all new components
3. Add proper error handling
4. Test responsive design
5. Ensure accessibility compliance

## 📄 License

This project is part of the GeoGPT research initiative.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Verify API connectivity
3. Review browser console for errors
4. Check network requests in DevTools

---

**Built with ❤️ for the GeoGPT Project** 